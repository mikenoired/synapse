import { Queue } from 'bullmq'
import Redis from 'ioredis'

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
})

export const thumbnailQueue = new Queue('thumbnail-generation', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
})

export interface ThumbnailJobData {
  contentId: string
  objectName: string
  mimeType: string
  type: 'image' | 'video' | 'audio-cover'
}
