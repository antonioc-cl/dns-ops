DO $$ BEGIN
 CREATE TYPE "alert_status" AS ENUM('pending', 'sent', 'suppressed', 'acknowledged', 'resolved');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "audit_action" AS ENUM('domain_note_created', 'domain_note_updated', 'domain_note_deleted', 'domain_tag_added', 'domain_tag_removed', 'filter_created', 'filter_updated', 'filter_deleted', 'template_override_created', 'template_override_updated', 'template_override_deleted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "blast_radius" AS ENUM('none', 'single-domain', 'subdomain-tree', 'related-domains', 'infrastructure', 'organization-wide');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "collection_status" AS ENUM('success', 'timeout', 'refused', 'truncated', 'nxdomain', 'nodata', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "confidence" AS ENUM('certain', 'high', 'medium', 'low', 'heuristic');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "monitoring_schedule" AS ENUM('hourly', 'daily', 'weekly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "remediation_priority" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "remediation_status" AS ENUM('open', 'in-progress', 'resolved', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "result_state" AS ENUM('complete', 'partial', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "risk_posture" AS ENUM('safe', 'low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "severity" AS ENUM('critical', 'high', 'medium', 'low', 'info');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "vantage_type" AS ENUM('public-recursive', 'authoritative', 'parent-zone', 'probe');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "zone_management" AS ENUM('managed', 'unmanaged', 'unknown');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monitored_domain_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"severity" "severity" NOT NULL,
	"triggered_by_finding_id" uuid,
	"status" "alert_status" DEFAULT 'pending' NOT NULL,
	"dedup_key" varchar(200),
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" varchar(100),
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" "audit_action" NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"previous_value" jsonb,
	"new_value" jsonb,
	"actor_id" varchar(100) NOT NULL,
	"actor_email" varchar(255),
	"tenant_id" uuid,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "domain_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_by" varchar(100) NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "domain_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"tag" varchar(50) NOT NULL,
	"created_by" varchar(100) NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(253) NOT NULL,
	"normalized_name" varchar(253) NOT NULL,
	"punycode_name" varchar(253),
	"zone_management" "zone_management" DEFAULT 'unknown' NOT NULL,
	"tenant_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"severity" "severity" NOT NULL,
	"confidence" "confidence" NOT NULL,
	"risk_posture" "risk_posture" NOT NULL,
	"blast_radius" "blast_radius" NOT NULL,
	"review_only" boolean DEFAULT false NOT NULL,
	"evidence" jsonb NOT NULL,
	"rule_id" varchar(100) NOT NULL,
	"rule_version" varchar(50) NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" varchar(100),
	"false_positive" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monitored_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"schedule" "monitoring_schedule" DEFAULT 'daily' NOT NULL,
	"alert_channels" jsonb NOT NULL,
	"max_alerts_per_day" integer DEFAULT 5 NOT NULL,
	"suppression_window_minutes" integer DEFAULT 60 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_check_at" timestamp with time zone,
	"last_alert_at" timestamp with time zone,
	"created_by" varchar(100) NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"query_name" varchar(253) NOT NULL,
	"query_type" varchar(10) NOT NULL,
	"vantage_id" uuid,
	"vantage_type" "vantage_type" NOT NULL,
	"vantage_identifier" varchar(100),
	"status" "collection_status" NOT NULL,
	"queried_at" timestamp with time zone DEFAULT now() NOT NULL,
	"response_time_ms" integer,
	"response_code" integer,
	"flags" jsonb,
	"answer_section" jsonb,
	"authority_section" jsonb,
	"additional_section" jsonb,
	"error_message" text,
	"error_details" jsonb,
	"raw_response" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "record_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"name" varchar(253) NOT NULL,
	"type" varchar(10) NOT NULL,
	"ttl" integer,
	"values" jsonb NOT NULL,
	"source_observation_ids" jsonb NOT NULL,
	"source_vantages" jsonb NOT NULL,
	"is_consistent" boolean NOT NULL,
	"consolidation_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "remediation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid,
	"domain" varchar(253) NOT NULL,
	"contact_email" varchar(254) NOT NULL,
	"contact_name" varchar(100) NOT NULL,
	"contact_phone" varchar(20),
	"issues" jsonb NOT NULL,
	"priority" "remediation_priority" DEFAULT 'medium' NOT NULL,
	"notes" text,
	"status" "remediation_status" DEFAULT 'open' NOT NULL,
	"assigned_to" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ruleset_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"rules" jsonb NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"criteria" jsonb NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_by" varchar(100) NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"domain_name" varchar(253) NOT NULL,
	"result_state" "result_state" NOT NULL,
	"queried_names" jsonb NOT NULL,
	"queried_types" jsonb NOT NULL,
	"vantages" jsonb NOT NULL,
	"zone_management" "zone_management" NOT NULL,
	"ruleset_version_id" uuid,
	"triggered_by" varchar(100) NOT NULL,
	"collection_duration_ms" integer,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"action" text NOT NULL,
	"risk_posture" "risk_posture" NOT NULL,
	"blast_radius" "blast_radius" NOT NULL,
	"review_only" boolean DEFAULT false NOT NULL,
	"applied_at" timestamp with time zone,
	"applied_by" varchar(100),
	"dismissed_at" timestamp with time zone,
	"dismissed_by" varchar(100),
	"dismissal_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "template_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_key" varchar(50) NOT NULL,
	"template_key" varchar(50) NOT NULL,
	"override_data" jsonb NOT NULL,
	"applies_to_domains" jsonb,
	"created_by" varchar(100) NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vantage_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "vantage_type" NOT NULL,
	"description" text,
	"config" jsonb NOT NULL,
	"endpoints" jsonb NOT NULL,
	"region" varchar(50),
	"network" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_monitored_idx" ON "alerts" ("monitored_domain_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_status_idx" ON "alerts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_tenant_idx" ON "alerts" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_dedup_idx" ON "alerts" ("dedup_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_created_idx" ON "alerts" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_entity_idx" ON "audit_events" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_actor_idx" ON "audit_events" ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_tenant_idx" ON "audit_events" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_action_idx" ON "audit_events" ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_created_idx" ON "audit_events" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_note_domain_idx" ON "domain_notes" ("domain_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_note_tenant_idx" ON "domain_notes" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_note_created_idx" ON "domain_notes" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_tag_domain_idx" ON "domain_tags" ("domain_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_tag_tag_idx" ON "domain_tags" ("tag");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_tag_tenant_idx" ON "domain_tags" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "domain_tag_unique_idx" ON "domain_tags" ("domain_id","tag");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "domain_name_idx" ON "domains" ("normalized_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_tenant_idx" ON "domains" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_zone_management_idx" ON "domains" ("zone_management");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finding_snapshot_idx" ON "findings" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finding_type_idx" ON "findings" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finding_severity_idx" ON "findings" ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finding_review_only_idx" ON "findings" ("review_only");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "monitored_domain_unique_idx" ON "monitored_domains" ("domain_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitored_domain_tenant_idx" ON "monitored_domains" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitored_domain_active_idx" ON "monitored_domains" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitored_domain_schedule_idx" ON "monitored_domains" ("schedule");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "observation_snapshot_idx" ON "observations" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "observation_query_idx" ON "observations" ("query_name","query_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "observation_vantage_idx" ON "observations" ("vantage_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "observation_status_idx" ON "observations" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recordset_snapshot_idx" ON "record_sets" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recordset_name_type_idx" ON "record_sets" ("name","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remediation_domain_idx" ON "remediation_requests" ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remediation_status_idx" ON "remediation_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remediation_snapshot_idx" ON "remediation_requests" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "remediation_created_at_idx" ON "remediation_requests" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ruleset_version_idx" ON "ruleset_versions" ("version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ruleset_active_idx" ON "ruleset_versions" ("active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_filter_tenant_idx" ON "saved_filters" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_filter_created_by_idx" ON "saved_filters" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_filter_shared_idx" ON "saved_filters" ("is_shared");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "snapshot_domain_idx" ON "snapshots" ("domain_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "snapshot_created_at_idx" ON "snapshots" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "snapshot_domain_created_idx" ON "snapshots" ("domain_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "snapshot_state_idx" ON "snapshots" ("result_state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suggestion_finding_idx" ON "suggestions" ("finding_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suggestion_review_only_idx" ON "suggestions" ("review_only");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "template_override_provider_idx" ON "template_overrides" ("provider_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "template_override_tenant_idx" ON "template_overrides" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "template_override_unique_idx" ON "template_overrides" ("provider_key","template_key","tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vantage_type_idx" ON "vantage_points" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vantage_active_idx" ON "vantage_points" ("is_active");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_monitored_domain_id_monitored_domains_id_fk" FOREIGN KEY ("monitored_domain_id") REFERENCES "monitored_domains"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_triggered_by_finding_id_findings_id_fk" FOREIGN KEY ("triggered_by_finding_id") REFERENCES "findings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "domain_notes" ADD CONSTRAINT "domain_notes_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "domain_tags" ADD CONSTRAINT "domain_tags_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "findings" ADD CONSTRAINT "findings_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitored_domains" ADD CONSTRAINT "monitored_domains_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "observations" ADD CONSTRAINT "observations_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "observations" ADD CONSTRAINT "observations_vantage_id_vantage_points_id_fk" FOREIGN KEY ("vantage_id") REFERENCES "vantage_points"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "record_sets" ADD CONSTRAINT "record_sets_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_ruleset_version_id_ruleset_versions_id_fk" FOREIGN KEY ("ruleset_version_id") REFERENCES "ruleset_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "findings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
