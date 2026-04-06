/**
 * Test Hygiene E2E — Static analysis guards
 *
 * These tests would have caught:
 *
 * BUG-004: Empty test stubs passing vacuously.
 *   7 tests in fleet-report.test.ts had comment-only bodies with zero
 *   assertions. Removing `skipIf` made them "pass" — false confidence.
 *   A test with no expect() or assert() is a lie.
 *
 * BUG-005: Debug console.log left in production code.
 *   Domain360 loader had console.log('[Domain360] loadData effect'...)
 *   firing on every page load. Debug artifacts in shipped code.
 *
 * BUG-006: Lint-fixable warnings left unfixed.
 *   3 Biome warnings (template literal suggestions) accumulated silently.
 *   Warnings rot into errors when lint rules tighten.
 *
 * This file uses static source analysis (readFileSync + regex) to catch
 * these classes of issues across the whole repo. No runtime, no mocks.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../../');

// =============================================================================
// BUG-004 REGRESSION: No empty test bodies
// =============================================================================

describe('No empty test stubs (BUG-004)', () => {
  const testFiles = collectFiles(join(REPO_ROOT, 'apps'), isTestFile).concat(
    collectFiles(join(REPO_ROOT, 'packages'), isTestFile)
  );

  it('found at least 50 test files to scan', () => {
    // Sanity check — if this fails, the file collector is broken
    expect(testFiles.length).toBeGreaterThan(50);
  });

  it('no test body is comment-only (zero assertions)', () => {
    const emptyTests: string[] = [];

    for (const file of testFiles) {
      const src = readFileSync(file, 'utf-8');
      // Match: it('...', async? () => { <only comments/whitespace> });
      // This regex finds `it(` or `test(` blocks whose body is only
      // whitespace and JS comments (no code statements at all).
      const itBlocks = extractTestBodies(src);

      for (const { name, body, line } of itBlocks) {
        const stripped = body
          .replace(/\/\/[^\n]*/g, '') // strip line comments
          .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
          .trim();

        if (stripped === '') {
          const rel = relative(REPO_ROOT, file);
          emptyTests.push(`${rel}:${line} — "${name}"`);
        }
      }
    }

    expect(
      emptyTests,
      `Found ${emptyTests.length} empty test stub(s) with no assertions:\n${emptyTests.join('\n')}`
    ).toHaveLength(0);
  });
});

// =============================================================================
// BUG-005 REGRESSION: No console.log in production source files
// =============================================================================

describe('No debug console.log in production code (BUG-005)', () => {
  // Production source files (not test files, not configs)
  const sourceFiles = collectFiles(join(REPO_ROOT, 'apps'), isProductionSource).concat(
    collectFiles(join(REPO_ROOT, 'packages'), isProductionSource)
  );

  it('found at least 30 production source files to scan', () => {
    expect(sourceFiles.length).toBeGreaterThan(30);
  });

  it('no production .ts/.tsx file contains console.log', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const src = readFileSync(file, 'utf-8');
      const lines = src.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match console.log but not inside comments
        if (
          /console\.log\s*\(/.test(line) &&
          !line.trimStart().startsWith('//') &&
          !line.trimStart().startsWith('*')
        ) {
          const rel = relative(REPO_ROOT, file);
          violations.push(`${rel}:${i + 1} — ${line.trim().slice(0, 80)}`);
        }
      }
    }

    expect(
      violations,
      `Found ${violations.length} console.log in production code:\n${violations.join('\n')}`
    ).toHaveLength(0);
  });

  it('console.error and console.warn are allowed (they should use structured logger but are not debug artifacts)', () => {
    // This test documents the policy: console.error/warn are tolerated
    // (structured logger is preferred but not enforced by this test)
    // console.log is NEVER allowed in production code
    expect(true).toBe(true);
  });
});

// =============================================================================
// Helpers
// =============================================================================

function isTestFile(path: string): boolean {
  return (
    (path.endsWith('.test.ts') ||
      path.endsWith('.spec.ts') ||
      path.endsWith('.test.tsx') ||
      path.endsWith('.spec.tsx')) &&
    !path.includes('node_modules') &&
    !path.includes('dist')
  );
}

function isProductionSource(path: string): boolean {
  return (
    (path.endsWith('.ts') || path.endsWith('.tsx')) &&
    !path.endsWith('.test.ts') &&
    !path.endsWith('.spec.ts') &&
    !path.endsWith('.test.tsx') &&
    !path.endsWith('.spec.tsx') &&
    !path.endsWith('.d.ts') &&
    !path.includes('node_modules') &&
    !path.includes('dist') &&
    !path.includes('.gen.') &&
    !path.includes('vitest.config') &&
    // Exclude infrastructure that legitimately uses console.log:
    !path.includes('/scripts/') && // DB scripts, deploy scripts
    !path.includes('/logging/') && // Logger package (its job is to log)
    !path.includes('/testkit/') && // Test utilities
    !path.includes('/benchmark-corpus/') // Corpus utilities
  );
}

function collectFiles(dir: string, filter: (path: string) => boolean): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.vinxi') continue;
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          results.push(...collectFiles(full, filter));
        } else if (filter(full)) {
          results.push(full);
        }
      } catch {
        // Skip inaccessible files
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return results;
}

/**
 * Extract test bodies from source text.
 *
 * Finds `it('name', ...() => { BODY })` and `test('name', ...() => { BODY })`
 * Returns the name, body text, and approximate line number.
 *
 * This is a best-effort regex parser — it handles the common patterns
 * but won't catch every edge case (nested braces, etc). That's fine;
 * it only needs to catch the obvious empty-body stubs.
 */
function extractTestBodies(src: string): Array<{ name: string; body: string; line: number }> {
  const results: Array<{ name: string; body: string; line: number }> = [];

  // Match: it('name', async? () => {
  //   or: test('name', async? () => {
  // Capture the name and find the opening brace
  const pattern =
    /(?:^|\n)\s*(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{/g;
  let match: RegExpExecArray | null = pattern.exec(src);

  while (match !== null) {
    const name = match[1];
    const openBraceIndex = match.index + match[0].length - 1;
    const lineNumber = src.slice(0, match.index).split('\n').length;

    // Find matching close brace (simple brace counting)
    let depth = 1;
    let i = openBraceIndex + 1;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      if (src[i] === '}') depth--;
      i++;
    }

    if (depth === 0) {
      const body = src.slice(openBraceIndex + 1, i - 1);
      results.push({ name, body, line: lineNumber });
    }

    match = pattern.exec(src);
  }

  return results;
}
