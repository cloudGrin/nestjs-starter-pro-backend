import { Global, Module } from '@nestjs/common';
import { LoggerModule } from './logger/logger.module';
import { CacheModule } from './cache/cache.module';

@Global()
@Module({
  imports: [LoggerModule, CacheModule],
  exports: [LoggerModule, CacheModule],
})
export class SharedModule {}
