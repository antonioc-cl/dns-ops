/**
 * Mail Findings Panel Component
 *
 * Displays mail-specific findings (SPF, DMARC, DKIM, etc.) from the rules engine.
 * Includes security score and mail configuration summary.
 */

import type { Finding, Suggestion } from '@dns-ops/db/schema';
import { useEffect, useState } from 'react';

interface MailFindingsPanelProps {
  snapshotId: string | null;
}

interface MailConfig {
  hasMx: boolean;
  hasSpf: boolean;
  hasDmarc: boolean;
  hasDkim: boolean;
  hasMtaSts: boolean;
  hasTlsRpt: boolean;
  securityScore: number;
  issues: string[];
  recommendations: string[];
}

interface MailFindingsData {
  snapshotId: string;
  domain: string;
  rulesetVersion: string;
  persisted: boolean;
  mailConfig: MailConfig;
  findings: Finding[];
  suggestions: Suggestion[];
}

export function MailFindingsPanel({ snapshotId }: MailFindingsPanelProps) {
  const [data, setData] = useState<MailFindingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshotId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/snapshot/${snapshotId}/findings/mail`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch mail findings');
        return res.json();
      })
      .then((payload) => {
        setData(payload as MailFindingsData);
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
        No snapshot available. Collect data to analyze mail configuration.
      </div>
    );
  }

  if (loading) {
    return (
      <output className="block py-4 text-gray-500" aria-live="polite" aria-busy="true">
        <div className="motion-safe:animate-pulse">Analyzing mail configuration...</div>
      </output>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-red-600" role="alert">
        Error loading mail findings: {error}
      </div>
    );
  }

  if (!data) return null;

  const { mailConfig, findings, suggestions } = data;
  const findingsBySeverity = groupBySeverity(findings);

  return (
    <div className="space-y-6">
      {/* Security Score */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">Mail Security Score</h4>
            <p className="text-sm text-gray-600 mt-1">
              Based on SPF, DMARC, DKIM, MTA-STS, and TLS-RPT configuration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ScoreCircle score={mailConfig.securityScore} />
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <ConfigStatusCard name="MX" present={mailConfig.hasMx} />
        <ConfigStatusCard name="SPF" present={mailConfig.hasSpf} />
        <ConfigStatusCard name="DMARC" present={mailConfig.hasDmarc} />
        <ConfigStatusCard name="DKIM" present={mailConfig.hasDkim} />
        <ConfigStatusCard name="MTA-STS" present={mailConfig.hasMtaSts} optional />
        <ConfigStatusCard name="TLS-RPT" present={mailConfig.hasTlsRpt} optional />
      </div>

      {/* Issues and Recommendations */}
      {(mailConfig.issues.length > 0 || mailConfig.recommendations.length > 0) && (
        <div className="space-y-3">
          {mailConfig.issues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h5 className="text-sm font-medium text-red-800 mb-2">Issues</h5>
              <ul className="space-y-1">
                {mailConfig.issues.map((issue, i) => (
                  <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">×</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mailConfig.recommendations.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h5 className="text-sm font-medium text-amber-800 mb-2">Recommendations</h5>
              <ul className="space-y-1">
                {mailConfig.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Detailed Findings */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Mail Findings</h4>
          {findings.length > 0 && (
            <span className="text-sm text-gray-500">
              {findings.length} finding{findings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {findings.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              ✓ No mail configuration issues detected.
            </p>
          </div>
        )}

        {(['critical', 'high', 'medium', 'low', 'info'] as const).map((severity) => {
          const severityFindings = findingsBySeverity[severity];
          if (!severityFindings || severityFindings.length === 0) return null;

          return (
            <div key={severity} className="space-y-2 mb-4">
              <h5 className="text-sm font-medium text-gray-700 capitalize">
                {severity} ({severityFindings.length})
              </h5>
              {severityFindings.map((finding) => (
                <MailFindingCard
                  key={finding.id}
                  finding={finding}
                  suggestions={suggestions.filter((s) => s.findingId === finding.id)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-400 pt-2 border-t">
        Ruleset v{data.rulesetVersion} · {data.persisted ? 'Persisted' : 'Live'} evaluation
      </div>
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'text-green-600 border-green-500';
    if (score >= 60) return 'text-yellow-600 border-yellow-500';
    if (score >= 40) return 'text-orange-600 border-orange-500';
    return 'text-red-600 border-red-500';
  };

  return (
    <div
      className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${getColor()}`}
    >
      <span className="text-xl font-bold">{score}</span>
    </div>
  );
}

function ConfigStatusCard({
  name,
  present,
  optional = false,
}: {
  name: string;
  present: boolean;
  optional?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg border ${
        present
          ? 'bg-green-50 border-green-200'
          : optional
            ? 'bg-gray-50 border-gray-200'
            : 'bg-red-50 border-red-200'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
          present
            ? 'bg-green-500 text-white'
            : optional
              ? 'bg-gray-300 text-gray-600'
              : 'bg-red-500 text-white'
        }`}
      >
        {present ? '✓' : optional ? '−' : '×'}
      </span>
      <span className={`text-sm font-medium ${present ? 'text-green-800' : 'text-gray-700'}`}>
        {name}
      </span>
    </div>
  );
}

function MailFindingCard({
  finding,
  suggestions,
}: {
  finding: Finding;
  suggestions: Suggestion[];
}) {
  const [expanded, setExpanded] = useState(false);

  const severityColors: Record<string, string> = {
    critical: 'bg-red-600',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
    info: 'bg-gray-400',
  };

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
        className="focus-ring w-full px-4 py-3 text-left hover:bg-black/5 transition-colors duration-150"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
              severityColors[finding.severity] || 'bg-gray-400'
            }`}
            aria-hidden="true"
          />
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
              {suggestions.length > 0 && <span>{suggestions.length} suggestion(s)</span>}
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-150 ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200/50 bg-white">
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
                <div
                  key={suggestion.id}
                  className={`p-3 rounded-lg ${
                    suggestion.reviewOnly
                      ? 'bg-amber-100/50 border border-amber-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <h6 className="font-medium text-gray-900">{suggestion.title}</h6>
                  <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                  <div className="mt-2 p-2 bg-white/50 rounded text-sm font-mono text-gray-700 whitespace-pre-wrap">
                    {suggestion.action}
                  </div>
                </div>
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
