/**
 * DNS Rules Tests - TDD/BDD
 *
 * Tests for the initial DNS rules pack:
 * 1. Authoritative lookup failures/timeouts
 * 2. Mismatch across authoritative servers
 * 3. Recursive vs authoritative mismatch
 * 4. CNAME coexistence conflict
 * 5. Partial coverage finding for unmanaged zones
 */

import { describe, it, expect } from 'vitest';
import type { Observation, RecordSet } from '@dns-ops/db/schema';
import {
  authoritativeFailureRule,
  authoritativeMismatchRule,
  recursiveAuthoritativeMismatchRule,
  cnameCoexistenceRule,
  unmanagedZonePartialCoverageRule,
} from './rules.js';
import type { RuleContext } from '../engine/index.js';

// Test helpers
function createMockObservation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: 'obs-1',
    snapshotId: 'snap-1',
    queryName: 'example.com',
    queryType: 'A',
    vantageType: 'authoritative',
    vantageIdentifier: 'ns1.example.com',
    status: 'success',
    queriedAt: new Date(),
    responseTimeMs: 100,
    responseCode: 0,
    flags: null,
    answerSection: [],
    authoritySection: [],
    additionalSection: [],
    errorMessage: null,
    errorDetails: null,
    rawResponse: null,
    vantageId: null,
    ...overrides,
  };
}

