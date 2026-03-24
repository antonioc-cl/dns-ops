-- Migration: Remove vantage_points table and vantage_id foreign key
-- 
-- PR-12.3: De-scope vantagePoints table (migration)
-- 
-- This migration removes:
-- 1. The observations.vantage_id foreign key column (nullable, always NULL)
-- 2. The observations.vantage_idx index
-- 3. The vantage_points table
--
-- Rationale: The vantage_id field was intended for tracking specific vantage points,
-- but vantageIdentifier (varchar) is used instead. All existing vantage_id values are NULL.
-- This removes dead code and simplifies the schema.

--> statement-breakpoint
-- Drop the index on vantage_id first
DROP INDEX IF EXISTS "observation_vantage_idx";--> statement-breakpoint
-- Remove the foreign key constraint by recreating the table without it
-- Since Drizzle doesn't support DROP COLUMN directly in this way,
-- we use a more explicit approach for PostgreSQL

ALTER TABLE "observations" DROP COLUMN IF EXISTS "vantage_id";--> statement-breakpoint
-- Now drop the vantage_points table (no FK references should exist)
DROP TABLE IF EXISTS "vantage_points";
