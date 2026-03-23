import { useCallback, useEffect, useId, useMemo, useState } from 'react';

interface SharedReport {
  id: string;
  title: string;
  visibility: 'private' | 'tenant' | 'shared';
  status: 'generating' | 'ready' | 'expired' | 'error';
  shareToken?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  summary: {
    totalMonitored: number;
    activeAlerts: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export function SharedReportsPanel() {
  const [reports, setReports] = useState<SharedReport[]>([]);
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [expiringId, setExpiringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const reportTitleId = useId();

  const origin = useMemo(() => (typeof window === 'undefined' ? '' : window.location.origin), []);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/alerts/reports');
      if (!response.ok) {
        if (response.status === 401) {
          setAuthRequired(true);
          setReports([]);
          return;
        }
        if (response.status === 403) {
          setReports([]);
          throw new Error('You do not have permission to view tenant shared reports.');
        }
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to load shared reports');
      }

      setAuthRequired(false);
      const body = (await response.json()) as { reports: SharedReport[] };
      setReports(body.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shared reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/alerts/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          visibility: 'shared',
          expiresInDays: 7,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAuthRequired(true);
          throw new Error('Operator sign-in is required to create shared reports.');
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to create shared reports.');
        }
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to create shared report');
      }

      setTitle('');
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shared report');
    } finally {
      setIsCreating(false);
    }
  };

  const handleExpire = async (reportId: string) => {
    setExpiringId(reportId);
    setError(null);

    try {
      const response = await fetch(`/api/alerts/reports/${reportId}/expire`, {
        method: 'POST',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAuthRequired(true);
          throw new Error('Operator sign-in is required to expire shared reports.');
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to expire this shared report.');
        }
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to expire shared report');
      }

      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to expire shared report');
    } finally {
      setExpiringId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Shared Reports</h3>
        <p className="text-sm text-gray-500">
          Create persisted, redacted reports for external stakeholders
        </p>
      </div>

      <div className="p-4 space-y-4">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {authRequired ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Operator sign-in is required to list or create tenant shared reports. Public share links
            continue to work without sign-in.
          </div>
        ) : null}

        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <div>
            <label htmlFor={reportTitleId} className="block text-sm font-medium text-gray-700">
              Report title
            </label>
            <input
              id={reportTitleId}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Weekly stakeholder report"
              disabled={authRequired}
              className="focus-ring mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isCreating || authRequired}
            className="focus-ring min-h-10 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isCreating ? 'Creating...' : 'Create Shared Report'}
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading reports...</p>
        ) : authRequired ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Sign in to list and create tenant shared reports.
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No shared reports yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const shareUrl = report.shareToken
                ? `${origin}/api/alerts/reports/shared/${report.shareToken}`
                : null;
              return (
                <div key={report.id} className="rounded-lg border border-gray-200 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{report.title}</h4>
                      <p className="text-xs text-gray-500">
                        {report.status} · {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {report.visibility}
                      </span>
                      {report.status !== 'expired' && !authRequired ? (
                        <button
                          type="button"
                          onClick={() => void handleExpire(report.id)}
                          disabled={expiringId === report.id}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:text-gray-400"
                        >
                          {expiringId === report.id ? 'Expiring...' : 'Expire'}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700">
                    {report.summary.activeAlerts} active alerts across{' '}
                    {report.summary.totalMonitored} monitored domains.
                  </p>

                  {shareUrl ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Share link
                      </p>
                      <a
                        className="text-sm text-blue-600 break-all hover:text-blue-700"
                        href={shareUrl}
                      >
                        {shareUrl}
                      </a>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
