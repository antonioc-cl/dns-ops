/**
 * Fleet Reports Panel - dns-ops-1j4.12.8
 *
 * UI for running fleet reports against domain inventories.
 * Allows operators to check SPF, DMARC, MX, and infrastructure across many domains.
 */

import { useCallback, useId, useState } from 'react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  checks: string[];
}

interface CheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warning' | 'missing';
  severity: 'ok' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, unknown>;
}

interface FleetReportResult {
  domain: string;
  snapshotId: string;
  collectedAt: string;
  rulesetVersion: string | null;
  findingsCount: number;
  checks: CheckResult[];
  issues: CheckResult[];
}

interface FleetReportResponse {
  reportGeneratedAt: string;
  domainsChecked: number;
  domainsWithErrors: number;
  backedByPersistedFindings: boolean;
  summary: {
    totalDomains: number;
    domainsWithIssues: number;
    [key: string]: unknown;
  };
  results?: FleetReportResult[];
  highPriorityIssues?: CheckResult[];
  errors?: Array<{ domain: string; error: string }>;
}

// TemplatesResponse type for future API integration
// interface TemplatesResponse {
//   templates: ReportTemplate[];
// }

const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'mail-security-baseline',
    name: 'Mail Security Baseline',
    description: 'Check SPF, DMARC, DKIM across inventory',
    checks: ['spf', 'dmarc', 'dkim', 'mx'],
  },
  {
    id: 'infrastructure-audit',
    name: 'Infrastructure Audit',
    description: 'Identify stale IPs and infrastructure issues',
    checks: ['infrastructure', 'delegation'],
  },
  {
    id: 'full-check',
    name: 'Full Check',
    description: 'Complete check of all aspects',
    checks: ['spf', 'dmarc', 'dkim', 'mx', 'infrastructure', 'delegation'],
  },
];

