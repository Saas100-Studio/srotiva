import { hostname } from "node:os";
import { pathToFileURL } from "node:url";

import { MorselApiError } from "../lib/api/errors.ts";
import { refreshFeed } from "../lib/feed/refresh-feed.ts";
import {
  claimNextRefreshJob,
  completeRefreshJob,
  failRefreshJob,
} from "../lib/jobs/refresh-queue.ts";

type WorkerDependencies = {
  claimNextRefreshJob?: typeof claimNextRefreshJob;
  refreshFeed?: typeof refreshFeed;
  completeRefreshJob?: typeof completeRefreshJob;
  failRefreshJob?: typeof failRefreshJob;
};

function jobError(error: unknown) {
  return error instanceof MorselApiError
    ? { code: error.code, message: error.message }
    : { code: "REFRESH_FAILED", message: "The feed refresh failed." };
}

export async function processNextRefreshJob(
  workerId: string,
  dependencies: WorkerDependencies = {},
) {
  const job = await (dependencies.claimNextRefreshJob ?? claimNextRefreshJob)({ workerId });
  if (!job) return null;

  let result;
  try {
    result = await (dependencies.refreshFeed ?? refreshFeed)({
      feedId: job.feedId,
      trigger: job.trigger,
      jobId: job.id,
    });
  } catch (error) {
    const failure = jobError(error);
    await (dependencies.failRefreshJob ?? failRefreshJob)({
      jobId: job.id,
      error: failure,
      workerId,
    });
    return { jobId: job.id, status: "failed" as const, error: failure };
  }
  await (dependencies.completeRefreshJob ?? completeRefreshJob)({ jobId: job.id, result, workerId });
  return { jobId: job.id, status: "succeeded" as const, result };
}

async function main(): Promise<void> {
  const workerId = `${hostname()}:${process.pid}`;
  const result = await processNextRefreshJob(workerId);
  console.info(result ? `Refresh job ${result.jobId} ${result.status}.` : "No queued refresh jobs.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
