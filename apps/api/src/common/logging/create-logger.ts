import { ConsoleLogger, type LogLevel as NestLogLevel } from '@nestjs/common';
import type { LogFormat, LogLevel } from '../../config/env.js';

const ORDER: NestLogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];

/** Built-in Nest logger: human-readable text locally, one JSON object per line in prod. */
export function createLogger(level: LogLevel, format: LogFormat): ConsoleLogger {
  return new ConsoleLogger({
    json: format === 'json',
    colors: format === 'text' && process.stdout.isTTY,
    prefix: 'acms-api',
    logLevels: ORDER.slice(ORDER.indexOf(level)),
  });
}
