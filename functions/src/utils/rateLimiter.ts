// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per user

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory rate limit storage (resets on function cold start)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a user has exceeded the rate limit
 * @param userId - User ID to check
 * @returns true if rate limit exceeded, false otherwise
 */
export function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry) {
    // First request
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return false;
  }

  const windowElapsed = now - entry.windowStart;

  if (windowElapsed > RATE_LIMIT_WINDOW_MS) {
    // Window expired, reset
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return false;
  }

  // Within window
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true; // Rate limit exceeded
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(userId, entry);
  return false;
}

/**
 * Get remaining requests for a user
 * @param userId - User ID to check
 * @returns Number of remaining requests in current window
 */
export function getRemainingRequests(userId: string): number {
  const entry = rateLimitStore.get(userId);
  if (!entry) {
    return MAX_REQUESTS_PER_WINDOW;
  }

  const now = Date.now();
  const windowElapsed = now - entry.windowStart;

  if (windowElapsed > RATE_LIMIT_WINDOW_MS) {
    return MAX_REQUESTS_PER_WINDOW;
  }

  return Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count);
}

/**
 * Get time until rate limit window resets
 * @param userId - User ID to check
 * @returns Milliseconds until window reset, or 0 if not rate limited
 */
export function getResetTime(userId: string): number {
  const entry = rateLimitStore.get(userId);
  if (!entry) {
    return 0;
  }

  const now = Date.now();
  const windowElapsed = now - entry.windowStart;

  if (windowElapsed > RATE_LIMIT_WINDOW_MS) {
    return 0;
  }

  return RATE_LIMIT_WINDOW_MS - windowElapsed;
}

/**
 * Middleware to check rate limit and throw error if exceeded
 * @param userId - User ID to check
 * @throws Error if rate limit exceeded
 */
export function checkRateLimit(userId: string): void {
  if (isRateLimited(userId)) {
    const resetTime = getResetTime(userId);
    const resetSeconds = Math.ceil(resetTime / 1000);
    throw new Error(
      `Rate limit exceeded. Try again in ${resetSeconds} seconds.`
    );
  }
}

