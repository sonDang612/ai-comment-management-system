import { validateEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://acms:acms@localhost:5432/acms?schema=app',
  AI_SERVICE_TOKEN: 'secret',
};

describe('validateEnv', () => {
  it('applies defaults', () => {
    const env = validateEnv(base);
    expect(env).toMatchObject({
      APP_ENV: 'local',
      PORT: 4000,
      LOG_LEVEL: 'log',
      LOG_FORMAT: 'text',
      REDIS_URL: 'redis://localhost:6379/0',
      AI_SERVICE_URL: 'http://localhost:8000',
      AI_SERVICE_TIMEOUT_MS: 10_000,
      CORS_ORIGINS: ['http://localhost:3000'],
    });
  });

  it('parses comma-separated CORS origins and integers', () => {
    const env = validateEnv({ ...base, CORS_ORIGINS: 'http://a.test, http://b.test,', PORT: '5000' });
    expect(env.CORS_ORIGINS).toEqual(['http://a.test', 'http://b.test']);
    expect(env.PORT).toBe(5000);
  });

  it('reports every invalid variable at once', () => {
    const run = () =>
      validateEnv({
        DATABASE_URL: 'postgresql+asyncpg://x@y/z',
        APP_ENV: 'prod',
        PORT: 'abc',
        REDIS_URL: 'not a url',
      });
    expect(run).toThrowError(/^Invalid environment configuration/);
    for (const message of [
      'DATABASE_URL must use one of',
      'APP_ENV must be one of',
      'PORT must be a non-negative integer',
      'REDIS_URL must be a valid URL',
      'AI_SERVICE_TOKEN is required',
    ]) {
      expect(run).toThrowError(message);
    }
  });
});
