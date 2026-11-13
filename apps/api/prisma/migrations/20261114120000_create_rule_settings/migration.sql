-- CreateEnum
CREATE TYPE "keyword_match_mode" AS ENUM ('exact', 'contains');

-- CreateTable
CREATE TABLE "rule_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "min_length" INTEGER NOT NULL,
    "max_length" INTEGER NOT NULL,
    "allow_empty" BOOLEAN NOT NULL,
    "allow_emoji_only" BOOLEAN NOT NULL,
    "max_repeated_chars" INTEGER NOT NULL,
    "allow_links" BOOLEAN NOT NULL,
    "domain_whitelist" TEXT[],
    "domain_blacklist" TEXT[],
    "duplicate_detection_enabled" BOOLEAN NOT NULL,
    "duplicate_window_minutes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rule_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restricted_keywords" (
    "id" UUID NOT NULL,
    "keyword" TEXT NOT NULL,
    "match_mode" "keyword_match_mode" NOT NULL,
    "action" "comment_status" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "restricted_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restricted_keywords_position_idx" ON "restricted_keywords"("position");
