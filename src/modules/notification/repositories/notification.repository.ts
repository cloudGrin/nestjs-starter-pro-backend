import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, UpdateResult, DeepPartial } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { PaginationOptions, PaginationResult } from '~/common/types/pagination.types';
import {
  NotificationEntity,
  NotificationStatus,
  NotificationType,
} from '../entities/notification.entity';

export interface NotificationQueryOptions {
  status?: NotificationStatus;
  type?: NotificationType;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  async createMany(data: DeepPartial<NotificationEntity>[]): Promise<NotificationEntity[]> {
    const entities = this.notificationRepository.create(data);
    return this.notificationRepository.save(entities);
  }

  async update(
    id: number,
    data: QueryDeepPartialEntity<NotificationEntity>,
  ): Promise<NotificationEntity> {
    await this.notificationRepository.update(id, data);
    const entity = await this.notificationRepository.findOne({ where: { id } });
    if (!entity) {
      throw new Error(`Notification ${id} not found after update`);
    }
    return entity;
  }

  /**
   * 构建基础查询
   */
  private buildUserQuery(userId: number): SelectQueryBuilder<NotificationEntity> {
    return this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.recipientId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');
  }

  /**
   * 分页查询用户通知
   */
  async paginateUserNotifications(
    userId: number,
    pagination: PaginationOptions,
    query: NotificationQueryOptions,
  ): Promise<PaginationResult<NotificationEntity>> {
    const qb = this.buildUserQuery(userId);

    if (query.status) {
      qb.andWhere('notification.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('notification.type = :type', { type: query.type });
    }

    if (query.keyword) {
      qb.andWhere('(notification.title LIKE :keyword OR notification.content LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      });
    }

    // 日期范围过滤
    if (query.startDate && query.endDate) {
      qb.andWhere('notification.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    } else if (query.startDate) {
      qb.andWhere('notification.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    } else if (query.endDate) {
      qb.andWhere('notification.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    if (pagination.sort) {
      qb.orderBy(`notification.${pagination.sort}`, pagination.order || 'DESC');
    }

    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 10));
    const skip = (page - 1) * limit;

    const [items, totalItems] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  /**
   * 查询未读通知
   */
  async findUnread(userId: number): Promise<NotificationEntity[]> {
    return this.notificationRepository.find({
      where: {
        recipientId: userId,
        status: NotificationStatus.UNREAD,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 标记已读
   */
  async markAsRead(id: number, userId: number): Promise<UpdateResult> {
    return this.notificationRepository.update(
      { id, recipientId: userId, status: NotificationStatus.UNREAD },
      {
        status: NotificationStatus.READ,
        readAt: () => 'CURRENT_TIMESTAMP',
      },
    );
  }

  /**
   * 全部标记已读
   */
  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.notificationRepository.update(
      { recipientId: userId, status: NotificationStatus.UNREAD },
      {
        status: NotificationStatus.READ,
        readAt: () => 'CURRENT_TIMESTAMP',
      },
    );

    return result.affected || 0;
  }
}
