import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAuthenticated } from '~/core/decorators';
import { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import { CreateFamilyPostCommentDto, CreateFamilyPostDto, QueryFamilyPostDto } from '../dto';
import { FamilyService } from '../services/family.service';

@ApiTags('家庭圈')
@ApiBearerAuth()
@AllowAuthenticated()
@Controller('family/posts')
export class FamilyPostController {
  constructor(private readonly familyService: FamilyService) {}

  @Get()
  @ApiOperation({ summary: '获取家庭圈动态' })
  async findPosts(@Query() query: QueryFamilyPostDto, @CurrentUser() user: AuthenticatedUser) {
    return this.familyService.findPosts(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取家庭圈动态详情' })
  async findPost(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.familyService.findPost(id, user);
  }

  @Post()
  @ApiOperation({ summary: '发布家庭圈动态' })
  async createPost(@Body() dto: CreateFamilyPostDto, @CurrentUser() user: AuthenticatedUser) {
    return this.familyService.createPost(dto, user);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: '评论家庭圈动态' })
  async createComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFamilyPostCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.familyService.createComment(id, dto, user);
  }

  @Post(':id/like')
  @ApiOperation({ summary: '点赞家庭圈动态' })
  async likePost(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.familyService.likePost(id, user);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: '取消点赞家庭圈动态' })
  async unlikePost(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    await this.familyService.unlikePost(id, user);
  }
}
