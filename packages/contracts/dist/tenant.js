/**
 * Tenant Utilities
 *
 * Provides UUID-safe tenant ID generation and validation.
 * Uses UUID v5 (SHA-1 based) for deterministic string-to-UUID conversion.
 *
 * Works in both Node.js and Cloudflare Workers (Web Crypto API).
 */
// DNS Ops namespace UUID for tenant ID generation (UUID v4, randomly generated once)
const TENANT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // RFC 4122 DNS namespace
/**
 * UUID regex for validation
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(value) {
    return UUID_REGEX.test(value);
}
/**
 * Parse namespace UUID to bytes
 */
function parseUUID(uuid) {
    const hex = uuid.replace(/-/g, '');
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}
/**
 * Format bytes as UUID string
 */
function formatUUID(bytes) {
    const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32),
    ].join('-');
}
/**
 * Generate UUID v5 from namespace and name using Web Crypto API
 *
 * UUID v5 uses SHA-1 hash and is deterministic - same input always produces same output.
 */
export async function uuidv5(name, namespace = TENANT_NAMESPACE) {
    const namespaceBytes = parseUUID(namespace);
    const nameBytes = new TextEncoder().encode(name);
    // Concatenate namespace and name
    const data = new Uint8Array(namespaceBytes.length + nameBytes.length);
    data.set(namespaceBytes);
    data.set(nameBytes, namespaceBytes.length);
    // Hash with SHA-1
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = new Uint8Array(hashBuffer);
    // Take first 16 bytes and set version/variant bits
    const uuid = new Uint8Array(16);
    uuid.set(hashArray.slice(0, 16));
    // Set version to 5 (UUID v5)
    uuid[6] = (uuid[6] & 0x0f) | 0x50;
    // Set variant to RFC 4122
    uuid[8] = (uuid[8] & 0x3f) | 0x80;
    return formatUUID(uuid);
}
/**
 * Normalize tenant identifier to UUID format
 *
 * - If already a UUID, returns as-is (lowercased)
 * - If a string (email domain, "system", etc.), generates deterministic UUID v5
 *
 * @param identifier - Raw tenant identifier (UUID or string)
 * @returns Promise resolving to UUID string
 */
export async function normalizeTenantId(identifier) {
    if (!identifier) {
        throw new Error('Tenant identifier is required');
    }
    // If already a valid UUID, normalize to lowercase and return
    if (isValidUUID(identifier)) {
        return identifier.toLowerCase();
    }
    // Generate deterministic UUID v5 from the string
    return uuidv5(identifier.toLowerCase());
}
/**
 * Synchronous UUID v5 generation using a pre-computed lookup
 *
 * For common tenant IDs, we can pre-compute the UUIDs to avoid async overhead.
 * Uses a cache to store results from async computation.
 */
const tenantIdCache = new Map();
/**
 * Get cached tenant UUID or compute and cache it
 *
 * @param identifier - Raw tenant identifier
 * @returns Promise resolving to UUID string
 */
export async function getTenantUUID(identifier) {
    const normalizedInput = identifier.toLowerCase();
    // Check cache first
    const cached = tenantIdCache.get(normalizedInput);
    if (cached) {
        return cached;
    }
    // Compute and cache
    const uuid = await normalizeTenantId(identifier);
    tenantIdCache.set(normalizedInput, uuid);
    return uuid;
}
/**
 * Pre-populate cache with common tenant identifiers
 *
 * Call this at application startup to avoid async overhead for common values.
 */
export async function initTenantCache() {
    const commonTenants = ['system', 'internal-service'];
    await Promise.all(commonTenants.map(async (tenant) => {
        const uuid = await normalizeTenantId(tenant);
        tenantIdCache.set(tenant.toLowerCase(), uuid);
    }));
}
/**
 * Clear the tenant ID cache
 *
 * Primarily for testing purposes.
 */
export function clearTenantCache() {
    tenantIdCache.clear();
}
//# sourceMappingURL=tenant.js.map