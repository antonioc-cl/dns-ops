/**
 * Fleet Report Routes - Bead 11
 *
 * Batch checking and reporting for domain inventories.
 * Produces internal reports for high-value security queries.
 */

import { DomainRepository, ObservationRepository, SnapshotRepository } from '@dns-ops/db';
import { Hono } from 'hono';
import type { Env } from '../types.js';

export const fleetReportRoutes = new Hono<Env>();

/**
 * POST /api/fleet-report/run
 * Run fleet report against inventory
 */
fleetReportRoutes.post('/run', async (c) => {
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const {
    inventory = [],
    checks = ['spf', 'dmarc', 'mx', 'infrastructure'],
    format = 'detailed',
  } = body;

  if (!Array.isArray(inventory) || inventory.length === 0) {
    return c.json(
      {
        error: 'Inventory required: array of domain names or domain objects',
        example: { inventory: ['example.com', 'example.org'] },
      },
      400
    );
  }

  // Limit inventory size for safety
  const maxDomains = 1000;
  if (inventory.length > maxDomains) {
    return c.json(
      {
        error: `Inventory too large: ${inventory.length} domains. Max: ${maxDomains}`,
      },
      400
    );
  }

  try {
    const domainRepo = new DomainRepository(db);
    const snapshotRepo = new SnapshotRepository(db);
    const observationRepo = new ObservationRepository(db);

    // Process each domain
    const results: FleetReportResult[] = [];
    const errors: Array<{ domain: string; error: string }> = [];

    for (const item of inventory) {
      const domainName = typeof item === 'string' ? item : item.domain;

      try {
        // Find or create domain
        const domain = await domainRepo.findByName(domainName);

        if (!domain) {
          errors.push({
            domain: domainName,
            error: 'Domain not in database. Run collection first.',
          });
          continue;
        }

        // Get latest snapshot
        const snapshots = await snapshotRepo.findByDomain(domain.id, 1);
        const snapshot = snapshots[0];

        if (!snapshot) {
          errors.push({
            domain: domainName,
            error: 'No snapshots available. Run collection first.',
          });
          continue;
        }

        // Get observations
        const observations = await observationRepo.findBySnapshotId(snapshot.id);

        // Run checks (with type assertion for compatibility)
        // biome-ignore lint/suspicious/noExplicitAny: Intentional type assertion for observation compatibility
        const checkResults = await runChecks(domainName, observations as any, checks);

        results.push({
          domain: domainName,
          snapshotId: snapshot.id,
          collectedAt: snapshot.createdAt,
          checks: checkResults,
          issues: checkResults.filter((r) => r.severity !== 'ok'),
        });
      } catch (err) {
        errors.push({
          domain: domainName,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Generate summary
    const summary = generateSummary(results, checks);

    return c.json({
      reportGeneratedAt: new Date().toISOString(),
      domainsChecked: results.length,
      domainsWithErrors: errors.length,
      summary,
      results: format === 'summary' ? undefined : results,
      highPriorityIssues: results
        .flatMap((r) => r.issues)
        .filter((i) => i.severity === 'critical' || i.severity === 'high')
        .slice(0, 50),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Fleet report error:', error);
    return c.json(
      {
        error: 'Failed to generate fleet report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/fleet-report/import-csv
 * Import inventory from CSV
 */
fleetReportRoutes.post('/import-csv', async (c) => {
  const body = await c.req.text();

  if (!body.trim()) {
    return c.json({ error: 'CSV data required' }, 400);
  }

  // Limit CSV size to prevent DoS
  const maxCsvSize = 1024 * 1024; // 1MB
  if (body.length > maxCsvSize) {
    return c.json({ error: 'CSV file too large. Max size: 1MB' }, 400);
  }

  try {
    // Simple CSV parsing (handles basic comma-separated values, not quoted fields)
    const lines = body.trim().split('\n');

    // Limit number of rows
    const maxRows = 10000;
    if (lines.length > maxRows) {
      return c.json({ error: `Too many rows. Max: ${maxRows}` }, 400);
    }

    const headers = lines[0].split(',').map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/^["']|["']$/g, '')
    );

    const domainIndex = headers.indexOf('domain');
    if (domainIndex === -1) {
      return c.json(
        {
          error: 'CSV must have a "domain" column',
          headers,
        },
        400
      );
    }

    const inventory: string[] = [];
    const seenDomains = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      // Basic parsing - split by comma, handle simple quoted values
      const columns = line.split(',').map((col) => col.trim().replace(/^["']|["']$/g, ''));
      const domain = columns[domainIndex]?.toLowerCase();

      // Validate and deduplicate
      if (domain && isValidDomain(domain) && !seenDomains.has(domain)) {
        seenDomains.add(domain);
        inventory.push(domain);
      }
    }

    return c.json({
      imported: inventory.length,
      inventory,
      preview: inventory.slice(0, 10),
    });
  } catch (error) {
    return c.json(
      {
        error: 'Failed to parse CSV',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      400
    );
  }
});

/**
 * GET /api/fleet-report/templates
 * Get available report templates
 */
fleetReportRoutes.get('/templates', (c) => {
  return c.json({
    templates: [
      {
        id: 'mail-security-baseline',
        name: 'Mail Security Baseline',
        description: 'Check SPF, DMARC, DKIM across inventory',
        checks: ['spf', 'dmarc', 'dkim', 'mx'],
      },
      {
        id: 'infrastructure-audit',
        name: 'Infrastructure Audit',
        description: 'Identify stale IPs and infrastructure issues',
        checks: ['infrastructure', 'delegation'],
      },
      {
        id: 'pre-migration-check',
        name: 'Pre-Migration Check',
        description: 'Full check before infrastructure migration',
        checks: ['spf', 'dmarc', 'dkim', 'mx', 'infrastructure', 'delegation'],
      },
    ],
  });
});

// =============================================================================
// Helper Types & Functions
// =============================================================================

interface FleetReportResult {
  domain: string;
  snapshotId: string;
  collectedAt: Date;
  checks: CheckResult[];
  issues: CheckResult[];
}

interface CheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warning' | 'missing';
  severity: 'ok' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, unknown>;
}

async function runChecks(
  _domain: string,
  observations: Array<{
    queryType: string;
    queryName: string;
    status: string;
    answerSection?: Array<{ data: string }>;
  }>,
  checkTypes: string[]
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // SPF Check
  if (checkTypes.includes('spf')) {
    const spfRecords = observations.filter(
      (o) =>
        o.queryType === 'TXT' &&
        o.status === 'success' &&
        o.answerSection?.some((a) => a.data.includes('v=spf1'))
    );

    if (spfRecords.length === 0) {
      results.push({
        check: 'spf',
        status: 'missing',
        severity: 'high',
        message: 'No SPF record found',
        details: { recommendation: 'Add SPF record to prevent spoofing' },
      });
    } else {
      const spfData =
        spfRecords[0].answerSection?.find((a) => a.data.includes('v=spf1'))?.data || '';

      if (spfData.includes('+all') || spfData.includes('?all')) {
        results.push({
          check: 'spf',
          status: 'warning',
          severity: 'medium',
          message: 'SPF has permissive all mechanism',
          details: { spfRecord: spfData },
        });
      } else {
        results.push({
          check: 'spf',
          status: 'pass',
          severity: 'ok',
          message: 'SPF record present',
        });
      }
    }
  }

  // DMARC Check
  if (checkTypes.includes('dmarc')) {
    const dmarcRecords = observations.filter(
      (o) =>
        o.queryType === 'TXT' &&
        o.queryName.includes('_dmarc') &&
        o.status === 'success' &&
        o.answerSection?.some((a) => a.data.includes('v=DMARC1'))
    );

    if (dmarcRecords.length === 0) {
      results.push({
        check: 'dmarc',
        status: 'missing',
        severity: 'high',
        message: 'No DMARC record found',
        details: { recommendation: 'Add DMARC record for email authentication' },
      });
    } else {
      const dmarcData =
        dmarcRecords[0].answerSection?.find((a) => a.data.includes('v=DMARC1'))?.data || '';
      const policyMatch = dmarcData.match(/p=(\w+)/);
      const policy = policyMatch ? policyMatch[1].toLowerCase() : 'none';

      if (policy === 'none') {
        results.push({
          check: 'dmarc',
          status: 'warning',
          severity: 'medium',
          message: 'DMARC policy is p=none (monitoring only)',
          details: { policy, recommendation: 'Consider upgrading to p=quarantine or p=reject' },
        });
      } else if (policy === 'quarantine' || policy === 'reject') {
        results.push({
          check: 'dmarc',
          status: 'pass',
          severity: 'ok',
          message: `DMARC policy is p=${policy}`,
        });
      }
    }
  }

  // MX Check
  if (checkTypes.includes('mx')) {
    const mxRecords = observations.filter(
      (o) =>
        o.queryType === 'MX' &&
        o.status === 'success' &&
        o.answerSection &&
        o.answerSection.length > 0
    );

    if (mxRecords.length === 0) {
      results.push({
        check: 'mx',
        status: 'missing',
        severity: 'medium',
        message: 'No MX records found',
      });
    } else {
      const nullMx = mxRecords[0].answerSection?.find((a) => a.data.trim() === '0 .');

      if (nullMx) {
        results.push({
          check: 'mx',
          status: 'pass',
          severity: 'ok',
          message: 'Null MX configured (domain does not accept mail)',
        });
      } else {
        results.push({
          check: 'mx',
          status: 'pass',
          severity: 'ok',
          message: 'MX records present',
        });
      }
    }
  }

  // DKIM Check
  if (checkTypes.includes('dkim')) {
    const dkimRecords = observations.filter(
      (o) =>
        o.queryType === 'TXT' &&
        o.queryName.includes('._domainkey.') &&
        o.status === 'success' &&
        o.answerSection?.some((a) => a.data.includes('v=DKIM1') || a.data.includes('k='))
    );

    if (dkimRecords.length === 0) {
      results.push({
        check: 'dkim',
        status: 'missing',
        severity: 'medium',
        message: 'No DKIM records found',
        details: { recommendation: 'Configure DKIM for email signing' },
      });
    } else {
      results.push({
        check: 'dkim',
        status: 'pass',
        severity: 'ok',
        message: `${dkimRecords.length} DKIM selector(s) found`,
      });
    }
  }

  return results;
}

function generateSummary(
  results: FleetReportResult[],
  checkTypes: string[]
): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    totalDomains: results.length,
    domainsWithIssues: results.filter((r) => r.issues.length > 0).length,
  };

  // Per-check breakdown
  for (const checkType of checkTypes) {
    const checkResults = results.flatMap((r) => r.checks.filter((c) => c.check === checkType));

    summary[`${checkType}Stats`] = {
      pass: checkResults.filter((r) => r.status === 'pass').length,
      fail: checkResults.filter((r) => r.status === 'fail').length,
      warning: checkResults.filter((r) => r.status === 'warning').length,
      missing: checkResults.filter((r) => r.status === 'missing').length,
    };
  }

  // Issue severity breakdown
  const allIssues = results.flatMap((r) => r.issues);
  summary.issueSeverity = {
    critical: allIssues.filter((i) => i.severity === 'critical').length,
    high: allIssues.filter((i) => i.severity === 'high').length,
    medium: allIssues.filter((i) => i.severity === 'medium').length,
    low: allIssues.filter((i) => i.severity === 'low').length,
  };

  return summary;
}

function isValidDomain(domain: string): boolean {
  // Domain validation: requires at least one dot (TLD), valid label format per RFC 1123
  // Each label: starts with alphanumeric, ends with alphanumeric, hyphens allowed in middle
  const labelRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$/;
  if (!domain || domain.length > 253) return false;

  const labels = domain.toLowerCase().split('.');
  // Must have at least 2 labels (domain.tld)
  if (labels.length < 2) return false;

  // Each label must be valid
  return labels.every((label) => labelRegex.test(label));
}
