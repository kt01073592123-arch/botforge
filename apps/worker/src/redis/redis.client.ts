import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

// maxRetriesPerRequest: null is required by BullMQ
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redisConnection.on('connect', () => {
  console.log('[Redis] Connected to', redisUrl)
})

redisConnection.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message)
})
