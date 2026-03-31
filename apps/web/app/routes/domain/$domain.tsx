import type { Observation, Snapshot } from '@dns-ops/db/schema';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { type KeyboardEvent, useCallback, useEffect, useId, useState } from 'react';
import { DelegationPanel } from '../../components/DelegationPanel.js';
import { DNSViews } from '../../components/DNSViews.js';
import { isDelegationTabEnabled } from '../../config/features.js';
import { MailDiagnostics } from '../../components/mail/index.js';
import { NotesPanel } from '../../components/NotesPanel.js';
import { SimulationPanel } from '../../components/SimulationPanel.js';
import { ResultStateBadge, ZoneManagementBadge } from '../../components/StatusBadges.js';
import { TagsPanel } from '../../components/TagsPanel.js';

type DomainTabId = 'overview' | 'dns' | 'mail' | 'delegation';

/**
 * Loader error types for differentiated error handling
 */
export type LoaderErrorType = 'api_unreachable' | 'fetch_error';

export interface LoaderError {
  type: LoaderErrorType;
  message: string;
}

export interface DomainLoaderData {
  domain: string;
  snapshot: Snapshot | null;
  observations: Observation[];
  error?: LoaderError;
}

interface DomainSearchParams {
  tab?: DomainTabId;
}

// UI-001: Delegation tab is behind feature flag (ahead of plan)
const DELEGATION_ENABLED = isDelegationTabEnabled();
const BASE_TABS: DomainTabId[] = ['overview', 'dns', 'mail'];
const ALL_TABS: DomainTabId[] = DELEGATION_ENABLED ? [...BASE_TABS, 'delegation'] : BASE_TABS;
const VALID_TABS: DomainTabId[] = ALL_TABS;

export const Route = createFileRoute('/domain/$domain')({
  component: Domain360Page,
  validateSearch: (search: Record<string, unknown>): DomainSearchParams => {
    const tab = search.tab as string | undefined;
    return {
      tab: tab && VALID_TABS.includes(tab as DomainTabId) ? (tab as DomainTabId) : undefined,
    };
  },
  loader: async ({ params }): Promise<DomainLoaderData> => {
    if (typeof window === 'undefined') {
      return { domain: params.domain, snapshot: null, observations: [] };
    }

    try {
      const snapshotResponse = await fetch(`/api/domain/${params.domain}/latest`);

      if (!snapshotResponse.ok) {
        if (snapshotResponse.status === 404) {
          // 404 is a valid "no data yet" state, not an error
          return { domain: params.domain, snapshot: null, observations: [] };
        }
        // Other non-ok statuses - treat as fetch error
        return {
          domain: params.domain,
          snapshot: null,
          observations: [],
          error: {
            type: 'fetch_error',
            message: `Failed to load domain data: ${snapshotResponse.status} ${snapshotResponse.statusText}`,
          },
        };
      }

      const snapshot = (await snapshotResponse.json()) as { id: string } & Snapshot;

      let observations: Observation[] = [];
      try {
        const observationResponse = await fetch(`/api/snapshot/${snapshot.id}/observations`);
        if (observationResponse.ok) {
          observations = (await observationResponse.json()) as Observation[];
        }
      } catch {
        // Observation fetch failed but we still have snapshot - not critical
      }

      return { domain: params.domain, snapshot, observations };
    } catch (err) {
      // Network error or other unexpected failure
      return {
        domain: params.domain,
        snapshot: null,
        observations: [],
        error: {
          type: 'api_unreachable',
          message: err instanceof Error ? err.message : 'Unable to reach the API server',
        },
      };
    }
  },
});

const DOMAIN_TABS: { id: DomainTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'dns', label: 'DNS' },
  { id: 'mail', label: 'Mail' },
  // UI-001: Delegation tab behind feature flag
  ...(DELEGATION_ENABLED ? [{ id: 'delegation' as const, label: 'Delegation' }] : []),
];

