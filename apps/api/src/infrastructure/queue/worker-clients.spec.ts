import { countWorkerClients } from './worker-clients.js';

const list = [
  // Python worker A: two connections, same name
  'id=1 addr=10.0.0.5:1 name=bull:ai-jobs:w:acms-worker-a-1 db=0 cmd=evalsha',
  'id=2 addr=10.0.0.5:2 name=bull:ai-jobs:w:acms-worker-a-1 db=0 cmd=bzpopmin',
  // Python worker B
  'id=3 addr=10.0.0.6:1 name=bull:ai-jobs:w:acms-worker-b-1 db=0 cmd=bzpopmin',
  // Node-style worker name (base64 queue name)
  'id=4 addr=10.0.0.7:1 name=bull:YWktam9icw==:w:node-worker db=0 cmd=bzpopmin',
  // Not workers: queue events, unnamed, other queue
  'id=5 addr=10.0.0.8:1 name=bull:YWktam9icw==:qe db=0 cmd=xread',
  'id=6 addr=10.0.0.8:2 name= db=0 cmd=ping',
  'id=7 addr=10.0.0.9:1 name=bull:other:w:x db=0 cmd=bzpopmin',
].join('\n');

describe('countWorkerClients', () => {
  it('counts distinct worker names for the queue, in both naming forms', () => {
    expect(countWorkerClients(list, 'bull', 'ai-jobs')).toBe(3);
  });

  it('returns 0 when no worker is connected', () => {
    expect(countWorkerClients('id=1 name= cmd=ping\n', 'bull', 'ai-jobs')).toBe(0);
  });
});
