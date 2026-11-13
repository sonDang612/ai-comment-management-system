import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Env } from '../../config/env.js';
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Prisma client (driver adapter: node-postgres). Connects lazily on first query so the API
 * can start, and report "degraded" health, even while the database is down.
 *
 * Schema changes go through `prisma migrate` only (see prisma/schema.prisma).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    const url = new URL(config.get('DATABASE_URL', { infer: true }));
    // node-postgres ignores Prisma's `?schema=` param, so pass it as the adapter's schema.
    const schema = url.searchParams.get('schema') ?? undefined;
    url.searchParams.delete('schema');
    super({ adapter: new PrismaPg({ connectionString: url.toString() }, { schema }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
