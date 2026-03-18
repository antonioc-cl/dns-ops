/**
 * Snapshot History and Diff Routes - Bead 13
 *
 * API endpoints for:
 * - Listing snapshots per domain
 * - Comparing snapshots (before/after, vantage-to-vantage)
 * - Diff highlighting for records, TTLs, findings, scope
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { SnapshotRepository, DomainRepository, FindingRepository } from '@dns-ops/db/repos';
import { compareSnapshots } from '@dns-ops/parsing/diff';

export const snapshotRoutes = new Hono<Env>();

/**
 * GET /api/snapshots/:domain
 * List all snapshots for a domain
 */
snapshotRoutes.get('/:domain', async (c) => {
  const db = c.get('db');
  const domainName = c.req.param('domain');
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  try {
    const domainRepo = new DomainRepository(db);
    const snapshotRepo = new SnapshotRepository(db);

    const domain = await domainRepo.findByName(domainName);

    if (!domain) {
      return c.json({ error: 'Domain not found' }, 404);
    }

    const snapshots = await snapshotRepo.findByDomainId(domain.id, { limit, offset });

    return c.json({
      domain: domainName,
      total: snapshots.length,
      snapshots: snapshots.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        rulesetVersion: s.rulesetVersion,
        queryScope: {
          names: s.queriedNames,
          types: s.queriedTypes,
          vantages: s.vantages,
        },
      })),
    });

  } catch (error) {
    console.error('Snapshot list error:', error);
    return c.json({
      error: 'Failed to fetch snapshots',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
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
      rulesetVersion: snapshot.rulesetVersion,
      queryScope: {
        names: snapshot.queriedNames,
        types: snapshot.queriedTypes,
        vantages: snapshot.vantages,
      },
      metadata: snapshot.metadata,
    });

  } catch (error) {
    console.error('Snapshot detail error:', error);
    return c.json({
      error: 'Failed to fetch snapshot',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/snapshots/:domain/diff
 * Compare two snapshots
 */
snapshotRoutes.post('/:domain/diff', async (c) => {
  const db = c.get('db');
  const domainName = c.req.param('domain');
  const body = await c.req.json().catch(() => ({}));
  const { snapshotA, snapshotB } = body;

  if (!snapshotA || !snapshotB) {
    return c.json({
      error: 'Both snapshotA and snapshotB IDs are required',
      example: { snapshotA: 'snap-123', snapshotB: 'snap-456' },
    }, 400);
  }

  try {
    const domainRepo = new DomainRepository(db);
    const snapshotRepo = new SnapshotRepository(db);
    const findingRepo = new FindingRepository(db);

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
      return c.json({
        error: 'Snapshots do not belong to the specified domain',
      }, 400);
    }

    // Fetch records and findings for both snapshots
    const [recordsA, recordsB, findingsA, findingsB] = await Promise.all([
      snapshotRepo.getRecords(snapshotA),
      snapshotRepo.getRecords(snapshotB),
      findingRepo.findBySnapshotId(snapshotA),
      findingRepo.findBySnapshotId(snapshotB),
    ]);

    // Generate diff
    const diff = compareSnapshots(
      {
        id: snapA.id,
        createdAt: snapA.createdAt,
        rulesetVersion: snapA.rulesetVersion,
        queriedNames: snapA.queriedNames,
        queriedTypes: snapA.queriedTypes,
        vantages: snapA.vantages,
      },
      {
        id: snapB.id,
        createdAt: snapB.createdAt,
        rulesetVersion: snapB.rulesetVersion,
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
    return c.json({
      error: 'Failed to compare snapshots',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/snapshots/:domain/latest
 * Get the most recent snapshot for a domain
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

    const snapshots = await snapshotRepo.findByDomainId(domain.id, { limit: 1 });

    if (snapshots.length === 0) {
      return c.json({ error: 'No snapshots found for domain' }, 404);
    }

    const snapshot = snapshots[0];

    return c.json({
      id: snapshot.id,
      domain: domainName,
      createdAt: snapshot.createdAt,
      rulesetVersion: snapshot.rulesetVersion,
      queryScope: {
        names: snapshot.queriedNames,
        types: snapshot.queriedTypes,
        vantages: snapshot.vantages,
      },
    });

  } catch (error) {
    console.error('Latest snapshot error:', error);
    return c.json({
      error: 'Failed to fetch latest snapshot',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/snapshots/:domain/compare-latest
 * Compare the two most recent snapshots
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

    const snapshots = await snapshotRepo.findByDomainId(domain.id, { limit: 2 });

    if (snapshots.length < 2) {
      return c.json({
        error: 'Need at least 2 snapshots to compare',
        availableSnapshots: snapshots.length,
      }, 400);
    }

    // Redirect to diff endpoint with the two latest snapshots
    return c.json({
      message: 'Use these snapshot IDs to compare',
      snapshots: snapshots.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        rulesetVersion: s.rulesetVersion,
      })),
      diffEndpoint: `/api/snapshots/${domainName}/diff`,
      requestBody: {
        snapshotA: snapshots[1].id,
        snapshotB: snapshots[0].id,
      },
    });

  } catch (error) {
    console.error('Compare latest error:', error);
    return c.json({
      error: 'Failed to prepare comparison',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
