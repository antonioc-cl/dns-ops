import { createFileRoute, useParams } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ZoneManagementBadge, ResultStateBadge } from '../../components/StatusBadges'
import type { Snapshot } from '@dns-ops/contracts'

export const Route = createFileRoute('/domain/$domain')({
  component: Domain360Page,
  loader: async ({ params }) => {
    // Fetch snapshot data
    const response = await fetch(`/api/domain/${params.domain}/latest`)
    if (!response.ok) {
      return { domain: params.domain, snapshot: null }
    }
    const snapshot = await response.json()
    return { domain: params.domain, snapshot }
  },
})

function Domain360Page() {
  const { domain } = useParams({ from: '/domain/$domain' })
  const { snapshot } = Route.useLoaderData()
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
        // Reload page to get new snapshot
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
        {activeTab === 'overview' && <OverviewTab snapshot={snapshot} domain={domain} />}
        {activeTab === 'dns' && <DNSTab snapshot={snapshot} />}
        {activeTab === 'mail' && <MailTabPlaceholder />}
        {activeTab === 'delegation' && <DelegationTabPlaceholder />}
        {activeTab === 'history' && <HistoryTabPlaceholder />}
      </div>
    </div>
  )
}

function OverviewTab({ snapshot, domain }: { snapshot: Snapshot | null; domain: string }) {
  if (!snapshot) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No snapshot available. Refresh to collect data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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

      {/* Placeholder for Findings (Bead 07) */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Findings</h3>
        <p className="text-gray-500 text-sm">Findings will be available after Bead 07 (Rules Engine).</p>
      </div>
    </div>
  )
}

function DNSTab({ snapshot }: { snapshot: Snapshot | null }) {
  if (!snapshot) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No snapshot available.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">DNS Records</h3>
      <p className="text-gray-500 text-sm mb-4">
        Full DNS record views will be available after Bead 05 (Snapshot Read Path).
      </p>
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Snapshot ID: <code className="bg-gray-200 px-1 rounded">{snapshot.id}</code>
        </p>
      </div>
    </div>
  )
}

function MailTabPlaceholder() {
  return (
    <div className="text-center py-12">
      <h3 className="font-semibold text-gray-900 mb-2">Mail Configuration</h3>
      <p className="text-gray-500">
        Mail diagnostics will be available after Bead 08 (Mail Collection).
      </p>
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
