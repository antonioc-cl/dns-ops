/**
 * Snapshot Diff Engine - Bead 13
 *
 * Compares snapshots to detect changes in:
 * - Records and values
 * - TTLs
 * - Findings
 * - Query scope
 * - Ruleset version
 */

import type { Finding, RecordSet } from '@dns-ops/db/schema';

export interface SnapshotDiffResult {
  snapshotA: {
    id: string;
    createdAt: Date;
    rulesetVersion: string;
  };
  snapshotB: {
    id: string;
    createdAt: Date;
    rulesetVersion: string;
  };
  comparison: {
    recordChanges: RecordChange[];
    ttlChanges: TTLChange[];
    findingChanges: FindingChange[];
    scopeChanges: ScopeChange | null;
    rulesetChange: RulesetChange | null;
  };
  summary: {
    totalChanges: number;
    additions: number;
    deletions: number;
    modifications: number;
    unchanged: number;
  };
  findingsSummary: {
    totalChanges: number;
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    severityChanges: number;
  };
}

export interface RecordChange {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  name: string;
  recordType: string;
  valuesA?: string[];
  valuesB?: string[];
  diff?: {
    added: string[];
    removed: string[];
  };
}

export interface TTLChange {
  name: string;
  recordType: string;
  ttlA: number;
  ttlB: number;
  change: number;
}

export interface FindingChange {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  findingType: string;
  title: string;
  severityA?: string;
  severityB?: string;
  confidenceA?: string;
  confidenceB?: string;
  ruleId?: string;
  ruleVersionA?: string;
  ruleVersionB?: string;
  evidenceCountA?: number;
  evidenceCountB?: number;
  description?: string;
  changes?: {
    severity?: { from: string; to: string };
    confidence?: { from: string; to: string };
    ruleVersion?: { from: string; to: string };
    evidenceCount?: { from: number; to: number };
  };
}

export interface ScopeChange {
  type: 'scope-changed';
  namesAdded: string[];
  namesRemoved: string[];
  typesAdded: string[];
  typesRemoved: string[];
  vantagesAdded: string[];
  vantagesRemoved: string[];
  message: string;
}

export interface RulesetChange {
  type: 'ruleset-changed';
  versionA: string;
  versionB: string;
  message: string;
}

/**
 * Compare two snapshots and generate diff
 */
export function compareSnapshots(
  snapshotA: {
    id: string;
    createdAt: Date;
    rulesetVersion: string;
    queriedNames: string[];
    queriedTypes: string[];
    vantages: string[];
  },
  snapshotB: {
    id: string;
    createdAt: Date;
    rulesetVersion: string;
    queriedNames: string[];
    queriedTypes: string[];
    vantages: string[];
  },
  recordsA: RecordSet[],
  recordsB: RecordSet[],
  findingsA: Finding[],
  findingsB: Finding[]
): SnapshotDiffResult {
  const recordChanges = compareRecords(recordsA, recordsB);
  const ttlChanges = compareTTLs(recordsA, recordsB);
  const findingChanges = compareFindings(findingsA, findingsB);
  const scopeChanges = compareScope(snapshotA, snapshotB);
  const rulesetChange = compareRuleset(snapshotA.rulesetVersion, snapshotB.rulesetVersion);

  const allChanges = [...recordChanges, ...findingChanges];
  const summary = {
    totalChanges: allChanges.filter((c) => c.type !== 'unchanged').length,
    additions: allChanges.filter((c) => c.type === 'added').length,
    deletions: allChanges.filter((c) => c.type === 'removed').length,
    modifications: allChanges.filter((c) => c.type === 'modified').length,
    unchanged: allChanges.filter((c) => c.type === 'unchanged').length,
  };

  // Calculate findings-specific summary
  const findingsSummary = {
    totalChanges: findingChanges.filter((c) => c.type !== 'unchanged').length,
    added: findingChanges.filter((c) => c.type === 'added').length,
    removed: findingChanges.filter((c) => c.type === 'removed').length,
    modified: findingChanges.filter((c) => c.type === 'modified').length,
    unchanged: findingChanges.filter((c) => c.type === 'unchanged').length,
    severityChanges: findingChanges.filter((c) => c.changes?.severity).length,
  };

  return {
    snapshotA: {
      id: snapshotA.id,
      createdAt: snapshotA.createdAt,
      rulesetVersion: snapshotA.rulesetVersion,
    },
    snapshotB: {
      id: snapshotB.id,
      createdAt: snapshotB.createdAt,
      rulesetVersion: snapshotB.rulesetVersion,
    },
    comparison: {
      recordChanges,
      ttlChanges,
      findingChanges,
      scopeChanges,
      rulesetChange,
    },
    summary,
    findingsSummary,
  };
}

