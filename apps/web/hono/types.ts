import type { DrizzleD1Database } from 'drizzle-orm/d1'

export type Env = {
  Bindings: {
    DB: D1Database
  }
  Variables: {
    db: DrizzleD1Database
  }
}
