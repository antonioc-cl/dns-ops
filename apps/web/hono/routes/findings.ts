/**
 * Findings API Routes - Bead 06 Enhanced
 *
 * Endpoints for evaluating rules and retrieving persisted findings.
 * Includes DNS rules and Mail rules with database persistence.
 */

import type { NewFinding, NewSuggestion } from '@dns-ops/db';
import {
  DkimSelectorRepository,
  DomainRepository,
  FindingRepository,
  MailEvidenceRepository,
  ObservationRepository,
  RecordSetRepository,
  RulesetVersionRepository,
  SnapshotRepository,
  SuggestionRepository,
} from '@dns-ops/db';
// Import rules from packages/rules
import {
  authoritativeFailureRule,
  authoritativeMismatchRule,
  bimiRule,
  cnameCoexistenceRule,
  dkimRule,
  dmarcRule,
  mtaStsRule,
  mxPresenceRule,
  type RuleContext,
  RulesEngine,
  type Ruleset,
  recursiveAuthoritativeMismatchRule,
  spfRule,
  tlsRptRule,
  unmanagedZonePartialCoverageRule,
} from '@dns-ops/rules';
import { Hono } from 'hono';
import { requireAuth, requireWritePermission } from '../middleware/authorization.js';
import type { Env } from '../types.js';

export const findingsRoutes = new Hono<Env>();

// Current ruleset version - bump when rules change
const CURRENT_RULESET_VERSION = '1.2.0';
const CURRENT_RULESET_NAME = 'DNS and Mail Rules';

/**
 * Create the combined ruleset with DNS and Mail rules
 */
