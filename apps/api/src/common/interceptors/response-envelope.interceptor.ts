import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { type ApiResponse, SUCCESS_MESSAGE } from '@acms/shared';
import type { Response } from 'express';
import { STATUS_CODES } from 'node:http';
import { map, type Observable } from 'rxjs';

const FIRST_ERROR_STATUS = 400;

function successResponse<T>(status: number, data: T): ApiResponse<T> {
  return {
    code: status,
    message: status < FIRST_ERROR_STATUS ? SUCCESS_MESSAGE : (STATUS_CODES[status] ?? 'Error'),
    data,
    timestamp: new Date().toISOString(),
  };
}

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiResponse<T | null>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T | null>> {
    if (context.getType() !== 'http') return next.handle() as Observable<ApiResponse<T | null>>;
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(map((data) => successResponse(response.statusCode, data ?? null)));
  }
}
