import { Injectable } from '@nestjs/common';
import { LoggerService } from '~/shared/logger/logger.service';

/**
 * Code-defined cron extension point.
 *
 * Add concrete @Cron methods here when a real background job is needed. Avoid
 * reintroducing DB task definitions or runtime task management for this app.
 */
@Injectable()
export class CronService {
  constructor(private readonly logger: LoggerService) {}

  logJobError(jobName: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Cron job "${jobName}" failed: ${message}`, undefined, CronService.name);
  }
}
