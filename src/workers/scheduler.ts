import { pathToFileURL } from "node:url";

import { enqueueDueRefreshJobs } from "../lib/feed/refresh-schedule.ts";

export async function scheduleDueFeeds(now = new Date()) {
  return enqueueDueRefreshJobs(now);
}

async function main(): Promise<void> {
  const feedIds = await scheduleDueFeeds();
  console.info(`Enqueued ${feedIds.length} due feed${feedIds.length === 1 ? "" : "s"}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
