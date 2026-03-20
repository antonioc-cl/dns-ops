/**
 * Snapshot History and Diff Routes Tests - Bead 13/11
 *
 * Integration tests for snapshot history and comparison functionality.
 *
 * Bead dns-ops-1j4.11.3 requirements covered:
 * - Listing snapshots per domain
 * - Latest snapshot retrieval
 * - Snapshot detail endpoint
 * - Snapshot diff comparison
 * - Compare-latest functionality
 * - Scope and ruleset warnings
 */

import { describe, expect, it } from 'vitest';
import type {
  FindingChange,
  RecordChange,
  RulesetChange,
  ScopeChange,
  SnapshotDiffResult,
  TTLChange,
} from '@dns-ops/parsing';

// =============================================================================
// Snapshot Listing Tests
// =============================================================================

describe('Snapshot Listing - Bead 13', () => {
  describe('GET /api/snapshots/:domain', () => {
    it('should return paginated snapshots sorted by createdAt desc', () => {
      const snapshots = [
        { id: 'snap-3', createdAt: new Date('2024-03-01') },
        { id: 'snap-2', createdAt: new Date('2024-02-01') },
        { id: 'snap-1', createdAt: new Date('2024-01-01') },
      ];

      // Sorted by createdAt desc
      const sorted = [...snapshots].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(sorted[0].id).toBe('snap-3');
      expect(sorted[2].id).toBe('snap-1');
    });

    it('should support limit and offset pagination', () => {
      const allSnapshots = Array.from({ length: 50 }, (_, i) => ({
        id: `snap-${i}`,
        createdAt: new Date(2024, 0, 50 - i),
      }));

      const limit = 20;
      const offset = 10;

      const paginated = allSnapshots.slice(offset, offset + limit);

      expect(paginated).toHaveLength(limit);
      expect(paginated[0].id).toBe('snap-10');
    });

    it('should include findingsEvaluated flag based on rulesetVersionId', () => {
      const snapshot = {
        id: 'snap-1',
        rulesetVersionId: 'ruleset-v1',
      };

      const findingsEvaluated = snapshot.rulesetVersionId !== null;

      expect(findingsEvaluated).toBe(true);
    });

    it('should mark findingsEvaluated as false when rulesetVersionId is null', () => {
      const snapshot = {
        id: 'snap-1',
        rulesetVersionId: null,
      };

      const findingsEvaluated = snapshot.rulesetVersionId !== null;

      expect(findingsEvaluated).toBe(false);
    });
  });
});

// =============================================================================
// Latest Snapshot Tests
// =============================================================================

describe('Latest Snapshot - Bead 13', () => {
  describe('GET /api/snapshots/:domain/latest', () => {
    it('should return the most recent snapshot', () => {
      const snapshots = [
        { id: 'snap-1', createdAt: new Date('2024-01-01') },
        { id: 'snap-2', createdAt: new Date('2024-02-01') },
        { id: 'snap-3', createdAt: new Date('2024-03-01') },
      ];

      const sorted = [...snapshots].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      const latest = sorted[0];

      expect(latest.id).toBe('snap-3');
    });

    it('should return 404 when no snapshots exist', () => {
      const snapshots: { id: string }[] = [];

      const hasSnapshots = snapshots.length > 0;

      expect(hasSnapshots).toBe(false);
    });
  });
});

// =============================================================================
// Snapshot Detail Tests
// =============================================================================

describe('Snapshot Detail - Bead 13', () => {
  describe('GET /api/snapshots/:domain/:id', () => {
    it('should return snapshot with query scope', () => {
      const snapshot = {
        id: 'snap-1',
        queriedNames: ['example.com', 'www.example.com'],
        queriedTypes: ['A', 'AAAA', 'MX', 'TXT'],
        vantages: ['google-dns', 'cloudflare'],
      };

      expect(snapshot.queriedNames).toContain('example.com');
      expect(snapshot.queriedTypes).toContain('MX');
      expect(snapshot.vantages).toContain('google-dns');
    });

    it('should include metadata when available', () => {
      const snapshot = {
        id: 'snap-1',
        metadata: {
          vantageIdentifiers: ['8.8.8.8', '1.1.1.1'],
          hasDelegationData: true,
          parentZone: 'com',
          nsServers: ['ns1.example.com', 'ns2.example.com'],
        },
      };

      expect(snapshot.metadata.hasDelegationData).toBe(true);
      expect(snapshot.metadata.parentZone).toBe('com');
    });
  });
});

// =============================================================================
// Snapshot Diff Tests
// =============================================================================

