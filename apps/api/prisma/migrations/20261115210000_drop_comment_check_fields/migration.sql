-- DropIndex
DROP INDEX "comments_is_valid_idx";

-- AlterTable
ALTER TABLE "comments" DROP COLUMN "is_valid",
DROP COLUMN "is_question",
DROP COLUMN "confidence";
