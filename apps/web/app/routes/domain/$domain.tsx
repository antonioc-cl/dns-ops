import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { ZoneManagementBadge, ResultStateBadge } from '../../components/StatusBadges.js'
import { DNSViews } from '../../components/DNSViews.js'
import { FindingsPanel } from '../../components/FindingsPanel.js'
import { LegacyToolsPanel } from '../../components/LegacyToolsPanel.js'
import { DiscoveredSelectors } from '../../components/DiscoveredSelectors.js'
import { DelegationPanel } from '../../components/DelegationPanel.js'
import { MailDiagnostics } from '../../components/mail/index.js'
import type { Observation, Snapshot } from '@dns-ops/db/schema'

export const Route = createFileRoute('/domain/$domain' as any)({
  component: Domain360Page,
  loader: async ({ params }: any) => {
    // Fetch latest snapshot
    const snapshotResponse = await fetch(`/api/domain/${params.domain}/latest`)
    const snapshot = snapshotResponse.ok
      ? ((await snapshotResponse.json()) as { id: string } & Snapshot)
      : null

    // Fetch observations if snapshot exists
    let observations: Observation[] = []
    if (snapshot) {
      const obsResponse = await fetch(`/api/snapshot/${snapshot.id}/observations`)
      if (obsResponse.ok) {
        observations = await obsResponse.json()
      }
    }

    return { domain: params.domain, snapshot, observations }
  },
})

type DomainTabId = 'overview' | 'dns' | 'mail' | 'delegation' | 'history'

const DOMAIN_TABS: { id: DomainTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'dns', label: 'DNS' },
  { id: 'mail', label: 'Mail' },
  { id: 'delegation', label: 'Delegation' },
  { id: 'history', label: 'History' },
]

