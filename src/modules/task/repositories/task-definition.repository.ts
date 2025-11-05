import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '~/core/base/base.repository';
import { TaskDefinitionEntity } from '../entities/task-definition.entity';

@Injectable()
export class TaskDefinitionRepository extends BaseRepository<TaskDefinitionEntity> {
  constructor(
    @InjectRepository(TaskDefinitionEntity)
    private readonly taskRepository: Repository<TaskDefinitionEntity>,
  ) {
    super(taskRepository);
  }

  async findByCode(code: string): Promise<TaskDefinitionEntity | null> {
    return this.taskRepository.findOne({ where: { code } });
  }
}
