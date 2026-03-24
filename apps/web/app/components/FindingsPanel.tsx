/**
 * Findings Panel Component
 *
 * Displays rule-based findings and suggestions on the Domain 360 Overview tab.
 */

import type { Finding, Suggestion } from '@dns-ops/db/schema';
import { useEffect, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from './ui/StateDisplay.js';
import { ConfirmDialog } from './ui/ConfirmDialog.js';

interface FindingsPanelProps {
  snapshotId: string | null;
}

interface FindingsData {
  snapshotId: string;
  domain: string;
  rulesetVersion: string;
  rulesEvaluated: number;
  findings: Finding[];
  suggestions: Suggestion[];
}

export function FindingsPanel({ snapshotId }: FindingsPanelProps) {
  const [data, setData] = useState<FindingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshotId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/snapshot/${snapshotId}/findings`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch findings');
        return res.json();
      })
      .then((payload) => {
        setData(payload as FindingsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [snapshotId]);

  if (!snapshotId) {
    return (
      <EmptyState
        icon="shield"
        title="No snapshot available"
        description="Collect data to generate findings and recommendations."
        size="sm"
      />
    );
  }

  if (loading) {
    return <LoadingState message="Analyzing DNS data..." size="sm" />;
  }

  if (error) {
    return <ErrorState message={error} size="sm" />;
  }

  if (!data) return null;

  const findingsBySeverity = groupBySeverity(data.findings);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">DNS Findings</h3>
          <p className="text-sm text-gray-500">
            Ruleset v{data.rulesetVersion} · {data.rulesEvaluated} rules evaluated
          </p>
        </div>
        {data.findings.length > 0 && (
          <SeverityBadge count={data.findings.length} severity="total" />
        )}
      </div>

      {data.findings.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            ✓ No issues detected. DNS configuration appears healthy.
          </p>
        </div>
      )}

      {(['critical', 'high', 'medium', 'low', 'info'] as const).map((severity) => {
        const findings = findingsBySeverity[severity];
        if (!findings || findings.length === 0) return null;

        return (
          <div key={severity} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 capitalize">
              {severity} ({findings.length})
            </h4>
            {findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                domain={data.domain}
                suggestions={data.suggestions.filter((s) => s.findingId === finding.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function FindingCard({ finding, domain, suggestions }: { finding: Finding; domain: string; suggestions: Suggestion[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        finding.reviewOnly ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`finding-details-${finding.id}`}
        className="focus-ring w-full px-4 py-3 text-left hover:bg-black/5 transition-colors duration-150"
      >
        <div className="flex items-start gap-3">
          <SeverityIcon severity={finding.severity} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h5 className="font-medium text-gray-900">{finding.title}</h5>
              {finding.reviewOnly && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                  Review Required
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{finding.description}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="capitalize">{finding.confidence} confidence</span>
              <span className="capitalize">{finding.blastRadius.replace(/-/g, ' ')}</span>
              {suggestions.length > 0 && <span>{suggestions.length} suggestion(s)</span>}
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-150 motion-reduce:transition-none ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div
          id={`finding-details-${finding.id}`}
          className="px-4 pb-4 border-t border-gray-200/50 bg-white"
        >
          {finding.evidence && finding.evidence.length > 0 && (
            <div className="mt-3">
              <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Evidence
              </h6>
              <ul className="space-y-1">
                {finding.evidence.map((ev) => (
                  <li key={ev.description} className="text-sm text-gray-600">
                    • {ev.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="mt-4 space-y-3">
              <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Suggestions
              </h6>
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  domain={domain}
                />
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
            Rule: {finding.ruleId} · Version: {finding.ruleVersion}
          </div>
        </div>
      )}
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-600',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
    info: 'bg-gray-400',
  };

  return (
    <span
      className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${colors[severity] || 'bg-gray-400'}`}
      aria-hidden="true"
    />
  );
}

