-- DropTable
DROP TABLE "moderation_decisions";

-- AlterTable
ALTER TABLE "comments" DROP COLUMN "status",
DROP COLUMN "decided_by",
ADD COLUMN "is_valid" BOOLEAN,
ADD COLUMN "is_question" BOOLEAN;

-- CreateEnum
CREATE TYPE "keyword_action" AS ENUM ('disabled', 'pending');

-- AlterTable
ALTER TABLE "restricted_keywords" ALTER COLUMN "action" TYPE "keyword_action" USING ("action"::text::"keyword_action");

-- DropEnum
DROP TYPE "comment_status";

-- DropEnum
DROP TYPE "decided_by";

-- CreateIndex
CREATE INDEX "comments_is_valid_idx" ON "comments"("is_valid");
