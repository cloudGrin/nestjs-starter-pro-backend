import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, LessThan } from 'typeorm';
import { BaseRepository } from '~/core/base/base.repository';
import { TaskLogEntity } from '../entities/task-log.entity';

@Injectable()
export class TaskLogRepository extends BaseRepository<TaskLogEntity> {
  constructor(
    @InjectRepository(TaskLogEntity)
    private readonly logRepository: Repository<TaskLogEntity>,
  ) {
    super(logRepository);
  }

  async findRecent(taskId: number, limit = 20): Promise<TaskLogEntity[]> {
    const options: FindManyOptions<TaskLogEntity> = {
      where: { taskId },
      order: { createdAt: 'DESC' },
      take: limit,
    };
    return this.logRepository.find(options);
  }

  /**
   * 清理旧的任务日志
   * @param retentionDays 保留天数，默认30天
   * @returns 删除的记录数
   */
  async cleanupOldLogs(retentionDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.logRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }
}
