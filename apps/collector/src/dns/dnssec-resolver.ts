/**
 * DNSSEC DNS Resolver - DNS-002
 *
 * Provides DNSKEY and DS query support using dns-packet library.
 * Node.js native dns module doesn't support these record types.
 */

import * as dnsPacket from 'dns-packet';
import type { DNSAnswer, DNSQuery } from './types.js';
import { DNS_RCODE } from '@dns-ops/contracts';

/**
 * DNS record types supported by dns-packet
 */
const DNS_TYPES: Record<string, number> = {
  DNSKEY: 48,
  DS: 43,
  RRSIG: 46,
  NSEC: 47,
  NSEC3: 50,
  NSEC3PARAM: 51,
  TLSA: 52,
  CDS: 59,
  CDNSKEY: 60,
};

/**
 * Default DNS servers for recursive queries
 */
const DEFAULT_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

/**
 * Perform a DNS query using raw packet exchange
 * This allows querying for record types not supported by Node.js dns module
 */
export async function queryWithDnsPacket(
  query: DNSQuery,
  dnsServer: string = DEFAULT_DNS_SERVERS[0]
): Promise<{
  answers: DNSAnswer[];
  authority: DNSAnswer[];
  additional: DNSAnswer[];
  flags: {
    aa: boolean;
    tc: boolean;
    rd: boolean;
    ra: boolean;
    ad: boolean;
    cd: boolean;
  };
  responseCode: number;
}> {
  const packetOut = dnsPacket.prepareQuery({
    type: DNS_TYPES[query.type] || 0,
    name: query.name,
    id: Math.floor(Math.random() * 0xffff),
    flags: dnsPacket.RECURSION_DESIRED,
    questions: [
      {
        type: DNS_TYPES[query.type] || 0,
        name: query.name,
        class: 'IN',
      },
    ],
  });

  // Send UDP query
  const response = await sendDnsQuery(packetOut, dnsServer, 53);

  // Parse response
  const packetIn = dnsPacket.parse(response);

  // Extract answers
  const answers: DNSAnswer[] = (packetIn.answers || []).map((r: dnsPacket.Record) => ({
    name: r.name,
    type: query.type,
    ttl: r.ttl || 0,
    data: formatRecordData(r),
  }));

  // Extract authority records
  const authority: DNSAnswer[] = (packetIn.authority || []).map((r: dnsPacket.Record) => ({
    name: r.name,
    type: query.type,
    ttl: r.ttl || 0,
    data: formatRecordData(r),
  }));

  return {
    answers,
    authority,
    additional: [],
    flags: {
      aa: !!(packetIn.flags & dnsPacket.AUTHORITATIVE_ANSWER),
      tc: !!(packetIn.flags & dnsPacket.TRUNCATED_RESPONSE),
      rd: !!(packetIn.flags & dnsPacket.RECURSION_DESIRED),
      ra: !!(packetIn.flags & dnsPacket.RECURSION_AVAILABLE),
      ad: !!(packetIn.flags & dnsPacket.AUTHENTICATED_DATA),
      cd: !!(packetIn.flags & dnsPacket.CHECKING_DISABLED),
    },
    responseCode: packetIn.rcode || 0,
  };
}

/**
 * Format record data based on type
 */
function formatRecordData(record: dnsPacket.Record): string {
  // DNSKEY record
  if ('flags' in record && 'algorithm' in record && 'publicKey' in record) {
    const keyFlags = record.flags || 0;
    return `${keyFlags} 3 ${record.algorithm || 8} ${record.publicKey}`;
  }

  // DS record
  if ('digestType' in record && 'digest' in record) {
    return `${record.keyTag || 0} ${record.algorithm || 8} ${record.digestType || 2} ${record.digest}`;
  }

  // Generic record - stringify
  return JSON.stringify(record);
}

/**
 * Send DNS query over UDP
 */
async function sendDnsQuery(
  packet: Buffer,
  server: string,
  port: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const dgram = require('node:dgram');
    const client = dgram.createSocket('udp4');

    const timeout = setTimeout(() => {
      client.close();
      reject(new Error('DNS query timeout'));
    }, 5000);

    client.on('message', (msg: Buffer) => {
      clearTimeout(timeout);
      client.close();
      resolve(msg);
    });

    client.on('error', (err: Error) => {
      clearTimeout(timeout);
      client.close();
      reject(err);
    });

    client.send(packet, 0, packet.length, port, server);
  });
}

/**
 * Query DNSKEY records for a domain
 */
export async function queryDNSKEY(domain: string): Promise<{
  success: boolean;
  answers: DNSAnswer[];
  error?: string;
}> {
  try {
    const result = await queryWithDnsPacket({ name: domain, type: 'DNSKEY' });

    if (result.responseCode !== DNS_RCODE.NOERROR) {
      return {
        success: false,
        answers: [],
        error: `DNSKEY query failed with code: ${result.responseCode}`,
      };
    }

    return {
      success: true,
      answers: result.answers,
    };
  } catch (error) {
    return {
      success: false,
      answers: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Query DS records for a domain (from parent zone)
 */
export async function queryDS(domain: string): Promise<{
  success: boolean;
  answers: DNSAnswer[];
  error?: string;
}> {
  try {
    const result = await queryWithDnsPacket({ name: domain, type: 'DS' });

    if (result.responseCode !== DNS_RCODE.NOERROR) {
      return {
        success: false,
        answers: [],
        error: `DS query failed with code: ${result.responseCode}`,
      };
    }

    return {
      success: true,
      answers: result.answers,
    };
  } catch (error) {
    return {
      success: false,
      answers: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
