/**
 * Delegation Collection Module
 *
 * Collects delegation-related DNS data:
 * - Parent zone delegation view
 * - Per-authoritative-server answers
 * - Glue records
 * - DNSSEC observation fields
 * - Lame delegation detection
 */

import { DNSResolver } from '../dns/resolver.js';
import type { DNSAnswer, DNSQuery, DNSQueryResult, VantageInfo } from '../dns/types.js';

export interface DelegationSummary {
  domain: string;
  parentZone: string;
  parentNs: DNSAnswer[];
  authoritativeResponses: AuthoritativeResponse[];
  glueRecords: DNSAnswer[];
  missingGlue: string[];
  hasDivergence: boolean;
  divergenceDetails: DivergenceDetail[];
  lameDelegations: LameDelegation[];
  dnssecInfo: DnssecInfo | null;
}

export interface AuthoritativeResponse {
  server: string;
  result: DNSQueryResult;
  responseTime: number;
}

/**
 * A group of servers that returned the same answers for a query
 */
export interface AnswerGroup {
  servers: string[];
  answers: DNSAnswer[];
  /** Sorted, comma-joined answer data for comparison */
  signature: string;
}

/**
 * Divergence detail for a specific query
 *
 * When servers disagree, groups contains 2+ entries showing which
 * servers returned which answers. The first group is typically the
 * majority/reference group.
 */
export interface DivergenceDetail {
  queryName: string;
  queryType: string;
  /** Groups of servers with matching answers - 2+ groups means divergence */
  groups: AnswerGroup[];
  /** Total number of servers that responded successfully */
  totalServers: number;
}

export interface LameDelegation {
  server: string;
  reason: 'not-authoritative' | 'timeout' | 'refused' | 'error';
  details?: string;
}

export interface DnssecInfo {
  hasRrsig: boolean;
  adFlagSet: boolean;
  dnskeyRecords: DNSAnswer[];
  dsRecords: DNSAnswer[];
  validatingSource: string;
}

export class DelegationCollector {
  private resolver: DNSResolver;
  private domain: string;

  constructor(domain: string) {
    this.domain = domain;
    this.resolver = new DNSResolver();
  }

  /**
   * Extract parent zone from domain
   * example.com -> com
   * sub.example.com -> example.com
   * deep.sub.example.com -> sub.example.com
   */
  getParentZone(domain: string): string {
    const labels = domain.split('.');
    if (labels.length < 2) {
      return '.'; // Root
    }
    if (labels.length === 2) {
      return labels[1]; // TLD (e.g., 'com' for 'example.com')
    }
    return labels.slice(1).join('.');
  }

  /**
   * Collect delegation view from parent zone
   */
  async collectParentDelegation(recursiveResolver: string): Promise<DNSQueryResult> {
    const vantage: VantageInfo = {
      type: 'public-recursive',
      identifier: recursiveResolver,
      region: 'us-central',
    };

    return this.resolver.query({ name: this.domain, type: 'NS' }, vantage);
  }

