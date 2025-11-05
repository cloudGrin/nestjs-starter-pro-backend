import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from './shared/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  // 设置自定义日志
  app.useLogger(logger);

  // 安全中间件
  app.use(helmet());

  // 启用 CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: configService.get<boolean>('CORS_CREDENTIALS', true),
  });

  // 设置全局前缀
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // 启用版本控制
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get<string>('API_VERSION', '1'),
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger 文档
  if (configService.get<boolean>('SWAGGER_ENABLE', true)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('SWAGGER_TITLE', 'home API'))
      .setDescription(
        configService.get<string>(
          'SWAGGER_DESCRIPTION',
          'home Backend Management System API Documentation',
        ),
      )
      .setVersion(configService.get<string>('SWAGGER_VERSION', '1.0.0'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    const swaggerPath = configService.get<string>('SWAGGER_PATH', 'api-docs');
    SwaggerModule.setup(swaggerPath, app, document);
  }

  // 优雅关闭
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);

  if (configService.get<boolean>('SWAGGER_ENABLE', true)) {
    const swaggerPath = configService.get<string>('SWAGGER_PATH', 'api-docs');
    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/${swaggerPath}`);
  }
}

bootstrap();
