import type { SimpleDatabaseAdapter } from '@dns-ops/db'

export type Env = {
  Bindings: {
    DB: D1Database
  }
  Variables: {
    db: SimpleDatabaseAdapter
    tenantId?: string
    actorId?: string
    actorEmail?: string
  }
}
