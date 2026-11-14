import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ComponentHealth, HealthResponse } from '@acms/shared';
import type { Redis } from 'ioredis';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { AiJobsProducer } from '../../infrastructure/queue/ai-jobs.producer.js';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module.js';
import { COMMENT_ANALYZER, type CommentAnalyzer } from '../moderation/analysis/comment-analyzer.js';

/** A probe resolves (optionally with details) when healthy and throws otherwise. */
export type Probe = () => Promise<Record<string, unknown> | void>;

const PROBE_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(COMMENT_ANALYZER) private readonly analyzer: CommentAnalyzer,
    private readonly aiJobs: AiJobsProducer,
  ) {}

  /** Dependencies checked by readiness. Order is the order shown in the response. */
  probes(): Record<string, Probe> {
    return {
      database: async () => {
        await this.prisma.$queryRaw`SELECT 1`;
      },
      redis: async () => {
        await this.redis.ping();
      },
      ai_service: () => this.analyzer.health(PROBE_TIMEOUT_MS),
      worker: async () => {
        const workers = await this.aiJobs.workerCount();
        if (workers === 0) throw new Error('No workers connected to the AI jobs queue');
        return { workers };
      },
    };
  }

  async check(probes: Record<string, Probe> = this.probes()): Promise<HealthResponse> {
    const names = Object.keys(probes);
    const results = await Promise.all(names.map((name) => this.run(name, probes[name]!)));
    const checks = Object.fromEntries(names.map((name, i) => [name, results[i]!]));
    return {
      status: results.every((r) => r.status === 'ok') ? 'ok' : 'degraded',
      service: 'acms-api',
      version: this.config.get('APP_VERSION', { infer: true }),
      environment: this.config.get('APP_ENV', { infer: true }),
      checks,
    };
  }

  private async run(name: string, probe: Probe): Promise<ComponentHealth> {
    const start = performance.now();
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), PROBE_TIMEOUT_MS);
      });
      const details = await Promise.race([probe(), timeout]);
      return {
        status: 'ok',
        latency_ms: Math.round((performance.now() - start) * 100) / 100,
        ...(details ? { details } : {}),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Health check '${name}' failed: ${message}`);
      return { status: 'error', latency_ms: null, error: message };
    } finally {
      clearTimeout(timer);
    }
  }
}
