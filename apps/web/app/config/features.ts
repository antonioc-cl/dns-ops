/**
 * Feature Flags Configuration
 *
 * Controls visibility of features that are "ahead of plan" or
 * still in development. Set to 'true' to enable, 'false' or undefined to disable.
 */

/**
 * Enable the Delegation tab in Domain 360 view
 * Delegation analysis is now shipped by default (DNS-002 complete)
 */
export function isDelegationTabEnabled(): boolean {
  // Ship by default - delegation panel, backend, and tests are all implemented
  // Can be disabled by setting VITE_FEATURE_DELEGATION='false' if needed
  return process.env.VITE_FEATURE_DELEGATION !== 'false';
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

  simulation: {
    name: 'Fix Simulation',
    envVar: 'VITE_FEATURE_SIMULATION',
    description: 'Enable DNS fix simulation in Domain 360 overview',
    enabled: isSimulationEnabled(),
  },
} as const;
