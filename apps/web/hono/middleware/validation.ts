/**
 * Request Body Validation Middleware
 *
 * Provides schema-based validation for JSON request bodies with explicit 4xx errors.
 * Supports both inline validation and reusable schemas.
 */

import type { Context } from 'hono';

/**
 * Validation result with explicit success/error typing
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError };

/**
 * Structured validation error
 */
export interface ValidationError {
  code: 'INVALID_JSON' | 'VALIDATION_ERROR' | 'MISSING_FIELD' | 'INVALID_FORMAT';
  message: string;
  field?: string;
  details?: Record<string, string>;
}

/**
 * Field validator function type
 */
export type FieldValidator<T> = (value: unknown) => T;

/**
 * Schema definition with field validators
 */
export type Schema<T> = {
  [K in keyof T]: FieldValidator<T[K]>;
};

/**
 * Create a validator for required string fields
 */
export function requiredString(
  fieldName: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  }
): FieldValidator<string> {
  return (value: unknown): string => {
    if (value === undefined || value === null) {
      throw new FieldValidationError(fieldName, 'MISSING_FIELD', `${fieldName} is required`);
    }
    if (typeof value !== 'string') {
      throw new FieldValidationError(fieldName, 'INVALID_FORMAT', `${fieldName} must be a string`);
    }
    if (options?.minLength && value.length < options.minLength) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be at least ${options.minLength} characters`
      );
    }
    if (options?.maxLength && value.length > options.maxLength) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be at most ${options.maxLength} characters`
      );
    }
    if (options?.pattern && !options.pattern.test(value)) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        options.patternMessage || `${fieldName} has invalid format`
      );
    }
    return value;
  };
}

/**
 * Create a validator for optional string fields
 */
export function optionalString(
  fieldName: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  }
): FieldValidator<string | undefined> {
  return (value: unknown): string | undefined => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return requiredString(fieldName, options)(value);
  };
}

/**
 * Create a validator for required array fields
 */
export function requiredArray<T>(
  fieldName: string,
  itemValidator?: (item: unknown, index: number) => T,
  options?: { minLength?: number; maxLength?: number }
): FieldValidator<T[]> {
  return (value: unknown): T[] => {
    if (value === undefined || value === null) {
      throw new FieldValidationError(fieldName, 'MISSING_FIELD', `${fieldName} is required`);
    }
    if (!Array.isArray(value)) {
      throw new FieldValidationError(fieldName, 'INVALID_FORMAT', `${fieldName} must be an array`);
    }
    if (options?.minLength && value.length < options.minLength) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must have at least ${options.minLength} items`
      );
    }
    if (options?.maxLength && value.length > options.maxLength) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must have at most ${options.maxLength} items`
      );
    }
    if (itemValidator) {
      return value.map((item, i) => itemValidator(item, i));
    }
    return value as T[];
  };
}

/**
 * Create a validator for optional array fields
 */
export function optionalArray<T>(
  fieldName: string,
  itemValidator?: (item: unknown, index: number) => T
): FieldValidator<T[] | undefined> {
  return (value: unknown): T[] | undefined => {
    if (value === undefined || value === null) {
      return undefined;
    }
    return requiredArray<T>(fieldName, itemValidator)(value);
  };
}

/**
 * Create a validator for enum/literal values
 */
export function enumValue<T extends string>(
  fieldName: string,
  allowed: readonly T[],
  required = true
): FieldValidator<T | undefined> {
  return (value: unknown): T | undefined => {
    if (value === undefined || value === null) {
      if (required) {
        throw new FieldValidationError(fieldName, 'MISSING_FIELD', `${fieldName} is required`);
      }
      return undefined;
    }
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be one of: ${allowed.join(', ')}`
      );
    }
    return value as T;
  };
}

/**
 * Create a validator for UUID fields
 */
export function uuid(fieldName: string, required = true): FieldValidator<string | undefined> {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return (value: unknown): string | undefined => {
    if (value === undefined || value === null || value === '') {
      if (required) {
        throw new FieldValidationError(fieldName, 'MISSING_FIELD', `${fieldName} is required`);
      }
      return undefined;
    }
    if (typeof value !== 'string' || !UUID_RE.test(value)) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be a valid UUID`
      );
    }
    return value;
  };
}

/**
 * Create a validator for email fields
 */
