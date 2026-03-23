DO $$ BEGIN
 CREATE TYPE "shared_report_status" AS ENUM('generating', 'ready', 'expired', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "shared_report_visibility" AS ENUM('private', 'tenant', 'shared');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'remediation_request_created';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'remediation_request_updated';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'shared_report_created';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'shared_report_expired';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shared_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"created_by" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"visibility" "shared_report_visibility" DEFAULT 'shared' NOT NULL,
	"status" "shared_report_status" DEFAULT 'generating' NOT NULL,
	"share_token" varchar(128),
	"expires_at" timestamp with time zone,
	"summary" jsonb NOT NULL,
	"alert_summary" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "remediation_requests" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "remediation_requests" ADD COLUMN "created_by" varchar(100);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_report_tenant_idx" ON "shared_reports" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_report_status_idx" ON "shared_reports" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_report_visibility_idx" ON "shared_reports" ("visibility");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shared_report_share_token_idx" ON "shared_reports" ("share_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_report_created_idx" ON "shared_reports" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remediation_tenant_idx" ON "remediation_requests" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remediation_created_by_idx" ON "remediation_requests" ("created_by");