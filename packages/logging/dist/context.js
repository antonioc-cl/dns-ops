/**
 * Logging Context - Bead 14.1
 *
 * Provides request-scoped logging context using AsyncLocalStorage.
 * This allows child loggers to automatically inherit context from parent requests.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
/**
 * Request-scoped context storage
 */
const asyncLocalStorage = new AsyncLocalStorage();
/**
 * Generate a unique request ID
 */
export function generateRequestId() {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}
/**
 * Run a function within a logging context
 */
export function runWithContext(context, fn) {
    return asyncLocalStorage.run(context, fn);
}
/**
 * Get the current logging context
 */
export function getContext() {
    return asyncLocalStorage.getStore();
}
/**
 * Get the current logger from context
 */
export function getLogger() {
    return getContext()?.logger;
}
/**
 * Get the current request ID from context
 */
export function getRequestId() {
    return getContext()?.requestId;
}
/**
 * Get the current tenant ID from context
 */
export function getTenantId() {
    return getContext()?.tenantId;
}
/**
 * Get the current actor ID from context
 */
export function getActorId() {
    return getContext()?.actorId;
}
/**
 * Add metadata to the current request context
 */
export function addMetadata(key, value) {
    const ctx = getContext();
    if (ctx) {
        ctx.metadata[key] = value;
    }
}
/**
 * Create log context from request context
 */
export function toLogContext(ctx) {
    if (!ctx)
        return {};
    return {
        requestId: ctx.requestId,
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        ...ctx.metadata,
    };
}
/**
 * Calculate request duration from context
 */
export function getDurationMs(ctx) {
    if (!ctx)
        return 0;
    return Date.now() - ctx.startTime;
}
//# sourceMappingURL=context.js.map