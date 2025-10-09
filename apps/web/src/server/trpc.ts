import type { Context } from './context'
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { handleAuthError } from '@/shared/lib/utils'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
      },
    }
  },
})

export const router = t.router

// FIXME: For production, use a proper rate limiter like Redis/Upstash.
type RateKey = string
const WINDOW_MS = Number(process.env.TRPC_RATE_WINDOW_MS ?? 60_000)
const LIMIT_QUERY = Number(process.env.TRPC_RATE_LIMIT_QUERY ?? 60)
const LIMIT_MUTATION = Number(process.env.TRPC_RATE_LIMIT_MUTATION ?? 20)
const keyToHits: Map<RateKey, number[]> = new Map()

function recordAndCheckLimit(key: RateKey, limit: number): boolean {
  const now = Date.now()
  const windowStart = now - WINDOW_MS
  const arr = keyToHits.get(key) ?? []
  const recent = arr.filter(ts => ts > windowStart)
  recent.push(now)
  keyToHits.set(key, recent)
  return recent.length <= limit
}

const rateLimiter = t.middleware(async ({ ctx, type, next }) => {
  const identity = ctx.user?.id || ctx.ip || 'anonymous'
  const bucket = type === 'mutation' ? 'm' : 'q'
  const key = `${identity}:${bucket}` as RateKey
  const limit = type === 'mutation' ? LIMIT_MUTATION : LIMIT_QUERY
  const allowed = recordAndCheckLimit(key, limit)
  if (!allowed) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' })
  }
  return next()
})

const slowLogger = t.middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start
  const threshold = Number(process.env.TRPC_SLOW_MS ?? 300)
  if (duration > threshold) {
    console.warn('[tRPC][slow]', {
      path,
      type,
      durationMs: duration,
      requestId: ctx.requestId,
      userId: ctx.user?.id,
    })
  }
  return result
})

export const publicProcedure = t.procedure.use(rateLimiter).use(slowLogger)

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user)
    handleAuthError(null, 'UNAUTHORIZED')

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

export const protectedProcedure = t.procedure.use(rateLimiter).use(slowLogger).use(isAuthed)

// getServerCaller moved to a separate module to avoid circular imports
