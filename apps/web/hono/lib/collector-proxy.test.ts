/**
 * Circuit Breaker Tests
 *
 * Tests the collector proxy circuit breaker in isolation
 * (no Hono context needed for the breaker logic itself).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectorCircuit } from './collector-proxy.js';

describe('CollectorCircuitBreaker', () => {
  afterEach(() => {
    collectorCircuit.reset();
  });

  it('starts in closed state', () => {
    expect(collectorCircuit.getState()).toBe('closed');
    expect(collectorCircuit.allowRequest()).toBe(true);
  });

  it('stays closed after 1-2 failures', () => {
    collectorCircuit.recordFailure();
    expect(collectorCircuit.getState()).toBe('closed');
    expect(collectorCircuit.allowRequest()).toBe(true);

    collectorCircuit.recordFailure();
    expect(collectorCircuit.getState()).toBe('closed');
    expect(collectorCircuit.allowRequest()).toBe(true);
  });

  it('opens after 3 consecutive failures', () => {
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();

    expect(collectorCircuit.getState()).toBe('open');
    expect(collectorCircuit.allowRequest()).toBe(false);
  });

  it('resets on success', () => {
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();
    collectorCircuit.recordSuccess();

    expect(collectorCircuit.getState()).toBe('closed');
    expect(collectorCircuit.getInfo().consecutiveFailures).toBe(0);
  });

  it('resets from open state on success', () => {
    // Open the circuit
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();
    expect(collectorCircuit.getState()).toBe('open');

    // Simulate half-open probe succeeding
    collectorCircuit.recordSuccess();
    expect(collectorCircuit.getState()).toBe('closed');
    expect(collectorCircuit.allowRequest()).toBe(true);
  });

  it('stays open on additional failures', () => {
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();
    expect(collectorCircuit.getState()).toBe('open');

    collectorCircuit.recordFailure();
    expect(collectorCircuit.getState()).toBe('open');
    expect(collectorCircuit.allowRequest()).toBe(false);
  });

  it('transitions open → half-open after cooldown, allows one probe', () => {
    vi.useFakeTimers();
    try {
      // Open the circuit
      collectorCircuit.recordFailure();
      collectorCircuit.recordFailure();
      collectorCircuit.recordFailure();
      expect(collectorCircuit.getState()).toBe('open');

      // Advance past cooldown
      vi.advanceTimersByTime(30_001);

      // Should transition to half-open and allow one probe
      expect(collectorCircuit.getState()).toBe('half-open');
      expect(collectorCircuit.allowRequest()).toBe(true);

      // Second request in half-open should be blocked (probe in flight)
      expect(collectorCircuit.allowRequest()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-opens on failure during half-open probe', () => {
    vi.useFakeTimers();
    try {
      collectorCircuit.recordFailure();
      collectorCircuit.recordFailure();
      collectorCircuit.recordFailure();
      vi.advanceTimersByTime(30_001);

      // Allow probe
      expect(collectorCircuit.allowRequest()).toBe(true);

      // Probe fails → re-opens
      collectorCircuit.recordFailure();
      expect(collectorCircuit.getState()).toBe('open');
      expect(collectorCircuit.allowRequest()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('provides diagnostic info', () => {
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();

    const info = collectorCircuit.getInfo();
    expect(info.state).toBe('closed');
    expect(info.consecutiveFailures).toBe(2);
    expect(info.lastFailureAt).toBeGreaterThan(0);
  });

  it('reset clears all state', () => {
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();
    collectorCircuit.recordFailure();
    expect(collectorCircuit.getState()).toBe('open');

    collectorCircuit.reset();
    expect(collectorCircuit.getState()).toBe('closed');
    expect(collectorCircuit.getInfo().consecutiveFailures).toBe(0);
    expect(collectorCircuit.getInfo().lastFailureAt).toBe(0);
  });
});
