ALTER TABLE "feed_refresh_jobs"
ADD COLUMN "locked_at" TIMESTAMPTZ,
ADD COLUMN "locked_by" TEXT,
ADD COLUMN "next_retry_at" TIMESTAMPTZ;
