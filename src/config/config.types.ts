/**
 * 配置类型定义
 * @description 提供完整的配置类型定义，确保类型安全
 */

import { DataSourceOptions } from 'typeorm';

/**
 * 应用基础配置
 */
export interface AppConfig {
  /** 应用名称 */
  name: string;
  /** 服务端口号 */
  port: number;
  /** 运行环境 */
  environment: 'development' | 'test' | 'production';
  /** API 路径前缀 */
  apiPrefix: string;
  /** API 版本号 */
  apiVersion: string;
}

/**
 * Redis 配置
 */
export interface RedisConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
  keyPrefix: string;
}

/**
 * JWT 配置
 */
export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

/**
 * 日志配置
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  dir: string;
}

/**
 * Swagger 配置
 */
export interface SwaggerConfig {
  enable: boolean;
  title: string;
  description: string;
  version: string;
  path: string;
}

/**
 * 跨域配置
 */
export interface CorsConfig {
  origin: string | string[];
  credentials: boolean;
}

/**
 * 限流配置
 */
export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

/**
 * 文件上传配置
 */
export interface FileConfig {
  storage: 'local' | 'oss' | 'minio';
  uploadDir: string;
  tempDir: string;
  baseUrl: string;
  maxSize: number;
  allowedTypes: string[];

  chunk: {
    defaultSize: number;
    expire: number;
  };

  image: {
    compress: boolean;
    quality: number;
    maxWidth: number;
    thumbnail: {
      enable: boolean;
      width: number;
      height: number;
    };
  };

  external: {
    oss: {
      enable: boolean;
      region?: string;
      bucket?: string;
      endpoint?: string;
      accessKeyId?: string;
      accessKeySecret?: string;
      secure: boolean;
      baseUrl?: string;
    };
    minio: {
      enable: boolean;
      endPoint?: string;
      port?: number;
      useSSL: boolean;
      bucket?: string;
      accessKey?: string;
      secretKey?: string;
      baseUrl?: string;
      region?: string;
    };
  };
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  channels: {
    bark: {
      enable: boolean;
      baseUrl?: string;
      defaultKey?: string;
    };
    feishu: {
      enable: boolean;
      defaultWebhook?: string;
    };
    sms: {
      enable: boolean;
      provider?: string;
      signName?: string;
      templateId?: string;
    };
  };
}

/**
 * 完整配置接口
 */
export interface Configuration {
  app: AppConfig;
  database: DataSourceOptions;
  redis: RedisConfig;
  jwt: JwtConfig;
  logging: LoggingConfig;
  swagger: SwaggerConfig;
  cors: CorsConfig;
  throttle: ThrottleConfig;
  file: FileConfig;
  notification: NotificationConfig;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * 配置工厂函数类型
 */
export type ConfigFactory = () => Configuration;
