import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseRepository, PaginationOptions, PaginationResult } from './base.repository';
import { DeepPartial, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { LoggerService } from '~/shared/logger/logger.service';
import { CacheService } from '~/shared/cache/cache.service';

export interface CrudService<T> {
  findAll(options?: FindManyOptions<T>): Promise<T[]>;
  findOne(id: number): Promise<T | null>;
  create(data: DeepPartial<T>): Promise<T>;
  update(id: number, data: QueryDeepPartialEntity<T>): Promise<T>;
  remove(id: number): Promise<void>;
}

/**
 * 基础服务类
 * 封装常用的业务逻辑
 */
export abstract class BaseService<T extends { id: number }> implements CrudService<T> {
  protected abstract readonly repository: BaseRepository<T>;
  protected logger!: LoggerService;
  protected cache!: CacheService;
  protected eventEmitter!: EventEmitter2;

  /**
   * 获取所有实体
   */
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    try {
      return await this.repository.findAll(options);
    } catch (error) {
      this.logger.error(`Failed to find all ${this.getEntityName()}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据 ID 获取实体
   */
  async findOne(id: number, options?: FindOneOptions<T>): Promise<T | null> {
    try {
      // 尝试从缓存获取
      if (this.cache) {
        const cacheKey = this.getCacheKey('findOne', id);
        const cached = await this.cache.get<T>(cacheKey);
        if (cached) {
          return cached;
        }

        // 从数据库获取并缓存
        const entity = await this.repository.findById(id, options);
        if (entity) {
          await this.cache.set(cacheKey, entity, this.getCacheTTL());
        }
        return entity;
      }

      return await this.repository.findById(id, options);
    } catch (error) {
      this.logger.error(`Failed to find ${this.getEntityName()} by id: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建实体
   */
  async create(data: DeepPartial<T>): Promise<T> {
    try {
      // 验证数据
      await this.validateCreate(data);

      // 创建实体
      const entity = await this.repository.create(data);

      // 清除相关缓存
      await this.clearCache();

      // 发送创建事件
      this.eventEmitter.emit(`${this.getEntityName()}.created`, { entity });

      this.logger.log(`Created ${this.getEntityName()} with id: ${entity.id}`);
      return entity;
    } catch (error) {
      this.logger.error(`Failed to create ${this.getEntityName()}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量创建实体
   */
  async createMany(data: DeepPartial<T>[]): Promise<T[]> {
    try {
      // 验证数据
      for (const item of data) {
        await this.validateCreate(item);
      }

      // 批量创建
      const entities = await this.repository.createMany(data);

      // 清除相关缓存
      await this.clearCache();

      // 发送批量创建事件
      this.eventEmitter.emit(`${this.getEntityName()}.batch-created`, { entities });

      this.logger.log(`Batch created ${entities.length} ${this.getEntityName()}`);
      return entities;
    } catch (error) {
      this.logger.error(`Failed to batch create ${this.getEntityName()}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新实体
   */
  async update(id: number, data: QueryDeepPartialEntity<T>): Promise<T> {
    try {
      // 获取原始实体
      const original = await this.repository.findByIdOrFail(id);

      // 验证更新数据
      await this.validateUpdate(id, data);

      // 更新实体
      const updated = await this.repository.update(id, data);

      // 清除相关缓存
      await this.clearCache(id);

      // 发送更新事件
      this.eventEmitter.emit(`${this.getEntityName()}.updated`, {
        original,
        updated,
      });

      this.logger.log(`Updated ${this.getEntityName()} with id: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update ${this.getEntityName()} with id: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 删除实体
   */
  async remove(id: number): Promise<void> {
    try {
      // 获取实体（用于事件）
      const entity = await this.repository.findByIdOrFail(id);

      // 验证删除
      await this.validateDelete(id);

      // 删除实体
      await this.repository.delete(id);

      // 清除相关缓存
      await this.clearCache(id);

      // 发送删除事件
      this.eventEmitter.emit(`${this.getEntityName()}.deleted`, { entity });

      this.logger.log(`Deleted ${this.getEntityName()} with id: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${this.getEntityName()} with id: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 软删除实体
   */
  async softRemove(id: number): Promise<void> {
    try {
      // 获取实体
      const entity = await this.repository.findByIdOrFail(id);

      // 验证删除
      await this.validateDelete(id);

      // 软删除
      await this.repository.softDelete(id);

      // 清除相关缓存
      await this.clearCache(id);

      // 发送软删除事件
      this.eventEmitter.emit(`${this.getEntityName()}.soft-deleted`, { entity });

      this.logger.log(`Soft deleted ${this.getEntityName()} with id: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to soft delete ${this.getEntityName()} with id: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 恢复软删除的实体
   */
  async restore(id: number): Promise<void> {
    try {
      await this.repository.restore(id);

      // 清除相关缓存
      await this.clearCache(id);

      // 发送恢复事件
      this.eventEmitter.emit(`${this.getEntityName()}.restored`, { id });

      this.logger.log(`Restored ${this.getEntityName()} with id: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to restore ${this.getEntityName()} with id: ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * 分页查询
   */
  async paginate(
    options: PaginationOptions,
    findOptions?: FindManyOptions<T>,
  ): Promise<PaginationResult<T>> {
    try {
      // 尝试从缓存获取
      if (this.cache) {
        const cacheKey = this.getCacheKey('paginate', JSON.stringify({ options, findOptions }));
        const cached = await this.cache.get<PaginationResult<T>>(cacheKey);
        if (cached) {
          return cached;
        }

        // 从数据库获取并缓存
        const result = await this.repository.paginate(options, findOptions);
        await this.cache.set(cacheKey, result, this.getCacheTTL());
        return result;
      }

      return await this.repository.paginate(options, findOptions);
    } catch (error) {
      this.logger.error(`Failed to paginate ${this.getEntityName()}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查是否存在
   */
  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    return this.repository.exists(where);
  }

  /**
   * 计数
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }

  /**
   * 验证创建数据（子类可重写）
   */
  protected async validateCreate(data: DeepPartial<T>): Promise<void> {
    // 子类实现具体验证逻辑
  }

  /**
   * 验证更新数据（子类可重写）
   */
  protected async validateUpdate(id: number, data: QueryDeepPartialEntity<T>): Promise<void> {
    // 子类实现具体验证逻辑
  }

  /**
   * 验证删除（子类可重写）
   */
  protected async validateDelete(id: number): Promise<void> {
    // 子类实现具体验证逻辑
  }

  /**
   * 获取实体名称
   */
  protected getEntityName(): string {
    return this.repository['getEntityName']?.() || 'Entity';
  }

  /**
   * 获取缓存键
   */
  protected getCacheKey(operation: string, identifier: string | number): string {
    return `${this.getEntityName()}:${operation}:${identifier}`;
  }

  /**
   * 获取缓存 TTL（秒）
   */
  protected getCacheTTL(): number {
    return 60 * 60; // 默认1小时
  }

  /**
   * 清除缓存
   */
  protected async clearCache(id?: number): Promise<void> {
    if (!this.cache) return;

    try {
      if (id) {
        // 清除特定 ID 的缓存
        await this.cache.del(this.getCacheKey('findOne', id));
      } else {
        // 清除所有相关缓存
        await this.cache.delByPattern(`${this.getEntityName()}:*`);
      }
    } catch (error) {
      this.logger.error(`Failed to clear cache for ${this.getEntityName()}`, error.stack);
    }
  }
}
