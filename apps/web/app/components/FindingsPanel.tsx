/**
 * Findings Panel Component
 *
 * Displays rule-based findings and suggestions on the Domain 360 Overview tab.
 */

import { useState, useEffect } from 'react';
import type { Finding, Suggestion } from '@dns-ops/db/schema';

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
      .then((data) => {
        setData(data as FindingsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [snapshotId]);

  if (!snapshotId) {
    return (
      <div className="text-sm text-gray-500 py-4">
        No snapshot available. Collect data to generate findings.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-4 text-gray-500" role="status" aria-live="polite" aria-busy="true">
        <div className="motion-safe:animate-pulse">Analyzing DNS data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-red-600" role="alert">
        Error loading findings: {error}
      </div>
    );
  }

  if (!data) return null;

  const findingsBySeverity = groupBySeverity(data.findings);

  return (
    <div className="space-y-4">
      {/* Findings Header */}
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

      {/* No Findings State */}
      {data.findings.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 text-sm">
            ✓ No issues detected. DNS configuration appears healthy.
          </p>
        </div>
      )}

      {/* Findings by Severity */}
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
                suggestions={data.suggestions.filter(
                  (s) => s.findingId === finding.id
                )}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function FindingCard({
  finding,
  suggestions,
}: {
  finding: Finding;
  suggestions: Suggestion[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        finding.reviewOnly ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
      }`}
    >
      <button
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
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {finding.description}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="capitalize">{finding.confidence} confidence</span>
              <span className="capitalize">{finding.blastRadius.replace(/-/g, ' ')}</span>
              {suggestions.length > 0 && (
                <span>{suggestions.length} suggestion(s)</span>
              )}
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-150 motion-reduce:transition-none ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div id={`finding-details-${finding.id}`} className="px-4 pb-4 border-t border-gray-200/50 bg-white">
          {/* Evidence Links */}
          {finding.evidence && finding.evidence.length > 0 && (
            <div className="mt-3">
              <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Evidence
              </h6>
              <ul className="space-y-1">
                {finding.evidence.map((ev, idx) => (
                  <li key={idx} className="text-sm text-gray-600">
                    • {ev.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-4 space-y-3">
              <h6 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Suggestions
              </h6>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`p-3 rounded-lg ${
                    suggestion.reviewOnly
                      ? 'bg-amber-100/50 border border-amber-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <h6 className="font-medium text-gray-900">
                    {suggestion.title}
                  </h6>
                  <p className="text-sm text-gray-600 mt-1">
                    {suggestion.description}
                  </p>
                  <div className="mt-2 p-2 bg-white/50 rounded text-sm font-mono text-gray-700">
                    {suggestion.action}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rule Info */}
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
    critical: 'text-red-600',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
    info: 'text-gray-400',
  };

  return (
    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${colors[severity] || 'text-gray-400'}`}>
      <svg viewBox="0 0 8 8" fill="currentColor">
        <circle cx="4" cy="4" r="4" />
      </svg>
    </div>
  );
}

function SeverityBadge({
  count,
  severity,
}: {
  count: number;
  severity: string;
}) {
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
  return findings.reduce((acc, finding) => {
    const sev = finding.severity;
    if (!acc[sev]) acc[sev] = [];
    acc[sev].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);
}
