import { Result } from '@dns-ops/contracts';
import { describe, expect, it } from 'vitest';
import {
  isRuleError,
  partitionRuleResults,
  RuleError,
  ruleResult,
  ruleResultAsync,
  validateRuleContext,
} from './result.js';

describe('Rule Result Utilities', () => {
  describe('RuleError', () => {
    it('should create a basic RuleError', () => {
      const error = new RuleError({
        message: 'Test error',
        code: 'RULE_EXECUTION_FAILED',
        ruleId: 'rule-123',
      });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('RULE_EXECUTION_FAILED');
      expect(error.ruleId).toBe('rule-123');
      expect(error._tag).toBe('ValidationError');
    });

    it('should create execution failed error', () => {
      const cause = new Error('Division by zero');
      const error = RuleError.executionFailed('spf-check', cause);

      expect(error.code).toBe('RULE_EXECUTION_FAILED');
      expect(error.ruleId).toBe('spf-check');
      expect(error.message).toContain('Division by zero');
    });

    it('should create invalid context error', () => {
      const error = RuleError.invalidContext('domainName', 'Cannot be empty');

      expect(error.code).toBe('INVALID_CONTEXT');
      expect(error.context).toBe('domainName');
      expect(error.message).toContain('Cannot be empty');
    });

    it('should create rule not found error', () => {
      const error = RuleError.ruleNotFound('missing-rule');

      expect(error.code).toBe('RULE_NOT_FOUND');
      expect(error.ruleId).toBe('missing-rule');
      expect(error.message).toContain('missing-rule');
    });

    it('should include details in error', () => {
      const error = new RuleError({
        message: 'Complex error',
        code: 'RULE_EXECUTION_FAILED',
        ruleId: 'test-rule',
        details: { stack: 'line 1\nline 2', input: { value: 42 } },
      });

      expect(error.details?.stack).toBe('line 1\nline 2');
      expect(error.details?.input).toEqual({ value: 42 });
    });
  });

  describe('isRuleError', () => {
    it('should return true for RuleError', () => {
      const error = RuleError.ruleNotFound('test');
      expect(isRuleError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isRuleError(new Error('test'))).toBe(false);
    });

    it('should return false for null', () => {
      expect(isRuleError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRuleError(undefined)).toBe(false);
    });
  });

  describe('ruleResult', () => {
    it('should return Ok for successful evaluation', () => {
      const result = ruleResult(() => ({ finding: 'test' }), 'rule-1');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ finding: 'test' });
      }
    });

    it('should return Err for failed evaluation', () => {
      const result = ruleResult(() => {
        throw new Error('Something went wrong');
      }, 'rule-1');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('RULE_EXECUTION_FAILED');
        expect(result.error.ruleId).toBe('rule-1');
      }
    });

    it('should handle non-Error throws', () => {
      const result = ruleResult(() => {
        throw 'String error';
      }, 'rule-1');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('String error');
      }
    });
  });

  describe('ruleResultAsync', () => {
    it('should return Ok for successful async evaluation', async () => {
      const result = await ruleResultAsync(async () => ({ data: 'async result' }), 'async-rule');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ data: 'async result' });
      }
    });

    it('should return Err for failed async evaluation', async () => {
      const result = await ruleResultAsync(async () => {
        throw new Error('Async failure');
      }, 'async-rule');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('RULE_EXECUTION_FAILED');
        expect(result.error.ruleId).toBe('async-rule');
      }
    });
  });

  describe('validateRuleContext', () => {
    it('should return Ok for valid context', () => {
      const context = {
        snapshotId: 'snap-1',
        domainId: 'domain-1',
        domainName: 'example.com',
      };

      const result = validateRuleContext(context, ['snapshotId', 'domainId']);

      expect(result.isOk()).toBe(true);
    });

    it('should return Err for null context', () => {
      const result = validateRuleContext(null, ['snapshotId']);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CONTEXT');
      }
    });

    it('should return Err for missing required field', () => {
      const context = { snapshotId: 'snap-1' };

      const result = validateRuleContext(context, ['snapshotId', 'domainId']);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CONTEXT');
        expect(result.error.context).toBe('domainId');
      }
    });

    it('should return Err for undefined required field', () => {
      const context = { snapshotId: 'snap-1', domainId: undefined };

      const result = validateRuleContext(context, ['snapshotId', 'domainId']);

      expect(result.isErr()).toBe(true);
    });

    it('should return Ok for extra fields', () => {
      const context = {
        snapshotId: 'snap-1',
        domainId: 'domain-1',
        extraField: 'extra',
      };

      const result = validateRuleContext(context, ['snapshotId', 'domainId']);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('partitionRuleResults', () => {
    it('should separate successes and failures', () => {
      const results = [
        Result.ok({ finding: 'a' }),
        Result.err(RuleError.ruleNotFound('rule-1')),
        Result.ok({ finding: 'b' }),
        Result.err(RuleError.invalidContext('field')),
      ];

      const { ok, err } = partitionRuleResults(results);

      expect(ok).toHaveLength(2);
      expect(err).toHaveLength(2);
      expect(ok[0]).toEqual({ finding: 'a' });
      expect(ok[1]).toEqual({ finding: 'b' });
    });

    it('should handle all successes', () => {
      const results = [
        Result.ok({ finding: 'a' }),
        Result.ok({ finding: 'b' }),
        Result.ok({ finding: 'c' }),
      ];

      const { ok, err } = partitionRuleResults(results);

      expect(ok).toHaveLength(3);
      expect(err).toHaveLength(0);
    });

    it('should handle all failures', () => {
      const results = [
        Result.err(RuleError.ruleNotFound('rule-1')),
        Result.err(RuleError.ruleNotFound('rule-2')),
      ];

      const { ok, err } = partitionRuleResults(results);

      expect(ok).toHaveLength(0);
      expect(err).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const { ok, err } = partitionRuleResults([]);

      expect(ok).toHaveLength(0);
      expect(err).toHaveLength(0);
    });
  });
});
