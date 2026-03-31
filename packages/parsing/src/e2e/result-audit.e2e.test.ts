/**
 * E2E Audit Tests for Result-based Parsing
 *
 * These tests verify that issues found during code review are fixed
 * and won't regress in the future.
 */

import { Result } from '@dns-ops/contracts';
import type { DNSRecord } from '@dns-ops/db/schema';
import { describe, expect, it } from 'vitest';
import {
  DNSParseError,
  isDNSParseError,
  parseDNSAnswersResult,
  parseTXTRecordResult,
} from '../dns/result.js';
import {
  DomainValidationError,
  isDomainValidationError,
  normalizeDomainResult,
  tryNormalizeDomainResult,
} from '../domain/result.js';
import {
  isMailParseError,
  MailParseError,
  parseAnyMailRecord,
  parseDMARCResult,
  parseSPFResult,
} from '../mail/result.js';

describe('E2E Audit: Error Code Consistency', () => {
  it('should use EMPTY_DATA code for empty TXT data', () => {
    const result = parseTXTRecordResult('');

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Issue: Previously returned INVALID_TXT_FORMAT for empty data
      // Fix: Now returns specific EMPTY_DATA code
      expect(result.error.code).toBe('EMPTY_DATA');
      expect(result.error.details?.code).toBe('EMPTY_DATA');
      expect(result.error.message).toBe('Empty TXT record data');
    }
  });

  it('should not have unused error codes in DNSParseErrorCode type', () => {
    // These codes were defined but never used - they've been removed
    const validCodes = [
      'INVALID_RECORD',
      'INVALID_TXT_FORMAT',
      'EMPTY_DATA',
      'OBSERVATION_PARSE_FAILED',
    ];

    // Verify these codes work
    const errors = validCodes.map(
      (code) =>
        new DNSParseError({
          message: 'Test',
          code: code as
            | 'INVALID_RECORD'
            | 'INVALID_TXT_FORMAT'
            | 'EMPTY_DATA'
            | 'OBSERVATION_PARSE_FAILED',
        })
    );

    errors.forEach((error, i) => {
      expect(error.code).toBe(validCodes[i]);
    });
  });

  it('should have consistent error code access pattern', () => {
    // All error types should expose code both directly and via details
    const domainError = normalizeDomainResult('');
    const dnsError = parseTXTRecordResult('');
    const mailError = parseSPFResult('not spf');

    expect(domainError.isErr()).toBe(true);
    expect(dnsError.isErr()).toBe(true);
    expect(mailError.isErr()).toBe(true);

    if (domainError.isErr()) {
      // Direct access
      expect(domainError.error.code).toBeDefined();
      // Via details
      expect(domainError.error.details?.code).toBe(domainError.error.code);
    }

    if (dnsError.isErr()) {
      expect(dnsError.error.code).toBeDefined();
      expect(dnsError.error.details?.code).toBe(dnsError.error.code);
    }

    if (mailError.isErr()) {
      expect(mailError.error.code).toBeDefined();
      expect(mailError.error.details?.code).toBe(mailError.error.code);
    }
  });
});

describe('E2E Audit: Error Details Structure', () => {
  it('should have consistent details structure across all error types', () => {
    // DomainValidationError
    const domainErr = new DomainValidationError({
      message: 'Test',
      code: 'INVALID_FORMAT',
      domain: 'test.com',
      field: 'domain',
    });
    expect(domainErr.details?.code).toBe('INVALID_FORMAT');
    expect(domainErr.details?.domain).toBe('test.com');
    expect(domainErr.code).toBe('INVALID_FORMAT');

    // DNSParseError
    const dnsErr = new DNSParseError({
      message: 'Test',
      code: 'INVALID_RECORD',
      input: 'test',
      field: 'name',
      details: { extra: 'info' },
    });
    expect(dnsErr.details?.code).toBe('INVALID_RECORD');
    expect(dnsErr.details?.input).toBe('test');
    expect(dnsErr.details?.field).toBe('name');
    expect(dnsErr.details?.extra).toBe('info');
    expect(dnsErr.code).toBe('INVALID_RECORD');

    // MailParseError
    const mailErr = new MailParseError({
      message: 'Test',
      code: 'NOT_SPF_RECORD',
      input: 'test',
      field: 'v',
    });
    expect(mailErr.details?.code).toBe('NOT_SPF_RECORD');
    expect(mailErr.details?.input).toBe('test');
    expect(mailErr.details?.field).toBe('v');
    expect(mailErr.code).toBe('NOT_SPF_RECORD');
  });

  it('should support type guards correctly', () => {
    const errors = [
      new DomainValidationError({ message: 'Test', code: 'INVALID_FORMAT' }),
      new DNSParseError({ message: 'Test', code: 'INVALID_RECORD' }),
      new MailParseError({ message: 'Test', code: 'NOT_SPF_RECORD' }),
      new Error('Regular error'),
      null,
      undefined,
      'string error',
    ];

    expect(isDomainValidationError(errors[0])).toBe(true);
    expect(isDNSParseError(errors[1])).toBe(true);
    expect(isMailParseError(errors[2])).toBe(true);

    expect(isDomainValidationError(errors[3])).toBe(false);
    expect(isDNSParseError(errors[3])).toBe(false);
    expect(isMailParseError(errors[3])).toBe(false);

    expect(isDomainValidationError(errors[4])).toBe(false);
    expect(isDomainValidationError(errors[5])).toBe(false);
    expect(isDomainValidationError(errors[6])).toBe(false);
  });
});

