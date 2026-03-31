-- Migration: Add fleet_reports table for persisted fleet report generation
-- 
-- Bead 18 / DATA-002: Fleet report persistence
-- 
-- Previously, fleet reports were returned inline as temporary data.
-- This table allows reports to be persisted and retrieved later.

DO $$ BEGIN
 CREATE TYPE "fleet_report_status" AS ENUM('pending', 'processing', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fleet_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" varchar(100) NOT NULL,
	"status" "fleet_report_status" DEFAULT 'pending' NOT NULL,
	"inventory" jsonb NOT NULL,
	"checks" jsonb NOT NULL,
	"format" varchar(20) DEFAULT 'summary' NOT NULL,
	"summary" jsonb,
	"domain_results" jsonb,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fleet_report_tenant_idx" ON "fleet_reports" ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fleet_report_status_idx" ON "fleet_reports" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fleet_report_created_idx" ON "fleet_reports" ("created_at");
