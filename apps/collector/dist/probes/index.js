/**
 * Probes Module - Bead 10
 *
 * Non-DNS probe sandbox for safe MTA-STS/SMTP/TLS checks.
 */
// Allowlist
export { ProbeAllowlist, probeAllowlist } from './allowlist.js';
// MTA-STS Probe
export { fetchMTASTSPolicy, validateMTASTSTxtRecord } from './mta-sts.js';
// SMTP STARTTLS Probe
export { probeMXHosts, probeSMTPStarttls } from './smtp-starttls.js';
// SSRF Guard
export { checkResolvedIP, checkSSRF, validateUrl } from './ssrf-guard.js';
//# sourceMappingURL=index.js.map