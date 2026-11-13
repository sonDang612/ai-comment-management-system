import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { API_V1_PREFIX, APP_TIME_ZONE } from '@acms/shared';
import { AppModule } from './app.module.js';
import { REQUEST_ID_HEADER } from './common/context/request-context.js';
import { createLogger } from './common/logging/create-logger.js';
import type { Env } from './config/env.js';

// The project runs on UTC+8 regardless of the host's zone (local logs, `Date` local getters).
// Instants are still stored and sent in UTC; see @acms/shared `time.ts`.
process.env.TZ = APP_TIME_ZONE;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.useLogger(
    createLogger(config.get('LOG_LEVEL', { infer: true }), config.get('LOG_FORMAT', { infer: true })),
  );

  app.setGlobalPrefix(API_V1_PREFIX.replace(/^\//, ''));
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER],
  });
  app.enableShutdownHooks();

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `acms-api v${config.get('APP_VERSION', { infer: true })} listening on :${port} (${config.get('APP_ENV', { infer: true })})`,
    'Bootstrap',
  );
}

await bootstrap();