  /**
   * Query each authoritative server individually
   */
  async collectFromAuthoritativeServers(
    query: DNSQuery,
    nsServers: string[]
  ): Promise<AuthoritativeResponse[]> {
    const results: AuthoritativeResponse[] = [];

    for (const server of nsServers) {
      const startTime = Date.now();

      try {
        const vantage: VantageInfo = {
          type: 'authoritative',
          identifier: server,
        };

        const result = await this.resolver.query(query, vantage);

        results.push({
          server,
          result,
          responseTime: Date.now() - startTime,
        });
      } catch (error) {
        // Record failure as a result
        results.push({
          server,
          result: {
            query,
            vantage: { type: 'authoritative', identifier: server },
            success: false,
            responseTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            answers: [],
            authority: [],
            additional: [],
          },
          responseTime: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Extract glue records from additional section
   */
  extractGlueRecords(result: DNSQueryResult): DNSAnswer[] {
    if (!result.additional || result.additional.length === 0) {
      return [];
    }

    // Glue is A/AAAA records for NS targets in the same zone
    const nsTargets = result.answers
      .filter((a: DNSAnswer) => a.type === 'NS')
      .map((a: DNSAnswer) => a.data.toLowerCase());

    return result.additional.filter(
      (record: DNSAnswer) =>
        (record.type === 'A' || record.type === 'AAAA') &&
        nsTargets.some((target: string) => record.name.toLowerCase() === target)
    );
  }

  /**
   * Detect missing glue when NS target is in-zone
   */
  detectMissingGlue(result: DNSQueryResult): string[] {
    const missing: string[] = [];
    const glue = this.extractGlueRecords(result);
    const glueTargets = new Set(glue.map((g) => g.name.toLowerCase()));

    for (const answer of result.answers) {
      if (answer.type !== 'NS') continue;

      const target = answer.data.toLowerCase();
      // If NS target is in the same zone, it should have glue
      if (
        target.endsWith(`.${this.domain.toLowerCase()}`) ||
        target === this.domain.toLowerCase()
      ) {
        if (!glueTargets.has(target)) {
          missing.push(target);
        }
      }
    }

    return missing;
  }

  /**
   * Detect divergence in answers across authoritative servers
   *
   * Groups servers by their answer signatures and returns divergence details
   * when multiple groups exist for the same query.
   */
  detectDivergence(responses: AuthoritativeResponse[]): {
    hasDivergence: boolean;
    divergenceDetails: DivergenceDetail[];
  } {
    const details: DivergenceDetail[] = [];

    // Group responses by query
    const byQuery = new Map<string, AuthoritativeResponse[]>();
    for (const resp of responses) {
      const key = `${resp.result.query.name}|${resp.result.query.type}`;
      if (!byQuery.has(key)) {
        byQuery.set(key, []);
      }
      byQuery.get(key)?.push(resp);
    }

    // Check each query for divergence
    for (const [key, queryResponses] of byQuery) {
      const [name, type] = key.split('|');

      // Get successful responses with answers
      const successful = queryResponses.filter(
        (r) => r.result.success && r.result.answers.length > 0
      );

      if (successful.length < 2) continue;

      // Group servers by their answer signature
      const groupsBySignature = new Map<string, AnswerGroup>();

      for (const resp of successful) {
        const signature = resp.result.answers
          .map((a: DNSAnswer) => a.data)
          .sort()
          .join(',');

        if (!groupsBySignature.has(signature)) {
          groupsBySignature.set(signature, {
            servers: [],
            answers: resp.result.answers,
            signature,
          });
        }
        groupsBySignature.get(signature)!.servers.push(resp.server);
      }

      // If there's more than one group, we have divergence
      const groups = Array.from(groupsBySignature.values());
      if (groups.length > 1) {
        // Sort groups by server count (majority first)
        groups.sort((a, b) => b.servers.length - a.servers.length);

        details.push({
          queryName: name,
          queryType: type,
          groups,
          totalServers: successful.length,
        });
      }
    }

    return {
      hasDivergence: details.length > 0,
      divergenceDetails: details,
    };
  }

  /**
   * Detect lame delegation
   */
  detectLameDelegation(responses: AuthoritativeResponse[]): LameDelegation[] {
    const lame: LameDelegation[] = [];

    for (const resp of responses) {
      if (!resp.result.success) {
        lame.push({
          server: resp.server,
          reason: this.categorizeFailure(resp.result.error || ''),
        });
      } else if (!resp.result.flags?.aa) {
        // Not authoritative
        lame.push({
          server: resp.server,
          reason: 'not-authoritative',
        });
      }
    }

    return lame;
  }

  /**
   * Collect with DNSSEC flags
   */
  async collectWithDnssec(
    name: string,
    type: string,
    recursiveResolver: string
  ): Promise<DNSQueryResult> {
    const vantage: VantageInfo = {
      type: 'public-recursive',
      identifier: recursiveResolver,
      region: 'us-central',
    };

    return this.resolver.query({ name, type }, vantage);
  }

  /**
   * Collect DNSKEY records
   */
  async collectDnskey(domain: string, recursiveResolver: string): Promise<DNSQueryResult> {
    return this.collectWithDnssec(domain, 'DNSKEY', recursiveResolver);
  }

  /**
   * Collect DS records from parent
   */
  async collectDsFromParent(domain: string, recursiveResolver: string): Promise<DNSQueryResult> {
    return this.collectWithDnssec(domain, 'DS', recursiveResolver);
  }

  /**
   * Generate complete delegation summary
   */
  async collectDelegationSummary(recursiveResolver: string): Promise<DelegationSummary> {
    // 1. Get parent delegation view
    const parentResult = await this.collectParentDelegation(recursiveResolver);

    if (!parentResult.success) {
      throw new Error(`Failed to collect parent delegation: ${parentResult.error}`);
    }

    // 2. Extract NS servers
    const nsServers = parentResult.answers
      .filter((a: DNSAnswer) => a.type === 'NS')
      .map((a: DNSAnswer) => a.data.replace(/\.$/, ''));

    // 3. Query each authoritative server
    const authResponses = await this.collectFromAuthoritativeServers(
      { name: this.domain, type: 'NS' },
      nsServers
    );

    // 4. Extract glue
    const glueRecords = this.extractGlueRecords(parentResult);
    const missingGlue = this.detectMissingGlue(parentResult);

    // 5. Detect divergence
    const { hasDivergence, divergenceDetails } = this.detectDivergence(authResponses);

    // 6. Detect lame delegation
    const lameDelegations = this.detectLameDelegation(authResponses);

    // 7. Collect DNSSEC info
    const dnssecInfo = await this.collectDnssecInfo(recursiveResolver);

    return {
      domain: this.domain,
      parentZone: this.getParentZone(this.domain),
      parentNs: parentResult.answers.filter((a: DNSAnswer) => a.type === 'NS'),
      authoritativeResponses: authResponses,
      glueRecords,
      missingGlue,
      hasDivergence,
      divergenceDetails,
      lameDelegations,
      dnssecInfo,
    };
  }

  /**
   * Collect DNSSEC information
   */
  private async collectDnssecInfo(recursiveResolver: string): Promise<DnssecInfo | null> {
    try {
      // Get DNSKEY
      const dnskeyResult = await this.collectDnskey(this.domain, recursiveResolver);

      // Get DS from parent
      const dsResult = await this.collectDsFromParent(this.domain, recursiveResolver);

      // Check for RRSIG in a typical query
      const sampleQuery = await this.collectWithDnssec(this.domain, 'A', recursiveResolver);

      // Safely check for RRSIG presence
      const hasRrsig = Boolean(
        (sampleQuery.authority?.some((r: DNSAnswer) => r.type === 'RRSIG') ?? false) ||
          (sampleQuery.answers?.some((r: DNSAnswer) => r.type === 'RRSIG') ?? false)
      );

      return {
        hasRrsig,
        adFlagSet: sampleQuery.flags?.ad ?? false,
        dnskeyRecords: dnskeyResult.success ? dnskeyResult.answers : [],
        dsRecords: dsResult.success ? dsResult.answers : [],
        validatingSource: recursiveResolver,
      };
    } catch (error) {
      console.error('Error collecting DNSSEC info:', error);
      return null;
    }
  }

  /**
   * Categorize failure reason
   */
  private categorizeFailure(error: string): LameDelegation['reason'] {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('refused') || error.includes('ECONNREFUSED')) return 'refused';
    return 'error';
  }
}

// Re-export types for convenience
export type {
  DNSAnswer,
  DNSQueryResult,
  VantageInfo,
} from '../dns/types.js';
