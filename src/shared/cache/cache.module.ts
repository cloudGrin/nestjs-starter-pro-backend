import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheService } from './cache.service';
import { CacheClearService } from './cache-clear.service';
import { UserEntity } from '~/modules/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [CacheService, CacheClearService],
  exports: [CacheService, CacheClearService],
})
export class CacheModule {}
