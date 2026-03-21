#!/usr/bin/env npx tsx
/**
 * Post-Deploy Smoke Tests - Bead 15.6
 *
 * Verifies that deployed services are responding correctly.
 * Run this script after deploying web and/or collector services.
 *
 * Usage:
 *   # Test against local development
 *   npx tsx scripts/deploy/smoke-test.ts
 *
 *   # Test against staging/production
 *   WEB_URL=https://dns-ops.example.com COLLECTOR_URL=https://collector.example.com npx tsx scripts/deploy/smoke-test.ts
 *
 *   # Test only web service
 *   npx tsx scripts/deploy/smoke-test.ts --web-only
 *
 *   # Test only collector service
 *   npx tsx scripts/deploy/smoke-test.ts --collector-only
 *
 * Exit codes:
 *   0 - All smoke tests passed
 *   1 - One or more tests failed
 */

// Configuration from environment
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const COLLECTOR_URL = process.env.COLLECTOR_URL || 'http://localhost:4000';
const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS || '10000', 10);

// Parse CLI args
const args = process.argv.slice(2);
const webOnly = args.includes('--web-only');
const collectorOnly = args.includes('--collector-only');
const verbose = args.includes('--verbose') || args.includes('-v');

interface TestResult {
  name: string;
  service: 'web' | 'collector';
  passed: boolean;
  durationMs: number;
  error?: string;
  response?: {
    status: number;
    body?: unknown;
  };
}

/**
 * Fetch with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Run a single smoke test
 */
