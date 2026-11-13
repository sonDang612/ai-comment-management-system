import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { type AiJobName, type AiJobPayloads, QueueName } from '@acms/shared';
import type { JobsOptions, Queue } from 'bullmq';
import { RequestContext } from '../../common/context/request-context.js';
import { countWorkerClients } from './worker-clients.js';

/**
 * Publishes AI jobs for the Python worker (apps/ai, `acms_ai.worker`). Job names and payloads
 * are the contract defined in @acms/shared `jobs.ts`.
 */
@Injectable()
export class AiJobsProducer {
  private readonly logger = new Logger(AiJobsProducer.name);

  constructor(@InjectQueue(QueueName.AI_JOBS) private readonly queue: Queue) {}

  async enqueue<N extends AiJobName>(
    name: N,
    data: AiJobPayloads[N],
    opts?: JobsOptions,
  ): Promise<string> {
    // The request id travels with the job so worker logs can be correlated.
    const payload = { ...data, request_id: RequestContext.requestId() ?? null };
    const job = await this.queue.add(name, payload, opts);
    this.logger.log(`Enqueued ${name} (job ${job.id})`);
    return job.id!;
  }

  /** Number of workers currently connected to the queue (used by health checks). */
  async workerCount(): Promise<number> {
    const client = await this.queue.backend.client;
    const clientList = await client.clientList();
    return countWorkerClients(clientList, this.queue.opts.prefix ?? 'bull', this.queue.name);
  }
}
