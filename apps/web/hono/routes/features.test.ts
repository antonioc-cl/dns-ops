/**
 * Feature Flags Tests
 *
 * Tests that feature flags correctly read environment variables.
 *
 * Note: Delegation tab is shipped by default (returns true when not set).
 * Other flags default to disabled.
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
    const { isSimulationEnabled } = await import('../../app/config/features.js');
    expect(isSimulationEnabled()).toBe(true);
  });

  it('isSimulationEnabled returns false when VITE_FEATURE_SIMULATION=false', async () => {
    process.env.VITE_FEATURE_SIMULATION = 'false';
    const { isSimulationEnabled } = await import('../../app/config/features.js');
    expect(isSimulationEnabled()).toBe(false);
  });

  it('isSimulationEnabled returns false when env var not set', async () => {
    delete process.env.VITE_FEATURE_SIMULATION;
    const { isSimulationEnabled } = await import('../../app/config/features.js');
    expect(isSimulationEnabled()).toBe(false);
  });

  it('isDelegationTabEnabled returns true when VITE_FEATURE_DELEGATION=true', async () => {
    process.env.VITE_FEATURE_DELEGATION = 'true';
    const { isDelegationTabEnabled } = await import('../../app/config/features.js');
    expect(isDelegationTabEnabled()).toBe(true);
  });

  it('isDelegationTabEnabled returns false when VITE_FEATURE_DELEGATION=false', async () => {
    process.env.VITE_FEATURE_DELEGATION = 'false';
    const { isDelegationTabEnabled } = await import('../../app/config/features.js');
    expect(isDelegationTabEnabled()).toBe(false);
  });

  it('isDelegationTabEnabled returns true when env var not set (shipped by default)', async () => {
    delete process.env.VITE_FEATURE_DELEGATION;
    const { isDelegationTabEnabled } = await import('../../app/config/features.js');
    expect(isDelegationTabEnabled()).toBe(true);
  });

  it('all non-delegation flags default to false', async () => {
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
    } = await import('../../app/config/features.js');
    expect(isSimulationEnabled()).toBe(false);
    expect(isDelegationTabEnabled()).toBe(true); // Shipped by default
    expect(isMailDiagnosticsEnabled()).toBe(false);
    expect(isFleetReportingEnabled()).toBe(false);
    expect(isShadowComparisonEnabled()).toBe(false);
  });
});
