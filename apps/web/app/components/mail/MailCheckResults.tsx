import type { ReactNode } from 'react';
import type { MailCheckResult } from './types.js';

interface MailCheckResultsProps {
  result: MailCheckResult;
}

export function MailCheckResults({ result }: MailCheckResultsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Mail Check Results</h3>
        <span
          className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 border border-purple-200"
          data-testid="mail-preview-badge"
        >
          Preview
        </span>
      </div>

      <div
        className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800"
        data-testid="mail-preview-disclaimer"
      >
        <p>
          <strong>Preview:</strong> These mail security findings are generated from DNS observations. For
          authoritative results, use the legacy DMARC/DKIM tools linked below.
        </p>
      </div>

      <RecordCard
        label="DMARC"
        present={result.dmarc.present}
        valid={result.dmarc.valid}
        errors={result.dmarc.errors}
        description="Domain-based Message Authentication, Reporting, and Conformance"
      />

      <RecordCard
        label="DKIM"
        present={result.dkim.present}
        valid={result.dkim.valid}
        errors={result.dkim.errors}
        description="DomainKeys Identified Mail"
        extra={
          result.dkim.present ? (
            <span className="text-xs text-gray-500">
              Selector: <code className="bg-gray-100 px-1 rounded">{result.dkim.selector}</code>
              {result.dkim.selectorProvenance && (
                <span className="ml-2 text-gray-400">(via {result.dkim.selectorProvenance})</span>
              )}
            </span>
          ) : null
        }
      />

      <RecordCard
        label="SPF"
        present={result.spf.present}
        valid={result.spf.valid}
        errors={result.spf.errors}
        description="Sender Policy Framework"
      />
    </div>
  );
}

interface RecordCardProps {
  label: string;
  present: boolean;
  valid: boolean;
  errors?: string[];
  description: string;
  extra?: ReactNode;
}

function RecordCard({ label, present, valid, errors, description, extra }: RecordCardProps) {
  const status = present ? (valid ? 'success' : 'warning') : 'error';

  const statusConfig = {
    success: {
      icon: CheckIcon,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      label: 'Present & Valid',
    },
    warning: {
      icon: WarningIcon,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      label: 'Present but Invalid',
    },
    error: {
      icon: XIcon,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      label: 'Not Found',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.text}`} />
          <div>
            <h4 className={`font-medium ${config.text}`}>{label}</h4>
            <p className="text-sm text-gray-600">{description}</p>
            {extra}
          </div>
        </div>
        <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
      </div>

      {errors && errors.length > 0 && (
        <div className="mt-3 text-sm text-red-700">
          {errors.map((error) => (
            <p key={error}>• {error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
