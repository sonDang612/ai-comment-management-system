-- CreateEnum
CREATE TYPE "keyword_match_mode" AS ENUM ('exact', 'contains');

-- CreateEnum
CREATE TYPE "keyword_action" AS ENUM ('disabled', 'pending');

-- CreateTable
CREATE TABLE "rule_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "min_length" INTEGER NOT NULL,
    "max_length" INTEGER NOT NULL,
    "allow_empty" BOOLEAN NOT NULL,
    "allow_emoji_only" BOOLEAN NOT NULL,
    "max_repeated_chars" INTEGER NOT NULL,
    "domain_whitelist" TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rule_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restricted_keywords" (
    "id" UUID NOT NULL,
    "keyword" TEXT NOT NULL,
    "match_mode" "keyword_match_mode" NOT NULL,
    "action" "keyword_action" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "restricted_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_valid" BOOLEAN,
    "is_question" BOOLEAN,
    "confidence" DECIMAL(3,2),
    "reason" TEXT,
    "moderated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restricted_keywords_position_idx" ON "restricted_keywords"("position");

-- CreateIndex
CREATE INDEX "comments_created_at_idx" ON "comments"("created_at" DESC);

-- CreateIndex
CREATE INDEX "comments_is_valid_idx" ON "comments"("is_valid");

