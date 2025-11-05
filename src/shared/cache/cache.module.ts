import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { redisStore } from 'cache-manager-ioredis-yet';
import { CacheService } from './cache.service';
import { CacheClearService } from './cache-clear.service';
import { UserEntity } from '~/modules/user/entities/user.entity';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        return {
          store: await redisStore({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
            keyPrefix: redisConfig.keyPrefix,
            ttl: 60 * 60 * 24 * 7, // 默认7天
          }),
        };
      },
    }),
    TypeOrmModule.forFeature([UserEntity]),
  ],
  providers: [CacheService, CacheClearService],
  exports: [CacheService, CacheClearService, NestCacheModule],
})
export class CacheModule {}
