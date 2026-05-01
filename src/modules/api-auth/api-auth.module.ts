import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ApiAppEntity } from './entities/api-app.entity';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiAccessLogEntity } from './entities/api-access-log.entity';
import { ApiAuthService } from './services/api-auth.service';
import { ApiAppController } from './controllers/api-app.controller';
import { ApiKeyStrategy } from './strategies/simple-api-key.strategy';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiAccessLogInterceptor } from './interceptors/api-access-log.interceptor';
import { OpenApiScopeRegistryService } from './services/open-api-scope-registry.service';

@Module({
  imports: [
    DiscoveryModule,
    TypeOrmModule.forFeature([ApiAppEntity, ApiKeyEntity, ApiAccessLogEntity]),
    PassportModule.register({ defaultStrategy: 'api-key' }),
  ],
  controllers: [ApiAppController],
  providers: [
    ApiAuthService,
    ApiKeyStrategy,
    ApiKeyGuard,
    ApiAccessLogInterceptor,
    OpenApiScopeRegistryService,
  ],
  exports: [ApiAuthService, ApiKeyGuard, ApiAccessLogInterceptor],
})
export class ApiAuthModule {}
