/**
 * Counts BullMQ workers of a queue from Redis `CLIENT LIST` output.
 *
 * `Queue.getWorkers()` is not enough here: Node BullMQ names worker connections
 * `<prefix>:<base64(queue)>:w:<name>`, while the Python BullMQ worker (apps/ai) uses
 * `<prefix>:<queue>:w:<name>`. Both forms are accepted. A worker may hold several connections
 * with the same name, so workers are counted by distinct name (the Python worker makes its
 * name unique per process).
 */
export function countWorkerClients(clientList: string, prefix: string, queueName: string): number {
  const markers = [
    `${prefix}:${queueName}:w:`,
    `${prefix}:${Buffer.from(queueName).toString('base64')}:w:`,
  ];
  const names = new Set<string>();
  for (const line of clientList.split('\n')) {
    const name = /(?:^|\s)name=(\S+)/.exec(line)?.[1];
    if (name && markers.some((marker) => name.startsWith(marker))) names.add(name);
  }
  return names.size;
}
