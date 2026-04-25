import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { LoggerService } from './shared/logger/logger.service';
import { configureApp } from './bootstrap/configure-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  // 设置自定义日志
  app.useLogger(logger);

  const { apiPrefix, swaggerEnabled, swaggerPath } = configureApp(app, configService);

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);

  if (swaggerEnabled) {
    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/${swaggerPath}`);
  }
}

bootstrap();
