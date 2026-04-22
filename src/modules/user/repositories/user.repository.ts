import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, FindManyOptions } from 'typeorm';
import { BaseRepository } from '~/core/base/base.repository';
import { UserEntity } from '../entities/user.entity';
import { QueryUserDto } from '../dto/query-user.dto';
import { UserStatus } from '~/common/enums/user.enum';

@Injectable()
export class UserRepository extends BaseRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    repository: Repository<UserEntity>,
  ) {
    super(repository);
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { username },
      relations: ['roles', 'roles.permissions'],
    });
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  /**
   * 根据手机号查找用户
   */
  async findByPhone(phone: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { phone },
      relations: ['roles'],
    });
  }

  /**
   * 获取用户详情（包含密码字段）
   */
  async findWithPassword(id: number): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'email',
        'password',
        'status',
        'loginAttempts',
        'lockedUntil',
        'refreshToken',
      ],
      relations: ['roles', 'roles.permissions'],
    });
  }

  /**
   * 根据用户名或邮箱查找（用于登录）
   *
   * 优化版本：分开查询以确保使用索引
   * - 虽然执行了多次查询，但每次都能使用索引，总体性能优于 OR 查询
   * - 大部分情况只需要1次查询（username 匹配）
   */
  async findForLogin(account: string): Promise<UserEntity | null> {
    // 1. 先用 username 查询（最常见的登录方式）
    let user = await this.repository
      .createQueryBuilder('user')
      .addSelect(['user.password', 'user.refreshToken'])
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.username = :account', { account })
      .getOne();

    // 2. 如果找不到，再用 email 查询
    if (!user) {
      user = await this.repository
        .createQueryBuilder('user')
        .addSelect(['user.password', 'user.refreshToken'])
        .leftJoinAndSelect('user.roles', 'role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where('user.email = :account', { account })
        .getOne();
    }

    // 3. 如果还找不到，且输入像手机号，再用 phone 查询
    if (!user && /^\d{11}$/.test(account)) {
      user = await this.repository
        .createQueryBuilder('user')
        .addSelect(['user.password', 'user.refreshToken'])
        .leftJoinAndSelect('user.roles', 'role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where('user.phone = :account', { account })
        .getOne();
    }

    return user;
  }

  /**
   * 查询用户列表
   */
  async findWithQuery(query: QueryUserDto): Promise<[UserEntity[], number]> {
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

    const qb = this.repository.createQueryBuilder('user').leftJoinAndSelect('user.roles', 'role');

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

    if (sort) {
      qb.orderBy(`user.${sort}`, order || 'ASC');
    } else {
      qb.orderBy('user.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    return qb.getManyAndCount();
  }

  /**
   * 批量查找用户
   */
  async findByIds(ids: number[]): Promise<UserEntity[]> {
    return this.repository.find({
      where: { id: In(ids) },
      relations: ['roles'],
    });
  }

  /**
   * 更新刷新Token
   */
  async updateRefreshToken(userId: number, refreshToken: string | undefined): Promise<void> {
    await this.repository.update(userId, { refreshToken: refreshToken || undefined });
  }

  /**
   * 更新登录信息
   */
  async updateLoginInfo(userId: number, ip: string, loginTime: Date = new Date()): Promise<void> {
    await this.repository.update(userId, {
      lastLoginIp: ip,
      lastLoginAt: loginTime,
      loginAttempts: 0,
      lockedUntil: undefined,
    });
  }

  /**
   * 检查用户名是否存在
   */
  async isUsernameExist(username: string, excludeId?: number): Promise<boolean> {
    const qb = this.repository
      .createQueryBuilder('user')
      .where('user.username = :username', { username });

    if (excludeId) {
      qb.andWhere('user.id != :id', { id: excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  /**
   * 检查邮箱是否存在
   */
  async isEmailExist(email: string, excludeId?: number): Promise<boolean> {
    const qb = this.repository.createQueryBuilder('user').where('user.email = :email', { email });

    if (excludeId) {
      qb.andWhere('user.id != :id', { id: excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }

  /**
   * 获取所有活跃用户ID
   */
  async findActiveUserIds(): Promise<number[]> {
    const users = await this.repository.find({
      select: ['id'],
      where: { status: UserStatus.ACTIVE },
    });
    return users.map((user) => user.id);
  }

  /**
   * 检查手机号是否存在
   */
  async isPhoneExist(phone: string, excludeId?: number): Promise<boolean> {
    const qb = this.repository.createQueryBuilder('user').where('user.phone = :phone', { phone });

    if (excludeId) {
      qb.andWhere('user.id != :id', { id: excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
