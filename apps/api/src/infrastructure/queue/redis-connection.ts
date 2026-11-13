import type { ConnectionOptions } from 'bullmq';

/** BullMQ connection options from a `redis://user:pass@host:port/db` URL. */
export function bullConnectionFromUrl(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number(url.pathname.replace('/', '') || 0),
    tls: url.protocol === 'rediss:' ? {} : undefined,
    // Required by BullMQ for blocking connections used by workers/queue events.
    maxRetriesPerRequest: null,
  };
}
