/**
 * Ruleset Version Routes
 *
 * API endpoints for managing ruleset versions.
 * Provides visibility into versioned rule evaluation and
 * allows setting the active ruleset for default evaluation.
 */

import { RulesetVersionRepository } from '@dns-ops/db';
import { Hono } from 'hono';
import { requireAuth, requireWritePermission } from '../middleware/authorization.js';
import type { Env } from '../types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const rulesetVersionRoutes = new Hono<Env>()
  /**
   * GET /ruleset-versions
   * List all ruleset versions with pagination
   */
  .get('/', requireAuth, async (c) => {
    const db = c.get('db');
    if (!db) {
      return c.json({ error: 'Database not available' }, 503);
    }

    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
      const offset = parseInt(c.req.query('offset') || '0', 10);

      const repo = new RulesetVersionRepository(db);
      const [versions, total] = await Promise.all([repo.list(limit, offset), repo.count()]);

      return c.json({
        versions,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + versions.length < total,
        },
      });
    } catch (error) {
      console.error('Error listing ruleset versions:', error);
      return c.json(
        {
          error: 'Failed to list ruleset versions',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  })

  /**
   * GET /ruleset-versions/active
   * Get the currently active ruleset version
   */
  .get('/active', requireAuth, async (c) => {
    const db = c.get('db');
    if (!db) {
      return c.json({ error: 'Database not available' }, 503);
    }

    try {
      const repo = new RulesetVersionRepository(db);
      const active = await repo.findActive();

      if (!active) {
        return c.json({ error: 'No active ruleset version found' }, 404);
      }

      return c.json(active);
    } catch (error) {
      console.error('Error fetching active ruleset version:', error);
      return c.json(
        {
          error: 'Failed to fetch active ruleset version',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  })

  /**
   * GET /ruleset-versions/latest
   * Get the most recently created ruleset version
   */
  .get('/latest', requireAuth, async (c) => {
    const db = c.get('db');
    if (!db) {
      return c.json({ error: 'Database not available' }, 503);
    }

    try {
      const repo = new RulesetVersionRepository(db);
      const latest = await repo.findLatest();

      if (!latest) {
        return c.json({ error: 'No ruleset versions found' }, 404);
      }

      return c.json(latest);
    } catch (error) {
      console.error('Error fetching latest ruleset version:', error);
      return c.json(
        {
          error: 'Failed to fetch latest ruleset version',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  })

  /**
   * GET /ruleset-versions/by-version/:version
   * Get a ruleset version by version string (e.g., "1.2.0")
   */
  .get('/by-version/:version', requireAuth, async (c) => {
    const version = c.req.param('version');
    const db = c.get('db');

    if (!db) {
      return c.json({ error: 'Database not available' }, 503);
    }

    try {
      const repo = new RulesetVersionRepository(db);
      const rulesetVersion = await repo.findByVersion(version);

      if (!rulesetVersion) {
        return c.json({ error: 'Ruleset version not found' }, 404);
      }

      return c.json(rulesetVersion);
    } catch (error) {
      console.error('Error fetching ruleset version:', error);
      return c.json(
        {
          error: 'Failed to fetch ruleset version',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  })

  /**
   * GET /ruleset-versions/:id
   * Get a ruleset version by ID
   */
  .get('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');

    if (!UUID_RE.test(id)) {
      return c.json({ error: 'Invalid ruleset version ID' }, 400);
    }

    const db = c.get('db');
    if (!db) {
      return c.json({ error: 'Database not available' }, 503);
    }

    try {
      const repo = new RulesetVersionRepository(db);
      const rulesetVersion = await repo.findById(id);

      if (!rulesetVersion) {
        return c.json({ error: 'Ruleset version not found' }, 404);
      }

      return c.json(rulesetVersion);
    } catch (error) {
      console.error('Error fetching ruleset version:', error);
      return c.json(
        {
          error: 'Failed to fetch ruleset version',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  })

  /**
   * POST /ruleset-versions/:id/activate
   * Set a ruleset version as the active version
   * This deactivates all other versions
   */
  .post('/:id/activate', requireAuth, requireWritePermission, async (c) => {
    const id = c.req.param('id');

    if (!UUID_RE.test(id)) {
      return c.json({ error: 'Invalid ruleset version ID' }, 400);
    }

    const db = c.get('db');
    if (!db) {
      return c.json({ error: 'Database not available' }, 503);
    }

    try {
      const repo = new RulesetVersionRepository(db);
      const updated = await repo.setActive(id);

      if (!updated) {
        return c.json({ error: 'Ruleset version not found' }, 404);
      }

      return c.json({
        success: true,
        message: `Ruleset version ${updated.version} is now active`,
        rulesetVersion: updated,
      });
    } catch (error) {
      console.error('Error activating ruleset version:', error);
      return c.json(
        {
          error: 'Failed to activate ruleset version',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });
