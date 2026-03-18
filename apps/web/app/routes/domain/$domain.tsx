import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { ZoneManagementBadge, ResultStateBadge } from '../../components/StatusBadges'
import { DNSViews } from '../../components/DNSViews'
import { FindingsPanel } from '../../components/FindingsPanel'
import { LegacyToolsPanel } from '../../components/LegacyToolsPanel'
import type { Observation, Snapshot } from '@dns-ops/db/schema'

export const Route = createFileRoute('/domain/$domain')({
  component: Domain360Page,
  loader: async ({ params }) => {
    // Fetch latest snapshot
    const snapshotResponse = await fetch(`/api/domain/${params.domain}/latest`)
    const snapshot = snapshotResponse.ok ? await snapshotResponse.json() : null

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

function Domain360Page() {
  const { domain } = useParams({ from: '/domain/$domain' })
  const { snapshot, observations } = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">{domain}</h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {snapshot ? (
          <div className="flex items-center gap-2 mt-2">
            <ZoneManagementBadge type={snapshot.zoneManagement} />
            <ResultStateBadge state={snapshot.resultState} />
            <span className="text-sm text-gray-500">
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
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'dns', label: 'DNS' },
            { id: 'mail', label: 'Mail' },
            { id: 'delegation', label: 'Delegation' },
            { id: 'history', label: 'History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'overview' && <OverviewTab snapshot={snapshot} observations={observations} domain={domain} />}
        {activeTab === 'dns' && <DNSTab observations={observations} />}
        {activeTab === 'mail' && <MailTab domain={domain} />}
        {activeTab === 'delegation' && <DelegationTabPlaceholder />}
        {activeTab === 'history' && <HistoryTabPlaceholder />}
      </div>
    </div>
  )
}

function OverviewTab({ snapshot, observations, domain }: { snapshot: Snapshot | null; observations: Observation[]; domain: string }) {
  if (!snapshot) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No snapshot available. Refresh to collect data.</p>
      </div>
    )
  }

  // Calculate summary stats
  const successCount = observations.filter(o => o.status === 'success').length
  const errorCount = observations.filter(o => o.status !== 'success').length

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
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
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-900">{new Date(snapshot.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Duration</dt>
            <dd className="text-gray-900">{snapshot.collectionDurationMs ? `${snapshot.collectionDurationMs}ms` : 'N/A'}</dd>
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
      <FindingsPanel snapshotId={snapshot?.id || null} />
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
      <div className="text-2xl font-bold text-gray-900">{value}</div>
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

function MailTab({ domain }: { domain: string }) {
  // In the future, this will include detected selectors from DNS observations
  // For now, we pass an empty array as selector discovery is part of Bead 08
  const detectedSelectors: string[] = []

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900">Mail Configuration</h3>
        <p className="text-sm text-gray-500">
          Access legacy DMARC/DKIM tools and view mail-related findings.
        </p>
      </div>

      {/* Legacy Tools Integration (Bead 06) */}
      <LegacyToolsPanel domain={domain} detectedSelectors={detectedSelectors} />

      {/* Future: New workbench mail findings will appear here after Bead 08/09 */}
      <div className="mt-8 border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-2">Workbench Mail Analysis</h4>
        <p className="text-sm text-gray-500">
          New mail findings from the workbench rules engine will appear here after
          Bead 08 (Mail Collection) and Bead 09 (Shadow Comparison).
        </p>
      </div>
    </div>
  )
}

function DelegationTabPlaceholder() {
  return (
    <div className="text-center py-12">
      <h3 className="font-semibold text-gray-900 mb-2">Delegation Analysis</h3>
      <p className="text-gray-500">
        Delegation diagnostics will be available after Bead 12 (Delegation Vantage Collector).
      </p>
    </div>
  )
}

function HistoryTabPlaceholder() {
  return (
    <div className="text-center py-12">
      <h3 className="font-semibold text-gray-900 mb-2">Snapshot History</h3>
      <p className="text-gray-500">
        Historical snapshots and diff will be available after Bead 13 (History and Diff).
      </p>
    </div>
  )
}
