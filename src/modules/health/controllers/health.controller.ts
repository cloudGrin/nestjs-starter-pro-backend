import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '~/core/decorators';
import { HealthService } from '../services/health.service';

@ApiTags('健康检查')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * 基础健康检查端点
   * 用于 Kubernetes liveness probe 或负载均衡器心跳检查
   *
   * 仅检查服务进程是否运行，不检查依赖服务
   * 响应快速（< 10ms）
   */
  @Get('healthz')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '健康检查（Liveness Probe）',
    description: '检查服务是否存活，仅检查进程状态，不检查依赖',
  })
  async healthz() {
    return this.healthService.checkHealth();
  }

  /**
   * 就绪检查端点
   * 用于 Kubernetes readiness probe 或负载均衡器上线检查
   *
   * 检查服务及其依赖（数据库、Redis等）是否就绪
   * 响应较慢（可能 100ms+）
   *
   * 返回 200: 服务就绪，可以接收流量
   * 返回 503: 服务未就绪，不应接收流量
   */
  @Get('readyz')
  @Public()
  @ApiOperation({
    summary: '就绪检查（Readiness Probe）',
    description: '检查服务及其依赖是否就绪，包括数据库、Redis等',
  })
  async readyz() {
    const result = await this.healthService.checkReadiness();

    // 如果任何依赖不健康，返回 503 Service Unavailable
    if (result.status === 'unhealthy') {
      throw new Error('Service not ready');
    }

    return result;
  }
}
