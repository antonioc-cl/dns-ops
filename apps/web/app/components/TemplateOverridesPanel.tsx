/**
 * Template Overrides Panel - dns-ops-1j4.10.6
 *
 * UI for managing template overrides.
 * Allows operators to customize provider templates per tenant.
 */

import { useCallback, useEffect, useState } from 'react';

interface TemplateOverride {
  id: string;
  providerKey: string;
  templateKey: string;
  overrideData: Record<string, unknown>;
  appliesToDomains: string[] | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Known provider keys for display
const PROVIDER_LABELS: Record<string, string> = {
  gmail: 'Gmail / Google Workspace',
  outlook: 'Outlook / Microsoft 365',
  yahoo: 'Yahoo Mail',
  protonmail: 'ProtonMail',
  fastmail: 'Fastmail',
  custom: 'Custom Provider',
};

export function TemplateOverridesPanel() {
  const [overrides, setOverrides] = useState<TemplateOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [editingOverride, setEditingOverride] = useState<TemplateOverride | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchOverrides = useCallback(async () => {
    if (!selectedProvider) {
      setOverrides([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/portfolio/templates/overrides?provider=${encodeURIComponent(selectedProvider)}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch overrides');
      }
      const data = (await response.json()) as { overrides: TemplateOverride[] };
      setOverrides(data.overrides || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overrides');
    } finally {
      setLoading(false);
    }
  }, [selectedProvider]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm('Are you sure you want to delete this override?')) return;

    try {
      const response = await fetch(`/api/portfolio/templates/overrides/${overrideId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete override');
      }

      await fetchOverrides();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete override');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Template Overrides</h3>
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + New Override
        </button>
      </div>

      <div className="p-4">
        {/* Provider selector */}
        <div className="mb-4">
          <label htmlFor="provider-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Provider
          </label>
          <select
            id="provider-select"
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a provider...</option>
            {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

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

        {/* Create/Edit dialog */}
        {(showCreateDialog || editingOverride) && (
          <OverrideDialog
            editingOverride={editingOverride}
            defaultProvider={selectedProvider}
            onClose={() => {
              setShowCreateDialog(false);
              setEditingOverride(null);
            }}
            onSave={async () => {
              await fetchOverrides();
              setShowCreateDialog(false);
              setEditingOverride(null);
            }}
          />
        )}

        {/* Content */}
        {!selectedProvider ? (
          <div className="text-center text-gray-500 py-8">
            Select a provider to view and manage template overrides
          </div>
        ) : loading ? (
          <div className="text-center text-gray-500 py-8">Loading overrides...</div>
        ) : overrides.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No overrides for {PROVIDER_LABELS[selectedProvider] || selectedProvider}.{' '}
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="text-blue-600 hover:text-blue-700"
            >
              Create one
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {overrides.map((override) => (
              <OverrideCard
                key={override.id}
                override={override}
                onEdit={() => setEditingOverride(override)}
                onDelete={() => handleDeleteOverride(override.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Override Card
// =============================================================================

interface OverrideCardProps {
  override: TemplateOverride;
  onEdit: () => void;
  onDelete: () => void;
}

function OverrideCard({ override, onEdit, onDelete }: OverrideCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-900">{override.templateKey}</span>
            {override.appliesToDomains && override.appliesToDomains.length > 0 && (
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                {override.appliesToDomains.length} domain
                {override.appliesToDomains.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Created by {override.createdBy} on{' '}
            {new Date(override.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Edit"
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
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete"
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

      {expanded && (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Override Data:</p>
          <pre className="bg-white p-2 rounded border border-gray-200 text-xs text-gray-700 overflow-x-auto">
            {JSON.stringify(override.overrideData, null, 2)}
          </pre>
          {override.appliesToDomains && override.appliesToDomains.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Applies to:</p>
              <div className="flex flex-wrap gap-1">
                {override.appliesToDomains.map((domain) => (
                  <span
                    key={domain}
                    className="px-2 py-0.5 bg-white rounded border border-gray-200 text-xs text-gray-600"
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Override Dialog
// =============================================================================

interface OverrideDialogProps {
  editingOverride: TemplateOverride | null;
  defaultProvider: string;
  onClose: () => void;
  onSave: () => Promise<void>;
}

function OverrideDialog({
  editingOverride,
  defaultProvider,
  onClose,
  onSave,
}: OverrideDialogProps) {
  const [providerKey, setProviderKey] = useState(editingOverride?.providerKey || defaultProvider);
  const [templateKey, setTemplateKey] = useState(editingOverride?.templateKey || '');
  const [overrideDataJson, setOverrideDataJson] = useState(
    editingOverride ? JSON.stringify(editingOverride.overrideData, null, 2) : '{}'
  );
  const [appliesToDomains, setAppliesToDomains] = useState(
    editingOverride?.appliesToDomains?.join(', ') || ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!providerKey.trim() || !templateKey.trim()) {
      setError('Provider and template key are required');
      return;
    }

    let parsedOverrideData: Record<string, unknown>;
    try {
      parsedOverrideData = JSON.parse(overrideDataJson);
      if (typeof parsedOverrideData !== 'object' || parsedOverrideData === null) {
        throw new Error('Must be an object');
      }
    } catch {
      setError('Override data must be valid JSON object');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body = {
        providerKey: providerKey.trim(),
        templateKey: templateKey.trim(),
        overrideData: parsedOverrideData,
        appliesToDomains: appliesToDomains
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean),
      };

      const url = editingOverride
        ? `/api/portfolio/templates/overrides/${editingOverride.id}`
        : '/api/portfolio/templates/overrides';

      const response = await fetch(url, {
        method: editingOverride ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || 'Failed to save override');
      }

      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save override');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <form onSubmit={handleSubmit}>
        <h4 className="font-medium text-gray-900 mb-3">
          {editingOverride ? 'Edit Override' : 'New Override'}
        </h4>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="override-provider" className="block text-sm font-medium text-gray-700 mb-1">
                Provider Key <span className="text-red-500">*</span>
              </label>
              <select
                id="override-provider"
                value={providerKey}
                onChange={(e) => setProviderKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!!editingOverride}
              >
                <option value="">Select...</option>
                {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="override-template" className="block text-sm font-medium text-gray-700 mb-1">
                Template Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="override-template"
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                placeholder="e.g., dkim_record"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!!editingOverride}
              />
            </div>
          </div>

          <div>
            <label htmlFor="override-data" className="block text-sm font-medium text-gray-700 mb-1">
              Override Data (JSON) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="override-data"
              value={overrideDataJson}
              onChange={(e) => setOverrideDataJson(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder='{"key": "value"}'
            />
          </div>

          <div>
            <label htmlFor="override-domains" className="block text-sm font-medium text-gray-700 mb-1">
              Applies to Domains (comma-separated, leave empty for all)
            </label>
            <input
              type="text"
              id="override-domains"
              value={appliesToDomains}
              onChange={(e) => setAppliesToDomains(e.target.value)}
              placeholder="example.com, test.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
            disabled={saving || !providerKey.trim() || !templateKey.trim()}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : editingOverride ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
