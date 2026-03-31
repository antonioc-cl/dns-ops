import { Result } from '@dns-ops/contracts';
import type { DNSRecord, Observation } from '@dns-ops/db/schema';
import { describe, expect, it } from 'vitest';
import {
  type DNSAnswer,
  DNSParseError,
  isDNSParseError,
  parseDNSAnswerResult,
  parseDNSAnswersResult,
  parseRecordSetResult,
  parseRecordSetsSafe,
  parseTXTRecordResult,
  partitionDNSAnswerResults,
  partitionRecordSetResults,
  type TXTRecord,
} from './result.js';

// Helper to create mock observation (matches recordset.test.ts pattern)
function createObservation(
  overrides: Partial<Observation> & { queryName: string; queryType: string }
): Observation {
  const { queryName, queryType, ...rest } = overrides;
  return {
    id: `obs-${Math.random().toString(36).slice(2)}`,
    snapshotId: 'snapshot-1',
    queryName,
    queryType,
    vantageType: 'public-recursive',
    vantageIdentifier: '8.8.8.8',
    status: 'success',
    queriedAt: new Date(),
    responseTimeMs: 50,
    responseCode: 0,
    flags: null,
    answerSection: [],
    authoritySection: [],
    additionalSection: [],
    errorMessage: null,
    ...rest,
  } as Observation;
}

