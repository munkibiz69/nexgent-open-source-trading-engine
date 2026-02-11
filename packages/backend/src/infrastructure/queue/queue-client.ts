/**
 * Queue Client
 * 
 * Manages connection to BullMQ queues.
 */

import { Queue, QueueOptions } from 'bullmq';
import { redisConfig } from '@/config/redis.config.js';
import { QueueName } from './job-types.js';

export class QueueClient {
  private static instance: QueueClient;
  private queues: Map<string, Queue> = new Map();

  private constructor() {}

  public static getInstance(): QueueClient {
    if (!QueueClient.instance) {
      QueueClient.instance = new QueueClient();
    }
    return QueueClient.instance;
  }

  /**
   * Get or create a queue instance
   */
  public getQueue(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      const queueConfig: QueueOptions = {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 1000, // Keep last 1000 completed jobs
          removeOnFail: 5000,     // Keep last 5000 failed jobs for inspection
        },
      };

      const queue = new Queue(name, queueConfig);
      this.queues.set(name, queue);
      
      console.log(`✅ Queue initialized: ${name}`);
    }

    return this.queues.get(name)!;
  }

  /**
   * Close all queues
   */
  public async closeAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.queues.forEach((queue) => {
      promises.push(queue.close());
    });
    await Promise.all(promises);
    this.queues.clear();
    console.log('✅ All queues closed');
  }
}

export const queueClient = QueueClient.getInstance();

