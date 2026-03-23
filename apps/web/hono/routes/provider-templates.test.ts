/**
 * Provider Template Routes Tests
 *
 * Tests for provider template listing, detection, and comparison endpoints.
 * Uses the mock-DB + app.request() pattern.
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { createMockDb as createGenericMockDb } from '@dns-ops/testkit';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { Env } from '../types.js';
import { providerTemplateRoutes } from './provider-templates.js';

// =============================================================================
// MOCK DB HELPERS
// =============================================================================

interface MockState {
  snapshots: Array<Record<string, unknown>>;
  recordSets: Array<Record<string, unknown>>;
}

function createMockDb(state: MockState): IDatabaseAdapter {
  return createGenericMockDb({
    snapshots: state.snapshots,
    record_sets: state.recordSets,
  });
}

// =============================================================================
// APP SETUP
// =============================================================================

function createApp(state: MockState) {
  const db = createMockDb(state);
  const app = new Hono<Env>();

  // Inject auth and DB context
  app.use('*', async (c, next) => {
    c.set('db', db as Env['Variables']['db']);
    c.set('tenantId', 'tenant-1');
    c.set('actorId', 'test-actor');
    c.set('actorEmail', 'test@example.com');
    await next();
  });

  app.route('/api/mail', providerTemplateRoutes);
  return app;
}

// =============================================================================
// TESTS
// =============================================================================

describe('Provider Template Routes', () => {
  describe('GET /api/mail/providers', () => {
    it('returns list of all provider templates', async () => {
      const app = createApp({ snapshots: [], recordSets: [] });
      const res = await app.request('/api/mail/providers');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { providers: Array<{ id: string; provider: string }> };
      expect(body.providers).toBeDefined();
      expect(body.providers.length).toBeGreaterThan(0);

      // Verify structure
      const first = body.providers[0];
      expect(first.id).toBeDefined();
      expect(first.provider).toBeDefined();
    });

    it('includes expected provider names', async () => {
      const app = createApp({ snapshots: [], recordSets: [] });
      const res = await app.request('/api/mail/providers');
      const body = (await res.json()) as { providers: Array<{ provider: string }> };

      const providerNames = body.providers.map((p) => p.provider);
      expect(providerNames).toContain('google-workspace');
      expect(providerNames).toContain('microsoft-365');
    });
  });

  describe('GET /api/mail/providers/:provider', () => {
    it('returns template for a known provider', async () => {
      const app = createApp({ snapshots: [], recordSets: [] });
      const res = await app.request('/api/mail/providers/google-workspace');

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        template: { provider: string; expected: Record<string, unknown> };
      };
      expect(body.template.provider).toBe('google-workspace');
      expect(body.template.expected).toBeDefined();
    });

    it('returns 404 for unknown provider', async () => {
      const app = createApp({ snapshots: [], recordSets: [] });
      const res = await app.request('/api/mail/providers/nonexistent-provider');

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string; availableProviders: string[] };
      expect(body.error).toContain('not found');
      expect(body.availableProviders).toBeDefined();
    });
  });

  describe('POST /api/mail/detect-provider', () => {
    it('detects Google Workspace from MX records', async () => {
      const app = createApp({ snapshots: [], recordSets: [] });
      const res = await app.request('/api/mail/detect-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mxRecords: ['10 aspmx.l.google.com', '20 alt1.aspmx.l.google.com'],
          spfRecord: 'v=spf1 include:_spf.google.com ~all',
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        detection: { provider: string; confidence: string };
      };
      expect(body.detection.provider).toBe('google-workspace');
    });

    it('returns 400 when mxRecords is missing', async () => {
      const app = createApp({ snapshots: [], recordSets: [] });
      const res = await app.request('/api/mail/detect-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/mail/compare-to-provider', () => {
    it('returns 400 when snapshotId is missing', async () => {
      const app = createApp({ snapshots: [], recordSets: [] });
      const res = await app.request('/api/mail/compare-to-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('returns 404 when snapshot does not exist', async () => {
      const app = createApp({ snapshots: [], recordSets: [] });
      const res = await app.request('/api/mail/compare-to-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: 'nonexistent-id' }),
      });

      expect(res.status).toBe(404);
    });

    it('compares snapshot against provider template', async () => {
      const snapshotId = 'snap-1';
      const app = createApp({
        snapshots: [
          {
            id: snapshotId,
            domainName: 'example.com',
            domainId: 'dom-1',
            createdAt: new Date(),
            resultState: 'success',
          },
        ],
        recordSets: [
          {
            id: 'rs-1',
            snapshotId,
            type: 'MX',
            name: 'example.com',
            values: ['10 aspmx.l.google.com'],
          },
          {
            id: 'rs-2',
            snapshotId,
            type: 'TXT',
            name: 'example.com',
            values: ['v=spf1 include:_spf.google.com ~all'],
          },
        ],
      });

      const res = await app.request('/api/mail/compare-to-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId, provider: 'google-workspace' }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        domain: string;
        provider: string;
        comparison: { overallMatch: boolean };
      };
      expect(body.domain).toBe('example.com');
      expect(body.provider).toBe('google-workspace');
      expect(body.comparison).toBeDefined();
    });
  });

  describe('POST /api/mail/providers/:provider/selectors', () => {
    it('rejects non-admin requests with 403', async () => {
      const app = createApp({ snapshots: [], recordSets: [] });
      const res = await app.request('/api/mail/providers/google-workspace/selectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selector: 'custom-selector' }),
      });

      // No CF-Access header, no X-Internal-Secret, no X-Dev-Actor →
      // requireAdminAccess middleware rejects with 403.
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('Forbidden');
    });
  });
});
