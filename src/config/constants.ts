/**
 * 配置系统常量定义（简化版）
 * @description 只保留必要的常量，避免过度设计
 */

/**
 * 环境定义
 */
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];
