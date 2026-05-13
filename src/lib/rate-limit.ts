/**
 * Simple in-memory rate limiter.
 *
 * ⚠️ On Vercel Serverless this resets per cold start.
 * For production, consider Upstash Redis (@upstash/ratelimit).
 */

const rateMaps = new Map<string, Map<string, { count: number; resetAt: number }>>();

export function isRateLimited(
  ip: string,
  bucket: string,
  limit: number,
  windowMs: number
): boolean {
  if (!rateMaps.has(bucket)) rateMaps.set(bucket, new Map());
  const map = rateMaps.get(bucket)!;

  const now = Date.now();

  // Clean up expired entries to prevent memory leak
  for (const [key, entry] of map) {
    if (now > entry.resetAt) map.delete(key);
  }

  const entry = map.get(ip);
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  // >= limit: the limit+1th request is blocked (not limit+2)
  return entry.count >= limit;
}
