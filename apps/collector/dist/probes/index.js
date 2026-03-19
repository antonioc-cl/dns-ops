/**
 * Probes Module - Bead 10
 *
 * Non-DNS probe sandbox for safe MTA-STS/SMTP/TLS checks.
 */
// SSRF Guard
export { checkSSRF, validateUrl, checkResolvedIP } from './ssrf-guard.js';
// Allowlist
export { ProbeAllowlist, probeAllowlist } from './allowlist.js';
// MTA-STS Probe
export { fetchMTASTSPolicy, validateMTASTSTxtRecord } from './mta-sts.js';
// SMTP STARTTLS Probe
export { probeSMTPStarttls, probeMXHosts } from './smtp-starttls.js';
//# sourceMappingURL=index.js.map