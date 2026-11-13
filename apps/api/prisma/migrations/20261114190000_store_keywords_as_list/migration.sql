-- AlterTable
ALTER TABLE "rule_settings" ADD COLUMN "restricted_keywords" TEXT[];

-- MigrateData
UPDATE "rule_settings"
SET "restricted_keywords" = COALESCE(
  (SELECT array_agg("keyword" ORDER BY "position", "created_at") FROM "restricted_keywords"),
  ARRAY[]::TEXT[]
);

-- DropTable
DROP TABLE "restricted_keywords";

-- DropEnum
DROP TYPE "keyword_action";

-- DropEnum
DROP TYPE "keyword_match_mode";
