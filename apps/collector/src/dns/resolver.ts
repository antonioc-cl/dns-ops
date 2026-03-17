/**
 * DNS Resolver
 *
 * Performs actual DNS queries using Node.js dns module.
 * Supports both recursive and authoritative resolution.
 */

import * as dns from 'dns';
import { promisify } from 'util';
import type { DNSQuery, DNSQueryResult, VantageInfo, DNSFlags, DNSAnswer } from './types';

const dnsResolve = promisify(dns.resolve);
const dnsResolveAny = promisify(dns.resolveAny);
const dnsResolveNs = promisify(dns.resolveNs);

// DNS response codes
const RESPONSE_CODES: Record<number, string> = {
  0: 'NOERROR',
  1: 'FORMERR',
  2: 'SERVFAIL',
  3: 'NXDOMAIN',
  4: 'NOTIMP',
  5: 'REFUSED',
};

export class DNSResolver {
  /**
   * Perform a DNS query
   */
  async query(query: DNSQuery, vantage: VantageInfo): Promise<DNSQueryResult> {
    const startTime = Date.now();

    try {
      // Create resolver with specific server if provided
      const resolver = new dns.Resolver();
      
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
    resolver: dns.Resolver,
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

  private async queryA(resolver: dns.Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const addresses = await resolver.resolve4(name);
    return {
      answers: addresses.map((addr) => ({
        name,
        type: 'A',
        ttl: 300, // Default TTL
        data: addr,
      })),
    };
  }

  private async queryAAAA(resolver: dns.Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const addresses = await resolver.resolve6(name);
    return {
      answers: addresses.map((addr) => ({
        name,
        type: 'AAAA',
        ttl: 300,
        data: addr,
      })),
    };
  }

  private async queryMX(resolver: dns.Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const records = await resolver.resolveMx(name);
    return {
      answers: records.map((mx) => ({
        name,
        type: 'MX',
        ttl: 300,
        data: `${mx.priority} ${mx.exchange}`,
      })),
    };
  }

  private async queryTXT(resolver: dns.Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const records = await resolver.resolveTxt(name);
    return {
      answers: records.map((txt) => ({
        name,
        type: 'TXT',
        ttl: 300,
        data: txt.join(''), // Join multiple strings
      })),
    };
  }

  private async queryNS(resolver: dns.Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const records = await resolver.resolveNs(name);
    return {
      answers: records.map((ns) => ({
        name,
        type: 'NS',
        ttl: 300,
        data: ns,
      })),
    };
  }

  private async queryCNAME(resolver: dns.Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const records = await resolver.resolveCname(name);
    return {
      answers: records.map((cname) => ({
        name,
        type: 'CNAME',
        ttl: 300,
        data: cname,
      })),
    };
  }

  private async querySOA(resolver: dns.Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    const records = await resolver.resolveSoa(name);
    return {
      answers: records.map((soa) => ({
        name,
        type: 'SOA',
        ttl: soa.minimumTTL || 300,
        data: `${soa.nsname} ${soa.hostmaster} ${soa.serial} ${soa.refresh} ${soa.retry} ${soa.expire} ${soa.minimumTTL}`,
      })),
    };
  }

  private async queryCAA(resolver: dns.Resolver, name: string): Promise<{ answers: DNSAnswer[] }> {
    // Node.js doesn't have native CAA support, use resolveAny and filter
    try {
      const records = await resolver.resolveAny(name);
      const caaRecords = records.filter((r: any) => r.type === 'CAA');
      return {
        answers: caaRecords.map((caa: any) => ({
          name,
          type: 'CAA',
          ttl: 300,
          data: `${caa.critical} ${caa.issue} "${caa.value}"`,
        })),
      };
    } catch {
      return { answers: [] };
    }
  }
}
