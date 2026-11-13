import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '@acms/shared';
import type { Env } from '../../config/env.js';
import { AiJobsEvents } from './ai-jobs.events.js';
import { AiJobsProducer } from './ai-jobs.producer.js';
import { bullConnectionFromUrl } from './redis-connection.js';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: bullConnectionFromUrl(config.get('REDIS_URL', { infer: true })),
        // Must match QUEUE_PREFIX in the Python worker.
        prefix: 'bull',
      }),
    }),
    BullModule.registerQueue({
      name: QueueName.AI_JOBS,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: { age: 24 * 3600, count: 1_000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    }),
  ],
  providers: [AiJobsProducer, AiJobsEvents],
  exports: [AiJobsProducer],
})
export class QueueModule {}
