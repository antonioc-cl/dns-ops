/**
 * DNS Record Parsing with Result Types
 *
 * Result-based variants of DNS parsing functions.
 * These complement the throwing versions for gradual migration.
 */

import { ParseError, Result, type ResultOrError } from '@dns-ops/contracts';
import type { DNSRecord, Observation } from '@dns-ops/db/schema';
import { parseDNSAnswer, parseTXTRecord } from './index.js';
import { type NormalizedRecord, observationsToRecordSets } from './recordset.js';

/**
 * DNS parsing error codes
 */
export type DNSParseErrorCode =
  | 'INVALID_RECORD'
  | 'INVALID_TXT_FORMAT'
  | 'EMPTY_DATA'
  | 'OBSERVATION_PARSE_FAILED';

/**
 * DNS parsing error with structured details
 */
export class DNSParseError extends ParseError {
  readonly code: DNSParseErrorCode;
  readonly details: {
    code: DNSParseErrorCode;
    input?: string;
    field?: string;
    [key: string]: unknown;
  };

  constructor(args: {
    message: string;
    code: DNSParseErrorCode;
    input?: string;
    field?: string;
    details?: Record<string, unknown>;
  }) {
    super({
      message: args.message,
      input: args.input,
      format: args.code,
    });
    this.code = args.code;
    // Build comprehensive details object
    this.details = {
      code: args.code,
      input: args.input,
      field: args.field,
      ...args.details,
    };
  }
}

/**
 * Parsed DNS answer structure
 */
export interface DNSAnswer {
  name: string;
  type: string;
  ttl: number;
  data: string;
  priority?: number;
}

/**
 * TXT record structure
 */
export interface TXTRecord {
  strings: string[];
  raw: string;
}

/**
 * Parse a DNS record into structured format, returning a Result.
 *
 * @example
 * ```typescript
 * const record: DNSRecord = {
 *   name: 'example.com',
 *   type: 'A',
 *   ttl: 300,
 *   data: '192.0.2.1'
 * };
 *
 * const result = parseDNSAnswerResult(record);
 *
 * if (result.isOk()) {
 *   console.log(result.value.name); // 'example.com'
 * } else {
 *   console.error(result.error.details?.code); // 'INVALID_RECORD'
 * }
 * ```
 */
export function parseDNSAnswerResult(record: DNSRecord): ResultOrError<DNSAnswer, DNSParseError> {
  return Result.try({
    try: () => {
      const parsed = parseDNSAnswer(record);
      return {
        name: parsed.name,
        type: parsed.type,
        ttl: parsed.ttl,
        data: parsed.data,
        priority: parsed.priority,
      };
    },
    catch: (e) =>
      new DNSParseError({
        message: e instanceof Error ? e.message : 'Failed to parse DNS record',
        code: 'INVALID_RECORD',
        input: String(record),
        details: { originalError: String(e) },
      }),
  });
}

/**
 * Parse TXT record data into structured format, returning a Result.
 *
 * @example
 * ```typescript
 * const result = parseTXTRecordResult('"v=spf1" "include:_spf.google.com"');
 *
 * if (result.isOk()) {
 *   console.log(result.value.strings); // ['v=spf1', 'include:_spf.google.com']
 * }
 * ```
 */
export function parseTXTRecordResult(data: string): ResultOrError<TXTRecord, DNSParseError> {
  // Check for empty data before attempting to parse
  if (!data || data.length === 0) {
    return Result.err(
      new DNSParseError({
        message: 'Empty TXT record data',
        code: 'EMPTY_DATA',
        input: data,
      })
    );
  }

  return Result.try({
    try: () => {
      const strings = parseTXTRecord(data);
      return {
        strings,
        raw: data,
      };
    },
    catch: (e) =>
      new DNSParseError({
        message: e instanceof Error ? e.message : 'Failed to parse TXT record',
        code: 'INVALID_TXT_FORMAT',
        input: data,
        details: { originalError: String(e) },
      }),
  });
}

/**
 * Batch parse multiple DNS records with Result types
 *
 * @example
 * ```typescript
 * const records = [
 *   { name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' },
 *   { name: 'example.com', type: 'MX', ttl: 300, data: 'mail.example.com', priority: 10 }
 * ];
 *
 * const results = parseDNSAnswersResult(records);
 * ```
 */
