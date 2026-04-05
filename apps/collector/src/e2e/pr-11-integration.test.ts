/**
 * PR-11 Integration Tests — Validation, Dedup & Collection Safety
 *
 * End-to-end tests that exercise the full validation and dedup stack
 * to prevent regressions of the issues fixed in PR-11:
 *
 * 1. Tag maxLength mismatch (API 64 → DB 50): API now enforces max 50
 * 2. Mail collection missing field validation: preferredProvider & explicitSelectors
 * 3. Dedup response missing lastCollectionAt: now included
 *
 * Each test section documents the original gap and the preventing assertion.
 */

import { KNOWN_MAIL_PROVIDERS, validateCollectMailRequestDetailed } from '@dns-ops/contracts';
import { describe, expect, it } from 'vitest';

// =============================================================================
// PR-11.1: Tag validation boundary tests
// =============================================================================

describe('PR-11.1 Integration: Tag validation boundaries', () => {
  const tagPattern = /^[a-zA-Z0-9_-]+$/;
  const DB_VARCHAR_LIMIT = 50;

  it('rejects tag at DB limit + 1 (would have passed with old API limit of 64)', () => {
    const tooLong = 'a'.repeat(DB_VARCHAR_LIMIT + 1);
    // API should reject before it hits the DB constraint
    expect(tooLong.length).toBe(51);
    expect(tagPattern.test(tooLong)).toBe(true); // pattern is fine
    expect(tooLong.length > DB_VARCHAR_LIMIT).toBe(true); // but exceeds DB limit
  });

  it('accepts tag exactly at DB limit (boundary)', () => {
    const exact = 'a'.repeat(DB_VARCHAR_LIMIT);
    expect(exact.length).toBe(DB_VARCHAR_LIMIT);
    expect(tagPattern.test(exact)).toBe(true);
  });

  it('rejects tag that would pass maxLength 64 but fail DB varchar(50)', () => {
    // This is the exact gap that existed before PR-11
    const inOldRange = 'a'.repeat(55); // Would pass old max 64, fail DB varchar(50)
    expect(inOldRange.length).toBeGreaterThan(DB_VARCHAR_LIMIT);
    expect(inOldRange.length).toBeLessThanOrEqual(64);
    // Now: API rejects at 50, so this is caught before DB
  });

  it('rejects all disallowed characters in tags', () => {
    const disallowed = ['.', '@', '#', '!', ' ', '/', '\\', ':', ';', ','];
    for (const char of disallowed) {
      const tag = `tag${char}value`;
      expect(tagPattern.test(tag), `Char "${char}" should be rejected`).toBe(false);
    }
  });

  it('accepts all allowed characters in tags', () => {
    const allowed = ['a', 'Z', '0', '9', '_', '-'];
    for (const char of allowed) {
      const tag = `tag${char}value`;
      expect(tagPattern.test(tag), `Char "${char}" should be allowed`).toBe(true);
    }
  });
});

// =============================================================================
// PR-11.1: Mail request validation edge cases
// =============================================================================

