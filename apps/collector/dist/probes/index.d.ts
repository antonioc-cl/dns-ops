/**
 * Probes Module - Bead 10
 *
 * Non-DNS probe sandbox for safe MTA-STS/SMTP/TLS checks.
 */
export type { AllowlistEntry } from './allowlist.js';
export { ProbeAllowlist, probeAllowlist } from './allowlist.js';
export type { MTASTSPolicy, MTASTSProbeResult } from './mta-sts.js';
export { fetchMTASTSPolicy, validateMTASTSTxtRecord } from './mta-sts.js';
export type { SMTPProbeResult } from './smtp-starttls.js';
export { probeMXHosts, probeSMTPStarttls } from './smtp-starttls.js';
export type { SSRFCheckResult } from './ssrf-guard.js';
export { checkResolvedIP, checkSSRF, validateUrl } from './ssrf-guard.js';
//# sourceMappingURL=index.d.ts.map