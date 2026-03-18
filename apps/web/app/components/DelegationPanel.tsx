/**
 * Delegation Panel Component
 *
 * Visualizes delegation data: parent zone view, authoritative servers,
 * glue records, divergence detection, and DNSSEC status.
 */

import { useState, useEffect } from 'react';

interface DelegationData {
  domain: string;
  parentZone: string;
  nameServers: Array<{ name: string; source: string }>;
  glue: Array<{ name: string; type: string; address: string }>;
  hasDivergence: boolean;
  hasDnssec: boolean;
}

interface DelegationIssue {
  type: string;
  severity: string;
  description: string;
  details: unknown;
}

interface DelegationPanelProps {
  snapshotId: string;
}

export function DelegationPanel({ snapshotId }: DelegationPanelProps) {
  const [delegation, setDelegation] = useState<DelegationData | null>(null);
  const [issues, setIssues] = useState<DelegationIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshotId) return;

    setLoading(true);
    Promise.all([
      fetch(`/api/snapshot/${snapshotId}/delegation`).then((r) => r.json()),
      fetch(`/api/snapshot/${snapshotId}/delegation/issues`).then((r) => r.json()),
    ])
      .then(([delegationData, issuesData]) => {
        setDelegation(delegationData.delegation);
        setIssues(issuesData.issues || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [snapshotId]);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="animate-pulse text-gray-500">Loading delegation data...</div>
      </div>
    );
  }

  if (error) {
    return <div className="py-4 text-red-600">Error: {error}</div>;
  }

  if (!delegation) {
    return (
      <div className="py-8 text-center text-gray-500">
        No delegation data available for this snapshot.
        <p className="text-sm mt-2">
          Delegation collection may not have been enabled for this snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Issues Banner */}
      {issues.length > 0 && (
        <div className="space-y-3">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                issue.severity === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : issue.severity === 'high'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    issue.severity === 'critical'
                      ? 'bg-red-500'
                      : issue.severity === 'high'
                      ? 'bg-orange-500'
                      : 'bg-yellow-500'
                  }`}
                />
                <div>
                  <h4 className="font-medium text-gray-900">{issue.description}</h4>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {issue.type.replace(/-/g, ' ')} • {issue.severity} severity
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Parent Zone Info */}
      <section>
        <h4 className="font-medium text-gray-900 mb-3">Parent Zone Delegation</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Domain</span>
              <p className="font-mono text-sm">{delegation.domain}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Parent Zone</span>
              <p className="font-mono text-sm">{delegation.parentZone}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Name Servers */}
      <section>
        <h4 className="font-medium text-gray-900 mb-3">Name Servers</h4>
        <div className="space-y-2">
          {delegation.nameServers.length > 0 ? (
            delegation.nameServers.map((ns, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-white border rounded-lg"
              >
                <code className="font-mono text-sm">{ns.name}</code>
                <span className="text-xs text-gray-500">via {ns.source}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No name servers found</p>
          )}
        </div>
      </section>

      {/* Glue Records */}
      <section>
        <h4 className="font-medium text-gray-900 mb-3">Glue Records</h4>
        {delegation.glue.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {delegation.glue.map((g, idx) => (
              <div key={idx} className="p-3 bg-white border rounded-lg">
                <div className="font-mono text-sm">{g.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      g.type === 'A'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {g.type}
                  </span>
                  <code className="text-sm text-gray-600">{g.address}</code>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No glue records found</p>
        )}
      </section>

      {/* Status Badges */}
      <section className="flex items-center gap-3 pt-4 border-t">
        <StatusBadge
          label="DNSSEC"
          status={delegation.hasDnssec ? 'present' : 'absent'}
          color={delegation.hasDnssec ? 'green' : 'gray'}
        />
        <StatusBadge
          label="Divergence"
          status={delegation.hasDivergence ? 'detected' : 'none'}
          color={delegation.hasDivergence ? 'red' : 'green'}
        />
      </section>
    </div>
  );
}

function StatusBadge({
  label,
  status,
  color,
}: {
  label: string;
  status: string;
  color: 'green' | 'red' | 'gray';
}) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className={`px-3 py-1.5 rounded-lg text-sm ${colors[color]}`}>
      <span className="font-medium">{label}:</span>{' '}
      <span className="capitalize">{status}</span>
    </div>
  );
}
