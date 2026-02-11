/**
 * Queue Worker
 * 
 * Processes jobs from the queue.
 * Handles async database writes.
 */

import { Worker, Job } from 'bullmq';
import { redisConfig } from '@/config/redis.config.js';
import { QueueName, JobType, DatabaseWriteJob } from './job-types.js';
import { prisma } from '@/infrastructure/database/client.js';
import { BalanceSnapshotService } from '@/domain/balances/balance-snapshot.service.js';
import { BalanceSnapshotRepository } from '@/infrastructure/database/repositories/balance-snapshot.repository.js';

export class QueueWorker {
  private static instance: QueueWorker;
  private workers: Map<string, Worker> = new Map();
  private balanceSnapshotService: BalanceSnapshotService;

  private constructor() {
    // Initialize balance snapshot service with repository
    const balanceSnapshotRepo = new BalanceSnapshotRepository();
    this.balanceSnapshotService = new BalanceSnapshotService(balanceSnapshotRepo);
  }

  public static getInstance(): QueueWorker {
    if (!QueueWorker.instance) {
      QueueWorker.instance = new QueueWorker();
    }
    return QueueWorker.instance;
  }

  /**
   * Initialize workers
   */
  public initialize(): void {
    this.createWorker(QueueName.DATABASE_WRITES, this.processDatabaseWriteJob.bind(this));
    console.log('✅ Queue workers initialized');
  }

  /**
   * Create a new worker
   */
  private createWorker(queueName: QueueName, processor: (job: Job) => Promise<void>): void {
    if (this.workers.has(queueName)) {
      return;
    }

    const worker = new Worker(queueName, processor, {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
      },
      concurrency: 5, // Process 5 jobs concurrently
    });

    worker.on('completed', (_job) => {
      // console.log(`Job ${_job.id} completed in queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed in queue ${queueName}:`, err);
    });

    this.workers.set(queueName, worker);
  }

  /**
   * Process database write jobs
   */
  private async processDatabaseWriteJob(job: Job<DatabaseWriteJob>): Promise<void> {
    const { type } = job.data;

    try {
      switch (type) {
        case JobType.WRITE_TRANSACTION:
          // Use upsert to handle cases where transaction was already written synchronously
          // This prevents unique constraint errors when both sync and async writes occur
          await prisma.agentTransaction.upsert({
            where: { id: job.data.data.id },
            update: {}, // No update needed if it exists
            create: job.data.data,
          });
          break;

        case JobType.WRITE_HISTORICAL_SWAP:
          await prisma.agentHistoricalSwap.create({ data: job.data.data });
          break;

        case JobType.CAPTURE_BALANCE_SNAPSHOT: {
          const snapshotJob = job.data as Extract<DatabaseWriteJob, { type: JobType.CAPTURE_BALANCE_SNAPSHOT }>;
          
          if (snapshotJob.agentId && snapshotJob.walletAddress) {
            // Snapshot single agent and wallet
            const result = await this.balanceSnapshotService.captureSnapshot(snapshotJob.agentId, snapshotJob.walletAddress);
            if (!result.success) {
              throw new Error(`Failed to capture snapshot for agent ${snapshotJob.agentId} wallet ${snapshotJob.walletAddress}: ${result.error}`);
            }
          } else {
            // Snapshot all agents and their wallets
            const result = await this.balanceSnapshotService.captureSnapshotsForAllAgents();
            if (result.failed > 0) {
              console.warn(`Balance snapshot job completed with ${result.failed} failures:`, result.errors);
              // Don't throw - some failures are acceptable, log and continue
            }
          }
          break;
        }

        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      console.error(`Failed to process job ${type}:`, error);
      throw error; // Retry
    }
  }

  /**
   * Close all workers
   */
  public async closeAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    this.workers.forEach((worker) => {
      promises.push(worker.close());
    });
    await Promise.all(promises);
    this.workers.clear();
    console.log('✅ All workers closed');
  }
}

export const queueWorker = QueueWorker.getInstance();

