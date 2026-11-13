import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QueueName } from '@acms/shared';

/**
 * Result channel from the Python worker: BullMQ stores each job's return value and emits
 * `completed` / `failed` events through Redis. Business modules will persist results here
 * (or via an event emitter) once AI features exist.
 */
@QueueEventsListener(QueueName.AI_JOBS)
export class AiJobsEvents extends QueueEventsHost {
  private readonly logger = new Logger(AiJobsEvents.name);

  @OnQueueEvent('completed')
  onCompleted({ jobId, returnvalue }: { jobId: string; returnvalue: unknown }): void {
    this.logger.log(`Job ${jobId} completed: ${JSON.stringify(returnvalue)}`);
  }

  @OnQueueEvent('failed')
  onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }): void {
    this.logger.warn(`Job ${jobId} failed: ${failedReason}`);
  }
}