function Domain360Page() {
  const loaderData = Route.useLoaderData() as DomainLoaderData;
  const { domain, snapshot, observations, error: loaderError } = loaderData;
  const { tab: urlTab } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DomainTabId>(urlTab || 'overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [didHydrateReload, setDidHydrateReload] = useState(false);
  const tabDomIdPrefix = useId();

  useEffect(() => {
    const nextTab = urlTab ?? 'overview';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, urlTab]);

  useEffect(() => {
    if (typeof window === 'undefined' || didHydrateReload || snapshot) {
      return;
    }

    setDidHydrateReload(true);
    void router.invalidate();
  }, [didHydrateReload, router, snapshot]);

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
      const prevTab = DOMAIN_TABS[(index - 1 + DOMAIN_TABS.length) % DOMAIN_TABS.length];
      handleTabChange(prevTab.id);
      focusTab(prevTab.id);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      handleTabChange(DOMAIN_TABS[0].id);
      focusTab(DOMAIN_TABS[0].id);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      handleTabChange(DOMAIN_TABS[DOMAIN_TABS.length - 1].id);
      focusTab(DOMAIN_TABS[DOMAIN_TABS.length - 1].id);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const response = await fetch('/api/collect/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, zoneManagement: 'unmanaged' }),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({ error: 'Refresh failed' }))) as {
          error?: string;
          message?: string;
        };
        if (response.status === 401 || response.status === 403) {
          setRefreshError('Operator sign-in is required to refresh DNS evidence.');
          return;
        }
        setRefreshError(error.message || error.error || 'Refresh failed');
        return;
      }

      await router.invalidate();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
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
        ) : loaderError ? (
          <div
            className={`mt-4 p-4 rounded-lg border ${
              loaderError.type === 'api_unreachable'
                ? 'bg-red-50 border-red-200'
                : 'bg-orange-50 border-orange-200'
            }`}
            data-testid="loader-error-banner"
          >
            <p
              className={
                loaderError.type === 'api_unreachable' ? 'text-red-800' : 'text-orange-800'
              }
            >
              {loaderError.message}
            </p>
          </div>
        ) : (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              No DNS snapshot is available for {domain} yet. Use an operator session to refresh and
              collect new DNS evidence.
            </p>
          </div>
        )}

        {refreshError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {refreshError}
          </div>
        ) : null}
      </div>

      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div
          role="tablist"
          aria-label="Domain DNS views"
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div
          role="tabpanel"
          id={getPanelId('overview')}
          aria-labelledby={getTabId('overview')}
          hidden={activeTab !== 'overview'}
        >
          {activeTab === 'overview' && (
            <OverviewTab domain={domain} snapshot={snapshot} observations={observations} />
          )}
        </div>

        <div
          role="tabpanel"
          id={getPanelId('dns')}
          aria-labelledby={getTabId('dns')}
          hidden={activeTab !== 'dns'}
        >
          {activeTab === 'dns' && <DnsTab observations={observations} />}
        </div>

        <div
          role="tabpanel"
          id={getPanelId('mail')}
          aria-labelledby={getTabId('mail')}
          hidden={activeTab !== 'mail'}
        >
          {activeTab === 'mail' && <MailTab domain={domain} snapshotId={snapshot?.id} />}
        </div>

        {/* UI-001: Delegation panel behind feature flag */}
        {DELEGATION_ENABLED && (
          <div
            role="tabpanel"
            id={getPanelId('delegation')}
            aria-labelledby={getTabId('delegation')}
            hidden={activeTab !== 'delegation'}
          >
            {activeTab === 'delegation' && (
              <DelegationTab domain={domain} snapshotId={snapshot?.id} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  domain,
  snapshot,
  observations,
}: {
  domain: string;
  snapshot: Snapshot | null;
  observations: Observation[];
}) {
  if (!snapshot) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No DNS evidence available yet for {domain}.</p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Operator Context</h3>
            <p className="text-sm text-gray-500">
              Keep tenant-scoped notes and tags attached to the domain even before the next evidence
              refresh.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <NotesPanel domainId={domain} isDomainName />
            <TagsPanel domainId={domain} isDomainName />
          </div>
        </div>
      </div>
    );
  }

  const successCount = observations.filter(
    (observation) => observation.status === 'success'
  ).length;
  const errorCount = observations.length - successCount;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Queries" value={observations.length} />
        <StatCard label="Successful" value={successCount} color="green" />
        <StatCard
          label="Errors/Timeouts"
          value={errorCount}
          color={errorCount > 0 ? 'red' : 'gray'}
        />
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Fix Simulation</h3>
        <p className="text-sm text-gray-500 mb-3">
          Simulate DNS changes to see which findings would be resolved.
        </p>
        <SimulationPanel snapshotId={snapshot.id} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Query Scope</h3>
        <div className="space-y-3">
          <ScopeList label="Names" values={snapshot.queriedNames || []} />
          <ScopeList label="Types" values={snapshot.queriedTypes || []} />
          <ScopeList label="Vantages" values={snapshot.vantages || []} />
        </div>
        {snapshot.zoneManagement === 'unmanaged' ? (
          <p className="mt-3 text-xs text-blue-700">
            Targeted inspection mode: this is a DNS evidence snapshot, not a full zone enumeration.
          </p>
        ) : null}
      </div>

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
            <dd className="text-gray-900">{snapshot.rulesetVersionId || 'Pending evaluation'}</dd>
          </div>
        </dl>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">Operator Context</h3>
          <p className="text-sm text-gray-500">
            Keep tenant-scoped notes and tags attached to the domain alongside the latest DNS
            evidence.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <NotesPanel domainId={domain} isDomainName />
          <TagsPanel domainId={domain} isDomainName />
        </div>
      </div>
    </div>
  );
}

function DnsTab({ observations }: { observations: Observation[] }) {
  if (observations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          No DNS observations available yet. Refresh to collect DNS data.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">DNS Records</h3>
        <p className="text-sm text-gray-500">
          View DNS evidence in Parsed, Raw, or Dig-style formats.
        </p>
      </div>
      <DNSViews observations={observations} />
    </div>
  );
}

function MailTab({ domain, snapshotId }: { domain: string; snapshotId?: string }) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">Mail Security</h3>
        <p className="text-sm text-gray-500">
          Run mail diagnostics and submit tenant-scoped remediation requests.
        </p>
      </div>
      <MailDiagnostics domain={domain} snapshotId={snapshotId} />
    </div>
  );
}

function DelegationTab({ domain, snapshotId }: { domain: string; snapshotId?: string }) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">Delegation Analysis</h3>
        <p className="text-sm text-gray-500">
          View delegation status, name server configuration, and glue records for {domain}.
        </p>
      </div>
      <DelegationPanel snapshotId={snapshotId ?? null} />
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
