import { FeedStatus } from "@prisma/client";

export type FeedHealthStatus = "healthy" | "stale" | "degraded" | "failed" | "paused";

type FeedHealthInput = {
  status: FeedStatus;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  nextRefreshAt: Date | null;
  failureCount: number;
};

export function getFeedHealth(feed: FeedHealthInput, now = new Date()): {
  healthStatus: FeedHealthStatus;
  healthMessage: string;
} {
  if (feed.status === FeedStatus.PAUSED) {
    return { healthStatus: "paused", healthMessage: "Automatic refresh is paused." };
  }
  if (feed.failureCount >= 3) {
    return {
      healthStatus: "failed",
      healthMessage: `Refresh has failed ${feed.failureCount} times in a row. Srotiva will retry automatically.`,
    };
  }
  if (feed.failureCount > 0 || feed.status === FeedStatus.DEGRADED || feed.status === FeedStatus.FAILED) {
    return { healthStatus: "degraded", healthMessage: "The latest refresh had a problem. Srotiva will retry automatically." };
  }
  if (feed.nextRefreshAt && feed.nextRefreshAt < now) {
    return { healthStatus: "stale", healthMessage: "This feed is overdue for refresh." };
  }
  if (feed.lastSuccessAt) {
    return { healthStatus: "healthy", healthMessage: "The latest refresh completed successfully." };
  }
  return { healthStatus: "healthy", healthMessage: "This feed is ready for its first scheduled refresh." };
}

export function withFeedHealth<T extends FeedHealthInput>(feed: T, now = new Date()) {
  return { ...feed, ...getFeedHealth(feed, now) };
}
