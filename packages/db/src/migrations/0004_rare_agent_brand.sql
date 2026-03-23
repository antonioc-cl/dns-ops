UPDATE "alerts" AS alerts
SET "tenant_id" = monitored."tenant_id"
FROM "monitored_domains" AS monitored
WHERE alerts."tenant_id" IS NULL
  AND monitored."tenant_id" IS NOT NULL
  AND monitored."id" = alerts."monitored_domain_id";
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "alerts" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce alerts.tenant_id NOT NULL: legacy rows remain without tenant ownership';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "tenant_id" SET NOT NULL;