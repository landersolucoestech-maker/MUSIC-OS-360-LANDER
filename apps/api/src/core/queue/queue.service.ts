import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  MAIL: 'mail',
  REPORTS: 'reports',
  INTEGRATIONS: 'integrations',
  MONITORING: 'monitoring',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private notificationsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MAIL) private mailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.REPORTS) private reportsQueue: Queue,
  ) {}

  async addNotification(data: Record<string, unknown>, opts?: JobsOptions) {
    return this.notificationsQueue.add('send', data, opts);
  }

  async addMail(data: Record<string, unknown>, opts?: JobsOptions) {
    return this.mailQueue.add('send', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, ...opts });
  }

  async addReport(type: string, data: Record<string, unknown>, opts?: JobsOptions) {
    return this.reportsQueue.add(type, data, { attempts: 2, ...opts });
  }

  async getQueueStats(queueName: QueueName) {
    const queues: Record<QueueName, Queue> = {
      notifications: this.notificationsQueue,
      mail: this.mailQueue,
      reports: this.reportsQueue,
      integrations: this.notificationsQueue, // placeholder
      monitoring: this.notificationsQueue,   // placeholder
    };
    const q = queues[queueName];
    const [waiting, active, completed, failed] = await Promise.all([
      q.getWaitingCount(),
      q.getActiveCount(),
      q.getCompletedCount(),
      q.getFailedCount(),
    ]);
    return { queueName, waiting, active, completed, failed };
  }
}
