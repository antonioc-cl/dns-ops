/**
 * Rules Engine Result Types
 *
 * Result-based error handling for rules engine operations.
 */

import { Result, type ResultOrError, ValidationError } from '@dns-ops/contracts';

// Re-export for convenience
export { Result, type ResultOrError } from '@dns-ops/contracts';

/**
 * Rule evaluation error codes
 */
export type RuleErrorCode =
  | 'RULE_EXECUTION_FAILED'
  | 'INVALID_CONTEXT'
  | 'RULE_NOT_FOUND'
  | 'RULESET_NOT_FOUND'
  | 'EVALUATION_TIMEOUT';

/**
 * Rule evaluation error with context
 */
export class RuleError extends ValidationError {
  readonly code: RuleErrorCode;
  readonly ruleId?: string;
  readonly context?: string;

  constructor(args: {
    message: string;
    code: RuleErrorCode;
    ruleId?: string;
    context?: string;
    details?: Record<string, unknown>;
  }) {
    super({
      message: args.message,
      details: { code: args.code, ruleId: args.ruleId, context: args.context, ...args.details },
    });
    this.code = args.code;
    this.ruleId = args.ruleId;
    this.context = args.context;
  }

  /**
   * Create a RULE_EXECUTION_FAILED error
   */
  static executionFailed(ruleId: string, cause: Error): RuleError {
    return new RuleError({
      message: `Rule ${ruleId} execution failed: ${cause.message}`,
      code: 'RULE_EXECUTION_FAILED',
      ruleId,
      details: { cause: cause.message },
    });
  }

  /**
   * Create an INVALID_CONTEXT error
   */
  static invalidContext(field: string, details?: string): RuleError {
    return new RuleError({
      message: `Invalid rule context: ${field}${details ? ` - ${details}` : ''}`,
      code: 'INVALID_CONTEXT',
      context: field,
    });
  }

  /**
   * Create a RULE_NOT_FOUND error
   */
  static ruleNotFound(ruleId: string): RuleError {
    return new RuleError({
      message: `Rule not found: ${ruleId}`,
      code: 'RULE_NOT_FOUND',
      ruleId,
    });
  }
}

/**
 * Type guard for RuleError
 */
export function isRuleError(error: unknown): error is RuleError {
  return error instanceof RuleError;
}

/**
 * Wrap a rule evaluation in a Result
 */
export function ruleResult<T>(fn: () => T, ruleId: string): ResultOrError<T, RuleError> {
  try {
    return Result.ok(fn());
  } catch (e) {
    return Result.err(
      RuleError.executionFailed(ruleId, e instanceof Error ? e : new Error(String(e)))
    );
  }
}

/**
 * Wrap an async rule evaluation in a Result
 */
export async function ruleResultAsync<T>(
  fn: () => Promise<T>,
  ruleId: string
): Promise<ResultOrError<T, RuleError>> {
  try {
    return Result.ok(await fn());
  } catch (e) {
    return Result.err(
      RuleError.executionFailed(ruleId, e instanceof Error ? e : new Error(String(e)))
    );
  }
}

/**
 * Validate rule context and return Result
 */
export function validateRuleContext(
  context: unknown,
  requiredFields: string[]
): ResultOrError<true, RuleError> {
  if (!context || typeof context !== 'object') {
    return Result.err(RuleError.invalidContext('context', 'Context must be an object'));
  }

  const ctx = context as Record<string, unknown>;

  for (const field of requiredFields) {
    if (!(field in ctx) || ctx[field] === undefined || ctx[field] === null) {
      return Result.err(RuleError.invalidContext(field, `Missing required field: ${field}`));
    }
  }

  return Result.ok(true);
}

/**
 * Partition rule results into successes and failures
 */
export function partitionRuleResults<T>(results: ResultOrError<T, RuleError>[]): {
  ok: T[];
  err: RuleError[];
} {
  const [ok, err] = Result.partition(results);
  return { ok, err };
}
