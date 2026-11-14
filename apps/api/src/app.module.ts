import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { RequestContextMiddleware } from './common/context/request-context.middleware.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';
import { AppValidationPipe } from './common/pipes/app-validation.pipe.js';
import { validateEnv } from './config/env.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { QueueModule } from './infrastructure/queue/queue.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { VllmModule } from './infrastructure/vllm/vllm.module.js';
import { CommentsModule } from './modules/comments/comments.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { RuleSettingsModule } from './modules/rule-settings/rule-settings.module.js';

@Module({
  imports: [
    // Global, validated configuration (apps/api/.env locally; real env vars take precedence).
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    // Infrastructure (global providers)
    PrismaModule,
    RedisModule,
    QueueModule,
    VllmModule,
    // Feature modules
    HealthModule,
    CommentsModule,
    RuleSettingsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_PIPE, useClass: AppValidationPipe },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*path');
  }
}