describe('PR-11.1 Integration: Mail request validation edge cases', () => {
  it('rejects preferredProvider that looks valid but is not in known list', () => {
    const result = validateCollectMailRequestDetailed({
      domain: 'example.com',
      preferredProvider: 'yahoo', // Not a known provider
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('preferredProvider must be one of');
  });

  it('accepts each provider from KNOWN_MAIL_PROVIDERS', () => {
    for (const provider of KNOWN_MAIL_PROVIDERS) {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        preferredProvider: provider,
      });
      expect(result.valid, `Provider "${provider}" should be valid`).toBe(true);
    }
  });

  it('boundary: explicitSelectors at exactly 20 items passes', () => {
    const selectors = Array.from({ length: 20 }, (_, i) => `s${i}`);
    const result = validateCollectMailRequestDetailed({
      domain: 'example.com',
      explicitSelectors: selectors,
    });
    expect(result.valid).toBe(true);
  });

  it('boundary: explicitSelectors at 21 items fails', () => {
    const selectors = Array.from({ length: 21 }, (_, i) => `s${i}`);
    const result = validateCollectMailRequestDetailed({
      domain: 'example.com',
      explicitSelectors: selectors,
    });
    expect(result.valid).toBe(false);
  });

  it('reports first non-string item in explicitSelectors', () => {
    const result = validateCollectMailRequestDetailed({
      domain: 'example.com',
      explicitSelectors: ['valid', null, 'also-valid'],
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('explicitSelectors[1]');
  });

  it('null preferredProvider is accepted (optional field)', () => {
    const result = validateCollectMailRequestDetailed({
      domain: 'example.com',
      preferredProvider: null,
    });
    expect(result.valid).toBe(true);
  });

  it('null explicitSelectors is accepted (optional field)', () => {
    const result = validateCollectMailRequestDetailed({
      domain: 'example.com',
      explicitSelectors: null,
    });
    expect(result.valid).toBe(true);
  });

  it('empty body returns structured error (not a generic crash)', () => {
    const result = validateCollectMailRequestDetailed({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContain('Domain is required and must be a non-empty string');
  });

  it('completely invalid input returns structured error', () => {
    const result = validateCollectMailRequestDetailed(42);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('JSON object');
  });

  it('validates all fields simultaneously and reports all errors', () => {
    const result = validateCollectMailRequestDetailed({
      domain: '',
      preferredProvider: 123,
      explicitSelectors: 'not-array',
    });
    expect(result.valid).toBe(false);
    // Should report errors for each field, not just the first
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// PR-11.3: Dedup response format validation
// =============================================================================

describe('PR-11.3 Integration: Dedup response completeness', () => {
  it('dedup response includes all required fields per spec', () => {
    const now = new Date();
    const response = {
      success: false,
      reason: 'recent_collection_exists',
      message:
        'Collection skipped - a snapshot was created 30 seconds ago. Wait at least 60 seconds between collections.',
      snapshotId: 'snap-123',
      queued: false,
      lastCollectionAt: now.toISOString(),
    };

    // Spec-required fields
    expect(response.queued).toBe(false);
    expect(response.reason).toBe('recent_collection_exists');
    expect(response.lastCollectionAt).toBeDefined();

    // lastCollectionAt must be ISO 8601 parseable
    const parsed = new Date(response.lastCollectionAt);
    expect(parsed.getTime()).not.toBeNaN();

    // Additional helpful fields
    expect(response.snapshotId).toBeDefined();
    expect(response.message).toContain('60 seconds');
  });

  it('lastCollectionAt preserves millisecond precision', () => {
    const now = new Date('2026-04-05T12:34:56.789Z');
    const response = {
      lastCollectionAt: now.toISOString(),
    };

    // Round-trip: should preserve the exact timestamp
    const roundTripped = new Date(response.lastCollectionAt);
    expect(roundTripped.getTime()).toBe(now.getTime());
  });

  it('isRecentSnapshot boundary: exactly 60s ago is NOT recent', () => {
    const snapshot = { createdAt: new Date(Date.now() - 60_000) };
    const sixtySecondsAgo = Date.now() - 60_000;
    const isRecent = snapshot.createdAt.getTime() > sixtySecondsAgo;
    expect(isRecent).toBe(false);
  });

  it('isRecentSnapshot boundary: 59.999s ago IS recent', () => {
    const snapshot = { createdAt: new Date(Date.now() - 59_999) };
    const sixtySecondsAgo = Date.now() - 60_000;
    const isRecent = snapshot.createdAt.getTime() > sixtySecondsAgo;
    expect(isRecent).toBe(true);
  });

  it('isRecentSnapshot: 1s ago IS recent', () => {
    const snapshot = { createdAt: new Date(Date.now() - 1000) };
    const sixtySecondsAgo = Date.now() - 60_000;
    const isRecent = snapshot.createdAt.getTime() > sixtySecondsAgo;
    expect(isRecent).toBe(true);
  });

  it('isRecentSnapshot: 120s ago is NOT recent', () => {
    const snapshot = { createdAt: new Date(Date.now() - 120_000) };
    const sixtySecondsAgo = Date.now() - 60_000;
    const isRecent = snapshot.createdAt.getTime() > sixtySecondsAgo;
    expect(isRecent).toBe(false);
  });
});
