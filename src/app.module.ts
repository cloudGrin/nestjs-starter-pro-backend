import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration } from './config/configuration';
import { configValidationSchema } from './config/config.validation';
import { resolveEnvFilePaths } from './config/env-files';
import { DatabaseModule } from './shared/database/database.module';
import { SharedModule } from './shared/shared.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { PermissionsGuard } from './core/guards/permissions.guard';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { FileModule } from './modules/file/file.module';
import { NotificationModule } from './modules/notification/notification.module';
import { CronModule } from './modules/cron/cron.module';
import { ApiAuthModule } from './modules/api-auth/api-auth.module';
import { OpenApiModule } from './modules/open-api/open-api.module';
import { HealthModule } from './modules/health/health.module';
import { PermissionModule } from './modules/permission/permission.module';
import { MenuModule } from './modules/menu/menu.module';

@Module({
  imports: [
    // 配置模块（包含验证）
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: resolveEnvFilePaths(process.env.NODE_ENV),
      load: [configuration],
      validationSchema: configValidationSchema, // 添加 Joi 验证
      validationOptions: {
        // 允许 PATH、HOME 等宿主环境变量通过；项目配置键仍由 schema 和架构测试约束。
        allowUnknown: true,
        abortEarly: false, // 显示所有验证错误
      },
    }),

    // 限流模块（使用配置服务动态配置）
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const throttleConfig = configService.get('throttle');
        return [
          {
            // ttl 在配置中是秒，ThrottlerModule 需要毫秒
            ttl: throttleConfig.ttl * 1000,
            limit: throttleConfig.limit,
          },
        ];
      },
    }),

    // 数据库连接只在根模块初始化，避免被 SharedModule 泛化为共享能力。
    DatabaseModule,

    // 共享模块（缓存、日志等）
    SharedModule,

    // 业务模块
    AuthModule,
    UserModule,
    RoleModule,
    MenuModule,
    FileModule,
    NotificationModule,
    CronModule,
    ApiAuthModule,
    OpenApiModule,
    HealthModule,
    PermissionModule,
  ],
  providers: [
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 全局响应转换拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // 全局日志拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // 全局JWT认证守卫（必须在权限守卫之前）
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 全局JWT认证守卫（必须在权限守卫之前）
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 全局权限守卫
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
