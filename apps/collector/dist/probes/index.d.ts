/**
 * Probes Module - Bead 10
 *
 * Non-DNS probe sandbox for safe MTA-STS/SMTP/TLS checks.
 */
export { checkSSRF, validateUrl, checkResolvedIP } from './ssrf-guard.js';
export type { SSRFCheckResult } from './ssrf-guard.js';
export { ProbeAllowlist, probeAllowlist } from './allowlist.js';
export type { AllowlistEntry } from './allowlist.js';
export { fetchMTASTSPolicy, validateMTASTSTxtRecord } from './mta-sts.js';
export type { MTASTSProbeResult, MTASTSPolicy } from './mta-sts.js';
export { probeSMTPStarttls, probeMXHosts } from './smtp-starttls.js';
export type { SMTPProbeResult } from './smtp-starttls.js';
//# sourceMappingURL=index.d.ts.map