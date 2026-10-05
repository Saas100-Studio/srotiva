import { SrotivaApiError } from "../api/errors.ts";

type Bucket = { count: number; resetAt: number };
type RateLimitInput = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export const RATE_LIMIT_BUCKET_CAPACITY = 10_000;
const buckets = new Map<string, Bucket>();

export function clientIp(request: Request): string {
  // ponytail: trust these headers only behind the configured deployment proxy; use the platform IP API if deployed directly.
  return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkRateLimit({ bucket, key, limit, windowMs, now = Date.now() }: RateLimitInput) {
  const id = `${bucket}:${key}`;
  const current = buckets.get(id);
  if (!current || current.resetAt <= now) {
    if (!current && buckets.size >= RATE_LIMIT_BUCKET_CAPACITY) {
      for (const [storedId, stored] of buckets) {
        if (stored.resetAt <= now) buckets.delete(storedId);
      }
      if (buckets.size >= RATE_LIMIT_BUCKET_CAPACITY) {
        const nextReset = Math.min(...[...buckets.values()].map(({ resetAt }) => resetAt));
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((nextReset - now) / 1_000)) };
      }
    }
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1_000));
  return { allowed: current.count <= limit, retryAfterSeconds };
}

export function enforceRateLimit(input: RateLimitInput): void {
  const result = checkRateLimit(input);
  if (!result.allowed) {
    throw new SrotivaApiError(429, "RATE_LIMITED", "Too many requests. Try again later.", {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}
