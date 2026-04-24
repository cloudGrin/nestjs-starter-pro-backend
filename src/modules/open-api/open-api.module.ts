import { Module } from '@nestjs/common';
import { OpenApiController } from './controllers/open-api.controller';
import { ApiAuthModule } from '../api-auth/api-auth.module';
import { UserModule } from '../user/user.module';
import { OpenApiUserService } from './services/open-api-user.service';

@Module({
  imports: [
    ApiAuthModule, // 引入API认证模块
    UserModule,
  ],
  controllers: [OpenApiController],
  providers: [OpenApiUserService],
})
export class OpenApiModule {}
