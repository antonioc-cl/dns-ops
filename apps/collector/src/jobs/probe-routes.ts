/**
 * Probe Routes - Bead 10
 *
 * API endpoints for triggering non-DNS probes.
 * All probes require allowlist validation and SSRF protection.
 *
 * ## Usage Model (dns-ops-1j4.13.5)
 *
 * Probes are designed for **programmatic use only**:
 * - Called by mail collection during snapshot creation
 * - Called by monitoring jobs for MTA-STS/TLS health
 * - NOT exposed in the web UI
 *
 * Rationale for no operator UI:
 * - Probes make external connections (SSRF risk if exposed)
 * - Allowlist enforcement is complex to explain in UI
 * - Results are integrated into findings/evidence automatically
 * - Direct API use is better suited for automation
 *
 * If an operator UI is needed in the future:
 * - Create a "probe preview" mode that shows what would be probed
 * - Show probe results from existing snapshots (no live probing)
 * - Consider a separate "advanced diagnostics" permission
 */

import { Hono } from 'hono';
import { getEnvConfig } from '../config/env.js';
import type { DNSQueryResult } from '../dns/types.js';
import type { AllowlistEntry } from '../probes/allowlist.js';
import {
  fetchMTASTSPolicy,
  probeAllowlistManager,
  probeMXHosts,
  probeSMTPStarttls,
  validateMTASTSTxtRecord,
} from '../probes/index.js';
import { getProbeSemaphore, initProbeSemaphore } from '../probes/semaphore.js';
import type { SMTPProbeResult } from '../probes/smtp-starttls.js';
import type { Env } from '../types.js';

// Initialise the global probe semaphore from env config at module load time.
// This ensures the configured PROBE_CONCURRENCY is used, not the default.
initProbeSemaphore(getEnvConfig().probes.concurrency);

export const probeRoutes = new Hono<Env>();

/**
 * Middleware: Check if active probes are enabled
 *
 * Active probing is an OPTIONAL feature that must be explicitly enabled
 * via ENABLE_ACTIVE_PROBES=true environment variable.
 *
 * Rationale:
 * - Active probes make outbound TCP/TLS connections to external servers
 * - This requires careful SSRF protections and operator awareness
 * - Not all deployments need or want active probing
 */
probeRoutes.use('/mta-sts', async (c, next) => {
  const config = getEnvConfig();
  if (!config.probes.enabled) {
    return c.json(
      {
        error: 'Active probing is not enabled',
        message: 'Set ENABLE_ACTIVE_PROBES=true to enable MTA-STS probes',
        feature: 'active-probes',
      },
      503
    );
  }
  return next();
});

probeRoutes.use('/smtp-starttls', async (c, next) => {
  const config = getEnvConfig();
  if (!config.probes.enabled) {
    return c.json(
      {
        error: 'Active probing is not enabled',
        message: 'Set ENABLE_ACTIVE_PROBES=true to enable SMTP STARTTLS probes',
        feature: 'active-probes',
      },
      503
    );
  }
  return next();
});

/**
 * POST /api/probe/mta-sts
 * Fetch MTA-STS policy for a domain
 */
probeRoutes.post('/mta-sts', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { domain, txtRecords } = body;
  const tenantId = c.get('tenantId');

  if (!domain) {
    return c.json({ error: 'Domain is required' }, 400);
  }

  // Validate MTA-STS TXT record first
  const txtValidation = await validateMTASTSTxtRecord(domain, txtRecords || []);

  if (!txtValidation.valid) {
    return c.json(
      {
        error: 'MTA-STS TXT record validation failed',
        details: txtValidation.error,
      },
      400
    );
  }

  // Add to tenant-scoped allowlist (MTA-STS endpoint is derived from DNS)
  probeAllowlistManager
    .getTenantAllowlist(tenantId)
    .addCustomEntry(`mta-sts.${domain}`, 443, 'probe-api', `MTA-STS policy fetch for ${domain}`);

  // Fetch policy — run under global semaphore to enforce PROBE_CONCURRENCY
  const config = getEnvConfig();
  const result = await getProbeSemaphore().run(() =>
    fetchMTASTSPolicy(domain, tenantId, {
      timeoutMs: config.probes.timeoutMs,
      checkAllowlist: true,
    })
  );

  return c.json({
    ...result,
    domain,
    txtRecordId: txtValidation.id,
  });
});

/**
 * POST /api/probe/smtp-starttls
 * Probe SMTP server for STARTTLS support
 */
