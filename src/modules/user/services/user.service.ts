import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '~/common/constants/cache.constants';
import { PaginationResult } from '~/common/types/pagination.types';
import { RefreshTokenEntity } from '~/modules/auth/entities/refresh-token.entity';
import { UserEntity } from '../entities/user.entity';
import { RoleEntity } from '~/modules/role/entities/role.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { ChangePasswordDto, ResetPasswordDto } from '../dto/change-password.dto';
import { UserStatus } from '~/common/enums/user.enum';

const USER_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'username', 'email', 'lastLoginAt']);

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly logger: LoggerService,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(UserService.name);
  }

  /**
   * 创建用户
   */
  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    this.logger.debug(
      `准备创建用户 username=${dto.username}, email=${dto.email}, roleIds=${JSON.stringify(dto.roleIds || [])}`,
    );

    // 检查用户名是否存在
    if (await this.isUsernameExist(dto.username)) {
      this.logger.debug(`创建用户失败，用户名已存在 username=${dto.username}`);
      throw new ConflictException('用户名已存在');
    }

    // 检查邮箱是否存在
    if (await this.isEmailExist(dto.email)) {
      this.logger.debug(`创建用户失败，邮箱已存在 email=${dto.email}`);
      throw new ConflictException('邮箱已被注册');
    }

    // 检查手机号是否存在
    if (dto.phone && (await this.isPhoneExist(dto.phone))) {
      this.logger.debug(`创建用户失败，手机号已存在 phone=${dto.phone}`);
      throw new ConflictException('手机号已被注册');
    }

    // 获取角色
    let roles: RoleEntity[] = [];
    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.roleRepository.find({
        where: { id: In(dto.roleIds), isActive: true },
      });

      this.logger.debug(
        `创建用户角色查询结果 username=${dto.username}, 请求数量=${dto.roleIds.length}, 查询数量=${roles.length}`,
      );

      if (roles.length !== dto.roleIds.length) {
        this.logger.debug(
          `创建用户失败，部分角色不存在或禁用 username=${dto.username}, roleIds=${JSON.stringify(dto.roleIds)}`,
        );
        throw new BadRequestException('部分角色不存在或已禁用');
      }
    }

    // 创建用户
    const user = this.userRepository.create({
      ...dto,
      roles,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.debug(`用户保存成功 id=${savedUser.id}, username=${savedUser.username}`);

    // 清除缓存
    await this.clearUserCache();
    this.logger.debug(`创建用户后清理缓存完成 userId=${savedUser.id}`);

    this.logger.log(`Created user: ${savedUser.username} (ID: ${savedUser.id})`);

    // 排除敏感字段password
    const { password: _password, ...userWithoutPassword } = savedUser;

    return userWithoutPassword as UserEntity;
  }

  /**
   * 更新用户
   */
  async updateUser(id: number, dto: UpdateUserDto): Promise<UserEntity> {
    this.logger.debug(`准备更新用户 id=${id}, payload=${JSON.stringify(dto)}`);

    const user = await this.findByIdOrFail(id);
    this.logger.debug(`更新用户时找到用户 id=${id}, username=${user.username}`);

    // 检查邮箱是否存在
    if (dto.email && dto.email !== user.email) {
      if (await this.isEmailExist(dto.email, id)) {
        this.logger.debug(`更新用户失败，邮箱已存在 id=${id}, email=${dto.email}`);
        throw new ConflictException('邮箱已被注册');
      }
    }

    // 检查手机号是否存在
    if (dto.phone && dto.phone !== user.phone) {
      if (await this.isPhoneExist(dto.phone, id)) {
        this.logger.debug(`更新用户失败，手机号已存在 id=${id}, phone=${dto.phone}`);
        throw new ConflictException('手机号已被注册');
      }
    }

    // 更新角色
    let rolesChanged = false;
    if (dto.roleIds !== undefined) {
      this.logger.debug(`更新用户角色 id=${id}, roleIds=${JSON.stringify(dto.roleIds)}`);
      const roles =
        dto.roleIds.length > 0
          ? await this.roleRepository.find({
              where: { id: In(dto.roleIds), isActive: true },
            })
          : [];

      this.logger.debug(
        `更新用户角色查询结果 id=${id}, 请求数量=${dto.roleIds.length}, 查询数量=${roles.length}`,
      );

      if (dto.roleIds.length > 0 && roles.length !== dto.roleIds.length) {
        this.logger.debug(`更新用户失败，部分角色不存在或禁用 id=${id}`);
        throw new BadRequestException('部分角色不存在或已禁用');
      }

      user.roles = roles;
      rolesChanged = true;
    }

    // 更新用户信息
    Object.assign(user, dto);
    this.logger.debug(`用户信息合并完成，准备保存 id=${id}`);
    const updatedUser = await this.userRepository.save(user);
    this.logger.debug(`用户更新保存成功 id=${updatedUser.id}`);

    // 清除缓存
    await this.clearUserCache(id);
    // 如果角色发生变更，清除权限缓存，确保权限立即生效
    if (rolesChanged) {
      await this.clearUserPermissionCache(id);
    }
    this.logger.debug(`更新用户后清理缓存完成 userId=${updatedUser.id}`);

    this.logger.log(`Updated user: ${updatedUser.username} (ID: ${updatedUser.id})`);

    return updatedUser;
  }

  /**
   * 查询用户列表
   */
  async findUsers(query: QueryUserDto): Promise<PaginationResult<UserEntity>> {
    this.logger.debug(`查询用户列表，过滤条件=${JSON.stringify(query)}`);
    const [items, totalItems] = await this.findWithQuery(query);
    this.logger.debug(`查询用户列表完成，返回数量=${items.length}, 总数=${totalItems}`);

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: query.limit || 10,
        totalPages: Math.ceil(totalItems / (query.limit || 10)),
        currentPage: query.page || 1,
      },
    };
  }

  /**
   * 获取用户详情
   */
  async findUserById(id: number): Promise<UserEntity> {
    this.logger.debug(`查询用户详情 id=${id}`);

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      this.logger.debug(`查询用户详情失败，未找到用户 id=${id}`);
      throw new NotFoundException('用户不存在');
    }

    this.logger.debug(
      `[UserService.findUserById] TypeORM查询用户详情: userId=${id}, username=${user.username}, rolesCount=${user.roles?.length || 0}, roleCodes=${JSON.stringify(user.roles?.map((r) => r.code) || [])}`,
    );

    return user;
  }

  /**
   * 根据用户名获取用户
   */
  async findByUsername(username: string): Promise<UserEntity | null> {
    this.logger.debug(`根据用户名查询用户 username=${username}`);
    const result = await this.userRepository.findOne({
      where: { username },
      relations: ['roles', 'roles.permissions'],
    });
    this.logger.debug(`根据用户名查询用户结果 username=${username}, exists=${result ? 'Y' : 'N'}`);
    return result;
  }

  /**
   * 根据邮箱获取用户
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    this.logger.debug(`根据邮箱查询用户 email=${email}`);
    const result = await this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
    this.logger.debug(`根据邮箱查询用户结果 email=${email}, exists=${result ? 'Y' : 'N'}`);
    return result;
  }

  /**
   * 修改密码
   */
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    this.logger.debug(`用户修改密码 userId=${userId}`);

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('两次输入的密码不一致');
    }

    const user = await this.findWithPassword(userId);
    if (!user) {
      this.logger.debug(`修改密码失败，未找到用户 userId=${userId}`);
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const isValidPassword = await user.validatePassword(dto.oldPassword);
    if (!isValidPassword) {
      this.logger.debug(`修改密码失败，旧密码验证未通过 userId=${userId}`);
      throw new BadRequestException('当前密码错误');
    }

    // 更新密码
    user.password = dto.newPassword;
    await this.userRepository.save(user);
    this.logger.debug(`用户密码更新成功 userId=${userId}`);

    // 清除用户的刷新Token（强制重新登录）
    await this.revokeRefreshTokens(userId);
    this.logger.debug(`清除用户刷新Token userId=${userId}`);

    // 清除缓存
    await this.clearUserCache(userId);
    this.logger.debug(`修改密码后清理缓存完成 userId=${userId}`);

    this.logger.log(`User ${userId} changed password`);
  }

  /**
   * 重置密码（管理员操作）
   */
  async resetPassword(userId: number, dto: ResetPasswordDto): Promise<void> {
    this.logger.debug(`管理员重置密码 userId=${userId}`);

    const user = await this.findByIdOrFail(userId);

    // 更新密码
    user.password = dto.password;
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    await this.userRepository.save(user);
    this.logger.debug(`用户密码重置保存成功 userId=${userId}`);

    // 清除用户的刷新Token（强制重新登录）
    await this.revokeRefreshTokens(userId);
    this.logger.debug(`重置密码后清除刷新Token userId=${userId}`);

    // 清除缓存
    await this.clearUserCache(userId);
    this.logger.debug(`重置密码后清理缓存完成 userId=${userId}`);

    this.logger.log(`Reset password for user ${userId}`);
  }

  /**
   * 启用用户
   */
  async enableUser(id: number): Promise<UserEntity> {
    this.logger.debug(`启用用户 id=${id}`);

    const user = await this.findByIdOrFail(id);

    user.status = UserStatus.ACTIVE;
    user.loginAttempts = 0;
    user.lockedUntil = undefined;

    const updatedUser = await this.userRepository.save(user);
    this.logger.debug(`用户启用保存成功 id=${id}`);

    // 清除缓存
    await this.clearUserCache(id);
    this.logger.debug(`启用用户后清理缓存完成 userId=${id}`);

    this.logger.log(`Enabled user: ${updatedUser.username} (ID: ${id})`);

    return updatedUser;
  }

  /**
   * 禁用用户
   */
  async disableUser(id: number): Promise<UserEntity> {
    this.logger.debug(`禁用用户 id=${id}`);

    const user = await this.findByIdOrFail(id);

    user.status = UserStatus.DISABLED;

    const updatedUser = await this.userRepository.save(user);
    this.logger.debug(`用户禁用保存成功 id=${id}`);

    // 清除用户的刷新Token（强制下线）
    await this.revokeRefreshTokens(id);
    this.logger.debug(`禁用用户后清除刷新Token userId=${id}`);

    // 清除缓存
    await this.clearUserCache(id);
    this.logger.debug(`禁用用户后清理缓存完成 userId=${id}`);

    this.logger.log(`Disabled user: ${updatedUser.username} (ID: ${id})`);

    return updatedUser;
  }

  /**
   * 删除用户
   */
  async deleteUser(id: number): Promise<void> {
    this.logger.debug(`删除用户 id=${id}`);

    const user = await this.findByIdOrFail(id);

    await this.userRepository.softDelete(id);
    this.logger.debug(`用户软删除完成 id=${id}`);

    // 清除缓存
    await this.clearUserCache(id);
    this.logger.debug(`删除用户后清理缓存完成 userId=${id}`);

    this.logger.log(`Deleted user: ${user.username} (ID: ${id})`);
  }

  /**
   * 批量删除用户
   */
  async deleteUsers(ids: number[]): Promise<void> {
    this.logger.debug(`批量删除用户 ids=${JSON.stringify(ids)}`);

    const users = await this.findByIds(ids);

    if (users.length !== ids.length) {
      this.logger.debug(
        `批量删除用户失败，部分用户不存在 请求数量=${ids.length}, 实际数量=${users.length}`,
      );
      throw new BadRequestException('部分用户不存在');
    }

    for (const user of users) {
      await this.userRepository.softDelete(user.id);
      this.logger.debug(`用户软删除完成 id=${user.id}`);
    }

    // 清除缓存
    await this.clearUserCache();
    this.logger.debug('批量删除用户后清理缓存完成');

    this.logger.log(`Batch deleted ${users.length} users`);
  }

  /**
   * 分配角色
   */
  async assignRoles(userId: number, roleIds: number[]): Promise<UserEntity> {
    this.logger.debug(`分配角色 userId=${userId}, roleIds=${JSON.stringify(roleIds)}`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      this.logger.debug(`分配角色失败，未找到用户 userId=${userId}`);
      throw new NotFoundException('用户不存在');
    }

    const roles = await this.roleRepository.find({
      where: { id: In(roleIds), isActive: true },
    });

    this.logger.debug(
      `分配角色查询结果 userId=${userId}, 请求数量=${roleIds.length}, 查询数量=${roles.length}`,
    );

    if (roles.length !== roleIds.length) {
      this.logger.debug(`分配角色失败，部分角色不存在或禁用 userId=${userId}`);
      throw new BadRequestException('部分角色不存在或已禁用');
    }

    user.roles = roles;
    const updatedUser = await this.userRepository.save(user);
    this.logger.debug(`分配角色保存成功 userId=${userId}`);

    // 清除缓存
    await this.clearUserCache(userId);
    // 清除权限缓存，确保角色变更后权限立即生效
    await this.clearUserPermissionCache(userId);
    this.logger.debug(`分配角色后清理缓存完成 userId=${userId}`);

    this.logger.log(`Assigned ${roles.length} roles to user ${userId}`);

    return updatedUser;
  }

  /**
   * 获取用户权限
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    this.logger.debug(`获取用户权限 userId=${userId}`);
    const cacheKey = CACHE_KEYS.USER_PERMISSIONS(userId);

    // 尝试从缓存获取
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) {
      this.logger.debug(`用户权限缓存命中 userId=${userId}, 权限数量=${cached.length}`);
      return cached;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      this.logger.debug(`获取用户权限失败，未找到用户 userId=${userId}`);
      return [];
    }

    // 收集所有权限编码
    const permissions = new Set<string>();
    for (const role of user.roles) {
      if (role.isActive) {
        this.logger.debug(
          `收集角色权限 userId=${userId}, roleId=${role.id}, permissionCount=${role.permissions?.length || 0}`,
        );
        for (const permission of role.permissions) {
          if (permission.isActive) {
            permissions.add(permission.code);
          }
        }
      }
    }

    const permissionList = Array.from(permissions);
    this.logger.debug(`计算用户权限完成 userId=${userId}, 权限数量=${permissionList.length}`);

    await this.cache.set(cacheKey, permissionList, CACHE_TTL.MEDIUM);
    this.logger.debug(`用户权限写入缓存 userId=${userId}, ttl=${CACHE_TTL.MEDIUM}`);

    return permissionList;
  }

  /**
   * 验证用户权限
   */
  async hasPermission(userId: number, permissionCode: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const result = permissions.includes(permissionCode);
    this.logger.debug(
      `权限校验(single) userId=${userId}, permission=${permissionCode}, result=${result}`,
    );
    return result;
  }

  /**
   * 验证用户多个权限（全部满足）
   */
  async hasAllPermissions(userId: number, permissionCodes: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const result = permissionCodes.every((code) => permissions.includes(code));
    this.logger.debug(
      `权限校验(all) userId=${userId}, permissions=${JSON.stringify(permissionCodes)}, result=${result}`,
    );
    return result;
  }

  /**
   * 验证用户多个权限（满足其一）
   */
  async hasAnyPermission(userId: number, permissionCodes: string[]): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    const result = permissionCodes.some((code) => permissions.includes(code));
    this.logger.debug(
      `权限校验(any) userId=${userId}, permissions=${JSON.stringify(permissionCodes)}, result=${result}`,
    );
    return result;
  }

  /**
   * 清除用户权限缓存
   * 注意：这会清除PermissionsGuard中缓存的用户权限，确保角色变更后立即生效
   */
  private async clearUserPermissionCache(userId: number): Promise<void> {
    const cacheKey = CACHE_KEYS.USER_PERMISSIONS(userId);
    await this.cache.del(cacheKey);
    this.logger.debug(`已清除用户权限缓存 userId=${userId}`);
  }

  private async clearUserCache(userId?: number): Promise<void> {
    if (userId !== undefined) {
      await this.cache.del(`User:findOne:${userId}`);
      return;
    }

    await this.cache.delByPattern('User:*');
  }

  private async isUsernameExist(username: string, excludeId?: number): Promise<boolean> {
    const qb = this.userRepository.createQueryBuilder('user').where('user.username = :username', {
      username,
    });

    if (excludeId) {
      qb.andWhere('user.id != :id', { id: excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  private async isEmailExist(email: string, excludeId?: number): Promise<boolean> {
    const qb = this.userRepository.createQueryBuilder('user').where('user.email = :email', {
      email,
    });

    if (excludeId) {
      qb.andWhere('user.id != :id', { id: excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  private async isPhoneExist(phone: string, excludeId?: number): Promise<boolean> {
    const qb = this.userRepository.createQueryBuilder('user').where('user.phone = :phone', {
      phone,
    });

    if (excludeId) {
      qb.andWhere('user.id != :id', { id: excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  private async findByIdOrFail(id: number): Promise<UserEntity> {
    const entity = await this.userRepository.findOne({
      where: { id } as FindOptionsWhere<UserEntity>,
    });

    if (!entity) {
      throw new NotFoundException('用户不存在');
    }

    return entity;
  }

  private async findWithPassword(id: number): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'password', 'status', 'loginAttempts', 'lockedUntil'],
      relations: ['roles', 'roles.permissions'],
    });
  }

  private async findWithQuery(query: QueryUserDto): Promise<[UserEntity[], number]> {
    const {
      username,
      email,
      phone,
      realName,
      status,
      gender,
      roleId,
      page = 1,
      limit = 10,
      sort,
      order,
    } = query;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role');

    if (username) {
      qb.andWhere('user.username LIKE :username', { username: `%${username}%` });
    }

    if (email) {
      qb.andWhere('user.email LIKE :email', { email: `%${email}%` });
    }

    if (phone) {
      qb.andWhere('user.phone LIKE :phone', { phone: `%${phone}%` });
    }

    if (realName) {
      qb.andWhere('user.realName LIKE :realName', { realName: `%${realName}%` });
    }

    if (status) {
      qb.andWhere('user.status = :status', { status });
    }

    if (gender) {
      qb.andWhere('user.gender = :gender', { gender });
    }

    if (roleId) {
      qb.andWhere('role.id = :roleId', { roleId });
    }

    if (sort && USER_SORT_FIELDS.has(sort)) {
      qb.orderBy(`user.${sort}`, order || 'ASC');
    } else {
      qb.orderBy('user.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    return qb.getManyAndCount();
  }

  private async findByIds(ids: number[]): Promise<UserEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.userRepository.find({
      where: { id: In(ids) },
      relations: ['roles'],
    });
  }

  private async revokeRefreshTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update({ userId, isRevoked: false }, { isRevoked: true });
  }
}
