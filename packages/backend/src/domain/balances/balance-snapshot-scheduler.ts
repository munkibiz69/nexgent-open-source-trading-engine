/**
 * Balance Snapshot Scheduler
 * 
 * Schedules hourly balance snapshot jobs using BullMQ.
 */

import { queueClient } from '@/infrastructure/queue/queue-client.js';
import { QueueName, JobType, type CaptureBalanceSnapshotJob } from '@/infrastructure/queue/job-types.js';

export class BalanceSnapshotScheduler {
  private static instance: BalanceSnapshotScheduler;

  private constructor() {}

  public static getInstance(): BalanceSnapshotScheduler {
    if (!BalanceSnapshotScheduler.instance) {
      BalanceSnapshotScheduler.instance = new BalanceSnapshotScheduler();
    }
    return BalanceSnapshotScheduler.instance;
  }

  /**
   * Start the recurring balance snapshot job
   * 
   * Schedules a job to run every hour at minute 0 (e.g., 1:00, 2:00, 3:00)
   */
  public async start(): Promise<void> {
    const queue = queueClient.getQueue(QueueName.DATABASE_WRITES);

    // Schedule recurring job: runs every hour
    // BullMQ will ensure it runs at the top of each hour (minute 0)
    await queue.add(
      'capture-balance-snapshot',
      {
        type: JobType.CAPTURE_BALANCE_SNAPSHOT,
        // No agentId: snapshot all agents
      } as CaptureBalanceSnapshotJob,
      {
        repeat: {
          every: 60 * 60 * 1000, // Every hour (in milliseconds)
          // BullMQ will schedule jobs at the top of each hour automatically
        },
        jobId: 'balance-snapshot-recurring', // Fixed job ID prevents duplicates
      }
    );

    console.log('✅ Balance snapshot scheduler started (runs every hour)');
  }

  /**
   * Manually trigger a balance snapshot for all agents (for testing)
   */
  public async triggerSnapshot(agentId?: string): Promise<void> {
    const queue = queueClient.getQueue(QueueName.DATABASE_WRITES);

    await queue.add(
      'capture-balance-snapshot-manual',
      {
        type: JobType.CAPTURE_BALANCE_SNAPSHOT,
        agentId,
      } as CaptureBalanceSnapshotJob,
      {
        // No repeat option for manual triggers
      }
    );

    console.log(`✅ Manual balance snapshot triggered${agentId ? ` for agent ${agentId}` : ' for all agents'}`);
  }
}

export const balanceSnapshotScheduler = BalanceSnapshotScheduler.getInstance();
