import type { Observation, Snapshot } from '@dns-ops/db/schema';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { type KeyboardEvent, useCallback, useEffect, useId, useState } from 'react';
import { DelegationPanel } from '../../components/DelegationPanel.js';
import { DiscoveredSelectors } from '../../components/DiscoveredSelectors.js';
import { DNSViews } from '../../components/DNSViews.js';
import { FindingsPanel } from '../../components/FindingsPanel.js';
import { LegacyToolsPanel } from '../../components/LegacyToolsPanel.js';
import { MailFindingsPanel } from '../../components/MailFindingsPanel.js';
import { MailDiagnostics } from '../../components/mail/index.js';
import { NotesPanel } from '../../components/NotesPanel.js';
import { ResultStateBadge, ZoneManagementBadge } from '../../components/StatusBadges.js';
import { SnapshotDiffPanel } from '../../components/SnapshotDiffPanel.js';
import { TagsPanel } from '../../components/TagsPanel.js';

type DomainTabId = 'overview' | 'dns' | 'mail' | 'delegation' | 'history';

interface DomainSearchParams {
  tab?: DomainTabId;
}

const VALID_TABS: DomainTabId[] = ['overview', 'dns', 'mail', 'delegation', 'history'];

export const Route = createFileRoute('/domain/$domain')({
  component: Domain360Page,
  validateSearch: (search: Record<string, unknown>): DomainSearchParams => {
    const tab = search.tab as string | undefined;
    return {
      tab: tab && VALID_TABS.includes(tab as DomainTabId) ? (tab as DomainTabId) : undefined,
    };
  },
  loader: async ({ params }) => {
    // On the server (SSR), relative URLs have no base — bail and let the
    // client hydrate. UI handles snapshot: null as "no data yet" state.
    if (typeof window === 'undefined') {
      return { domain: params.domain, snapshot: null, observations: [] };
    }
    try {
      const snapshotResponse = await fetch(`/api/domain/${params.domain}/latest`);
      const snapshot = snapshotResponse.ok
        ? ((await snapshotResponse.json()) as { id: string } & Snapshot)
        : null;

      let observations: Observation[] = [];
      if (snapshot) {
        const obsResponse = await fetch(`/api/snapshot/${snapshot.id}/observations`);
        if (obsResponse.ok) {
          observations = await obsResponse.json();
        }
      }

      return { domain: params.domain, snapshot, observations };
    } catch {
      return { domain: params.domain, snapshot: null, observations: [] };
    }
  },
});

const DOMAIN_TABS: { id: DomainTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'dns', label: 'DNS' },
  { id: 'mail', label: 'Mail' },
  { id: 'delegation', label: 'Delegation' },
  { id: 'history', label: 'History' },
];

