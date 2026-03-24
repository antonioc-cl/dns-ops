# Test Runner Decision: Bun vs pnpm/npm

## Current Situation

The project uses Bun as the package manager and runtime (has `bun.lock` file).
However, Bun's test runner has incomplete Vitest API compatibility.

## Test Results Comparison

### With Bun (`bun test`)
- 434 pass
- 57 fail  
- 33 skip

**Main failures:**
- `vi.hoisted()` - Not implemented in Bun
- `vi.setSystemTime()` - Not implemented in Bun
- `vi.mocked()` - Not implemented in Bun

### With Node/npm (`npm test`)
- 510 pass
- 3 fail
- 31 skip

**Only 3 tests fail**, all in `collector.authoritative.test.ts` due to complex module mocking.

## Recommendation

### Option 1: Use pnpm for tests (Recommended)
Keep Bun for package management (fast installs) but use pnpm/npm for running tests.

**Pros:**
- Full Vitest API compatibility
- Only 3 tests fail vs 57 with Bun
- Minimal changes needed

**Cons:**
- Two tools needed (Bun for install, pnpm for test)
- Slightly slower test runs

**Implementation:**
```yaml
# In CI:
- name: Install dependencies
  run: bun install --frozen-lockfile

- name: Test
  run: pnpm test  # or npm test
```

### Option 2: Fix tests for Bun compatibility
Rewrite tests to avoid unsupported Vitest APIs.

**Pros:**
- Single tool (Bun) for everything
- Fast test runs

**Cons:**
- Significant effort (57 tests need rewriting)
- May lose some testing capabilities
- Ongoing maintenance burden

**Changes needed:**
- Replace `vi.hoisted()` with regular mocks
- Replace `vi.setSystemTime()` with Date mocking
- Replace `vi.mocked()` with type assertions

### Option 3: Switch to pnpm entirely
Replace Bun with pnpm for everything.

**Pros:**
- Single tool
- Full ecosystem compatibility

**Cons:**
- Slower installs
- Need to regenerate lockfile
- All developers need to switch

## Decision

**Recommended: Option 1** - Use Bun for package management, pnpm for tests.

This gives us:
1. Fast installs with Bun
2. Full test compatibility with pnpm
3. Minimal disruption to existing workflow

## Action Items

1. Update CI to use pnpm for test step
2. Document in README that pnpm is required for running tests
3. Keep Bun for all other operations (install, lint, typecheck, build)
