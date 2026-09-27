-- AlterTable
ALTER TABLE "feeds"
ADD COLUMN "output_slug" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN "public_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "feeds_output_slug_key" ON "feeds"("output_slug");