function Domain360Page() {
  const { domain, snapshot, observations } = Route.useLoaderData() as {
    domain: string
    snapshot: Snapshot | null
    observations: Observation[]
  }
  const [activeTab, setActiveTab] = useState<DomainTabId>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const focusTab = (tabId: DomainTabId) => {
    requestAnimationFrame(() => {
      document.getElementById(`domain-tab-${tabId}`)?.focus()
    })
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const nextTab = DOMAIN_TABS[(index + 1) % DOMAIN_TABS.length]
      setActiveTab(nextTab.id)
      focusTab(nextTab.id)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prevIndex = (index - 1 + DOMAIN_TABS.length) % DOMAIN_TABS.length
      const prevTab = DOMAIN_TABS[prevIndex]
      setActiveTab(prevTab.id)
      focusTab(prevTab.id)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      const firstTab = DOMAIN_TABS[0]
      setActiveTab(firstTab.id)
      focusTab(firstTab.id)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      const lastTab = DOMAIN_TABS[DOMAIN_TABS.length - 1]
      setActiveTab(lastTab.id)
      focusTab(lastTab.id)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/collect/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, zoneManagement: 'unmanaged' }),
      })
      if (response.ok) {
        window.location.reload()
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-gray-900 break-all">{domain}</h1>
          <button
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
        <nav
          role="tablist"
          aria-label="Domain data views"
          className="-mb-px flex w-max min-w-full space-x-4 sm:space-x-8"
        >
          {DOMAIN_TABS.map((tab, index) => (
            <button
              key={tab.id}
              id={`domain-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`domain-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
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
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div
          role="tabpanel"
          id="domain-panel-overview"
          aria-labelledby="domain-tab-overview"
          hidden={activeTab !== 'overview'}
        >
          {activeTab === 'overview' && <OverviewTab snapshot={snapshot} observations={observations} />}
        </div>

        <div
          role="tabpanel"
          id="domain-panel-dns"
          aria-labelledby="domain-tab-dns"
          hidden={activeTab !== 'dns'}
        >
          {activeTab === 'dns' && <DNSTab observations={observations} />}
        </div>

        <div
          role="tabpanel"
          id="domain-panel-mail"
          aria-labelledby="domain-tab-mail"
          hidden={activeTab !== 'mail'}
        >
          {activeTab === 'mail' && <MailTab domain={domain} snapshotId={snapshot?.id || null} />}
        </div>

        <div
          role="tabpanel"
          id="domain-panel-delegation"
          aria-labelledby="domain-tab-delegation"
          hidden={activeTab !== 'delegation'}
        >
          {activeTab === 'delegation' && <DelegationTab snapshotId={snapshot?.id || null} />}
        </div>

        <div
          role="tabpanel"
          id="domain-panel-history"
          aria-labelledby="domain-tab-history"
          hidden={activeTab !== 'history'}
        >
          {activeTab === 'history' && <HistoryTab domain={domain} />}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ snapshot, observations }: { snapshot: Snapshot | null; observations: Observation[] }) {
  if (!snapshot) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No snapshot available. Refresh to collect data.</p>
      </div>
    )
  }

  // Calculate summary stats
  const successCount = observations.filter((o) => o.status === 'success').length
  const errorCount = observations.filter((o) => o.status !== 'success').length

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Queries" value={observations.length} />
        <StatCard label="Successful" value={successCount} color="green" />
        <StatCard label="Errors/Timeouts" value={errorCount} color={errorCount > 0 ? 'red' : 'gray'} />
      </div>

      {/* Scope Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Query Scope</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Names:</strong> {snapshot.queriedNames?.join(', ') || 'N/A'}</p>
          <p><strong>Types:</strong> {snapshot.queriedTypes?.join(', ') || 'N/A'}</p>
          <p><strong>Vantages:</strong> {snapshot.vantages?.join(', ') || 'N/A'}</p>
        </div>
        {snapshot.zoneManagement === 'unmanaged' && (
          <p className="mt-2 text-xs text-blue-600">
            This is targeted inspection, not full zone enumeration.
          </p>
        )}
      </div>

      {/* Snapshot Metadata */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Snapshot Metadata</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-900 tabular-nums">{new Date(snapshot.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Duration</dt>
            <dd className="text-gray-900 tabular-nums">{snapshot.collectionDurationMs ? `${snapshot.collectionDurationMs}ms` : 'N/A'}</dd>
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

      {/* Findings Panel (Bead 07) */}
      <FindingsPanel snapshotId={snapshot.id || null} />
    </div>
  )
}

function StatCard({ label, value, color = 'gray' }: { label: string; value: number; color?: 'gray' | 'green' | 'red' }) {
  const colorClasses = {
    gray: 'bg-gray-50',
    green: 'bg-green-50',
    red: 'bg-red-50',
  }

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 text-center`}>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}

function DNSTab({ observations }: { observations: Observation[] }) {
  if (observations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No observations available. Refresh to collect DNS data.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">DNS Records</h3>
        <p className="text-sm text-gray-500">
          View DNS data in three formats: Parsed (structured), Raw (complete data), or Dig (CLI-style).
        </p>
      </div>
      <DNSViews observations={observations} />
    </div>
  )
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

      {/* Mail Diagnostics (Bead 16) */}
      <div className="mb-8">
        <MailDiagnostics domain={domain} snapshotId={snapshotId || undefined} />
      </div>

      {/* Discovered DKIM Selectors (Bead 08) */}
      {snapshotId && (
        <div className="mb-8 border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-3">Discovered DKIM Selectors</h4>
          <DiscoveredSelectors snapshotId={snapshotId} />
        </div>
      )}

      {/* Legacy Tools Integration (Bead 06) */}
      <div className="mb-8 border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-3">Legacy Mail Tools</h4>
        <LegacyToolsPanel domain={domain} />
      </div>

      {/* Future: New workbench mail findings will appear here after Bead 09 */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-2">Workbench Mail Analysis</h4>
        <p className="text-sm text-gray-500">
          Mail findings from the workbench rules engine will appear here as analysis coverage expands.
        </p>
      </div>
    </div>
  )
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
  )
}

interface SnapshotHistoryItem {
  id: string
  createdAt: string
  rulesetVersion?: string
  queryScope?: {
    names?: string[]
    types?: string[]
    vantages?: string[]
  }
}

interface SnapshotHistoryResponse {
  snapshots?: SnapshotHistoryItem[]
}

interface SnapshotCompareLatestResponse {
  diff?: {
    summary?: {
      totalChanges?: number
      additions?: number
      deletions?: number
      modifications?: number
      unchanged?: number
    }
    comparison?: {
      scopeChanges?: { message?: string } | null
      rulesetChange?: { message?: string } | null
    }
  }
}

function HistoryTab({ domain }: { domain: string }) {
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<SnapshotHistoryItem[]>([])
  const [latestDiff, setLatestDiff] = useState<SnapshotCompareLatestResponse['diff'] | null>(null)

  const loadHistory = async () => {
    setHistoryLoading(true)
    setHistoryError(null)

    try {
      const encodedDomain = encodeURIComponent(domain)
      const [historyResponse, diffResponse] = await Promise.all([
        fetch(`/api/snapshots/${encodedDomain}?limit=20`),
        fetch(`/api/snapshots/${encodedDomain}/compare-latest`, { method: 'POST' }),
      ])

      if (!historyResponse.ok) {
        throw new Error(`History request failed (${historyResponse.status})`)
      }

      const historyData = (await historyResponse.json()) as SnapshotHistoryResponse
      setSnapshots(historyData.snapshots || [])

      if (diffResponse.ok) {
        const diffData = (await diffResponse.json()) as SnapshotCompareLatestResponse
        setLatestDiff(diffData.diff || null)
      } else {
        setLatestDiff(null)
      }
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    void loadHistory()
  }, [domain])

  if (historyLoading) {
    return (
      <div className="py-8 text-center" role="status" aria-live="polite" aria-busy="true">
        <div className="motion-safe:animate-pulse text-gray-500">Loading snapshot history...</div>
      </div>
    )
  }

  if (historyError) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700" role="alert">
          Failed to load snapshot history: {historyError}
        </div>
        <button
          onClick={() => {
            void loadHistory()
          }}
          className="focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Snapshot History</h3>
          <p className="text-sm text-gray-500">Latest 20 snapshots for {domain}</p>
        </div>
        <button
          onClick={() => {
            void loadHistory()
          }}
          className="focus-ring min-h-10 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
        >
          Refresh History
        </button>
      </div>

      {latestDiff?.summary && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="font-medium text-blue-900 mb-2">Latest Diff Summary</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div>
              <div className="text-blue-700">Total</div>
              <div className="font-semibold text-blue-900 tabular-nums">{latestDiff.summary.totalChanges ?? 0}</div>
            </div>
            <div>
              <div className="text-blue-700">Added</div>
              <div className="font-semibold text-blue-900 tabular-nums">{latestDiff.summary.additions ?? 0}</div>
            </div>
            <div>
              <div className="text-blue-700">Removed</div>
              <div className="font-semibold text-blue-900 tabular-nums">{latestDiff.summary.deletions ?? 0}</div>
            </div>
            <div>
              <div className="text-blue-700">Modified</div>
              <div className="font-semibold text-blue-900 tabular-nums">{latestDiff.summary.modifications ?? 0}</div>
            </div>
            <div>
              <div className="text-blue-700">Unchanged</div>
              <div className="font-semibold text-blue-900 tabular-nums">{latestDiff.summary.unchanged ?? 0}</div>
            </div>
          </div>
          {latestDiff.comparison?.scopeChanges?.message && (
            <p className="mt-3 text-xs text-blue-800">{latestDiff.comparison.scopeChanges.message}</p>
          )}
          {latestDiff.comparison?.rulesetChange?.message && (
            <p className="mt-1 text-xs text-blue-800">{latestDiff.comparison.rulesetChange.message}</p>
          )}
        </div>
      )}

      {snapshots.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border rounded-lg">
          No snapshot history found yet.
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <caption className="sr-only">Recent snapshots for {domain}</caption>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Captured</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ruleset</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Snapshot ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {snapshots.map((snapshot) => (
                <tr key={snapshot.id}>
                  <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
                    {new Date(snapshot.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{snapshot.rulesetVersion || 'N/A'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {snapshot.queryScope?.names?.length || 0} names · {snapshot.queryScope?.types?.length || 0} types ·{' '}
                    {snapshot.queryScope?.vantages?.length || 0} vantages
                  </td>
                  <td className="px-4 py-2 text-xs font-mono text-gray-500">{snapshot.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
