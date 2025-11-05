import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '~/shared/cache/cache.service';
import { CACHEABLE_KEY, CacheableMetadata } from '../decorators/cacheable.decorator';
import { createHash } from 'crypto';

/**
 * 缓存拦截器
 * 根据 @Cacheable 装饰器自动缓存方法返回值
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const metadata = this.reflector.get<CacheableMetadata>(CACHEABLE_KEY, context.getHandler());

    // 如果没有 @Cacheable 装饰器，直接放行
    if (!metadata) {
      return next.handle();
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(context, metadata);

    // 尝试从缓存获取
    const cachedValue = await this.cacheService.get(cacheKey);
    if (cachedValue !== null && cachedValue !== undefined) {
      return of(cachedValue);
    }

    // 缓存未命中，执行方法并缓存结果
    return next.handle().pipe(
      tap(async (response) => {
        if (response !== null && response !== undefined) {
          const ttl = metadata.ttl || 3600;
          await this.cacheService.set(cacheKey, response, ttl);
        }
      }),
    );
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(context: ExecutionContext, metadata: CacheableMetadata): string {
    const prefix = metadata.prefix;
    const args = context.getArgs();

    // 获取需要包含在缓存键中的参数
    let keyArgs: any[] = [];

    if (metadata.includeAllArgs !== false) {
      // 默认包含所有参数
      keyArgs = args;
    } else if (metadata.argIndexes && metadata.argIndexes.length > 0) {
      // 只包含指定索引的参数
      keyArgs = metadata.argIndexes
        .filter((index) => index < args.length)
        .map((index) => args[index]);
    }

    // 如果没有参数，直接返回前缀
    if (keyArgs.length === 0) {
      return prefix;
    }

    // 序列化参数并生成哈希
    const argsHash = this.hashArgs(keyArgs);
    return `${prefix}:${argsHash}`;
  }

  /**
   * 参数哈希
   */
  private hashArgs(args: any[]): string {
    try {
      const argsString = JSON.stringify(args);
      return createHash('md5').update(argsString).digest('hex');
    } catch {
      // 如果序列化失败，使用时间戳
      return Date.now().toString();
    }
  }
}
