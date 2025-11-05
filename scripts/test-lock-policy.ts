#!/usr/bin/env node
import axios from 'axios';

/**
 * 账户锁定策略测试脚本
 *
 * 用途：自动测试账户锁定策略是否正确工作
 *
 * 使用方法：
 *   npm run test:lock-policy
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';

// 测试配置
const TESTS = {
  normalUser: {
    account: 'testuser',
    maxAttempts: 5,
    lockMinutes: 30,
  },
  superAdmin: {
    account: 'admin',
    maxAttempts: 10,
    lockMinutes: 10,
  },
};

/**
 * 模拟登录失败
 */
async function attemptLogin(account: string, password: string): Promise<any> {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      account,
      password,
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    };
  }
}

/**
 * 测试用户锁定策略
 */
async function testUserLockPolicy(
  account: string,
  maxAttempts: number,
  lockMinutes: number,
  userType: string
) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 测试 ${userType} 锁定策略`);
  console.log(`   账户: ${account}`);
  console.log(`   预期失败次数: ${maxAttempts}次`);
  console.log(`   预期锁定时长: ${lockMinutes}分钟`);
  console.log('='.repeat(60));

  let locked = false;
  let lockMessage = '';

  // 尝试多次登录失败
  for (let i = 1; i <= maxAttempts + 2; i++) {
    console.log(`\n[尝试 ${i}/${maxAttempts + 2}] 输入错误密码...`);

    const result = await attemptLogin(account, 'wrong_password_123');

    if (result.success) {
      console.log('❌ 测试失败：不应该登录成功');
      return false;
    }

    console.log(`   状态码: ${result.status}`);
    console.log(`   错误信息: ${result.message}`);

    // 检查是否被锁定
    if (result.message?.includes('锁定') || result.message?.includes('locked')) {
      locked = true;
      lockMessage = result.message;
      console.log(`\n✅ 账户已在第 ${i} 次尝试后被锁定`);
      break;
    }

    // 等待500ms避免请求过快
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // 验证锁定时机
  if (!locked) {
    console.log(`\n❌ 测试失败：账户未被锁定（预期在第 ${maxAttempts} 次失败后锁定）`);
    return false;
  }

  // 验证锁定时长提示
  if (lockMessage.includes(`${lockMinutes}分钟`)) {
    console.log(`✅ 锁定时长提示正确: ${lockMinutes}分钟`);
  } else {
    console.log(`⚠️  警告：锁定提示中未找到 "${lockMinutes}分钟" 字样`);
    console.log(`   实际消息: ${lockMessage}`);
  }

  console.log('\n📊 测试结果: 通过 ✓');
  return true;
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('\n🚀 开始测试账户锁定策略');
  console.log(`   API地址: ${API_BASE}`);
  console.log(`   测试时间: ${new Date().toLocaleString('zh-CN')}\n`);

  const results: { name: string; passed: boolean }[] = [];

  // 测试1：普通用户锁定策略
  try {
    const passed = await testUserLockPolicy(
      TESTS.normalUser.account,
      TESTS.normalUser.maxAttempts,
      TESTS.normalUser.lockMinutes,
      '普通用户'
    );
    results.push({ name: '普通用户锁定策略', passed });
  } catch (error: any) {
    console.error(`\n❌ 测试异常:`, error.message);
    results.push({ name: '普通用户锁定策略', passed: false });
  }

  // 等待2秒
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 测试2：超级管理员锁定策略
  try {
    const passed = await testUserLockPolicy(
      TESTS.superAdmin.account,
      TESTS.superAdmin.maxAttempts,
      TESTS.superAdmin.lockMinutes,
      '超级管理员'
    );
    results.push({ name: '超级管理员锁定策略', passed });
  } catch (error: any) {
    console.error(`\n❌ 测试异常:`, error.message);
    results.push({ name: '超级管理员锁定策略', passed: false });
  }

  // 输出测试总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 测试总结');
  console.log('='.repeat(60));

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.name}: ${result.passed ? '通过' : '失败'}`);
  });

  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;

  console.log(`\n总计: ${passedCount}/${results.length} 通过`);

  if (allPassed) {
    console.log('\n🎉 所有测试通过！账户锁定策略工作正常。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置。');
  }

  console.log('\n💡 提示：测试完成后，请使用以下命令解锁测试账户：');
  console.log(`   npm run unlock-user ${TESTS.normalUser.account}`);
  console.log(`   npm run unlock-user ${TESTS.superAdmin.account}`);
  console.log();

  process.exit(allPassed ? 0 : 1);
}

// 运行测试
runTests().catch((error) => {
  console.error('\n💥 测试运行失败:', error);
  process.exit(1);
});
