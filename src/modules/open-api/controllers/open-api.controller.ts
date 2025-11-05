import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiKeyGuard } from '~/modules/api-auth/guards/api-key.guard';
import { RequireApiScopes } from '~/modules/api-auth/decorators/api-scopes.decorator';
import { Public } from '~/core/decorators/public.decorator';
import { ApiRequest } from '../types/request.types';
import { QueryOrderDto } from '../dto/query-order.dto';
import { CreateOrderDto } from '../dto/create-order.dto';

/**
 * 开放API示例控制器
 * 这是第三方系统调用的API端点
 */
@ApiTags('开放API')
@ApiHeader({
  name: 'X-API-Key',
  description: 'API密钥',
  required: true,
  example: 'sk_live_xxxxxxxxxxxxxxxxxxxxxx',
})
@Controller('v1/open')
@UseGuards(ApiKeyGuard) // 使用API Key认证，而不是JWT
@Public() // 跳过JWT认证
export class OpenApiController {

  /**
   * 获取用户列表（只读权限）
   */
  @Get('users')
  @RequireApiScopes('read:users')
  @ApiOperation({
    summary: '获取用户列表',
    description: '需要 read:users 权限',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回用户列表',
    schema: {
      example: {
        data: [
          {
            id: 1,
            username: 'john_doe',
            email: 'john@example.com',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          total: 100,
          page: 1,
          pageSize: 10,
        },
      },
    },
  })
  async getUsers(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Req() req: ApiRequest,
  ) {
    // req.user 包含API应用信息
    const app = req.user;
    console.log(`API调用来自应用: ${app.name}, ID: ${app.id}`);

    // 这里实现实际的业务逻辑
    // 示例返回
    return {
      data: [
        {
          id: 1,
          username: 'john_doe',
          email: 'john@example.com',
          createdAt: new Date(),
        },
      ],
      pagination: {
        total: 100,
        page,
        pageSize,
      },
    };
  }

  /**
   * 获取订单列表（需要订单读取权限）
   */
  @Get('orders')
  @RequireApiScopes('read:orders')
  @ApiOperation({
    summary: '获取订单列表',
    description: '需要 read:orders 权限',
  })
  async getOrders(@Query() query: QueryOrderDto, @Req() req: ApiRequest) {
    const app = req.user;

    // 基于应用的权限范围返回不同的数据
    const canReadFullDetails = app.scopes?.includes('read:orders:full') ?? false;

    return {
      data: [
        {
          id: 'ORDER-001',
          status: 'completed',
          amount: canReadFullDetails ? 1999.99 : null, // 敏感信息需要额外权限
          customer: canReadFullDetails ? {
            name: 'John Doe',
            email: 'john@example.com',
          } : null,
          createdAt: new Date(),
        },
      ],
    };
  }

  /**
   * 创建订单（需要写权限）
   */
  @Post('orders')
  @RequireApiScopes('write:orders')
  @ApiOperation({
    summary: '创建订单',
    description: '需要 write:orders 权限',
  })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: ApiRequest) {
    const app = req.user;

    // 记录哪个应用创建了订单
    const order = {
      id: `ORDER-${Date.now()}`,
      ...createOrderDto,
      createdByApp: app.name,
      createdByAppId: app.id,
      createdAt: new Date(),
    };

    // 这里保存订单到数据库...

    return {
      success: true,
      data: order,
    };
  }

  /**
   * Webhook订阅管理
   */
  @Post('webhooks/subscribe')
  @RequireApiScopes('manage:webhooks')
  @ApiOperation({
    summary: '订阅Webhook事件',
    description: '需要 manage:webhooks 权限',
  })
  async subscribeWebhook(
    @Body() body: {
      event: string;
      url: string;
    },
    @Req() req: ApiRequest,
  ) {
    const app = req.user;

    // 保存webhook订阅
    const subscription = {
      id: `SUB-${Date.now()}`,
      appId: app.id,
      event: body.event,
      url: body.url || app.webhookUrl, // 使用提供的URL或应用默认的webhook URL
      createdAt: new Date(),
    };

    return {
      success: true,
      data: subscription,
    };
  }

  /**
   * 获取API调用统计（应用自己的统计）
   */
  @Get('statistics')
  @ApiOperation({
    summary: '获取API调用统计',
    description: '获取当前API密钥的使用统计',
  })
  async getStatistics(@Req() req: ApiRequest) {
    const app = req.user;

    // 返回该应用的API调用统计
    return {
      appName: app.name,
      totalCalls: app.totalCalls || 0,
      rateLimits: {
        perHour: app.rateLimitPerHour || 1000,
        perDay: app.rateLimitPerDay || 10000,
      },
      lastCalledAt: app.lastCalledAt,
    };
  }
}