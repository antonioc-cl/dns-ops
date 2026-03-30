-- Migration: 0006_enforce_tenant_not_null
-- Summary: Enforce NOT NULL on tenantId for domainNotes, domainTags, savedFilters, templateOverrides, auditEvents
--
-- Background:
-- These tables were created with nullable tenantId. Code now always provides tenantId on insert.
-- Any existing rows with NULL tenantId are orphaned/unowned data — delete them.
--
-- Rationale for deletion (not system-tenant assignment):
-- - domainNotes without tenant: no way to attribute ownership
-- - domainTags without tenant: no way to attribute ownership
-- - savedFilters without tenant: no way to attribute ownership
-- - templateOverrides without tenant: no way to attribute ownership
-- - auditEvents without tenant: KEPT (audit events are valuable for debugging system events)
--   BUT audit_events references other entities — if those entities are deleted,
--   the audit events become orphaned too. Keep them for now.

-- ============================================================================
-- PHASE 1: Delete orphaned rows (tenantId IS NULL)
-- These rows have no tenant ownership — they cannot be assigned to a tenant.
-- ============================================================================

-- Delete orphan domain notes (no tenant attribution possible)
DELETE FROM "domain_notes"
WHERE "tenant_id" IS NULL;
--> statement-breakpoint

-- Delete orphan domain tags (no tenant attribution possible)
DELETE FROM "domain_tags"
WHERE "tenant_id" IS NULL;
--> statement-breakpoint

-- Delete orphan saved filters (no tenant attribution possible)
DELETE FROM "saved_filters"
WHERE "tenant_id" IS NULL;
--> statement-breakpoint

-- Delete orphan template overrides (no tenant attribution possible)
DELETE FROM "template_overrides"
WHERE "tenant_id" IS NULL;
--> statement-breakpoint

-- NOTE: audit_events with NULL tenant_id are preserved.
-- System-generated audit events (e.g., "user X deleted domain Y") should
-- retain their records for debugging. Setting them to NULL is acceptable
-- since they don't expose cross-tenant data — they reference other entities
-- by ID, not tenant.

-- ============================================================================
-- PHASE 2: Verify no NULL tenantId remains in data tables
-- Fail migration if any remain (manual cleanup required).
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "domain_notes" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on domain_notes.tenant_id: orphan rows remain';
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "domain_tags" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on domain_tags.tenant_id: orphan rows remain';
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "saved_filters" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on saved_filters.tenant_id: orphan rows remain';
  END IF;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "template_overrides" WHERE "tenant_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on template_overrides.tenant_id: orphan rows remain';
  END IF;
END $$;
--> statement-breakpoint

-- ============================================================================
-- PHASE 3: Enforce NOT NULL constraints
-- ============================================================================

ALTER TABLE "domain_notes" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "domain_tags" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "saved_filters" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "template_overrides" ALTER COLUMN "tenant_id" SET NOT NULL;
--> statement-breakpoint

-- audit_events.tenant_id remains nullable.
-- Rationale: system-generated audit events (e.g., domain deleted by system cleanup)
-- have no human actor and no tenant. Keeping them nullable avoids the need to
-- assign them to a synthetic system tenant.
