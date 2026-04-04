-- Migration: 0009_drop_vantage_points
-- Summary: Drop orphaned vantage_points table and its FK from observations.
-- The vantage_points table was created in 0000 but removed from the Drizzle schema.
-- observations.vantage_id references it via FK, but that column is nullable and unused.
-- The vantage_type enum is NOT dropped — it is still used by observations.vantage_type.

-- Drop FK constraint from observations to vantage_points
ALTER TABLE "observations" DROP CONSTRAINT IF EXISTS "observations_vantage_id_vantage_points_id_fk";
--> statement-breakpoint
-- Drop indexes on vantage_points
DROP INDEX IF EXISTS "vantage_type_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "vantage_active_idx";
--> statement-breakpoint
-- Drop the orphaned vantage_points table
DROP TABLE IF EXISTS "vantage_points";
