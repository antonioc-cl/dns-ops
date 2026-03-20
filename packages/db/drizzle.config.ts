import type { Config } from 'drizzle-kit';

export default {
  schema: './dist/schema/index.js',
  out: './src/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/dns_ops',
  },
  verbose: true,
  strict: true,
} satisfies Config;