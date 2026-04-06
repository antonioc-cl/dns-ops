/**
 * Regression tests for packages/db/src/client.ts
 *
 * These tests would have caught:
 *
 * BUG-001: parseSSLConfig changed production SSL behavior.
 *   The original code used rejectUnauthorized:false for createClient (web)
 *   and rejectUnauthorized:true for createPostgresClient (collector).
 *   A refactor collapsed them into one function that defaulted to
 *   rejectUnauthorized:true for ALL production callers, breaking
 *   web deployments that use self-signed certs (Hyperdrive).
 *
 * BUG-002: parseSSLConfig threw on malformed connection strings.
 *   `new URL()` throws if the connection string isn't a valid URL.
 *   Some pg connection strings use shorthand formats.
 *
 * BUG-003: sslmode=require was treated the same as verify-ca.
 *   PostgreSQL semantics: require = encrypt but don't verify cert.
 *   verify-ca/verify-full = encrypt AND verify. Conflating them
 *   breaks connections to hosts with self-signed certs.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { parseSSLConfig } from './client.js';

// Save originals so we can restore after each test
const originalNodeEnv = process.env.NODE_ENV;
const originalDbTls = process.env.DB_TLS_REJECT_UNAUTHORIZED;

afterEach(() => {
  // Restore environment after every test
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
  if (originalDbTls === undefined) {
    delete process.env.DB_TLS_REJECT_UNAUTHORIZED;
  } else {
    process.env.DB_TLS_REJECT_UNAUTHORIZED = originalDbTls;
  }
});

// =============================================================================
// BUG-001 REGRESSION: Production SSL behavior must match caller context
// =============================================================================

describe('parseSSLConfig — production defaults (BUG-001)', () => {
  it('web callers (strictDefault=false) default to rejectUnauthorized=false', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DB_TLS_REJECT_UNAUTHORIZED;

    const result = parseSSLConfig('postgresql://host:5432/db');
    expect(result).toEqual({ rejectUnauthorized: false });
  });

  it('collector callers (strictDefault=true) default to rejectUnauthorized=true', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DB_TLS_REJECT_UNAUTHORIZED;

    const result = parseSSLConfig('postgresql://host:5432/db', { strictDefault: true });
    expect(result).toEqual({ rejectUnauthorized: true });
  });

  it('omitting options behaves like web caller (lenient)', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DB_TLS_REJECT_UNAUTHORIZED;

    const result = parseSSLConfig('postgresql://host:5432/db');
    // Must NOT be { rejectUnauthorized: true } — that was the original bug
    expect(result).toEqual({ rejectUnauthorized: false });
  });

  it('DB_TLS_REJECT_UNAUTHORIZED=false overrides strictDefault=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_TLS_REJECT_UNAUTHORIZED = 'false';

    const result = parseSSLConfig('postgresql://host:5432/db', { strictDefault: true });
    expect(result).toEqual({ rejectUnauthorized: false });
  });

  it('DB_TLS_REJECT_UNAUTHORIZED=true overrides strictDefault=false', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_TLS_REJECT_UNAUTHORIZED = 'true';

    const result = parseSSLConfig('postgresql://host:5432/db');
    expect(result).toEqual({ rejectUnauthorized: true });
  });
});

// =============================================================================
// BUG-002 REGRESSION: Malformed URLs must not throw
// =============================================================================

describe('parseSSLConfig — malformed URLs (BUG-002)', () => {
  it('does not throw for non-URL connection strings', () => {
    process.env.NODE_ENV = 'development';

    // Some pg connection strings aren't valid URLs
    expect(() => parseSSLConfig('host=localhost dbname=test')).not.toThrow();
    const result = parseSSLConfig('host=localhost dbname=test');
    expect(result).toBe(false); // dev default
  });

  it('does not throw for empty string', () => {
    process.env.NODE_ENV = 'development';
    expect(() => parseSSLConfig('')).not.toThrow();
  });

  it('falls back to env-based default on malformed URL in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DB_TLS_REJECT_UNAUTHORIZED;

    const result = parseSSLConfig('not-a-url');
    // Should still return a production default, not crash
    expect(result).toEqual({ rejectUnauthorized: false });
  });
});

// =============================================================================
// BUG-003 REGRESSION: sslmode semantics must match PostgreSQL
// =============================================================================

describe('parseSSLConfig — sslmode parameter (BUG-003)', () => {
  it('sslmode=disable returns false (no SSL)', () => {
    const result = parseSSLConfig('postgresql://host:5432/db?sslmode=disable');
    expect(result).toBe(false);
  });

  it('sslmode=require returns rejectUnauthorized=false (encrypt, dont verify)', () => {
    const result = parseSSLConfig('postgresql://host:5432/db?sslmode=require');
    // CRITICAL: require means "encrypt but don't verify cert"
    // This is different from verify-ca/verify-full
    expect(result).toEqual({ rejectUnauthorized: false });
  });

  it('sslmode=verify-ca returns rejectUnauthorized=true', () => {
    const result = parseSSLConfig('postgresql://host:5432/db?sslmode=verify-ca');
    expect(result).toEqual({ rejectUnauthorized: true });
  });

  it('sslmode=verify-full returns rejectUnauthorized=true', () => {
    const result = parseSSLConfig('postgresql://host:5432/db?sslmode=verify-full');
    expect(result).toEqual({ rejectUnauthorized: true });
  });

  it('sslmode takes precedence over NODE_ENV', () => {
    process.env.NODE_ENV = 'production';

    // Even in production, sslmode=disable means no SSL
    const disabled = parseSSLConfig('postgresql://host:5432/db?sslmode=disable');
    expect(disabled).toBe(false);

    // Even in development, sslmode=verify-full means strict SSL
    process.env.NODE_ENV = 'development';
    const strict = parseSSLConfig('postgresql://host:5432/db?sslmode=verify-full');
    expect(strict).toEqual({ rejectUnauthorized: true });
  });

  it('sslmode takes precedence over DB_TLS_REJECT_UNAUTHORIZED', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_TLS_REJECT_UNAUTHORIZED = 'true';

    // sslmode=require still means don't verify, overriding env
    const result = parseSSLConfig('postgresql://host:5432/db?sslmode=require');
    expect(result).toEqual({ rejectUnauthorized: false });
  });

  it('unknown sslmode falls through to env defaults', () => {
    process.env.NODE_ENV = 'development';

    const result = parseSSLConfig('postgresql://host:5432/db?sslmode=prefer');
    // 'prefer' is not explicitly handled, falls to dev default
    expect(result).toBe(false);
  });
});

// =============================================================================
// Development mode baseline
// =============================================================================

describe('parseSSLConfig — development mode', () => {
  it('returns false in development (no SSL)', () => {
    process.env.NODE_ENV = 'development';
    const result = parseSSLConfig('postgresql://localhost:5432/dns_ops');
    expect(result).toBe(false);
  });

  it('returns false when NODE_ENV is unset', () => {
    delete process.env.NODE_ENV;
    const result = parseSSLConfig('postgresql://localhost:5432/dns_ops');
    expect(result).toBe(false);
  });

  it('sslmode=require still works in development', () => {
    process.env.NODE_ENV = 'development';
    const result = parseSSLConfig('postgresql://localhost:5432/dns_ops?sslmode=require');
    // sslmode is explicit — always honored regardless of NODE_ENV
    expect(result).toEqual({ rejectUnauthorized: false });
  });
});
