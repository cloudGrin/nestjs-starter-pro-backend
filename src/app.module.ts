import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { configuration } from './config/configuration';
import { configValidationSchema } from './config/config.validation';
import { SharedModule } from './shared/shared.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { CacheInterceptor } from './core/interceptors/cache.interceptor';
import { PermissionsGuard } from './core/guards/permissions.guard';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { DictModule } from './modules/dict/dict.module';
import { ExcelModule } from './modules/excel/excel.module';
import { ConfigModule as SystemConfigModule } from './modules/config/config.module';
import { FileModule } from './modules/file/file.module';
import { NotificationModule } from './modules/notification/notification.module';
import { TaskModule } from './modules/task/task.module';
import { ApiAuthModule } from './modules/api-auth/api-auth.module';
import { OpenApiModule } from './modules/open-api/open-api.module';
import { HealthModule } from './modules/health/health.module';
import { PermissionModule } from './modules/permission/permission.module';
import { MenuModule } from './modules/menu/menu.module';
import { StatisticsModule } from './modules/statistics/statistics.module';

@Module({
  imports: [
    // 配置模块（包含验证）
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      // 简化的配置加载逻辑（适合小团队）
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      load: [configuration],
      validationSchema: configValidationSchema, // 添加 Joi 验证
      validationOptions: {
        allowUnknown: false, // ⚠️  严格模式：环境变量拼写错误会报错
        abortEarly: false, // 显示所有验证错误
      },
    }),

    // 事件模块（用于模块间解耦通信）
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
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

    // 共享模块（数据库、缓存、日志等）
    SharedModule,

    // 业务模块
    AuthModule,
    UserModule,
    RoleModule,
    MenuModule,
    DictModule,
    ExcelModule,
    SystemConfigModule,
    FileModule,
    NotificationModule,
    TaskModule,
    ApiAuthModule,
    OpenApiModule,
    HealthModule,
    PermissionModule,
    StatisticsModule,
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
    // 全局缓存拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
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
