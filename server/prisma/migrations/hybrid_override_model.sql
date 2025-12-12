-- Migration: Hybrid Override Model
-- This migration updates the schema to support the new referral system

-- 1. Update User table for Hybrid Override Model
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "teamRakeWindow" DOUBLE PRECISION DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "teamRakeAllTime" DOUBLE PRECISION DEFAULT 0 NOT NULL;

-- 2. Convert referralRank from Int to String (existing values mapping)
-- First, create a new column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralRank_new" TEXT DEFAULT 'FREE' NOT NULL;

-- Map existing integer values to string values
UPDATE "User" SET "referralRank_new" = CASE
  WHEN "referralRank" = 0 THEN 'FREE'
  WHEN "referralRank" = 1 THEN 'AGENT'
  WHEN "referralRank" = 2 THEN 'BROKER'
  WHEN "referralRank" = 3 THEN 'PARTNER'
  WHEN "referralRank" = 4 THEN 'MASTER'
  ELSE 'FREE'
END;

-- Drop old column and rename new one
ALTER TABLE "User" DROP COLUMN IF EXISTS "referralRank";
ALTER TABLE "User" RENAME COLUMN "referralRank_new" TO "referralRank";

-- 3. Add metadata field to Transaction table
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- 4. Update RakeDistribution table
-- Remove host-related fields
ALTER TABLE "RakeDistribution" DROP COLUMN IF EXISTS "hostShare";
ALTER TABLE "RakeDistribution" DROP COLUMN IF EXISTS "hostUserId";
ALTER TABLE "RakeDistribution" DROP COLUMN IF EXISTS "hostTier";
ALTER TABLE "RakeDistribution" DROP COLUMN IF EXISTS "referrerUserId";
ALTER TABLE "RakeDistribution" DROP COLUMN IF EXISTS "referrerRank";

-- Add referralBreakdown field
ALTER TABLE "RakeDistribution" ADD COLUMN IF NOT EXISTS "referralBreakdown" JSONB;

-- 5. Drop old indexes that referenced removed columns
DROP INDEX IF EXISTS "RakeDistribution_hostUserId_idx";
DROP INDEX IF EXISTS "RakeDistribution_referrerUserId_idx";

-- 6. Add comments to deprecated fields
COMMENT ON COLUMN "User"."hostRank" IS 'DEPRECATED: No longer used in Hybrid Override Model';
COMMENT ON COLUMN "User"."hostEarnings" IS 'DEPRECATED: No longer used in Hybrid Override Model';

-- Migration complete