function createCombinedRuleset(): Ruleset {
  return {
    id: 'dns-mail-v1',
    version: CURRENT_RULESET_VERSION,
    name: CURRENT_RULESET_NAME,
    description: 'Combined DNS and mail analysis rules (Bead 06)',
    rules: [
      // DNS rules
      authoritativeFailureRule,
      authoritativeMismatchRule,
      recursiveAuthoritativeMismatchRule,
      cnameCoexistenceRule,
      unmanagedZonePartialCoverageRule,
      // Mail rules
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
}

/**
 * Ensure a ruleset version exists in the database
 */
async function ensureRulesetVersion(
  rulesetVersionRepo: RulesetVersionRepository,
  ruleset: Ruleset,
  createdBy: string
): Promise<string> {
  const existing = await rulesetVersionRepo.findByVersion(ruleset.version);
  if (existing) {
    return existing.id;
  }

  // Create new ruleset version
  const newVersion = await rulesetVersionRepo.create({
    version: ruleset.version,
    name: ruleset.name,
    description: ruleset.description || '',
    rules: ruleset.rules.map((r) => ({
      id: r.id,
      name: r.name,
      version: r.version,
      enabled: r.enabled !== false,
    })),
    active: true, // Mark as active
    createdBy,
  });

  return newVersion.id;
}

/**
 * GET /api/snapshot/:snapshotId/findings
 * Get persisted findings for a snapshot, or evaluate and persist if not found
 */
findingsRoutes.get('/snapshot/:snapshotId/findings', async (c) => {
  const snapshotId = c.req.param('snapshotId');
  const forceRefresh = c.req.query('refresh') === 'true';
  const db = c.get('db');

  try {
    // Initialize repositories
    const snapshotRepo = new SnapshotRepository(db);
    const domainRepo = new DomainRepository(db);
    const observationRepo = new ObservationRepository(db);
    const recordSetRepo = new RecordSetRepository(db);
    const findingRepo = new FindingRepository(db);
    const suggestionRepo = new SuggestionRepository(db);
    const rulesetVersionRepo = new RulesetVersionRepository(db);

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

    // Check for existing persisted findings (unless force refresh)
    const existingFindings = await findingRepo.findBySnapshotId(snapshotId);

    if (existingFindings.length > 0 && !forceRefresh) {
      // Return persisted findings
      const findingIds = existingFindings.map((f) => f.id);
      const suggestionsMap = await suggestionRepo.findByFindingIds(findingIds);

      // Flatten suggestions
      const allSuggestions = [...suggestionsMap.values()].flat();

      // Categorize findings
      const dnsFindings = existingFindings.filter((f) => f.type.startsWith('dns.'));
      const mailFindings = existingFindings.filter((f) => f.type.startsWith('mail.'));

      return c.json({
        snapshotId,
        domain: domain.name,
        rulesetVersion: existingFindings[0]?.ruleVersion || CURRENT_RULESET_VERSION,
        persisted: true,
        summary: {
          totalFindings: existingFindings.length,
          dnsFindings: dnsFindings.length,
          mailFindings: mailFindings.length,
          suggestions: allSuggestions.length,
        },
        findings: existingFindings,
        suggestions: allSuggestions,
        categorized: {
          dns: dnsFindings,
          mail: mailFindings,
        },
      });
    }

    // No persisted findings (or refresh requested) - evaluate and persist
    const observations = await observationRepo.findBySnapshotId(snapshotId);
    const recordSets = await recordSetRepo.findBySnapshotId(snapshotId);

    // Create and ensure ruleset version exists
    const ruleset = createCombinedRuleset();
    const actorId = c.req.header('X-Actor-Id') || 'system';
    const rulesetVersionId = await ensureRulesetVersion(rulesetVersionRepo, ruleset, actorId);

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

    // Delete existing findings if refreshing
    if (forceRefresh && existingFindings.length > 0) {
      await findingRepo.deleteBySnapshotId(snapshotId);
    }

    // Persist findings
    const findingsToInsert: NewFinding[] = findings.map((f) => ({
      snapshotId,
      type: f.type,
      title: f.title,
      description: f.description,
      severity: f.severity,
      confidence: f.confidence,
      riskPosture: f.riskPosture,
      blastRadius: f.blastRadius,
      reviewOnly: f.reviewOnly,
      evidence: f.evidence,
      ruleId: f.ruleId,
      ruleVersion: f.ruleVersion,
    }));

    const persistedFindings = await findingRepo.createMany(findingsToInsert);

    // Build finding ID map for suggestion linking
    const findingIdMap = new Map<string, string>();
    for (let i = 0; i < findings.length; i++) {
      const originalId = findings[i].id;
      const persistedId = persistedFindings[i]?.id;
      if (originalId && persistedId) {
        findingIdMap.set(originalId, persistedId);
      }
    }

    // Persist suggestions with corrected finding IDs
    const suggestionsToInsert: NewSuggestion[] = [];
    for (const s of suggestions) {
      const persistedFindingId = findingIdMap.get(s.findingId);
      if (persistedFindingId) {
        suggestionsToInsert.push({
          findingId: persistedFindingId,
          title: s.title,
          description: s.description,
          action: s.action,
          riskPosture: s.riskPosture,
          blastRadius: s.blastRadius,
          reviewOnly: s.reviewOnly ?? false,
        });
      }
    }

    const persistedSuggestions = await suggestionRepo.createMany(suggestionsToInsert);

    // Categorize findings
    const dnsFindings = persistedFindings.filter((f) => f.type.startsWith('dns.'));
    const mailFindings = persistedFindings.filter((f) => f.type.startsWith('mail.'));

    return c.json({
      snapshotId,
      domain: domain.name,
      rulesetVersion: ruleset.version,
      rulesetVersionId,
      persisted: true,
      evaluated: true,
      rulesEvaluated: engine.getEnabledRulesCount(),
      summary: {
        totalFindings: persistedFindings.length,
        dnsFindings: dnsFindings.length,
        mailFindings: mailFindings.length,
        suggestions: persistedSuggestions.length,
      },
      findings: persistedFindings,
      suggestions: persistedSuggestions,
      categorized: {
        dns: dnsFindings,
        mail: mailFindings,
      },
    });
  } catch (error) {
    console.error('Error evaluating findings:', error);
    return c.json(
      {
        error: 'Failed to evaluate findings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/snapshot/:snapshotId/findings/mail
 * Get mail-specific findings with mail evidence and DKIM selectors
 */
findingsRoutes.get('/snapshot/:snapshotId/findings/mail', async (c) => {
  const snapshotId = c.req.param('snapshotId');
  const db = c.get('db');

  try {
    // Initialize repositories
    const snapshotRepo = new SnapshotRepository(db);
    const domainRepo = new DomainRepository(db);
    const findingRepo = new FindingRepository(db);
    const suggestionRepo = new SuggestionRepository(db);
    const mailEvidenceRepo = new MailEvidenceRepository(db);
    const dkimSelectorRepo = new DkimSelectorRepository(db);

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

    // Fetch mail evidence and DKIM selectors in parallel
    const [mailEvidence, dkimSelectors] = await Promise.all([
      mailEvidenceRepo.findBySnapshotId(snapshotId),
      dkimSelectorRepo.findBySnapshotId(snapshotId),
    ]);

    // Check for existing persisted findings
    const allFindings = await findingRepo.findBySnapshotId(snapshotId);
    const mailFindings = allFindings.filter((f) => f.type.startsWith('mail.'));

    // If no findings, trigger evaluation by calling the main endpoint
    if (allFindings.length === 0) {
      // Redirect to main findings endpoint to trigger evaluation
      const mainResponse = await fetch(`${c.req.url.replace('/findings/mail', '/findings')}`, {
        headers: c.req.raw.headers,
      });
      const mainData = (await mainResponse.json()) as {
        findings?: Array<{ type: string }>;
        categorized?: { mail?: Array<{ type: string }> };
      };
      const evaluatedMailFindings = mainData.categorized?.mail || [];

      // Calculate mail security score from findings (basic analysis)
      const mailConfig = analyzeMailConfiguration(evaluatedMailFindings);

      // Enhance mail config with persisted evidence if available
      const enhancedMailConfig = enhanceMailConfigWithEvidence(mailConfig, mailEvidence);

      return c.json({
        snapshotId,
        domain: domain.name,
        rulesetVersion: CURRENT_RULESET_VERSION,
        summary: {
          totalFindings: evaluatedMailFindings.length,
          dkimSelectorsFound: dkimSelectors.filter((s) => s.found).length,
          dkimSelectorsTried: dkimSelectors.length,
        },
        mailConfig: enhancedMailConfig,
        mailEvidence: mailEvidence || null,
        dkimSelectors: formatDkimSelectors(dkimSelectors),
        findings: evaluatedMailFindings,
      });
    }

    // Get suggestions for mail findings
    const mailFindingIds = mailFindings.map((f) => f.id);
    const suggestionsMap = await suggestionRepo.findByFindingIds(mailFindingIds);
    const allSuggestions = [...suggestionsMap.values()].flat();

    // Calculate mail security score from findings (basic analysis)
    const mailConfig = analyzeMailConfiguration(mailFindings);

    // Enhance mail config with persisted evidence if available
    const enhancedMailConfig = enhanceMailConfigWithEvidence(mailConfig, mailEvidence);

    return c.json({
      snapshotId,
      domain: domain.name,
      rulesetVersion: mailFindings[0]?.ruleVersion || CURRENT_RULESET_VERSION,
      persisted: true,
      summary: {
        totalFindings: mailFindings.length,
        suggestions: allSuggestions.length,
        dkimSelectorsFound: dkimSelectors.filter((s) => s.found).length,
        dkimSelectorsTried: dkimSelectors.length,
      },
      mailConfig: enhancedMailConfig,
      mailEvidence: mailEvidence || null,
      dkimSelectors: formatDkimSelectors(dkimSelectors),
      findings: mailFindings,
      suggestions: allSuggestions,
    });
  } catch (error) {
    console.error('Error evaluating mail findings:', error);
    return c.json(
      {
        error: 'Failed to evaluate mail findings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/snapshot/:snapshotId/evaluate
 * Re-evaluate a snapshot with the current ruleset (or specified version)
 */
findingsRoutes.post('/snapshot/:snapshotId/evaluate', requireAuth, async (c) => {
  const snapshotId = c.req.param('snapshotId');
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const { rulesetVersion: requestedVersion } = body as { rulesetVersion?: string };

  try {
    const snapshotRepo = new SnapshotRepository(db);
    const findingRepo = new FindingRepository(db);

    // Verify snapshot exists
    const snapshot = await snapshotRepo.findById(snapshotId);
    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    // Delete existing findings to force re-evaluation
    const deletedCount = await findingRepo.deleteBySnapshotId(snapshotId);

    // Redirect to GET endpoint with refresh flag
    const response = await fetch(`${c.req.url.replace('/evaluate', '/findings')}?refresh=true`, {
      headers: c.req.raw.headers,
    });

    const result = (await response.json()) as Record<string, unknown>;

    return c.json({
      snapshotId,
      previousFindingsDeleted: deletedCount,
      requestedVersion: requestedVersion || CURRENT_RULESET_VERSION,
      ...(typeof result === 'object' && result !== null ? result : {}),
    });
  } catch (error) {
    console.error('Error re-evaluating findings:', error);
    return c.json(
      {
        error: 'Failed to re-evaluate findings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/snapshot/:snapshotId/findings/summary
 * Get a quick summary of findings by severity
 */
findingsRoutes.get('/snapshot/:snapshotId/findings/summary', async (c) => {
  const snapshotId = c.req.param('snapshotId');
  const db = c.get('db');

  try {
    const findingRepo = new FindingRepository(db);
    const severityCounts = await findingRepo.countBySeverity(snapshotId);
    const hasFindings = await findingRepo.hasFindings(snapshotId);

    return c.json({
      snapshotId,
      hasFindings,
      severityCounts,
      total: Object.values(severityCounts).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    console.error('Error getting findings summary:', error);
    return c.json(
      {
        error: 'Failed to get findings summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PATCH /api/findings/:findingId/acknowledge
 * Acknowledge a finding
 */
findingsRoutes.patch(
  '/findings/:findingId/acknowledge',
  requireAuth,
  requireWritePermission,
  async (c) => {
    const findingId = c.req.param('findingId');
    const db = c.get('db');
    const actorId = c.req.header('X-Actor-Id') || 'unknown';

    try {
      const findingRepo = new FindingRepository(db);
      const updated = await findingRepo.markAcknowledged(findingId, actorId);

      if (!updated) {
        return c.json({ error: 'Finding not found' }, 404);
      }

      return c.json({ success: true, finding: updated });
    } catch (error) {
      console.error('Error acknowledging finding:', error);
      return c.json(
        {
          error: 'Failed to acknowledge finding',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

/**
 * PATCH /api/findings/:findingId/false-positive
 * Mark a finding as false positive
 */
findingsRoutes.patch(
  '/findings/:findingId/false-positive',
  requireAuth,
  requireWritePermission,
  async (c) => {
    const findingId = c.req.param('findingId');
    const db = c.get('db');
    const actorId = c.req.header('X-Actor-Id') || 'unknown';

    try {
      const findingRepo = new FindingRepository(db);
      const updated = await findingRepo.markFalsePositive(findingId, actorId);

      if (!updated) {
        return c.json({ error: 'Finding not found' }, 404);
      }

      return c.json({ success: true, finding: updated });
    } catch (error) {
      console.error('Error marking finding as false positive:', error);
      return c.json(
        {
          error: 'Failed to mark finding as false positive',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  }
);

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

function analyzeMailConfiguration(
  findings: Array<{ type: string; severity?: string; description?: string }>
): MailConfiguration {
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
        if (finding.severity && finding.severity !== 'info') {
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
        if (finding.severity && finding.severity !== 'info') {
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

/**
 * Enhance mail configuration with persisted mail evidence data
 */
interface EnhancedMailConfiguration extends MailConfiguration {
  dmarcPolicy?: string;
  dmarcSubdomainPolicy?: string;
  dmarcPercent?: string;
  dmarcRua?: string[];
  dmarcRuf?: string[];
  spfRecord?: string;
  dmarcRecord?: string;
  detectedProvider?: string;
  providerConfidence?: string;
  hasBimi?: boolean;
}

function enhanceMailConfigWithEvidence(
  config: MailConfiguration,
  evidence:
    | {
        hasMx?: boolean;
        hasSpf?: boolean;
        hasDmarc?: boolean;
        hasDkim?: boolean;
        hasMtaSts?: boolean;
        hasTlsRpt?: boolean;
        hasBimi?: boolean;
        dmarcPolicy?: string | null;
        dmarcSubdomainPolicy?: string | null;
        dmarcPercent?: string | null;
        dmarcRua?: string[] | null;
        dmarcRuf?: string[] | null;
        spfRecord?: string | null;
        dmarcRecord?: string | null;
        detectedProvider?: string | null;
        providerConfidence?: string | null;
        securityScore?: string | null;
        scoreBreakdown?: {
          mx: number;
          spf: number;
          dmarc: number;
          dkim: number;
          mtaSts: number;
          tlsRpt: number;
          bimi: number;
        } | null;
      }
    | null
    | undefined
): EnhancedMailConfiguration {
  if (!evidence) {
    return config;
  }

  const enhanced: EnhancedMailConfiguration = {
    // Start with existing config
    ...config,
    // Override with persisted evidence where available
    hasMx: evidence.hasMx ?? config.hasMx,
    hasSpf: evidence.hasSpf ?? config.hasSpf,
    hasDmarc: evidence.hasDmarc ?? config.hasDmarc,
    hasDkim: evidence.hasDkim ?? config.hasDkim,
    hasMtaSts: evidence.hasMtaSts ?? config.hasMtaSts,
    hasTlsRpt: evidence.hasTlsRpt ?? config.hasTlsRpt,
    hasBimi: evidence.hasBimi ?? false,
    // Use persisted score if available
    securityScore: evidence.securityScore
      ? Number.parseInt(evidence.securityScore, 10)
      : config.securityScore,
  };

  // Add DMARC details
  if (evidence.dmarcPolicy) {
    enhanced.dmarcPolicy = evidence.dmarcPolicy;
  }
  if (evidence.dmarcSubdomainPolicy) {
    enhanced.dmarcSubdomainPolicy = evidence.dmarcSubdomainPolicy;
  }
  if (evidence.dmarcPercent) {
    enhanced.dmarcPercent = evidence.dmarcPercent;
  }
  if (evidence.dmarcRua) {
    enhanced.dmarcRua = evidence.dmarcRua;
  }
  if (evidence.dmarcRuf) {
    enhanced.dmarcRuf = evidence.dmarcRuf;
  }

  // Add raw records
  if (evidence.spfRecord) {
    enhanced.spfRecord = evidence.spfRecord;
  }
  if (evidence.dmarcRecord) {
    enhanced.dmarcRecord = evidence.dmarcRecord;
  }

  // Add provider detection
  if (evidence.detectedProvider) {
    enhanced.detectedProvider = evidence.detectedProvider;
  }
  if (evidence.providerConfidence) {
    enhanced.providerConfidence = evidence.providerConfidence;
  }

  return enhanced;
}

/**
 * Format DKIM selectors for API response
 */
interface FormattedDkimSelector {
  selector: string;
  domain: string;
  provenance: string;
  confidence: string;
  provider?: string;
  found: boolean;
  keyType?: string;
  keySize?: string;
  isValid?: boolean;
  validationError?: string;
}

function formatDkimSelectors(
  selectors: Array<{
    selector: string;
    domain: string;
    provenance: string;
    confidence: string;
    provider?: string | null;
    found: boolean;
    keyType?: string | null;
    keySize?: string | null;
    isValid?: boolean | null;
    validationError?: string | null;
  }>
): FormattedDkimSelector[] {
  return selectors.map((s) => ({
    selector: s.selector,
    domain: s.domain,
    provenance: s.provenance,
    confidence: s.confidence,
    provider: s.provider || undefined,
    found: s.found,
    keyType: s.keyType || undefined,
    keySize: s.keySize || undefined,
    isValid: s.isValid ?? undefined,
    validationError: s.validationError || undefined,
  }));
}