function compareRecords(recordsA: RecordSet[], recordsB: RecordSet[]): RecordChange[] {
  const changes: RecordChange[] = [];
  const key = (r: RecordSet) => `${r.name}|${r.type}`;

  const mapA = new Map(recordsA.map((r) => [key(r), r]));
  const mapB = new Map(recordsB.map((r) => [key(r), r]));

  for (const [k, recordA] of mapA) {
    const recordB = mapB.get(k);

    if (!recordB) {
      changes.push({
        type: 'removed',
        name: recordA.name,
        recordType: recordA.type,
        valuesA: recordA.values,
      });
    } else {
      const valuesA = new Set(recordA.values);
      const valuesB = new Set(recordB.values);

      const added = [...valuesB].filter((v) => !valuesA.has(v));
      const removed = [...valuesA].filter((v) => !valuesB.has(v));

      if (added.length === 0 && removed.length === 0) {
        changes.push({
          type: 'unchanged',
          name: recordA.name,
          recordType: recordA.type,
          valuesA: recordA.values,
          valuesB: recordB.values,
        });
      } else {
        changes.push({
          type: 'modified',
          name: recordA.name,
          recordType: recordA.type,
          valuesA: recordA.values,
          valuesB: recordB.values,
          diff: { added, removed },
        });
      }
    }
  }

  for (const [k, recordB] of mapB) {
    if (!mapA.has(k)) {
      changes.push({
        type: 'added',
        name: recordB.name,
        recordType: recordB.type,
        valuesB: recordB.values,
      });
    }
  }

  return changes;
}

function compareTTLs(recordsA: RecordSet[], recordsB: RecordSet[]): TTLChange[] {
  const changes: TTLChange[] = [];
  const key = (r: RecordSet) => `${r.name}|${r.type}`;

  const mapA = new Map(recordsA.map((r) => [key(r), r]));
  const mapB = new Map(recordsB.map((r) => [key(r), r]));

  for (const [k, recordA] of mapA) {
    const recordB = mapB.get(k);
    if (recordB && recordA.ttl !== recordB.ttl) {
      changes.push({
        name: recordA.name,
        recordType: recordA.type,
        ttlA: recordA.ttl || 0,
        ttlB: recordB.ttl || 0,
        change:
          recordB.ttl && recordA.ttl
            ? Math.round(((recordB.ttl - recordA.ttl) / recordA.ttl) * 100)
            : 0,
      });
    }
  }

  return changes;
}

