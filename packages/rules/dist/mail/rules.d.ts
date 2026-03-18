/**
 * Mail Rules Pack - Bead 09
 *
 * First benchmark-backed mail rules:
 * 1. MX present/absent
 * 2. Null MX posture
 * 3. SPF exists/malformed/absent
 * 4. DMARC exists/policy posture
 * 5. DKIM key presence for discovered selectors
 * 6. MTA-STS TXT presence
 * 7. TLS-RPT TXT presence
 * 8. BIMI as info-only
 */
import type { Rule } from '../engine';
export declare const mxPresenceRule: Rule;
export declare const spfRule: Rule;
export declare const dmarcRule: Rule;
export declare const dkimRule: Rule;
export declare const mtaStsRule: Rule;
export declare const tlsRptRule: Rule;
export declare const bimiRule: Rule;
export declare const mailRules: Rule[];
//# sourceMappingURL=rules.d.ts.map