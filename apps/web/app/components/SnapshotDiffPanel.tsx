/**
 * Snapshot Diff Panel - dns-ops-1j4.11.1
 *
 * Detailed diff view showing changes between snapshots:
 * - Record changes (added, removed, modified)
 * - TTL changes
 * - Finding changes
 * - Scope changes
 * - Ruleset changes
 */

import { useState } from 'react';

interface RecordChange {
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

interface TTLChange {
  name: string;
  recordType: string;
  ttlA: number;
  ttlB: number;
  change: number;
}

interface FindingChange {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  findingType: string;
  title: string;
  severityA?: string;
  severityB?: string;
  confidenceA?: string;
  confidenceB?: string;
  ruleId?: string;
  description?: string;
  changes?: {
    severity?: { from: string; to: string };
    confidence?: { from: string; to: string };
    evidenceCount?: { from: number; to: number };
  };
}

interface ScopeChange {
  type: 'scope-changed';
  namesAdded: string[];
  namesRemoved: string[];
  typesAdded: string[];
  typesRemoved: string[];
  vantagesAdded: string[];
  vantagesRemoved: string[];
  message: string;
}

interface RulesetChange {
  type: 'ruleset-changed';
  versionA: string;
  versionB: string;
  message: string;
}

interface DiffComparison {
  recordChanges: RecordChange[];
  ttlChanges: TTLChange[];
  findingChanges: FindingChange[];
  scopeChanges: ScopeChange | null;
  rulesetChange: RulesetChange | null;
}

interface DiffSummary {
  totalChanges: number;
  additions: number;
  deletions: number;
  modifications: number;
  unchanged: number;
}

interface FindingsSummary {
  totalChanges: number;
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  severityChanges: number;
}

interface SnapshotDiffData {
  snapshotA: {
    id: string;
    createdAt: string;
    rulesetVersion: string;
  };
  snapshotB: {
    id: string;
    createdAt: string;
    rulesetVersion: string;
  };
  comparison: DiffComparison;
  summary: DiffSummary;
  findingsSummary: FindingsSummary;
}

interface SnapshotDiffPanelProps {
  diff: SnapshotDiffData;
  warnings?: string[];
}

type DiffTab = 'records' | 'ttl' | 'findings' | 'scope';

export function SnapshotDiffPanel({ diff, warnings }: SnapshotDiffPanelProps) {
  const [activeTab, setActiveTab] = useState<DiffTab>('records');
  const [showUnchanged, setShowUnchanged] = useState(false);

  const tabs: { id: DiffTab; label: string; count: number }[] = [
    {
      id: 'records',
      label: 'Records',
      count: diff.comparison.recordChanges.filter((c) => c.type !== 'unchanged').length,
    },
    {
      id: 'ttl',
      label: 'TTL',
      count: diff.comparison.ttlChanges.length,
    },
    {
      id: 'findings',
      label: 'Findings',
      count: diff.comparison.findingChanges.filter((c) => c.type !== 'unchanged').length,
    },
    {
      id: 'scope',
      label: 'Scope & Ruleset',
      count: (diff.comparison.scopeChanges ? 1 : 0) + (diff.comparison.rulesetChange ? 1 : 0),
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Summary header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Detailed Diff</h4>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-700">+{diff.summary.additions} added</span>
            <span className="text-red-700">-{diff.summary.deletions} removed</span>
            <span className="text-blue-700">~{diff.summary.modifications} modified</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            Comparing {diff.snapshotA.id.slice(0, 8)} → {diff.snapshotB.id.slice(0, 8)}
          </span>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="w-3 h-3"
            />
            Show unchanged
          </label>
        </div>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          {warnings.map((warning) => (
            <p key={warning} className="text-sm text-yellow-800">
              {warning}
            </p>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'records' && (
          <RecordChangesView
            changes={diff.comparison.recordChanges}
            showUnchanged={showUnchanged}
          />
        )}
        {activeTab === 'ttl' && <TTLChangesView changes={diff.comparison.ttlChanges} />}
        {activeTab === 'findings' && (
          <FindingChangesView
            changes={diff.comparison.findingChanges}
            summary={diff.findingsSummary}
            showUnchanged={showUnchanged}
          />
        )}
        {activeTab === 'scope' && (
          <ScopeAndRulesetView
            scopeChanges={diff.comparison.scopeChanges}
            rulesetChange={diff.comparison.rulesetChange}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Record Changes View
// =============================================================================

function RecordChangesView({
  changes,
  showUnchanged,
}: {
  changes: RecordChange[];
  showUnchanged: boolean;
}) {
  const filtered = showUnchanged ? changes : changes.filter((c) => c.type !== 'unchanged');

  if (filtered.length === 0) {
    return <div className="text-center text-gray-500 py-4">No record changes</div>;
  }

  return (
    <div className="space-y-2">
      {filtered.map((change) => (
        <RecordChangeCard
          key={`${change.type}-${change.name}-${change.recordType}`}
          change={change}
        />
      ))}
    </div>
  );
}

function RecordChangeCard({ change }: { change: RecordChange }) {
  const typeStyles = {
    added: 'border-green-200 bg-green-50',
    removed: 'border-red-200 bg-red-50',
    modified: 'border-blue-200 bg-blue-50',
    unchanged: 'border-gray-200 bg-gray-50',
  };

  const typeIcons = {
    added: '+',
    removed: '-',
    modified: '~',
    unchanged: '=',
  };

  const typeColors = {
    added: 'text-green-700',
    removed: 'text-red-700',
    modified: 'text-blue-700',
    unchanged: 'text-gray-500',
  };

  return (
    <div className={`p-2 rounded border ${typeStyles[change.type]}`}>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-sm ${typeColors[change.type]}`}>
          {typeIcons[change.type]}
        </span>
        <span className="font-mono text-sm text-gray-800">{change.name}</span>
        <span className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">
          {change.recordType}
        </span>
      </div>

      {change.type === 'modified' && change.diff && (
        <div className="mt-1 ml-5 text-xs">
          {change.diff.removed.length > 0 && (
            <div className="text-red-700">
              {change.diff.removed.map((v) => (
                <div key={v} className="font-mono">
                  - {v}
                </div>
              ))}
            </div>
          )}
          {change.diff.added.length > 0 && (
            <div className="text-green-700">
              {change.diff.added.map((v) => (
                <div key={v} className="font-mono">
                  + {v}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {change.type === 'added' && change.valuesB && (
        <div className="mt-1 ml-5 text-xs text-green-700">
          {change.valuesB.map((v) => (
            <div key={v} className="font-mono">
              {v}
            </div>
          ))}
        </div>
      )}

      {change.type === 'removed' && change.valuesA && (
        <div className="mt-1 ml-5 text-xs text-red-700">
          {change.valuesA.map((v) => (
            <div key={v} className="font-mono">
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TTL Changes View
// =============================================================================

function TTLChangesView({ changes }: { changes: TTLChange[] }) {
  if (changes.length === 0) {
    return <div className="text-center text-gray-500 py-4">No TTL changes</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">Before</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">After</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {changes.map((change) => (
            <tr key={`${change.name}-${change.recordType}-${change.ttlA}-${change.ttlB}`}>
              <td className="px-3 py-2 font-mono">{change.name}</td>
              <td className="px-3 py-2">{change.recordType}</td>
              <td className="px-3 py-2 text-right tabular-nums">{change.ttlA}s</td>
              <td className="px-3 py-2 text-right tabular-nums">{change.ttlB}s</td>
              <td
                className={`px-3 py-2 text-right tabular-nums ${
                  change.change > 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {change.change > 0 ? '+' : ''}
                {change.change}s
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// Finding Changes View
// =============================================================================

function FindingChangesView({
  changes,
  summary,
  showUnchanged,
}: {
  changes: FindingChange[];
  summary: FindingsSummary;
  showUnchanged: boolean;
}) {
  const filtered = showUnchanged ? changes : changes.filter((c) => c.type !== 'unchanged');

  return (
    <div>
      {/* Summary */}
      <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
        <span className="text-green-700">+{summary.added} added</span>
        <span className="mx-2">·</span>
        <span className="text-red-700">-{summary.removed} removed</span>
        <span className="mx-2">·</span>
        <span className="text-blue-700">~{summary.modified} modified</span>
        {summary.severityChanges > 0 && (
          <>
            <span className="mx-2">·</span>
            <span className="text-orange-700">{summary.severityChanges} severity changes</span>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-4">No finding changes</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((change) => (
            <FindingChangeCard
              key={`${change.type}-${change.findingType}-${change.ruleId ?? change.title}`}
              change={change}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FindingChangeCard({ change }: { change: FindingChange }) {
  const typeStyles = {
    added: 'border-green-200 bg-green-50',
    removed: 'border-red-200 bg-red-50',
    modified: 'border-blue-200 bg-blue-50',
    unchanged: 'border-gray-200 bg-gray-50',
  };

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
    info: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className={`p-2 rounded border ${typeStyles[change.type]}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{change.title}</span>
        {change.type === 'added' && change.severityB && (
          <span
            className={`px-1.5 py-0.5 rounded text-xs ${severityColors[change.severityB] || severityColors.info}`}
          >
            {change.severityB}
          </span>
        )}
        {change.type === 'removed' && change.severityA && (
          <span
            className={`px-1.5 py-0.5 rounded text-xs ${severityColors[change.severityA] || severityColors.info}`}
          >
            {change.severityA}
          </span>
        )}
      </div>

      {change.description && <p className="mt-1 text-xs text-gray-600">{change.description}</p>}

      {change.changes && (
        <div className="mt-1 text-xs text-gray-600">
          {change.changes.severity && (
            <div>
              Severity:{' '}
              <span className={severityColors[change.changes.severity.from] || ''}>
                {change.changes.severity.from}
              </span>
              {' → '}
              <span className={severityColors[change.changes.severity.to] || ''}>
                {change.changes.severity.to}
              </span>
            </div>
          )}
          {change.changes.confidence && (
            <div>
              Confidence: {change.changes.confidence.from} → {change.changes.confidence.to}
            </div>
          )}
        </div>
      )}

      {change.ruleId && <p className="mt-1 text-xs text-gray-400">Rule: {change.ruleId}</p>}
    </div>
  );
}

// =============================================================================
// Scope and Ruleset View
// =============================================================================

function ScopeAndRulesetView({
  scopeChanges,
  rulesetChange,
}: {
  scopeChanges: ScopeChange | null;
  rulesetChange: RulesetChange | null;
}) {
  if (!scopeChanges && !rulesetChange) {
    return <div className="text-center text-gray-500 py-4">No scope or ruleset changes</div>;
  }

  return (
    <div className="space-y-4">
      {rulesetChange && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <h5 className="font-medium text-purple-900">Ruleset Changed</h5>
          <p className="mt-1 text-sm text-purple-700">{rulesetChange.message}</p>
          <div className="mt-2 text-xs text-purple-600">
            {rulesetChange.versionA} → {rulesetChange.versionB}
          </div>
        </div>
      )}

      {scopeChanges && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <h5 className="font-medium text-orange-900">Query Scope Changed</h5>
          <p className="mt-1 text-sm text-orange-700">{scopeChanges.message}</p>

          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            {/* Names */}
            <div>
              <p className="font-medium text-orange-800">Names</p>
              {scopeChanges.namesAdded.length > 0 && (
                <div className="text-green-700">
                  {scopeChanges.namesAdded.map((n) => (
                    <div key={n}>+ {n}</div>
                  ))}
                </div>
              )}
              {scopeChanges.namesRemoved.length > 0 && (
                <div className="text-red-700">
                  {scopeChanges.namesRemoved.map((n) => (
                    <div key={n}>- {n}</div>
                  ))}
                </div>
              )}
              {scopeChanges.namesAdded.length === 0 && scopeChanges.namesRemoved.length === 0 && (
                <div className="text-gray-500">No changes</div>
              )}
            </div>

            {/* Types */}
            <div>
              <p className="font-medium text-orange-800">Types</p>
              {scopeChanges.typesAdded.length > 0 && (
                <div className="text-green-700">
                  {scopeChanges.typesAdded.map((t) => (
                    <div key={t}>+ {t}</div>
                  ))}
                </div>
              )}
              {scopeChanges.typesRemoved.length > 0 && (
                <div className="text-red-700">
                  {scopeChanges.typesRemoved.map((t) => (
                    <div key={t}>- {t}</div>
                  ))}
                </div>
              )}
              {scopeChanges.typesAdded.length === 0 && scopeChanges.typesRemoved.length === 0 && (
                <div className="text-gray-500">No changes</div>
              )}
            </div>

            {/* Vantages */}
            <div>
              <p className="font-medium text-orange-800">Vantages</p>
              {scopeChanges.vantagesAdded.length > 0 && (
                <div className="text-green-700">
                  {scopeChanges.vantagesAdded.map((v) => (
                    <div key={v}>+ {v}</div>
                  ))}
                </div>
              )}
              {scopeChanges.vantagesRemoved.length > 0 && (
                <div className="text-red-700">
                  {scopeChanges.vantagesRemoved.map((v) => (
                    <div key={v}>- {v}</div>
                  ))}
                </div>
              )}
              {scopeChanges.vantagesAdded.length === 0 &&
                scopeChanges.vantagesRemoved.length === 0 && (
                  <div className="text-gray-500">No changes</div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
