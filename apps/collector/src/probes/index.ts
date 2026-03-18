/**
 * Probes Module - Bead 10
 *
 * Non-DNS probe sandbox for safe MTA-STS/SMTP/TLS checks.
 */

// SSRF Guard
export { checkSSRF, validateUrl, checkResolvedIP } from './ssrf-guard';
export type { SSRFCheckResult } from './ssrf-guard';

// Allowlist
export { ProbeAllowlist, probeAllowlist } from './allowlist';
export type { AllowlistEntry } from './allowlist';

// MTA-STS Probe
export { fetchMTASTSPolicy, validateMTASTSTxtRecord } from './mta-sts';
export type { MTASTSProbeResult, MTASTSPolicy } from './mta-sts';

// SMTP STARTTLS Probe
export { probeSMTPStarttls, probeMXHosts } from './smtp-starttls';
export type { SMTPProbeResult } from './smtp-starttls';
