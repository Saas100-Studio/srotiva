-- Retain the oldest running job, or otherwise the oldest queued job, before
-- enforcing the invariant for databases that predate this constraint.
WITH ranked_open_jobs AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY feed_id
      ORDER BY
        CASE WHEN status = 'running'::refresh_job_status THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) AS open_rank
  FROM feed_refresh_jobs
  WHERE status IN (
    'queued'::refresh_job_status,
    'running'::refresh_job_status
  )
)
UPDATE feed_refresh_jobs AS job
SET
  status = 'cancelled'::refresh_job_status,
  finished_at = NOW(),
  locked_at = NULL,
  locked_by = NULL,
  error_code = 'DUPLICATE_OPEN_JOB',
  error_message = 'Cancelled while enforcing one open refresh job per feed.'
FROM ranked_open_jobs AS ranked
WHERE job.id = ranked.id
  AND ranked.open_rank > 1;

CREATE UNIQUE INDEX "feed_refresh_jobs_one_open_per_feed_key"
ON "feed_refresh_jobs"("feed_id")
WHERE "status" IN (
  'queued'::refresh_job_status,
  'running'::refresh_job_status
);
