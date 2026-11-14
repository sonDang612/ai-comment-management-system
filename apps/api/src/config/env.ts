/**
 * Environment schema for the API. Validated once at startup by ConfigModule; the app refuses
 * to boot with a readable list of every invalid variable.
 *
 * Use it as `ConfigService<Env, true>` and `config.get('PORT', { infer: true })`.
 */

const APP_ENVS = ['local', 'test', 'development', 'staging', 'production'] as const;
const LOG_LEVELS = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'] as const;
const LOG_FORMATS = ['text', 'json'] as const;
const AI_ANALYZERS = ['vllm', 'stub'] as const;
const STUB_ANALYZER_ENVS: readonly AppEnv[] = ['local', 'test', 'development'];

export type AppEnv = (typeof APP_ENVS)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LogFormat = (typeof LOG_FORMATS)[number];
export type AiAnalyzer = (typeof AI_ANALYZERS)[number];

export interface Env {
  APP_ENV: AppEnv;
  APP_VERSION: string;
  PORT: number;
  CORS_ORIGINS: string[];
  LOG_LEVEL: LogLevel;
  LOG_FORMAT: LogFormat;
  DATABASE_URL: string;
  REDIS_URL: string;
  AI_ANALYZER: AiAnalyzer;
  AI_CONFIDENCE_THRESHOLD: number;
  VLLM_URL: string;
  VLLM_MODEL: string;
  VLLM_API_KEY: string;
  VLLM_TIMEOUT_MS: number;
}

type Raw = Record<string, unknown>;

class EnvReader {
  readonly errors: string[] = [];
  constructor(private readonly raw: Raw) {}

  string(key: string, fallback?: string): string {
    const value = this.raw[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (fallback !== undefined) return fallback;
    this.errors.push(`${key} is required`);
    return '';
  }

  int(key: string, fallback: number): number {
    const value = this.raw[key];
    if (value === undefined || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      this.errors.push(`${key} must be a non-negative integer`);
    }
    return parsed;
  }

  number(key: string, fallback: number, min: number, max: number): number {
    const value = this.raw[key];
    if (value === undefined || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      this.errors.push(`${key} must be a number between ${min} and ${max}`);
    }
    return parsed;
  }

  oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    const value = this.string(key, fallback);
    if (!allowed.includes(value as T)) {
      this.errors.push(`${key} must be one of: ${allowed.join(', ')}`);
    }
    return value as T;
  }

  url(key: string, protocols: string[], fallback?: string): string {
    const value = this.string(key, fallback);
    if (!value) return value;
    try {
      const { protocol } = new URL(value);
      if (!protocols.includes(protocol)) {
        this.errors.push(`${key} must use one of: ${protocols.join(', ')}`);
      }
    } catch {
      this.errors.push(`${key} must be a valid URL`);
    }
    return value;
  }
}

export function validateEnv(raw: Raw): Env {
  const env = new EnvReader(raw);
  const result: Env = {
    APP_ENV: env.oneOf('APP_ENV', APP_ENVS, 'local'),
    APP_VERSION: env.string('APP_VERSION', '0.1.0'),
    PORT: env.int('PORT', 4000),
    CORS_ORIGINS: env
      .string('CORS_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    LOG_LEVEL: env.oneOf('LOG_LEVEL', LOG_LEVELS, 'log'),
    LOG_FORMAT: env.oneOf('LOG_FORMAT', LOG_FORMATS, 'text'),
    DATABASE_URL: env.url('DATABASE_URL', ['postgresql:', 'postgres:']),
    REDIS_URL: env.url('REDIS_URL', ['redis:', 'rediss:'], 'redis://localhost:6379/0'),
    AI_ANALYZER: env.oneOf('AI_ANALYZER', AI_ANALYZERS, 'vllm'),
    AI_CONFIDENCE_THRESHOLD: env.number('AI_CONFIDENCE_THRESHOLD', 0.85, 0, 1),
    VLLM_URL: env.url('VLLM_URL', ['http:', 'https:'], 'http://localhost:8000'),
    VLLM_MODEL: env.string('VLLM_MODEL', 'acms-moderation'),
    VLLM_API_KEY: env.string('VLLM_API_KEY', ''),
    VLLM_TIMEOUT_MS: env.int('VLLM_TIMEOUT_MS', 30_000),
  };
  if (result.AI_ANALYZER === 'stub' && !STUB_ANALYZER_ENVS.includes(result.APP_ENV)) {
    env.errors.push(`AI_ANALYZER=stub is only allowed when APP_ENV is ${STUB_ANALYZER_ENVS.join(', ')}`);
  }
  if (env.errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${env.errors.join('\n  - ')}`);
  }
  return result;
}
