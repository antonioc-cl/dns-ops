/**
 * Mail Record Parsing
 *
 * Parse SPF, DMARC, and DKIM records.
 */

// =============================================================================
// SPF Parsing
// =============================================================================

export interface SPFRecord {
  version: string;
  mechanisms: SPFMechanism[];
  modifiers: SPFModifier[];
  raw: string;
}

export interface SPFMechanism {
  type: string;
  value?: string;
  prefix: '+' | '-' | '~' | '?';
  prefixName: 'pass' | 'fail' | 'softfail' | 'neutral';
}

export interface SPFModifier {
  name: string;
  value: string;
}

/**
 * Parse an SPF TXT record
 */
export function parseSPF(txtData: string): SPFRecord | null {
  // Check if this is an SPF record
  if (!txtData.includes('v=spf1')) {
    return null;
  }

  const parts = txtData.split(/\s+/).filter(Boolean);
  const mechanisms: SPFMechanism[] = [];
  const modifiers: SPFModifier[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Version
    if (part.startsWith('v=')) {
      continue;
    }

    // Modifier (key=value format)
    if (part.includes('=')) {
      const [name, ...valueParts] = part.split('=');
      modifiers.push({
        name,
        value: valueParts.join('='),
      });
      continue;
    }

    // Mechanism
    const mechanism = parseMechanism(part);
    if (mechanism) {
      mechanisms.push(mechanism);
    }
  }

  return {
    version: 'spf1',
    mechanisms,
    modifiers,
    raw: txtData,
  };
}

function parseMechanism(part: string): SPFMechanism | null {
  // Determine prefix
  let prefix: '+' | '-' | '~' | '?' = '+';
  let prefixName: 'pass' | 'fail' | 'softfail' | 'neutral' = 'pass';

  if (part.startsWith('-')) {
    prefix = '-';
    prefixName = 'fail';
    part = part.slice(1);
  } else if (part.startsWith('~')) {
    prefix = '~';
    prefixName = 'softfail';
    part = part.slice(1);
  } else if (part.startsWith('?')) {
    prefix = '?';
    prefixName = 'neutral';
    part = part.slice(1);
  } else if (part.startsWith('+')) {
    part = part.slice(1);
  }

  // Parse mechanism type and value
  const colonIndex = part.indexOf(':');
  const type = colonIndex >= 0 ? part.slice(0, colonIndex) : part;
  const value = colonIndex >= 0 ? part.slice(colonIndex + 1) : undefined;

  return {
    type,
    value,
    prefix,
    prefixName,
  };
}

/**
 * Count DNS lookups in an SPF record
 */
export function countSPFLookups(record: SPFRecord): number {
  let count = 0;
  const lookupMechanisms = ['include', 'a', 'mx', 'ptr', 'exists', 'redirect'];

  for (const mech of record.mechanisms) {
    if (lookupMechanisms.includes(mech.type)) {
      count++;
    }
  }

  return count;
}

// =============================================================================
// DMARC Parsing
// =============================================================================

export interface DMARCRecord {
  version: string;
  policy: 'none' | 'quarantine' | 'reject';
  subdomainPolicy?: 'none' | 'quarantine' | 'reject';
  percentage?: number;
  rua?: string[]; // Aggregate report URIs
  ruf?: string[]; // Forensic report URIs
  fo?: string; // Failure reporting options
  adkim?: 'r' | 's'; // DKIM alignment
  aspf?: 'r' | 's'; // SPF alignment
  rf?: string; // Report format
  ri?: number; // Report interval
  raw: string;
}

/**
 * Parse a DMARC TXT record
 */
export function parseDMARC(txtData: string): DMARCRecord | null {
  // Check if this is a DMARC record
  if (!txtData.includes('v=DMARC1')) {
    return null;
  }

  const record: Partial<DMARCRecord> = {
    version: 'DMARC1',
    raw: txtData,
  };

  const parts = txtData.split(/\s*;\s*/).filter(Boolean);

  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    const value = valueParts.join('=').trim();

    switch (key.trim()) {
      case 'v':
        record.version = value;
        break;
      case 'p':
        record.policy = value as 'none' | 'quarantine' | 'reject';
        break;
      case 'sp':
        record.subdomainPolicy = value as 'none' | 'quarantine' | 'reject';
        break;
      case 'pct':
        record.percentage = parseInt(value, 10);
        break;
      case 'rua':
        record.rua = value.split(',').map((s) => s.trim());
        break;
      case 'ruf':
        record.ruf = value.split(',').map((s) => s.trim());
        break;
      case 'fo':
        record.fo = value;
        break;
      case 'adkim':
        record.adkim = value as 'r' | 's';
        break;
      case 'aspf':
        record.aspf = value as 'r' | 's';
        break;
      case 'rf':
        record.rf = value;
        break;
      case 'ri':
        record.ri = parseInt(value, 10);
        break;
    }
  }

  // Policy is required
  if (!record.policy) {
    return null;
  }

  return record as DMARCRecord;
}

// =============================================================================
// DKIM Parsing
// =============================================================================

export interface DKIMRecord {
  version?: string;
  publicKey: string;
  keyType: string;
  serviceType?: string[];
  notes?: string;
  flags?: string[];
  raw: string;
}

/**
 * Parse a DKIM TXT record
 */
export function parseDKIM(txtData: string): DKIMRecord | null {
  const record: Partial<DKIMRecord> = {
    keyType: 'rsa',
    raw: txtData,
  };

  // DKIM records use key=value format
  const parts = txtData.split(/\s*;\s*/).filter(Boolean);

  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    const value = valueParts.join('=').trim();

    switch (key.trim()) {
      case 'v':
        record.version = value;
        break;
      case 'k':
        record.keyType = value;
        break;
      case 'p':
        record.publicKey = value;
        break;
      case 's':
        record.serviceType = value.split(':').map((s) => s.trim());
        break;
      case 'n':
        record.notes = value;
        break;
      case 't':
        record.flags = value.split(':').map((s) => s.trim());
        break;
    }
  }

  // Public key is required
  if (!record.publicKey) {
    return null;
  }

  return record as DKIMRecord;
}

// =============================================================================
// MTA-STS Parsing
// =============================================================================

export interface MTASTSRecord {
  version: string;
  mode: 'enforce' | 'testing' | 'none';
  maxAge: number;
  raw: string;
}

/**
 * Parse an MTA-STS TXT record
 */
export function parseMTASTS(txtData: string): MTASTSRecord | null {
  if (!txtData.includes('v=STSv1')) {
    return null;
  }

  const record: Partial<MTASTSRecord> = {
    version: 'STSv1',
    raw: txtData,
  };

  const parts = txtData.split(/\s*;\s*/).filter(Boolean);

  for (const part of parts) {
    const [key, ...valueParts] = part.split('=');
    const value = valueParts.join('=').trim();

    switch (key.trim()) {
      case 'v':
        record.version = value;
        break;
      case 'id':
        // ID is a timestamp/version identifier
        break;
    }
  }

  // MTA-STS policy details come from the HTTPS endpoint
  // The TXT record just signals that MTA-STS is configured

  return record as MTASTSRecord;
}
