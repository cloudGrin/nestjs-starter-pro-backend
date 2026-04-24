import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ApiAppEntity } from './entities/api-app.entity';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiAuthService } from './services/api-auth.service';
import { ApiAppController } from './controllers/api-app.controller';
import { ApiKeyStrategy } from './strategies/simple-api-key.strategy';
import { ApiKeyGuard } from './guards/api-key.guard';
import { SharedModule } from '~/shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiAppEntity, ApiKeyEntity]),
    PassportModule.register({ defaultStrategy: 'api-key' }),
    SharedModule, // 包含CacheService
  ],
  controllers: [ApiAppController],
  providers: [ApiAuthService, ApiKeyStrategy, ApiKeyGuard],
  exports: [ApiAuthService, ApiKeyGuard],
})
export class ApiAuthModule {}
