import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '~/shared/cache/cache.service';
import { LoggerService } from '~/shared/logger/logger.service';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'up' | 'down';
      message?: string;
      responseTime?: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly startTime: number;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
  ) {
    this.startTime = Date.now();
  }

  /**
   * 基础健康检查 - /healthz
   * 仅检查服务是否运行
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      checks: {
        service: {
          status: 'up',
          message: 'Service is running',
        },
      },
    };
  }

  /**
   * 就绪检查 - /readyz
   * 检查服务及其依赖是否就绪
   */
  async checkReadiness(): Promise<HealthCheckResult> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const checks: HealthCheckResult['checks'] = {};

    // 1. 检查数据库连接
    const dbCheck = await this.checkDatabase();
    checks.database = dbCheck;

    // 2. 检查进程内缓存
    const cacheCheck = await this.checkCache();
    checks.cache = cacheCheck;

    // 3. 综合判断是否就绪
    const allHealthy = Object.values(checks).every((check) => check.status === 'up');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime,
      checks,
    };
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabase(): Promise<{
    status: 'up' | 'down';
    message?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    try {
      // 执行简单的查询测试连接
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        message: 'Database connection is healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger?.error('Database health check failed', (error as Error).stack);

      return {
        status: 'down',
        message: `Database connection failed: ${(error as Error).message}`,
        responseTime,
      };
    }
  }

  /**
   * 检查进程内缓存
   */
  private async checkCache(): Promise<{
    status: 'up' | 'down';
    message?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    try {
      const testKey = 'health:check:ping';
      const testValue = Date.now().toString();

      // 测试写入
      await this.cacheService.set(testKey, testValue, 10);

      // 测试读取
      const retrieved = await this.cacheService.get<string>(testKey);

      // 清理测试数据
      await this.cacheService.del(testKey);

      const responseTime = Date.now() - startTime;

      if (retrieved === testValue) {
        return {
          status: 'up',
          message: 'Memory cache is healthy',
          responseTime,
        };
      } else {
        return {
          status: 'down',
          message: 'Memory cache read/write test failed',
          responseTime,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger?.error('Memory cache health check failed', (error as Error).stack);

      return {
        status: 'down',
        message: `Memory cache failed: ${(error as Error).message}`,
        responseTime,
      };
    }
  }
}
