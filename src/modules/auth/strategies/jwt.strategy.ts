import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '~/modules/user/services/user.service';
import { JwtPayload } from '../services/auth.service';

export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  roles: string[];
  sessionId: string;
  /** 是否为超级管理员（拥有 super_admin 角色） */
  isSuperAdmin?: boolean;
  /** 主要角色码（用于快速判断） */
  roleCode?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    let user;
    try {
      user = await this.userService.findUserById(payload.sub);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('User not found');
      }
      throw error;
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    // 提取角色码
    const roleCodes = user.roles?.map((role) => role.code) || [];

    // 判断是否为超级管理员
    const isSuperAdmin = roleCodes.includes('super_admin');

    // 获取主要角色码（第一个角色或 super_admin）
    const roleCode = isSuperAdmin ? 'super_admin' : roleCodes[0];

    const authUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: roleCodes,
      sessionId: payload.sessionId || '',
      isSuperAdmin,
      roleCode,
    };

    this.logger.debug({
      userId: user.id,
      username: user.username,
      roleCodes,
      isSuperAdmin,
      roleCode,
    });

    return authUser;
  }
}
