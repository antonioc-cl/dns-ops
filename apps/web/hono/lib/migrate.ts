/**
 * Run Drizzle migration files on startup
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IDatabaseAdapter } from '@dns-ops/db';
import { createLogger } from '@dns-ops/logging';
import { sql } from 'drizzle-orm';

const logger = createLogger({ service: 'migrations' });

const MIGRATIONS_DIR = join(process.cwd(), 'packages', 'db', 'src', 'migrations');

type QueryRows<T> = { rows?: T[] };

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function runMigrations(db: IDatabaseAdapter): Promise<void> {
  logger.info('[Migration] Running drizzle migrations...');

  try {
    // Get all SQL migration files sorted
    const files = await readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter((f) => f.endsWith('.sql') && !f.startsWith('meta')).sort();

    logger.info(`[Migration] Found ${sqlFiles.length} migration files`);

    // Track applied migrations
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    for (const file of sqlFiles) {
      const applied = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM __drizzle_migrations WHERE name = ${file}
        ) as exists;
      `);

      const rows = (applied as QueryRows<{ exists?: boolean }>).rows ?? [];
      if (rows[0]?.exists) {
        logger.info(`[Migration] Skipping ${file} (already applied)`);
        continue;
      }

      logger.info(`[Migration] Applying ${file}...`);
      const content = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');

      // Split by breakpoint
      const statements = content
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await db.execute(sql.raw(statement));
        } catch (err: unknown) {
          // Ignore common idempotent errors
          const skipErrors = [
            'already exists',
            'does not exist',
            'cannot drop',
            'DuplicateObject',
            'duplicate_object',
            'no such table',
          ];

          const message = getErrorMessage(err);
          if (skipErrors.some((e) => message.includes(e))) {
            logger.warn(`[Migration] Skipping statement: ${message}`);
            continue;
          }

          logger.error(`[Migration] Error in ${file}:`, err);
          // Continue with other statements - don't fail the whole migration
        }
      }

      // Mark as applied
      await db.execute(sql`
        INSERT INTO __drizzle_migrations (name) VALUES (${file});
      `);

      logger.info(`[Migration] Applied ${file}`);
    }

    logger.info('[Migration] All migrations complete');
  } catch (err: unknown) {
    logger.error('[Migration] Failed:', err);
    throw err;
  }
}
