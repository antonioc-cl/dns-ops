/**
 * Saved Filters Panel - dns-ops-1j4.10.5
 *
 * UI for managing saved portfolio filters.
 * Allows saving, loading, updating, deleting, and sharing filters.
 */

import { useCallback, useEffect, useState } from 'react';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type ZoneManagement = 'managed' | 'unmanaged' | 'unknown';

interface FilterCriteria {
  domainPatterns?: string[];
  zoneManagement?: ZoneManagement[];
  findings?: {
    types?: string[];
    severities?: Severity[];
    minConfidence?: 'certain' | 'high' | 'medium' | 'low' | 'heuristic';
  };
  tags?: string[];
  lastSnapshotWithin?: number;
}

interface SavedFilter {
  id: string;
  name: string;
  description: string | null;
  criteria: FilterCriteria;
  isShared: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentFilters {
  query: string;
  tags: string[];
  severities: Severity[];
  zoneManagement: ZoneManagement[];
}

interface SavedFiltersPanelProps {
  /** Current filter state from the portfolio */
  currentFilters: CurrentFilters;
  /** Callback when a saved filter is loaded */
  onLoadFilter: (filters: CurrentFilters) => void;
  /** Callback when filters are saved (for notification) */
  onSaveComplete?: () => void;
}

export function SavedFiltersPanel({
  currentFilters,
  onLoadFilter,
  onSaveComplete,
}: SavedFiltersPanelProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  const fetchFilters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portfolio/filters');
      if (!response.ok) {
        throw new Error('Failed to fetch filters');
      }
      const data = (await response.json()) as { filters: SavedFilter[] };
      setSavedFilters(data.filters || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const handleLoadFilter = (filter: SavedFilter) => {
    setActiveFilterId(filter.id);
    const loaded: CurrentFilters = {
      query:
        filter.criteria.domainPatterns?.length === 1 ? filter.criteria.domainPatterns[0] : '',
      tags: filter.criteria.tags || [],
      severities: filter.criteria.findings?.severities || [],
      zoneManagement: filter.criteria.zoneManagement || [],
    };
    onLoadFilter(loaded);
  };

  const handleDeleteFilter = async (filterId: string) => {
    if (!confirm('Are you sure you want to delete this filter?')) return;

    try {
      const response = await fetch(`/api/portfolio/filters/${filterId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete filter');
      }

      if (activeFilterId === filterId) {
        setActiveFilterId(null);
      }
      await fetchFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete filter');
    }
  };

  const handleToggleShare = async (filter: SavedFilter) => {
    try {
      const response = await fetch(`/api/portfolio/filters/${filter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isShared: !filter.isShared }),
      });

      if (!response.ok) {
        throw new Error('Failed to update filter');
      }

      await fetchFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update filter');
    }
  };

  const hasActiveFilters =
    currentFilters.tags.length > 0 ||
    currentFilters.severities.length > 0 ||
    currentFilters.zoneManagement.length > 0 ||
    currentFilters.query.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Saved Filters</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => setShowSaveDialog(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Save Current
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Save/Edit dialog */}
        {(showSaveDialog || editingFilter) && (
          <SaveFilterDialog
            currentFilters={currentFilters}
            editingFilter={editingFilter}
            onClose={() => {
              setShowSaveDialog(false);
              setEditingFilter(null);
            }}
            onSave={async () => {
              await fetchFilters();
              setShowSaveDialog(false);
              setEditingFilter(null);
              onSaveComplete?.();
            }}
          />
        )}

