import { Module } from '@nestjs/common';
import { OpenApiController } from './controllers/open-api.controller';
import { ApiAuthModule } from '../api-auth/api-auth.module';

@Module({
  imports: [
    ApiAuthModule, // 引入API认证模块
  ],
  controllers: [OpenApiController],
})
export class OpenApiModule {}