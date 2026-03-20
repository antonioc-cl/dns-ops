/**
 * Logging Context - Bead 14.1
 *
 * Provides request-scoped logging context using AsyncLocalStorage.
 * This allows child loggers to automatically inherit context from parent requests.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { LogContext, Logger } from './logger.js';

/**
 * Request-scoped context storage
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestLogContext>();

/**
 * Context stored for each request
 */
export interface RequestLogContext {
  logger: Logger;
  requestId: string;
  tenantId?: string;
  actorId?: string;
  startTime: number;
  metadata: Record<string, unknown>;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Run a function within a logging context
 */
export function runWithContext<T>(context: RequestLogContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Get the current logging context
 */
export function getContext(): RequestLogContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get the current logger from context
 */
export function getLogger(): Logger | undefined {
  return getContext()?.logger;
}

/**
 * Get the current request ID from context
 */
export function getRequestId(): string | undefined {
  return getContext()?.requestId;
}

/**
 * Get the current tenant ID from context
 */
export function getTenantId(): string | undefined {
  return getContext()?.tenantId;
}

/**
 * Get the current actor ID from context
 */
export function getActorId(): string | undefined {
  return getContext()?.actorId;
}

/**
 * Add metadata to the current request context
 */
export function addMetadata(key: string, value: unknown): void {
  const ctx = getContext();
  if (ctx) {
    ctx.metadata[key] = value;
  }
}

/**
 * Create log context from request context
 */
export function toLogContext(ctx: RequestLogContext | undefined): LogContext {
  if (!ctx) return {};

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
export function getDurationMs(ctx: RequestLogContext | undefined): number {
  if (!ctx) return 0;
  return Date.now() - ctx.startTime;
}
