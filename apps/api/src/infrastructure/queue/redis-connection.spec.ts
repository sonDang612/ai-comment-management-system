import { bullConnectionFromUrl } from './redis-connection.js';

describe('bullConnectionFromUrl', () => {
  it('parses host, port and db', () => {
    expect(bullConnectionFromUrl('redis://localhost:6380/3')).toMatchObject({
      host: 'localhost',
      port: 6380,
      db: 3,
      tls: undefined,
      maxRetriesPerRequest: null,
    });
  });

  it('defaults port and db, decodes credentials and enables TLS for rediss', () => {
    expect(bullConnectionFromUrl('rediss://user:p%40ss@cache.internal')).toMatchObject({
      host: 'cache.internal',
      port: 6379,
      db: 0,
      username: 'user',
      password: 'p@ss',
      tls: {},
    });
  });
});
