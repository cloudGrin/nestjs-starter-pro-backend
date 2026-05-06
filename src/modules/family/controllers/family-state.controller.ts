import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAuthenticated } from '~/core/decorators';
import { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import { MarkFamilyChatReadDto, MarkFamilyPostsReadDto } from '../dto';
import { FamilyReadStateService } from '../services/family-read-state.service';

@ApiTags('家庭阅读状态')
@ApiBearerAuth()
@AllowAuthenticated()
@Controller('family/state')
export class FamilyStateController {
  constructor(private readonly readStateService: FamilyReadStateService) {}

  @Get()
  @ApiOperation({ summary: '获取家庭模块未读状态' })
  async getState(@CurrentUser() user: AuthenticatedUser) {
    return this.readStateService.getState(user);
  }

  @Post('read-posts')
  @ApiOperation({ summary: '标记家庭圈动态已读' })
  async markPostsRead(@Body() dto: MarkFamilyPostsReadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.readStateService.markPostsRead(user, dto.postId);
  }

  @Post('read-chat')
  @ApiOperation({ summary: '标记家庭群聊已读' })
  async markChatRead(@Body() dto: MarkFamilyChatReadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.readStateService.markChatRead(user, dto.messageId);
  }
}
