/**
 * DNS Ops Workbench - Shared Request/Response DTOs
 *
 * This file defines the API contract layer between web and collector.
 * All request/response shapes MUST be defined here to ensure type safety
 * and prevent divergence between runtimes.
 */
// =============================================================================
// VALIDATION HELPERS
// =============================================================================
/**
 * Validate a CollectDomainRequest
 */
export function validateCollectDomainRequest(req) {
    if (!req || typeof req !== 'object')
        return false;
    const r = req;
    return typeof r.domain === 'string' && r.domain.length > 0;
}
/**
 * Validate a LookupDomainRequest
 */
export function validateLookupDomainRequest(req) {
    if (!req || typeof req !== 'object')
        return false;
    const r = req;
    return typeof r.domain === 'string' && r.domain.length > 0;
}
//# sourceMappingURL=requests.js.map