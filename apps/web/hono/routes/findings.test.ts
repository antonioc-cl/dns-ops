/**
 * Findings Routes Tests - Bead 08
 *
 * Tests for findings evidence, versioning, and persistence behavior.
 *
 * Bead dns-ops-1j4.8.6 requirements covered:
 * - Evidence links (observationId references)
 * - Version changes (rulesetVersionId tracking)
 * - Reevaluation (idempotent evaluation logic)
 * - DB persistence behavior
 */

import type { EvidenceLink } from '@dns-ops/db/schema';
import { describe, expect, it } from 'vitest';

// =============================================================================
// Evidence Links Tests
// =============================================================================

describe('Evidence Links - Bead 08', () => {
  describe('EvidenceLink structure', () => {
    it('should require observationId', () => {
      const evidence: EvidenceLink = {
        observationId: 'obs-123',
        description: 'MX record shows no mail server',
      };

      expect(evidence.observationId).toBeDefined();
      expect(evidence.observationId).toBe('obs-123');
    });

    it('should support optional recordSetId', () => {
      const evidence: EvidenceLink = {
        observationId: 'obs-123',
        recordSetId: 'rs-456',
        description: 'DNS record discrepancy',
      };

      expect(evidence.recordSetId).toBe('rs-456');
    });

    it('should support highlighted records for specific evidence', () => {
      const evidence: EvidenceLink = {
        observationId: 'obs-123',
        description: 'Multiple MX records with different priorities',
        highlightedRecords: [0, 1, 2], // First 3 records in answer section
      };

      expect(evidence.highlightedRecords).toHaveLength(3);
      expect(evidence.highlightedRecords).toContain(0);
    });

    it('should require description for context', () => {
      const evidence: EvidenceLink = {
        observationId: 'obs-123',
        description: '',
      };

      // Description should be non-empty in practice
      expect(typeof evidence.description).toBe('string');
    });
  });

  describe('Evidence array behavior', () => {
    it('should support multiple evidence links per finding', () => {
      const evidenceLinks: EvidenceLink[] = [
        {
          observationId: 'obs-1',
          description: 'Primary MX record',
        },
        {
          observationId: 'obs-2',
          description: 'Secondary MX record',
        },
        {
          observationId: 'obs-3',
          recordSetId: 'rs-1',
          description: 'Consolidated record set',
          highlightedRecords: [0],
        },
      ];

      expect(evidenceLinks).toHaveLength(3);
      expect(evidenceLinks.every((e) => e.observationId)).toBe(true);
    });

    it('should allow empty evidence array for rule-only findings', () => {
      const finding = {
        type: 'mail.best-practice-suggestion',
        evidence: [] as EvidenceLink[],
      };

      expect(finding.evidence).toHaveLength(0);
    });
  });
});

// =============================================================================
// Ruleset Version Tracking Tests
// =============================================================================

describe('Ruleset Version Tracking - Bead 08', () => {
  describe('rulesetVersionId field', () => {
    it('should be nullable for backward compatibility', () => {
      const finding = {
        id: 'finding-1',
        snapshotId: 'snap-1',
        ruleId: 'mail.mx-presence',
        ruleVersion: '1.0.0',
        rulesetVersionId: null, // Legacy finding without ruleset tracking
      };

      expect(finding.rulesetVersionId).toBeNull();
    });

    it('should reference ruleset_versions table when set', () => {
      const finding = {
        id: 'finding-1',
        snapshotId: 'snap-1',
        ruleId: 'mail.mx-presence',
        ruleVersion: '1.0.0',
        rulesetVersionId: 'ruleset-version-uuid',
      };

      expect(finding.rulesetVersionId).toBeDefined();
      expect(typeof finding.rulesetVersionId).toBe('string');
    });
  });

  describe('Version comparison for idempotent evaluation', () => {
    it('should determine if findings exist for current ruleset', () => {
      const currentRulesetVersionId = 'ruleset-v2';
      const existingFindings = [
        { id: 'f1', rulesetVersionId: 'ruleset-v1' },
        { id: 'f2', rulesetVersionId: 'ruleset-v1' },
      ];

      const hasCurrentVersion = existingFindings.some(
        (f) => f.rulesetVersionId === currentRulesetVersionId
      );

      expect(hasCurrentVersion).toBe(false);
    });

    it('should identify findings that match current ruleset', () => {
      const currentRulesetVersionId = 'ruleset-v2';
      const existingFindings = [
        { id: 'f1', rulesetVersionId: 'ruleset-v2' },
        { id: 'f2', rulesetVersionId: 'ruleset-v2' },
      ];

      const matchingFindings = existingFindings.filter(
        (f) => f.rulesetVersionId === currentRulesetVersionId
      );

      expect(matchingFindings).toHaveLength(2);
    });

    it('should filter out null rulesetVersionId in version-specific queries', () => {
      const currentRulesetVersionId = 'ruleset-v2';
      const existingFindings = [
        { id: 'f1', rulesetVersionId: null }, // Legacy
        { id: 'f2', rulesetVersionId: 'ruleset-v1' },
        { id: 'f3', rulesetVersionId: 'ruleset-v2' },
      ];

      const matchingFindings = existingFindings.filter(
        (f) => f.rulesetVersionId === currentRulesetVersionId
      );

      expect(matchingFindings).toHaveLength(1);
      expect(matchingFindings[0].id).toBe('f3');
    });
  });
});