describe('DNS Result Utilities', () => {
  describe('parseDNSAnswerResult', () => {
    it('should return Ok for valid A record', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'A',
        ttl: 300,
        data: '192.0.2.1',
      };

      const result = parseDNSAnswerResult(record);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe('example.com');
        expect(result.value.type).toBe('A');
        expect(result.value.ttl).toBe(300);
        expect(result.value.data).toBe('192.0.2.1');
      }
    });

    it('should return Ok for valid MX record with priority', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'MX',
        ttl: 3600,
        data: 'mail.example.com',
        priority: 10,
      };

      const result = parseDNSAnswerResult(record);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.type).toBe('MX');
        expect(result.value.priority).toBe(10);
        expect(result.value.data).toBe('mail.example.com');
      }
    });

    it('should return Ok for valid TXT record', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'TXT',
        ttl: 300,
        data: 'v=spf1 include:_spf.google.com ~all',
      };

      const result = parseDNSAnswerResult(record);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.type).toBe('TXT');
      }
    });

    it('should return Ok for valid NS record', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'NS',
        ttl: 86400,
        data: 'ns1.example.com',
      };

      const result = parseDNSAnswerResult(record);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.type).toBe('NS');
      }
    });

    it('should return Ok for valid CNAME record', () => {
      const record: DNSRecord = {
        name: 'www.example.com',
        type: 'CNAME',
        ttl: 300,
        data: 'example.com',
      };

      const result = parseDNSAnswerResult(record);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe('www.example.com');
      }
    });

    it('should support pattern matching with Result.match', () => {
      const record: DNSRecord = {
        name: 'test.example.com',
        type: 'AAAA',
        ttl: 300,
        data: '2001:db8::1',
      };

      const result = parseDNSAnswerResult(record);
      const message = Result.match(result, {
        ok: (r: DNSAnswer) => `Success: ${r.name} (${r.type})`,
        err: (e) => `Error: ${e.message}`,
      });

      expect(message).toBe('Success: test.example.com (AAAA)');
    });
  });

  describe('parseTXTRecordResult', () => {
    it('should return Ok for single quoted string', () => {
      const result = parseTXTRecordResult('"v=spf1 include:_spf.google.com ~all"');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.strings).toEqual(['v=spf1 include:_spf.google.com ~all']);
        expect(result.value.raw).toBe('"v=spf1 include:_spf.google.com ~all"');
      }
    });

    it('should return Ok for multiple quoted strings', () => {
      const result = parseTXTRecordResult('"v=spf1" "include:_spf.google.com" "~all"');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.strings).toEqual(['v=spf1', 'include:_spf.google.com', '~all']);
      }
    });

    it('should return Ok for unquoted data (whole as one string)', () => {
      const result = parseTXTRecordResult('v=spf1 include:_spf.google.com ~all');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.strings).toEqual(['v=spf1 include:_spf.google.com ~all']);
      }
    });

    it('should handle escaped quotes', () => {
      const result = parseTXTRecordResult('"path=\\"value\\""');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.strings).toEqual(['path="value"']);
      }
    });

    it('should return Err for empty data', () => {
      const result = parseTXTRecordResult('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DNSParseError);
        expect(result.error.code).toBe('EMPTY_DATA');
      }
    });

    it('should support error pattern matching', () => {
      const result = parseTXTRecordResult('');

      const message = Result.match(result, {
        ok: (r: TXTRecord) => `Parsed ${r.strings.length} strings`,
        err: (e) => `Failed: ${e.code}`,
      });

      expect(message).toBe('Failed: EMPTY_DATA');
    });
  });

  describe('parseDNSAnswersResult (batch)', () => {
    it('should process multiple valid records', () => {
      const records: DNSRecord[] = [
        { name: 'a.example.com', type: 'A', ttl: 300, data: '192.0.2.1' },
        { name: 'b.example.com', type: 'A', ttl: 300, data: '192.0.2.2' },
        { name: 'mx.example.com', type: 'MX', ttl: 3600, data: 'mail.example.com', priority: 10 },
      ];

      const results = parseDNSAnswersResult(records);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.isOk())).toBe(true);
    });

    it('should handle mixed records in batch', () => {
      const records: DNSRecord[] = [
        { name: 'a.example.com', type: 'A', ttl: 300, data: '192.0.2.1' },
        { name: 'txt.example.com', type: 'TXT', ttl: 300, data: 'some text' },
      ];

      const results = parseDNSAnswersResult(records);

      expect(results).toHaveLength(2);
      expect(results[0].isOk()).toBe(true);
      expect(results[1].isOk()).toBe(true);
    });
  });

  describe('partitionDNSAnswerResults', () => {
    it('should separate successes and failures', () => {
      const records: DNSRecord[] = [
        { name: 'valid.example.com', type: 'A', ttl: 300, data: '192.0.2.1' },
        { name: 'mx.example.com', type: 'MX', ttl: 3600, data: 'mail.example.com', priority: 5 },
      ];

      const { ok, err } = partitionDNSAnswerResults(records);

      expect(ok).toHaveLength(2);
      expect(err).toHaveLength(0);
      expect(ok[0]?.name).toBe('valid.example.com');
    });

    it('should handle all successes', () => {
      const records: DNSRecord[] = [
        { name: 'a.example.com', type: 'A', ttl: 300, data: '192.0.2.1' },
        { name: 'b.example.com', type: 'A', ttl: 300, data: '192.0.2.2' },
      ];

      const { ok, err } = partitionDNSAnswerResults(records);

      expect(ok).toHaveLength(2);
      expect(err).toHaveLength(0);
    });
  });

  describe('parseRecordSetResult', () => {
    it('should return Ok with empty records for empty observations', () => {
      const result = parseRecordSetResult([]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.records).toHaveLength(0);
        expect(result.value.hasErrors).toBe(false);
        expect(result.value.errors).toHaveLength(0);
      }
    });

    it('should parse single successful observation', () => {
      const observation = createObservation({
        queryName: 'example.com',
        queryType: 'A',
        vantageIdentifier: 'aws-us-east-1',
        answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
      });

      const result = parseRecordSetResult([observation]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.records).toHaveLength(1);
        expect(result.value.records[0]?.name).toBe('example.com');
        expect(result.value.records[0]?.type).toBe('A');
        expect(result.value.records[0]?.values).toContain('192.0.2.1');
        expect(result.value.hasErrors).toBe(false);
      }
    });

    it('should include failed observations in errors', () => {
      const observation = createObservation({
        queryName: 'example.com',
        queryType: 'A',
        status: 'error',
        responseCode: 2, // SERVFAIL
      });

      const result = parseRecordSetResult([observation]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.hasErrors).toBe(true);
        expect(result.value.errors).toHaveLength(1);
        expect(result.value.errors[0]?.error.code).toBe('OBSERVATION_PARSE_FAILED');
      }
    });

    it('should handle mixed success/failure observations', () => {
      const observations: Observation[] = [
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          vantageIdentifier: 'aws-us-east-1',
          answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        }),
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          vantageIdentifier: 'aws-us-west-2',
          status: 'timeout',
        }),
      ];

      const result = parseRecordSetResult(observations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.records).toHaveLength(1);
        expect(result.value.hasErrors).toBe(true);
        expect(result.value.errors).toHaveLength(1);
        expect(result.value.records[0]?.isConsistent).toBe(false);
        expect(result.value.records[0]?.consolidationNotes).toContain('Failures');
      }
    });

    it('should aggregate multiple vantages for same name/type', () => {
      const observations: Observation[] = [
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          vantageIdentifier: '8.8.8.8',
          answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        }),
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          vantageIdentifier: '1.1.1.1',
          answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        }),
      ];

      const result = parseRecordSetResult(observations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.records).toHaveLength(1);
        expect(result.value.records[0]?.sourceVantages).toHaveLength(2);
        expect(result.value.records[0]?.isConsistent).toBe(true);
      }
    });

    it('should detect inconsistency across vantages', () => {
      const observations: Observation[] = [
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          vantageIdentifier: '8.8.8.8',
          answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        }),
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          vantageIdentifier: '1.1.1.1',
          answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.2' }],
        }),
      ];

      const result = parseRecordSetResult(observations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.records[0]?.isConsistent).toBe(false);
        expect(result.value.records[0]?.consolidationNotes).toContain('differ');
      }
    });

    it('should calculate average TTL correctly', () => {
      const observations: Observation[] = [
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          vantageIdentifier: '8.8.8.8',
          answerSection: [{ name: 'example.com', type: 'A', ttl: 100, data: '192.0.2.1' }],
        }),
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          vantageIdentifier: '1.1.1.1',
          answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        }),
      ];

      const result = parseRecordSetResult(observations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.records[0]?.ttl).toBe(200); // Average of 100 and 300
      }
    });

    it('should handle MX records with priorities', () => {
      const observation = createObservation({
        queryName: 'example.com',
        queryType: 'MX',
        answerSection: [
          { name: 'example.com', type: 'MX', ttl: 3600, data: 'mail1.example.com', priority: 10 },
          { name: 'example.com', type: 'MX', ttl: 3600, data: 'mail2.example.com', priority: 20 },
        ],
      });

      const result = parseRecordSetResult([observation]);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.records[0]?.values).toContain('10 mail1.example.com');
        expect(result.value.records[0]?.values).toContain('20 mail2.example.com');
      }
    });
  });

  describe('partitionRecordSetResults', () => {
    it('should partition multiple observation sets', () => {
      const obsList: Observation[][] = [
        [
          createObservation({
            queryName: 'example.com',
            queryType: 'A',
            answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
          }),
        ],
        [],
      ];

      const { ok, err } = partitionRecordSetResults(obsList);

      expect(ok).toHaveLength(2);
      expect(err).toHaveLength(0);
    });
  });

  describe('parseRecordSetsSafe', () => {
    it('should return only successful records', () => {
      const observations: Observation[] = [
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        }),
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          status: 'error',
        }),
      ];

      const records = parseRecordSetsSafe(observations);

      expect(records).toHaveLength(1);
      expect(records[0]?.name).toBe('example.com');
    });

    it('should return empty array for empty observations', () => {
      const records = parseRecordSetsSafe([]);

      expect(records).toHaveLength(0);
    });

    it('should mark records from all failed observations as inconsistent', () => {
      const observations: Observation[] = [
        createObservation({
          queryName: 'example.com',
          queryType: 'A',
          status: 'error',
        }),
      ];

      const records = parseRecordSetsSafe(observations);

      // Record is still created but with no values and marked inconsistent
      expect(records).toHaveLength(1);
      expect(records[0]?.values).toHaveLength(0);
      expect(records[0]?.isConsistent).toBe(false);
    });
  });

  describe('DNSParseError', () => {
    it('should have correct error structure', () => {
      const error = new DNSParseError({
        message: 'Test error message',
        code: 'INVALID_RECORD',
        input: 'test-data',
      });

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('INVALID_RECORD');
      expect(error.details?.code).toBe('INVALID_RECORD');
      expect(error._tag).toBe('ParseError');
    });

    it('should include field in details', () => {
      const error = new DNSParseError({
        message: 'Field error',
        code: 'INVALID_RECORD',
        field: 'name',
      });

      expect(error.details?.field).toBe('name');
      expect(error.details?.code).toBe('INVALID_RECORD');
    });

    it('should include additional details', () => {
      const error = new DNSParseError({
        message: 'Complex error',
        code: 'INVALID_TXT_FORMAT',
        details: { line: 42, column: 10 },
      });

      expect(error.details?.line).toBe(42);
      expect(error.details?.column).toBe(10);
    });
  });

  describe('isDNSParseError', () => {
    it('should return true for DNSParseError', () => {
      const error = new DNSParseError({
        message: 'Test',
        code: 'INVALID_RECORD',
      });

      expect(isDNSParseError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isDNSParseError(new Error('test'))).toBe(false);
    });

    it('should return false for null', () => {
      expect(isDNSParseError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDNSParseError(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isDNSParseError('error')).toBe(false);
    });
  });

  describe('Result integration', () => {
    it('should work with Result.map', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'A',
        ttl: 300,
        data: '192.0.2.1',
      };

      const result = parseDNSAnswerResult(record);
      const mapped = Result.map(result, (r: DNSAnswer) => r.data);

      expect(mapped.isOk()).toBe(true);
      if (mapped.isOk()) {
        expect(mapped.value).toBe('192.0.2.1');
      }
    });

    it('should chain results with map and match', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'TXT',
        ttl: 300,
        data: '"v=spf1" "include:test.com"',
      };

      const result = parseDNSAnswerResult(record);
      const dataResult = Result.map(result, (r: DNSAnswer) => r.data);

      // Parse the TXT data from the result
      if (dataResult.isOk()) {
        const txtResult = parseTXTRecordResult(dataResult.value);
        expect(txtResult.isOk()).toBe(true);
        if (txtResult.isOk()) {
          expect(txtResult.value.strings).toEqual(['v=spf1', 'include:test.com']);
        }
      }
    });

    it('should work with Result.unwrapOr', () => {
      const record: DNSRecord = {
        name: 'example.com',
        type: 'A',
        ttl: 300,
        data: '192.0.2.1',
      };

      const result = parseDNSAnswerResult(record);
      const data = Result.unwrapOr(
        Result.map(result, (r: DNSAnswer) => r.data),
        'default'
      );

      expect(data).toBe('192.0.2.1');
    });

    it('should return default on unwrapOr for error', () => {
      const result = parseTXTRecordResult('');
      const strings = Result.unwrapOr(
        Result.map(result, (r: TXTRecord) => r.strings),
        ['default']
      );

      expect(strings).toEqual(['default']);
    });
  });
});
