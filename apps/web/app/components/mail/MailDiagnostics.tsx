import { useState } from 'react';
import { MailCheckResults } from './MailCheckResults.js';
import { RemediationForm } from './RemediationForm.js';
import type { MailCheckResult } from './types.js';

interface MailDiagnosticsProps {
  domain: string;
  snapshotId?: string;
}

export function MailDiagnostics({ domain, snapshotId }: MailDiagnosticsProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<MailCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRemediation, setShowRemediation] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/collect/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          snapshotId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'Mail check failed');
      }

      const data = (await response.json()) as { results?: MailCheckResult };
      setResults(data.results || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsChecking(false);
    }
  };

  const extractIssues = (result: MailCheckResult): string[] => {
    const issues: string[] = [];

    if (!result.dmarc.present) {
      issues.push('dmarc-missing');
    } else if (!result.dmarc.valid) {
      issues.push('dmarc-invalid');
    }

    if (!result.dkim.present) {
      issues.push('dkim-missing');
    } else if (!result.dkim.valid) {
      issues.push('dkim-invalid');
    }

    if (!result.spf.present) {
      issues.push('spf-missing');
    } else if (!result.spf.valid) {
      issues.push('spf-invalid');
    }

    return issues;
  };

  const hasIssues = results && extractIssues(results).length > 0;

  if (!results) {
    return (
      <div className="text-center py-12">
        <h3 className="font-semibold text-gray-900 mb-2">Mail Configuration Check</h3>
        <p className="text-gray-500 mb-4">
          Check DMARC, DKIM, and SPF records for <strong>{domain}</strong>
        </p>

        {error && (
          <div
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking}
          aria-busy={isChecking}
          className="focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isChecking ? 'Checking...' : 'Run Mail Check'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MailCheckResults result={results} />

      {hasIssues && !showRemediation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">Issues Detected</h4>
          <p className="text-yellow-800 text-sm mb-3">
            Some mail security records are missing or misconfigured. Request remediation to fix
            these issues.
          </p>
          <button
            type="button"
            onClick={() => setShowRemediation(true)}
            className="focus-ring min-h-10 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Request Remediation
          </button>
        </div>
      )}

      {showRemediation && (
        <RemediationForm
          domain={domain}
          snapshotId={snapshotId}
          issues={extractIssues(results)}
          onClose={() => setShowRemediation(false)}
          onSuccess={() => setShowRemediation(false)}
        />
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking}
          aria-busy={isChecking}
          className="focus-ring min-h-10 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isChecking ? 'Checking...' : 'Re-check'}
        </button>
      </div>
    </div>
  );
}
