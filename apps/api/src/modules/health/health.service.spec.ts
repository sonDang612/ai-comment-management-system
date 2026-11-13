import { Logger } from '@nestjs/common';
import { HealthService, type Probe } from './health.service.js';

beforeAll(() => {
  Logger.overrideLogger(false);
});

function makeService(): HealthService {
  const config = {
    get: (key: string) => ({ APP_VERSION: '9.9.9', APP_ENV: 'test' })[key],
  };
  // Probes are injected per call, so the dependencies are never touched.
  return new HealthService(config as never, {} as never, {} as never, {} as never, {} as never);
}

describe('HealthService.check', () => {
  it('is ok when every probe passes, and keeps probe details', async () => {
    const probes: Record<string, Probe> = {
      database: async () => undefined,
      worker: async () => ({ workers: 2 }),
    };
    const result = await makeService().check(probes);

    expect(result).toMatchObject({
      status: 'ok',
      service: 'acms-api',
      version: '9.9.9',
      environment: 'test',
    });
    expect(Object.keys(result.checks)).toEqual(['database', 'worker']);
    expect(result.checks['worker']).toMatchObject({ status: 'ok', details: { workers: 2 } });
    expect(result.checks['database']!.latency_ms).toEqual(expect.any(Number));
  });

  it('is degraded when a probe fails, without failing the others', async () => {
    const result = await makeService().check({
      database: async () => undefined,
      redis: async () => {
        throw new Error('ECONNREFUSED');
      },
    });

    expect(result.status).toBe('degraded');
    expect(result.checks['database']!.status).toBe('ok');
    expect(result.checks['redis']).toEqual({ status: 'error', latency_ms: null, error: 'ECONNREFUSED' });
  });

  it('times out a hanging probe', async () => {
    vi.useFakeTimers();
    try {
      const pending = makeService().check({ slow: () => new Promise(() => {}) });
      await vi.advanceTimersByTimeAsync(2_000);
      const result = await pending;
      expect(result.checks['slow']).toMatchObject({ status: 'error', error: 'timeout' });
    } finally {
      vi.useRealTimers();
    }
  });
});