export function parseDNSAnswersResult(
  records: DNSRecord[]
): ResultOrError<DNSAnswer, DNSParseError>[] {
  return records.map(parseDNSAnswerResult);
}

/**
 * Partition DNS parse results into successes and failures
 *
 * @example
 * ```typescript
 * const records = [validRecord, invalidRecord];
 * const { ok, err } = partitionDNSAnswerResults(records);
 * // ok: DNSAnswer[]
 * // err: DNSParseError[]
 * ```
 */
export function partitionDNSAnswerResults(records: DNSRecord[]): {
  ok: DNSAnswer[];
  err: DNSParseError[];
} {
  const results = parseDNSAnswersResult(records);
  const [ok, err] = Result.partition(results);
  return { ok, err };
}

/**
 * Result from parsing a RecordSet from observations
 */
export interface RecordSetResult {
  records: NormalizedRecord[];
  errors: RecordSetParseError[];
  hasErrors: boolean;
}

/**
 * Error entry for individual observation failures in batch parsing
 */
export interface RecordSetParseError {
  observationId: string;
  observationIndex: number;
  error: DNSParseError;
}

/**
 * Parse observations into RecordSets with Result-based error handling.
 * Includes failed observations in the result with detailed error information.
 *
 * @example
 * ```typescript
 * const observations = await fetchObservations(domain);
 * const result = parseRecordSetResult(observations);
 *
 * if (result.isOk()) {
 *   console.log(`Parsed ${result.value.records.length} records`);
 *   if (result.value.hasErrors) {
 *     console.log(`Had ${result.value.errors.length} errors`);
 *   }
 * }
 * ```
 */
export function parseRecordSetResult(
  observations: Observation[]
): ResultOrError<RecordSetResult, DNSParseError> {
  return Result.try({
    try: () => {
      const records = observationsToRecordSets(observations);

      // Build error list from any failed observations
      const errors: RecordSetParseError[] = [];
      observations.forEach((obs, index) => {
        if (obs.status !== 'success') {
          errors.push({
            observationId: obs.id,
            observationIndex: index,
            error: new DNSParseError({
              message: `Observation failed with status: ${obs.status}`,
              code: 'OBSERVATION_PARSE_FAILED',
              input: obs.queryName,
              details: {
                status: obs.status,
                queryType: obs.queryType,
                queryName: obs.queryName,
                vantages: obs.vantageType,
              },
            }),
          });
        }
      });

      return {
        records,
        errors,
        hasErrors: errors.length > 0,
      };
    },
    catch: (e) =>
      new DNSParseError({
        message: e instanceof Error ? e.message : 'Failed to parse RecordSet',
        code: 'INVALID_RECORD',
        details: { originalError: String(e) },
      }),
  });
}

/**
 * Batch parse multiple observations into RecordSets with partitioned results.
 *
 * @example
 * ```typescript
 * const observationsList = [obs1, obs2, obs3];
 * const { ok, err } = partitionRecordSetResults(observationsList);
 * // ok: RecordSetResult[]
 * // err: DNSParseError[]
 * ```
 */
export function partitionRecordSetResults(observationsList: Observation[][]): {
  ok: RecordSetResult[];
  err: DNSParseError[];
} {
  const results = observationsList.map((obs) => parseRecordSetResult(obs));
  const [ok, err] = Result.partition(results);
  return { ok, err };
}

/**
 * Type guard for DNSParseError
 */
export function isDNSParseError(error: unknown): error is DNSParseError {
  return error instanceof DNSParseError;
}

/**
 * Parse a batch of observations and return only successful records.
 * Failed observations are logged but not returned.
 *
 * @example
 * ```typescript
 * const observations = await fetchObservations(domain);
 * const records = parseRecordSetsSafe(observations);
 * // Only successful records, no error handling needed
 * ```
 */
export function parseRecordSetsSafe(observations: Observation[]): NormalizedRecord[] {
  const result = parseRecordSetResult(observations);
  return Result.unwrapOr(result, { records: [], errors: [], hasErrors: false }).records;
}
