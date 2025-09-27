import { createClient } from 'redis'

let redis: ReturnType<typeof createClient>

export function getRedis() {
  if (!redis) {
    redis = createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    })

    redis.on('error', (err) => {
      console.error('Redis Client Error', err)
    })

    redis.connect()
  }

  return redis
}
