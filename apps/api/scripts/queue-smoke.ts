/**
 * End-to-end queue check: enqueues `system.ping` on the AI jobs queue and waits for the
 * Python worker (apps/ai, `acms_ai.worker`) to return the result through BullMQ.
 *
 *   npm run queue:smoke --workspace @acms/api        # needs Redis + a running worker
 *
 * Runs with Node's built-in TypeScript support (erasable syntax only, no decorators).
 */
import { AiJobName, type AiJobResults, QueueName } from '@acms/shared';
import { Queue, QueueEvents } from 'bullmq';
import { bullConnectionFromUrl } from '../src/infrastructure/queue/redis-connection.ts';
import { countWorkerClients } from '../src/infrastructure/queue/worker-clients.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // no .env file: rely on the real environment
}

const TIMEOUT_MS = 15_000;
const connection = bullConnectionFromUrl(process.env['REDIS_URL'] ?? 'redis://localhost:6379/0');
const queue = new Queue(QueueName.AI_JOBS, { connection, prefix: 'bull' });
const events = new QueueEvents(QueueName.AI_JOBS, { connection, prefix: 'bull' });

let exitCode = 0;
try {
  await events.waitUntilReady();
  const clientList = await (await queue.backend.client).clientList();
  const workers = countWorkerClients(clientList, 'bull', QueueName.AI_JOBS);
  console.log(`Workers connected to '${QueueName.AI_JOBS}': ${workers}`);

  const echo = `smoke-${Date.now()}`;
  const job = await queue.add(AiJobName.SYSTEM_PING, { echo }, { attempts: 1, removeOnComplete: { age: 60 }, removeOnFail: { age: 60 } });
  console.log(`Enqueued ${AiJobName.SYSTEM_PING} (job ${job.id}), waiting up to ${TIMEOUT_MS / 1000}s...`);

  const result = (await job.waitUntilFinished(events, TIMEOUT_MS)) as AiJobResults['system.ping'];
  if (result?.pong !== true || result.echo !== echo) {
    throw new Error(`Unexpected result: ${JSON.stringify(result)}`);
  }
  console.log('OK', result);
} catch (error) {
  console.error('FAILED:', error instanceof Error ? error.message : error);
  exitCode = 1;
} finally {
  await Promise.allSettled([events.close(), queue.close()]);
}
process.exit(exitCode);
