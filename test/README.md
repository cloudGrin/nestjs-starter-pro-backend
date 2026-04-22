# E2E 测试指南

本目录包含Home项目的端到端（E2E）测试。

## 📋 前置要求

- Docker Desktop 已安装并运行
- Node.js 和 pnpm 已安装

## 🚀 快速开始

### 1. 启动测试环境

```bash
# 方式1: 使用npm脚本（推荐）
pnpm test:env:up

# 方式2: 直接运行脚本
./scripts/test-env-up.sh
```

这将启动：

- MySQL 测试数据库 (端口: 3307)

### 2. 运行E2E测试

```bash
# 运行所有E2E测试
pnpm test:e2e

# 监听模式（文件变化自动重新运行）
pnpm test:e2e:watch

# 生成覆盖率报告
pnpm test:e2e:cov
```

### 3. 停止测试环境

```bash
# 停止容器（保留数据）
pnpm test:env:down

# 完全清理（删除数据）
pnpm test:env:clean
```

## 📁 文件结构

```
test/
├── README.md                 # 本文件
├── jest-e2e.json            # Jest E2E配置
├── setup.ts                 # 全局测试设置
├── test-helper.ts           # 测试辅助函数
└── auth.e2e-spec.ts         # 认证模块E2E测试
```

## 🔧 配置文件

### Docker配置

- `docker-compose.test.yml` - Docker服务配置

### 环境变量

- `.env.test` - E2E测试环境变量
  - MySQL: localhost:3307
  - 用户名/密码已预配置

## 📝 测试编写指南

### 使用测试辅助函数

```typescript
import {
  createTestApp,
  registerTestUser,
  loginTestUser,
  generateTestUsername,
  generateTestEmail,
  authenticatedRequest,
} from './test-helper';

describe('我的功能 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('应该测试某个功能', async () => {
    // 注册测试用户
    const userData = {
      username: generateTestUsername(),
      email: generateTestEmail(),
      password: 'Test@123456',
    };

    const { accessToken } = await registerTestUser(app, userData);

    // 发送认证请求
    const response = await authenticatedRequest(app, accessToken)
      .get('/some-protected-route')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

### 测试命名规范

- 文件名：`*.e2e-spec.ts`
- 测试组名：`模块名 (e2e)`
- 测试用例：使用中文描述期望行为

## 🐛 常见问题

### 问题1: Docker服务未启动

**错误**：`Cannot connect to the Docker daemon`

**解决**：确保Docker Desktop正在运行

### 问题2: 端口冲突

**错误**：`Port 3307 is already in use`

**解决**：

1. 停止本地MySQL服务
2. 或修改`docker-compose.test.yml`中的端口映射

### 问题3: 测试数据污染

**问题**：测试之间相互影响

**解决**：

```bash
# 清理并重启测试环境
pnpm test:env:clean
pnpm test:env:up
```

### 问题4: 数据库连接失败

**错误**：`ECONNREFUSED 127.0.0.1:3307`

**解决**：

1. 确认容器已启动：`docker ps | grep home`
2. 检查容器日志：`docker logs home-mysql-test`
3. 等待健康检查通过（约5-10秒）

## 📊 当前测试覆盖

| 模块              | 测试数量 | 状态 |
| ----------------- | -------- | ---- |
| 认证 (auth)       | 29个     | ✅   |
| 用户 (user)       | 待开发   | 📋   |
| 权限 (permission) | 待开发   | 📋   |

## 🎯 测试最佳实践

1. **独立性**：每个测试应该独立运行，不依赖其他测试
2. **清理**：使用唯一标识符（timestamp）避免数据冲突
3. **断言**：验证HTTP状态码、响应结构和业务逻辑
4. **性能**：避免不必要的数据库操作，使用事务隔离
5. **可读性**：使用清晰的测试描述和注释

## 🔗 相关资源

- [NestJS Testing文档](https://docs.nestjs.com/fundamentals/testing)
- [Jest文档](https://jestjs.io/docs/getting-started)
- [Supertest文档](https://github.com/visionmedia/supertest)
- [项目测试进度](../docs/plans/testing-progress.md)
