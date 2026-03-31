/**
 * Feature Flags Tests
 *
 * Tests that feature flags correctly read environment variables
 * and default to disabled when not set.
 *
 * WOULD HAVE CAUGHT: Simulation panel showing unconditionally
 * despite feature flag infrastructure existing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Feature flags', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('isSimulationEnabled returns true when VITE_FEATURE_SIMULATION=true', async () => {
    process.env.VITE_FEATURE_SIMULATION = 'true';
    const { isSimulationEnabled } = await import('./features.js');
    expect(isSimulationEnabled()).toBe(true);
  });

  it('isSimulationEnabled returns false when VITE_FEATURE_SIMULATION=false', async () => {
    process.env.VITE_FEATURE_SIMULATION = 'false';
    const { isSimulationEnabled } = await import('./features.js');
    expect(isSimulationEnabled()).toBe(false);
  });

  it('isSimulationEnabled returns false when env var not set', async () => {
    delete process.env.VITE_FEATURE_SIMULATION;
    const { isSimulationEnabled } = await import('./features.js');
    expect(isSimulationEnabled()).toBe(false);
  });

  it('isDelegationTabEnabled returns true when VITE_FEATURE_DELEGATION=true', async () => {
    process.env.VITE_FEATURE_DELEGATION = 'true';
    const { isDelegationTabEnabled } = await import('./features.js');
    expect(isDelegationTabEnabled()).toBe(true);
  });

  it('isDelegationTabEnabled returns false when env var not set', async () => {
    delete process.env.VITE_FEATURE_DELEGATION;
    const { isDelegationTabEnabled } = await import('./features.js');
    expect(isDelegationTabEnabled()).toBe(false);
  });

  it('isMailDiagnosticsEnabled returns true when VITE_FEATURE_MAIL_DIAGNOSTICS=true', async () => {
    process.env.VITE_FEATURE_MAIL_DIAGNOSTICS = 'true';
    const { isMailDiagnosticsEnabled } = await import('./features.js');
    expect(isMailDiagnosticsEnabled()).toBe(true);
  });

  it('isFleetReportingEnabled returns true when VITE_FEATURE_FLEET_REPORTING=true', async () => {
    process.env.VITE_FEATURE_FLEET_REPORTING = 'true';
    const { isFleetReportingEnabled } = await import('./features.js');
    expect(isFleetReportingEnabled()).toBe(true);
  });

  it('isShadowComparisonEnabled returns true when VITE_FEATURE_SHADOW_COMPARISON=true', async () => {
    process.env.VITE_FEATURE_SHADOW_COMPARISON = 'true';
    const { isShadowComparisonEnabled } = await import('./features.js');
    expect(isShadowComparisonEnabled()).toBe(true);
  });

  it('all flags default to false', async () => {
    delete process.env.VITE_FEATURE_SIMULATION;
    delete process.env.VITE_FEATURE_DELEGATION;
    delete process.env.VITE_FEATURE_MAIL_DIAGNOSTICS;
    delete process.env.VITE_FEATURE_FLEET_REPORTING;
    delete process.env.VITE_FEATURE_SHADOW_COMPARISON;
    const {
      isSimulationEnabled,
      isDelegationTabEnabled,
      isMailDiagnosticsEnabled,
      isFleetReportingEnabled,
      isShadowComparisonEnabled,
    } = await import('./features.js');
    expect(isSimulationEnabled()).toBe(false);
    expect(isDelegationTabEnabled()).toBe(false);
    expect(isMailDiagnosticsEnabled()).toBe(false);
    expect(isFleetReportingEnabled()).toBe(false);
    expect(isShadowComparisonEnabled()).toBe(false);
  });
});
