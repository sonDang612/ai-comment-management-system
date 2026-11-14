-- AlterTable
ALTER TABLE "rule_settings" DROP COLUMN "allow_empty",
DROP COLUMN "allow_emoji_only",
ADD COLUMN "max_repeated_words" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "allow_ip_addresses" BOOLEAN NOT NULL DEFAULT false;
