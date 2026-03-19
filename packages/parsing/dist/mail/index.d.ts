/**
 * Mail Record Parsing
 *
 * Parse SPF, DMARC, and DKIM records.
 */
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
export declare function parseSPF(txtData: string): SPFRecord | null;
/**
 * Count DNS lookups in an SPF record
 */
export declare function countSPFLookups(record: SPFRecord): number;
export interface DMARCRecord {
    version: string;
    policy: 'none' | 'quarantine' | 'reject';
    subdomainPolicy?: 'none' | 'quarantine' | 'reject';
    percentage?: number;
    rua?: string[];
    ruf?: string[];
    fo?: string;
    adkim?: 'r' | 's';
    aspf?: 'r' | 's';
    rf?: string;
    ri?: number;
    raw: string;
}
/**
 * Parse a DMARC TXT record
 */
export declare function parseDMARC(txtData: string): DMARCRecord | null;
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
export declare function parseDKIM(txtData: string): DKIMRecord | null;
export interface MTASTSRecord {
    version: string;
    mode: 'enforce' | 'testing' | 'none';
    maxAge: number;
    raw: string;
}
/**
 * Parse an MTA-STS TXT record
 */
export declare function parseMTASTS(txtData: string): MTASTSRecord | null;
//# sourceMappingURL=index.d.ts.map