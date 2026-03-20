/**
 * Portfolio Route - dns-ops-1j4.10.1, dns-ops-1j4.10.2
 *
 * Main entry point for the domain portfolio view.
 * Lists all monitored domains with their status and provides search/filter capabilities.
 *
 * Filters:
 * - Text search by domain name
 * - Tags (multi-select)
 * - Severity levels (critical, high, medium, low, info)
 * - Zone management (managed, unmanaged, unknown)
 */

import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type ZoneManagement = 'managed' | 'unmanaged' | 'unknown';

const SEVERITY_OPTIONS: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const ZONE_MANAGEMENT_OPTIONS: ZoneManagement[] = ['managed', 'unmanaged', 'unknown'];

interface Domain {
  id: string;
  name: string;
  zoneManagement: ZoneManagement;
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

interface TagsResponse {
  tags: string[];
}

interface SearchFilters {
  query: string;
  tags: string[];
  severities: Severity[];
  zoneManagement: ZoneManagement[];
}

export const Route = createFileRoute('/portfolio')({
  component: PortfolioComponent,
});

function PortfolioComponent() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tags: [],
    severities: [],
    zoneManagement: [],
  });
  const [debouncedFilters, setDebouncedFilters] = useState<SearchFilters>(filters);

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  // Fetch available tags on mount
  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch('/api/portfolio/tags');
        if (response.ok) {
          const data: TagsResponse = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch {
        // Silently fail - tags are optional
      }
    }
    fetchTags();
  }, []);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedFilters.query) {
        params.set('query', debouncedFilters.query);
      }
      if (debouncedFilters.tags.length > 0) {
        params.set('tags', debouncedFilters.tags.join(','));
      }
      if (debouncedFilters.severities.length > 0) {
        params.set('severities', debouncedFilters.severities.join(','));
      }
      if (debouncedFilters.zoneManagement.length > 0) {
        params.set('zoneManagement', debouncedFilters.zoneManagement.join(','));
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
  }, [debouncedFilters]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const activeFilterCount =
    filters.tags.length + filters.severities.length + filters.zoneManagement.length;

  const clearFilters = () => {
    setFilters({
      query: filters.query,
      tags: [],
      severities: [],
      zoneManagement: [],
    });
  };

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const toggleSeverity = (severity: Severity) => {
    setFilters((prev) => ({
      ...prev,
      severities: prev.severities.includes(severity)
        ? prev.severities.filter((s) => s !== severity)
        : [...prev.severities, severity],
    }));
  };

  const toggleZoneManagement = (zone: ZoneManagement) => {
    setFilters((prev) => ({
      ...prev,
      zoneManagement: prev.zoneManagement.includes(zone)
        ? prev.zoneManagement.filter((z) => z !== zone)
        : [...prev.zoneManagement, zone],
    }));
  };

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

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        {/* Search bar */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              Search domains
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search domains by name..."
              value={filters.query}
              onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
              showFilters || activeFilterCount > 0
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={fetchDomains}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {/* Filter panels */}
        {showFilters && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            {/* Active filters summary */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-500">Active filters:</span>
                  {filters.tags.map((tag) => (
                    <FilterChip key={`tag-${tag}`} label={tag} onRemove={() => toggleTag(tag)} />
                  ))}
                  {filters.severities.map((sev) => (
                    <FilterChip
                      key={`sev-${sev}`}
                      label={sev}
                      variant="severity"
                      onRemove={() => toggleSeverity(sev)}
                    />
                  ))}
                  {filters.zoneManagement.map((zone) => (
                    <FilterChip
                      key={`zone-${zone}`}
                      label={zone}
                      variant="zone"
                      onRemove={() => toggleZoneManagement(zone)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tags filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.length === 0 ? (
                    <span className="text-sm text-gray-400">No tags available</span>
                  ) : (
                    availableTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          filters.tags.includes(tag)
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {tag}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Severity filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Finding Severity
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEVERITY_OPTIONS.map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => toggleSeverity(sev)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        filters.severities.includes(sev)
                          ? getSeverityActiveStyle(sev)
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone management filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone Management
                </label>
                <div className="flex flex-wrap gap-2">
                  {ZONE_MANAGEMENT_OPTIONS.map((zone) => (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => toggleZoneManagement(zone)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        filters.zoneManagement.includes(zone)
                          ? getZoneActiveStyle(zone)
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
            {debouncedFilters.query || activeFilterCount > 0
              ? 'No domains found matching your filters'
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

// =============================================================================
// Filter Components
// =============================================================================

function FilterChip({
  label,
  variant = 'tag',
  onRemove,
}: {
  label: string;
  variant?: 'tag' | 'severity' | 'zone';
  onRemove: () => void;
}) {
  const styles = {
    tag: 'bg-blue-100 text-blue-800',
    severity: 'bg-orange-100 text-orange-800',
    zone: 'bg-purple-100 text-purple-800',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm ${styles[variant]}`}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-black/10 rounded-full p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </span>
  );
}

function getSeverityActiveStyle(severity: Severity): string {
  const styles: Record<Severity, string> = {
    critical: 'bg-red-100 border-red-300 text-red-800',
    high: 'bg-orange-100 border-orange-300 text-orange-800',
    medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    low: 'bg-blue-100 border-blue-300 text-blue-800',
    info: 'bg-gray-100 border-gray-300 text-gray-800',
  };
  return styles[severity];
}

function getZoneActiveStyle(zone: ZoneManagement): string {
  const styles: Record<ZoneManagement, string> = {
    managed: 'bg-green-100 border-green-300 text-green-800',
    unmanaged: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    unknown: 'bg-gray-100 border-gray-300 text-gray-800',
  };
  return styles[zone];
}
