/**
 * Schema Repair - Add missing columns from broken early migrations
 */

import { sql } from 'drizzle-orm';
import type { IDatabaseAdapter } from '@dns-ops/db';

export async function repairSchema(db: IDatabaseAdapter): Promise<void> {
  console.log('[SchemaRepair] Checking for missing columns...');
  
  const repairs = [
    // Alerts table
    `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS title VARCHAR(200) NOT NULL DEFAULT 'Alert'`,
    `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(200)`,
    `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS triggered_by_finding_id UUID`,
    `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE alerts ADD COLUMN IF NOT EXISTS resolution_note TEXT`,
    
    // Shared reports table
    `ALTER TABLE shared_reports ADD COLUMN IF NOT EXISTS title VARCHAR(200) NOT NULL DEFAULT 'Report'`,
    `ALTER TABLE shared_reports ADD COLUMN IF NOT EXISTS description TEXT`,
    
    // Findings table
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS type VARCHAR(100) NOT NULL DEFAULT 'unknown'`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS title VARCHAR(200) NOT NULL DEFAULT 'Finding'`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS risk_posture VARCHAR(20) NOT NULL DEFAULT 'medium'`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS blast_radius VARCHAR(30) NOT NULL DEFAULT 'none'`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS review_only BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS rule_id VARCHAR(100) NOT NULL DEFAULT 'unknown'`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS rule_version VARCHAR(50) NOT NULL DEFAULT '1.0.0'`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS ruleset_version_id UUID`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE findings ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(100)`,
    
    // Snapshots table
    `ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
    
    // Observations table
    `ALTER TABLE observations ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true`,
    `ALTER TABLE observations ADD COLUMN IF NOT EXISTS vantage_type VARCHAR(20)`,
    `ALTER TABLE observations ADD COLUMN IF NOT EXISTS vantage_id UUID`,
    
    // Record sets table
    `ALTER TABLE record_sets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
    
    // Suggestions table
    `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS effort VARCHAR(20) DEFAULT 'medium'`,
    `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50`,
    `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false`,
    `ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS finding_id UUID`,
    
    // Monitored domains table
    `ALTER TABLE monitored_domains ADD COLUMN IF NOT EXISTS alert_channels JSONB DEFAULT '{}'`,
    
    // Fleet reports table
    `ALTER TABLE fleet_reports ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'`,
    
    // Probe observations table
    `ALTER TABLE probe_observations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
    
    // Ruleset versions table
    `ALTER TABLE ruleset_versions ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) NOT NULL DEFAULT 'system'`,
    
    // Saved filters table
    `ALTER TABLE saved_filters ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) NOT NULL DEFAULT 'system'`,
    
    // Template overrides table
    `ALTER TABLE template_overrides ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) NOT NULL DEFAULT 'system'`,
    
    // Shared reports table
    `ALTER TABLE shared_reports ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) NOT NULL DEFAULT 'system'`,
    
    // Audit events table
    `ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS target_type VARCHAR(50)`,
    `ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS target_id UUID`,
    `ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
    
    // Domain notes table
    `ALTER TABLE domain_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    
    // Domain tags table  
    `ALTER TABLE domain_tags ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
    
    // Users table
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
  ];
  
  let fixed = 0;
  for (const repair of repairs) {
    try {
      await db.getDrizzle().execute(sql.raw(repair));
      fixed++;
    } catch (err: any) {
      if (!err.message?.includes('already exists')) {
        console.log(`[SchemaRepair] Note: ${err.message}`);
      }
    }
  }
  
  console.log(`[SchemaRepair] Applied ${fixed} column fixes`);
}
