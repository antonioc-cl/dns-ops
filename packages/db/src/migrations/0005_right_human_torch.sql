DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'monitored_domain_created';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'monitored_domain_updated';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'monitored_domain_deleted';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'monitored_domain_toggled';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'alert_acknowledged';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'alert_resolved';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TYPE "audit_action" ADD VALUE 'alert_suppressed';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;