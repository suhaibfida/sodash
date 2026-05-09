// =============================================
// In-Memory Sliding Window Rate Limiter
// Prevents OTP abuse and Telegram spam.
// Does not require Redis — suitable for single
// process. Swap for Redis in multi-instance.
// =============================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check if a key is within the allowed rate limit.
 * @param key       Unique key (e.g. "otp:walletAddress")
 * @param maxCount  Max requests allowed in window
 * @param windowMs  Window duration in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxCount: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    // Start fresh window
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= maxCount) {
    return false; // Rate limited
  }

  entry.count += 1;
  return true;
}

/**
 * Reset a rate limit key (e.g. after successful verification).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Cleanup expired entries to prevent memory leaks.
 * Call this periodically (e.g. from cleanup worker).
 */
export function cleanupRateLimitStore(maxAgeMs: number = 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > maxAgeMs) {
      store.delete(key);
    }
  }
}
