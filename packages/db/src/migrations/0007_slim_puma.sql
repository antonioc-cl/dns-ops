DROP TABLE "vantage_points";--> statement-breakpoint
ALTER TABLE "observations" DROP CONSTRAINT "observations_vantage_id_vantage_points_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "observation_vantage_idx";--> statement-breakpoint
ALTER TABLE "observations" DROP COLUMN IF EXISTS "vantage_id";