function Domain360Page() {
  const { domain, snapshot, observations } = Route.useLoaderData() as {
    domain: string;
    snapshot: Snapshot | null;
    observations: Observation[];
  };
  const { tab: urlTab } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DomainTabId>(urlTab || 'overview');

  // Sync URL to tab state when it changes externally
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (newTab: DomainTabId) => {
      setActiveTab(newTab);
      navigate({
        to: '/domain/$domain',
        params: { domain },
        search: { tab: newTab === 'overview' ? undefined : newTab },
        replace: true,
      });
    },
    [domain, navigate]
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tabDomIdPrefix = useId();

  const getTabId = (tabId: DomainTabId) => `${tabDomIdPrefix}-domain-tab-${tabId}`;
  const getPanelId = (tabId: DomainTabId) => `${tabDomIdPrefix}-domain-panel-${tabId}`;

  const focusTab = (tabId: DomainTabId) => {
    requestAnimationFrame(() => {
      document.getElementById(getTabId(tabId))?.focus();
    });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextTab = DOMAIN_TABS[(index + 1) % DOMAIN_TABS.length];
      handleTabChange(nextTab.id);
      focusTab(nextTab.id);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prevIndex = (index - 1 + DOMAIN_TABS.length) % DOMAIN_TABS.length;
      const prevTab = DOMAIN_TABS[prevIndex];
      handleTabChange(prevTab.id);
      focusTab(prevTab.id);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const firstTab = DOMAIN_TABS[0];
      handleTabChange(firstTab.id);
      focusTab(firstTab.id);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const lastTab = DOMAIN_TABS[DOMAIN_TABS.length - 1];
      handleTabChange(lastTab.id);
      focusTab(lastTab.id);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/collect/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, zoneManagement: 'unmanaged' }),
      });
      if (response.ok) {
        // Invalidate router cache to refetch loader data
        await router.invalidate();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-gray-900 break-all">{domain}</h1>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            className="focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {snapshot ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ZoneManagementBadge type={snapshot.zoneManagement} />
            <ResultStateBadge state={snapshot.resultState} />
            <span className="text-sm text-gray-500 tabular-nums">
              Last updated: {new Date(snapshot.createdAt).toLocaleString()}
            </span>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              No data collected for {domain} yet. Click Refresh to perform initial collection.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div
          role="tablist"
          aria-label="Domain data views"
          className="-mb-px flex w-max min-w-full space-x-4 sm:space-x-8"
        >
          {DOMAIN_TABS.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              id={getTabId(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={getPanelId(tab.id)}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`focus-ring min-h-10 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div
          role="tabpanel"
          id={getPanelId('overview')}
          aria-labelledby={getTabId('overview')}
          hidden={activeTab !== 'overview'}
        >
          {activeTab === 'overview' && (
            <OverviewTab snapshot={snapshot} observations={observations} domain={domain} />
          )}
        </div>

        <div
          role="tabpanel"
          id={getPanelId('dns')}
          aria-labelledby={getTabId('dns')}
          hidden={activeTab !== 'dns'}
        >
          {activeTab === 'dns' && <DNSTab observations={observations} />}
        </div>

        <div
          role="tabpanel"
          id={getPanelId('mail')}
          aria-labelledby={getTabId('mail')}
          hidden={activeTab !== 'mail'}
        >
          {activeTab === 'mail' && <MailTab domain={domain} snapshotId={snapshot?.id || null} />}
        </div>

        <div
          role="tabpanel"
          id={getPanelId('delegation')}
          aria-labelledby={getTabId('delegation')}
          hidden={activeTab !== 'delegation'}
        >
          {activeTab === 'delegation' && <DelegationTab snapshotId={snapshot?.id || null} />}
        </div>

        <div
          role="tabpanel"
          id={getPanelId('history')}
          aria-labelledby={getTabId('history')}
          hidden={activeTab !== 'history'}
        >
          {activeTab === 'history' && <HistoryTab domain={domain} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  snapshot,
  observations,
  domain,
}: {
  snapshot: Snapshot | null;
  observations: Observation[];
  domain: string;
}) {
  if (!snapshot) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No snapshot available. Refresh to collect data.</p>
        </div>
        {/* Tags and Notes are available even without snapshot */}
        <TagsPanel domainId={domain} isDomainName />
        <NotesPanel domainId={domain} isDomainName />
      </div>
    );
  }

  // Calculate summary stats
  const successCount = observations.filter((o) => o.status === 'success').length;
  const errorCount = observations.filter((o) => o.status !== 'success').length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Queries" value={observations.length} />
        <StatCard label="Successful" value={successCount} color="green" />
        <StatCard
          label="Errors/Timeouts"
          value={errorCount}
          color={errorCount > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Scope Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Query Scope</h3>
        <div className="space-y-3">
          <ScopeList label="Names" values={snapshot.queriedNames || []} />
          <ScopeList label="Types" values={snapshot.queriedTypes || []} />
          <ScopeList label="Vantages" values={snapshot.vantages || []} />
        </div>
        {snapshot.zoneManagement === 'unmanaged' && (
          <p className="mt-3 text-xs text-blue-700">
            Targeted inspection mode: this is not full zone enumeration.
          </p>
        )}
      </div>

      {/* Snapshot Metadata */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Snapshot Metadata</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-900 tabular-nums">
              {new Date(snapshot.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Duration</dt>
            <dd className="text-gray-900 tabular-nums">
              {snapshot.collectionDurationMs ? `${snapshot.collectionDurationMs}ms` : 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Triggered By</dt>
            <dd className="text-gray-900">{snapshot.triggeredBy || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Ruleset</dt>
            <dd className="text-gray-900">{snapshot.rulesetVersionId || 'N/A'}</dd>
          </div>
        </dl>
      </div>

      {/* FROZEN: Findings Panel - pending Bead 06 (Persisted DNS findings) */}
      <FindingsPanel snapshotId={snapshot.id || null} />

      {/* Domain Tags */}
      <TagsPanel domainId={snapshot.domainId} />

      {/* Domain Notes */}
      <NotesPanel domainId={snapshot.domainId} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: number;
  color?: 'gray' | 'green' | 'red';
}) {
  const colorClasses = {
    gray: 'bg-gray-50',
    green: 'bg-green-50',
    red: 'bg-red-50',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 text-center`}>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function ScopeList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{label}</p>
      {values.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full bg-white/80 border border-blue-200 px-2 py-0.5 text-xs text-blue-900"
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-blue-800">N/A</p>
      )}
    </div>
  );
}

function DNSTab({ observations }: { observations: Observation[] }) {
  if (observations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No observations available. Refresh to collect DNS data.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">DNS Records</h3>
        <p className="text-sm text-gray-500">
          View DNS data in three formats: Parsed (structured), Raw (complete data), or Dig
          (CLI-style).
        </p>
      </div>
      <DNSViews observations={observations} />
    </div>
  );
}

function MailTab({ domain, snapshotId }: { domain: string; snapshotId: string | null }) {
  return (
    <div>
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900">Mail Configuration</h3>
        <p className="text-sm text-gray-500">
          Run mail diagnostics, view discovered DKIM selectors, and request remediation for issues.
        </p>
      </div>

      {/* FROZEN: Mail Diagnostics - pending Bead 11 (Mail findings preview) */}
      <div className="mb-8">
        <MailDiagnostics domain={domain} snapshotId={snapshotId || undefined} />
      </div>

      {/* FROZEN: Discovered DKIM Selectors - pending Bead 10 (DKIM selector provenance) */}
      {snapshotId && (
        <div className="mb-8 border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-3">Discovered DKIM Selectors</h4>
          <DiscoveredSelectors snapshotId={snapshotId} />
        </div>
      )}

      {/* FROZEN: Legacy Tools Integration - pending Bead 08 (Legacy mail bridge) */}
      <div className="mb-8 border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-3">Legacy Mail Tools</h4>
        <LegacyToolsPanel domain={domain} />
      </div>

      {/* Workbench Mail Analysis - powered by rules engine */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-4">Workbench Mail Analysis</h4>
        <MailFindingsPanel snapshotId={snapshotId} />
      </div>
    </div>
  );
}

function DelegationTab({ snapshotId }: { snapshotId: string | null }) {
  return (
    <div>
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900">Delegation Analysis</h3>
        <p className="text-sm text-gray-500">
          Parent zone view, authoritative server responses, glue records, and DNSSEC status.
        </p>
      </div>
      <DelegationPanel snapshotId={snapshotId} />
    </div>
  );
}

interface SnapshotHistoryItem {
  id: string;
  createdAt: string;
  rulesetVersion?: string;
  queryScope?: {
    names?: string[];
    types?: string[];
    vantages?: string[];
  };
}

interface SnapshotHistoryResponse {
  snapshots?: SnapshotHistoryItem[];
}

interface RecordChange {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  name: string;
  recordType: string;
  valuesA?: string[];
  valuesB?: string[];
  diff?: { added: string[]; removed: string[] };
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

interface SnapshotDiffData {
  snapshotA: { id: string; createdAt: string; rulesetVersion: string };
  snapshotB: { id: string; createdAt: string; rulesetVersion: string };
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

interface SnapshotCompareLatestResponse {
  diff?: SnapshotDiffData;
  warnings?: string[];
}

function HistoryTab({ domain }: { domain: string }) {
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotHistoryItem[]>([]);
  const [latestDiff, setLatestDiff] = useState<SnapshotCompareLatestResponse['diff'] | null>(null);
  const [diffWarnings, setDiffWarnings] = useState<string[]>([]);
  const [copiedSnapshotId, setCopiedSnapshotId] = useState<string | null>(null);
  const [showDetailedDiff, setShowDetailedDiff] = useState(false);

  // Manual comparison state
  const [compareMode, setCompareMode] = useState(false);
  const [selectedSnapshots, setSelectedSnapshots] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [manualDiff, setManualDiff] = useState<SnapshotCompareLatestResponse['diff'] | null>(null);
  const [manualDiffWarnings, setManualDiffWarnings] = useState<string[]>([]);
  const [manualDiffLoading, setManualDiffLoading] = useState(false);
  const [manualDiffError, setManualDiffError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const encodedDomain = encodeURIComponent(domain);
      const [historyResponse, diffResponse] = await Promise.all([
        fetch(`/api/snapshots/${encodedDomain}?limit=20`),
        fetch(`/api/snapshots/${encodedDomain}/compare-latest`, { method: 'POST' }),
      ]);

      if (!historyResponse.ok) {
        throw new Error(`History request failed (${historyResponse.status})`);
      }

      const historyData = (await historyResponse.json()) as SnapshotHistoryResponse;
      setSnapshots(historyData.snapshots || []);

      if (diffResponse.ok) {
        const diffData = (await diffResponse.json()) as SnapshotCompareLatestResponse;
        setLatestDiff(diffData.diff || null);
        setDiffWarnings(diffData.warnings || []);
      } else {
        setLatestDiff(null);
        setDiffWarnings([]);
      }
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, [domain]);

  const handleCopySnapshotId = async (snapshotId: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(snapshotId);
        setCopiedSnapshotId(snapshotId);
        window.setTimeout(
          () => setCopiedSnapshotId((current) => (current === snapshotId ? null : current)),
          1500
        );
      }
    } catch {
      setCopiedSnapshotId(null);
    }
  };

  const handleToggleSnapshotSelection = (snapshotId: string) => {
    setSelectedSnapshots(([first, second]) => {
      // If already selected, deselect it
      if (first === snapshotId) return [second, null];
      if (second === snapshotId) return [first, null];

      // If we have two selected, replace the second
      if (first !== null && second !== null) {
        return [first, snapshotId];
      }

      // Add to first empty slot
      if (first === null) return [snapshotId, second];
      return [first, snapshotId];
    });
  };

  const handleCompareSelected = async () => {
    const [snapshotAId, snapshotBId] = selectedSnapshots;
    if (!snapshotAId || !snapshotBId) return;

    setManualDiffLoading(true);
    setManualDiffError(null);

    try {
      const encodedDomain = encodeURIComponent(domain);
      const response = await fetch(`/api/snapshots/${encodedDomain}/diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotA: snapshotAId, snapshotB: snapshotBId }),
      });

      if (!response.ok) {
        throw new Error(`Comparison failed (${response.status})`);
      }

      const data = (await response.json()) as SnapshotCompareLatestResponse;
      setManualDiff(data.diff || null);
      setManualDiffWarnings(data.warnings || []);
    } catch (error) {
      setManualDiffError(error instanceof Error ? error.message : 'Failed to compare snapshots');
      setManualDiff(null);
    } finally {
      setManualDiffLoading(false);
    }
  };

  const handleClearComparison = () => {
    setSelectedSnapshots([null, null]);
    setManualDiff(null);
    setManualDiffWarnings([]);
    setManualDiffError(null);
  };

  const getSelectionIndex = (snapshotId: string): number | null => {
    if (selectedSnapshots[0] === snapshotId) return 1;
    if (selectedSnapshots[1] === snapshotId) return 2;
    return null;
  };

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  if (historyLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12" aria-live="polite" aria-busy="true">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading snapshot history...</p>
        <p className="text-sm text-gray-400 mt-1">Fetching snapshots and comparing changes</p>
      </div>
    );
  }

  if (historyError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h4 className="text-lg font-medium text-gray-900 mb-1">Failed to Load History</h4>
        <p className="text-sm text-gray-500 mb-4 text-center max-w-md">{historyError}</p>
        <button
          type="button"
          onClick={() => {
            void loadHistory();
          }}
          className="focus-ring px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Snapshot History</h3>
          <p className="text-sm text-gray-500">Latest 20 snapshots for {domain}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) handleClearComparison();
            }}
            className={`focus-ring min-h-10 px-4 py-2 rounded-lg transition-colors ${
              compareMode
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {compareMode ? 'Exit Compare' : 'Compare Mode'}
          </button>
          <button
            type="button"
            onClick={() => {
              void loadHistory();
            }}
            className="focus-ring min-h-10 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Compare Mode Selection UI */}
      {compareMode && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium text-purple-900">Manual Comparison</h4>
              <p className="text-sm text-purple-700">
                {selectedSnapshots[0] && selectedSnapshots[1]
                  ? 'Two snapshots selected. Click Compare to see differences.'
                  : selectedSnapshots[0]
                    ? 'Select one more snapshot to compare.'
                    : 'Select two snapshots from the list below to compare them.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(selectedSnapshots[0] || selectedSnapshots[1]) && (
                <button
                  type="button"
                  onClick={handleClearComparison}
                  className="focus-ring min-h-9 px-3 py-1.5 text-sm text-purple-700 hover:text-purple-900 hover:bg-purple-100 rounded-lg"
                >
                  Clear Selection
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  void handleCompareSelected();
                }}
                disabled={!selectedSnapshots[0] || !selectedSnapshots[1] || manualDiffLoading}
                className="focus-ring min-h-9 px-4 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {manualDiffLoading ? 'Comparing...' : 'Compare Selected'}
              </button>
            </div>
          </div>

          {/* Selected snapshots preview */}
          {(selectedSnapshots[0] || selectedSnapshots[1]) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {selectedSnapshots[0] && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-200 text-purple-800">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-600 text-white text-xs font-bold">
                    A
                  </span>
                  <span className="font-mono text-xs">{selectedSnapshots[0].slice(0, 8)}...</span>
                </span>
              )}
              {selectedSnapshots[0] && selectedSnapshots[1] && (
                <span className="text-purple-600">vs</span>
              )}
              {selectedSnapshots[1] && (
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-200 text-purple-800">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-600 text-white text-xs font-bold">
                    B
                  </span>
                  <span className="font-mono text-xs">{selectedSnapshots[1].slice(0, 8)}...</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Comparison Results */}
      {compareMode && manualDiffError && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700" role="alert">
          {manualDiffError}
        </div>
      )}

      {compareMode && manualDiff && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Comparison Results</h4>
            <span className="text-sm text-gray-500">
              {new Date(manualDiff.snapshotA.createdAt).toLocaleDateString()} →{' '}
              {new Date(manualDiff.snapshotB.createdAt).toLocaleDateString()}
            </span>
          </div>
          <SnapshotDiffPanel diff={manualDiff} warnings={manualDiffWarnings} />
        </div>
      )}

      {latestDiff?.summary && (
        <div className="space-y-3">
          {/* Summary Card */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-900">Latest Changes</h4>
              <button
                type="button"
                onClick={() => setShowDetailedDiff(!showDetailedDiff)}
                className="text-sm text-blue-700 hover:text-blue-800 font-medium"
              >
                {showDetailedDiff ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <div>
                <div className="text-blue-700">Total</div>
                <div className="font-semibold text-blue-900 tabular-nums">
                  {latestDiff.summary.totalChanges ?? 0}
                </div>
              </div>
              <div>
                <div className="text-blue-700">Added</div>
                <div className="font-semibold text-blue-900 tabular-nums">
                  {latestDiff.summary.additions ?? 0}
                </div>
              </div>
              <div>
                <div className="text-blue-700">Removed</div>
                <div className="font-semibold text-blue-900 tabular-nums">
                  {latestDiff.summary.deletions ?? 0}
                </div>
              </div>
              <div>
                <div className="text-blue-700">Modified</div>
                <div className="font-semibold text-blue-900 tabular-nums">
                  {latestDiff.summary.modifications ?? 0}
                </div>
              </div>
              <div>
                <div className="text-blue-700">Unchanged</div>
                <div className="font-semibold text-blue-900 tabular-nums">
                  {latestDiff.summary.unchanged ?? 0}
                </div>
              </div>
            </div>
            {!showDetailedDiff && latestDiff.comparison?.scopeChanges?.message && (
              <p className="mt-3 text-xs text-blue-800">
                {latestDiff.comparison.scopeChanges.message}
              </p>
            )}
            {!showDetailedDiff && latestDiff.comparison?.rulesetChange?.message && (
              <p className="mt-1 text-xs text-blue-800">
                {latestDiff.comparison.rulesetChange.message}
              </p>
            )}
          </div>

          {/* Detailed Diff Panel */}
          {showDetailedDiff && <SnapshotDiffPanel diff={latestDiff} warnings={diffWarnings} />}
        </div>
      )}

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-gray-50">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-1">No Snapshots Yet</h4>
          <p className="text-sm text-gray-500 text-center max-w-md mb-4">
            No snapshot history is available for this domain. Run a collection to capture the current DNS state.
          </p>
          <p className="text-xs text-gray-400">
            Snapshots track DNS record changes over time
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <caption className="sr-only">Recent snapshots for {domain}</caption>
            <thead className="bg-gray-50">
              <tr>
                {compareMode && (
                  <th
                    scope="col"
                    className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16"
                  >
                    Select
                  </th>
                )}
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Captured
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Ruleset
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Scope
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Snapshot ID
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {snapshots.map((snapshot) => {
                const selectionIndex = getSelectionIndex(snapshot.id);
                const isSelected = selectionIndex !== null;

                return (
                  <tr
                    key={snapshot.id}
                    className={`transition-colors duration-150 ${
                      isSelected
                        ? 'bg-purple-50 hover:bg-purple-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {compareMode && (
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSnapshotSelection(snapshot.id)}
                          className={`focus-ring w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-purple-200 hover:text-purple-700'
                          }`}
                          aria-label={
                            isSelected
                              ? `Deselect snapshot ${snapshot.id}`
                              : `Select snapshot ${snapshot.id} for comparison`
                          }
                          aria-pressed={isSelected}
                        >
                          {isSelected ? (selectionIndex === 1 ? 'A' : 'B') : '+'}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
                      {new Date(snapshot.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {snapshot.rulesetVersion || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {snapshot.queryScope?.names?.length || 0} names ·{' '}
                      {snapshot.queryScope?.types?.length || 0} types ·{' '}
                      {snapshot.queryScope?.vantages?.length || 0} vantages
                    </td>
                    <td className="px-4 py-2 text-xs font-mono text-gray-500">{snapshot.id}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          void handleCopySnapshotId(snapshot.id);
                        }}
                        className="focus-ring min-h-9 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        aria-label={`Copy snapshot ID ${snapshot.id}`}
                      >
                        {copiedSnapshotId === snapshot.id ? 'Copied' : 'Copy ID'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
