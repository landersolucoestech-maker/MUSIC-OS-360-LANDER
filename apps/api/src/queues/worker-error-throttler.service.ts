import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { WorkerHost } from '@nestjs/bullmq';
import { Queue, Worker, QueueEvents } from 'bullmq';

const THROTTLE_MS = 30_000;
const NETWORK_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EPIPE', 'ETIMEDOUT']);

interface ErrorEmitter {
  on(event: 'error', listener: (err: Error) => void): unknown;
  name?: string;
}

@Injectable()
export class WorkerErrorThrottlerService implements OnApplicationBootstrap {
  private readonly logger = new Logger('BullMQ');
  private lastCode = '';
  private lastLogAt = 0;

  constructor(private readonly discovery: DiscoveryService) {}

  onApplicationBootstrap(): void {
    const attached = new WeakSet<object>();
    const visit = (label: string, emitter: ErrorEmitter | null | undefined) => {
      if (!emitter || typeof emitter.on !== 'function') return;
      if (attached.has(emitter as object)) return;
      attached.add(emitter as object);
      emitter.on('error', (err: Error) => this.handle(label, err));
    };

    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      if (!instance || typeof instance !== 'object') continue;

      if (instance instanceof WorkerHost) {
        const w = (instance as WorkerHost).worker;
        visit(`Worker(${w?.name ?? 'unknown'})`, w as unknown as ErrorEmitter);
      }

      if (instance instanceof Queue) {
        visit(`Queue(${(instance as Queue).name})`, instance as unknown as ErrorEmitter);
      }

      if (instance instanceof Worker) {
        visit(`Worker(${(instance as Worker).name})`, instance as unknown as ErrorEmitter);
      }

      if (instance instanceof QueueEvents) {
        visit(`QueueEvents(${(instance as QueueEvents).name})`, instance as unknown as ErrorEmitter);
      }
    }
  }

  private handle(label: string, err: Error): void {
    const errno = err as NodeJS.ErrnoException;
    const code = errno.code ?? err.name ?? 'UNKNOWN';
    const isNetwork = NETWORK_CODES.has(code);
    const now = Date.now();
    if (isNetwork && code === this.lastCode && now - this.lastLogAt < THROTTLE_MS) return;
    this.lastCode = code;
    this.lastLogAt = now;
    const firstLine = (err.message ?? String(err)).split('\n')[0];
    this.logger.warn(`${label} ${code}: ${firstLine}`);
  }
}
