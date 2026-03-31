/**
 * Probes Module - Bead 10 / AUTH-003
 *
 * Non-DNS probe sandbox for safe MTA-STS/SMTP/TLS checks.
 * Tenant-scoped allowlist for multi-tenant isolation.
 */

export type { AllowlistEntry, TenantScopedAllowlist } from './allowlist.js';
// Allowlist
export { ProbeAllowlist, probeAllowlist, ProbeAllowlistManager, probeAllowlistManager, createTenantAllowlist } from './allowlist.js';
export type { MTASTSPolicy, MTASTSProbeResult } from './mta-sts.js';
// MTA-STS Probe
export { fetchMTASTSPolicy, validateMTASTSTxtRecord } from './mta-sts.js';
export type { SMTPProbeResult } from './smtp-starttls.js';
// SMTP STARTTLS Probe
export { probeMXHosts, probeSMTPStarttls } from './smtp-starttls.js';
export type { SSRFCheckResult } from './ssrf-guard.js';
// SSRF Guard
export { checkResolvedIP, checkSSRF, validateUrl } from './ssrf-guard.js';
