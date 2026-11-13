-- CreateEnum
CREATE TYPE "comment_status" AS ENUM ('approved', 'pending', 'disabled');

-- CreateEnum
CREATE TYPE "decided_by" AS ENUM ('whitelist', 'rule_filter', 'ai_model', 'admin');

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "status" "comment_status" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "confidence" DECIMAL(3,2),
    "decided_by" "decided_by",
    "moderated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_decisions" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "normalized_content" TEXT NOT NULL,
    "decision" "comment_status" NOT NULL,
    "category" TEXT,
    "violation_type" TEXT,
    "labels" TEXT[],
    "confidence" DECIMAL(3,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "decided_by" "decided_by" NOT NULL,
    "model_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comments_created_at_idx" ON "comments"("created_at" DESC);

-- CreateIndex
CREATE INDEX "moderation_decisions_comment_id_created_at_idx" ON "moderation_decisions"("comment_id", "created_at");

-- CreateIndex
CREATE INDEX "moderation_decisions_created_at_idx" ON "moderation_decisions"("created_at");

-- AddForeignKey
ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

