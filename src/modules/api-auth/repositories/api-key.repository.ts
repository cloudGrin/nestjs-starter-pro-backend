import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, DeepPartial } from 'typeorm';
import { ApiKeyEntity } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyRepository {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly repository: Repository<ApiKeyEntity>,
  ) {}

  create(data: DeepPartial<ApiKeyEntity>): ApiKeyEntity {
    return this.repository.create(data);
  }

  async save(entity: DeepPartial<ApiKeyEntity>): Promise<ApiKeyEntity> {
    return this.repository.save(entity);
  }

  async findById(id: number): Promise<ApiKeyEntity | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  /**
   * 根据密钥哈希查找
   */
  async findByKeyHash(keyHash: string): Promise<ApiKeyEntity | null> {
    return this.repository.findOne({
      where: { keyHash },
      relations: ['app'],
    });
  }

  /**
   * 根据应用ID查找所有密钥
   */
  async findByAppId(appId: number): Promise<ApiKeyEntity[]> {
    return this.repository.find({
      where: { appId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 查找所有活跃的密钥
   */
  async findActiveKeysByAppId(appId: number): Promise<ApiKeyEntity[]> {
    return this.repository.find({
      where: { appId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 更新密钥使用统计
   */
  async updateUsageStats(keyId: number): Promise<void> {
    await this.repository.increment({ id: keyId }, 'usageCount', 1);
    await this.repository.update(keyId, { lastUsedAt: new Date() });
  }

  /**
   * 撤销密钥
   */
  async revokeKey(keyId: number): Promise<void> {
    await this.repository.update(keyId, { isActive: false });
  }

  /**
   * 清理过期的密钥
   */
  async cleanupExpiredKeys(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  /**
   * 检查密钥名称是否存在（同一应用下）
   */
  async isNameExistInApp(appId: number, name: string, excludeId?: number): Promise<boolean> {
    const qb = this.repository
      .createQueryBuilder('key')
      .where('key.appId = :appId', { appId })
      .andWhere('key.name = :name', { name });

    if (excludeId) {
      qb.andWhere('key.id != :id', { id: excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
