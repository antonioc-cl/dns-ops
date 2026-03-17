/**
 * DNS Views Components
 *
 * Three view modes for DNS snapshot data:
 * - Raw: Complete observation data
 * - Parsed: Normalized record tables
 * - Dig: Familiar dig-style output
 */

import { useState } from 'react';
import type { Observation } from '@dns-ops/db/schema';
import {
  observationsToRecordSets,
  groupRecordsByType,
  formatRecordValue,
  getRecordTypeDescription,
  toDigFormat,
  observationsToDigFormat,
} from '@dns-ops/parsing';

interface DNSViewsProps {
  observations: Observation[];
}

type ViewMode = 'parsed' | 'raw' | 'dig';

export function DNSViews({ observations }: DNSViewsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('parsed');

  return (
    <div>
      <ViewModeSelector current={viewMode} onChange={setViewMode} />

      <div className="mt-4">
        {viewMode === 'parsed' && <ParsedView observations={observations} />}
        {viewMode === 'raw' && <RawView observations={observations} />}
        {viewMode === 'dig' && <DigView observations={observations} />}
      </div>
    </div>
  );
}

function ViewModeSelector({
  current,
  onChange,
}: {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const modes: { id: ViewMode; label: string; description: string }[] = [
    { id: 'parsed', label: 'Parsed', description: 'Structured record view' },
    { id: 'raw', label: 'Raw', description: 'Complete response data' },
    { id: 'dig', label: 'Dig', description: 'CLI-style output' },
  ];

  return (
    <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
            current === mode.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          title={mode.description}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

// ==================== PARSED VIEW ====================

function ParsedView({ observations }: { observations: Observation[] }) {
  const recordSets = observationsToRecordSets(observations);
  const grouped = groupRecordsByType(recordSets);

  if (recordSets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No successful observations to display
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([type, records]) => (
        <section key={type} className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h4 className="font-semibold text-gray-900">
              {type} Records
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({records.length}) · {getRecordTypeDescription(type)}
              </span>
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">TTL</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sources</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record, idx) => (
                  <tr key={`${record.name}-${idx}`}>
                    <td className="px-4 py-2 text-sm font-mono text-gray-900">{record.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{record.ttl}s</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="space-y-1">
                        {record.values.map((value, vidx) => (
                          <div key={vidx} className="font-mono text-gray-800">
                            {formatRecordValue(record.type, value)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {record.sourceVantages.join(', ')}
                    </td>
                    <td className="px-4 py-2">
                      {!record.isConsistent ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                          title={record.consolidationNotes}
                        >
                          Divergent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Consistent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

// ==================== RAW VIEW ====================

function RawView({ observations }: { observations: Observation[] }) {
  return (
    <div className="space-y-4">
      {observations.map((obs) => (
        <details
          key={obs.id}
          className="border rounded-lg overflow-hidden"
          open={obs.status !== 'success'}
        >
          <summary className="bg-gray-50 px-4 py-2 cursor-pointer hover:bg-gray-100">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {obs.queryName} {obs.queryType}
                <span className="ml-2 text-sm text-gray-500">from {obs.vantageIdentifier || obs.vantageType}</span>
              </span>
              <StatusBadge status={obs.status} />
            </div>
          </summary>

          <div className="px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Response Code:</span>{' '}
                <span className="font-mono">{obs.responseCode ?? 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Response Time:</span>{' '}
                <span>{obs.responseTimeMs}ms</span>
              </div>
              <div>
                <span className="text-gray-500">Queried At:</span>{' '}
                <span>{new Date(obs.queriedAt).toLocaleString()}</span>
              </div>
            </div>

            {obs.flags && (
              <div>
                <span className="text-gray-500 text-sm">Flags:</span>
                <pre className="mt-1 text-xs bg-gray-50 p-2 rounded">
                  {JSON.stringify(obs.flags, null, 2)}
                </pre>
              </div>
            )}

            <Section title="Answer Section" data={obs.answerSection} />
            <Section title="Authority Section" data={obs.authoritySection} />
            <Section title="Additional Section" data={obs.additionalSection} />

            {obs.errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <span className="text-red-800 font-medium">Error:</span>
                <pre className="mt-1 text-sm text-red-700">{obs.errorMessage}</pre>
              </div>
            )}

            {obs.rawResponse && (
              <div>
                <span className="text-gray-500 text-sm">Raw Response:</span>
                <pre className="mt-1 text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                  {obs.rawResponse}
                </pre>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function Section({ title, data }: { title: string; data: unknown }) {
  if (!data || (Array.isArray(data) && data.length === 0)) return null;

  return (
    <div>
      <span className="text-gray-500 text-sm">{title}:</span>
      <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    success: { color: 'bg-green-100 text-green-800', label: 'Success' },
    timeout: { color: 'bg-yellow-100 text-yellow-800', label: 'Timeout' },
    refused: { color: 'bg-orange-100 text-orange-800', label: 'Refused' },
    nxdomain: { color: 'bg-red-100 text-red-800', label: 'NXDOMAIN' },
    nodata: { color: 'bg-yellow-100 text-yellow-800', label: 'NODATA' },
    error: { color: 'bg-red-100 text-red-800', label: 'Error' },
    truncated: { color: 'bg-yellow-100 text-yellow-800', label: 'Truncated' },
  };

  const { color, label } = config[status] || { color: 'bg-gray-100 text-gray-800', label: status };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

// ==================== DIG VIEW ====================

function DigView({ observations }: { observations: Observation[] }) {
  const [showAll, setShowAll] = useState(false);

  // For many observations, show a summary first
  const displayObservations = showAll ? observations : observations.slice(0, 5);
  const hasMore = observations.length > 5;

  return (
    <div>
      <div className="bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
        <div className="p-4 font-mono text-sm whitespace-pre overflow-x-auto">
          {observationsToDigFormat(displayObservations)}
        </div>
      </div>

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Show all {observations.length} observations...
        </button>
      )}
    </div>
  );
}