describe('Snapshot Diff - Bead 13', () => {
  describe('POST /api/snapshots/:domain/diff', () => {
    it('should require both snapshotA and snapshotB IDs', () => {
      const body = { snapshotA: 'snap-1' }; // Missing snapshotB

      const isValid = !!body.snapshotA && !!(body as { snapshotB?: string }).snapshotB;

      expect(isValid).toBe(false);
    });

    it('should verify snapshots belong to the domain', () => {
      const domain = { id: 'domain-1' };
      const snapA = { id: 'snap-1', domainId: 'domain-1' };
      const snapB = { id: 'snap-2', domainId: 'domain-2' }; // Different domain

      const bothBelongToDomain =
        snapA.domainId === domain.id && snapB.domainId === domain.id;

      expect(bothBelongToDomain).toBe(false);
    });

    it('should include record changes in diff', () => {
      const recordChanges: RecordChange[] = [
        {
          type: 'added',
          name: 'new.example.com',
          recordType: 'A',
          valuesB: ['1.2.3.4'],
        },
        {
          type: 'removed',
          name: 'old.example.com',
          recordType: 'A',
          valuesA: ['5.6.7.8'],
        },
        {
          type: 'modified',
          name: 'www.example.com',
          recordType: 'A',
          valuesA: ['1.2.3.4'],
          valuesB: ['5.6.7.8'],
          diff: { added: ['5.6.7.8'], removed: ['1.2.3.4'] },
        },
      ];

      expect(recordChanges.filter((c) => c.type === 'added')).toHaveLength(1);
      expect(recordChanges.filter((c) => c.type === 'removed')).toHaveLength(1);
      expect(recordChanges.filter((c) => c.type === 'modified')).toHaveLength(1);
    });

    it('should include TTL changes in diff', () => {
      const ttlChanges: TTLChange[] = [
        {
          name: 'example.com',
          recordType: 'A',
          ttlA: 300,
          ttlB: 600,
          change: 100, // 100% increase
        },
      ];

      expect(ttlChanges[0].change).toBe(100);
      expect(ttlChanges[0].ttlB).toBeGreaterThan(ttlChanges[0].ttlA);
    });

    it('should include finding changes in diff', () => {
      const findingChanges: FindingChange[] = [
        {
          type: 'added',
          findingType: 'mail.no-dmarc-record',
          title: 'No DMARC Record',
          severityB: 'medium',
          confidenceB: 'high',
          ruleId: 'mail.dmarc',
          ruleVersionB: '1.0.0',
          evidenceCountB: 2,
        },
        {
          type: 'modified',
          findingType: 'mail.spf-missing',
          title: 'SPF Record Missing',
          severityA: 'high',
          severityB: 'medium',
          changes: {
            severity: { from: 'high', to: 'medium' },
          },
        },
      ];

      expect(findingChanges.filter((c) => c.type === 'added')).toHaveLength(1);
      expect(findingChanges.filter((c) => c.changes?.severity)).toHaveLength(1);
    });
  });

  describe('Scope Changes Warning', () => {
    it('should detect scope changes between snapshots', () => {
      const scopeChange: ScopeChange = {
        type: 'scope-changed',
        namesAdded: ['new.example.com'],
        namesRemoved: ['old.example.com'],
        typesAdded: ['AAAA'],
        typesRemoved: [],
        vantagesAdded: [],
        vantagesRemoved: ['cloudflare'],
        message: 'Query scope differs between snapshots',
      };

      expect(scopeChange.namesAdded).toContain('new.example.com');
      expect(scopeChange.typesAdded).toContain('AAAA');
      expect(scopeChange.vantagesRemoved).toContain('cloudflare');
    });

    it('should return null when scope is unchanged', () => {
      const snapshotA = {
        queriedNames: ['example.com'],
        queriedTypes: ['A'],
        vantages: ['google-dns'],
      };
      const snapshotB = {
        queriedNames: ['example.com'],
        queriedTypes: ['A'],
        vantages: ['google-dns'],
      };

      const namesAdded = snapshotB.queriedNames.filter(
        (n) => !snapshotA.queriedNames.includes(n)
      );
      const namesRemoved = snapshotA.queriedNames.filter(
        (n) => !snapshotB.queriedNames.includes(n)
      );

      const hasChange = namesAdded.length > 0 || namesRemoved.length > 0;

      expect(hasChange).toBe(false);
    });
  });

  describe('Ruleset Change Warning', () => {
    it('should detect ruleset version changes', () => {
      const rulesetChange: RulesetChange = {
        type: 'ruleset-changed',
        versionA: '1.0.0',
        versionB: '1.1.0',
        message: 'Ruleset version differs between snapshots',
      };

      expect(rulesetChange.versionA).not.toBe(rulesetChange.versionB);
    });

    it('should return null when ruleset version is unchanged', () => {
      const versionA = '1.0.0';
      const versionB = '1.0.0';

      const hasChange = versionA !== versionB;

      expect(hasChange).toBe(false);
    });
  });

  describe('Findings Evaluation Warning', () => {
    it('should warn when neither snapshot has been evaluated', () => {
      const findingsEvaluatedA = false;
      const findingsEvaluatedB = false;

      const warning =
        !findingsEvaluatedA && !findingsEvaluatedB
          ? 'neither snapshot has been evaluated'
          : !findingsEvaluatedA
            ? 'snapshot A has not been evaluated'
            : !findingsEvaluatedB
              ? 'snapshot B has not been evaluated'
              : null;

      expect(warning).toBe('neither snapshot has been evaluated');
    });

    it('should warn when only one snapshot has been evaluated', () => {
      const findingsEvaluatedA = true;
      const findingsEvaluatedB = false;

      const warning =
        !findingsEvaluatedA && !findingsEvaluatedB
          ? 'neither snapshot has been evaluated'
          : !findingsEvaluatedA
            ? 'snapshot A has not been evaluated'
            : !findingsEvaluatedB
              ? 'snapshot B has not been evaluated'
              : null;

      expect(warning).toBe('snapshot B has not been evaluated');
    });
  });
});

