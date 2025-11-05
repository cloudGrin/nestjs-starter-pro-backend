import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => {
        // 如果响应已经是格式化的，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return data as Response<T>;
        }

        // 处理分页数据
        if (data && typeof data === 'object' && 'items' in data && 'meta' in data) {
          return {
            success: true,
            data: data as T,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            requestId: (request as any).id,
          };
        }

        // 标准响应格式
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
          requestId: (request as any).id,
        };
      }),
    );
  }
}
