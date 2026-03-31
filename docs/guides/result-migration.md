# Result Type Migration Guide

This guide covers the gradual migration from exception-based error handling to explicit `Result` types using [`better-result`](https://npmx.dev/package/better-result).

## Overview

We're adopting `better-result` for:
- **Explicit error handling** — Errors are part of the type signature
- **Composability** — Chain operations without try/catch spaghetti
- **Type safety** — Compiler forces error handling
- **Better DX** — Pattern matching and helper utilities

## Installation

Already installed across packages:

```bash
# Root workspace
bun add better-result -D

# Individual packages
cd packages/parsing && bun add better-result
cd packages/contracts && bun add better-result
cd packages/db && bun add better-result
cd packages/rules && bun add better-result
```

## Quick Start

### Basic Usage

```typescript
import { Result } from '@dns-ops/contracts';

// Instead of try/catch
const result = normalizeDomainResult('Example.COM');

// Check with type guards
if (Result.isOk(result)) {
  console.log(result.value.normalized); // 'example.com'
} else {
  console.error(result.error.code); // Error code
}

// Or pattern matching
const message = result.match({
  ok: (d) => `Success: ${d.normalized}`,
  err: (e) => `Error: ${e.message}`,
});
```

## Migration Patterns

### 1. Domain Normalization (DONE)

**Before:**
```typescript
// Throws or returns null
try {
  const domain = normalizeDomain(input);
} catch (e) {
  if (e instanceof DomainNormalizationError) {
    // handle
  }
}

// Or lose error context
const domain = tryNormalizeDomain(input);
if (!domain) {
  // Why did it fail?
}
```

**After:**
```typescript
import { normalizeDomainResult } from '@dns-ops/parsing';

const result = normalizeDomainResult(input);

if (Result.isOk(result)) {
  useDomain(result.value);
} else {
  // Full error context available
  logError({
    code: result.error.code,
    message: result.error.message,
    domain: result.error.domain,
  });
}
```

### 2. Database Operations (TODO)

**Before:**
```typescript
const domain = await repo.findById(id); // May throw
```

**After (planned):**
```typescript
const result = await repo.findByIdResult(id);

if (Result.isErr(result)) {
  if (result.error instanceof TenantIsolationError) {
    // Specific handling
  }
  return handleError(result.error);
}
```

### 3. API Routes (TODO)

**Before:**
```typescript
app.post('/api/domains', async (c) => {
  try {
    const body = await c.req.json();
    const domain = normalizeDomain(body.name);
    // ...
  } catch (e) {
    return c.json({ error: e.message }, 400);
  }
});
```

**After (planned):**
```typescript
app.post('/api/domains', async (c) => {
  const body = await c.req.json();
  const result = normalizeDomainResult(body.name);
  
  if (Result.isErr(result)) {
    return c.json({ 
      error: result.error.message,
      code: result.error.code 
    }, result.error.statusCode);
  }
  
  // Continue with result.value
});
```

## Available Utilities

### From `@dns-ops/contracts`

```typescript
import {
  Result,
  DomainError,
  ValidationError,
  NotFoundError,
  TenantIsolationError,
  DatabaseError,
  ParseError,
  NetworkError,
  resultify,
  resultifyAsync,
  matchResult,
  unwrapOr,
  mapError,
} from '@dns-ops/contracts';
```

### From `@dns-ops/parsing`

```typescript
import {
  // Result-based domain normalization
  normalizeDomainResult,
  normalizeDomainsResult,
  partitionDomainResults,
  DomainValidationError,
  
  // Legacy bridge
  tryNormalizeDomainResult,
} from '@dns-ops/parsing';
```

## Error Types

All errors extend `DomainError` with:
- `code`: Machine-readable error code
- `statusCode`: HTTP status code for API responses
- `message`: Human-readable description

```typescript
abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
}
```

## Best Practices

1. **Use Result types at system boundaries** (API, parsing, external calls)
2. **Keep throwing internally** where errors are truly exceptional
3. **Convert to Result before crossing package boundaries**
4. **Use pattern matching for complex logic**
5. **Batch operations with `partitionDomainResults` pattern**

## Migration Checklist

- [x] Install `better-result` in all packages
- [x] Create shared error types in `packages/contracts`
- [x] Domain normalization with Result types
- [ ] DNS parsing with Result types
- [ ] Database repository Result variants
- [ ] API route Result-based handlers
- [ ] Rules engine Result integration
- [ ] Migration guide updates

## Testing

Run Result-based tests:

```bash
bun test packages/parsing/src/domain/result.test.ts
```

## Resources

- [better-result docs](https://npmx.dev/package/better-result)
- [`packages/contracts/src/result.ts`](../../packages/contracts/src/result.ts)
- [`packages/parsing/src/domain/result.ts`](../../packages/parsing/src/domain/result.ts)
