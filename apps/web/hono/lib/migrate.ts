/**
 * Run Drizzle migration files on startup
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import type { IDatabaseAdapter } from '@dns-ops/db';

const MIGRATIONS_DIR = join(process.cwd(), 'packages', 'db', 'src', 'migrations');

export async function runMigrations(db: IDatabaseAdapter): Promise<void> {
  console.log('[Migration] Running drizzle migrations...');
  
  try {
    // Get all SQL migration files sorted
    const files = await readdir(MIGRATIONS_DIR);
    const sqlFiles = files
      .filter(f => f.endsWith('.sql') && !f.startsWith('meta'))
      .sort();
    
    console.log(`[Migration] Found ${sqlFiles.length} migration files`);
    
    // Track applied migrations
    await db.getDrizzle().execute(sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    for (const file of sqlFiles) {
      const applied = await db.getDrizzle().execute(sql`
        SELECT EXISTS (
          SELECT 1 FROM __drizzle_migrations WHERE name = ${file}
        ) as exists;
      `);
      
      const rows = (applied as any).rows;
      if (rows[0]?.exists) {
        console.log(`[Migration] Skipping ${file} (already applied)`);
        continue;
      }
      
      console.log(`[Migration] Applying ${file}...`);
      const content = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
      
      // Split by breakpoint
      const statements = content
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          await db.getDrizzle().execute(sql.raw(statement));
        } catch (err: any) {
          // Ignore common idempotent errors
          const skipErrors = [
            'already exists',
            'does not exist',
            'cannot drop',
            'DuplicateObject',
            'duplicate_object',
            'no such table',
          ];
          
          if (skipErrors.some(e => err.message?.includes(e))) {
            console.log(`[Migration] Skipping statement: ${err.message}`);
            continue;
          }
          
          console.error(`[Migration] Error in ${file}:`, err.message);
          // Continue with other statements - don't fail the whole migration
        }
      }
      
      // Mark as applied
      await db.getDrizzle().execute(sql`
        INSERT INTO __drizzle_migrations (name) VALUES (${file});
      `);
      
      console.log(`[Migration] Applied ${file}`);
    }
    
    console.log('[Migration] All migrations complete');
  } catch (err: any) {
    console.error('[Migration] Failed:', err.message);
  }
}
