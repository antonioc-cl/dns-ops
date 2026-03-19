/**
 * Findings API Routes - Bead 09 Enhanced
 *
 * Endpoints for evaluating rules and retrieving findings.
 * Includes DNS rules and Mail rules (Bead 09).
 */

import { Hono } from 'hono';
import type { Env } from '../types.js';
import { RulesEngine, Ruleset, RuleContext } from '@dns-ops/rules';
import {
  authoritativeFailureRule,
  authoritativeMismatchRule,
  recursiveAuthoritativeMismatchRule,
  cnameCoexistenceRule,
  unmanagedZonePartialCoverageRule,
} from '@dns-ops/rules';
// Import mail rules from Bead 09
import {
  mxPresenceRule,
  spfRule,
  dmarcRule,
  dkimRule,
  mtaStsRule,
  tlsRptRule,
  bimiRule,
  mailRules,
} from '@dns-ops/rules';
import { ObservationRepository, RecordSetRepository, SnapshotRepository, DomainRepository } from '@dns-ops/db';

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

    // Create the combined ruleset with DNS and Mail rules (Bead 09)
    const ruleset: Ruleset = {
      id: 'dns-mail-v1',
      version: '1.1.0',
      name: 'DNS and Mail Rules',
      description: 'Combined DNS and mail analysis rules (Bead 09)',
      rules: [
        // DNS rules
        authoritativeFailureRule,
        authoritativeMismatchRule,
        recursiveAuthoritativeMismatchRule,
        cnameCoexistenceRule,
        unmanagedZonePartialCoverageRule,
        // Mail rules (Bead 09)
        mxPresenceRule,
        spfRule,
        dmarcRule,
        dkimRule,
        mtaStsRule,
        tlsRptRule,
        bimiRule,
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

    // Categorize findings
    const dnsFindings = findings.filter(f => f.type.startsWith('dns.'));
    const mailFindings = findings.filter(f => f.type.startsWith('mail.'));

    return c.json({
      snapshotId,
      domain: domain.name,
      rulesetVersion: ruleset.version,
      rulesEvaluated: engine.getEnabledRulesCount(),
      summary: {
        totalFindings: findings.length,
        dnsFindings: dnsFindings.length,
        mailFindings: mailFindings.length,
        suggestions: suggestions.length,
      },
      findings,
      suggestions,
      categorized: {
        dns: dnsFindings,
        mail: mailFindings,
      },
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
 * GET /api/snapshot/:snapshotId/findings/mail
 * Get mail-specific findings only
 */
findingsRoutes.get('/snapshot/:snapshotId/findings/mail', async (c) => {
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

    // Create mail-only ruleset (Bead 09)
    const ruleset: Ruleset = {
      id: 'mail-v1',
      version: '1.0.0',
      name: 'Mail Rules',
      description: 'Mail analysis rules for Bead 09',
      rules: mailRules,
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

    // Evaluate mail rules only
    const engine = new RulesEngine(ruleset);
    const { findings, suggestions } = engine.evaluate(context);

    // Calculate mail security score
    const mailConfig = analyzeMailConfiguration(findings);

    return c.json({
      snapshotId,
      domain: domain.name,
      rulesetVersion: ruleset.version,
      summary: {
        totalFindings: findings.length,
        suggestions: suggestions.length,
      },
      mailConfig,
      findings,
      suggestions,
    });

  } catch (error) {
    console.error('Error evaluating mail findings:', error);
    return c.json({
      error: 'Failed to evaluate mail findings',
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
  const { rulesetVersion, ruleTypes } = body;

  // For now, we support filtering by rule type (dns, mail)
  // Full ruleset versioning will be implemented in a future bead

  const availableRuleTypes = ['dns', 'mail'];
  const selectedTypes = ruleTypes?.filter((t: string) => availableRuleTypes.includes(t)) || availableRuleTypes;

  return c.json({
    snapshotId,
    requestedVersion: rulesetVersion,
    selectedRuleTypes: selectedTypes,
    message: 'Use GET /api/snapshot/:id/findings for evaluation. Rule type filtering supported.',
  });
});

// =============================================================================
// Helper Functions
// =============================================================================

interface MailConfiguration {
  hasMx: boolean;
  hasSpf: boolean;
  hasDmarc: boolean;
  hasDkim: boolean;
  hasMtaSts: boolean;
  hasTlsRpt: boolean;
  securityScore: number; // 0-100
  issues: string[];
  recommendations: string[];
}

function analyzeMailConfiguration(findings: Array<{ type: string; severity: string; description: string }>): MailConfiguration {
  const config: MailConfiguration = {
    hasMx: false,
    hasSpf: false,
    hasDmarc: false,
    hasDkim: false,
    hasMtaSts: false,
    hasTlsRpt: false,
    securityScore: 0,
    issues: [],
    recommendations: [],
  };

  let score = 0;

  for (const finding of findings) {
    switch (finding.type) {
      case 'mail.mx-present':
        config.hasMx = true;
        score += 20;
        break;
      case 'mail.null-mx-configured':
        config.hasMx = true;
        score += 20;
        break;
      case 'mail.no-mx-record':
        config.issues.push('No MX record');
        config.recommendations.push('Add an MX record');
        break;
      case 'mail.spf-present':
        config.hasSpf = true;
        score += 20;
        if (finding.severity !== 'info') {
          config.issues.push(`SPF issue: ${finding.severity}`);
        }
        break;
      case 'mail.no-spf-record':
        config.issues.push('No SPF record');
        config.recommendations.push('Add an SPF record');
        break;
      case 'mail.dmarc-present':
        config.hasDmarc = true;
        score += 20;
        if (finding.severity !== 'info') {
          config.issues.push(`DMARC issue: ${finding.severity}`);
        }
        break;
      case 'mail.no-dmarc-record':
        config.issues.push('No DMARC record');
        config.recommendations.push('Add a DMARC record');
        break;
      case 'mail.dkim-keys-present':
        config.hasDkim = true;
        score += 20;
        break;
      case 'mail.dkim-no-valid-keys':
      case 'mail.no-dkim-queried':
        config.issues.push('DKIM not configured');
        config.recommendations.push('Configure DKIM');
        break;
      case 'mail.mta-sts-present':
        config.hasMtaSts = true;
        score += 10;
        break;
      case 'mail.tls-rpt-present':
        config.hasTlsRpt = true;
        score += 10;
        break;
    }
  }

  config.securityScore = Math.min(100, score);
  return config;
}
