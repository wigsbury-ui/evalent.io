import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Shared Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 5 login attempts per 15 minutes per IP
export const loginRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'rl:login',
  analytics: true,
})

// 3 signup attempts per hour per IP
export const signupRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'),
  prefix: 'rl:signup',
  analytics: true,
})

// Helper: get real IP from Vercel headers
export function getIP(req: Request): string {
  const forwarded = (req as any).headers?.get?.('x-forwarded-for')
  const realIp = (req as any).headers?.get?.('x-real-ip')
  if (forwarded) return forwarded.split(',')[0].trim()
  if (realIp) return realIp
  return '127.0.0.1'
}
