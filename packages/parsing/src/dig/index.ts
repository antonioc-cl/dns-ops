/**
 * Dig-style formatting
 *
 * Format DNS responses in dig-like output for display.
 */

import type { DNSRecord } from '../../db/src/schema';

export interface DigFormatOptions {
  showTimestamp?: boolean;
  showServer?: boolean;
  showFlags?: boolean;
}

/**
 * Format a DNS response in dig-like output
 */
export function formatDigStyle(
  queryName: string,
  queryType: string,
  response: {
    opcode: string;
    status: string;
    id: number;
    flags: string[];
    answer: DNSRecord[];
    authority: DNSRecord[];
    additional: DNSRecord[];
    server?: string;
    queryTime?: number;
  },
  options: DigFormatOptions = {}
): string {
  const lines: string[] = [];

  // Header
  lines.push(`; <<>> DiG-like output <<>> ${queryName} ${queryType}`);
  lines.push(';; Got answer:');
  lines.push(
    `;; ->>HEADER<<- opcode: ${response.opcode}, status: ${response.status}, id: ${response.id}`
  );

  // Flags
  if (options.showFlags !== false && response.flags.length > 0) {
    lines.push(`;; flags: ${response.flags.join(' ')}; QUERY: 1, ANSWER: ${response.answer.length}`);
  }

  lines.push('');

  // Question section
  lines.push(';; QUESTION SECTION:');
  lines.push(`;${queryName}\t\tIN\t${queryType}`);
  lines.push('');

  // Answer section
  if (response.answer.length > 0) {
    lines.push(';; ANSWER SECTION:');
    for (const record of response.answer) {
      lines.push(formatRecord(record));
    }
    lines.push('');
  }

  // Authority section
  if (response.authority.length > 0) {
    lines.push(';; AUTHORITY SECTION:');
    for (const record of response.authority) {
      lines.push(formatRecord(record));
    }
    lines.push('');
  }

  // Additional section
  if (response.additional.length > 0) {
    lines.push(';; ADDITIONAL SECTION:');
    for (const record of response.additional) {
      lines.push(formatRecord(record));
    }
    lines.push('');
  }

  // Server info
  if (options.showServer && response.server) {
    lines.push(`;; SERVER: ${response.server}`);
  }

  // Query time
  if (response.queryTime !== undefined) {
    lines.push(`;; Query time: ${response.queryTime} msec`);
  }

  return lines.join('\n');
}

/**
 * Format a single DNS record in dig format
 */
function formatRecord(record: DNSRecord): string {
  const name = record.name.padEnd(24);
  const ttl = record.ttl.toString().padStart(8);
  const type = record.type.padStart(6);
  const data = record.data;

  return `${name}\t${ttl}\tIN\t${type}\t${data}`;
}

/**
 * Format a simple dig-like summary (just answer records)
 */
export function formatDigSummary(
  queryName: string,
  queryType: string,
  records: DNSRecord[]
): string {
  if (records.length === 0) {
    return `; No records found for ${queryName} ${queryType}`;
  }

  const lines: string[] = [
    `; ${queryName} ${queryType}`,
    '',
    ...records.map(formatRecord),
  ];

  return lines.join('\n');
}
