import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import {
  ApiSuccessResponse,
  ApiPublicResponses,
  ApiAuthResponses,
  ApiCommonResponses,
  ApiLoginExample,
  Public,
  AllowAuthenticated,
} from '~/core/decorators';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthenticatedUser } from '../strategies/jwt.strategy';
import { IpUtil } from '~/common/utils';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  @ApiPublicResponses()
  @ApiLoginExample()
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = IpUtil.getRealIp(req);
    const userAgent = req.headers['user-agent'];

    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ type: RegisterDto })
  @ApiPublicResponses()
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新令牌' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiPublicResponses()
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @AllowAuthenticated()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登出' })
  @ApiAuthResponses()
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body('refreshToken') refreshToken?: string,
  ) {
    await this.authService.logout(user.id, user.sessionId || undefined, refreshToken);
    return { message: '登出成功' };
  }

  @Get('profile')
  @AllowAuthenticated()
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiSuccessResponse(UserEntity)
  @ApiAuthResponses()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  @Get('check')
  @AllowAuthenticated()
  @ApiBearerAuth()
  @ApiOperation({ summary: '检查认证状态' })
  async checkAuth(@CurrentUser() user: AuthenticatedUser) {
    return {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }
}
