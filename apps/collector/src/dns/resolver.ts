/**
 * DNS Resolver
 *
 * Performs actual DNS queries using Node.js dns module.
 * Supports both recursive and authoritative resolution.
 */

import { Resolver } from 'node:dns/promises';
import type { DNSAnswer, DNSQuery, DNSQueryResult, VantageInfo } from './types.js';

export class DNSResolver {
  /**
   * Perform a DNS query
   */
  async query(query: DNSQuery, vantage: VantageInfo): Promise<DNSQueryResult> {
    const startTime = Date.now();

    try {
      // Create resolver with specific server if provided
      const resolver = new Resolver();

      if (vantage.type === 'public-recursive') {
        resolver.setServers([vantage.identifier]);
      } else if (vantage.type === 'authoritative') {
        // For authoritative queries, we'd need to implement custom logic
        // For now, use the default resolver
        resolver.setServers([vantage.identifier]);
      }

      // Map query type to Node.js dns method
      const result = await this.performQuery(resolver, query);
      const responseTime = Date.now() - startTime;

      return {
        query,
        vantage,
        success: true,
        responseCode: 0, // NOERROR
        flags: {
          aa: false,
          tc: false,
          rd: true,
          ra: true,
          ad: false,
          cd: false,
        },
        answers: result.answers,
        authority: result.authority || [],
        additional: result.additional || [],
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Determine error type
      let responseCode = 2; // SERVFAIL default

      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('NXDOMAIN')) {
        responseCode = 3; // NXDOMAIN
      } else if (errorMessage.includes('ECONNREFUSED')) {
        responseCode = 5; // REFUSED
      } else if (errorMessage.includes('timeout')) {
        responseCode = 2; // SERVFAIL (timeout)
      }

      return {
        query,
        vantage,
        success: false,
        responseCode,
        flags: {
          aa: false,
          tc: false,
          rd: true,
          ra: false,
          ad: false,
          cd: false,
        },
        answers: [],
        authority: [],
        additional: [],
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Perform the actual DNS query based on record type
   */
  private async performQuery(
    resolver: Resolver,
    query: DNSQuery
  ): Promise<{ answers: DNSAnswer[]; authority?: DNSAnswer[]; additional?: DNSAnswer[] }> {
    const { name, type } = query;

    switch (type) {
      case 'A':
        return this.queryA(resolver, name);
      case 'AAAA':
        return this.queryAAAA(resolver, name);
      case 'MX':
        return this.queryMX(resolver, name);
      case 'TXT':
        return this.queryTXT(resolver, name);
      case 'NS':
        return this.queryNS(resolver, name);
      case 'CNAME':
        return this.queryCNAME(resolver, name);
      case 'SOA':
        return this.querySOA(resolver, name);
      case 'CAA':
        return this.queryCAA(resolver, name);
      default:
        throw new Error(`Unsupported record type: ${type}`);
    }
  }

  private async queryA(resolver: Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const addresses = await resolver.resolve4(name);
    return {
      answers: addresses.map((addr: string) => ({
        name,
        type: 'A',
        ttl: 300, // Default TTL
        data: addr,
      })),
    };
  }

  private async queryAAAA(resolver: Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const addresses = await resolver.resolve6(name);
    return {
      answers: addresses.map((addr: string) => ({
        name,
        type: 'AAAA',
        ttl: 300,
        data: addr,
      })),
    };
  }

  private async queryMX(resolver: Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const records = await resolver.resolveMx(name);
    return {
      answers: records.map((mx: { priority: number; exchange: string }) => ({
        name,
        type: 'MX',
        ttl: 300,
        data: `${mx.priority} ${mx.exchange}`,
      })),
    };
  }

  private async queryTXT(resolver: Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const records = await resolver.resolveTxt(name);
    return {
      answers: records.map((txt: string[]) => ({
        name,
        type: 'TXT',
        ttl: 300,
        data: txt.join(''), // Join multiple strings
      })),
    };
  }

  private async queryNS(resolver: Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const records = await resolver.resolveNs(name);
    return {
      answers: records.map((ns: string) => ({
        name,
        type: 'NS',
        ttl: 300,
        data: ns,
      })),
    };
  }

  private async queryCNAME(
    resolver: Resolver,
    name: string
  ): Promise<{ answers: DNSAnswer[] }> {
    const records = await resolver.resolveCname(name);
    return {
      answers: records.map((cname: string) => ({
        name,
        type: 'CNAME',
        ttl: 300,
        data: cname,
      })),
    };
  }

  private async querySOA(resolver: Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const soa = (await resolver.resolveSoa(name)) as {
      nsname: string;
      hostmaster: string;
      serial: number;
      refresh: number;
      retry: number;
      expire: number;
      minttl?: number;
      minimumTTL?: number;
    };
    const minTTL = soa.minttl ?? soa.minimumTTL ?? 300;
    return {
      answers: [
        {
          name,
          type: 'SOA',
          ttl: minTTL,
          data: `${soa.nsname} ${soa.hostmaster} ${soa.serial} ${soa.refresh} ${soa.retry} ${soa.expire} ${minTTL}`,
        },
      ],
    };
  }

  private async queryCAA(resolver: Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    // Node.js doesn't have native CAA support, use resolveAny and filter
    try {
      const records = await resolver.resolveAny(name);
      const caaRecords = (
        records as Array<{ type: string; critical?: number; issue?: string; value?: string }>
      ).filter((r) => r.type === 'CAA');
      return {
        answers: caaRecords.map((caa) => ({
          name,
          type: 'CAA',
          ttl: 300,
          data: `${caa.critical ?? 0} ${caa.issue ?? ''} "${caa.value ?? ''}"`,
        })),
      };
    } catch {
      return { answers: [] };
    }
  }
}
