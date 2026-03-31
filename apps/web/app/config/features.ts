/**
 * Feature Flags Configuration
 *
 * Controls visibility of features that are "ahead of plan" or
 * still in development. Set to 'true' to enable, 'false' or undefined to disable.
 */

/**
 * Enable the Delegation tab in Domain 360 view
 * Requires DNS-002 (delegation evidence) to be fully implemented
 */
export function isDelegationTabEnabled(): boolean {
  return process.env.VITE_FEATURE_DELEGATION === 'true';
}

/**
 * Enable experimental mail diagnostics features
 */
export function isMailDiagnosticsEnabled(): boolean {
  return process.env.VITE_FEATURE_MAIL_DIAGNOSTICS === 'true';
}

/**
 * Enable fleet-wide reporting features
 */
export function isFleetReportingEnabled(): boolean {
  return process.env.VITE_FEATURE_FLEET_REPORTING === 'true';
}

/**
 * Enable shadow comparison features
 */
export function isShadowComparisonEnabled(): boolean {
  return process.env.VITE_FEATURE_SHADOW_COMPARISON === 'true';
}

/**
 * Enable the simulation panel in Domain 360 overview
 * Requires SEC-002 (simulation route auth) to be implemented
 */
export function isSimulationEnabled(): boolean {
  return process.env.VITE_FEATURE_SIMULATION === 'true';
}

/**
 * All available feature flags
 */
export const FEATURE_FLAGS = {
  delegation: {
    name: 'Delegation Tab',
    envVar: 'VITE_FEATURE_DELEGATION',
    description: 'Enable the Delegation tab showing parent zone and NS delegation data',
    enabled: isDelegationTabEnabled(),
  },
  mailDiagnostics: {
    name: 'Mail Diagnostics',
    envVar: 'VITE_FEATURE_MAIL_DIAGNOSTICS',
    description: 'Enable experimental mail diagnostic features',
    enabled: isMailDiagnosticsEnabled(),
  },
  fleetReporting: {
    name: 'Fleet Reporting',
    envVar: 'VITE_FEATURE_FLEET_REPORTING',
    description: 'Enable fleet-wide reporting and analysis',
    enabled: isFleetReportingEnabled(),
  },
  shadowComparison: {
    name: 'Shadow Comparison',
    envVar: 'VITE_FEATURE_SHADOW_COMPARISON',
    description: 'Enable legacy tool vs new findings comparison',
    enabled: isShadowComparisonEnabled(),
  },
  simulation: {
    name: 'Fix Simulation',
    envVar: 'VITE_FEATURE_SIMULATION',
    description: 'Enable DNS fix simulation in Domain 360 overview',
    enabled: isSimulationEnabled(),
  },
} as const;