function compareFindings(findingsA: Finding[], findingsB: Finding[]): FindingChange[] {
  const changes: FindingChange[] = [];
  const key = (f: Finding) => `${f.type}|${f.ruleId}`;

  const mapA = new Map(findingsA.map((f) => [key(f), f]));
  const mapB = new Map(findingsB.map((f) => [key(f), f]));

  for (const [k, findingA] of mapA) {
    const findingB = mapB.get(k);

    if (!findingB) {
      // Finding was removed
      changes.push({
        type: 'removed',
        findingType: findingA.type,
        title: findingA.title,
        severityA: findingA.severity,
        confidenceA: findingA.confidence,
        ruleId: findingA.ruleId,
        ruleVersionA: findingA.ruleVersion,
        evidenceCountA: findingA.evidence?.length ?? 0,
      });
    } else {
      // Check for modifications
      const changesDetected: FindingChange['changes'] = {};

      if (findingA.severity !== findingB.severity) {
        changesDetected.severity = { from: findingA.severity, to: findingB.severity };
      }
      if (findingA.confidence !== findingB.confidence) {
        changesDetected.confidence = { from: findingA.confidence, to: findingB.confidence };
      }
      if (findingA.ruleVersion !== findingB.ruleVersion) {
        changesDetected.ruleVersion = { from: findingA.ruleVersion, to: findingB.ruleVersion };
      }
      const evidenceA = findingA.evidence?.length ?? 0;
      const evidenceB = findingB.evidence?.length ?? 0;
      if (evidenceA !== evidenceB) {
        changesDetected.evidenceCount = { from: evidenceA, to: evidenceB };
      }

      const hasChanges = Object.keys(changesDetected).length > 0;

      if (hasChanges) {
        // Build description from changes
        const descriptions: string[] = [];
        if (changesDetected.severity) {
          descriptions.push(
            `severity: ${changesDetected.severity.from} → ${changesDetected.severity.to}`
          );
        }
        if (changesDetected.confidence) {
          descriptions.push(
            `confidence: ${changesDetected.confidence.from} → ${changesDetected.confidence.to}`
          );
        }
        if (changesDetected.ruleVersion) {
          descriptions.push(
            `rule version: ${changesDetected.ruleVersion.from} → ${changesDetected.ruleVersion.to}`
          );
        }
        if (changesDetected.evidenceCount) {
          descriptions.push(
            `evidence: ${changesDetected.evidenceCount.from} → ${changesDetected.evidenceCount.to}`
          );
        }

        changes.push({
          type: 'modified',
          findingType: findingA.type,
          title: findingB.title, // Use newer title
          severityA: findingA.severity,
          severityB: findingB.severity,
          confidenceA: findingA.confidence,
          confidenceB: findingB.confidence,
          ruleId: findingA.ruleId,
          ruleVersionA: findingA.ruleVersion,
          ruleVersionB: findingB.ruleVersion,
          evidenceCountA: evidenceA,
          evidenceCountB: evidenceB,
          description: descriptions.join('; '),
          changes: changesDetected,
        });
      } else {
        changes.push({
          type: 'unchanged',
          findingType: findingA.type,
          title: findingA.title,
          severityA: findingA.severity,
          confidenceA: findingA.confidence,
          ruleId: findingA.ruleId,
          ruleVersionA: findingA.ruleVersion,
          evidenceCountA: evidenceA,
        });
      }
    }
  }

  for (const [k, findingB] of mapB) {
    if (!mapA.has(k)) {
      // Finding was added
      changes.push({
        type: 'added',
        findingType: findingB.type,
        title: findingB.title,
        severityB: findingB.severity,
        confidenceB: findingB.confidence,
        ruleId: findingB.ruleId,
        ruleVersionB: findingB.ruleVersion,
        evidenceCountB: findingB.evidence?.length ?? 0,
      });
    }
  }

  return changes;
}

function compareScope(
  snapshotA: { queriedNames: string[]; queriedTypes: string[]; vantages: string[] },
  snapshotB: { queriedNames: string[]; queriedTypes: string[]; vantages: string[] }
): ScopeChange | null {
  const namesAdded = snapshotB.queriedNames.filter((n) => !snapshotA.queriedNames.includes(n));
  const namesRemoved = snapshotA.queriedNames.filter((n) => !snapshotB.queriedNames.includes(n));
  const typesAdded = snapshotB.queriedTypes.filter((t) => !snapshotA.queriedTypes.includes(t));
  const typesRemoved = snapshotA.queriedTypes.filter((t) => !snapshotB.queriedTypes.includes(t));
  const vantagesAdded = snapshotB.vantages.filter((v) => !snapshotA.vantages.includes(v));
  const vantagesRemoved = snapshotA.vantages.filter((v) => !snapshotB.vantages.includes(v));

  if (
    namesAdded.length === 0 &&
    namesRemoved.length === 0 &&
    typesAdded.length === 0 &&
    typesRemoved.length === 0 &&
    vantagesAdded.length === 0 &&
    vantagesRemoved.length === 0
  ) {
    return null;
  }

  return {
    type: 'scope-changed',
    namesAdded,
    namesRemoved,
    typesAdded,
    typesRemoved,
    vantagesAdded,
    vantagesRemoved,
    message: 'Query scope changed between snapshots',
  };
}

function compareRuleset(versionA: string, versionB: string): RulesetChange | null {
  if (versionA === versionB) return null;

  return {
    type: 'ruleset-changed',
    versionA,
    versionB,
    message: `Ruleset version changed from ${versionA} to ${versionB}`,
  };
}
