/**
 * Background job contracts between the NestJS producer (apps/api) and the Python
 * BullMQ consumer (apps/ai). Python mirrors these names in `acms_ai/worker/jobs/`.
 * Changing a name or payload is a breaking change for both sides.
 */

export const QueueName = {
  /** AI processing jobs, consumed by apps/ai (`acms_ai.worker`). */
  AI_JOBS: 'ai-jobs',
} as const;
export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const AiJobName = {
  /** Infrastructure round-trip check. */
  SYSTEM_PING: 'system.ping',
} as const;
export type AiJobName = (typeof AiJobName)[keyof typeof AiJobName];

export interface AiJobPayloads {
  [AiJobName.SYSTEM_PING]: { echo?: string };
}

export interface AiJobResults {
  [AiJobName.SYSTEM_PING]: { pong: true; echo: string | null; processed_at: string };
}
