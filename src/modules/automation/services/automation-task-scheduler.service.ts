import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { CronJob } from 'cron';
import { SchedulerRegistry } from '@nestjs/schedule';
import { LoggerService } from '~/shared/logger/logger.service';
import { AutomationTaskTriggerType } from '../entities/automation-task-log.entity';
import { AutomationTaskExecutorService } from './automation-task-executor.service';
import { AutomationTaskService } from './automation-task.service';

const JOB_PREFIX = 'automation:';

@Injectable()
export class AutomationTaskSchedulerService implements OnApplicationBootstrap {
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly taskService: AutomationTaskService,
    private readonly executor: AutomationTaskExecutorService,
    private readonly logger: LoggerService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.taskService.ensureDefaultConfigs();
    await this.executor.recoverInterruptedTasks();
    await this.rebuildSchedules();
  }

  async rebuildSchedules(): Promise<void> {
    this.clearAutomationJobs();
    const configs = await this.taskService.findEnabledConfigs();

    for (const config of configs) {
      const jobName = this.jobName(config.taskKey);
      const job = CronJob.from({
        cronTime: config.cronExpression,
        onTick: async () => {
          await this.executor.execute(config.taskKey, AutomationTaskTriggerType.SCHEDULE);
        },
        start: false,
      });
      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();
      this.logger.log(`Registered automation cron "${config.taskKey}" (${config.cronExpression})`);
    }
  }

  private clearAutomationJobs(): void {
    for (const name of this.schedulerRegistry.getCronJobs().keys()) {
      if (name.startsWith(JOB_PREFIX)) {
        this.schedulerRegistry.deleteCronJob(name);
      }
    }
  }

  private jobName(taskKey: string): string {
    return `${JOB_PREFIX}${taskKey}`;
  }
}
