import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('No DATABASE_URL, skipping migrations');
    return;
  }

  console.log('Connecting to database...');
  const client = new Client({ connectionString: dbUrl });
  
  try {
    await client.connect();
    console.log('Connected, running migrations...');
    
    // Run each migration file in order
    const migrationsDir = join(process.cwd(), 'packages/db/src/migrations');
    const migrationFiles = [
      '0000_nebulous_steve_rogers.sql',
      '0001_clear_hairball.sql',
      '0002_fine_wolf_cub.sql',
      '0003_yummy_kate_bishop.sql',
      '0004_rare_agent_brand.sql',
      '0005_right_human_torch.sql',
      '0006_enforce_tenant_not_null.sql',
      '0007_tenant_domain_uniqueness.sql',
      '0008_moaning_mojo.sql',
      '0009_drop_vantage_points.sql',
    ];
    
    for (const file of migrationFiles) {
      try {
        const sql = readFileSync(join(migrationsDir, file), 'utf8');
        console.log(`Running migration: ${file}`);
        await client.query(sql);
        console.log(`Completed: ${file}`);
      } catch (err) {
        if (err.code === '42P07' || err.code === '42710' || err.message.includes('already exists')) {
          console.log(`Skipping ${file} (already exists)`);
        } else {
          console.error(`Error in ${file}:`, err.message);
        }
      }
    }
    
    console.log('Migrations complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await client.end();
  }
}

runMigrations();
