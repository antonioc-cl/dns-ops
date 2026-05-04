/**
 * SMTP STARTTLS Probe - Bead 10 / AUTH-003
 *
 * Checks SMTP server for STARTTLS capability.
 * Performs limited SMTP handshake to detect TLS support.
 */
export interface SMTPProbeResult {
    success: boolean;
    hostname: string;
    port: number;
    supportsStarttls: boolean;
    tlsVersion?: string;
    tlsCipher?: string;
    certificate?: {
        subject: string;
        issuer: string;
        validFrom: string;
        validTo: string;
        fingerprint: string;
    };
    smtpBanner?: string;
    error?: string;
    responseTimeMs: number;
}
/**
 * Probe SMTP server for STARTTLS capability
 *
 * @param hostname - Target SMTP server hostname
 * @param tenantId - Tenant ID for allowlist scoping (AUTH-003)
 * @param options - Probe options including port, timeout, and allowlist settings
 */
export declare function probeSMTPStarttls(hostname: string, tenantId: string, options?: {
    port?: number;
    timeoutMs?: number;
    checkAllowlist?: boolean;
    ehloDomain?: string;
}): Promise<SMTPProbeResult>;
/**
 * Batch probe multiple MX hosts
 */
export declare function probeMXHosts(hosts: Array<{
    hostname: string;
    priority: number;
}>, tenantId: string, options?: {
    timeoutMs?: number;
    concurrency?: number;
}): Promise<SMTPProbeResult[]>;
//# sourceMappingURL=smtp-starttls.d.ts.map