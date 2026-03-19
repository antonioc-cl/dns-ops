/**
 * Probes Module - Bead 10
 *
 * Non-DNS probe sandbox for safe MTA-STS/SMTP/TLS checks.
 */

// SSRF Guard
export { checkSSRF, validateUrl, checkResolvedIP } from './ssrf-guard.js';
export type { SSRFCheckResult } from './ssrf-guard.js';

// Allowlist
export { ProbeAllowlist, probeAllowlist } from './allowlist.js';
export type { AllowlistEntry } from './allowlist.js';

// MTA-STS Probe
export { fetchMTASTSPolicy, validateMTASTSTxtRecord } from './mta-sts.js';
export type { MTASTSProbeResult, MTASTSPolicy } from './mta-sts.js';

// SMTP STARTTLS Probe
export { probeSMTPStarttls, probeMXHosts } from './smtp-starttls.js';
export type { SMTPProbeResult } from './smtp-starttls.js';
