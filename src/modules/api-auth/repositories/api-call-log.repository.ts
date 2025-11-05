import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { BaseRepository } from '~/core/base/base.repository';
import { ApiCallLogEntity } from '../entities/api-call-log.entity';

@Injectable()
export class ApiCallLogRepository extends BaseRepository<ApiCallLogEntity> {
  constructor(
    @InjectRepository(ApiCallLogEntity)
    repository: Repository<ApiCallLogEntity>,
  ) {
    super(repository);
  }

  /**
   * 根据应用ID查询调用日志（分页）
   */
  async findByAppId(
    appId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<[ApiCallLogEntity[], number]> {
    return this.repository.findAndCount({
      where: { appId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * 根据端点查询调用日志
   */
  async findByEndpoint(
    endpoint: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<[ApiCallLogEntity[], number]> {
    return this.repository.findAndCount({
      where: { endpoint },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * 统计应用调用次数（指定时间范围）
   */
  async countCallsByAppId(appId: number, startDate: Date, endDate: Date): Promise<number> {
    return this.repository.count({
      where: {
        appId,
        createdAt: Between(startDate, endDate),
      },
    });
  }

  /**
   * 统计错误调用次数
   */
  async countErrorsByAppId(appId: number, startDate: Date, endDate: Date): Promise<number> {
    const qb = this.repository
      .createQueryBuilder('log')
      .where('log.appId = :appId', { appId })
      .andWhere('log.statusCode >= 400')
      .andWhere('log.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });

    return qb.getCount();
  }

  /**
   * 获取应用的平均响应时间
   */
  async getAverageResponseTime(appId: number, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('log')
      .select('AVG(log.responseTime)', 'avg')
      .where('log.appId = :appId', { appId })
      .andWhere('log.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return result?.avg ? parseFloat(result.avg) : 0;
  }

  /**
   * 获取热门端点（Top N）
   */
  async getTopEndpoints(appId: number, limit: number = 10): Promise<any[]> {
    return this.repository
      .createQueryBuilder('log')
      .select('log.endpoint', 'endpoint')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(log.responseTime)', 'avgResponseTime')
      .where('log.appId = :appId', { appId })
      .groupBy('log.endpoint')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  /**
   * 清理旧日志（超过指定天数）
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.repository.delete({
      createdAt: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }

  /**
   * 查询失败的API调用
   */
  async findFailedCalls(
    appId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<[ApiCallLogEntity[], number]> {
    const qb = this.repository
      .createQueryBuilder('log')
      .where('log.appId = :appId', { appId })
      .andWhere('log.statusCode >= 400')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }
}
