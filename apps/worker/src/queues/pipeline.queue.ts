import { Queue } from 'bullmq'
import { redisConnection } from '../redis/redis.client'
import { QUEUE_NAMES } from './queue.names'

// Shared queue instance used by the API to dispatch jobs.
// The worker connects to the same queue name to process them.
export const botPipelineQueue = new Queue(QUEUE_NAMES.BOT_PIPELINE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
})
