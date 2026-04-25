import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { buildCorsOptions } from './cors-options';

export interface AppBootstrapInfo {
  apiPrefix: string;
  swaggerEnabled: boolean;
  swaggerPath: string;
}

export interface ConfigureAppOptions {
  enableShutdownHooks?: boolean;
  enableSwagger?: boolean;
}

export function configureApp(
  app: INestApplication | NestExpressApplication,
  configService: ConfigService,
  options: ConfigureAppOptions = {},
): AppBootstrapInfo {
  if (configService.get<boolean>('app.trustProxy', false)) {
    (app as NestExpressApplication).set('trust proxy', true);
  }

  app.use(helmet());

  app.enableCors(
    buildCorsOptions(
      configService.get<string | string[]>('cors.origin', '*'),
      configService.get<boolean>('cors.credentials', false),
    ),
  );

  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['healthz', 'readyz'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: configService.get<string>('app.apiVersion', '1'),
  });

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

  const configSwaggerEnabled = configService.get<boolean>('swagger.enable', true);
  const swaggerEnabled = options.enableSwagger ?? configSwaggerEnabled;
  const swaggerPath = configService.get<string>('swagger.path', 'api-docs');

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('swagger.title', 'Home Admin API'))
      .setDescription(
        configService.get<string>('swagger.description', 'Home Admin API Documentation'),
      )
      .setVersion(configService.get<string>('swagger.version', '1.0.0'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document);
  }

  if (options.enableShutdownHooks ?? true) {
    app.enableShutdownHooks();
  }

  return {
    apiPrefix,
    swaggerEnabled,
    swaggerPath,
  };
}
