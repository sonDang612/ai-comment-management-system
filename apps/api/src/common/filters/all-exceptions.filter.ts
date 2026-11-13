import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type ApiErrorBody, ErrorCode } from '@acms/shared';
import type { Response } from 'express';
import { RequestContext } from '../context/request-context.js';
import { AppException } from '../errors/app.exception.js';
import { Prisma } from '../../generated/prisma/client.js';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  422: ErrorCode.VALIDATION_ERROR,
  429: ErrorCode.RATE_LIMITED,
  503: ErrorCode.SERVICE_UNAVAILABLE,
};

interface NormalizedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Single place where errors become HTTP responses. Every non-2xx response uses the
 * `ApiErrorBody` envelope from @acms/shared, carrying the request id.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const error = this.normalize(exception);

    if (error.status >= 500) {
      this.logger.error(
        `${error.code}: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
        request_id: RequestContext.requestId() ?? null,
      },
    };
    response.status(error.status).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof AppException) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      // Nest's built-in exceptions use { message: string | string[] } (e.g. ValidationPipe).
      const message = typeof res === 'object' && res !== null && 'message' in res ? res.message : res;
      return {
        status,
        code: STATUS_TO_CODE[status] ?? (status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST),
        message: Array.isArray(message) ? 'Request validation failed' : String(message),
        details: Array.isArray(message) ? message : undefined,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return { status: HttpStatus.CONFLICT, code: ErrorCode.CONFLICT, message: 'Resource already exists' };
      }
      if (exception.code === 'P2025') {
        return { status: HttpStatus.NOT_FOUND, code: ErrorCode.NOT_FOUND, message: 'Resource not found' };
      }
    }

    // Unknown error: log everything, reveal nothing.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    };
  }
}
