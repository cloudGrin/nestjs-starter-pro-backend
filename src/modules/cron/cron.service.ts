import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoggerService } from '~/shared/logger/logger.service';
import { AuthService } from '~/modules/auth/services/auth.service';

/**
 * Code-defined cron extension point.
 *
 * Add concrete @Cron methods here when a real background job is needed. Avoid
 * reintroducing DB task definitions or runtime task management for this app.
 */
@Injectable()
export class CronService {
  constructor(
    private readonly logger: LoggerService,
    private readonly authService: AuthService,
  ) {}

  @Cron('0 3 * * *')
  async cleanupExpiredRefreshTokens(): Promise<void> {
    try {
      await this.authService.cleanupExpiredTokens();
    } catch (error) {
      this.logJobError('cleanupExpiredRefreshTokens', error);
    }
  }

  logJobError(jobName: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Cron job "${jobName}" failed: ${message}`, undefined, CronService.name);
  }
}
