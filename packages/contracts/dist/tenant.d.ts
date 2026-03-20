/**
 * Tenant Utilities
 *
 * Provides UUID-safe tenant ID generation and validation.
 * Uses UUID v5 (SHA-1 based) for deterministic string-to-UUID conversion.
 *
 * Works in both Node.js and Cloudflare Workers (Web Crypto API).
 */
/**
 * Check if a string is a valid UUID
 */
export declare function isValidUUID(value: string): boolean;
/**
 * Generate UUID v5 from namespace and name using Web Crypto API
 *
 * UUID v5 uses SHA-1 hash and is deterministic - same input always produces same output.
 */
export declare function uuidv5(name: string, namespace?: string): Promise<string>;
/**
 * Normalize tenant identifier to UUID format
 *
 * - If already a UUID, returns as-is (lowercased)
 * - If a string (email domain, "system", etc.), generates deterministic UUID v5
 *
 * @param identifier - Raw tenant identifier (UUID or string)
 * @returns Promise resolving to UUID string
 */
export declare function normalizeTenantId(identifier: string): Promise<string>;
/**
 * Get cached tenant UUID or compute and cache it
 *
 * @param identifier - Raw tenant identifier
 * @returns Promise resolving to UUID string
 */
export declare function getTenantUUID(identifier: string): Promise<string>;
/**
 * Pre-populate cache with common tenant identifiers
 *
 * Call this at application startup to avoid async overhead for common values.
 */
export declare function initTenantCache(): Promise<void>;
/**
 * Clear the tenant ID cache
 *
 * Primarily for testing purposes.
 */
export declare function clearTenantCache(): void;
//# sourceMappingURL=tenant.d.ts.map