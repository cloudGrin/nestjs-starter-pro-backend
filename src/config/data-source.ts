/**
 * TypeORM CLI 数据源配置
 * @description 仅供 TypeORM CLI 命令使用（如 migration:run, migration:generate）
 * @note 不要在应用代码中直接引用此文件
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { getDatabaseConfig } from './configuration';
import { resolveEnvFilePaths } from './env-files';

// 统一的环境变量加载逻辑（与 app.module.ts 保持一致）
const NODE_ENV = process.env.NODE_ENV || 'development';

// 按优先级反向加载（低优先级先加载，高优先级覆盖）
resolveEnvFilePaths(NODE_ENV)
  .slice()
  .reverse()
  .forEach((file) => {
    const envPath = join(__dirname, '..', '..', file);
    config({
      path: envPath,
      override: true,
    });
  });

// 获取数据库配置
export const dataSourceOptions = getDatabaseConfig(process.env);

// 创建数据源实例（供 TypeORM CLI 使用）
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
