import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, DeepPartial, FindManyOptions } from 'typeorm';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repository: Repository<RefreshTokenEntity>,
  ) {}

  create(data: DeepPartial<RefreshTokenEntity>): RefreshTokenEntity {
    return this.repository.create(data);
  }

  async save(entity: DeepPartial<RefreshTokenEntity>): Promise<RefreshTokenEntity> {
    return this.repository.save(entity);
  }

  async find(options?: FindManyOptions<RefreshTokenEntity>): Promise<RefreshTokenEntity[]> {
    return this.repository.find(options);
  }

  /**
   * 根据token查找
   */
  async findByToken(token: string): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({
      where: { token },
      relations: ['user', 'user.roles', 'user.roles.permissions'],
    });
  }

  /**
   * 根据用户ID查找所有有效的RefreshToken
   */
  async findValidTokensByUserId(userId: number): Promise<RefreshTokenEntity[]> {
    return this.repository.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 撤销用户的所有RefreshToken
   */
  async revokeAllByUserId(userId: number): Promise<void> {
    await this.repository.update({ userId, isRevoked: false }, { isRevoked: true });
  }

  /**
   * 撤销指定的RefreshToken
   */
  async revokeToken(token: string): Promise<void> {
    await this.repository.update({ token }, { isRevoked: true });
  }

  /**
   * 清理过期的RefreshToken
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  /**
   * 清理已撤销的RefreshToken（超过30天）
   */
  async cleanupRevokedTokens(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.repository.delete({
      isRevoked: true,
      createdAt: LessThan(thirtyDaysAgo),
    });
    return result.affected || 0;
  }

  /**
   * 根据用户ID和设备ID查找
   */
  async findByUserAndDevice(userId: number, deviceId: string): Promise<RefreshTokenEntity | null> {
    return this.repository.findOne({
      where: { userId, deviceId, isRevoked: false },
      order: { createdAt: 'DESC' },
    });
  }
}
