import type { getRedis } from '@/server/lib/redis'

type RedisClient = ReturnType<typeof getRedis>

export class CacheRepository {
  constructor(private readonly redis: RedisClient) { }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      return await this.redis.set(key, value, { EX: ttlSeconds })
    }
    else {
      return await this.redis.set(key, value)
    }
  }

  async get(key: string) {
    return await this.redis.get(key)
  }

  async del(key: string) {
    return await this.redis.del(key)
  }

  async addFileSize(userId: string, fileSize: number): Promise<number> {
    return await this.redis.incrBy(`user:storage:${userId}`, fileSize) as number
  }

  // get user storage size in bytes
  async getFileSize(userId: string): Promise<number> {
    const fileSize = await this.redis.get(`user:storage:${userId}`)
    return fileSize ? Number.parseInt(fileSize) : 0
  }

  async removeFileSize(userId: string, fileSize: number): Promise<number> {
    return await this.redis.decrBy(`user:storage:${userId}`, fileSize) as number
  }
}
