/**
 * E2E 测试全局设置
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// 加载测试环境变量（覆盖已存在的环境变量）
const envPath = resolve(__dirname, '../.env.test');
config({ path: envPath, override: true });

// 设置测试超时时间
jest.setTimeout(30000);

// 全局beforeAll - 在所有测试开始前执行
beforeAll(async () => {
  // 验证环境变量是否加载
  if (!process.env.DB_HOST) {
    throw new Error('❌ 测试环境变量未正确加载，请检查 .env.test 文件');
  }
});

// 全局afterAll - 在所有测试结束后执行
afterAll(async () => {
  // 清理测试数据（如果需要）
  // 注意：数据库会在Docker容器中，可以通过重启容器来清理
});
