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

  async addFile(userId: string, fileSize: number, updateFileCount = true) {
    const operations = [redis.hincrby(`user:${userId}`, 'storage', fileSize)]

    if (updateFileCount) {
      operations.push(redis.hincrby(`user:${userId}`, 'files', 1))
    }

    return await Promise.all(operations)
  }

  // get user storage size in bytes and files count
  async getUserStorage(userId: string) {
    const [fileSize, files] = await Promise.all([
      redis.hget(`user:${userId}`, 'storage'),
      redis.hget(`user:${userId}`, 'files'),
    ])
    return { fileSize: fileSize ? Number.parseInt(fileSize) : 0, files: files ? Number.parseInt(files) : 0 }
  }

  async removeFile(userId: string, fileSize: number) {
    return await Promise.all([
      redis.hincrby(`user:${userId}`, 'storage', -fileSize),
      redis.hincrby(`user:${userId}`, 'files', -1),
    ])
  }
}
