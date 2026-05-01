import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiAuthService, ValidatedApiApp } from '../services/api-auth.service';

@Injectable()
export class ApiAccessLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiAccessLogInterceptor.name);

  constructor(private readonly apiAuthService: ApiAuthService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: ValidatedApiApp }>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    const record = (statusCode: number) => {
      const app = request.user;

      if (!app?.id) {
        return;
      }

      void this.apiAuthService
        .recordAccessLog({
          appId: app.id,
          keyId: app.keyId,
          keyName: app.keyName,
          keyPrefix: app.keyPrefix,
          keySuffix: app.keySuffix,
          method: request.method,
          path: this.getRequestPath(request),
          statusCode,
          durationMs: Date.now() - startedAt,
          ip: this.getRequestIp(request),
          userAgent: this.getHeaderValue(request.headers['user-agent']),
        })
        .catch((error: unknown) => {
          this.logger.warn(`Failed to record API access log: ${(error as Error).message}`);
        });
    };

    return next.handle().pipe(
      tap(() => record(response.statusCode)),
      catchError((error: unknown) => {
        record(this.getErrorStatusCode(error));
        return throwError(() => error);
      }),
    );
  }

  private getRequestPath(request: Request): string {
    return (request.originalUrl || request.url || '').slice(0, 500);
  }

  private getRequestIp(request: Request): string | undefined {
    const forwardedFor = this.getHeaderValue(request.headers['x-forwarded-for']);
    return (forwardedFor?.split(',')[0]?.trim() || request.ip || undefined)?.slice(0, 64);
  }

  private getHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value?.slice(0, 500);
  }

  private getErrorStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'getStatus' in error) {
      const getStatus = (error as { getStatus?: () => number }).getStatus;
      if (typeof getStatus === 'function') {
        return getStatus.call(error);
      }
    }

    return 500;
  }
}
