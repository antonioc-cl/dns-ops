/**
 * DNS Ops Workbench - Shared Request/Response DTOs
 *
 * This file defines the API contract layer between web and collector.
 * All request/response shapes MUST be defined here to ensure type safety
 * and prevent divergence between runtimes.
 */
import type { Confidence, ResultState, Severity, SupportedRecordType, ZoneManagement } from './enums.js';
/**
 * Request to collect DNS data for a domain
 */
export interface CollectDomainRequest {
    /** Domain name to collect */
    domain: string;
    /** Zone management classification */
    zoneManagement?: ZoneManagement;
    /** Who triggered the collection */
    triggeredBy?: string;
    /** Record types to collect (defaults to phase-1 set) */
    recordTypes?: SupportedRecordType[];
    /** Include mail-specific records (SPF, DKIM, DMARC) */
    includeMailRecords?: boolean;
    /** Explicit DKIM selectors to query */
    dkimSelectors?: string[];
    /** Selectors from managed zone config */
    managedDkimSelectors?: string[];
}
/**
 * Response from domain collection
 */
export interface CollectDomainResponse {
    success: boolean;
    domain: string;
    snapshotId: string;
    observationCount: number;
    resultState: ResultState;
    duration: number;
    error?: string;
}
/**
 * Request to lookup a domain's latest snapshot
 */
export interface LookupDomainRequest {
    /** Domain name or ID */
    domain: string;
    /** Whether to include full observations */
    includeObservations?: boolean;
    /** Whether to include findings */
    includeFindings?: boolean;
}
/**
 * Response for domain lookup
 */
export interface LookupDomainResponse {
    domain: {
        id: string;
        name: string;
        normalizedName: string;
        zoneManagement: ZoneManagement;
    };
    latestSnapshot?: {
        id: string;
        resultState: ResultState;
        createdAt: string;
        observationCount: number;
        findingCount: number;
    };
}
/**
 * Request to lookup a specific snapshot
 */
export interface LookupSnapshotRequest {
    snapshotId: string;
    includeObservations?: boolean;
    includeFindings?: boolean;
    includeSuggestions?: boolean;
}
/**
 * Request to list findings for a snapshot
 */
export interface ListFindingsRequest {
    snapshotId: string;
    severity?: Severity[];
    confidence?: Confidence[];
    reviewOnly?: boolean;
}
/**
 * Finding summary in list responses
 */
export interface FindingSummary {
    id: string;
    type: string;
    title: string;
    severity: Severity;
    confidence: Confidence;
    reviewOnly: boolean;
    createdAt: string;
}
/**
 * Response for findings list
 */
export interface ListFindingsResponse {
    findings: FindingSummary[];
    total: number;
}
/**
 * Reserved for Bead 15: Portfolio writes
 * DO NOT implement until that bead is active
 */
export interface _ReservedRemediationRequest {
    findingId: string;
    suggestionId: string;
    action: 'apply' | 'dismiss' | 'defer';
    reason?: string;
    deferUntil?: string;
}
/**
 * Reserved for Bead 15: Remediation result
 * DO NOT implement until that bead is active
 */
export interface _ReservedRemediationResponse {
    success: boolean;
    auditId: string;
    resultingState?: {
        findingAcknowledged: boolean;
        suggestionApplied: boolean;
    };
}
/**
 * Reserved for Bead 14/15: Portfolio operations
 * DO NOT implement until those beads are active
 */
export interface _ReservedPortfolioRequest {
    name: string;
    domains: string[];
    metadata?: Record<string, unknown>;
}
/**
 * Standard API error response
 */
export interface ApiErrorResponse {
    error: string;
    message?: string;
    code?: string;
    details?: Record<string, unknown>;
}
/**
 * Validate a CollectDomainRequest
 */
export declare function validateCollectDomainRequest(req: unknown): req is CollectDomainRequest;
/**
 * Validate a LookupDomainRequest
 */
export declare function validateLookupDomainRequest(req: unknown): req is LookupDomainRequest;
//# sourceMappingURL=requests.d.ts.map