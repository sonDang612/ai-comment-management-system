/**
 * HTTP-level behaviour shared by every route: request ids, the error envelope and the
 * health endpoints' status codes. Uses a real Nest app with stubbed dependencies.
 */
import { Controller, Get, Inject, type INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ErrorCode, type HealthResponse } from '@acms/shared';
import request from 'supertest';
import { HealthController } from '../modules/health/health.controller.js';
import { HealthService } from '../modules/health/health.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { REQUEST_ID_HEADER } from './context/request-context.js';
import { RequestContextMiddleware } from './context/request-context.middleware.js';
import { NotFoundException } from './errors/app.exception.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';

@Controller('test')
class ThrowingController {
  @Get('not-found')
  notFound(): never {
    throw new NotFoundException('Comment not found', { id: 1 });
  }

  @Get('crash')
  crash(): never {
    throw new Error('secret internals');
  }

  @Get('duplicate')
  duplicate(): never {
    throw new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: 'test',
    });
  }
}

const healthy: HealthResponse = {
  status: 'ok',
  service: 'acms-api',
  version: '0.0.0',
  environment: 'test',
  checks: {},
};

describe('HTTP conventions', () => {
  let app: INestApplication;
  const check = vi.fn<() => Promise<HealthResponse>>();

  beforeAll(async () => {
    // Explicit @Inject: the test transformer does not emit decorator type metadata.
    Inject(HealthService)(HealthController, undefined, 0);
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, ThrowingController],
      providers: [
        { provide: HealthService, useValue: { check } },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    const middleware = new RequestContextMiddleware();
    app.use(middleware.use.bind(middleware));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates a request id, or echoes a well-formed incoming one', async () => {
    const generated = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    expect(generated.headers['x-request-id']).toMatch(/^[a-f0-9]{32}$/);

    const echoed = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .set(REQUEST_ID_HEADER, 'abc-123')
      .expect(200);
    expect(echoed.headers['x-request-id']).toBe('abc-123');

    const rejected = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .set(REQUEST_ID_HEADER, 'bad id with spaces')
      .expect(200);
    expect(rejected.headers['x-request-id']).not.toBe('bad id with spaces');
  });

  it('returns 200 when healthy and 503 when degraded', async () => {
    check.mockResolvedValueOnce(healthy);
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    check.mockResolvedValueOnce({ ...healthy, status: 'degraded' });
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(503);
    expect(res.body.status).toBe('degraded');
  });

  it('wraps AppException in the error envelope with the request id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/test/not-found')
      .set(REQUEST_ID_HEADER, 'req-1')
      .expect(404);
    expect(res.body).toEqual({
      error: {
        code: ErrorCode.NOT_FOUND,
        message: 'Comment not found',
        details: { id: 1 },
        request_id: 'req-1',
      },
    });
  });

  it('maps unknown routes and Prisma errors to the envelope', async () => {
    const missing = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(missing.body.error.code).toBe(ErrorCode.NOT_FOUND);

    const dup = await request(app.getHttpServer()).get('/api/v1/test/duplicate').expect(409);
    expect(dup.body.error.code).toBe(ErrorCode.CONFLICT);
  });

  it('hides details of unexpected errors', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/test/crash').expect(500);
    expect(res.body.error).toMatchObject({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    });
    expect(JSON.stringify(res.body)).not.toContain('secret internals');
  });
});
