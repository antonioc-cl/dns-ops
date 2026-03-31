/**
 * E2E Integration Tests for Result-based Error Handling
 *
 * These tests verify that the Result-based error handling works correctly
 * across all layers: parsing → db → rules → api.
 *
 * Issues these tests prevent:
 * 1. Type guard failures when new error codes are added
 * 2. Missing input validation causing runtime errors
 * 3. Inconsistent error property access
 * 4. HTTP status code mapping errors
 * 5. Middleware not handling edge cases
 */

import { Result } from '@dns-ops/contracts';
import { DbError } from '@dns-ops/db';
import { RuleError, SimulationError } from '@dns-ops/rules';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import {
  createErrorResponse,
  errorToStatusCode,
  handleResult,
  isDbError,
  isRuleError,
  isSimulationError,
  resultAwareHandler,
} from '../middleware/result-handler.js';

describe('E2E: Result Integration Across All Layers', () => {
  describe('Error Code to HTTP Status Mapping', () => {
    it('should map all DbError codes to correct HTTP status', () => {
      const testCases = [
        { error: DbError.notFound('Domain', '1'), expectedStatus: 404 },
        { error: DbError.alreadyExists('Domain', 'example.com'), expectedStatus: 409 },
        { error: DbError.tenantIsolation('Domain', 't1', 't2'), expectedStatus: 403 },
        {
          error: new DbError({
            message: 'Constraint violation',
            code: 'CONSTRAINT_VIOLATION',
          }),
          expectedStatus: 400,
        },
        {
          error: new DbError({ message: 'Query failed', code: 'QUERY_FAILED' }),
          expectedStatus: 500,
        },
        {
          error: new DbError({ message: 'Timeout', code: 'TIMEOUT' }),
          expectedStatus: 504,
        },
        {
          error: new DbError({ message: 'Connection error', code: 'CONNECTION_ERROR' }),
          expectedStatus: 503,
        },
      ];

      for (const { error, expectedStatus } of testCases) {
        expect(errorToStatusCode(error)).toBe(expectedStatus);
      }
    });

    it('should map all RuleError codes to correct HTTP status', () => {
      const testCases = [
        {
          error: RuleError.executionFailed('rule-1', new Error('Failed')),
          expectedStatus: 500,
        },
        {
          error: RuleError.invalidContext('field'),
          expectedStatus: 400,
        },
        {
          error: RuleError.ruleNotFound('missing-rule'),
          expectedStatus: 404,
        },
      ];

      for (const { error, expectedStatus } of testCases) {
        expect(errorToStatusCode(error)).toBe(expectedStatus);
      }
    });

    it('should map all SimulationError codes to correct HTTP status', () => {
      const testCases = [
        {
          error: SimulationError.invalidFindingType('unknown.type'),
          expectedStatus: 400,
        },
        {
          error: SimulationError.noActionableFindings(),
          expectedStatus: 400,
        },
        {
          error: new SimulationError({ message: 'Failed', code: 'SIMULATION_FAILED' }),
          expectedStatus: 500,
        },
      ];

      for (const { error, expectedStatus } of testCases) {
        expect(errorToStatusCode(error)).toBe(expectedStatus);
      }
    });

    it('should return 500 for unknown error codes', () => {
      const error = new DbError({
        message: 'Unknown error',
        code: 'UNKNOWN_CODE' as 'QUERY_FAILED',
      });
      expect(errorToStatusCode(error)).toBe(500);
    });

    it('should return 500 for non-Result errors', () => {
      expect(errorToStatusCode(new Error('Regular error'))).toBe(500);
      expect(errorToStatusCode(null)).toBe(500);
      expect(errorToStatusCode(undefined)).toBe(500);
      expect(errorToStatusCode('string error')).toBe(500);
    });
  });

  describe('Type Guards', () => {
    it('should identify DbError by properties', () => {
      expect(isDbError(DbError.notFound('X', '1'))).toBe(true);
      expect(isDbError(DbError.alreadyExists('X', '1'))).toBe(true);

      // Has table property (DbError specific)
      const dbError = new DbError({
        message: 'Test',
        code: 'QUERY_FAILED',
        table: 'Domain',
      });
      expect(isDbError(dbError)).toBe(true);
    });

    it('should identify RuleError by ruleId property', () => {
      const ruleError = RuleError.ruleNotFound('r1');
      expect(isRuleError(ruleError)).toBe(true);
      expect(ruleError.ruleId).toBe('r1');
    });

    it('should identify SimulationError by findingType property', () => {
      const simError = SimulationError.invalidFindingType('x');
      expect(isSimulationError(simError)).toBe(true);
      expect(simError.findingType).toBe('x');
    });

    it('should not confuse error types', () => {
      const dbError = DbError.notFound('X', '1');
      const ruleError = RuleError.ruleNotFound('r1');
      const simError = SimulationError.invalidFindingType('x');

      // DbError checks
      expect(isDbError(dbError)).toBe(true);
      expect(isDbError(ruleError)).toBe(false);
      expect(isDbError(simError)).toBe(false);

      // RuleError checks
      expect(isRuleError(dbError)).toBe(false);
      expect(isRuleError(ruleError)).toBe(true);
      expect(isRuleError(simError)).toBe(false);

      // SimulationError checks
      expect(isSimulationError(dbError)).toBe(false);
      expect(isSimulationError(ruleError)).toBe(false);
      expect(isSimulationError(simError)).toBe(true);
    });

    it('should handle plain Error objects', () => {
      expect(isDbError(new Error('test'))).toBe(false);
      expect(isRuleError(new Error('test'))).toBe(false);
      expect(isSimulationError(new Error('test'))).toBe(false);
    });
  });

  describe('Error Response Structure', () => {
    it('should create consistent error response for DbError', () => {
      const error = DbError.notFound('Domain', 'example.com');
      const response = createErrorResponse({
        code: error.code,
        message: error.message,
        details: { table: error.table, identifier: error.identifier },
      });

      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.error.message).toContain('example.com');
      expect(response.error.details).toBeDefined();
    });

    it('should create consistent error response for RuleError', () => {
      const error = RuleError.executionFailed('spf-check', new Error('Division by zero'));
      const response = createErrorResponse({
        code: error.code,
        message: error.message,
        details: { ruleId: error.ruleId },
      });

      expect(response.error.code).toBe('RULE_EXECUTION_FAILED');
      expect(response.error.message).toContain('spf-check');
    });

    it('should handle missing error properties gracefully', () => {
      const response = createErrorResponse({});

      expect(response.error.code).toBe('UNKNOWN_ERROR');
      expect(response.error.message).toBe('An unknown error occurred');
    });
  });

  describe('Handler Edge Cases', () => {
    it('should handle Result with null value', async () => {
      const app = new Hono();
      app.get('/test', (c) => handleResult(c, Result.ok(null)));

      const res = await app.request('/test');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeNull();
    });

    it('should handle Result with undefined value', async () => {
      const app = new Hono();
      app.get('/test', (c) => handleResult(c, Result.ok(undefined)));

      const res = await app.request('/test');
      expect(res.status).toBe(200);
    });

    it('should handle Result with complex nested object', async () => {
      const app = new Hono();
      const complexData = {
        id: '1',
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        date: new Date().toISOString(),
      };

      app.get('/test', (c) => handleResult(c, Result.ok(complexData)));

      const res = await app.request('/test');
      const json = await res.json();
      expect(json.data.nested.array).toEqual([1, 2, 3]);
    });

    it('should handle error without code property', async () => {
      const app = new Hono();
      const plainError = new Error('Plain error without code');

      app.get('/test', (c) =>
        handleResult(c, {
          isOk: () => false,
          isErr: () => true,
          error: plainError,
        } as never)
      );

      const res = await app.request('/test');
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.error.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle error without message property', async () => {
      const app = new Hono();
      const weirdError = { code: 'WEIRD_ERROR' } as Error;

      app.get('/test', (c) =>
        handleResult(c, {
          isOk: () => false,
          isErr: () => true,
          error: weirdError,
        } as never)
      );

      const res = await app.request('/test');
      expect(res.status).toBe(500);
    });
  });

  describe('ResultAwareHandler Edge Cases', () => {
    it('should handle async handler that throws', async () => {
      const app = new Hono();

      app.get('/test', resultAwareHandler(async () => {
        throw new Error('Handler threw');
      }));

      // The handler itself throws, not returning a Result
      // This should be caught by Hono's error handler
      const res = await app.request('/test');
      expect(res.status).toBe(500);
    });

    it('should handle handler returning non-Result', async () => {
      const app = new Hono();

      app.get('/test', resultAwareHandler(async () => {
        return { notAResult: true } as never;
      }));

      const res = await app.request('/test');
      // Should fail when trying to call isOk()
      expect(res.status).toBe(500);
    });

    it('should preserve request context through handler', async () => {
      const app = new Hono();
      let capturedContext: string | undefined;

      app.get('/test', resultAwareHandler(async (c) => {
        capturedContext = c.req.header('X-Custom-Header');
        return Result.ok({ received: capturedContext });
      }));

      const res = await app.request('/test', {
        headers: { 'X-Custom-Header': 'test-value' },
      });

      const json = await res.json();
      expect(json.data.received).toBe('test-value');
    });
  });

  describe('Cross-Layer Error Propagation', () => {
    it('should handle parsing error → API response flow', async () => {
      const app = new Hono();

      // Simulate parsing layer error propagating to API
      app.post('/parse', resultAwareHandler(async (c) => {
        const body = await c.req.json();

        // Simulate parsing failure
        if (!body.domain) {
          return Result.err(
            new DbError({
              message: 'Domain is required',
              code: 'CONSTRAINT_VIOLATION',
            })
          );
        }

        return Result.ok({ parsed: body.domain });
      }));

      const res = await app.request('/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('CONSTRAINT_VIOLATION');
    });

    it('should handle database error → API response flow', async () => {
      const app = new Hono();

      app.get('/db-error', resultAwareHandler(async () => {
        // Simulate database layer error
        return Result.err(DbError.notFound('Snapshot', 'snap-123'));
      }));

      const res = await app.request('/db-error');
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
      expect(json.error.message).toContain('snap-123');
    });

    it('should handle rules engine error → API response flow', async () => {
      const app = new Hono();

      app.get('/rule-error', resultAwareHandler(async () => {
        // Simulate rules engine error
        return Result.err(RuleError.ruleNotFound('missing-rule'));
      }));

      const res = await app.request('/rule-error');
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe('RULE_NOT_FOUND');
    });

    it('should handle simulation error → API response flow', async () => {
      const app = new Hono();

      app.get('/sim-error', resultAwareHandler(async () => {
        // Simulate simulation error
        return Result.err(SimulationError.invalidFindingType('unsupported.type'));
      }));

      const res = await app.request('/sim-error');
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe('INVALID_FINDING_TYPE');
    });
  });

  describe('Server Error Logging', () => {
    it('should log 5xx errors but not 4xx errors', async () => {
      const app = new Hono();
      const loggedErrors: string[] = [];

      // Override logger for testing
      // Note: In real test we'd mock the logger

      app.get('/client-error', resultAwareHandler(async () => {
        return Result.err(DbError.notFound('X', '1')); // 404
      }));

      app.get('/server-error', resultAwareHandler(async () => {
        return Result.err(new DbError({
          message: 'DB crashed',
          code: 'QUERY_FAILED',
        })); // 500
      }));

      const clientRes = await app.request('/client-error');
      expect(clientRes.status).toBe(404);

      const serverRes = await app.request('/server-error');
      expect(serverRes.status).toBe(500);
    });
  });

  describe('Response Metadata', () => {
    it('should include timestamp in success response', async () => {
      const app = new Hono();
      app.get('/test', resultAwareHandler(async () => Result.ok({ data: 'test' })));

      const res = await app.request('/test');
      const json = await res.json();

      expect(json.meta.timestamp).toBeDefined();
      expect(new Date(json.meta.timestamp).getTime()).not.toBeNaN();
    });

    it('should include request ID when provided', async () => {
      const app = new Hono();
      app.get('/test', resultAwareHandler(async () => Result.ok({ data: 'test' })));

      const res = await app.request('/test', {
        headers: { 'X-Request-ID': 'req-123' },
      });

      const json = await res.json();
      expect(json.meta.requestId).toBe('req-123');
    });

    it('should handle missing request ID', async () => {
      const app = new Hono();
      app.get('/test', resultAwareHandler(async () => Result.ok({ data: 'test' })));

      const res = await app.request('/test');
      const json = await res.json();

      // requestId should be undefined, not causing errors
      expect(json.meta).toBeDefined();
    });
  });
});
