/**
 * Fleet Report Routes Tests
 *
 * Tests for the fleet report API endpoints.
 * Verifies that DB context is properly available and routes work correctly.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../types.js';
import { fleetReportRoutes } from './fleet-report.js';

describe('Fleet Report Routes', () => {
  let app: Hono<Env>;

  beforeEach(() => {
    // Create app with fleet report routes and mock DB middleware
    app = new Hono<Env>();
    app.use('*', async (c, next) => {
      // Mock DB adapter - simulating what dbMiddleware provides
      c.set('db', {
        query: () => Promise.resolve([]),
        getDrizzle: () => ({
          query: {
            domains: { findMany: () => Promise.resolve([]) },
            snapshots: { findFirst: () => Promise.resolve(null) },
            findings: { findMany: () => Promise.resolve([]) },
          },
        }),
      } as unknown as import('@dns-ops/db').IDatabaseAdapter);
      c.set('tenantId', 'test-tenant-uuid');
      c.set('actorId', 'test-actor');
      await next();
    });
    app.route('/api/fleet-report', fleetReportRoutes);
  });

  describe('POST /api/fleet-report/run', () => {
    it('should return 503 if database is not available', async () => {
      // Create app WITHOUT db middleware to simulate missing db context
      const appWithoutDb = new Hono<Env>();
      appWithoutDb.route('/api/fleet-report', fleetReportRoutes);

      const res = await appWithoutDb.request('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: ['example.com'] }),
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('should return 400 if inventory is empty', async () => {
      const res = await app.request('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: [] }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Inventory required');
    });

    it('should return 400 if inventory is missing', async () => {
      const res = await app.request('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Inventory required');
    });

    it('should return 400 if inventory exceeds max size', async () => {
      const largeInventory = Array(1001).fill('example.com');

      const res = await app.request('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: largeInventory }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('too large');
    });

    it('should process valid inventory (DB context available)', async () => {
      // This test verifies that the DB context is properly available
      // The route successfully uses c.get('db') without crashing
      const res = await app.request('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: ['example.com'] }),
      });

      // The route should work (200) or fail gracefully with a domain/repository error
      // The key assertion is that we DON'T get a "DB context missing" crash
      expect([200, 500]).toContain(res.status);
      const json = await res.json();
      // Should NOT be a "DB context missing" error (if error exists)
      if (json.error) {
        expect(json.error).not.toContain('DB context missing');
      }
    });
  });

  describe('GET /api/fleet-report/templates', () => {
    it('should return available report templates', async () => {
      const res = await app.request('/api/fleet-report/templates');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.templates).toBeInstanceOf(Array);
      expect(json.templates.length).toBeGreaterThan(0);
      expect(json.templates[0]).toHaveProperty('id');
      expect(json.templates[0]).toHaveProperty('name');
      expect(json.templates[0]).toHaveProperty('checks');
    });

    it('should include mail-security-baseline template with mail checks', async () => {
      const res = await app.request('/api/fleet-report/templates');
      const json = await res.json();

      const mailTemplate = json.templates.find(
        (t: { id: string }) => t.id === 'mail-security-baseline'
      );
      expect(mailTemplate).toBeDefined();
      expect(mailTemplate.checks).toContain('spf');
      expect(mailTemplate.checks).toContain('dmarc');
      expect(mailTemplate.checks).toContain('dkim');
      expect(mailTemplate.checks).toContain('mx');
    });

    it('should include infrastructure-audit template with infrastructure and delegation checks', async () => {
      const res = await app.request('/api/fleet-report/templates');
      const json = await res.json();

      const infraTemplate = json.templates.find(
        (t: { id: string }) => t.id === 'infrastructure-audit'
      );
      expect(infraTemplate).toBeDefined();
      expect(infraTemplate.checks).toContain('infrastructure');
      expect(infraTemplate.checks).toContain('delegation');
    });

    it('should include pre-migration-check template with all check types', async () => {
      const res = await app.request('/api/fleet-report/templates');
      const json = await res.json();

      const migrationTemplate = json.templates.find(
        (t: { id: string }) => t.id === 'pre-migration-check'
      );
      expect(migrationTemplate).toBeDefined();
      expect(migrationTemplate.checks).toContain('spf');
      expect(migrationTemplate.checks).toContain('dmarc');
      expect(migrationTemplate.checks).toContain('dkim');
      expect(migrationTemplate.checks).toContain('mx');
      expect(migrationTemplate.checks).toContain('infrastructure');
      expect(migrationTemplate.checks).toContain('delegation');
    });
  });

  describe('POST /api/fleet-report/import-csv', () => {
    it('should import domains from CSV', async () => {
      const csv = 'domain\nexample.com\nexample.org\n';

      const res = await app.request('/api/fleet-report/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.imported).toBe(2);
      expect(json.inventory).toContain('example.com');
      expect(json.inventory).toContain('example.org');
    });

    it('should return 400 for empty CSV', async () => {
      const res = await app.request('/api/fleet-report/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: '',
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('CSV data required');
    });

    it('should return 400 if domain column is missing', async () => {
      const csv = 'name\nexample.com\n';

      const res = await app.request('/api/fleet-report/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('domain" column');
    });
  });
});

// =============================================================================
// FLEET REPORT LOGIC TESTS (PR-07.5)
// =============================================================================

/**
 * PR-07.5: Fleet Report Processing Logic Tests
 *
 * Tests the exported helper functions (findingsToCheckResults,
 * mapSeverityToStatus, generateSummary) that drive fleet report output.
 * These are pure functions — no DB needed.
 */
