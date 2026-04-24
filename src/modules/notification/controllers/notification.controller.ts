import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { RequirePermissions } from '~/core/decorators';
import { NotificationEntity } from '../entities/notification.entity';
import { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import {
  MarkAllNotificationsReadResponseDto,
  MarkNotificationReadResponseDto,
} from '../dto/notification-read-response.dto';

@ApiTags('通知管理')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('notification:create')
  @ApiOperation({ summary: '创建通知（支持广播与多用户）' })
  @ApiCreatedResponse({ type: NotificationEntity, isArray: true })
  async create(@Body() dto: CreateNotificationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.createNotification(dto, user?.id);
  }

  @Get()
  @RequirePermissions('notification:read')
  @ApiOperation({ summary: '获取我的通知列表' })
  @ApiOkResponse({ description: '获取我的通知列表成功' })
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryNotificationDto) {
    return this.notificationService.findUserNotifications(user.id, query);
  }

  @Get('unread')
  @RequirePermissions('notification:read')
  @ApiOperation({ summary: '获取我的未读通知' })
  @ApiOkResponse({ type: NotificationEntity, isArray: true })
  async findUnread(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.findUnread(user.id);
  }

  @Put(':id/read')
  @RequirePermissions('notification:read')
  @ApiOperation({ summary: '标记单条通知为已读' })
  @ApiParam({ name: 'id', description: '通知ID' })
  async markAsRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.notificationService.markAsRead(id, user.id);
    return MarkNotificationReadResponseDto.success();
  }

  @Put('read-all')
  @RequirePermissions('notification:read')
  @ApiOperation({ summary: '将所有通知标记为已读' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const affected = await this.notificationService.markAllAsRead(user.id);
    return MarkAllNotificationsReadResponseDto.success(affected);
  }
}
