/**
 * Delegation API Routes
 *
 * Endpoints for delegation analysis and visualization.
 */

import { Hono } from 'hono';
import type { Env } from '../types.js';
import { SnapshotRepository, ObservationRepository } from '@dns-ops/db';

export const delegationRoutes = new Hono<Env>();

/**
 * GET /api/snapshot/:snapshotId/delegation
 * Get delegation analysis for a snapshot
 */
delegationRoutes.get('/snapshot/:snapshotId/delegation', async (c) => {
  const snapshotId = c.req.param('snapshotId');
  const db = c.get('db');

  try {
    const snapshotRepo = new SnapshotRepository(db);
    const observationRepo = new ObservationRepository(db);

    // Fetch snapshot
    const snapshot = await snapshotRepo.findById(snapshotId);
    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    // Check if snapshot has delegation metadata
    const hasDelegationData = (snapshot as unknown as { metadata?: { hasDelegationData?: boolean } }).metadata?.hasDelegationData;
    if (!hasDelegationData) {
      return c.json({
        snapshotId,
        message: 'No delegation data available for this snapshot',
        delegation: null,
      });
    }

    // Fetch NS-related observations
    const observations = await observationRepo.findBySnapshotId(snapshotId);

    // Extract NS records from parent view
    const nsObservations = observations.filter(
      (obs) => obs.queryType === 'NS' && obs.queryName === snapshot.domainName
    );

    // Extract glue records (A/AAAA for NS targets)
    const glueObservations = observations.filter(
      (obs) =>
        (obs.queryType === 'A' || obs.queryType === 'AAAA') &&
        obs.queryName.includes('.') &&
        !obs.queryName.endsWith(snapshot.domainName)
    );

    // Build delegation response
    const delegation = {
      domain: snapshot.domainName,
      parentZone: (snapshot as unknown as { metadata?: { parentZone?: string } }).metadata?.parentZone,
      nameServers: nsObservations
        .filter((obs) => obs.status === 'success')
        .flatMap((obs) =>
          (obs.answerSection || []).filter((a) => a.type === 'NS').map((a) => ({
            name: a.data,
            source: obs.vantageIdentifier,
          }))
        ),
      glue: glueObservations
        .filter((obs) => obs.status === 'success')
        .map((obs) => ({
          name: obs.queryName,
          type: obs.queryType,
          address: obs.answerSection?.[0]?.data,
        })),
      hasDivergence: (snapshot as unknown as { metadata?: { hasDivergence?: boolean } }).metadata?.hasDivergence || false,
      hasDnssec: (snapshot as unknown as { metadata?: { hasDnssec?: boolean } }).metadata?.hasDnssec || false,
    };

    return c.json({
      snapshotId,
      delegation,
    });

  } catch (error) {
    console.error('Error fetching delegation:', error);
    return c.json({
      error: 'Failed to fetch delegation data',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/domain/:domain/delegation/latest
 * Get latest delegation analysis for a domain
 */
delegationRoutes.get('/domain/:domain/delegation/latest', async (c) => {
  const domain = c.req.param('domain');
  const db = c.get('db');

  try {
    const snapshotRepo = new SnapshotRepository(db);

    // Find latest snapshot with delegation data
    const snapshots = await snapshotRepo.findByDomain(domain);
    const snapshotWithDelegation = snapshots.find(
      (s) => (s as unknown as { metadata?: { hasDelegationData?: boolean } }).metadata?.hasDelegationData
    );

    if (!snapshotWithDelegation) {
      return c.json({
        domain,
        message: 'No delegation data available for this domain',
      }, 404);
    }

    // Redirect to the snapshot-specific endpoint
    return c.redirect(`/api/snapshot/${snapshotWithDelegation.id}/delegation`);

  } catch (error) {
    console.error('Error fetching latest delegation:', error);
    return c.json({
      error: 'Failed to fetch delegation data',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/snapshot/:snapshotId/delegation/issues
 * Get delegation issues (divergence, lame, missing glue)
 */
delegationRoutes.get('/snapshot/:snapshotId/delegation/issues', async (c) => {
  const snapshotId = c.req.param('snapshotId');
  const db = c.get('db');

  try {
    const snapshotRepo = new SnapshotRepository(db);
    const observationRepo = new ObservationRepository(db);

    const snapshot = await snapshotRepo.findById(snapshotId);
    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    const observations = await observationRepo.findBySnapshotId(snapshotId);

    // Find divergence in NS responses
    const nsObservations = observations.filter(
      (obs) => obs.queryType === 'NS' && obs.queryName === snapshot.domainName
    );

    const issues: Array<{
      type: string;
      severity: string;
      description: string;
      details: unknown;
    }> = [];

    // Check for divergence
    const successfulNs = nsObservations.filter((o) => o.status === 'success');
    const nsSets = successfulNs.map((o) =>
      (o.answerSection || [])
        .filter((a) => a.type === 'NS')
        .map((a) => a.data)
        .sort()
        .join(',')
    );

    const uniqueSets = [...new Set(nsSets)];
    if (uniqueSets.length > 1) {
      issues.push({
        type: 'ns-divergence',
        severity: 'critical',
        description: 'Name servers differ across vantages',
        details: {
          vantages: successfulNs.map((o) => ({
            source: o.vantageIdentifier,
            ns: (o.answerSection || [])
              .filter((a) => a.type === 'NS')
              .map((a) => a.data),
          })),
        },
      });
    }

    // Check for missing glue
    const metadata = (snapshot as unknown as { metadata?: { nsServers?: string[] } }).metadata;
    if (metadata?.nsServers) {
      for (const ns of metadata.nsServers) {
        // Check if glue exists for in-zone NS
        if (ns.toLowerCase().endsWith(`.${snapshot.domainName.toLowerCase()}`)) {
          const glueObs = observations.find(
            (o) =>
              (o.queryType === 'A' || o.queryType === 'AAAA') &&
              o.queryName.toLowerCase() === ns.toLowerCase()
          );
          if (!glueObs || glueObs.status !== 'success') {
            issues.push({
              type: 'missing-glue',
              severity: 'high',
              description: `Missing glue record for ${ns}`,
              details: { nsServer: ns },
            });
          }
        }
      }
    }

    return c.json({
      snapshotId,
      domain: snapshot.domainName,
      issues,
      issueCount: issues.length,
    });

  } catch (error) {
    console.error('Error fetching delegation issues:', error);
    return c.json({
      error: 'Failed to fetch delegation issues',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
