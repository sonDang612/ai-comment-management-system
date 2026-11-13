import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { ValidationException } from '../errors/app.exception.js';

export interface ValidationIssue {
  field: string;
  rule: string;
  message: string;
}

function toIssues(errors: ValidationError[], parentPath = ''): ValidationIssue[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(([rule, message]) => ({ field, rule, message }));
    return [...own, ...toIssues(error.children ?? [], field)];
  });
}

export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const issues = toIssues(errors);
        return new ValidationException(issues[0]?.message ?? 'Request validation failed', issues);
      },
    });
  }
}