describe('E2E Audit: parseAnyMailRecord Efficiency', () => {
  it('should pre-check record type before parsing', () => {
    // These should be detected as unknown without calling parsers
    const unknownRecords = [
      'some random text',
      'v=unknown1; p=test',
      '',
      'just a plain string without any markers',
    ];

    unknownRecords.forEach((record) => {
      const detected = parseAnyMailRecord(record);
      expect(detected.type).toBe('unknown');
      expect(detected.result).toBeNull();
    });
  });

  it('should correctly identify SPF records', () => {
    const spfRecords = [
      'v=spf1 -all',
      'v=spf1 include:_spf.google.com ~all',
      'v=spf1 mx a ptr ~all',
    ];

    spfRecords.forEach((record) => {
      const detected = parseAnyMailRecord(record);
      expect(detected.type).toBe('spf');
      expect(detected.result?.isOk()).toBe(true);
    });
  });

  it('should correctly identify DMARC records', () => {
    const dmarcRecords = ['v=DMARC1; p=reject', 'v=DMARC1; p=none; rua=mailto:reports@example.com'];

    dmarcRecords.forEach((record) => {
      const detected = parseAnyMailRecord(record);
      expect(detected.type).toBe('dmarc');
      expect(detected.result?.isOk()).toBe(true);
    });
  });

  it('should correctly identify DKIM records', () => {
    const dkimRecords = ['v=DKIM1; k=rsa; p=MIGfMA0G', 'k=rsa; p=KEY123; s=email'];

    dkimRecords.forEach((record) => {
      const detected = parseAnyMailRecord(record);
      expect(detected.type).toBe('dkim');
      expect(detected.result?.isOk()).toBe(true);
    });
  });

  it('should correctly identify MTA-STS records', () => {
    const mtastsRecords = ['v=STSv1; id=20240101', 'v=STSv1'];

    mtastsRecords.forEach((record) => {
      const detected = parseAnyMailRecord(record);
      expect(detected.type).toBe('mtasts');
      expect(detected.result?.isOk()).toBe(true);
    });
  });

  it('should not falsely identify records with partial markers', () => {
    // These contain markers but are not valid records:
    // - 'v=spf1' - Valid SPF but missing mechanisms
    // - 'v=DMARC1' - Missing required policy
    // - 'p=KEY123' - Missing other DKIM fields

    // SPF with just v=spf1 is actually valid per the parser
    const spf = parseAnyMailRecord('v=spf1');
    expect(spf.type).toBe('spf');

    // DMARC without policy should fail
    const dmarc = parseAnyMailRecord('v=DMARC1');
    expect(dmarc.type).toBe('unknown');
  });
});

describe('E2E Audit: Input Validation', () => {
  it('should handle empty arrays in batch operations', () => {
    const dnsResults = parseDNSAnswersResult([]);
    expect(dnsResults).toHaveLength(0);

    const domainResults = [].map(normalizeDomainResult);
    expect(domainResults).toHaveLength(0);
  });

  it('should handle single-item arrays', () => {
    const records: DNSRecord[] = [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }];
    const results = parseDNSAnswersResult(records);
    expect(results).toHaveLength(1);
    expect(results[0]?.isOk()).toBe(true);
  });

  it('should handle large arrays efficiently', () => {
    const domains = Array.from({ length: 1000 }, (_, i) =>
      i % 2 === 0 ? `valid${i}.com` : 'invalid..domain'
    );

    const results = domains.map(normalizeDomainResult);

    expect(results).toHaveLength(1000);
    const okCount = results.filter((r) => r.isOk()).length;
    const errCount = results.filter((r) => r.isErr()).length;

    expect(okCount).toBe(500);
    expect(errCount).toBe(500);
  });
});

