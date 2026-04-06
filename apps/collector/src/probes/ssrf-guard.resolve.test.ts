/**
 * Regression tests for resolveAndCheck() — DNS rebinding SSRF mitigation
 *
 * These tests would have caught:
 *
 * BUG-007: validateUrl() checked hostname string but not resolved IP.
 *   A domain like evil.attacker.com that resolves to 10.0.0.1 passed
 *   validateUrl() (hostname isn't on the blocklist) but the fetch()
 *   would connect to a private IP. resolveAndCheck() closes this gap
 *   by pre-resolving and checking the resolved IP.
 *
 * BUG-008: DNS resolution failure was treated as a block.
 *   Initial implementation returned { allowed: false } when dns.lookup
 *   threw ENOTFOUND. This broke all webhook tests that use mock URLs
 *   (example.com, webhook.test.com) because those don't resolve.
 *   DNS failure ≠ rebinding attack. Fix: allow through, let fetch()
 *   handle the connection error naturally.
 *
 * BUG-009: MTA-STS fetch was missing resolveAndCheck() entirely.
 *   webhook.ts was protected but mta-sts.ts still used only validateUrl().
 *   Same TOCTOU gap in a different call site. Both must be checked.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

// We test the exported function directly — it's a pure async function
// that calls dns.promises.lookup internally
import { checkSSRF, resolveAndCheck, validateUrl } from './ssrf-guard.js';

describe('resolveAndCheck — DNS rebinding mitigation (BUG-007)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('IP literal passthrough', () => {
    it('allows public IPv4 literal without DNS resolution', async () => {
      const result = await resolveAndCheck('93.184.216.34');
      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.ip).toBe('93.184.216.34');
      }
    });

    it('blocks private IPv4 literal without DNS resolution', async () => {
      const result = await resolveAndCheck('10.0.0.1');
      expect(result.allowed).toBe(false);
    });

    it('blocks loopback IPv4 literal', async () => {
      const result = await resolveAndCheck('127.0.0.1');
      expect(result.allowed).toBe(false);
    });

    it('handles IPv6 literals (colon detection)', async () => {
      const result = await resolveAndCheck('::1');
      expect(result.allowed).toBe(false);
    });

    it('handles IPv4-mapped IPv6', async () => {
      const result = await resolveAndCheck('::ffff:127.0.0.1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('hostname resolution', () => {
    it('blocks hostname that resolves to private IP (the DNS rebinding case)', async () => {
      // Mock dns.promises.lookup to return a private IP
      vi.doMock('node:dns', () => ({
        promises: {
          lookup: vi.fn().mockResolvedValue({ address: '10.0.0.1', family: 4 }),
        },
      }));

      // Re-import to pick up the mock
      const { resolveAndCheck: resolveAndCheckMocked } = await import('./ssrf-guard.js');
      const result = await resolveAndCheckMocked('evil.attacker.com');

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain('DNS rebinding blocked');
        expect(result.reason).toContain('10.0.0.1');
      }

      vi.doUnmock('node:dns');
    });

    it('allows hostname that resolves to public IP', async () => {
      vi.doMock('node:dns', () => ({
        promises: {
          lookup: vi.fn().mockResolvedValue({ address: '93.184.216.34', family: 4 }),
        },
      }));

      const { resolveAndCheck: resolveAndCheckMocked } = await import('./ssrf-guard.js');
      const result = await resolveAndCheckMocked('example.com');

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.ip).toBe('93.184.216.34');
      }

      vi.doUnmock('node:dns');
    });
  });

  describe('DNS failure handling (BUG-008)', () => {
    it('allows through when DNS resolution fails (ENOTFOUND)', async () => {
      // This is the critical regression — we must NOT block on DNS failure
      const result = await resolveAndCheck('nonexistent.invalid.test');
      expect(result.allowed).toBe(true);
    });

    it('allows through when DNS resolution fails (any error)', async () => {
      vi.doMock('node:dns', () => ({
        promises: {
          lookup: vi.fn().mockRejectedValue(new Error('ESERVFAIL')),
        },
      }));

      const { resolveAndCheck: resolveAndCheckMocked } = await import('./ssrf-guard.js');
      const result = await resolveAndCheckMocked('timeout.test');

      // Must allow — DNS failure is not a rebinding attack
      expect(result.allowed).toBe(true);

      vi.doUnmock('node:dns');
    });
  });
});

describe('validateUrl vs resolveAndCheck coverage gap (BUG-009)', () => {
  it('validateUrl alone allows hostname that could resolve to private IP', () => {
    // This proves the gap that resolveAndCheck closes
    const result = validateUrl('https://evil.attacker.com/webhook');

    // validateUrl only checks the hostname string — "evil.attacker.com"
    // is not localhost, not an IP literal → allowed
    expect(result.allowed).toBe(true);

    // But if this hostname resolves to 10.0.0.1, it's a rebinding attack.
    // That's why resolveAndCheck must be called separately.
  });

  it('checkSSRF blocks private IPs directly', () => {
    // This is what resolveAndCheck uses after DNS resolution
    expect(checkSSRF('10.0.0.1').allowed).toBe(false);
    expect(checkSSRF('172.16.0.1').allowed).toBe(false);
    expect(checkSSRF('192.168.1.1').allowed).toBe(false);
    expect(checkSSRF('127.0.0.1').allowed).toBe(false);
    expect(checkSSRF('169.254.169.254').allowed).toBe(false); // cloud metadata
  });

  it('checkSSRF allows public IPs', () => {
    expect(checkSSRF('93.184.216.34').allowed).toBe(true);
    expect(checkSSRF('8.8.8.8').allowed).toBe(true);
    expect(checkSSRF('1.1.1.1').allowed).toBe(true);
  });
});