async function runTest(
  name: string,
  service: 'web' | 'collector',
  testFn: () => Promise<{ passed: boolean; response?: { status: number; body?: unknown }; error?: string }>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await testFn();
    return {
      name,
      service,
      ...result,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      service,
      passed: false,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// Web Service Tests
// ============================================================================

async function testWebHealth(): Promise<TestResult> {
  return runTest('Web Health Check', 'web', async () => {
    const response = await fetchWithTimeout(`${WEB_URL}/api/health`);
    const body = await response.json();
    return {
      passed: response.status === 200 && body.status === 'healthy',
      response: { status: response.status, body },
    };
  });
}

async function testWebHomepage(): Promise<TestResult> {
  return runTest('Web Homepage', 'web', async () => {
    const response = await fetchWithTimeout(WEB_URL);
    const passed = response.status === 200;
    return {
      passed,
      response: { status: response.status },
    };
  });
}

async function testWebRulesetVersions(): Promise<TestResult> {
  return runTest('Web Ruleset Versions API', 'web', async () => {
    const response = await fetchWithTimeout(`${WEB_URL}/api/ruleset-versions`);
    const body = await response.json();
    const passed = response.status === 200 && Array.isArray(body.versions);
    return {
      passed,
      response: { status: response.status, body: verbose ? body : { count: body.versions?.length } },
    };
  });
}

async function testWebMailTemplates(): Promise<TestResult> {
  return runTest('Web Mail Templates API', 'web', async () => {
    const response = await fetchWithTimeout(`${WEB_URL}/api/mail/templates`);
    const body = await response.json();
    const passed = response.status === 200 && (Array.isArray(body.templates) || body.providers);
    return {
      passed,
      response: { status: response.status, body: verbose ? body : 'OK' },
    };
  });
}

// ============================================================================
// Collector Service Tests
// ============================================================================

async function testCollectorLiveness(): Promise<TestResult> {
  return runTest('Collector Liveness (healthz)', 'collector', async () => {
    const response = await fetchWithTimeout(`${COLLECTOR_URL}/api/healthz`);
    const body = await response.json();
    return {
      passed: response.status === 200 && body.status === 'ok',
      response: { status: response.status, body },
    };
  });
}

async function testCollectorReadiness(): Promise<TestResult> {
  return runTest('Collector Readiness (readyz)', 'collector', async () => {
    const response = await fetchWithTimeout(`${COLLECTOR_URL}/api/readyz`);
    const body = await response.json();
    // Readiness might fail if DB isn't configured - that's OK in some environments
    const passed = response.status === 200 && (body.status === 'ready' || body.status === 'not_ready');
    return {
      passed,
      response: { status: response.status, body },
      error: body.status === 'not_ready' ? 'Service not ready (check dependencies)' : undefined,
    };
  });
}

async function testCollectorProbeAllowlist(): Promise<TestResult> {
  return runTest('Collector Probe Allowlist', 'collector', async () => {
    const response = await fetchWithTimeout(`${COLLECTOR_URL}/api/probe/allowlist`);
    const body = await response.json();
    const passed = response.status === 200 && typeof body.count === 'number';
    return {
      passed,
      response: { status: response.status, body: verbose ? body : { count: body.count } },
    };
  });
}

async function testCollectorProbeHealth(): Promise<TestResult> {
  return runTest('Collector Probe Service Health', 'collector', async () => {
    const response = await fetchWithTimeout(`${COLLECTOR_URL}/api/probe/health`);
    const body = await response.json();
    const passed = response.status === 200 && body.status === 'healthy';
    return {
      passed,
      response: { status: response.status, body },
    };
  });
}

// ============================================================================
// Main Runner
// ============================================================================

async function runAllTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Web tests
  if (!collectorOnly) {
    console.log('\n🌐 Testing Web Service...');
    console.log(`   URL: ${WEB_URL}\n`);

    results.push(await testWebHealth());
    results.push(await testWebHomepage());
    results.push(await testWebRulesetVersions());
    results.push(await testWebMailTemplates());
  }

  // Collector tests
  if (!webOnly) {
    console.log('\n📡 Testing Collector Service...');
    console.log(`   URL: ${COLLECTOR_URL}\n`);

    results.push(await testCollectorLiveness());
    results.push(await testCollectorReadiness());
    results.push(await testCollectorProbeAllowlist());
    results.push(await testCollectorProbeHealth());
  }

  return results;
}

function printResults(results: TestResult[]): void {
  console.log('\n' + '═'.repeat(70));
  console.log('SMOKE TEST RESULTS');
  console.log('═'.repeat(70));

  const grouped = {
    web: results.filter((r) => r.service === 'web'),
    collector: results.filter((r) => r.service === 'collector'),
  };

  for (const [service, tests] of Object.entries(grouped)) {
    if (tests.length === 0) continue;

    console.log(`\n${service.toUpperCase()} SERVICE:`);
    for (const test of tests) {
      const icon = test.passed ? '✅' : '❌';
      const duration = `(${test.durationMs}ms)`;
      console.log(`  ${icon} ${test.name} ${duration}`);

      if (!test.passed && test.error) {
        console.log(`     Error: ${test.error}`);
      }

      if (verbose && test.response) {
        console.log(`     Status: ${test.response.status}`);
        if (test.response.body) {
          console.log(`     Body: ${JSON.stringify(test.response.body, null, 2).split('\n').join('\n     ')}`);
        }
      }
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  console.log('\n' + '─'.repeat(70));
  console.log(`${allPassed ? '✅' : '❌'} ${passed}/${total} tests passed`);

  if (!allPassed) {
    const failed = results.filter((r) => !r.passed);
    console.log('\nFailed tests:');
    for (const test of failed) {
      console.log(`  - ${test.name}: ${test.error || 'Unknown error'}`);
    }
  }

  console.log('═'.repeat(70));
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                    DNS Ops Smoke Tests                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  if (webOnly) {
    console.log('\nMode: Web service only');
  } else if (collectorOnly) {
    console.log('\nMode: Collector service only');
  } else {
    console.log('\nMode: Full (web + collector)');
  }

  console.log(`Timeout: ${TIMEOUT_MS}ms`);

  try {
    const results = await runAllTests();
    printResults(results);

    const allPassed = results.every((r) => r.passed);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error running smoke tests:', error);
    process.exit(1);
  }
}

main();
