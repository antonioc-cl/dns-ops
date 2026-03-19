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

import type { RecordSet, Finding } from '@dns-ops/db/schema';

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
  description?: string;
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
    totalChanges: allChanges.filter(c => c.type !== 'unchanged').length,
    additions: allChanges.filter(c => c.type === 'added').length,
    deletions: allChanges.filter(c => c.type === 'removed').length,
    modifications: allChanges.filter(c => c.type === 'modified').length,
    unchanged: allChanges.filter(c => c.type === 'unchanged').length,
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
  };
}

function compareRecords(recordsA: RecordSet[], recordsB: RecordSet[]): RecordChange[] {
  const changes: RecordChange[] = [];
  const key = (r: RecordSet) => `${r.name}|${r.type}`;

  const mapA = new Map(recordsA.map(r => [key(r), r]));
  const mapB = new Map(recordsB.map(r => [key(r), r]));

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

      const added = [...valuesB].filter(v => !valuesA.has(v));
      const removed = [...valuesA].filter(v => !valuesB.has(v));

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

  const mapA = new Map(recordsA.map(r => [key(r), r]));
  const mapB = new Map(recordsB.map(r => [key(r), r]));

  for (const [k, recordA] of mapA) {
    const recordB = mapB.get(k);
    if (recordB && recordA.ttl !== recordB.ttl) {
      changes.push({
        name: recordA.name,
        recordType: recordA.type,
        ttlA: recordA.ttl || 0,
        ttlB: recordB.ttl || 0,
        change: recordB.ttl && recordA.ttl
          ? Math.round(((recordB.ttl - recordA.ttl) / recordA.ttl) * 100)
          : 0,
      });
    }
  }

  return changes;
}

function compareFindings(findingsA: Finding[], findingsB: Finding[]): FindingChange[] {
  const changes: FindingChange[] = [];
  const key = (f: Finding) => `${f.type}|${f.title}`;

  const mapA = new Map(findingsA.map(f => [key(f), f]));
  const mapB = new Map(findingsB.map(f => [key(f), f]));

  for (const [k, findingA] of mapA) {
    const findingB = mapB.get(k);

    if (!findingB) {
      changes.push({
        type: 'removed',
        findingType: findingA.type,
        title: findingA.title,
        severityA: findingA.severity,
      });
    } else if (findingA.severity !== findingB.severity) {
      changes.push({
        type: 'modified',
        findingType: findingA.type,
        title: findingA.title,
        severityA: findingA.severity,
        severityB: findingB.severity,
        description: `Severity changed from ${findingA.severity} to ${findingB.severity}`,
      });
    } else {
      changes.push({
        type: 'unchanged',
        findingType: findingA.type,
        title: findingA.title,
        severityA: findingA.severity,
      });
    }
  }

  for (const [k, findingB] of mapB) {
    if (!mapA.has(k)) {
      changes.push({
        type: 'added',
        findingType: findingB.type,
        title: findingB.title,
        severityB: findingB.severity,
      });
    }
  }

  return changes;
}

function compareScope(
  snapshotA: { queriedNames: string[]; queriedTypes: string[]; vantages: string[] },
  snapshotB: { queriedNames: string[]; queriedTypes: string[]; vantages: string[] }
): ScopeChange | null {
  const namesAdded = snapshotB.queriedNames.filter(n => !snapshotA.queriedNames.includes(n));
  const namesRemoved = snapshotA.queriedNames.filter(n => !snapshotB.queriedNames.includes(n));
  const typesAdded = snapshotB.queriedTypes.filter(t => !snapshotA.queriedTypes.includes(t));
  const typesRemoved = snapshotA.queriedTypes.filter(t => !snapshotB.queriedTypes.includes(t));
  const vantagesAdded = snapshotB.vantages.filter(v => !snapshotA.vantages.includes(v));
  const vantagesRemoved = snapshotA.vantages.filter(v => !snapshotB.vantages.includes(v));

  if (namesAdded.length === 0 && namesRemoved.length === 0 &&
      typesAdded.length === 0 && typesRemoved.length === 0 &&
      vantagesAdded.length === 0 && vantagesRemoved.length === 0) {
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
