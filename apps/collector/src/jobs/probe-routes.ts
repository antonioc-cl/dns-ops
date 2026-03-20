/**
 * Probe Routes - Bead 10
 *
 * API endpoints for triggering non-DNS probes.
 * All probes require allowlist validation and SSRF protection.
 */

import { Hono } from 'hono';
import type { DNSQueryResult } from '../dns/types.js';
import type { AllowlistEntry } from '../probes/allowlist.js';
import {
  fetchMTASTSPolicy,
  probeAllowlist,
  probeMXHosts,
  probeSMTPStarttls,
  validateMTASTSTxtRecord,
} from '../probes/index.js';
import type { SMTPProbeResult } from '../probes/smtp-starttls.js';

export const probeRoutes = new Hono();

/**
 * POST /api/probe/mta-sts
 * Fetch MTA-STS policy for a domain
 */
probeRoutes.post('/mta-sts', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { domain, txtRecords } = body;

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

  // Add to allowlist (MTA-STS endpoint is derived from DNS)
  probeAllowlist.addCustomEntry(
    `mta-sts.${domain}`,
    443,
    'probe-api',
    `MTA-STS policy fetch for ${domain}`
  );

  // Fetch policy
  const result = await fetchMTASTSPolicy(domain, {
    timeoutMs: 15000,
    checkAllowlist: true,
  });

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

  // Option 1: Single host probe
  if (hostname) {
    // Add to allowlist if MX records provided
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
      probeAllowlist.generateFromDnsResults(hostname, mockResults);
    }

    const result = await probeSMTPStarttls(hostname, {
      port: port || 25,
      timeoutMs: 30000,
      checkAllowlist: true,
    });

    return c.json(result);
  }

  // Option 2: Batch probe from MX records
  if (mxRecords && Array.isArray(mxRecords) && mxRecords.length > 0) {
    // Parse MX records and add to allowlist
    const hosts = mxRecords.map((record: string) => {
      const parts = record.trim().split(/\s+/);
      return {
        hostname: parts.length > 1 ? parts[1].replace(/\.$/, '') : record,
        priority: parts.length > 0 ? parseInt(parts[0], 10) : 0,
      };
    });

    // Generate allowlist
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
    probeAllowlist.generateFromDnsResults('probe', mockResults);

    const results = await probeMXHosts(hosts, {
      timeoutMs: 30000,
      concurrency: 3,
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
 * Generate allowlist from DNS results
 */
probeRoutes.post('/allowlist/generate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { domain, dnsResults } = body;

  if (!domain || !dnsResults || !Array.isArray(dnsResults)) {
    return c.json(
      {
        error: 'Domain and dnsResults (array) are required',
      },
      400
    );
  }

  const entries = probeAllowlist.generateFromDnsResults(domain, dnsResults);

  return c.json({
    domain,
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
 * List current allowlist entries
 */
probeRoutes.get('/allowlist', (c) => {
  const entries = probeAllowlist.getAllEntries();

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
    allowlistSize: probeAllowlist.getAllEntries().length,
    timestamp: new Date().toISOString(),
  });
});
