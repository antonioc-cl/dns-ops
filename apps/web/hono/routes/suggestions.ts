/**
 * Suggestions Routes
 *
 * API endpoints for managing remediation suggestions.
 * Includes safeguard for review-only suggestions (PR-02.6.1).
 */

import { SuggestionRepository } from '@dns-ops/db';
import { Hono } from 'hono';
import { boolean, validateBody } from '../middleware/validation.js';
import type { Env } from '../types.js';

export const suggestionsRoutes = new Hono<Env>();

// =============================================================================
// SCHEMAS
// =============================================================================

interface ApplySuggestionBody {
  confirmApply?: boolean;
}

const ApplySuggestionSchema = {
  confirmApply: boolean('confirmApply', false),
};

// =============================================================================
// PATCH /api/suggestions/:suggestionId/apply
// =============================================================================

/**
 * Apply a suggestion
 *
 * For review-only suggestions, requires confirmApply: true in request body.
 * This safeguard prevents accidental application of risky changes.
 *
 * Request: { confirmApply?: boolean }
 * Response: { success: true, suggestion: Suggestion }
 * Error: { error: string, code: 'REQUIRES_CONFIRMATION' | 'NOT_FOUND' | 'ALREADY_APPLIED' }
 */
suggestionsRoutes.patch('/:suggestionId/apply', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  const suggestionId = c.req.param('suggestionId');
  const actorId = c.get('actorId');

  if (!actorId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  // Parse request body with optional confirmApply
  const bodyResult = await validateBody<ApplySuggestionBody>(c, ApplySuggestionSchema);
  const confirmApply = bodyResult.success ? bodyResult.data.confirmApply : undefined;

  const suggestionRepo = new SuggestionRepository(db);

  // Find the suggestion
  const suggestion = await suggestionRepo.findById(suggestionId);
  if (!suggestion) {
    return c.json(
      {
        error: 'Suggestion not found',
        code: 'NOT_FOUND',
        suggestionId,
      },
      404
    );
  }

  // Check if already applied
  if (suggestion.appliedAt) {
    return c.json(
      {
        error: 'Suggestion already applied',
        code: 'ALREADY_APPLIED',
        suggestionId,
        appliedAt: suggestion.appliedAt,
        appliedBy: suggestion.appliedBy,
      },
      409
    );
  }

  // Check if dismissed
  if (suggestion.dismissedAt) {
    return c.json(
      {
        error: 'Suggestion was dismissed',
        code: 'DISMISSED',
        suggestionId,
        dismissedAt: suggestion.dismissedAt,
      },
      409
    );
  }

  // PR-02.6.1: Safeguard for review-only suggestions
  if (suggestion.reviewOnly && !confirmApply) {
    return c.json(
      {
        error: 'This suggestion is marked as review-only and requires explicit confirmation',
        code: 'REQUIRES_CONFIRMATION',
        suggestionId,
        reviewOnly: true,
        hint: 'Include { "confirmApply": true } in the request body to apply this suggestion',
      },
      403
    );
  }

  // Apply the suggestion
  const applied = await suggestionRepo.markApplied(suggestionId, actorId);

  if (!applied) {
    return c.json(
      {
        error: 'Failed to apply suggestion',
        suggestionId,
      },
      500
    );
  }

  return c.json({
    success: true,
    suggestion: applied,
    confirmed: suggestion.reviewOnly && confirmApply,
  });
});

// =============================================================================
// PATCH /api/suggestions/:suggestionId/dismiss
// =============================================================================

/**
 * Dismiss a suggestion
 *
 * Request: { reason?: string }
 * Response: { success: true, suggestion: Suggestion }
 */
suggestionsRoutes.patch('/:suggestionId/dismiss', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  const suggestionId = c.req.param('suggestionId');
  const actorId = c.get('actorId');

  if (!actorId) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  let reason: string | undefined;
  try {
    const body = await c.req.json();
    reason = body.reason;
  } catch {
    // No body is fine
  }

  const suggestionRepo = new SuggestionRepository(db);

  // Find the suggestion
  const suggestion = await suggestionRepo.findById(suggestionId);
  if (!suggestion) {
    return c.json(
      {
        error: 'Suggestion not found',
        code: 'NOT_FOUND',
        suggestionId,
      },
      404
    );
  }

  // Check if already dismissed
  if (suggestion.dismissedAt) {
    return c.json(
      {
        error: 'Suggestion already dismissed',
        code: 'ALREADY_DISMISSED',
        suggestionId,
      },
      409
    );
  }

  // Check if already applied
  if (suggestion.appliedAt) {
    return c.json(
      {
        error: 'Suggestion was already applied',
        code: 'ALREADY_APPLIED',
        suggestionId,
      },
      409
    );
  }

  // Dismiss the suggestion
  const dismissed = await suggestionRepo.markDismissed(suggestionId, actorId, reason);

  if (!dismissed) {
    return c.json(
      {
        error: 'Failed to dismiss suggestion',
        suggestionId,
      },
      500
    );
  }

  return c.json({
    success: true,
    suggestion: dismissed,
  });
});

// =============================================================================
// GET /api/suggestions/:suggestionId
// =============================================================================

/**
 * Get a single suggestion by ID
 */
suggestionsRoutes.get('/:suggestionId', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  const suggestionId = c.req.param('suggestionId');
  const suggestionRepo = new SuggestionRepository(db);

  const suggestion = await suggestionRepo.findById(suggestionId);
  if (!suggestion) {
    return c.json(
      {
        error: 'Suggestion not found',
        code: 'NOT_FOUND',
        suggestionId,
      },
      404
    );
  }

  return c.json({ suggestion });
});
