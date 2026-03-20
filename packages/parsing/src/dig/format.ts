/**
 * Dig-Style Output Formatting
 *
 * Format DNS observations in dig-like text format for familiar CLI presentation.
 */

import type { Observation } from '@dns-ops/db/schema';

interface DigFormatOptions {
  showComments?: boolean;
  showQuestion?: boolean;
}

/**
 * Format response code as text
 */
function rcodeToString(rcode: number | null | undefined): string {
  if (rcode === null || rcode === undefined) return 'UNKNOWN';

  const codes: Record<number, string> = {
    0: 'NOERROR',
    1: 'FORMERR',
    2: 'SERVFAIL',
    3: 'NXDOMAIN',
    4: 'NOTIMP',
    5: 'REFUSED',
    6: 'YXDOMAIN',
    7: 'YXRRSET',
    8: 'NXRRSET',
    9: 'NOTAUTH',
    10: 'NOTZONE',
  };

  return codes[rcode] || `RCODE_${rcode}`;
}

/**
 * Format flags as dig-style string
 */
function formatFlags(flags: Record<string, boolean> | null | undefined): string {
  if (!flags) return '';

  const flagNames: string[] = [];
  if (flags.authoritative) flagNames.push('aa');
  if (flags.truncated) flagNames.push('tc');
  if (flags.recursionDesired) flagNames.push('rd');
  if (flags.recursionAvailable) flagNames.push('ra');
  if (flags.authenticated) flagNames.push('ad');
  if (flags.checkingDisabled) flagNames.push('cd');

  return flagNames.join(' ');
}

/**
 * Format a DNS record as dig-style output
 */
function formatRecordLine(record: {
  name: string;
  type: string;
  ttl: number;
  data: string;
  priority?: number;
}): string {
  const name = record.name.endsWith('.') ? record.name : `${record.name}.`;

  if (record.type === 'MX' && record.priority !== undefined) {
    return `${name}\t${record.ttl}\tIN\t${record.type}\t${record.priority}\t${record.data}`;
  }

  if (record.type === 'SOA') {
    const parts = record.data.split(' ');
    return `${name}\t${record.ttl}\tIN\t${record.type}\t${parts.join('\t')}`;
  }

  return `${name}\t${record.ttl}\tIN\t${record.type}\t${record.data}`;
}

/**
 * Format a single observation as dig-style output
 */
export function toDigFormat(observation: Observation, options: DigFormatOptions = {}): string {
  const { showComments = true, showQuestion = true } = options;
  const lines: string[] = [];

  // Header comments
  if (showComments) {
    lines.push(`; <<>> DNS Ops Workbench <<>> ${observation.queryName} ${observation.queryType}`);
    lines.push(`; (1 server found)`);
    lines.push(`;; global options: +cmd`);
    lines.push(`;; Got answer:`);
  }

  // Response header
  const rcode = rcodeToString(observation.responseCode);
  const flags = formatFlags(observation.flags);

  const answerCount = observation.answerSection?.length || 0;
  const authorityCount = observation.authoritySection?.length || 0;
  const additionalCount = observation.additionalSection?.length || 0;

  lines.push(`;; ->>HEADER<<- opcode: QUERY, status: ${rcode}, id: ${observation.id.slice(0, 4)}`);
  lines.push(
    `;; flags: ${flags}; QUERY: 1, ANSWER: ${answerCount}, AUTHORITY: ${authorityCount}, ADDITIONAL: ${additionalCount}`
  );

  // Question section
  if (showQuestion) {
    lines.push('');
    lines.push(';; QUESTION SECTION:');
    const qname = observation.queryName.endsWith('.')
      ? observation.queryName
      : `${observation.queryName}.`;
    lines.push(`;${qname}\t\tIN\t${observation.queryType}`);
  }

  // Answer section
  if (answerCount > 0) {
    lines.push('');
    lines.push(';; ANSWER SECTION:');
    for (const record of observation.answerSection || []) {
      lines.push(formatRecordLine(record));
    }
  }

  // Authority section
  if (authorityCount > 0) {
    lines.push('');
    lines.push(';; AUTHORITY SECTION:');
    for (const record of observation.authoritySection || []) {
      lines.push(formatRecordLine(record));
    }
  }

  // Additional section
  if (additionalCount > 0) {
    lines.push('');
    lines.push(';; ADDITIONAL SECTION:');
    for (const record of observation.additionalSection || []) {
      lines.push(formatRecordLine(record));
    }
  }

  // Footer
  lines.push('');
  lines.push(`;; Query time: ${observation.responseTimeMs || 0} msec`);
  lines.push(`;; SERVER: ${observation.vantageIdentifier || observation.vantageType}#53`);
  lines.push(`;; WHEN: ${new Date(observation.queriedAt).toString()}`);
  lines.push(`;; MSG SIZE rcvd: ${estimateMessageSize(observation)}`);

  return lines.join('\n');
}

/**
 * Format multiple observations as dig-style output
 */
export function observationsToDigFormat(
  observations: Observation[],
  options?: DigFormatOptions
): string {
  return observations
    .map((obs) => toDigFormat(obs, options))
    .join('\n\n; ========================================\n\n');
}

/**
 * Estimate message size (rough approximation)
 */
function estimateMessageSize(observation: Observation): number {
  let size = 12; // DNS header

  // Question section
  size += observation.queryName.length + 4;

  // Answer section
  for (const record of observation.answerSection || []) {
    size += record.name.length + record.data.length + 12;
  }

  // Authority section
  for (const record of observation.authoritySection || []) {
    size += record.name.length + record.data.length + 12;
  }

  // Additional section
  for (const record of observation.additionalSection || []) {
    size += record.name.length + record.data.length + 12;
  }

  return size;
}

/**
 * Get status color for dig output
 */
export function getStatusColor(status: string): 'green' | 'yellow' | 'red' {
  switch (status) {
    case 'success':
      return 'green';
    case 'timeout':
    case 'refused':
      return 'yellow';
    case 'error':
    case 'nxdomain':
      return 'red';
    default:
      return 'yellow';
  }
}
