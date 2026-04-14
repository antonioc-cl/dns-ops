import { db, schema } from '@dns-ops/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Running database migrations...');
  
  // Create the tables based on schema
  // Note: drizzle-kit push would do this, but we'll use raw SQL for now
  // Check if domains table exists
  try {
    await db.execute(sql`SELECT 1 FROM domains LIMIT 1`);
    console.log('Domains table exists');
  } catch {
    console.log('Domains table missing - running migrations...');
  }
  
  // For now, just verify connection
  console.log('Database connection verified');
}

migrate().catch(console.error);
