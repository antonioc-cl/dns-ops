/**
 * Collector Types
 *
 * Shared types for the collector app.
 */

import type { IDatabaseAdapter } from '@dns-ops/db';

/**
 * Hono environment variables
 */
export interface Env {
  Variables: {
    db: IDatabaseAdapter;
    tenantId: string;
    actorId?: string;
  };
}