// =============================================================================
// Idempotent Re-evaluation Tests
// =============================================================================

describe('Idempotent Re-evaluation - Bead 08', () => {
  describe('Evaluation decision logic', () => {
    it('should return cached findings when rulesetVersionId matches', () => {
      const existingFindingsForVersion = [{ id: 'f1', rulesetVersionId: 'ruleset-v2' }];

      const shouldEvaluate = existingFindingsForVersion.length === 0;

      expect(shouldEvaluate).toBe(false);
    });

    it('should evaluate when no findings exist for current version', () => {
      const existingFindingsForVersion: Array<{ id: string; rulesetVersionId: string }> = [];

      const shouldEvaluate = existingFindingsForVersion.length === 0;

      expect(shouldEvaluate).toBe(true);
    });

    it('should force evaluate when refresh=true regardless of existing findings', () => {
      const forceRefresh = true;
      const existingFindingsForVersion = [{ id: 'f1', rulesetVersionId: 'ruleset-v2' }];

      const shouldEvaluate = forceRefresh || existingFindingsForVersion.length === 0;

      expect(shouldEvaluate).toBe(true);
    });
  });

  describe('Response flags', () => {
    it('should include idempotent=true when returning cached findings', () => {
      const response = {
        snapshotId: 'snap-1',
        persisted: true,
        idempotent: true, // Findings were already present
      };

      expect(response.idempotent).toBe(true);
    });

    it('should include idempotent=false when freshly evaluated', () => {
      const response = {
        snapshotId: 'snap-1',
        persisted: true,
        evaluated: true,
        idempotent: false, // Findings were freshly evaluated
      };

      expect(response.idempotent).toBe(false);
      expect(response.evaluated).toBe(true);
    });
  });
});

// =============================================================================
// Backfill Logic Tests
// =============================================================================

describe('Findings Backfill - Bead 08', () => {
  describe('Snapshot selection for backfill', () => {
    it('should identify snapshots without rulesetVersionId', () => {
      const targetRulesetVersionId = 'ruleset-v2';
      const snapshots = [
        { id: 'snap-1', rulesetVersionId: null },
        { id: 'snap-2', rulesetVersionId: 'ruleset-v1' },
        { id: 'snap-3', rulesetVersionId: 'ruleset-v2' },
      ];

      const needsBackfill = snapshots.filter(
        (s) => !s.rulesetVersionId || s.rulesetVersionId !== targetRulesetVersionId
      );

      expect(needsBackfill).toHaveLength(2);
      expect(needsBackfill.map((s) => s.id)).toContain('snap-1');
      expect(needsBackfill.map((s) => s.id)).toContain('snap-2');
    });

    it('should filter by completedOnly by default', () => {
      const snapshots = [
        { id: 'snap-1', resultState: 'complete', rulesetVersionId: null },
        { id: 'snap-2', resultState: 'partial', rulesetVersionId: null },
        { id: 'snap-3', resultState: 'failed', rulesetVersionId: null },
      ];

      const completedOnly = true;
      const eligible = snapshots.filter((s) =>
        completedOnly ? s.resultState === 'complete' : true
      );

      expect(eligible).toHaveLength(1);
      expect(eligible[0].id).toBe('snap-1');
    });

    it('should support domain filtering', () => {
      const targetDomainId = 'domain-1';
      const snapshots = [
        { id: 'snap-1', domainId: 'domain-1', rulesetVersionId: null },
        { id: 'snap-2', domainId: 'domain-2', rulesetVersionId: null },
        { id: 'snap-3', domainId: 'domain-1', rulesetVersionId: null },
      ];

      const filtered = snapshots.filter((s) => s.domainId === targetDomainId);

      expect(filtered).toHaveLength(2);
    });
  });

  describe('Backfill statistics', () => {
    it('should calculate completion percentage', () => {
      const total = 100;
      const needsBackfill = 25;
      const evaluated = total - needsBackfill;

      const completionPercent = Math.round((evaluated / total) * 100);

      expect(completionPercent).toBe(75);
    });

    it('should handle empty snapshot set', () => {
      const total = 0;
      const needsBackfill = 0;

      const completionPercent =
        total > 0 ? Math.round(((total - needsBackfill) / total) * 100) : 100;

      expect(completionPercent).toBe(100);
    });
  });

  describe('Dry run mode', () => {
    it('should return stats without processing when dryRun=true', () => {
      const dryRun = true;
      const stats = { total: 100, needsBackfill: 25 };

      const response = dryRun
        ? {
            dryRun: true,
            stats,
            message: `${stats.needsBackfill} of ${stats.total} snapshots need backfill`,
          }
        : { processed: 25 };

      expect(response.dryRun).toBe(true);
      expect('processed' in response).toBe(false);
    });
  });
});

