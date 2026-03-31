/**
 * Result Handler Middleware Tests
 */

import { DbError } from '@dns-ops/db';
import { RuleError } from '@dns-ops/rules';
import { Result } from '@dns-ops/contracts';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import {
  createErrorResponse,
  errorToStatusCode,
  handleResult,
  handleResultWithStatus,
  isDbError,
  isRuleError,
  resultAwareHandler,
} from './result-handler.js';

describe('Result Handler Middleware', () => {
  describe('errorToStatusCode', () => {
    it('should return 404 for NOT_FOUND', () => {
      expect(errorToStatusCode({ code: 'NOT_FOUND' })).toBe(404);
    });

    it('should return 409 for ALREADY_EXISTS', () => {
      expect(errorToStatusCode({ code: 'ALREADY_EXISTS' })).toBe(409);
    });

    it('should return 403 for TENANT_ISOLATION', () => {
      expect(errorToStatusCode({ code: 'TENANT_ISOLATION' })).toBe(403);
    });

    it('should return 400 for CONSTRAINT_VIOLATION', () => {
      expect(errorToStatusCode({ code: 'CONSTRAINT_VIOLATION' })).toBe(400);
    });

    it('should return 500 for QUERY_FAILED', () => {
      expect(errorToStatusCode({ code: 'QUERY_FAILED' })).toBe(500);
    });

    it('should return 500 for unknown error codes', () => {
      expect(errorToStatusCode({ code: 'UNKNOWN_CODE' })).toBe(500);
    });

    it('should return 500 for missing code', () => {
      expect(errorToStatusCode({})).toBe(500);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with all fields', () => {
      const response = createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Domain not found',
        details: { domain: 'example.com' },
      });

      expect(response.error.code).toBe('NOT_FOUND');
      expect(response.error.message).toBe('Domain not found');
      expect(response.error.details).toEqual({ domain: 'example.com' });
    });

    it('should use defaults for missing fields', () => {
      const response = createErrorResponse({});

      expect(response.error.code).toBe('UNKNOWN_ERROR');
      expect(response.error.message).toBe('An unknown error occurred');
    });
  });

  describe('isDbError', () => {
    it('should return true for DbError', () => {
      const error = DbError.notFound('Domain', 'id');
      expect(isDbError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isDbError(new Error('test'))).toBe(false);
    });

    it('should return false for RuleError', () => {
      const error = RuleError.ruleNotFound('rule-1');
      expect(isDbError(error)).toBe(false);
    });

    it('should return true for DbError with any code', () => {
      // Test with a code that might be added in the future
      const error = new DbError({
        message: 'Custom error',
        code: 'FUTURE_ERROR_CODE',
      });
      expect(isDbError(error)).toBe(true);
    });
  });

  describe('isRuleError', () => {
    it('should return true for RuleError with known code', () => {
      const error = RuleError.ruleNotFound('rule-1');
      expect(isRuleError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isRuleError(new Error('test'))).toBe(false);
    });

    it('should return false for DbError', () => {
      const error = DbError.notFound('Domain', 'id');
      expect(isRuleError(error)).toBe(false);
    });
  });

  describe('resultAwareHandler', () => {
    it('should return success response for Ok result', async () => {
      const app = new Hono();

      app.get('/test', resultAwareHandler(async () => Result.ok({ id: '1', name: 'Test' })));

      const res = await app.request('/test');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toEqual({ id: '1', name: 'Test' });
      expect(json.meta.timestamp).toBeDefined();
    });

    it('should return error response for Err result', async () => {
      const app = new Hono();

      app.get('/test', resultAwareHandler(async () => 
        Result.err(DbError.notFound('Domain', 'missing-id'))
      ));

      const res = await app.request('/test');
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe('NOT_FOUND');
      expect(json.error.message).toContain('missing-id');
    });

    it('should use custom success status', async () => {
      const app = new Hono();

      app.post('/test', resultAwareHandler(async () => 
        Result.ok({ created: true }), 201
      ));

      const res = await app.request('/test', { method: 'POST' });
      expect(res.status).toBe(201);
    });
  });
});