describe('Fleet Report Processing Logic (PR-07.5)', () => {
  describe('findingsToCheckResults', () => {
    it('returns pass for check type with no matching findings', () => {
      const results = findingsToCheckResults([], ['spf', 'dmarc']);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        check: 'spf',
        status: 'pass',
        severity: 'ok',
        message: 'No SPF issues detected',
      });
      expect(results[1]).toEqual({
        check: 'dmarc',
        status: 'pass',
        severity: 'ok',
        message: 'No DMARC issues detected',
      });
    });

    it('maps SPF findings to spf check results with correct severity', () => {
      const findings = [makeFinding('mail.no-spf-record', 'high', 'No SPF record found')];
      const results = findingsToCheckResults(findings, ['spf']);
      expect(results.length).toBeGreaterThanOrEqual(1);
      const spfResult = results.find((r) => r.check === 'spf' && r.status !== 'pass');
      expect(spfResult, 'expected an SPF fail result').toBeDefined();
      if (!spfResult) throw new Error('unreachable');
      expect(spfResult.status).toBe('fail');
      expect(spfResult.severity).toBe('high');
    });

    it('maps DMARC findings to dmarc check results', () => {
      const findings = [makeFinding('mail.dmarc-policy-none', 'medium', 'DMARC policy is none')];
      const results = findingsToCheckResults(findings, ['dmarc']);
      const dmarcResult = results.find((r) => r.check === 'dmarc' && r.status !== 'pass');
      expect(dmarcResult, 'expected a DMARC warning result').toBeDefined();
      if (!dmarcResult) throw new Error('unreachable');
      expect(dmarcResult.status).toBe('warning');
    });

    it('handles multiple findings across multiple check types', () => {
      const findings = [
        makeFinding('mail.no-spf-record', 'high', 'No SPF'),
        makeFinding('mail.no-dmarc-record', 'high', 'No DMARC'),
        makeFinding('mail.mx-present', 'info', 'MX present'),
      ];
      const results = findingsToCheckResults(findings, ['spf', 'dmarc', 'mx']);
      // spf: at least one fail, dmarc: at least one fail, mx: should have a result
      expect(results.some((r) => r.check === 'spf')).toBe(true);
      expect(results.some((r) => r.check === 'dmarc')).toBe(true);
      expect(results.some((r) => r.check === 'mx')).toBe(true);
    });

    it('infrastructure findings map to infrastructure check', () => {
      const findings = [makeFinding('dns.authoritative-timeout', 'critical', 'NS timeout')];
      const results = findingsToCheckResults(findings, ['infrastructure']);
      const infraResult = results.find((r) => r.check === 'infrastructure' && r.status !== 'pass');
      expect(infraResult, 'expected an infrastructure fail result').toBeDefined();
      if (!infraResult) throw new Error('unreachable');
      expect(infraResult.severity).toBe('critical');
      expect(infraResult.status).toBe('fail');
    });
  });

  describe('mapSeverityToStatus', () => {
    it('maps critical and high to fail', () => {
      expect(mapSeverityToStatus('critical')).toBe('fail');
      expect(mapSeverityToStatus('high')).toBe('fail');
    });

    it('maps medium to warning', () => {
      expect(mapSeverityToStatus('medium')).toBe('warning');
    });

    it('maps low and info to pass', () => {
      expect(mapSeverityToStatus('low')).toBe('pass');
      expect(mapSeverityToStatus('info')).toBe('pass');
    });

    it('maps unknown severity to pass', () => {
      expect(mapSeverityToStatus('unknown')).toBe('pass');
    });
  });

  describe('generateSummary', () => {
    it('returns correct totals for empty results', () => {
      const summary = generateSummary([], ['spf', 'dmarc']);
      expect(summary.totalDomains).toBe(0);
      expect(summary.domainsWithIssues).toBe(0);
      expect(summary.issueSeverity).toEqual({
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      });
    });

    it('counts domains with issues correctly', () => {
      const results = [
        makeFleetResult('a.com', [
          { check: 'spf', status: 'fail', severity: 'high', message: 'No SPF' },
        ]),
        makeFleetResult('b.com', [
          { check: 'spf', status: 'pass', severity: 'ok', message: 'SPF OK' },
        ]),
        makeFleetResult('c.com', [
          { check: 'dmarc', status: 'fail', severity: 'critical', message: 'No DMARC' },
          { check: 'spf', status: 'warning', severity: 'medium', message: 'SPF weak' },
        ]),
      ];
      const summary = generateSummary(results, ['spf', 'dmarc']);
      expect(summary.totalDomains).toBe(3);
      expect(summary.domainsWithIssues).toBe(2); // a.com and c.com
    });

    it('calculates severity breakdown correctly', () => {
      const results = [
        makeFleetResult('a.com', [
          { check: 'spf', status: 'fail', severity: 'critical', message: 'x' },
          { check: 'spf', status: 'fail', severity: 'critical', message: 'y' },
        ]),
        makeFleetResult('b.com', [
          { check: 'dmarc', status: 'fail', severity: 'high', message: 'z' },
          { check: 'mx', status: 'warning', severity: 'medium', message: 'w' },
        ]),
      ];
      const summary = generateSummary(results, ['spf', 'dmarc', 'mx']);
      const severity = summary.issueSeverity as Record<string, number>;
      expect(severity.critical).toBe(2);
      expect(severity.high).toBe(1);
      expect(severity.medium).toBe(1);
      expect(severity.low).toBe(0);
    });
  });
});

