/**
 * Bead 07 — Tab Registration & Feature Flag Hygiene Tests
 *
 * Validates structural invariants that prevent common integration bugs:
 *
 * 1. Every DomainTabId in the type union has a matching entry in DOMAIN_TABS
 * 2. Every tab in DOMAIN_TABS has a matching tabpanel in the rendered JSX
 * 3. Feature flags exported from features.ts are actually consumed by production code
 * 4. Feature flag env vars listed in FEATURE_FLAGS match the functions
 *
 * These tests would have caught:
 * - Dead feature flags (isMailDiagnosticsEnabled etc.) exported but never imported
 * - Missing tabpanel for a registered tab
 * - Tab registered in DOMAIN_TABS but not in the DomainTabId type
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Resolve paths relative to the web app root
const WEB_ROOT = resolve(import.meta.dirname, '../../');
const DOMAIN_PAGE = resolve(WEB_ROOT, 'app/routes/domain/$domain.tsx');
const FEATURES_FILE = resolve(WEB_ROOT, 'app/config/features.ts');

function readFile(path: string): string {
  return readFileSync(path, 'utf-8');
}

describe('Tab Registration Completeness', () => {
  const domainPageSrc = readFile(DOMAIN_PAGE);

  it('DomainTabId type union includes all tabs from DOMAIN_TABS', () => {
    // Extract the type union values
    const typeMatch = domainPageSrc.match(/type\s+DomainTabId\s*=\s*([^;]+);/);
    expect(typeMatch, 'DomainTabId type not found').toBeTruthy();
    const typeRaw = typeMatch?.[1] ?? '';
    const typeValues = typeRaw
      .split('|')
      .map((v) => v.trim().replace(/'/g, '').replace(/"/g, ''))
      .filter(Boolean);

    // Extract DOMAIN_TABS entries
    const tabEntries = [...domainPageSrc.matchAll(/\{\s*id:\s*['"](\w+)['"]/g)].map((m) => m[1]);

    // Every DOMAIN_TABS entry must be in the type union
    for (const tabId of tabEntries) {
      expect(
        typeValues,
        `Tab '${tabId}' is in DOMAIN_TABS but not in DomainTabId type union`
      ).toContain(tabId);
    }

    // Every type union value should either be in DOMAIN_TABS or conditionally added
    for (const typeVal of typeValues) {
      const inTabs = tabEntries.includes(typeVal);
      const conditionallyAdded = domainPageSrc.includes(`'${typeVal}' as const`);
      expect(
        inTabs || conditionallyAdded,
        `DomainTabId '${typeVal}' exists in type but has no DOMAIN_TABS entry`
      ).toBe(true);
    }
  });

  it('every tab in DOMAIN_TABS has a corresponding tabpanel', () => {
    // Extract all tab IDs from DOMAIN_TABS + conditional additions
    const allTabIds: string[] = [];

    // Static tabs
    const staticMatches = [...domainPageSrc.matchAll(/\{\s*id:\s*['"](\w+)['"],\s*label:/g)];
    for (const m of staticMatches) allTabIds.push(m[1]);

    // Conditional tabs (like delegation)
    const conditionalMatches = [
      ...domainPageSrc.matchAll(/\{\s*id:\s*['"](\w+)['"]\s*as\s*const/g),
    ];
    for (const m of conditionalMatches) allTabIds.push(m[1]);

    // Each tab must have a tabpanel with matching data-testid
    for (const tabId of allTabIds) {
      const panelTestId = `domain-tabpanel-${tabId}`;
      expect(
        domainPageSrc.includes(panelTestId),
        `Tab '${tabId}' has no tabpanel with data-testid="${panelTestId}"`
      ).toBe(true);
    }
  });

  it('every tabpanel has a corresponding tab', () => {
    // Extract all tabpanel test IDs
    const panelMatches = [...domainPageSrc.matchAll(/data-testid="domain-tabpanel-(\w+)"/g)];
    const panelIds = panelMatches.map((m) => m[1]);

    // Extract all tab IDs (static + conditional)
    const allTabIds: string[] = [];
    const staticMatches = [...domainPageSrc.matchAll(/\{\s*id:\s*['"](\w+)['"],\s*label:/g)];
    for (const m of staticMatches) allTabIds.push(m[1]);
    const conditionalMatches = [
      ...domainPageSrc.matchAll(/\{\s*id:\s*['"](\w+)['"]\s*as\s*const/g),
    ];
    for (const m of conditionalMatches) allTabIds.push(m[1]);

    for (const panelId of panelIds) {
      expect(allTabIds, `Tabpanel '${panelId}' has no corresponding tab in DOMAIN_TABS`).toContain(
        panelId
      );
    }
  });

  it('history tab is always visible (not feature-flagged)', () => {
    // Ensure 'history' is in BASE_TABS, not gated behind a flag
    const baseTabsMatch = domainPageSrc.match(/const\s+BASE_TABS[^=]*=\s*\[([^\]]+)\]/);
    expect(baseTabsMatch, 'BASE_TABS not found').toBeTruthy();
    expect(baseTabsMatch?.[1], 'History tab should be in BASE_TABS (always visible)').toContain(
      "'history'"
    );
  });
});

describe('Feature Flag Hygiene', () => {
  const featuresSrc = readFile(FEATURES_FILE);

  it('every exported function in features.ts is imported by production code', () => {
    // Extract exported function names
    const exportedFunctions = [...featuresSrc.matchAll(/export\s+function\s+(\w+)/g)].map(
      (m) => m[1]
    );

    expect(exportedFunctions.length).toBeGreaterThan(0);

    // Search production code for imports of each function
    const productionFiles = [
      resolve(WEB_ROOT, 'app/routes/domain/$domain.tsx'),
      resolve(WEB_ROOT, 'app/routes/portfolio.tsx'),
      resolve(WEB_ROOT, 'app/routes/index.tsx'),
      resolve(WEB_ROOT, 'app/routes/__root.tsx'),
    ];

    const productionCode = productionFiles
      .map((f) => {
        try {
          return readFile(f);
        } catch {
          return '';
        }
      })
      .join('\n');

    for (const fn of exportedFunctions) {
      expect(
        productionCode.includes(fn),
        `Feature flag function '${fn}' is exported but never imported by any route — dead code`
      ).toBe(true);
    }
  });

  it('FEATURE_FLAGS object only contains entries for existing functions', () => {
    // Extract function names referenced in FEATURE_FLAGS
    const flagBlock = featuresSrc.match(/FEATURE_FLAGS\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
    expect(flagBlock, 'FEATURE_FLAGS not found').toBeTruthy();

    // Extract envVar values
    const envVars = [...(flagBlock?.[1] ?? '').matchAll(/envVar:\s*['"](\w+)['"]/g)].map(
      (m) => m[1]
    );

    // Each envVar should have a corresponding function that reads it
    for (const envVar of envVars) {
      expect(
        featuresSrc.includes(`process.env.${envVar}`),
        `FEATURE_FLAGS entry references '${envVar}' but no function reads process.env.${envVar}`
      ).toBe(true);
    }
  });

  it('no dead feature flag functions (functions that read env vars nobody uses)', () => {
    // Extract all VITE_FEATURE_* env var reads
    const envReads = [...featuresSrc.matchAll(/process\.env\.(VITE_FEATURE_\w+)/g)].map(
      (m) => m[1]
    );

    // Each should appear in FEATURE_FLAGS
    const flagBlock = featuresSrc.match(/FEATURE_FLAGS\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
    expect(flagBlock).toBeTruthy();

    for (const envVar of new Set(envReads)) {
      expect(
        flagBlock?.[1].includes(envVar),
        `Function reads ${envVar} but it's not listed in FEATURE_FLAGS — orphaned flag`
      ).toBe(true);
    }
  });
});
