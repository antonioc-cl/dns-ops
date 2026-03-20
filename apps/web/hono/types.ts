import type { SimpleDatabaseAdapter } from '@dns-ops/db';

export type Env = {
  Bindings: {
    DB: D1Database;
  };
  Variables: {
    db: SimpleDatabaseAdapter;
    tenantId?: string;
    actorId?: string;
    actorEmail?: string;
    /** Unique request ID for tracing (set by middleware) */
    requestId?: string;
  };
};
