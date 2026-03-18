/**
 * Findings API Routes
 *
 * Endpoints for evaluating rules and retrieving findings.
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { RulesEngine, Ruleset, RuleContext } from '@dns-ops/rules';
import {
  authoritativeFailureRule,
  authoritativeMismatchRule,
  recursiveAuthoritativeMismatchRule,
  cnameCoexistenceRule,
  unmanagedZonePartialCoverageRule,
} from '@dns-ops/rules';
import { ObservationRepository, RecordSetRepository, SnapshotRepository, DomainRepository } from '@dns-ops/db/repos';

export const findingsRoutes = new Hono<Env>();

/**
 * GET /api/snapshot/:snapshotId/findings
 * Evaluate rules and return findings for a snapshot
 */
findingsRoutes.get('/snapshot/:snapshotId/findings', async (c) => {
  const snapshotId = c.req.param('snapshotId');
  const db = c.get('db');

  try {
    // Initialize repositories
    const snapshotRepo = new SnapshotRepository(db);
    const domainRepo = new DomainRepository(db);
    const observationRepo = new ObservationRepository(db);
    const recordSetRepo = new RecordSetRepository(db);

    // Fetch snapshot
    const snapshot = await snapshotRepo.findById(snapshotId);
    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    // Fetch domain
    const domain = await domainRepo.findById(snapshot.domainId);
    if (!domain) {
      return c.json({ error: 'Domain not found' }, 404);
    }

    // Fetch observations and record sets
    const observations = await observationRepo.findBySnapshotId(snapshotId);
    const recordSets = await recordSetRepo.findBySnapshotId(snapshotId);

    // Create the initial DNS ruleset
    const ruleset: Ruleset = {
      id: 'dns-initial-v1',
      version: '1.0.0',
      name: 'Initial DNS Rules',
      description: 'First benchmark-backed DNS rules pack',
      rules: [
        authoritativeFailureRule,
        authoritativeMismatchRule,
        recursiveAuthoritativeMismatchRule,
        cnameCoexistenceRule,
        unmanagedZonePartialCoverageRule,
      ],
      createdAt: new Date(),
    };

    // Create rule context
    const context: RuleContext = {
      snapshotId,
      domainId: domain.id,
      domainName: domain.name,
      zoneManagement: snapshot.zoneManagement,
      observations,
      recordSets,
      rulesetVersion: ruleset.version,
    };

    // Evaluate rules
    const engine = new RulesEngine(ruleset);
    const { findings, suggestions } = engine.evaluate(context);

    return c.json({
      snapshotId,
      domain: domain.name,
      rulesetVersion: ruleset.version,
      rulesEvaluated: engine.getEnabledRulesCount(),
      findings,
      suggestions,
    });

  } catch (error) {
    console.error('Error evaluating findings:', error);
    return c.json({
      error: 'Failed to evaluate findings',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/snapshot/:snapshotId/evaluate
 * Re-evaluate a snapshot with a specific ruleset version
 */
findingsRoutes.post('/snapshot/:snapshotId/evaluate', async (c) => {
  const snapshotId = c.req.param('snapshotId');
  const body = await c.req.json().catch(() => ({}));
  const { rulesetVersion } = body;

  // For now, we only have one ruleset version
  // In the future, this would support re-evaluation under different ruleset versions

  return c.json({
    snapshotId,
    requestedVersion: rulesetVersion,
    message: 'Re-evaluation with specific ruleset version not yet implemented',
  }, 501);
});
