// In-memory rate limiter for Vercel serverless
// Note: Resets on cold starts, but good enough for MVP spam protection

const rateLimitStore = new Map<string, number[]>()

// Clean up expired entries periodically
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 60 * 1000 // 1 minute

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  const cutoff = now - windowMs

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const valid = timestamps.filter(t => t > cutoff)
    if (valid.length === 0) {
      rateLimitStore.delete(key)
    } else {
      rateLimitStore.set(key, valid)
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number | null // seconds until next allowed request
}

/**
 * Check and update rate limit for a key
 * @param key - Unique identifier (e.g., "posts:user-id" or "register:ip")
 * @param limit - Maximum number of requests allowed
 * @param windowSeconds - Time window in seconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const cutoff = now - windowMs

  // Run cleanup occasionally
  cleanup(windowMs)

  // Get existing timestamps and filter to current window
  const timestamps = rateLimitStore.get(key) || []
  const validTimestamps = timestamps.filter(t => t > cutoff)

  if (validTimestamps.length >= limit) {
    // Rate limited - calculate when the oldest request expires
    const oldestInWindow = Math.min(...validTimestamps)
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000)

    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    }
  }

  // Allowed - add current timestamp
  validTimestamps.push(now)
  rateLimitStore.set(key, validTimestamps)

  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    retryAfter: null,
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}
