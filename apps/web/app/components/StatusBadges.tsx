import type { ZoneManagement, ResultState, Severity, Confidence } from '@dns-ops/contracts';

interface BadgeProps {
  children: React.ReactNode;
  color: 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'orange';
}

function Badge({ children, color }: BadgeProps) {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}`}>
      {children}
    </span>
  );
}

interface ZoneManagementBadgeProps {
  type: ZoneManagement;
}

export function ZoneManagementBadge({ type }: ZoneManagementBadgeProps) {
  const config = {
    managed: { color: 'green' as const, label: 'Managed Zone' },
    unmanaged: { color: 'yellow' as const, label: 'Unmanaged (Targeted)' },
    unknown: { color: 'gray' as const, label: 'Unknown' },
  };

  const { color, label } = config[type];

  return (
    <Badge color={color}>
      {label}
    </Badge>
  );
}

interface ResultStateBadgeProps {
  state: ResultState;
}

export function ResultStateBadge({ state }: ResultStateBadgeProps) {
  const config = {
    complete: { color: 'green' as const, label: 'Complete' },
    partial: { color: 'yellow' as const, label: 'Partial' },
    failed: { color: 'red' as const, label: 'Failed' },
  };

  const { color, label } = config[state];

  return (
    <Badge color={color}>
      {label}
    </Badge>
  );
}

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = {
    critical: { color: 'red' as const },
    high: { color: 'orange' as const },
    medium: { color: 'yellow' as const },
    low: { color: 'blue' as const },
    info: { color: 'gray' as const },
  };

  return (
    <Badge color={config[severity].color}>
      {severity}
    </Badge>
  );
}

interface ConfidenceBadgeProps {
  level: Confidence;
}

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const config = {
    certain: { color: 'green' as const },
    high: { color: 'blue' as const },
    medium: { color: 'yellow' as const },
    low: { color: 'gray' as const },
    heuristic: { color: 'purple' as const },
  };

  return (
    <Badge color={config[level].color}>
      {level}
    </Badge>
  );
}

