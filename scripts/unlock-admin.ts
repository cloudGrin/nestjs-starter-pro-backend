#!/usr/bin/env node
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * CLI 工具：解锁被锁定的用户账户
 *
 * 使用方法:
 *   npm run unlock-user              # 解锁 admin 用户（默认）
 *   npm run unlock-user admin        # 解锁指定用户
 *   npm run unlock-user zhangsan     # 解锁指定用户
 */

// 从命令行参数获取用户名，默认为 admin
const username = process.argv[2] || 'admin';

async function unlockUser(username: string) {
  // 创建数据源
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'home_test',
  });

  try {
    console.log('🔗 正在连接数据库...');
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    // 查询用户状态
    const users = await dataSource.query(
      `SELECT id, username, loginAttempts, lockedUntil, status FROM users WHERE username = ?`,
      [username]
    );

    if (!users || users.length === 0) {
      console.error(`❌ 未找到用户名为 "${username}" 的账户`);
      console.log('\n💡 提示：请检查用户名是否正确');
      return;
    }

    const user = users[0];
    console.log('📋 当前状态:');
    console.log(`   用户ID: ${user.id}`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   登录失败次数: ${user.loginAttempts}`);
    console.log(`   锁定截止时间: ${user.lockedUntil || '未锁定'}`);
    console.log(`   账户状态: ${user.status}\n`);

    // 检查是否需要解锁
    if (user.loginAttempts === 0 && !user.lockedUntil) {
      console.log('ℹ️  该账户未被锁定，无需解锁');
      return;
    }

    // 解锁账户
    await dataSource.query(
      `UPDATE users SET loginAttempts = 0, lockedUntil = NULL WHERE username = ?`,
      [username]
    );

    console.log(`✅ 用户 "${username}" 已解锁！`);
    console.log('   - 登录失败次数已重置为 0');
    console.log('   - 锁定时间已清除\n');

    // 清理 Redis 中的登录失败记录（提示）
    const redisPort = process.env.REDIS_PORT || '6379';
    const redisPassword = process.env.REDIS_PASSWORD;
    console.log('💡 提示：如果仍然无法登录，可手动清理 Redis 缓存：');
    if (redisPassword) {
      console.log(`   redis-cli -p ${redisPort} -a ${redisPassword} DEL "login:attempts:user:${username}"`);
    } else {
      console.log(`   redis-cli -p ${redisPort} DEL "login:attempts:user:${username}"`);
    }

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 执行
console.log(`\n🔓 用户解锁工具 - 正在解锁用户: ${username}\n`);
console.log('─'.repeat(50));

unlockUser(username)
  .then(() => {
    console.log('─'.repeat(50));
    console.log('\n🎉 操作完成！现在可以重新登录了。\n');
    process.exit(0);
  })
  .catch((error) => {
    console.log('─'.repeat(50));
    console.error('\n💥 发生错误:', error);
    console.log('\n📞 如需帮助，请查看文档或联系管理员\n');
    process.exit(1);
  });
