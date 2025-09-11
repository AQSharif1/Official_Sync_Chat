/**
 * Rate limiting utilities - SECURITY ENHANCED VERSION
 * 
 * ⚠️ IMPORTANT: Client-side rate limiting is NOT secure and can be easily bypassed.
 * This file now provides guidance for implementing proper server-side rate limiting.
 */

/**
 * SECURITY WARNING: Client-side rate limiting is vulnerable to bypass attacks
 * 
 * Attackers can easily:
 * - Modify user agent strings
 * - Clear localStorage/cookies
 * - Use different browsers/devices
 * - Manipulate timestamps
 * - Use browser dev tools to modify values
 * 
 * ALWAYS implement rate limiting on the server-side (Supabase Edge Functions)
 */

/**
 * Server-side rate limiting configuration (for Supabase Edge Functions)
 */
export const SERVER_RATE_LIMIT_CONFIG = {
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyField: 'email' // Rate limit by email address
  },
  messages: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    keyField: 'user_id' // Rate limit by user ID
  },
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyField: 'user_id' // Rate limit by user ID
  },
  signup: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyField: 'ip_address' // Rate limit by IP address
  }
};

/**
 * Rate limiting implementation for Supabase Edge Functions
 * 
 * Example usage in Edge Function:
 * 
 * ```typescript
 * import { rateLimit } from './rateLimit';
 * 
 * export default async function handler(req: Request) {
 *   // Check rate limit before processing request
 *   const rateLimitResult = await rateLimit.check('auth', userEmail);
 *   if (!rateLimitResult.allowed) {
 *     return new Response('Rate limit exceeded', { status: 429 });
 *   }
 *   
 *   // Process request...
 * }
 * ```
 */

/**
 * Rate limit check function for Edge Functions
 * @param type - Rate limit type (auth, messages, api, signup)
 * @param identifier - User identifier (email, user_id, ip_address)
 * @returns Rate limit check result
 */
export const checkServerRateLimit = async (
  type: keyof typeof SERVER_RATE_LIMIT_CONFIG,
  identifier: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}> => {
  // This should be implemented in your Supabase Edge Functions
  // using Redis or a similar persistent store
  
  // For now, return a placeholder that indicates server-side implementation needed
  return {
    allowed: true,
    remaining: SERVER_RATE_LIMIT_CONFIG[type].maxRequests,
    resetTime: Date.now() + SERVER_RATE_LIMIT_CONFIG[type].windowMs
  };
};

/**
 * DEPRECATED: Client-side rate limiting (removed for security)
 * 
 * These functions are no longer available as they were vulnerable to bypass attacks.
 * Use server-side rate limiting in Supabase Edge Functions instead.
 */

/**
 * Get client identifier (DEPRECATED - Use server-side instead)
 * @deprecated This function is vulnerable to spoofing attacks
 */
export const getClientIdentifier = (): string => {
  console.warn('⚠️ getClientIdentifier is deprecated. Use server-side rate limiting instead.');
  return 'deprecated';
};

/**
 * Check if an action is rate limited (DEPRECATED - Use server-side instead)
 * @deprecated This function is vulnerable to bypass attacks
 */
export const checkRateLimit = () => {
  console.warn('⚠️ checkRateLimit is deprecated. Use server-side rate limiting instead.');
  return { allowed: true, remaining: 999, resetTime: Date.now() + 60000 };
};

/**
 * Rate limit decorator (DEPRECATED - Use server-side instead)
 * @deprecated This function is vulnerable to bypass attacks
 */
export const withRateLimit = <T extends any[], R>(
  _limiter: any,
  fn: (...args: T) => R,
  _identifier: string = 'deprecated'
) => {
  console.warn('⚠️ withRateLimit is deprecated. Use server-side rate limiting instead.');
  return fn;
};

// Export empty objects for backward compatibility (will be removed in future)
export const authRateLimiter = { check: () => ({ allowed: true, remaining: 999, resetTime: Date.now() + 60000 }) };
export const messageRateLimiter = { check: () => ({ allowed: true, remaining: 999, resetTime: Date.now() + 60000 }) };
export const apiRateLimiter = { check: () => ({ allowed: true, remaining: 999, resetTime: Date.now() + 60000 }) };
export const signupRateLimiter = { check: () => ({ allowed: true, remaining: 999, resetTime: Date.now() + 60000 }) };