        {/* Loading state */}
        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading saved filters...</div>
        ) : savedFilters.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No saved filters yet.
            {hasActiveFilters && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(true)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Save current filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {savedFilters.map((filter) => (
              <SavedFilterCard
                key={filter.id}
                filter={filter}
                isActive={activeFilterId === filter.id}
                onLoad={() => handleLoadFilter(filter)}
                onEdit={() => setEditingFilter(filter)}
                onDelete={() => handleDeleteFilter(filter.id)}
                onToggleShare={() => handleToggleShare(filter)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Saved Filter Card
// =============================================================================

interface SavedFilterCardProps {
  filter: SavedFilter;
  isActive: boolean;
  onLoad: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleShare: () => void;
}

function SavedFilterCard({
  filter,
  isActive,
  onLoad,
  onEdit,
  onDelete,
  onToggleShare,
}: SavedFilterCardProps) {
  const criteriaCount = getCriteriaCount(filter.criteria);

  return (
    <div
      className={`p-3 rounded-lg border ${
        isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{filter.name}</span>
            {filter.isShared && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                Shared
              </span>
            )}
            {isActive && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                Active
              </span>
            )}
          </div>
          {filter.description && (
            <p className="mt-1 text-sm text-gray-600 truncate">{filter.description}</p>
          )}
          <div className="mt-1 text-xs text-gray-500">
            {criteriaCount} filter{criteriaCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            onClick={onLoad}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Load filter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Edit filter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggleShare}
            className={`p-1.5 rounded ${
              filter.isShared
                ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title={filter.isShared ? 'Unshare filter' : 'Share filter'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete filter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Save Filter Dialog
// =============================================================================

interface SaveFilterDialogProps {
  currentFilters: CurrentFilters;
  editingFilter: SavedFilter | null;
  onClose: () => void;
  onSave: () => Promise<void>;
}

function SaveFilterDialog({
  currentFilters,
  editingFilter,
  onClose,
  onSave,
}: SaveFilterDialogProps) {
  const [name, setName] = useState(editingFilter?.name || '');
  const [description, setDescription] = useState(editingFilter?.description || '');
  const [isShared, setIsShared] = useState(editingFilter?.isShared || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const criteria: FilterCriteria = {};

      if (currentFilters.query) {
        criteria.domainPatterns = [currentFilters.query];
      }
      if (currentFilters.tags.length > 0) {
        criteria.tags = currentFilters.tags;
      }
      if (currentFilters.severities.length > 0) {
        criteria.findings = { severities: currentFilters.severities };
      }
      if (currentFilters.zoneManagement.length > 0) {
        criteria.zoneManagement = currentFilters.zoneManagement;
      }

      const body = {
        name: name.trim(),
        description: description.trim() || null,
        criteria,
        isShared,
      };

      const url = editingFilter
        ? `/api/portfolio/filters/${editingFilter.id}`
        : '/api/portfolio/filters';

      const response = await fetch(url, {
        method: editingFilter ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || 'Failed to save filter');
      }

      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save filter');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <form onSubmit={handleSubmit}>
        <h4 className="font-medium text-gray-900 mb-3">
          {editingFilter ? 'Edit Filter' : 'Save Filter'}
        </h4>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="filter-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="filter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Critical Issues"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="filter-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <input
              type="text"
              id="filter-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="filter-shared"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="filter-shared" className="text-sm text-gray-700">
              Share with team
            </label>
          </div>

          {/* Preview of what will be saved */}
          <div className="bg-white p-2 rounded border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">Filter criteria:</p>
            <div className="flex flex-wrap gap-1">
              {currentFilters.query && (
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                  Query: "{currentFilters.query}"
                </span>
              )}
              {currentFilters.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-blue-100 rounded text-xs text-blue-700"
                >
                  {tag}
                </span>
              ))}
              {currentFilters.severities.map((sev) => (
                <span
                  key={sev}
                  className="px-2 py-0.5 bg-orange-100 rounded text-xs text-orange-700"
                >
                  {sev}
                </span>
              ))}
              {currentFilters.zoneManagement.map((zone) => (
                <span
                  key={zone}
                  className="px-2 py-0.5 bg-purple-100 rounded text-xs text-purple-700"
                >
                  {zone}
                </span>
              ))}
              {!currentFilters.query &&
                currentFilters.tags.length === 0 &&
                currentFilters.severities.length === 0 &&
                currentFilters.zoneManagement.length === 0 && (
                  <span className="text-xs text-gray-400">No filters selected</span>
                )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingFilter ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getCriteriaCount(criteria: FilterCriteria): number {
  let count = 0;
  if (criteria.domainPatterns?.length) count += criteria.domainPatterns.length;
  if (criteria.zoneManagement?.length) count += criteria.zoneManagement.length;
  if (criteria.tags?.length) count += criteria.tags.length;
  if (criteria.findings?.severities?.length) count += criteria.findings.severities.length;
  if (criteria.findings?.types?.length) count += criteria.findings.types.length;
  if (criteria.lastSnapshotWithin) count += 1;
  return count;
}
