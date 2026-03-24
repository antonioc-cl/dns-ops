/**
 * Suggestions Routes Tests - PR-02.6.1
 *
 * Tests for suggestion management endpoints:
 * - PATCH /api/suggestions/:suggestionId/apply
 * - PATCH /api/suggestions/:suggestionId/dismiss
 * - GET /api/suggestions/:suggestionId
 *
 * Key focus: API safeguard for review-only suggestions
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { suggestionsRoutes } from './suggestions.js';

// =============================================================================
// MOCK DATABASE SETUP
// =============================================================================

interface MockSuggestion {
  id: string;
  findingId: string;
  title: string;
  description: string;
  action: string;
  riskPosture: string;
  blastRadius: string;
  reviewOnly: boolean;
  appliedAt: Date | null;
  appliedBy: string | null;
  dismissedAt: Date | null;
  dismissedBy: string | null;
  dismissalReason: string | null;
  createdAt: Date;
}

interface MockData {
  suggestions: MockSuggestion[];
}

function createMockData(): MockData {
  const now = new Date();
  return {
    suggestions: [
      {
        id: 'suggestion-regular',
        findingId: 'finding-1',
        title: 'Add SPF record',
        description: 'Add SPF record to prevent email spoofing',
        action: 'Add TXT record with SPF policy',
        riskPosture: 'low',
        blastRadius: 'single',
        reviewOnly: false,
        appliedAt: null,
        appliedBy: null,
        dismissedAt: null,
        dismissedBy: null,
        dismissalReason: null,
        createdAt: now,
      },
      {
        id: 'suggestion-review-only',
        findingId: 'finding-2',
        title: 'Change MX records',
        description: 'Update MX records to new provider',
        action: 'Replace MX records',
        riskPosture: 'high',
        blastRadius: 'domain',
        reviewOnly: true,
        appliedAt: null,
        appliedBy: null,
        dismissedAt: null,
        dismissedBy: null,
        dismissalReason: null,
        createdAt: now,
      },
      {
        id: 'suggestion-already-applied',
        findingId: 'finding-3',
        title: 'Already done',
        description: 'This was already applied',
        action: 'N/A',
        riskPosture: 'low',
        blastRadius: 'single',
        reviewOnly: false,
        appliedAt: now,
        appliedBy: 'user-1',
        dismissedAt: null,
        dismissedBy: null,
        dismissalReason: null,
        createdAt: now,
      },
      {
        id: 'suggestion-dismissed',
        findingId: 'finding-4',
        title: 'Dismissed suggestion',
        description: 'This was dismissed',
        action: 'N/A',
        riskPosture: 'low',
        blastRadius: 'single',
        reviewOnly: false,
        appliedAt: null,
        appliedBy: null,
        dismissedAt: now,
        dismissedBy: 'user-1',
        dismissalReason: 'Not applicable',
        createdAt: now,
      },
    ],
  };
}

function createMockDb(data: MockData) {
  return {
    selectOne: vi.fn(async (_table: unknown, condition: unknown) => {
      // Extract ID from condition
      const cond = condition as { right: { value: string } };
      const id = cond?.right?.value;
      return data.suggestions.find((s) => s.id === id);
    }),
    update: vi.fn(async (_table: unknown, data: Partial<MockSuggestion>, condition: unknown) => {
      const cond = condition as { right: { value: string } };
      const id = cond?.right?.value;
      const suggestion = data.suggestions.find((s) => s.id === id);
      if (suggestion) {
        Object.assign(suggestion, data);
        return suggestion;
      }
      return null;
    }),
    insert: vi.fn(async (_table: unknown, data: unknown) => data),
    insertMany: vi.fn(async (_table: unknown, data: unknown[]) => data),
    delete: vi.fn(async () => null),
    selectWhere: vi.fn(async () => []),
    select: vi.fn(async () => []),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Suggestions Routes', () => {
  let app: Hono<Env>;
  let mockData: MockData;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockData = createMockData();
    mockDb = createMockDb(mockData);

    app = new Hono<Env>();

    // Setup middleware to inject dependencies
    app.use('*', (c, next) => {
      c.set('db', mockDb as unknown as Env['Variables']['db']);
      c.set('tenantId', 'test-tenant');
      c.set('actorId', 'test-user');
      return next();
    });

    app.route('/suggestions', suggestionsRoutes);
  });

  // ===========================================================================
  // PATCH /api/suggestions/:suggestionId/apply
  // ===========================================================================

  describe('PATCH /suggestions/:suggestionId/apply', () => {
    it('should apply a regular (non-review-only) suggestion', async () => {
      const res = await app.request('/suggestions/suggestion-regular/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; suggestion: { id: string } };
      expect(body.success).toBe(true);
      expect(body.suggestion.id).toBe('suggestion-regular');
    });

    it('should reject review-only suggestion without confirmApply', async () => {
      const res = await app.request('/suggestions/suggestion-review-only/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as {
        error: string;
        code: string;
        reviewOnly: boolean;
        hint: string;
      };
      expect(body.code).toBe('REQUIRES_CONFIRMATION');
      expect(body.reviewOnly).toBe(true);
      expect(body.hint).toContain('confirmApply');
    });

    it('should apply review-only suggestion with confirmApply: true', async () => {
      const res = await app.request('/suggestions/suggestion-review-only/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmApply: true }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        suggestion: { id: string };
        confirmed: boolean;
      };
      expect(body.success).toBe(true);
      expect(body.suggestion.id).toBe('suggestion-review-only');
      expect(body.confirmed).toBe(true);
    });

    it('should return 404 for non-existent suggestion', async () => {
      const res = await app.request('/suggestions/nonexistent/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string; code: string };
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should return 409 for already applied suggestion', async () => {
      const res = await app.request('/suggestions/suggestion-already-applied/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string; code: string };
      expect(body.code).toBe('ALREADY_APPLIED');
    });

    it('should return 409 for dismissed suggestion', async () => {
      const res = await app.request('/suggestions/suggestion-dismissed/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string; code: string };
      expect(body.code).toBe('DISMISSED');
    });

    it('should return 401 without authentication', async () => {
      const appNoAuth = new Hono<Env>();
      appNoAuth.use('*', (c, next) => {
        c.set('db', mockDb as unknown as Env['Variables']['db']);
        // No actorId set
        return next();
      });
      appNoAuth.route('/suggestions', suggestionsRoutes);

      const res = await appNoAuth.request('/suggestions/suggestion-regular/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // PATCH /api/suggestions/:suggestionId/dismiss
  // ===========================================================================

  describe('PATCH /suggestions/:suggestionId/dismiss', () => {
    it('should dismiss a pending suggestion', async () => {
      const res = await app.request('/suggestions/suggestion-regular/dismiss', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Not needed' }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; suggestion: { id: string } };
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent suggestion on dismiss', async () => {
      const res = await app.request('/suggestions/nonexistent/dismiss', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string; code: string };
      expect(body.code).toBe('NOT_FOUND');
    });

    it('should return 409 for already dismissed suggestion', async () => {
      const res = await app.request('/suggestions/suggestion-dismissed/dismiss', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string; code: string };
      expect(body.code).toBe('ALREADY_DISMISSED');
    });

    it('should return 409 for already applied suggestion on dismiss', async () => {
      const res = await app.request('/suggestions/suggestion-already-applied/dismiss', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string; code: string };
      expect(body.code).toBe('ALREADY_APPLIED');
    });
  });

  // ===========================================================================
  // GET /api/suggestions/:suggestionId
  // ===========================================================================

  describe('GET /suggestions/:suggestionId', () => {
    it('should return a suggestion by ID', async () => {
      const res = await app.request('/suggestions/suggestion-regular');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { suggestion: { id: string; title: string } };
      expect(body.suggestion.id).toBe('suggestion-regular');
      expect(body.suggestion.title).toBe('Add SPF record');
    });

    it('should return 404 for non-existent suggestion', async () => {
      const res = await app.request('/suggestions/nonexistent');

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string; code: string };
      expect(body.code).toBe('NOT_FOUND');
    });
  });

  // ===========================================================================
  // REVIEW-ONLY SAFEGUARD TESTS (PR-02.6.1)
  // ===========================================================================

  describe('PR-02.6.1: Review-Only Safeguard', () => {
    it('should return REQUIRES_CONFIRMATION code for review-only without confirmApply', async () => {
      const res = await app.request('/suggestions/suggestion-review-only/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmApply: false }),
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe('REQUIRES_CONFIRMATION');
    });

    it('should include helpful hint in REQUIRES_CONFIRMATION response', async () => {
      const res = await app.request('/suggestions/suggestion-review-only/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const body = (await res.json()) as { hint: string };
      expect(body.hint).toContain('confirmApply');
      expect(body.hint).toContain('true');
    });

    it('should include reviewOnly flag in response for clarity', async () => {
      const res = await app.request('/suggestions/suggestion-review-only/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const body = (await res.json()) as { reviewOnly: boolean };
      expect(body.reviewOnly).toBe(true);
    });

    it('should proceed with confirmApply: true for review-only', async () => {
      const res = await app.request('/suggestions/suggestion-review-only/apply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmApply: true }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { confirmed: boolean };
      expect(body.confirmed).toBe(true);
    });
  });
});