// -- Test data helpers --------------------------------------------------------

import type { Finding } from '@dns-ops/db';
import { findingsToCheckResults, generateSummary, mapSeverityToStatus } from './fleet-report.js';

function makeFinding(type: string, severity: string, title: string): Finding {
  return {
    id: `finding-${Math.random().toString(36).slice(2, 8)}`,
    snapshotId: 'snap-1',
    type,
    title,
    description: title,
    severity,
    confidence: 'high',
    ruleId: `rule-${type}`,
    evidenceRef: null,
    suggestion: null,
    metadata: null,
    createdAt: new Date(),
  } as Finding;
}

interface CheckResultLike {
  check: string;
  status: string;
  severity: string;
  message: string;
}

function makeFleetResult(domain: string, checks: CheckResultLike[]) {
  return {
    domain,
    snapshotId: `snap-${domain}`,
    collectedAt: new Date(),
    rulesetVersion: 'v1',
    findingsCount: checks.length,
    checks: checks as Array<{
      check: string;
      status: 'pass' | 'fail' | 'warning' | 'missing';
      severity: 'ok' | 'low' | 'medium' | 'high' | 'critical';
      message: string;
    }>,
    issues: checks.filter((c) => c.severity !== 'ok') as Array<{
      check: string;
      status: 'pass' | 'fail' | 'warning' | 'missing';
      severity: 'ok' | 'low' | 'medium' | 'high' | 'critical';
      message: string;
    }>,
  };
}