function SeverityBadge({ count, severity }: { count: number; severity: string }) {
  const styles: Record<string, string> = {
    total: 'bg-gray-100 text-gray-700',
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-blue-100 text-blue-700',
    info: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[severity] || styles.total
      }`}
    >
      {count} {severity === 'total' ? 'findings' : ''}
    </span>
  );
}

function groupBySeverity(findings: Finding[]): Record<string, Finding[]> {
  return findings.reduce(
    (acc, finding) => {
      const sev = finding.severity;
      if (!acc[sev]) acc[sev] = [];
      acc[sev].push(finding);
      return acc;
    },
    {} as Record<string, Finding[]>
  );
}

// =============================================================================
// Suggestion Card Component (PR-02.6.2)
// =============================================================================

interface SuggestionCardProps {
  suggestion: Suggestion;
  domain: string;
}

function SuggestionCard({ suggestion, domain }: SuggestionCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const isPending = !suggestion.appliedAt && !suggestion.dismissedAt;

  const handleApply = async () => {
    if (suggestion.reviewOnly && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsApplying(true);
    try {
      const response = await fetch(`/api/suggestions/${suggestion.id}/apply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmApply: suggestion.reviewOnly ? true : undefined }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string; code?: string };
        if (response.status === 403 && error.code === 'REQUIRES_CONFIRMATION') {
          // Shouldn't happen if UI is correct, but handle it
          console.warn('[FindingsPanel] Review-only suggestion applied without confirmation flag');
        }
        throw new Error(error.error || 'Failed to apply suggestion');
      }

      // Log warning for review-only applications
      if (suggestion.reviewOnly) {
        console.warn(
          `[FindingsPanel] Review-only suggestion applied for ${domain}:`,
          suggestion.id
        );
      }

      // Refresh page to show updated state
      window.location.reload();
    } catch (err) {
      console.error('Failed to apply suggestion:', err);
      setIsApplying(false);
      setShowConfirm(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      const response = await fetch(`/api/suggestions/${suggestion.id}/dismiss`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Dismissed by user' }),
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss suggestion');
      }

      // Refresh page to show updated state
      window.location.reload();
    } catch (err) {
      console.error('Failed to dismiss suggestion:', err);
      setIsDismissing(false);
    }
  };

  return (
    <>
      <div
        className={`p-3 rounded-lg ${
          suggestion.reviewOnly
            ? 'bg-amber-100/50 border border-amber-200'
            : 'bg-blue-50 border border-blue-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h6 className="font-medium text-gray-900">{suggestion.title}</h6>
              {suggestion.reviewOnly && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                  ⚠️ Review Required
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
            <div className="mt-2 p-2 bg-white/50 rounded text-sm font-mono text-gray-700">
              {suggestion.action}
            </div>
          </div>
        </div>

        {isPending && (
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-gray-200/50">
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || isDismissing}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isApplying ? 'Applying...' : 'Apply'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isApplying || isDismissing}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isDismissing ? 'Dismissing...' : 'Dismiss'}
            </button>
          </div>
        )}

        {suggestion.appliedAt && (
          <div className="mt-2 pt-2 border-t border-gray-200/50 text-xs text-green-600">
            ✓ Applied {suggestion.appliedBy ? `by ${suggestion.appliedBy}` : ''}
          </div>
        )}

        {suggestion.dismissedAt && (
          <div className="mt-2 pt-2 border-t border-gray-200/50 text-xs text-gray-500">
            Dismissed {suggestion.dismissedBy ? `by ${suggestion.dismissedBy}` : ''}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Review-Only Suggestions */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Apply Review-Only Suggestion?"
        message={
          <div className="space-y-3">
            <p>
              This suggestion is marked as <strong>review-required</strong> because it may have
              significant impact:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600">
              <li>Risk posture: {suggestion.riskPosture}</li>
              <li>Blast radius: {suggestion.blastRadius.replace(/-/g, ' ')}</li>
            </ul>
            <p className="text-amber-700 font-medium">
              This change may affect mail delivery for {domain}. Proceed with caution.
            </p>
          </div>
        }
        confirmLabel="Apply Anyway"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleApply}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
