export type FeedPreviewItem = {
  sourceItemId: string | null;
  fingerprint: string;
  canonicalUrl: string | null;
  url: string | null;
  title: string | null;
  descriptionText: string | null;
  descriptionHtml: string | null;
  author: string | null;
  imageUrl: string | null;
  datePublished: string | null;
  dateModified: string | null;
  raw: Record<string, unknown>;
};

export type FeedPreview = {
  sourceUrl: string;
  sourceType: "native" | "webpage";
  sourceFormat: "rss" | "atom" | "html";
  feedTitle: string;
  feedDescription: string | null;
  previewItems: FeedPreviewItem[];
  warnings: string[];
};

type ApiEnvelope<T> = {
  data?: T;
  error?: { code?: string; message?: string };
};

export class ClientApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ClientApiError";
    this.code = code;
  }
}

export function feedCreationErrorMessage(error: unknown): string {
  if (!(error instanceof ClientApiError)) return "Unable to continue. Please try again.";
  if (error.code === "UNSAFE_URL") return "Use a public website or feed URL.";
  if (error.code === "NO_FEED_CANDIDATE") return "We couldn't find feed items at this URL.";
  return error.message;
}

async function request<T>(url: string, init: RequestInit, fetcher: typeof fetch): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, init);
  } catch {
    throw new ClientApiError("NETWORK_ERROR", "Unable to reach Morsel. Please try again.");
  }

  const result = await response.json().catch(() => ({})) as ApiEnvelope<T>;
  if (!response.ok || result.data === undefined) {
    throw new ClientApiError(
      result.error?.code ?? "REQUEST_FAILED",
      result.error?.message ?? "Unable to complete the request.",
    );
  }
  return result.data;
}

function post<T>(url: string, body: unknown, fetcher: typeof fetch): Promise<T> {
  return request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, fetcher);
}

async function mutate<T>(
  url: string,
  method: "PATCH" | "DELETE",
  body: unknown,
  fetcher: typeof fetch,
): Promise<T> {
  return request(url, {
    method,
    ...(body === undefined ? {} : {
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  }, fetcher);
}

export function discoverFeed(
  workspaceId: string,
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<FeedPreview> {
  return post("/api/feeds/discover", { workspaceId, url }, fetcher);
}

export function saveFeedPreview(
  workspaceId: string,
  preview: FeedPreview,
  feedTitle: string,
  fetcher: typeof fetch = fetch,
): Promise<{ id: string }> {
  return post("/api/feeds", { ...preview, workspaceId, feedTitle }, fetcher);
}

export function updateFeedStatus(
  workspaceId: string,
  feedId: string,
  status: "ACTIVE" | "PAUSED",
  fetcher: typeof fetch = fetch,
): Promise<{ status: "ACTIVE" | "PAUSED" }> {
  return mutate(
    `/api/feeds/${encodeURIComponent(feedId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
    "PATCH",
    { status },
    fetcher,
  );
}

export function deleteFeed(
  workspaceId: string,
  feedId: string,
  fetcher: typeof fetch = fetch,
): Promise<{ deleted: true; id: string }> {
  return mutate(
    `/api/feeds/${encodeURIComponent(feedId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
    "DELETE",
    undefined,
    fetcher,
  );
}
