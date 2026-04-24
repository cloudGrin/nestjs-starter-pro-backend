import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerService } from './shared/logger/logger.service';
import { buildCorsOptions } from './bootstrap/cors-options';

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
  app.enableCors(
    buildCorsOptions(
      configService.get<string | string[]>('cors.origin', '*'),
      configService.get<boolean>('cors.credentials', false),
    ),
  );

  // 设置全局前缀
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['healthz', 'readyz'],
  });

  // 启用版本控制
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get<string>('app.apiVersion', '1'),
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
  const swaggerEnabled = configService.get<boolean>('swagger.enable', true);
  const swaggerTitle = configService.get<string>('swagger.title', 'home API');
  const swaggerDescription = configService.get<string>(
    'swagger.description',
    'home Backend Management System API Documentation',
  );
  const swaggerVersion = configService.get<string>('swagger.version', '1.0.0');
  const swaggerPath = configService.get<string>('swagger.path', 'api-docs');

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(swaggerTitle)
      .setDescription(swaggerDescription)
      .setVersion(swaggerVersion)
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document);
  }

  // 优雅关闭
  app.enableShutdownHooks();

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);

  if (swaggerEnabled) {
    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/${swaggerPath}`);
  }
}

bootstrap();
