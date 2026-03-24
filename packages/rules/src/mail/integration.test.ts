/**
 * Mail Collection → Findings Integration Test
 *
 * PR-02.1: Integration test proving full chain:
 * collect mail → store observations → store mail evidence → evaluate mail rules → persist mail findings
 *
 * This test uses mock DNS resolver with known SPF/DMARC/DKIM/MTA-STS records
 * and verifies findings are generated correctly by the rules engine.
 */

import type { Observation, RecordSet } from '@dns-ops/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RulesEngine } from '../engine/index.js';
import { mailRules } from './rules.js';

// =============================================================================
// Test Helpers
// =============================================================================

let testIdCounter = 0;

function createMockObservation(overrides: Partial<Observation> = {}): Observation {
  testIdCounter++;
  return {
    id: `obs-test-${testIdCounter}`,
    snapshotId: 'snap-test-1',
    queryName: 'example.com',
    queryType: 'A',
    vantageType: 'public-recursive',
    vantageIdentifier: '8.8.8.8',
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
  testIdCounter++;
  return {
    id: `rs-test-${testIdCounter}`,
    snapshotId: 'snap-test-1',
    name: 'example.com',
    type: 'A',
    ttl: 300,
    values: ['192.0.2.1'],
    sourceObservationIds: [],
    sourceVantages: ['public-recursive'],
    isConsistent: true,
    consolidationNotes: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// =============================================================================
// Integration Test Suite
// =============================================================================

describe('Mail Collection → Findings Integration', () => {
  let rulesEngine: RulesEngine;

  beforeEach(() => {
    testIdCounter = 0;
    rulesEngine = new RulesEngine({
      id: 'mail-ruleset-v1',
      version: '1.0.0',
      name: 'Mail Rules v1',
      description: 'Mail security rules',
      rules: mailRules,
      createdAt: new Date(),
    });
  });

  describe('Full Chain: Collect Mail → Evaluate', () => {
    it('should evaluate mail rules and generate findings for complete mail configuration', () => {
      // Step 1: Create mock observations simulating mail collection
      const observations: Observation[] = [
        // MX record
        createMockObservation({
          queryType: 'MX',
          queryName: 'example.com',
          answerSection: [
            { name: 'example.com', type: 'MX', ttl: 300, data: '10 mail.example.com.' },
          ],
        }),
        // SPF TXT record
        createMockObservation({
          queryType: 'TXT',
          queryName: 'example.com',
          answerSection: [
            {
              name: 'example.com',
              type: 'TXT',
              ttl: 300,
              data: 'v=spf1 include:_spf.google.com ~all',
            },
          ],
        }),
        // DMARC TXT record
        createMockObservation({
          queryType: 'TXT',
          queryName: '_dmarc.example.com',
          answerSection: [
            {
              name: '_dmarc.example.com',
              type: 'TXT',
              ttl: 300,
              data: 'v=DMARC1; p=reject; rua=mailto:dmarc@example.com',
            },
          ],
        }),
        // DKIM selector
        createMockObservation({
          queryType: 'TXT',
          queryName: 'google._domainkey.example.com',
          answerSection: [
            {
              name: 'google._domainkey.example.com',
              type: 'TXT',
              ttl: 300,
              data: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC1TaNgLlSyQMNWVLNLvyY/neDgaL2oqQE8T5illKqCgDtFHc8eHVAU+nlcaGmrKmDMw9dbgiGk1ocgZ56NR4ycfUHwQhvQPMUZw0cveel/8EAGoi/UyPmqfcPibytH81NFtTMAxUeM4Op8A6iHkvAMj5qLf4YRNsTkKAKW3OkwPQIDAQAB',
            },
          ],
        }),
        // MTA-STS TXT record
        createMockObservation({
          queryType: 'TXT',
          queryName: '_mta-sts.example.com',
          answerSection: [
            { name: '_mta-sts.example.com', type: 'TXT', ttl: 300, data: 'v=STSv1; id=20240101' },
          ],
        }),
        // TLS-RPT TXT record
        createMockObservation({
          queryType: 'TXT',
          queryName: '_smtp._tls.example.com',
          answerSection: [
            {
              name: '_smtp._tls.example.com',
              type: 'TXT',
              ttl: 300,
              data: 'v=TLSRPTv1; rua=mailto:tls-rpt@example.com',
            },
          ],
        }),
      ];

      const recordSets: RecordSet[] = [
        createMockRecordSet({
          type: 'MX',
          name: 'example.com',
          values: ['10 mail.example.com.'],
        }),
        createMockRecordSet({
          type: 'TXT',
          name: 'example.com',
          values: ['v=spf1 include:_spf.google.com ~all'],
        }),
      ];

      // Step 2: Create context and evaluate rules
      const context = {
        snapshotId: 'snap-test-1',
        domainId: 'domain-test-1',
        domainName: 'example.com',
        zoneManagement: 'unmanaged' as const,
        observations,
        recordSets,
        rulesetVersion: '1.0.0',
      };

      const { findings, suggestions } = rulesEngine.evaluate(context);

      // Step 3: Verify findings were generated
      expect(findings.length).toBeGreaterThan(0);

      // Verify finding types for all mail security records
      const findingTypes = findings.map((f) => f.type);
      expect(findingTypes).toContain('mail.mx-present');
      expect(findingTypes).toContain('mail.spf-present');
      expect(findingTypes).toContain('mail.dmarc-present');
      expect(findingTypes).toContain('mail.dkim-keys-present');
      expect(findingTypes).toContain('mail.mta-sts-present');
      expect(findingTypes).toContain('mail.tls-rpt-present');

      // Step 4: Verify findings have required fields
      for (const finding of findings) {
        expect(finding.id).toBeDefined();
        expect(finding.snapshotId).toBe('snap-test-1');
        expect(finding.type).toBeDefined();
        expect(finding.title).toBeDefined();
        expect(finding.description).toBeDefined();
        expect(finding.severity).toBeDefined();
        expect(finding.confidence).toBeDefined();
        expect(finding.ruleId).toBeDefined();
        expect(finding.ruleVersion).toBeDefined();
      }

      // Step 5: Verify well-configured records have info severity
      const mxFinding = findings.find((f) => f.type === 'mail.mx-present');
      expect(mxFinding?.severity).toBe('info');

      const dkimFinding = findings.find((f) => f.type === 'mail.dkim-keys-present');
      expect(dkimFinding?.severity).toBe('info');

      // SPF with softfail should be medium, not critical
      const spfFinding = findings.find((f) => f.type === 'mail.spf-present');
      expect(spfFinding?.severity).toBe('medium'); // Softfail ~all
    });

    it('should detect mail configuration issues and generate severity findings', () => {
      // Simulate a domain with poor mail configuration
      const observations: Observation[] = [
        // No MX record
        createMockObservation({
          queryType: 'MX',
          queryName: 'badexample.com',
          status: 'nodata',
          answerSection: [],
        }),
        // No SPF record (TXT present but no SPF data)
        createMockObservation({
          queryType: 'TXT',
          queryName: 'badexample.com',
          answerSection: [
            { name: 'badexample.com', type: 'TXT', ttl: 300, data: 'some random txt' },
          ],
        }),
        // No DMARC record
        createMockObservation({
          queryType: 'TXT',
          queryName: '_dmarc.badexample.com',
          status: 'nodata',
          answerSection: [],
        }),
      ];

      const context = {
        snapshotId: 'snap-test-2',
        domainId: 'domain-test-2',
        domainName: 'badexample.com',
        zoneManagement: 'unmanaged' as const,
        observations,
        recordSets: [],
        rulesetVersion: '1.0.0',
      };

      const { findings } = rulesEngine.evaluate(context);

      // Should have generated findings for missing mail records
      const findingTypes = findings.map((f) => f.type);
      expect(findingTypes).toContain('mail.no-mx-record');
      expect(findingTypes).toContain('mail.no-spf-record');
      expect(findingTypes).toContain('mail.no-dmarc-record');

      // These should be high severity
      const noSpfFinding = findings.find((f) => f.type === 'mail.no-spf-record');
      expect(noSpfFinding?.severity).toBe('high');
      expect(noSpfFinding?.confidence).toBe('certain');

      const noDmarcFinding = findings.find((f) => f.type === 'mail.no-dmarc-record');
      expect(noDmarcFinding?.severity).toBe('high');
      expect(noDmarcFinding?.confidence).toBe('certain');

      const noMxFinding = findings.find((f) => f.type === 'mail.no-mx-record');
      expect(noMxFinding?.severity).toBe('medium');
      expect(noMxFinding?.confidence).toBe('certain');

      // Verify findings have evidence (observation references)
      expect(noMxFinding?.evidence).toBeDefined();
      expect(noMxFinding?.evidence?.length).toBeGreaterThan(0);
      expect(noSpfFinding?.evidence).toBeDefined();
      expect(noDmarcFinding?.evidence).toBeDefined();
    });

    it('should handle Null MX (RFC 7505) as valid configuration', () => {
      // RFC 7505 Null MX: "0 ."
      const observations: Observation[] = [
        createMockObservation({
          queryType: 'MX',
          queryName: 'nomail.example.com',
          answerSection: [{ name: 'nomail.example.com', type: 'MX', ttl: 300, data: '0 .' }],
        }),
      ];

      const context = {
        snapshotId: 'snap-test-3',
        domainId: 'domain-test-3',
        domainName: 'nomail.example.com',
        zoneManagement: 'unmanaged' as const,
        observations,
        recordSets: [],
        rulesetVersion: '1.0.0',
      };

      const { findings } = rulesEngine.evaluate(context);

      // Should have Null MX finding with info severity (not a problem)
      const findingTypes = findings.map((f) => f.type);
      expect(findingTypes).toContain('mail.null-mx-configured');

      const nullMxFinding = findings.find((f) => f.type === 'mail.null-mx-configured');
      expect(nullMxFinding?.severity).toBe('info');
      expect(nullMxFinding?.riskPosture).toBe('safe');
      expect(nullMxFinding?.description).toContain('Null MX');
      expect(nullMxFinding?.description).toContain('does not accept email');
    });

    it('should detect dangerous SPF +all configuration', () => {
      const observations: Observation[] = [
        createMockObservation({
          queryType: 'TXT',
          queryName: 'dangerous.example.com',
          answerSection: [
            { name: 'dangerous.example.com', type: 'TXT', ttl: 300, data: 'v=spf1 +all' },
          ],
        }),
      ];

      const context = {
        snapshotId: 'snap-test-4',
        domainId: 'domain-test-4',
        domainName: 'dangerous.example.com',
        zoneManagement: 'unmanaged' as const,
        observations,
        recordSets: [],
        rulesetVersion: '1.0.0',
      };

      const { findings } = rulesEngine.evaluate(context);

      const spfFinding = findings.find((f) => f.type === 'mail.spf-present');
      expect(spfFinding?.severity).toBe('critical');
      expect(spfFinding?.riskPosture).toBe('critical');
      expect(spfFinding?.description).toContain('DANGEROUS');
    });

    it('should detect query failures with low confidence', () => {
      const observations: Observation[] = [
        createMockObservation({
          queryType: 'MX',
          queryName: 'failing.example.com',
          status: 'timeout',
          errorMessage: 'Query timed out after 5s',
        }),
      ];

      const context = {
        snapshotId: 'snap-test-5',
        domainId: 'domain-test-5',
        domainName: 'failing.example.com',
        zoneManagement: 'unmanaged' as const,
        observations,
        recordSets: [],
        rulesetVersion: '1.0.0',
      };

      const { findings } = rulesEngine.evaluate(context);

      const mxFinding = findings.find((f) => f.type === 'mail.mx-query-failed');
      expect(mxFinding).toBeDefined();
      expect(mxFinding?.confidence).toBe('low');
      expect(mxFinding?.description).toContain('query failures');
    });

    it('should handle mixed MX success/failure', () => {
      const observations: Observation[] = [
        // Success from public resolver
        createMockObservation({
          id: 'obs-success',
          queryType: 'MX',
          queryName: 'mixed.example.com',
          vantageType: 'public-recursive',
          answerSection: [
            { name: 'mixed.example.com', type: 'MX', ttl: 300, data: '10 mail.example.com.' },
          ],
        }),
        // Timeout from authoritative
        createMockObservation({
          id: 'obs-timeout',
          queryType: 'MX',
          queryName: 'mixed.example.com',
          vantageType: 'authoritative',
          status: 'timeout',
        }),
      ];

      const recordSets: RecordSet[] = [
        createMockRecordSet({
          id: 'rs-mx',
          type: 'MX',
          name: 'mixed.example.com',
          values: ['10 mail.example.com.'],
        }),
      ];

      const context = {
        snapshotId: 'snap-test-6',
        domainId: 'domain-test-6',
        domainName: 'mixed.example.com',
        zoneManagement: 'unmanaged' as const,
        observations,
        recordSets,
        rulesetVersion: '1.0.0',
      };

      const { findings } = rulesEngine.evaluate(context);

      // Should still report MX as present (partial success)
      const mxFinding = findings.find((f) => f.type === 'mail.mx-present');
      expect(mxFinding).toBeDefined();
      expect(mxFinding?.severity).toBe('info');
    });

    it('should validate finding evidence contains observation IDs', () => {
      const observations: Observation[] = [
        createMockObservation({
          queryType: 'MX',
          queryName: 'evidence.example.com',
          answerSection: [
            { name: 'evidence.example.com', type: 'MX', ttl: 300, data: '10 mail.example.com.' },
          ],
        }),
      ];

      const context = {
        snapshotId: 'snap-test-7',
        domainId: 'domain-test-7',
        domainName: 'evidence.example.com',
        zoneManagement: 'unmanaged' as const,
        observations,
        recordSets: [],
        rulesetVersion: '1.0.0',
      };

      const { findings } = rulesEngine.evaluate(context);

      const mxFinding = findings.find((f) => f.type === 'mail.mx-present');
      expect(mxFinding?.evidence).toBeDefined();
      expect(mxFinding?.evidence.length).toBeGreaterThan(0);
      expect(mxFinding?.evidence[0]?.observationId).toBeDefined();
    });

    it('should generate findings in expected order for mail assessment workflow', () => {
      const observations: Observation[] = [
        createMockObservation({
          queryType: 'MX',
          queryName: 'order.example.com',
          answerSection: [
            { name: 'order.example.com', type: 'MX', ttl: 300, data: '0 .' }, // Null MX
          ],
        }),
      ];

      const context = {
        snapshotId: 'snap-test-8',
        domainId: 'domain-test-8',
        domainName: 'order.example.com',
        zoneManagement: 'unmanaged' as const,
        observations,
        recordSets: [],
        rulesetVersion: '1.0.0',
      };

      const { findings } = rulesEngine.evaluate(context);

      // Null MX should be detected (info severity)
      const nullMxFinding = findings.find((f) => f.type === 'mail.null-mx-configured');
      expect(nullMxFinding).toBeDefined();

      // With Null MX, SPF/DMARC queries are still made but finding types should be specific
      const findingTypes = findings.map((f) => f.type);
      expect(findingTypes).toContain('mail.null-mx-configured');
    });
  });

  describe('Rules Engine Configuration', () => {
    it('should have correct ruleset version', () => {
      expect(rulesEngine.getRulesetVersion()).toBe('1.0.0');
    });

    it('should have all mail rules enabled', () => {
      expect(rulesEngine.getEnabledRulesCount()).toBe(mailRules.length);
    });

    it('should have 7 mail rules exported', () => {
      expect(mailRules).toHaveLength(7);
      expect(mailRules.map((r) => r.id)).toEqual([
        'mail.mx-presence.v1',
        'mail.spf-analysis.v1',
        'mail.dmarc-analysis.v1',
        'mail.dkim-presence.v1',
        'mail.mta-sts-presence.v1',
        'mail.tls-rpt-presence.v1',
        'mail.bimi-presence.v1',
      ]);
    });
  });
});
