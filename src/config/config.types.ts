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
  storage: 'local' | 'oss';
  uploadDir: string;
  baseUrl: string;
  maxSize: number;
  allowedTypes: string[];

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
  };
}

/**
 * 完整配置接口
 */
export interface Configuration {
  app: AppConfig;
  database: DataSourceOptions;
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
