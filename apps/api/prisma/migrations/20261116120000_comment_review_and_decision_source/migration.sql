-- AlterTable
ALTER TABLE "comments" ADD COLUMN "decided_by" VARCHAR(16),
ADD COLUMN "reviewed_label" VARCHAR(16),
ADD COLUMN "reviewed_category" VARCHAR(32),
ADD COLUMN "reviewed_at" TIMESTAMPTZ(3);

-- Backfill the decision source of comments checked before this migration
UPDATE "comments"
SET "decided_by" = CASE WHEN "ai_scores" IS NOT NULL THEN 'ai_model' ELSE 'rule_filter' END
WHERE "moderated_at" IS NOT NULL;
