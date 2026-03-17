import { createMiddleware } from 'hono/factory'
import { drizzle } from 'drizzle-orm/d1'
import type { Env } from '../types'

export const dbMiddleware = createMiddleware<Env>(async (c, next) => {
  const db = drizzle(c.env.DB)
  c.set('db', db)
  await next()
})
