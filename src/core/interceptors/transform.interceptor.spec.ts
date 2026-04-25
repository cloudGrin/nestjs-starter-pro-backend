import { ExecutionContext, StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import { of, firstValueFrom } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  const createContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/api/files/1/download',
          method: 'GET',
          id: 'request-id',
        }),
      }),
    }) as ExecutionContext;

  it('does not wrap StreamableFile responses', async () => {
    const interceptor = new TransformInterceptor();
    const streamable = new StreamableFile(Readable.from(['file']));

    const result = await firstValueFrom(
      interceptor.intercept(createContext(), {
        handle: () => of(streamable),
      }),
    );

    expect(result).toBe(streamable);
  });

  it('wraps domain DTOs even when they contain a success property', async () => {
    const interceptor = new TransformInterceptor();
    const body = { success: true, message: 'API密钥已撤销' };

    const result = await firstValueFrom(
      interceptor.intercept(createContext(), {
        handle: () => of(body),
      }),
    );

    expect(result).toMatchObject({
      success: true,
      data: body,
      path: '/api/files/1/download',
      method: 'GET',
      requestId: 'request-id',
    });
  });
});