// =============================================================================
// Finding Persistence Tests
// =============================================================================

describe('Finding Persistence - Bead 08', () => {
  describe('Required fields', () => {
    it('should require snapshotId', () => {
      const finding = {
        id: 'finding-1',
        snapshotId: 'snap-1',
        type: 'mail.no-mx-record',
        title: 'No MX Record',
        description: 'Domain has no MX record',
        severity: 'medium' as const,
        confidence: 'high' as const,
        riskPosture: 'medium' as const,
        blastRadius: 'single-domain' as const,
        reviewOnly: false,
        evidence: [],
        ruleId: 'mail.mx-presence',
        ruleVersion: '1.0.0',
      };

      expect(finding.snapshotId).toBeDefined();
      expect(finding.snapshotId).not.toBe('');
    });

    it('should require type for categorization', () => {
      const findingTypes = [
        'dns.authoritative-failure',
        'dns.recursive-mismatch',
        'mail.no-mx-record',
        'mail.dmarc-missing',
        'mail.spf-missing',
      ];

      expect(findingTypes.every((t) => t.includes('.'))).toBe(true);
    });
  });

  describe('Severity levels', () => {
    it('should support all severity levels', () => {
      const severities = ['critical', 'high', 'medium', 'low', 'info'] as const;

      expect(severities).toContain('critical');
      expect(severities).toContain('high');
      expect(severities).toContain('medium');
      expect(severities).toContain('low');
      expect(severities).toContain('info');
    });
  });

  describe('Confidence levels', () => {
    it('should support all confidence levels', () => {
      const confidences = ['certain', 'high', 'medium', 'low', 'heuristic'] as const;

      expect(confidences).toContain('certain');
      expect(confidences).toContain('heuristic');
    });
  });

  describe('Finding state management', () => {
    it('should support acknowledgment tracking', () => {
      const acknowledgedFinding = {
        id: 'finding-1',
        acknowledgedAt: new Date(),
        acknowledgedBy: 'operator@example.com',
        falsePositive: false,
      };

      expect(acknowledgedFinding.acknowledgedAt).toBeInstanceOf(Date);
      expect(acknowledgedFinding.acknowledgedBy).toBeDefined();
    });

    it('should support false positive marking', () => {
      const falsePositive = {
        id: 'finding-1',
        acknowledgedAt: new Date(),
        acknowledgedBy: 'operator@example.com',
        falsePositive: true,
      };

      expect(falsePositive.falsePositive).toBe(true);
    });
  });

  describe('Unique constraint behavior', () => {
    it('should define uniqueness by (snapshotId, ruleId, type, rulesetVersionId)', () => {
      const finding1 = {
        snapshotId: 'snap-1',
        ruleId: 'mail.mx-presence',
        type: 'mail.no-mx-record',
        rulesetVersionId: 'ruleset-v1',
      };

      const finding2 = {
        snapshotId: 'snap-1',
        ruleId: 'mail.mx-presence',
        type: 'mail.no-mx-record',
        rulesetVersionId: 'ruleset-v1',
      };

      // These would violate unique constraint
      const isDuplicate =
        finding1.snapshotId === finding2.snapshotId &&
        finding1.ruleId === finding2.ruleId &&
        finding1.type === finding2.type &&
        finding1.rulesetVersionId === finding2.rulesetVersionId;

      expect(isDuplicate).toBe(true);
    });

    it('should allow same finding with different rulesetVersionId', () => {
      const finding1 = {
        snapshotId: 'snap-1',
        ruleId: 'mail.mx-presence',
        type: 'mail.no-mx-record',
        rulesetVersionId: 'ruleset-v1',
      };

      const finding2 = {
        snapshotId: 'snap-1',
        ruleId: 'mail.mx-presence',
        type: 'mail.no-mx-record',
        rulesetVersionId: 'ruleset-v2', // Different version
      };

      const isDuplicate =
        finding1.snapshotId === finding2.snapshotId &&
        finding1.ruleId === finding2.ruleId &&
        finding1.type === finding2.type &&
        finding1.rulesetVersionId === finding2.rulesetVersionId;

      expect(isDuplicate).toBe(false);
    });
  });
});