probeRoutes.post('/smtp-starttls', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { hostname, port, mxRecords } = body;
  const tenantId = c.get('tenantId');

  // Option 1: Single host probe
  if (hostname) {
    // Add to tenant-scoped allowlist if MX records provided
    if (mxRecords && Array.isArray(mxRecords)) {
      const mockResults: DNSQueryResult[] = [
        {
          query: { name: hostname, type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'mock' },
          success: true,
          answers: mxRecords.map((mx: string) => ({
            name: hostname,
            type: 'MX',
            ttl: 300,
            data: mx,
          })),
          authority: [],
          additional: [],
          responseTime: 0,
        },
      ];
      probeAllowlistManager
        .getTenantAllowlist(tenantId)
        .generateFromDnsResults(hostname, mockResults);
    }

    // Run under global semaphore to enforce PROBE_CONCURRENCY
    const smtpConfig = getEnvConfig();
    const result = await getProbeSemaphore().run(() =>
      probeSMTPStarttls(hostname, tenantId, {
        port: port || 25,
        timeoutMs: smtpConfig.probes.timeoutMs,
        checkAllowlist: true,
      })
    );

    return c.json(result);
  }

  // Option 2: Batch probe from MX records
  if (mxRecords && Array.isArray(mxRecords) && mxRecords.length > 0) {
    // Parse MX records and add to tenant-scoped allowlist
    const hosts = mxRecords.map((record: string) => {
      const parts = record.trim().split(/\s+/);
      return {
        hostname: parts.length > 1 ? parts[1].replace(/\.$/, '') : record,
        priority: parts.length > 0 ? parseInt(parts[0], 10) : 0,
      };
    });

    // Generate tenant-scoped allowlist
    const mockResults: DNSQueryResult[] = [
      {
        query: { name: 'probe', type: 'MX' },
        vantage: { type: 'public-recursive', identifier: 'mock' },
        success: true,
        answers: hosts.map((h) => ({
          name: 'probe',
          type: 'MX',
          ttl: 300,
          data: `${h.priority} ${h.hostname}.`,
        })),
        authority: [],
        additional: [],
        responseTime: 0,
      },
    ];
    probeAllowlistManager.getTenantAllowlist(tenantId).generateFromDnsResults('probe', mockResults);

    // Use configured timeout and concurrency (not hardcoded values)
    const batchConfig = getEnvConfig();
    const results = await probeMXHosts(hosts, tenantId, {
      timeoutMs: batchConfig.probes.timeoutMs,
      concurrency: batchConfig.probes.concurrency,
    });

    return c.json({
      hosts: results,
      summary: {
        total: results.length,
        successful: results.filter((r: SMTPProbeResult) => r.success).length,
        supportsStarttls: results.filter((r: SMTPProbeResult) => r.supportsStarttls).length,
      },
    });
  }

  return c.json(
    {
      error: 'Either hostname or mxRecords is required',
    },
    400
  );
});

/**
 * POST /api/probe/allowlist/generate
 * Generate tenant-scoped allowlist from DNS results
 */
probeRoutes.post('/allowlist/generate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { domain, dnsResults } = body;
  const tenantId = c.get('tenantId');

  if (!domain || !dnsResults || !Array.isArray(dnsResults)) {
    return c.json(
      {
        error: 'Domain and dnsResults (array) are required',
      },
      400
    );
  }

  const entries = probeAllowlistManager
    .getTenantAllowlist(tenantId)
    .generateFromDnsResults(domain, dnsResults);

  return c.json({
    domain,
    tenantId,
    entriesAdded: entries.length,
    entries: entries.map((e: AllowlistEntry) => ({
      type: e.type,
      hostname: e.hostname,
      port: e.port,
      expiresAt: e.expiresAt,
    })),
  });
});

/**
 * GET /api/probe/allowlist
 * List current tenant-scoped allowlist entries
 */
probeRoutes.get('/allowlist', (c) => {
  const tenantId = c.get('tenantId');
  const entries = probeAllowlistManager.getTenantAllowlist(tenantId).getAllEntries();

  return c.json({
    count: entries.length,
    entries: entries.map((e) => ({
      type: e.type,
      hostname: e.hostname,
      port: e.port,
      derivedFrom: e.derivedFrom,
      expiresAt: e.expiresAt,
    })),
  });
});

/**
 * GET /api/probe/ssrf-check/:target
 * Check if a target passes SSRF validation
 */
probeRoutes.get('/ssrf-check/:target', async (c) => {
  const target = c.req.param('target');
  const { checkSSRF } = await import('../probes/index.js');

  const result = checkSSRF(target);

  return c.json({
    target,
    ...result,
  });
});

/**
 * GET /api/probe/health
 * Probe service health check
 */
probeRoutes.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'probe-sandbox',
    activeTenants: probeAllowlistManager.getActiveTenants().length,
    timestamp: new Date().toISOString(),
  });
});