export function FleetReportsPanel() {
  const inventoryFieldId = useId();
  const [templates] = useState<ReportTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [inventoryInput, setInventoryInput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [report, setReport] = useState<FleetReportResponse | null>(null);
  const [showResultDetails, setShowResultDetails] = useState(false);

  const parseInventory = (input: string): string[] => {
    return input
      .split(/[\n,]/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d?.includes('.'));
  };

  const handleCsvUpload = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const response = await fetch('/api/fleet-report/import-csv', {
        method: 'POST',
        body: text,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAuthRequired(true);
          throw new Error('Operator sign-in is required to import fleet report inventories.');
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to import fleet report inventories.');
        }
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || 'Failed to parse CSV');
      }

      setAuthRequired(false);

      const data = (await response.json()) as { inventory: string[] };
      setInventoryInput(data.inventory.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV');
    }
  }, []);

  const handleRunReport = async () => {
    const inventory = parseInventory(inventoryInput);

    if (inventory.length === 0) {
      setError('Please enter at least one domain');
      return;
    }

    if (!selectedTemplate) {
      setError('Please select a report template');
      return;
    }

    setRunning(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory,
          checks: selectedTemplate.checks,
          format: 'detailed',
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAuthRequired(true);
          throw new Error('Operator sign-in is required to run fleet reports.');
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to run fleet reports.');
        }
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || 'Failed to run report');
      }

      setAuthRequired(false);

      const data = (await response.json()) as FleetReportResponse;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Fleet Reports</h3>
        <p className="text-sm text-gray-500">Run bulk checks across your domain inventory</p>
      </div>

      <div className="p-4 space-y-4">
        {authRequired && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Operator sign-in is required to import inventory or run tenant fleet reports.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
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

        {/* Template Selection */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Report Template</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplate(template)}
                className={`p-3 text-left rounded-lg border-2 transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{template.name}</div>
                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.checks.map((check) => (
                    <span
                      key={check}
                      className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600 uppercase"
                    >
                      {check}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Input */}
        <div>
          <label
            htmlFor={inventoryFieldId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Domain Inventory
          </label>
          <textarea
            id={inventoryFieldId}
            value={inventoryInput}
            onChange={(e) => setInventoryInput(e.target.value)}
            rows={6}
            placeholder="Enter domain names, one per line or comma-separated:
example.com
example.org, example.net"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
          <div className="mt-2 flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {parseInventory(inventoryInput).length} domains
            </span>
            <label className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                disabled={authRequired}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvUpload(file);
                }}
              />
              Import from CSV
            </label>
          </div>
        </div>

        {/* Run Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRunReport}
            disabled={
              authRequired ||
              running ||
              !selectedTemplate ||
              parseInventory(inventoryInput).length === 0
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? 'Running Report...' : 'Run Report'}
          </button>
        </div>

        {/* Report Results */}
        {report && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Report Results</h4>
              <span className="text-sm text-gray-500">
                Generated {new Date(report.reportGeneratedAt).toLocaleString()}
              </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard label="Domains Checked" value={report.domainsChecked} color="blue" />
              <SummaryCard
                label="With Issues"
                value={report.summary.domainsWithIssues}
                color={report.summary.domainsWithIssues > 0 ? 'yellow' : 'green'}
              />
              <SummaryCard
                label="High Priority"
                value={report.highPriorityIssues?.length || 0}
                color={report.highPriorityIssues?.length ? 'red' : 'green'}
              />
              <SummaryCard
                label="Errors"
                value={report.domainsWithErrors}
                color={report.domainsWithErrors > 0 ? 'orange' : 'green'}
              />
            </div>

            {/* High Priority Issues */}
            {report.highPriorityIssues && report.highPriorityIssues.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="font-medium text-red-900 mb-2">High Priority Issues</h5>
                <div className="space-y-2">
                  {report.highPriorityIssues.slice(0, 10).map((issue) => (
                    <div key={`${issue.severity}-${issue.message}`} className="text-sm">
                      <span
                        className={`inline-block w-16 px-1.5 py-0.5 rounded text-xs text-center font-medium ${
                          issue.severity === 'critical'
                            ? 'bg-red-600 text-white'
                            : 'bg-orange-500 text-white'
                        }`}
                      >
                        {issue.severity}
                      </span>
                      <span className="ml-2 text-gray-700">{issue.message}</span>
                    </div>
                  ))}
                  {report.highPriorityIssues.length > 10 && (
                    <p className="text-xs text-red-700">
                      ...and {report.highPriorityIssues.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Results Toggle */}
            {report.results && report.results.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowResultDetails(!showResultDetails)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showResultDetails ? 'Hide Details' : 'Show Domain Details'}
                </button>

                {showResultDetails && (
                  <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
                    {report.results.map((result) => (
                      <DomainResultCard key={result.domain} result={result} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Errors */}
            {report.errors && report.errors.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h5 className="font-medium text-orange-900 mb-2">Errors</h5>
                <div className="space-y-1 text-sm text-orange-800">
                  {report.errors.slice(0, 10).map((err) => (
                    <div key={`${err.domain}-${err.error}`}>
                      <span className="font-mono">{err.domain}</span>: {err.error}
                    </div>
                  ))}
                  {report.errors.length > 10 && (
                    <p className="text-xs">...and {report.errors.length - 10} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-900',
    green: 'bg-green-50 text-green-900',
    yellow: 'bg-yellow-50 text-yellow-900',
    red: 'bg-red-50 text-red-900',
    orange: 'bg-orange-50 text-orange-900',
  };

  return (
    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

function DomainResultCard({ result }: { result: FleetReportResult }) {
  const [expanded, setExpanded] = useState(false);
  const hasIssues = result.issues.length > 0;

  return (
    <div
      className={`p-3 rounded-lg border ${
        hasIssues ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-gray-900">{result.domain}</span>
          <span className="ml-2 text-xs text-gray-500">{result.findingsCount} findings</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {expanded ? 'Hide' : 'Show'} checks
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1">
          {result.checks.map((check) => (
            <div
              key={`${check.check}-${check.status}-${check.message}`}
              className="flex items-center gap-2 text-sm"
            >
              <StatusBadge status={check.status} />
              <span className="uppercase text-xs font-medium text-gray-600 w-20">
                {check.check}
              </span>
              <span className="text-gray-700">{check.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: CheckResult['status'] }) {
  const styles = {
    pass: 'bg-green-100 text-green-700',
    fail: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    missing: 'bg-gray-100 text-gray-600',
  };

  const icons = {
    pass: '✓',
    fail: '✗',
    warning: '!',
    missing: '?',
  };

  return (
    <span
      className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${styles[status]}`}
    >
      {icons[status]}
    </span>
  );
}
