import { redis } from 'bun'

export class CacheRepository {
  constructor() { }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await redis.set(key, value)
      await redis.expire(key, ttlSeconds)
    }
    else {
      return await redis.set(key, value)
    }
  }

  async get(key: string) {
    return await redis.get(key)
  }

  async del(key: string) {
    return await redis.del(key)
  }

  async addFileSize(userId: string, fileSize: number): Promise<number> {
    return await redis.hincrby(`user:${userId}`, 'storage', fileSize)
  }

  // get user storage size in bytes
  async getFileSize(userId: string): Promise<number> {
    const fileSize = await redis.hget(`user:${userId}`, 'storage')
    console.log('fileSize', fileSize)
    return fileSize ? Number.parseInt(fileSize) : 0
  }

  async removeFileSize(userId: string, fileSize: number): Promise<number> {
    return await redis.hincrby(`user:${userId}`, 'storage', -fileSize)
  }
}
