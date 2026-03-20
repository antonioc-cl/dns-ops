/**
 * Snapshot History and Diff Routes - Bead 13
 *
 * API endpoints for:
 * - Listing snapshots per domain
 * - Comparing snapshots (before/after)
 * - Diff highlighting for records, TTLs, findings, scope
 */

import { DomainRepository, SnapshotRepository } from '@dns-ops/db';
import { findings, recordSets } from '@dns-ops/db/schema';
import { compareSnapshots } from '@dns-ops/parsing';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Env } from '../types.js';

export const snapshotRoutes = new Hono<Env>();

/**
 * GET /api/snapshots/:domain
 * List all snapshots for a domain
 */
snapshotRoutes.get('/:domain', async (c) => {
  const db = c.get('db');
  const domainName = c.req.param('domain');
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);

  try {
    const domainRepo = new DomainRepository(db);
    const snapshotRepo = new SnapshotRepository(db);

    const domain = await domainRepo.findByName(domainName);

    if (!domain) {
      return c.json({ error: 'Domain not found' }, 404);
    }

    const allSnapshots = await snapshotRepo.findByDomain(domain.id, limit + offset);
    const snapshots = allSnapshots.slice(offset, offset + limit);

    return c.json({
      domain: domainName,
      count: snapshots.length,
      snapshots: snapshots.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        rulesetVersion: s.rulesetVersionId,
        queryScope: {
          names: s.queriedNames,
          types: s.queriedTypes,
          vantages: s.vantages,
        },
      })),
    });
  } catch (error) {
    console.error('Snapshot list error:', error);
    return c.json(
      {
        error: 'Failed to fetch snapshots',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/snapshots/:domain/latest
 * Get the most recent snapshot for a domain
 * Must be registered before /:domain/:id to avoid "latest" being captured as :id
 */
snapshotRoutes.get('/:domain/latest', async (c) => {
  const db = c.get('db');
  const domainName = c.req.param('domain');

  try {
    const domainRepo = new DomainRepository(db);
    const snapshotRepo = new SnapshotRepository(db);

    const domain = await domainRepo.findByName(domainName);
    if (!domain) {
      return c.json({ error: 'Domain not found' }, 404);
    }

    const snapshots = await snapshotRepo.findByDomain(domain.id, 1);

    if (snapshots.length === 0) {
      return c.json({ error: 'No snapshots found for domain' }, 404);
    }

    const snapshot = snapshots[0];

    return c.json({
      id: snapshot.id,
      domain: domainName,
      createdAt: snapshot.createdAt,
      rulesetVersion: snapshot.rulesetVersionId,
      queryScope: {
        names: snapshot.queriedNames,
        types: snapshot.queriedTypes,
        vantages: snapshot.vantages,
      },
    });
  } catch (error) {
    console.error('Latest snapshot error:', error);
    return c.json(
      {
        error: 'Failed to fetch latest snapshot',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/snapshots/:domain/:id
 * Get a specific snapshot with details
 */
snapshotRoutes.get('/:domain/:id', async (c) => {
  const db = c.get('db');
  const snapshotId = c.req.param('id');

  try {
    const snapshotRepo = new SnapshotRepository(db);
    const snapshot = await snapshotRepo.findById(snapshotId);

    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    return c.json({
      id: snapshot.id,
      domainId: snapshot.domainId,
      createdAt: snapshot.createdAt,
      rulesetVersion: snapshot.rulesetVersionId,
      queryScope: {
        names: snapshot.queriedNames,
        types: snapshot.queriedTypes,
        vantages: snapshot.vantages,
      },
      metadata: snapshot.metadata,
    });
  } catch (error) {
    console.error('Snapshot detail error:', error);
    return c.json(
      {
        error: 'Failed to fetch snapshot',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/snapshots/:domain/diff
 * Compare two snapshots
 */
snapshotRoutes.post('/:domain/diff', async (c) => {
  const db = c.get('db');
  const domainName = c.req.param('domain');
  const body = await c.req.json().catch(() => ({}) as { snapshotA?: string; snapshotB?: string });
  const { snapshotA, snapshotB } = body;

  if (!snapshotA || !snapshotB) {
    return c.json(
      {
        error: 'Both snapshotA and snapshotB IDs are required',
        example: { snapshotA: 'snap-123', snapshotB: 'snap-456' },
      },
      400
    );
  }

  try {
    const domainRepo = new DomainRepository(db);
    const snapshotRepo = new SnapshotRepository(db);

    const domain = await domainRepo.findByName(domainName);
    if (!domain) {
      return c.json({ error: 'Domain not found' }, 404);
    }

    // Fetch both snapshots
    const [snapA, snapB] = await Promise.all([
      snapshotRepo.findById(snapshotA),
      snapshotRepo.findById(snapshotB),
    ]);

    if (!snapA) {
      return c.json({ error: `Snapshot ${snapshotA} not found` }, 404);
    }
    if (!snapB) {
      return c.json({ error: `Snapshot ${snapshotB} not found` }, 404);
    }

    // Verify snapshots belong to this domain
    if (snapA.domainId !== domain.id || snapB.domainId !== domain.id) {
      return c.json(
        {
          error: 'Snapshots do not belong to the specified domain',
        },
        400
      );
    }

    // Fetch records and findings for both snapshots
    const [recordsA, recordsB, findingsA, findingsB] = await Promise.all([
      db.selectWhere(recordSets, eq(recordSets.snapshotId, snapshotA)),
      db.selectWhere(recordSets, eq(recordSets.snapshotId, snapshotB)),
      db.selectWhere(findings, eq(findings.snapshotId, snapshotA)),
      db.selectWhere(findings, eq(findings.snapshotId, snapshotB)),
    ]);

    // Generate diff
    const diff = compareSnapshots(
      {
        id: snapA.id,
        createdAt: snapA.createdAt,
        rulesetVersion: String(snapA.rulesetVersionId || 'unknown'),
        queriedNames: snapA.queriedNames,
        queriedTypes: snapA.queriedTypes,
        vantages: snapA.vantages,
      },
      {
        id: snapB.id,
        createdAt: snapB.createdAt,
        rulesetVersion: String(snapB.rulesetVersionId || 'unknown'),
        queriedNames: snapB.queriedNames,
        queriedTypes: snapB.queriedTypes,
        vantages: snapB.vantages,
      },
      recordsA,
      recordsB,
      findingsA,
      findingsB
    );

    return c.json({
      domain: domainName,
      diff,
      ambiguityWarning: diff.comparison.scopeChanges
        ? 'Query scope differs between snapshots. Some changes may reflect scope differences rather than actual DNS changes.'
        : undefined,
    });
  } catch (error) {
    console.error('Snapshot diff error:', error);
    return c.json(
      {
        error: 'Failed to compare snapshots',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/snapshots/:domain/compare-latest
 * Diff the two most recent snapshots and return the result inline.
 * Returns 400 if fewer than 2 snapshots exist.
 */
snapshotRoutes.post('/:domain/compare-latest', async (c) => {
  const db = c.get('db');
  const domainName = c.req.param('domain');

  try {
    const domainRepo = new DomainRepository(db);
    const snapshotRepo = new SnapshotRepository(db);

    const domain = await domainRepo.findByName(domainName);
    if (!domain) {
      return c.json({ error: 'Domain not found' }, 404);
    }

    const snapshots = await snapshotRepo.findByDomain(domain.id, 2);

    if (snapshots.length < 2) {
      return c.json(
        {
          error: 'Need at least 2 snapshots to compare',
          availableSnapshots: snapshots.length,
        },
        400
      );
    }

    // snapshots[0] is newest, snapshots[1] is older
    const [snapB, snapA] = snapshots;

    const [recordsA, recordsB, findingsA, findingsB] = await Promise.all([
      db.selectWhere(recordSets, eq(recordSets.snapshotId, snapA.id)),
      db.selectWhere(recordSets, eq(recordSets.snapshotId, snapB.id)),
      db.selectWhere(findings, eq(findings.snapshotId, snapA.id)),
      db.selectWhere(findings, eq(findings.snapshotId, snapB.id)),
    ]);

    const diff = compareSnapshots(
      {
        id: snapA.id,
        createdAt: snapA.createdAt,
        rulesetVersion: String(snapA.rulesetVersionId || 'unknown'),
        queriedNames: snapA.queriedNames,
        queriedTypes: snapA.queriedTypes,
        vantages: snapA.vantages,
      },
      {
        id: snapB.id,
        createdAt: snapB.createdAt,
        rulesetVersion: String(snapB.rulesetVersionId || 'unknown'),
        queriedNames: snapB.queriedNames,
        queriedTypes: snapB.queriedTypes,
        vantages: snapB.vantages,
      },
      recordsA,
      recordsB,
      findingsA,
      findingsB
    );

    return c.json({ diff });
  } catch (error) {
    console.error('Compare latest error:', error);
    return c.json(
      {
        error: 'Failed to compare snapshots',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