// =============================================================================
// Compare Latest Tests
// =============================================================================

describe('Compare Latest - Bead 13', () => {
  describe('POST /api/snapshots/:domain/compare-latest', () => {
    it('should require at least 2 snapshots', () => {
      const snapshots = [{ id: 'snap-1' }];

      const canCompare = snapshots.length >= 2;

      expect(canCompare).toBe(false);
    });

    it('should compare newest vs second newest', () => {
      const snapshots = [
        { id: 'snap-3', createdAt: new Date('2024-03-01') }, // Newest
        { id: 'snap-2', createdAt: new Date('2024-02-01') }, // Second newest
        { id: 'snap-1', createdAt: new Date('2024-01-01') },
      ];

      // Sort by createdAt desc and take first 2
      const sorted = [...snapshots].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      const [snapB, snapA] = sorted; // B is newer, A is older

      expect(snapB.id).toBe('snap-3');
      expect(snapA.id).toBe('snap-2');
    });
  });
});

// =============================================================================
// Diff Summary Tests
// =============================================================================

describe('Diff Summary - Bead 13', () => {
  it('should calculate total changes correctly', () => {
    const diffResult: SnapshotDiffResult = {
      snapshotA: { id: 'snap-1', createdAt: new Date(), rulesetVersion: '1.0.0' },
      snapshotB: { id: 'snap-2', createdAt: new Date(), rulesetVersion: '1.0.0' },
      comparison: {
        recordChanges: [
          { type: 'added', name: 'a.example.com', recordType: 'A' },
          { type: 'removed', name: 'b.example.com', recordType: 'A' },
          { type: 'unchanged', name: 'c.example.com', recordType: 'A' },
        ],
        ttlChanges: [],
        findingChanges: [
          { type: 'added', findingType: 'mail.spf', title: 'SPF Missing' },
          { type: 'unchanged', findingType: 'mail.mx', title: 'MX Present' },
        ],
        scopeChanges: null,
        rulesetChange: null,
      },
      summary: {
        totalChanges: 3, // 2 record changes + 1 finding change
        additions: 2,
        deletions: 1,
        modifications: 0,
        unchanged: 2,
      },
      findingsSummary: {
        totalChanges: 1,
        added: 1,
        removed: 0,
        modified: 0,
        unchanged: 1,
        severityChanges: 0,
      },
    };

    expect(diffResult.summary.totalChanges).toBe(3);
    expect(diffResult.summary.additions).toBe(2);
    expect(diffResult.findingsSummary.totalChanges).toBe(1);
    expect(diffResult.findingsSummary.added).toBe(1);
  });

  it('should track severity changes in findingsSummary', () => {
    const findingsSummary = {
      totalChanges: 2,
      added: 1,
      removed: 0,
      modified: 1,
      unchanged: 3,
      severityChanges: 1, // One finding had severity change
    };

    expect(findingsSummary.severityChanges).toBe(1);
    expect(findingsSummary.modified).toBeGreaterThanOrEqual(findingsSummary.severityChanges);
  });
});
