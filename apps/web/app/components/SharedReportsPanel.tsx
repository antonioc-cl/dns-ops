/**
 * Shared Reports Panel - dns-ops-1j4.12.8
 *
 * UI for creating and managing shared reports.
 * Shared reports can be sent to clients or external stakeholders.
 */

import { useCallback, useEffect, useState } from 'react';

interface SharedReport {
  id: string;
  title: string;
  status: 'generating' | 'ready' | 'expired' | 'error';
  createdAt: string;
  expiresAt?: string;
  shareUrl?: string;
  domainCount?: number;
  generatedBy?: string;
}

interface ReportsResponse {
  reports: SharedReport[];
}

export function SharedReportsPanel() {
  const [reports, setReports] = useState<SharedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/alerts/reports');
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      const data = (await response.json()) as ReportsResponse;
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Shared Reports</h3>
          <p className="text-sm text-gray-500">Create reports to share with stakeholders</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create Report
        </button>
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

        {/* Create Dialog */}
        {showCreateDialog && (
          <CreateReportDialog
            onClose={() => setShowCreateDialog(false)}
            onCreated={async () => {
              await fetchReports();
              setShowCreateDialog(false);
            }}
          />
        )}

        {/* Reports List */}
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-500">No shared reports yet.</p>
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Create your first report
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} onRefresh={fetchReports} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Report Card
// =============================================================================

interface ReportCardProps {
  report: SharedReport;
  onRefresh: () => Promise<void>;
}

function ReportCard({ report }: ReportCardProps) {
  const [copied, setCopied] = useState(false);

  const statusColors = {
    generating: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-600',
    error: 'bg-red-100 text-red-700',
  };

  const handleCopyLink = async () => {
    if (report.shareUrl) {
      try {
        await navigator.clipboard.writeText(report.shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  };

  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{report.title}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[report.status]}`}>
              {report.status}
            </span>
          </div>

          <div className="mt-1 text-sm text-gray-500">
            Created {new Date(report.createdAt).toLocaleDateString()}
            {report.expiresAt && (
              <span className="ml-2">
                · Expires {new Date(report.expiresAt).toLocaleDateString()}
              </span>
            )}
            {report.domainCount !== undefined && (
              <span className="ml-2">· {report.domainCount} domains</span>
            )}
          </div>
        </div>

        {report.status === 'ready' && report.shareUrl && (
          <div className="flex items-center gap-2 ml-4">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href={report.shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Open
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Create Report Dialog
// =============================================================================

interface CreateReportDialogProps {
  onClose: () => void;
  onCreated: () => Promise<void>;
}

function CreateReportDialog({ onClose, onCreated }: CreateReportDialogProps) {
  const [title, setTitle] = useState('');
  const [domains, setDomains] = useState('');
  const [includeFindings, setIncludeFindings] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Report title is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const domainList = domains
        .split(/[\n,]/)
        .map((d) => d.trim())
        .filter(Boolean);

      const response = await fetch('/api/alerts/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          domains: domainList.length > 0 ? domainList : undefined,
          includeFindings,
          includeRecommendations,
          expiresInDays: parseInt(expiresInDays) || 30,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || 'Failed to create report');
      }

      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <form onSubmit={handleSubmit}>
        <h4 className="font-medium text-gray-900 mb-3">Create Shared Report</h4>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="report-title" className="block text-sm font-medium text-gray-700 mb-1">
              Report Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q1 2026 DNS Security Report"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="report-domains" className="block text-sm font-medium text-gray-700 mb-1">
              Domains (optional - leave empty for all)
            </label>
            <textarea
              id="report-domains"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              rows={3}
              placeholder="example.com, example.org"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeFindings}
                onChange={(e) => setIncludeFindings(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Include findings
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeRecommendations}
                onChange={(e) => setIncludeRecommendations(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Include recommendations
            </label>
          </div>

          <div>
            <label htmlFor="expires-in" className="block text-sm font-medium text-gray-700 mb-1">
              Link expires in
            </label>
            <select
              id="expires-in"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
