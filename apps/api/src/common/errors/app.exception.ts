import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@acms/shared';

/**
 * Base class for expected, client-facing errors. Throw a subclass from services; the global
 * `AllExceptionsFilter` turns it into the standard error envelope.
 */
export class AppException extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestException extends AppException {
  constructor(message = 'Bad request', details?: unknown) {
    super(HttpStatus.BAD_REQUEST, ErrorCode.BAD_REQUEST, message, details);
  }
}

export class ValidationException extends AppException {
  constructor(message = 'Request validation failed', details?: unknown) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication required', details?: unknown) {
    super(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, message, details);
  }
}

export class ForbiddenException extends AppException {
  constructor(message = 'Permission denied', details?: unknown) {
    super(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, message, details);
  }
}

export class NotFoundException extends AppException {
  constructor(message = 'Resource not found', details?: unknown) {
    super(HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND, message, details);
  }
}

export class ConflictException extends AppException {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(HttpStatus.CONFLICT, ErrorCode.CONFLICT, message, details);
  }
}

export class ServiceUnavailableException extends AppException {
  constructor(message = 'Service temporarily unavailable', details?: unknown) {
    super(HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.SERVICE_UNAVAILABLE, message, details);
  }
}
