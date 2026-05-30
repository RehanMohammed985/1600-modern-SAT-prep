/** In-process rate limiter to prevent duplicate AI calls on refresh or double-submit */

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 8_000;
const MAX_PER_WINDOW = 2;

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= MAX_PER_WINDOW) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - bucket.windowStart) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export function rateLimitKey(userId: string, action: string, resourceId: string): string {
  return `${userId}:${action}:${resourceId}`;
}
