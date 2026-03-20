/**
 * Portfolio Route - dns-ops-1j4.10.1
 *
 * Main entry point for the domain portfolio view.
 * Lists all monitored domains with their status and provides search/filter capabilities.
 */

import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';

interface Domain {
  id: string;
  name: string;
  zoneManagement: 'managed' | 'unmanaged' | 'unknown';
  lastSnapshotAt: string | null;
  findingCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  tags: string[];
}

interface SearchResponse {
  domains: Domain[];
  count: number;
  hasMore: boolean;
}

export const Route = createFileRoute('/portfolio')({
  component: PortfolioComponent,
});

function PortfolioComponent() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedQuery) {
        params.set('query', debouncedQuery);
      }
      params.set('limit', '50');

      const response = await fetch(`/api/portfolio/search?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch domains: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      setDomains(data.domains);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Domain Portfolio</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and monitor your domain configurations
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              Search domains
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search domains by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={fetchDomains}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Domain List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading && domains.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Loading domains...</div>
        ) : domains.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {debouncedQuery
              ? `No domains found matching "${debouncedQuery}"`
              : 'No domains in portfolio. Add a domain to get started.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {domains.map((domain) => (
              <DomainRow key={domain.id} domain={domain} />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {domains.length > 0 && (
        <div className="text-sm text-gray-500">
          Showing {domains.length} domain{domains.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

function DomainRow({ domain }: { domain: Domain }) {
  const totalFindings =
    domain.findingCounts.critical +
    domain.findingCounts.high +
    domain.findingCounts.medium +
    domain.findingCounts.low +
    domain.findingCounts.info;

  const criticalOrHigh = domain.findingCounts.critical + domain.findingCounts.high;

  return (
    <Link
      to="/domain/$domain"
      params={{ domain: domain.name }}
      className="block hover:bg-gray-50 transition-colors"
    >
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900 truncate">{domain.name}</span>
            <ZoneManagementBadge type={domain.zoneManagement} />
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            {domain.lastSnapshotAt && (
              <span>Last scan: {formatRelativeTime(domain.lastSnapshotAt)}</span>
            )}
            {domain.tags.length > 0 && (
              <div className="flex gap-1">
                {domain.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
                {domain.tags.length > 3 && (
                  <span className="text-xs text-gray-400">+{domain.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Finding counts */}
          {totalFindings > 0 ? (
            <div className="flex items-center gap-2">
              {criticalOrHigh > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                  {criticalOrHigh} critical/high
                </span>
              )}
              <span className="text-sm text-gray-500">{totalFindings} total findings</span>
            </div>
          ) : (
            <span className="text-sm text-green-600">No findings</span>
          )}

          {/* Arrow */}
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function ZoneManagementBadge({ type }: { type: Domain['zoneManagement'] }) {
  const styles = {
    managed: 'bg-green-100 text-green-800',
    unmanaged: 'bg-yellow-100 text-yellow-800',
    unknown: 'bg-gray-100 text-gray-600',
  };

  const labels = {
    managed: 'Managed',
    unmanaged: 'Unmanaged',
    unknown: 'Unknown',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