function createMockRecordSet(overrides: Partial<RecordSet> = {}): RecordSet {
  return {
    id: 'rs-1',
    snapshotId: 'snap-1',
    name: 'example.com',
    type: 'A',
    ttl: 300,
    values: ['192.0.2.1'],
    sourceObservationIds: ['obs-1'],
    sourceVantages: ['ns1.example.com'],
    isConsistent: true,
    consolidationNotes: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockContext(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    snapshotId: 'snap-1',
    domainId: 'domain-1',
    domainName: 'example.com',
    zoneManagement: 'managed',
    observations: [],
    recordSets: [],
    rulesetVersion: '1.0.0',
    ...overrides,
  };
}

describe('Authoritative Failure Rule', () => {
  it('should detect timeout from authoritative server', () => {
    const obs = createMockObservation({
      status: 'timeout',
      vantageType: 'authoritative',
      errorMessage: 'Query timed out',
    });
    const context = createMockContext({ observations: [obs] });
    
    const result = authoritativeFailureRule.evaluate(context);
    
    expect(result).not.toBeNull();
    expect(result?.finding).toBeDefined();
    expect(result?.finding?.severity).toBe('high');
    expect(result?.finding?.type).toBe('dns.authoritative-timeout');
  });

  it('should detect refusal from authoritative server', () => {
    const obs = createMockObservation({
      status: 'refused',
      vantageType: 'authoritative',
      errorMessage: 'Query refused',
    });
    const context = createMockContext({ observations: [obs] });
    
    const result = authoritativeFailureRule.evaluate(context);
    
    expect(result).not.toBeNull();
    expect(result?.finding?.type).toBe('dns.authoritative-refused');
  });

  it('should not flag successful queries', () => {
    const obs = createMockObservation({
      status: 'success',
      vantageType: 'authoritative',
    });
    const context = createMockContext({ observations: [obs] });
    
    const result = authoritativeFailureRule.evaluate(context);
    
    expect(result).toBeNull();
  });

  it('should not flag recursive vantage failures', () => {
    const obs = createMockObservation({
      status: 'timeout',
      vantageType: 'public-recursive',
    });
    const context = createMockContext({ observations: [obs] });
    
    const result = authoritativeFailureRule.evaluate(context);
    
    expect(result).toBeNull();
  });
});

describe('Authoritative Mismatch Rule', () => {
  it('should detect inconsistent values across authoritative servers', () => {
    const obs = createMockObservation({
      status: 'success',
      vantageType: 'authoritative',
      vantageIdentifier: 'ns1.example.com',
      answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
    });
    const obs2 = createMockObservation({
      id: 'obs-2',
      status: 'success',
      vantageType: 'authoritative',
      vantageIdentifier: 'ns2.example.com',
      answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.2' }],
    });
    
    const rs = createMockRecordSet({
      isConsistent: false,
      consolidationNotes: 'Values differ across vantages',
      sourceVantages: ['ns1.example.com', 'ns2.example.com'],
    });
    
    const context = createMockContext({
      observations: [obs, obs2],
      recordSets: [rs],
    });
    
    const result = authoritativeMismatchRule.evaluate(context);
    
    expect(result).not.toBeNull();
    expect(result?.finding?.type).toBe('dns.authoritative-mismatch');
    expect(result?.finding?.severity).toBe('critical');
  });

  it('should not flag consistent record sets', () => {
    const rs = createMockRecordSet({
      isConsistent: true,
    });
    
    const context = createMockContext({ recordSets: [rs] });
    
    const result = authoritativeMismatchRule.evaluate(context);
    
    expect(result).toBeNull();
  });
});

describe('Recursive vs Authoritative Mismatch Rule', () => {
  it('should detect when recursive and authoritative disagree', () => {
    const recursiveObs = createMockObservation({
      status: 'success',
      vantageType: 'public-recursive',
      vantageIdentifier: '8.8.8.8',
      answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
    });
    const authObs = createMockObservation({
      id: 'obs-2',
      status: 'success',
      vantageType: 'authoritative',
      vantageIdentifier: 'ns1.example.com',
      answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.99' }],
    });
    
    const context = createMockContext({
      observations: [recursiveObs, authObs],
    });
    
    const result = recursiveAuthoritativeMismatchRule.evaluate(context);
    
    expect(result).not.toBeNull();
    expect(result?.finding?.type).toBe('dns.recursive-authoritative-mismatch');
  });

  it('should not flag when values match', () => {
    const recursiveObs = createMockObservation({
      status: 'success',
      vantageType: 'public-recursive',
      answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
    });
    const authObs = createMockObservation({
      id: 'obs-2',
      status: 'success',
      vantageType: 'authoritative',
      answerSection: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
    });
    
    const context = createMockContext({
      observations: [recursiveObs, authObs],
    });
    
    const result = recursiveAuthoritativeMismatchRule.evaluate(context);
    
    expect(result).toBeNull();
  });
});

describe('CNAME Coexistence Rule', () => {
  it('should detect CNAME with other records at same name', () => {
    const cnameRs = createMockRecordSet({
      name: 'www.example.com',
      type: 'CNAME',
      values: ['example.com.'],
    });
    const aRs = createMockRecordSet({
      id: 'rs-2',
      name: 'www.example.com',
      type: 'A',
      values: ['192.0.2.1'],
    });
    
    const context = createMockContext({
      recordSets: [cnameRs, aRs],
    });
    
    const result = cnameCoexistenceRule.evaluate(context);
    
    expect(result).not.toBeNull();
    expect(result?.finding?.type).toBe('dns.cname-coexistence-conflict');
    expect(result?.finding?.severity).toBe('critical');
  });

  it('should allow CNAME to coexist only with RRSIG and NSEC', () => {
    const cnameRs = createMockRecordSet({
      name: 'www.example.com',
      type: 'CNAME',
      values: ['example.com.'],
    });
    const rrsigRs = createMockRecordSet({
      id: 'rs-2',
      name: 'www.example.com',
      type: 'RRSIG',
      values: ['some-signature'],
    });
    
    const context = createMockContext({
      recordSets: [cnameRs, rrsigRs],
    });
    
    const result = cnameCoexistenceRule.evaluate(context);
    
    // RRSIG and NSEC are allowed with CNAME (DNSSEC records)
    expect(result).toBeNull();
  });

  it('should not flag when only CNAME exists', () => {
    const cnameRs = createMockRecordSet({
      name: 'www.example.com',
      type: 'CNAME',
      values: ['example.com.'],
    });
    
    const context = createMockContext({
      recordSets: [cnameRs],
    });
    
    const result = cnameCoexistenceRule.evaluate(context);
    
    expect(result).toBeNull();
  });
});

describe('Unmanaged Zone Partial Coverage Rule', () => {
  it('should flag unmanaged zones as partial coverage', () => {
    const context = createMockContext({
      zoneManagement: 'unmanaged',
      observations: [
        createMockObservation({ queryName: 'example.com', queryType: 'A' }),
      ],
    });
    
    const result = unmanagedZonePartialCoverageRule.evaluate(context);
    
    expect(result).not.toBeNull();
    expect(result?.finding?.type).toBe('dns.partial-coverage-unmanaged');
    expect(result?.finding?.severity).toBe('info');
  });

  it('should not flag managed zones', () => {
    const context = createMockContext({
      zoneManagement: 'managed',
    });
    
    const result = unmanagedZonePartialCoverageRule.evaluate(context);
    
    expect(result).toBeNull();
  });

  it('should include query scope in finding description', () => {
    const context = createMockContext({
      zoneManagement: 'unmanaged',
      observations: [
        createMockObservation({ queryName: 'example.com', queryType: 'A' }),
        createMockObservation({ id: 'obs-2', queryName: 'example.com', queryType: 'MX' }),
      ],
    });
    
    const result = unmanagedZonePartialCoverageRule.evaluate(context);
    
    expect(result?.finding?.description).toContain('A');
    expect(result?.finding?.description).toContain('MX');
  });
});
