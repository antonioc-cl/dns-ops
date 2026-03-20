/**
 * DNS Ops Workbench - Shared Enums and Vocabulary
 *
 * This file defines the core vocabulary for the system:
 * - Result states (complete, partial, failed)
 * - Severity levels
 * - Confidence levels
 * - Risk postures
 * - Blast radius classifications
 * - Review-only flags
 */
/**
 * Result state for any observation or snapshot
 * - complete: Full visibility achieved
 * - partial: Limited visibility (e.g., unmanaged zones, timeouts)
 * - failed: Could not collect any useful data
 */
export type ResultState = 'complete' | 'partial' | 'failed';
/**
 * Severity levels for findings
 * - critical: Immediate action required, high blast radius
 * - high: Significant issue, should be addressed soon
 * - medium: Moderate concern, plan remediation
 * - low: Minor issue, informational
 * - info: No action required, for awareness only
 */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
/**
 * Confidence levels for findings and suggestions
 * - certain: Directly observed, no ambiguity
 * - high: Strong evidence, minimal interpretation
 * - medium: Reasonable inference from evidence
 * - low: Significant uncertainty or ambiguity
 * - heuristic: Based on pattern matching, not direct evidence
 */
export type Confidence = 'certain' | 'high' | 'medium' | 'low' | 'heuristic';
/**
 * Risk posture for changes
 * - safe: No risk of service disruption
 * - low: Minimal risk, easily reversible
 * - medium: Moderate risk, requires planning
 * - high: Significant risk of disruption
 * - critical: High blast radius, expert review required
 */
export type RiskPosture = 'safe' | 'low' | 'medium' | 'high' | 'critical';
/**
 * Blast radius classifications
 * - none: No impact on production
 * - single-domain: Affects only the target domain
 * - subdomain-tree: Affects domain and its subdomains
 * - related-domains: Affects multiple domains in portfolio
 * - infrastructure: Affects shared infrastructure
 * - organization-wide: Organization-level impact
 */
export type BlastRadius =
  | 'none'
  | 'single-domain'
  | 'subdomain-tree'
  | 'related-domains'
  | 'infrastructure'
  | 'organization-wide';
/**
 * Review requirement flag
 * When true, the finding or suggestion requires human review before action
 * This is set for:
 * - High blast radius changes
 * - Critical risk posture
 * - Low confidence findings
 * - Any finding in unmanaged zones
 */
export type ReviewOnly = boolean;
/**
 * Vantage point types for DNS collection
 */
export type VantageType = 'public-recursive' | 'authoritative' | 'parent-zone' | 'probe';
/**
 * DNS record types supported in phase 1
 */
export type SupportedRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'CAA';
/**
 * Collection status for individual queries
 */
export type CollectionStatus =
  | 'success'
  | 'timeout'
  | 'refused'
  | 'truncated'
  | 'nxdomain'
  | 'nodata'
  | 'error';
/**
 * Zone management classification
 * - managed: Zone is under our control (full visibility)
 * - unmanaged: Third-party zone (targeted inspection only)
 * - unknown: Management status unclear
 */
export type ZoneManagement = 'managed' | 'unmanaged' | 'unknown';
/**
 * Provider templates for known mail providers
 * Used for DKIM selector discovery and configuration validation
 */
export type KnownProvider =
  | 'google-workspace'
  | 'microsoft-365'
  | 'amazon-ses'
  | 'sendgrid'
  | 'mailgun'
  | 'other'
  | 'unknown';
/**
 * Selector discovery provenance
 * Tracks how a DKIM selector was discovered
 */
export type SelectorProvenance =
  | 'managed-zone-config'
  | 'operator-supplied'
  | 'provider-heuristic'
  | 'common-dictionary'
  | 'not-found';
//# sourceMappingURL=enums.d.ts.map