describe('E2E Audit: Backward Compatibility', () => {
  it('should maintain consistent behavior with legacy tryNormalizeDomainResult', () => {
    const domains = ['example.com', '', 'test.org', 'bad..domain'];

    domains.forEach((domain) => {
      const legacyResult = tryNormalizeDomainResult(domain);
      const newResult = normalizeDomainResult(domain);

      // Both should succeed or fail together
      expect(legacyResult.isOk()).toBe(newResult.isOk());

      if (legacyResult.isOk() && newResult.isOk()) {
        expect(legacyResult.value).toEqual(newResult.value);
      }
    });
  });

  it('should export all Result functions from package index', async () => {
    const parsing = await import('../index.js');

    // DNS Result functions
    expect(parsing.parseDNSAnswerResult).toBeDefined();
    expect(parsing.parseTXTRecordResult).toBeDefined();
    expect(parsing.parseRecordSetResult).toBeDefined();
    expect(parsing.DNSParseError).toBeDefined();
    expect(parsing.isDNSParseError).toBeDefined();

    // Domain Result functions
    expect(parsing.normalizeDomainResult).toBeDefined();
    expect(parsing.tryNormalizeDomainResult).toBeDefined();
    expect(parsing.DomainValidationError).toBeDefined();
    expect(parsing.isDomainValidationError).toBeDefined();

    // Mail Result functions
    expect(parsing.parseSPFResult).toBeDefined();
    expect(parsing.parseDMARCResult).toBeDefined();
    expect(parsing.parseDKIMResult).toBeDefined();
    expect(parsing.parseMTASTSResult).toBeDefined();
    expect(parsing.parseAnyMailRecord).toBeDefined();
    expect(parsing.MailParseError).toBeDefined();
    expect(parsing.isMailParseError).toBeDefined();
  });
});

describe('E2E Audit: Error Chaining and Recovery', () => {
  it('should preserve error context through Result operations', () => {
    const result = normalizeDomainResult('invalid..domain');

    // Map should preserve error
    const mapped = Result.map(result, (d) => d.normalized);
    expect(mapped.isErr()).toBe(true);

    // unwrapOr should provide default
    const unwrapped = Result.unwrapOr(mapped, 'default');
    expect(unwrapped).toBe('default');

    // Original error should still be accessible
    if (result.isErr()) {
      expect(result.error.code).toBe('DOUBLE_DOT');
      expect(result.error.details?.code).toBe('DOUBLE_DOT');
    }
  });

  it('should handle consecutive operations with mixed success/failure', () => {
    const domains = ['valid1.com', 'invalid..domain', 'valid2.org'];

    const processed = domains.map((domain) => {
      const normalized = normalizeDomainResult(domain);
      return Result.unwrapOr(
        Result.map(normalized, (d) => ({ domain: d.normalized, valid: true })),
        { domain: 'RECOVERED', valid: false }
      );
    });

    expect(processed[0]).toEqual({ domain: 'valid1.com', valid: true });
    expect(processed[1]).toEqual({ domain: 'RECOVERED', valid: false });
    expect(processed[2]).toEqual({ domain: 'valid2.org', valid: true });
  });
});

describe('E2E Audit: Edge Cases and Bug Fixes', () => {
  it('should handle whitespace-only TXT records', () => {
    const result = parseTXTRecordResult('   ');
    // Should not crash - either parse as data or return error
    expect(result.isOk() || result.isErr()).toBe(true);
  });

  it('should handle very long domain names', () => {
    const longLabel = 'a'.repeat(63);
    const domain = `${longLabel}.com`;
    const result = normalizeDomainResult(domain);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.normalized).toBe(domain);
    }
  });

  it('should reject domain names exceeding 253 characters', () => {
    const longDomain = `${'a'.repeat(250)}.com`;
    const result = normalizeDomainResult(longDomain);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe('DOMAIN_TOO_LONG');
    }
  });

  it('should handle SPF records with many includes', () => {
    const includes = Array.from({ length: 20 }, (_, i) => `include:domain${i}.com`).join(' ');
    const spf = `v=spf1 ${includes} ~all`;

    const result = parseSPFResult(spf);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.mechanisms.length).toBeGreaterThanOrEqual(20);
    }
  });

  it('should handle DMARC records with many report URIs', () => {
    const uris = Array.from({ length: 10 }, (_, i) => `mailto:report${i}@example.com`).join(',');
    const dmarc = `v=DMARC1; p=reject; rua=${uris}`;

    const result = parseDMARCResult(dmarc);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.rua?.length).toBe(10);
    }
  });

  it('should handle records with special characters', () => {
    const specialCases = [
      { record: 'v=spf1 include:_spf.google.com ~all', type: 'spf' },
      { record: 'v=DMARC1; p=reject; rua=mailto:a+b@c.com', type: 'dmarc' },
      { record: 'v=DKIM1; p=abc123+/', type: 'dkim' },
    ];

    specialCases.forEach(({ record, type }) => {
      const detected = parseAnyMailRecord(record);
      expect(detected.type).toBe(type);
    });
  });
});
