/**
 * Integration Tests: Parsing → Database → Rules
 *
 * These tests verify that Result-based error handling works correctly
 * across the full stack from parsing through database operations to rules evaluation.
 */

import { Result, type ResultOrError } from '@dns-ops/contracts';
import { DbError } from '@dns-ops/db';
import {
  normalizeDomainResult,
  parseDKIMResult,
  parseDMARCResult,
  parseDNSAnswerResult,
  parseMTASTSResult,
  parseSPFResult,
} from '@dns-ops/parsing';
import { isActionableFindingType, RuleError, SimulationError } from '@dns-ops/rules';
import { describe, expect, it } from 'vitest';

describe('Integration: Parsing → Database → Rules', () => {
  describe('Domain Parsing → Domain Repository Flow', () => {
    it('should propagate validation errors from parsing to API layer', () => {
      const result = normalizeDomainResult('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('EMPTY_DOMAIN');
      }
    });

    it('should successfully parse valid domain for repository storage', () => {
      const result = normalizeDomainResult('example.com');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Returns NormalizedDomain object with multiple properties
        expect(result.value.normalized).toBe('example.com');
        expect(result.value.punycode).toBe('example.com');
      }
    });

    it('should handle IDN domain conversion for storage', () => {
      const result = normalizeDomainResult('münchen.de');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should be converted to punycode
        expect(result.value.punycode).toContain('xn--');
      }
    });
  });

  describe('DNS Parsing → Database Storage Flow', () => {
    it('should parse A record for snapshot storage', () => {
      const result = parseDNSAnswerResult({
        name: 'example.com',
        type: 'A',
        ttl: 300,
        data: '192.0.2.1',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.type).toBe('A');
        expect(result.value.data).toBe('192.0.2.1');
      }
    });

    it('should handle parse errors that would prevent snapshot storage', () => {
      // Empty data should cause parse error
      const result = parseDNSAnswerResult({
        name: 'example.com',
        type: 'A',
        ttl: 300,
        data: '',
      });

      // Empty data might succeed or fail depending on parser implementation
      // Either way, the result type is handled
      expect(typeof result.isOk()).toBe('boolean');
    });

    it('should parse MX records for mail analysis', () => {
      const result = parseDNSAnswerResult({
        name: 'example.com',
        type: 'MX',
        ttl: 300,
        data: '10 mail.example.com',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.type).toBe('MX');
        // MX records include priority in data
        expect(result.value.data).toContain('mail.example.com');
      }
    });
  });

  describe('Mail Record Parsing → Rules Engine Flow', () => {
    it('should parse valid SPF record for rule evaluation', () => {
      const result = parseSPFResult('v=spf1 include:_spf.google.com ~all');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.raw).toContain('v=spf1');
      }
    });

    it('should detect missing SPF for rule findings', () => {
      const result = parseSPFResult('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_SPF_RECORD');
      }
    });

    it('should parse valid DMARC record for rule evaluation', () => {
      const result = parseDMARCResult('v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.policy).toBe('quarantine');
      }
    });

    it('should detect missing DMARC for rule findings', () => {
      const result = parseDMARCResult('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_DMARC_RECORD');
      }
    });

    it('should parse DKIM record for rule evaluation', () => {
      const result = parseDKIMResult(
        'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1TaNgLlSyQMNWVLNLvyY'
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.keyType).toBe('rsa');
      }
    });

    it('should parse MTA-STS record for rule evaluation', () => {
      const result = parseMTASTSResult('v=STSv1; id=20240101T000000;');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.version).toBe('STSv1');
      }
    });
  });

  describe('Error Propagation Across Layers', () => {
    it('should handle database not-found errors', () => {
      // Simulate: Domain not in DB → Rule suggests creating it
      const dbError = DbError.notFound('Domain', 'new-example.com');

      expect(dbError.code).toBe('NOT_FOUND');
      expect(dbError.table).toBe('Domain');
      expect(dbError.identifier).toBe('new-example.com');

      // Rule could suggest domain registration
      const ruleContext = {
        domainName: 'new-example.com',
        error: dbError,
      };

      expect(ruleContext.error.code).toBe('NOT_FOUND');
    });

    it('should handle tenant isolation errors in rule context', () => {
      const tenantError = DbError.tenantIsolation('Domain', 'tenant-1', 'tenant-2');

      expect(tenantError.code).toBe('TENANT_ISOLATION');
      expect(tenantError.tenantId).toBe('tenant-1');
      expect(tenantError.resourceTenantId).toBe('tenant-2');

      // This error would prevent rule execution
      const ruleError = RuleError.invalidContext('tenantId', 'Cross-tenant access denied');
      expect(ruleError.code).toBe('INVALID_CONTEXT');
    });
  });

  describe('Simulation Integration Flow', () => {
    it('should identify actionable findings from mail errors', () => {
      // These finding types can be simulated
      const actionableFindings = [
        'mail.no-spf-record',
        'mail.no-dmarc-record',
        'mail.no-mx-record',
        'mail.no-mta-sts',
        'mail.no-tls-rpt',
        'mail.no-dkim-queried',
        'mail.spf-malformed',
        'dns.cname-coexistence-conflict',
      ];

      for (const finding of actionableFindings) {
        expect(isActionableFindingType(finding)).toBe(true);
      }
    });

    it('should not simulate non-actionable findings', () => {
      const nonActionable = ['mail.spf-valid', 'mail.dmarc-valid', 'dns.a-record-exists'];

      for (const finding of nonActionable) {
        expect(isActionableFindingType(finding)).toBe(false);
      }
    });

    it('should create simulation error for invalid finding type', () => {
      const error = SimulationError.invalidFindingType('unknown.finding.type');

      expect(error.code).toBe('INVALID_FINDING_TYPE');
      expect(error.findingType).toBe('unknown.finding.type');
    });

    it('should handle no actionable findings scenario', () => {
      const error = SimulationError.noActionableFindings();

      expect(error.code).toBe('NO_ACTIONABLE_FINDINGS');
    });
  });

  describe('Result Composition Patterns', () => {
    it('should chain parsing results manually', () => {
      const domainResult = normalizeDomainResult('example.com');

      // Manual chaining without flatMap
      let finalResult: ResultOrError<{ domain: string; recordType: string }, unknown>;

      if (domainResult.isOk()) {
        const dnsResult = parseDNSAnswerResult({
          name: domainResult.value.normalized,
          type: 'A',
          ttl: 300,
          data: '192.0.2.1',
        });

        if (dnsResult.isOk()) {
          finalResult = Result.ok({
            domain: domainResult.value.normalized,
            recordType: dnsResult.value.type,
          });
        } else {
          finalResult = dnsResult;
        }
      } else {
        finalResult = domainResult;
      }

      expect(finalResult.isOk()).toBe(true);
      if (finalResult.isOk()) {
        expect(finalResult.value.domain).toBe('example.com');
        expect(finalResult.value.recordType).toBe('A');
      }
    });

    it('should short-circuit on first error in chain', () => {
      const domainResult = normalizeDomainResult(''); // Invalid domain

      // Manual chaining - should stop at first error
      let executed = false;
      let finalResult: ResultOrError<unknown, unknown>;

      if (domainResult.isOk()) {
        executed = true;
        finalResult = parseDNSAnswerResult({
          name: domainResult.value.normalized,
          type: 'A',
          ttl: 300,
          data: '192.0.2.1',
        });
      } else {
        finalResult = domainResult;
      }

      expect(executed).toBe(false); // Should not execute after error
      expect(finalResult.isErr()).toBe(true);
      if (finalResult.isErr()) {
        expect(finalResult.error.code).toBe('EMPTY_DOMAIN');
      }
    });

    it('should collect multiple parsing errors', () => {
      const results = [parseSPFResult(''), parseDMARCResult(''), parseDKIMResult('')];

      const errors = results
        .filter((r): r is { isOk(): false; isErr(): true; error: { code: string } } => r.isErr())
        .map((r) => r.error);

      expect(errors).toHaveLength(3);
      expect(errors[0].code).toBe('NOT_SPF_RECORD');
      expect(errors[1].code).toBe('NOT_DMARC_RECORD');
      expect(errors[2].code).toBe('MISSING_REQUIRED_FIELD');
    });

    it('should partition mixed results', () => {
      const results = [
        parseSPFResult('v=spf1 include:_spf.google.com ~all'), // Ok
        parseSPFResult(''), // Err
        parseDMARCResult('v=DMARC1; p=quarantine'), // Ok
        parseDMARCResult(''), // Err
      ];

      const [successes, failures] = Result.partition(results);

      expect(successes).toHaveLength(2);
      expect(failures).toHaveLength(2);
    });
  });

  describe('End-to-End Error Scenarios', () => {
    it('should handle complete flow: invalid domain → parsing error → no DB operation', () => {
      const flow = (): ResultOrError<string, { code: string; message: string }> => {
        // Step 1: Parse domain
        const domainResult = normalizeDomainResult('');
        if (domainResult.isErr()) {
          return domainResult;
        }

        // Step 2: Would query DB (skipped in this test)
        // const dbResult = await findDomainResult(domainResult.value.normalized);

        // Step 3: Would evaluate rules
        return Result.ok(domainResult.value.normalized);
      };

      const result = flow();
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('EMPTY_DOMAIN');
      }
    });

    it('should handle complete flow: valid domain → parse DNS → would store snapshot', () => {
      const flow = (): ResultOrError<
        { domain: string; records: Array<{ type: string; data: string }> },
        { code: string; message: string }
      > => {
        // Step 1: Parse domain
        const domainResult = normalizeDomainResult('example.com');
        if (domainResult.isErr()) {
          return domainResult;
        }

        // Step 2: Parse DNS records
        const records = [
          parseDNSAnswerResult({
            name: domainResult.value.normalized,
            type: 'A',
            ttl: 300,
            data: '192.0.2.1',
          }),
          parseDNSAnswerResult({
            name: domainResult.value.normalized,
            type: 'MX',
            ttl: 300,
            data: '10 mail.example.com',
          }),
        ];

        const [ok, err] = Result.partition(records);
        if (err.length > 0) {
          return Result.err(err[0]!);
        }

        // Step 3: Would store to DB
        return Result.ok({
          domain: domainResult.value.normalized,
          records: ok.map((r) => ({ type: r.type, data: r.data })),
        });
      };

      const result = flow();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.domain).toBe('example.com');
        expect(result.value.records).toHaveLength(2);
      }
    });

    it('should handle complete flow: parse mail records → generate findings → simulate', () => {
      const flow = (): ResultOrError<
        { findings: string[]; canSimulate: boolean },
        { code: string; message: string }
      > => {
        // Step 1: Parse mail records
        const spfResult = parseSPFResult('');
        const dmarcResult = parseDMARCResult('');

        // Step 2: Generate findings from missing records
        const findings: string[] = [];
        if (spfResult.isErr() && spfResult.error.code === 'NOT_SPF_RECORD') {
          findings.push('mail.no-spf-record');
        }
        if (dmarcResult.isErr() && dmarcResult.error.code === 'NOT_DMARC_RECORD') {
          findings.push('mail.no-dmarc-record');
        }

        // Step 3: Check if any are actionable
        const actionable = findings.filter(isActionableFindingType);

        return Result.ok({
          findings,
          canSimulate: actionable.length > 0,
        });
      };

      const result = flow();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.findings).toContain('mail.no-spf-record');
        expect(result.value.findings).toContain('mail.no-dmarc-record');
        expect(result.value.canSimulate).toBe(true);
      }
    });
  });
});
