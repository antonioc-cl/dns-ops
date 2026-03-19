import { createMiddleware } from 'hono/factory'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@dns-ops/db/schema'
import { createSimpleAdapter } from '@dns-ops/db'
import type { Env } from '../types.js'

export const dbMiddleware = createMiddleware<Env>(async (c, next) => {
  const drizzleDb = drizzle(c.env.DB, { schema })
  const db = createSimpleAdapter(drizzleDb, 'd1')
  c.set('db', db)
  await next()
})