export function email(fieldName: string, required = true): FieldValidator<string | undefined> {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (value: unknown): string | undefined => {
    if (value === undefined || value === null || value === '') {
      if (required) {
        throw new FieldValidationError(fieldName, 'MISSING_FIELD', `${fieldName} is required`);
      }
      return undefined;
    }
    if (typeof value !== 'string' || !EMAIL_RE.test(value)) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be a valid email address`
      );
    }
    return value;
  };
}

/**
 * Create a validator for domain name fields
 */
export function domainName(fieldName: string, required = true): FieldValidator<string | undefined> {
  return (value: unknown): string | undefined => {
    if (value === undefined || value === null || value === '') {
      if (required) {
        throw new FieldValidationError(fieldName, 'MISSING_FIELD', `${fieldName} is required`);
      }
      return undefined;
    }
    if (typeof value !== 'string') {
      throw new FieldValidationError(fieldName, 'INVALID_FORMAT', `${fieldName} must be a string`);
    }
    if (value.length > 253) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be at most 253 characters`
      );
    }
    // Basic domain validation - allow ASCII and IDN
    const DOMAIN_RE =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    const IDN_RE = /^(xn--[a-zA-Z0-9]+\.?)+$/i;
    if (!DOMAIN_RE.test(value) && !IDN_RE.test(value)) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be a valid domain name`
      );
    }
    return value;
  };
}

/**
 * Create a validator for boolean fields
 */
export function boolean(fieldName: string, required = true): FieldValidator<boolean | undefined> {
  return (value: unknown): boolean | undefined => {
    if (value === undefined || value === null) {
      if (required) {
        throw new FieldValidationError(fieldName, 'MISSING_FIELD', `${fieldName} is required`);
      }
      return undefined;
    }
    if (typeof value !== 'boolean') {
      throw new FieldValidationError(fieldName, 'INVALID_FORMAT', `${fieldName} must be a boolean`);
    }
    return value;
  };
}

/**
 * Create a validator for integer fields
 */
export function integer(
  fieldName: string,
  options?: { min?: number; max?: number; required?: boolean }
): FieldValidator<number | undefined> {
  const required = options?.required ?? true;
  return (value: unknown): number | undefined => {
    if (value === undefined || value === null) {
      if (required) {
        throw new FieldValidationError(fieldName, 'MISSING_FIELD', `${fieldName} is required`);
      }
      return undefined;
    }
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (typeof num !== 'number' || Number.isNaN(num) || !Number.isInteger(num)) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be an integer`
      );
    }
    if (options?.min !== undefined && num < options.min) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be at least ${options.min}`
      );
    }
    if (options?.max !== undefined && num > options.max) {
      throw new FieldValidationError(
        fieldName,
        'INVALID_FORMAT',
        `${fieldName} must be at most ${options.max}`
      );
    }
    return num;
  };
}

/**
 * Field validation error (internal use)
 */
class FieldValidationError extends Error {
  constructor(
    public field: string,
    public code: ValidationError['code'],
    message: string
  ) {
    super(message);
    this.name = 'FieldValidationError';
  }
}

/**
 * Parse and validate JSON body from request
 *
 * Returns typed validation result with explicit error handling.
 * Use this in route handlers for consistent validation.
 *
 * @example
 * ```ts
 * const result = await validateBody(c, {
 *   domain: domainName('domain'),
 *   email: email('email'),
 *   priority: enumValue('priority', ['low', 'medium', 'high'] as const, false),
 * });
 *
 * if (!result.success) {
 *   return c.json({ error: result.error.message, code: result.error.code }, 400);
 * }
 *
 * const { domain, email, priority } = result.data;
 * ```
 */
export async function validateBody<T extends Record<string, unknown>>(
  c: Context,
  schema: { [K in keyof T]: FieldValidator<T[K]> }
): Promise<ValidationResult<T>> {
  let body: Record<string, unknown>;

  try {
    body = await c.req.json();
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      },
    };
  }

  if (typeof body !== 'object' || body === null) {
    return {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be a JSON object',
      },
    };
  }

  const result: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const [key, validator] of Object.entries(schema)) {
    try {
      result[key] = (validator as FieldValidator<unknown>)(body[key]);
    } catch (err) {
      if (err instanceof FieldValidationError) {
        errors[err.field] = err.message;
      } else {
        errors[key] = `Invalid value for ${key}`;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    const firstError = Object.entries(errors)[0];
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstError[1],
        field: firstError[0],
        details: errors,
      },
    };
  }

  return {
    success: true,
    data: result as T,
  };
}

/**
 * Helper to return a standardized validation error response
 */
export function validationErrorResponse(c: Context, error: ValidationError) {
  return c.json(
    {
      error: error.message,
      code: error.code,
      field: error.field,
      details: error.details,
    },
    400
  );
}
