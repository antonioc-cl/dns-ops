/**
 * Validation Middleware Tests
 */

import { describe, expect, it } from 'vitest';
import {
  domainName,
  email,
  enumValue,
  integer,
  optionalArray,
  optionalString,
  requiredArray,
  requiredString,
  uuid,
} from './validation.js';

describe('requiredString', () => {
  it('validates required string', () => {
    const validator = requiredString('name');
    expect(validator('test')).toBe('test');
  });

  it('throws on missing value', () => {
    const validator = requiredString('name');
    expect(() => validator(undefined)).toThrow('name is required');
  });

  it('throws on non-string', () => {
    const validator = requiredString('name');
    expect(() => validator(123)).toThrow('must be a string');
  });

  it('validates minLength', () => {
    const validator = requiredString('name', { minLength: 3 });
    expect(() => validator('ab')).toThrow('at least 3 characters');
  });

  it('validates maxLength', () => {
    const validator = requiredString('name', { maxLength: 5 });
    expect(() => validator('toolong')).toThrow('at most 5 characters');
  });

  it('validates pattern', () => {
    const validator = requiredString('name', {
      pattern: /^[a-z]+$/,
      patternMessage: 'must be lowercase letters',
    });
    expect(() => validator('ABC')).toThrow('must be lowercase letters');
    expect(validator('abc')).toBe('abc');
  });
});

describe('optionalString', () => {
  it('returns undefined for missing value', () => {
    const validator = optionalString('name');
    expect(validator(undefined)).toBeUndefined();
    expect(validator(null)).toBeUndefined();
    expect(validator('')).toBeUndefined();
  });

  it('validates present value', () => {
    const validator = optionalString('name', { maxLength: 5 });
    expect(validator('test')).toBe('test');
    expect(() => validator('toolong')).toThrow('at most 5 characters');
  });
});

describe('requiredArray', () => {
  it('validates required array', () => {
    const validator = requiredArray<string>('items');
    expect(validator(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('throws on missing value', () => {
    const validator = requiredArray<string>('items');
    expect(() => validator(undefined)).toThrow('items is required');
  });

  it('throws on non-array', () => {
    const validator = requiredArray<string>('items');
    expect(() => validator('not-an-array')).toThrow('must be an array');
  });

  it('validates minLength', () => {
    const validator = requiredArray<string>('items', undefined, { minLength: 2 });
    expect(() => validator(['a'])).toThrow('at least 2 items');
  });

  it('validates items', () => {
    const validator = requiredArray<number>('items', (item) => {
      if (typeof item !== 'number') throw new Error('not a number');
      return item;
    });
    expect(validator([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe('optionalArray', () => {
  it('returns undefined for missing value', () => {
    const validator = optionalArray<string>('items');
    expect(validator(undefined)).toBeUndefined();
    expect(validator(null)).toBeUndefined();
  });

  it('validates present array', () => {
    const validator = optionalArray<string>('items');
    expect(validator(['a', 'b'])).toEqual(['a', 'b']);
  });
});

describe('enumValue', () => {
  it('validates enum value', () => {
    const validator = enumValue('status', ['open', 'closed'] as const);
    expect(validator('open')).toBe('open');
    expect(validator('closed')).toBe('closed');
  });

  it('throws on invalid value', () => {
    const validator = enumValue('status', ['open', 'closed'] as const);
    expect(() => validator('invalid')).toThrow('must be one of: open, closed');
  });

  it('handles optional enum', () => {
    const validator = enumValue('status', ['open', 'closed'] as const, false);
    expect(validator(undefined)).toBeUndefined();
  });

  it('throws on missing required value', () => {
    const validator = enumValue('status', ['open', 'closed'] as const, true);
    expect(() => validator(undefined)).toThrow('status is required');
  });
});

describe('uuid', () => {
  it('validates UUID', () => {
    const validator = uuid('id');
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(validator(validUuid)).toBe(validUuid);
  });

  it('throws on invalid UUID', () => {
    const validator = uuid('id');
    expect(() => validator('not-a-uuid')).toThrow('must be a valid UUID');
  });

  it('handles optional UUID', () => {
    const validator = uuid('id', false);
    expect(validator(undefined)).toBeUndefined();
    expect(validator('')).toBeUndefined();
  });
});

describe('email', () => {
  it('validates email', () => {
    const validator = email('email');
    expect(validator('test@example.com')).toBe('test@example.com');
  });

  it('throws on invalid email', () => {
    const validator = email('email');
    expect(() => validator('not-an-email')).toThrow('must be a valid email');
    expect(() => validator('@missing-local')).toThrow('must be a valid email');
  });

  it('handles optional email', () => {
    const validator = email('email', false);
    expect(validator(undefined)).toBeUndefined();
  });
});

describe('domainName', () => {
  it('validates domain name', () => {
    const validator = domainName('domain');
    expect(validator('example.com')).toBe('example.com');
    expect(validator('sub.example.com')).toBe('sub.example.com');
  });

  it('throws on invalid domain', () => {
    const validator = domainName('domain');
    expect(() => validator('not a domain')).toThrow('must be a valid domain');
    expect(() => validator('-invalid.com')).toThrow('must be a valid domain');
  });

  it('throws on too long domain', () => {
    const validator = domainName('domain');
    const longDomain = `${'a'.repeat(254)}.com`;
    expect(() => validator(longDomain)).toThrow('at most 253 characters');
  });

  it('handles optional domain', () => {
    const validator = domainName('domain', false);
    expect(validator(undefined)).toBeUndefined();
  });
});

describe('integer', () => {
  it('validates integer', () => {
    const validator = integer('count');
    expect(validator(42)).toBe(42);
    expect(validator('42')).toBe(42);
  });

  it('throws on non-integer', () => {
    const validator = integer('count');
    expect(() => validator('not-a-number')).toThrow('must be an integer');
    expect(() => validator(3.14)).toThrow('must be an integer');
  });

  it('validates min value', () => {
    const validator = integer('count', { min: 0 });
    expect(() => validator(-1)).toThrow('must be at least 0');
  });

  it('validates max value', () => {
    const validator = integer('count', { max: 100 });
    expect(() => validator(101)).toThrow('must be at most 100');
  });

  it('handles optional integer', () => {
    const validator = integer('count', { required: false });
    expect(validator(undefined)).toBeUndefined();
  });
});
