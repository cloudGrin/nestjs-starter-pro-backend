/**
 * 配置验证（简化版 - 适合小团队）
 * @description 使用 Joi 验证核心环境变量，确保生产环境安全
 */

import * as Joi from 'joi';

/**
 * 检查是否为不安全的默认密钥
 */
const isInsecureKey = (value: string): boolean => {
  const keywords = ['dev-', 'change-this', 'your-', 'secret-key', 'default', 'example'];
  return keywords.some((keyword) => value.toLowerCase().includes(keyword));
};

/**
 * 环境变量验证 Schema
 */
export const configValidationSchema = Joi.object({
  // ========================================
  // 应用配置
  // ========================================
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(3000),

  APP_NAME: Joi.string().default('home-server'),

  API_PREFIX: Joi.string().default('api'),

  API_VERSION: Joi.string().default('1'),

  // ========================================
  // 数据库配置
  // ========================================
  DB_HOST: Joi.string().default('localhost'),

  DB_PORT: Joi.number().port().default(3306),

  DB_USERNAME: Joi.string().default('root'),

  DB_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(8).required().messages({
      'string.min': '⚠️  DB_PASSWORD 在生产环境必须至少8个字符',
      'any.required': '⚠️  DB_PASSWORD 在生产环境是必需的',
    }),
    otherwise: Joi.string().allow('').default(''),
  }),

  DB_DATABASE: Joi.string().default('home'),

  DB_SYNCHRONIZE: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().valid(false).messages({
      'any.only': '⚠️  生产环境必须关闭 DB_SYNCHRONIZE，避免意外的数据库结构变更',
    }),
    otherwise: Joi.boolean().default(false),
  }),

  DB_LOGGING: Joi.boolean().default(false),

  DB_DROP_SCHEMA: Joi.boolean().default(false),

  DB_CONNECTION_LIMIT: Joi.number().min(1).max(100).default(10),

  DB_CONNECTION_TIMEOUT: Joi.number().default(60000),

  DB_ACQUIRE_TIMEOUT: Joi.number().default(60000),

  DB_QUERY_TIMEOUT: Joi.number().default(60000),

  // ========================================
  // Redis 配置
  // ========================================
  REDIS_HOST: Joi.string().default('localhost'),

  REDIS_PORT: Joi.number().port().default(6379),

  REDIS_DB: Joi.number().min(0).max(15).default(0),

  REDIS_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(8).required().messages({
      'string.min': '⚠️  REDIS_PASSWORD 在生产环境必须至少8个字符',
      'any.required': '⚠️  无密码的 Redis 存在严重安全风险，生产环境必须设置密码',
    }),
    otherwise: Joi.string().allow('').optional(),
  }),

  REDIS_KEY_PREFIX: Joi.string().default('home:'),

  // ========================================
  // JWT 配置（核心安全检查）
  // ========================================
  JWT_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(32)
      .required()
      .custom((value, helpers) => {
        if (isInsecureKey(value)) {
          return helpers.error('jwt.insecure');
        }
        return value;
      })
      .messages({
        'string.min': '⚠️  JWT_SECRET 在生产环境必须至少32个字符',
        'any.required': '⚠️  JWT_SECRET 在生产环境是必需的',
        'jwt.insecure': '⚠️  JWT_SECRET 使用了不安全的默认值，请使用强密钥（如 openssl rand -base64 32）',
      }),
    otherwise: Joi.string().min(8).default('dev-secret-key-change-this'),
  }),

  JWT_EXPIRES_IN: Joi.string().default('7d'),

  JWT_REFRESH_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(32)
      .required()
      .custom((value, helpers) => {
        if (isInsecureKey(value)) {
          return helpers.error('jwt.refresh.insecure');
        }
        // 检查是否与 JWT_SECRET 相同
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret && value === jwtSecret) {
          return helpers.error('jwt.refresh.duplicate');
        }
        return value;
      })
      .messages({
        'string.min': '⚠️  JWT_REFRESH_SECRET 在生产环境必须至少32个字符',
        'any.required': '⚠️  JWT_REFRESH_SECRET 在生产环境是必需的',
        'jwt.refresh.insecure': '⚠️  JWT_REFRESH_SECRET 使用了不安全的默认值，请使用强密钥',
        'jwt.refresh.duplicate': '⚠️  JWT_REFRESH_SECRET 不能与 JWT_SECRET 相同',
      }),
    otherwise: Joi.string().min(8).default('dev-refresh-secret-change-this'),
  }),

  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // ========================================
  // 日志配置
  // ========================================
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').default('debug'),

  LOG_DIR: Joi.string().default('./logs'),

  // ========================================
  // Swagger 配置
  // ========================================
  SWAGGER_ENABLE: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().valid(false).messages({
      'any.only': '⚠️  生产环境建议关闭 Swagger 文档（设置 SWAGGER_ENABLE=false）',
    }),
    otherwise: Joi.boolean().default(true),
  }),

  SWAGGER_TITLE: Joi.string().default('home API'),

  SWAGGER_DESCRIPTION: Joi.string().default('home Backend Management System API Documentation'),

  SWAGGER_VERSION: Joi.string().default('1.0.0'),

  SWAGGER_PATH: Joi.string().default('api-docs'),

  // ========================================
  // CORS 配置（生产环境严格检查）
  // ========================================
  CORS_ORIGIN: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .required()
      .custom((value, helpers) => {
        if (value === '*') {
          return helpers.error('cors.wildcard');
        }
        return value;
      })
      .messages({
        'any.required': '⚠️  CORS_ORIGIN 在生产环境是必需的',
        'cors.wildcard': '⚠️  CORS_ORIGIN 在生产环境不能设置为 *，请指定具体域名',
      }),
    otherwise: Joi.string().default('*'),
  }),

  CORS_CREDENTIALS: Joi.boolean().default(false),

  // ========================================
  // 限流配置
  // ========================================
  THROTTLE_TTL: Joi.number().min(1).default(60),

  THROTTLE_LIMIT: Joi.number().min(1).default(100),

  // ========================================
  // 文件配置（简化版 - 只保留核心配置）
  // ========================================
  FILE_STORAGE: Joi.string().valid('local', 'oss', 'minio').default('local'),

  FILE_UPLOAD_DIR: Joi.string().default('uploads'),

  FILE_TEMP_DIR: Joi.string().default('uploads/temp'),

  FILE_BASE_URL: Joi.string().default('/uploads'),

  FILE_MAX_SIZE: Joi.number().min(1024).default(52428800), // 50MB

  FILE_ALLOWED_TYPES: Joi.string().default(
    '.jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip',
  ),

  // 文件分片配置
  FILE_CHUNK_SIZE: Joi.number().min(1024 * 1024).default(5242880), // 5MB

  FILE_CHUNK_EXPIRE: Joi.number().min(60).default(86400), // 24小时

  // 图片处理配置
  FILE_IMAGE_COMPRESS: Joi.boolean().default(false),

  FILE_IMAGE_QUALITY: Joi.number().min(1).max(100).default(80),

  FILE_IMAGE_MAX_WIDTH: Joi.number().min(100).default(1920),

  FILE_IMAGE_THUMBNAIL_ENABLE: Joi.boolean().default(false),

  FILE_IMAGE_THUMBNAIL_WIDTH: Joi.number().min(50).default(320),

  FILE_IMAGE_THUMBNAIL_HEIGHT: Joi.number().min(50).default(320),

  // OSS 配置（可选）
  FILE_OSS_ENABLE: Joi.boolean().default(false),
  FILE_OSS_REGION: Joi.string().optional(),
  FILE_OSS_BUCKET: Joi.string().optional(),
  FILE_OSS_ENDPOINT: Joi.string().optional(),
  FILE_OSS_ACCESS_KEY_ID: Joi.string().optional(),
  FILE_OSS_ACCESS_KEY_SECRET: Joi.string().optional(),
  FILE_OSS_SECURE: Joi.boolean().default(true),
  FILE_OSS_BASE_URL: Joi.string().optional(),

  // MinIO 配置（可选）
  FILE_MINIO_ENABLE: Joi.boolean().default(false),
  FILE_MINIO_ENDPOINT: Joi.string().optional(),
  FILE_MINIO_PORT: Joi.number().optional(),
  FILE_MINIO_USE_SSL: Joi.boolean().default(true),
  FILE_MINIO_BUCKET: Joi.string().optional(),
  FILE_MINIO_ACCESS_KEY: Joi.string().optional(),
  FILE_MINIO_SECRET_KEY: Joi.string().optional(),
  FILE_MINIO_BASE_URL: Joi.string().optional(),
  FILE_MINIO_REGION: Joi.string().optional(),

  // ========================================
  // 通知配置（简化）
  // ========================================
  NOTIFY_BARK_ENABLE: Joi.boolean().default(false),
  NOTIFY_BARK_BASE_URL: Joi.string().optional(),
  NOTIFY_BARK_DEFAULT_KEY: Joi.string().optional(),

  NOTIFY_FEISHU_ENABLE: Joi.boolean().default(false),
  NOTIFY_FEISHU_WEBHOOK: Joi.string().optional(),

  NOTIFY_SMS_ENABLE: Joi.boolean().default(false),
  NOTIFY_SMS_PROVIDER: Joi.string().optional(),
  NOTIFY_SMS_SIGN_NAME: Joi.string().optional(),
  NOTIFY_SMS_TEMPLATE_ID: Joi.string().optional(),

  // ========================================
  // 在线用户配置
  // ========================================
  ONLINE_USER_TTL: Joi.number().min(60).default(3600),

  ONLINE_USER_MAX_SESSIONS: Joi.number().min(1).default(1),

  ONLINE_USER_KICKOUT_OLDEST: Joi.boolean().default(true),

  // ========================================
  // 验证码配置
  // ========================================
  CAPTCHA_REQUIRE_LOGIN: Joi.boolean().default(true),

  // 图形验证码
  CAPTCHA_IMAGE_TTL: Joi.number().min(60).default(300),
  CAPTCHA_IMAGE_LENGTH: Joi.number().min(4).max(8).default(4),
  CAPTCHA_IMAGE_NOISE: Joi.number().min(0).max(10).default(2),
  CAPTCHA_IMAGE_WIDTH: Joi.number().min(80).default(120),
  CAPTCHA_IMAGE_HEIGHT: Joi.number().min(30).default(40),
  CAPTCHA_IMAGE_IGNORE_CHARS: Joi.string().default('0o1ilI'),

  // 短信验证码
  CAPTCHA_SMS_TTL: Joi.number().min(60).default(300),
  CAPTCHA_SMS_LIMIT: Joi.number().min(30).default(60),
  CAPTCHA_SMS_LENGTH: Joi.number().min(4).max(8).default(6),

  // 邮箱验证码
  CAPTCHA_EMAIL_TTL: Joi.number().min(60).default(300),
  CAPTCHA_EMAIL_LIMIT: Joi.number().min(30).default(60),
  CAPTCHA_EMAIL_LENGTH: Joi.number().min(4).max(8).default(6),
}).unknown(true); // 允许未声明的环境变量
