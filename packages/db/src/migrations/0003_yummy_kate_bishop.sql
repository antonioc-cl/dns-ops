UPDATE "remediation_requests"
SET "created_by" = LEFT("contact_email", 100)
WHERE "created_by" IS NULL;
--> statement-breakpoint
UPDATE "remediation_requests" AS remediation
SET "tenant_id" = domains."tenant_id"
FROM "domains" AS domains
WHERE remediation."tenant_id" IS NULL
  AND domains."tenant_id" IS NOT NULL
  AND lower(domains."normalized_name") = lower(remediation."domain");
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "remediation_requests" WHERE "created_by" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce remediation_requests.created_by NOT NULL: legacy rows remain without actor attribution';
  END IF;
  IF EXISTS (SELECT 1 FROM "remediation_requests" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce remediation_requests.tenant_id NOT NULL: legacy rows remain without tenant ownership';
  END IF;
  IF EXISTS (SELECT 1 FROM "shared_reports" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce shared_reports.tenant_id NOT NULL: tenantless shared reports exist';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "remediation_requests" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "remediation_requests" ALTER COLUMN "created_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shared_reports" ALTER COLUMN "tenant_id" SET NOT NULL;