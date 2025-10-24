/* eslint-disable no-console */
import type { Job } from 'bullmq'
import type { ThumbnailJobData } from '../lib/queue'
import { Worker } from 'bullmq'
import { eq } from 'drizzle-orm'
import Redis from 'ioredis'
import { getFileBuffer } from '@/shared/api/minio'
import { db } from '../db'
import { content } from '../db/schema'
import { generateThumbnail } from '../lib/generate-thumbnail'

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
})

async function processThumbnailJob(job: Job<ThumbnailJobData>) {
  const { contentId, objectName, mimeType } = job.data

  try {
    const fileBuffer = await getFileBuffer(objectName)

    if (!fileBuffer) {
      throw new Error(`File not found: ${objectName}`)
    }

    const thumbnailBase64 = await generateThumbnail(fileBuffer, mimeType)

    if (!thumbnailBase64) {
      throw new Error('No thumbnail generated')
    }

    console.log(`✅ Generated thumbnail for ${contentId}`)

    const [existingContent] = await db
      .select()
      .from(content)
      .where(eq(content.id, contentId))
      .limit(1)

    if (!existingContent) {
      throw new Error(`Content not found: ${contentId}`)
    }

    const contentJson = JSON.parse(existingContent.content)

    if (job.data.type === 'image' && contentJson.media) {
      contentJson.media.thumbnailBase64 = thumbnailBase64
    }
    else if (job.data.type === 'video' && contentJson.media) {
      contentJson.media.thumbnailBase64 = thumbnailBase64
    }
    else if (job.data.type === 'audio-cover' && contentJson.cover) {
      contentJson.cover.thumbnailBase64 = thumbnailBase64
    }

    await db
      .update(content)
      .set({
        content: JSON.stringify(contentJson),
        updatedAt: new Date(),
      })
      .where(eq(content.id, contentId))

    console.log(`✅ Thumbnail generated for content ${contentId}`)
  }
  catch (error) {
    console.error(`❌ Failed to generate thumbnail for content ${contentId}:`, error)
    throw error
  }
}

export const thumbnailWorker = new Worker<ThumbnailJobData>(
  'thumbnail-generation',
  processThumbnailJob,
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 thumbnails in parallel
    limiter: {
      max: 10,
      duration: 1000, // Max 10 jobs per second
    },
  },
)

thumbnailWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`)
})

thumbnailWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message)
})

thumbnailWorker.on('error', (err) => {
  console.error('Worker error:', err)
})

console.log('📸 Thumbnail worker started')
