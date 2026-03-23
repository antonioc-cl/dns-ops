DO $$ BEGIN
 CREATE TYPE "adjudication_decision" AS ENUM('new-correct', 'legacy-correct', 'both-wrong', 'acceptable-difference');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "baseline_status" AS ENUM('active', 'deprecated', 'draft');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "field_comparison_status" AS ENUM('match', 'mismatch', 'missing-in-legacy', 'missing-in-new', 'not-comparable');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "legacy_tool_type" AS ENUM('dmarc-check', 'dkim-check', 'spf-check', 'mx-check', 'dns-check');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "mail_provider" AS ENUM('google-workspace', 'microsoft-365', 'amazon-ses', 'sendgrid', 'mailgun', 'mailchimp', 'zoho', 'fastmail', 'protonmail', 'custom', 'unknown');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "probe_status" AS ENUM('success', 'timeout', 'refused', 'ssrf_blocked', 'allowlist_denied', 'parse_error', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "probe_type" AS ENUM('smtp_starttls', 'mta_sts', 'tls_cert', 'http');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "selector_confidence" AS ENUM('certain', 'high', 'medium', 'low', 'heuristic');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "selector_provenance" AS ENUM('managed-zone-config', 'operator-supplied', 'provider-heuristic', 'common-dictionary', 'not-found');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "shadow_status" AS ENUM('match', 'mismatch', 'partial-match', 'error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dkim_selectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"selector" varchar(63) NOT NULL,
	"domain" varchar(253) NOT NULL,
	"provenance" "selector_provenance" NOT NULL,
	"confidence" "selector_confidence" NOT NULL,
	"provider" "mail_provider",
	"found" boolean NOT NULL,
	"record_data" text,
	"key_type" varchar(10),
	"key_size" varchar(10),
	"hash_algorithms" jsonb,
	"flags" jsonb,
	"is_valid" boolean,
	"validation_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "legacy_access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_type" "legacy_tool_type" NOT NULL,
	"tool_endpoint" varchar(500),
	"domain" varchar(253) NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_by" varchar(100),
	"request_source" varchar(50),
	"response_status" varchar(20),
	"response_time_ms" jsonb,
	"output_summary" jsonb,
	"raw_output" text,
	"snapshot_id" uuid,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mail_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"domain" varchar(253) NOT NULL,
	"detected_provider" "mail_provider",
	"provider_confidence" "selector_confidence",
	"has_mx" boolean DEFAULT false NOT NULL,
	"is_null_mx" boolean DEFAULT false NOT NULL,
	"mx_hosts" jsonb,
	"has_spf" boolean DEFAULT false NOT NULL,
	"spf_record" text,
	"spf_mechanisms" jsonb,
	"has_dmarc" boolean DEFAULT false NOT NULL,
	"dmarc_record" text,
	"dmarc_policy" varchar(20),
	"dmarc_subdomain_policy" varchar(20),
	"dmarc_percent" varchar(5),
	"dmarc_rua" jsonb,
	"dmarc_ruf" jsonb,
	"has_dkim" boolean DEFAULT false NOT NULL,
	"dkim_selectors_found" jsonb,
	"dkim_selector_count" varchar(5),
	"has_mta_sts" boolean DEFAULT false NOT NULL,
	"mta_sts_mode" varchar(20),
	"mta_sts_version" varchar(10),
	"mta_sts_max_age" varchar(15),
	"has_tls_rpt" boolean DEFAULT false NOT NULL,
	"tls_rpt_rua" jsonb,
	"has_bimi" boolean DEFAULT false NOT NULL,
	"bimi_version" varchar(10),
	"bimi_location" text,
	"bimi_authority" text,
	"security_score" varchar(5),
	"score_breakdown" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mismatch_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar(253),
	"tenant_id" uuid,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"total_comparisons" jsonb NOT NULL,
	"match_count" jsonb NOT NULL,
	"mismatch_count" jsonb NOT NULL,
	"partial_match_count" jsonb NOT NULL,
	"mismatch_breakdown" jsonb,
	"adjudicated_count" jsonb,
	"pending_count" jsonb,
	"match_rate" varchar(10),
	"cutover_ready" boolean DEFAULT false NOT NULL,
	"cutover_notes" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "probe_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"probe_type" "probe_type" NOT NULL,
	"status" "probe_status" NOT NULL,
	"hostname" varchar(253) NOT NULL,
	"port" integer,
	"success" boolean NOT NULL,
	"error_message" text,
	"probed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"response_time_ms" integer,
	"probe_data" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provider_baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_key" varchar(50) NOT NULL,
	"provider_name" varchar(100) NOT NULL,
	"status" "baseline_status" DEFAULT 'active' NOT NULL,
	"baseline" jsonb NOT NULL,
	"dkim_selectors" jsonb,
	"mx_patterns" jsonb,
	"spf_includes" jsonb,
	"notes" text,
	"documentation_url" varchar(500),
	"version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shadow_comparisons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"domain" varchar(253) NOT NULL,
	"compared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "shadow_status" NOT NULL,
	"comparisons" jsonb NOT NULL,
	"metrics" jsonb NOT NULL,
	"summary" text NOT NULL,
	"legacy_output" jsonb NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" varchar(100),
	"adjudication" "adjudication_decision",
	"adjudication_notes" text,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "findings" ADD COLUMN "ruleset_version_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dkim_selector_snapshot_idx" ON "dkim_selectors" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dkim_selector_selector_idx" ON "dkim_selectors" ("selector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dkim_selector_domain_idx" ON "dkim_selectors" ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dkim_selector_provider_idx" ON "dkim_selectors" ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dkim_selector_provenance_idx" ON "dkim_selectors" ("provenance");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "legacy_access_tool_type_idx" ON "legacy_access_logs" ("tool_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "legacy_access_domain_idx" ON "legacy_access_logs" ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "legacy_access_requested_at_idx" ON "legacy_access_logs" ("requested_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "legacy_access_snapshot_idx" ON "legacy_access_logs" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "legacy_access_tenant_idx" ON "legacy_access_logs" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mail_evidence_snapshot_idx" ON "mail_evidence" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mail_evidence_domain_idx" ON "mail_evidence" ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mail_evidence_provider_idx" ON "mail_evidence" ("detected_provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mail_evidence_score_idx" ON "mail_evidence" ("security_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mismatch_report_domain_idx" ON "mismatch_reports" ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mismatch_report_tenant_idx" ON "mismatch_reports" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mismatch_report_period_idx" ON "mismatch_reports" ("period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mismatch_report_cutover_idx" ON "mismatch_reports" ("cutover_ready");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "probe_observation_snapshot_idx" ON "probe_observations" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "probe_observation_type_idx" ON "probe_observations" ("probe_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "probe_observation_hostname_idx" ON "probe_observations" ("hostname");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "probe_observation_status_idx" ON "probe_observations" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "probe_observation_success_idx" ON "probe_observations" ("success");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_baseline_provider_key_idx" ON "provider_baselines" ("provider_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_baseline_status_idx" ON "provider_baselines" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shadow_comparison_snapshot_idx" ON "shadow_comparisons" ("snapshot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shadow_comparison_domain_idx" ON "shadow_comparisons" ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shadow_comparison_status_idx" ON "shadow_comparisons" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shadow_comparison_adjudication_idx" ON "shadow_comparisons" ("adjudication");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shadow_comparison_compared_at_idx" ON "shadow_comparisons" ("compared_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shadow_comparison_tenant_idx" ON "shadow_comparisons" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finding_ruleset_version_idx" ON "findings" ("ruleset_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "finding_unique_idx" ON "findings" ("snapshot_id","rule_id","type","ruleset_version_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "findings" ADD CONSTRAINT "findings_ruleset_version_id_ruleset_versions_id_fk" FOREIGN KEY ("ruleset_version_id") REFERENCES "ruleset_versions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dkim_selectors" ADD CONSTRAINT "dkim_selectors_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "legacy_access_logs" ADD CONSTRAINT "legacy_access_logs_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mail_evidence" ADD CONSTRAINT "mail_evidence_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "probe_observations" ADD CONSTRAINT "probe_observations_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shadow_comparisons" ADD CONSTRAINT "shadow_comparisons_snapshot_id_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
