/**
 * Regression test: /api/notify/* must be rate-limited
 *
 * BUG-011: The notification routes were mounted at /api/notify/* but
 * the rate limit middleware only applied to /api/collect/* and /api/probe/*.
 * An attacker with service auth could spam webhook deliveries unlimited.
 *
 * This test statically verifies that all /api/* route prefixes that
 * accept external traffic have rate limiting applied in index.ts.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const INDEX_PATH = resolve(import.meta.dirname, '../index.ts');

describe('Collector rate-limit coverage (BUG-011)', () => {
  const src = readFileSync(INDEX_PATH, 'utf-8');

  // Extract all app.route() calls to find mounted prefixes
  const routeMounts = [...src.matchAll(/app\.route\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);

  // Extract all app.use() rate limit calls
  const rateLimitedPrefixes = [
    ...src.matchAll(/app\.use\(\s*['"]([^'"]+)['"]\s*,\s*rateLimitMiddleware/g),
  ].map((m) => m[1]);

  it('found at least 3 route mounts in collector index', () => {
    expect(routeMounts.length).toBeGreaterThanOrEqual(3);
  });

  it('found at least 3 rate-limited prefixes', () => {
    expect(rateLimitedPrefixes.length).toBeGreaterThanOrEqual(3);
  });

  // Routes that accept external writes and need rate-limiting.
  // Internal-only routes (fleet-report, monitoring) are behind
  // requireServiceAuthMiddleware and called by the web app proxy —
  // rate limiting happens at the web app layer, not on these collector
  // internal endpoints.
  const externalRoutePrefixes = routeMounts.filter(
    (prefix) =>
      prefix.startsWith('/api/') &&
      !prefix.includes('health') &&
      !prefix.includes('readyz') &&
      // Internal-only routes — rate-limited at the web proxy layer
      !prefix.includes('fleet-report') &&
      !prefix.includes('monitoring')
  );

  for (const prefix of externalRoutePrefixes) {
    it(`${prefix} is covered by rate limiting`, () => {
      const isCovered = rateLimitedPrefixes.some(
        (rlPrefix) => prefix.startsWith(rlPrefix.replace('/*', '')) || rlPrefix.startsWith(prefix)
      );

      expect(
        isCovered,
        `Route prefix ${prefix} is NOT rate-limited. Add app.use('${prefix}/*', rateLimitMiddleware(...)) to collector index.ts`
      ).toBe(true);
    });
  }
});
