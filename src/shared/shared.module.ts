import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { LoggerModule } from './logger/logger.module';
import { CacheModule } from './cache/cache.module';

@Global()
@Module({
  imports: [DatabaseModule, LoggerModule, CacheModule],
  exports: [DatabaseModule, LoggerModule, CacheModule],
})
export class SharedModule {}
