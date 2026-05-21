import 'reflect-metadata';
import { of, throwError } from 'rxjs';
import { ConflictException } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';

// Reset the in-memory store between tests by re-importing the module
// (jest.resetModules() is too expensive here — instead we run tests with unique keys).

function makeInterceptor() {
  return new IdempotencyInterceptor();
}

function makeContext(opts: {
  key?: string;
  userId?: string;
  statusCode?: number;
} = {}) {
  const headers: Record<string, string> = {};
  if (opts.key) headers['x-idempotency-key'] = opts.key;

  const setHeaderSpy = jest.fn();
  const statusSpy    = jest.fn();

  const res = {
    statusCode:  opts.statusCode ?? 201,
    setHeader:   setHeaderSpy,
    status:      statusSpy,
  };

  const req = {
    headers,
    auth: opts.userId ? { userId: opts.userId } : undefined,
  };

  return {
    getHandler:   jest.fn(),
    getClass:     jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest:  jest.fn().mockReturnValue(req),
      getResponse: jest.fn().mockReturnValue(res),
    }),
    res,
    setHeaderSpy,
    statusSpy,
  } as any;
}

describe('IdempotencyInterceptor', () => {
  afterEach(() => jest.clearAllMocks());

  it('sem X-Idempotency-Key passa directamente ao handler', (done) => {
    const interceptor = makeInterceptor();
    const ctx         = makeContext();
    const next        = { handle: jest.fn().mockReturnValue(of({ id: '1' })) };

    interceptor.intercept(ctx, next).subscribe({
      next: (v) => {
        expect(v).toEqual({ id: '1' });
        expect(next.handle).toHaveBeenCalledTimes(1);
        done();
      },
    });
  });

  it('key com formato inválido é ignorada (handler executa normalmente)', (done) => {
    const interceptor = makeInterceptor();
    const ctx         = makeContext({ key: '../../../etc/passwd' });
    const next        = { handle: jest.fn().mockReturnValue(of({ id: '2' })) };

    interceptor.intercept(ctx, next).subscribe({
      next: (v) => {
        expect(v).toEqual({ id: '2' });
        expect(next.handle).toHaveBeenCalledTimes(1);
        done();
      },
    });
  });

  it('primeira chamada com key válida executa handler e cacheia resposta', (done) => {
    const interceptor = makeInterceptor();
    const key         = `test-first-call-${Date.now()}`;
    const ctx         = makeContext({ key, userId: 'user-abc', statusCode: 201 });
    const body        = { id: 'txn-001' };
    const next        = { handle: jest.fn().mockReturnValue(of(body)) };

    interceptor.intercept(ctx, next).subscribe({
      next: (v) => {
        expect(v).toEqual(body);
        expect(next.handle).toHaveBeenCalledTimes(1);
        done();
      },
    });
  });

  it('segunda chamada com mesma key retorna resposta cacheada sem executar handler', (done) => {
    const interceptor = makeInterceptor();
    const key         = `test-replay-${Date.now()}`;
    const body        = { id: 'txn-002' };
    const ctx1        = makeContext({ key, userId: 'user-xyz', statusCode: 201 });
    const ctx2        = makeContext({ key, userId: 'user-xyz', statusCode: 201 });
    const next        = { handle: jest.fn().mockReturnValue(of(body)) };

    // First request
    interceptor.intercept(ctx1, next).subscribe({
      complete: () => {
        // Second request — same key, same user
        interceptor.intercept(ctx2, next).subscribe({
          next: (v) => {
            expect(v).toEqual(body);
            // Handler should have been called only once (for the first request)
            expect(next.handle).toHaveBeenCalledTimes(1);
            expect(ctx2.setHeaderSpy).toHaveBeenCalledWith('X-Idempotency-Replayed', 'true');
            done();
          },
        });
      },
    });
  });

  it('keys diferentes para o mesmo utilizador executam handlers independentes', (done) => {
    const interceptor = makeInterceptor();
    const ts          = Date.now();
    const ctx1 = makeContext({ key: `key-a-${ts}`, userId: 'user-multi' });
    const ctx2 = makeContext({ key: `key-b-${ts}`, userId: 'user-multi' });
    const next1 = { handle: jest.fn().mockReturnValue(of({ id: 'a' })) };
    const next2 = { handle: jest.fn().mockReturnValue(of({ id: 'b' })) };

    interceptor.intercept(ctx1, next1).subscribe({
      complete: () => {
        interceptor.intercept(ctx2, next2).subscribe({
          next: (v) => {
            expect(v).toEqual({ id: 'b' });
            expect(next1.handle).toHaveBeenCalledTimes(1);
            expect(next2.handle).toHaveBeenCalledTimes(1);
            done();
          },
        });
      },
    });
  });

  it('mesma key de utilizadores diferentes executa handlers independentes', (done) => {
    const interceptor = makeInterceptor();
    const key         = `shared-key-${Date.now()}`;
    const ctx1 = makeContext({ key, userId: 'user-1' });
    const ctx2 = makeContext({ key, userId: 'user-2' });
    const next1 = { handle: jest.fn().mockReturnValue(of({ result: 'user1' })) };
    const next2 = { handle: jest.fn().mockReturnValue(of({ result: 'user2' })) };

    interceptor.intercept(ctx1, next1).subscribe({
      complete: () => {
        interceptor.intercept(ctx2, next2).subscribe({
          next: (v) => {
            expect(v).toEqual({ result: 'user2' });
            expect(next1.handle).toHaveBeenCalledTimes(1);
            expect(next2.handle).toHaveBeenCalledTimes(1);
            done();
          },
        });
      },
    });
  });

  it('quando handler lança erro, o placeholder é removido (retry permitido)', (done) => {
    const interceptor = makeInterceptor();
    const key         = `error-retry-${Date.now()}`;
    const ctx         = makeContext({ key, userId: 'user-err' });
    const next        = { handle: jest.fn().mockReturnValue(throwError(() => new Error('falha DB'))) };

    interceptor.intercept(ctx, next).subscribe({
      error: () => {
        // After error, a retry with the same key should call the handler again
        const ctx2  = makeContext({ key, userId: 'user-err', statusCode: 201 });
        const next2 = { handle: jest.fn().mockReturnValue(of({ id: 'retry-ok' })) };
        interceptor.intercept(ctx2, next2).subscribe({
          next: (v) => {
            expect(v).toEqual({ id: 'retry-ok' });
            expect(next2.handle).toHaveBeenCalledTimes(1);
            done();
          },
        });
      },
    });
  });
});
