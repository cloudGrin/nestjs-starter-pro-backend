import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  permissions: string[];
  sessionId: string;
  /** 是否为超级管理员（拥有 super_admin 角色） */
  isSuperAdmin?: boolean;
  /** 主要角色码（用于快速判断） */
  roleCode?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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

    const user = await this.userService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    // 获取用户权限
    const permissions = await this.userService.getUserPermissions(user.id);

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
      permissions,
      sessionId: payload.sessionId || '',
      isSuperAdmin,
      roleCode,
    };

    console.log('[JwtStrategy] 用户认证成功:', {
      userId: user.id,
      username: user.username,
      roleCodes,
      isSuperAdmin,
      roleCode,
      permissionCount: permissions.length,
    });

    return authUser;
  }
}
