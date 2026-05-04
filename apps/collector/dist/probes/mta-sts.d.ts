/**
 * MTA-STS Policy Fetch Probe - Bead 10 / AUTH-003
 *
 * Fetches MTA-STS policy from https://mta-sts.{domain}/.well-known/mta-sts.txt
 * Validates policy format and extracts mode/max_age/mx directives.
 */
export interface MTASTSProbeResult {
    success: boolean;
    domain: string;
    policyUrl: string;
    policy?: MTASTSPolicy;
    rawPolicy?: string;
    error?: string;
    responseTimeMs: number;
    tlsVersion?: string;
    certificateValid?: boolean;
}
export interface MTASTSPolicy {
    version: string;
    mode: 'enforce' | 'testing' | 'none';
    maxAge: number;
    mx: string[];
    raw: string;
}
/**
 * Fetch MTA-STS policy for a domain
 *
 * @param domain - Target domain for MTA-STS policy
 * @param tenantId - Tenant ID for allowlist scoping (AUTH-003)
 * @param options - Probe options including timeout and allowlist settings
 */
export declare function fetchMTASTSPolicy(domain: string, tenantId: string, options?: {
    timeoutMs?: number;
    checkAllowlist?: boolean;
}): Promise<MTASTSProbeResult>;
/**
 * Validate that a domain has valid MTA-STS TXT record before fetching policy
 */
export declare function validateMTASTSTxtRecord(_domain: string, txtRecords: string[]): Promise<{
    valid: boolean;
    id?: string;
    error?: string;
}>;
//# sourceMappingURL=mta-sts.d.ts.map