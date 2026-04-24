# API认证系统快速启动指南

## 🚀 启动步骤

### 1. 初始化数据库结构

```bash
pnpm run build
pnpm run migration:run
```

### 2. 启动服务器

```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

## 📋 核心功能清单

### API应用管理

- ✅ 创建API应用
- ✅ 配置权限范围（Scopes）
- ✅ 启用/停用应用

### API密钥管理

- ✅ 生成API密钥（生产/测试环境）
- ✅ 密钥安全存储（SHA256）
- ✅ 密钥过期管理
- ✅ 密钥撤销

### 认证授权

- ✅ Header认证（X-API-Key）
- ✅ 基于Scope的权限控制
- ✅ 独立于JWT用户认证

## 🔑 API端点列表

### 管理端点（需要JWT认证）

| 方法   | 端点                      | 说明         | 权限               |
| ------ | ------------------------- | ------------ | ------------------ |
| GET    | /api/v1/api-apps          | 查看应用列表 | api-app:read       |
| POST   | /api/v1/api-apps          | 创建API应用  | api-app:create     |
| GET    | /api/v1/api-apps/:id      | 查看应用详情 | api-app:read       |
| PUT    | /api/v1/api-apps/:id      | 更新API应用  | api-app:update     |
| DELETE | /api/v1/api-apps/:id      | 停用API应用  | api-app:delete     |
| POST   | /api/v1/api-apps/:id/keys | 生成API密钥  | api-app:key:create |
| GET    | /api/v1/api-apps/:id/keys | 查看应用密钥 | api-app:key:read   |
| DELETE | /api/v1/api-apps/keys/:id | 撤销密钥     | api-app:key:delete |

### 开放端点（使用API Key认证）

| 方法 | 端点               | 说明         | 所需Scope  |
| ---- | ------------------ | ------------ | ---------- |
| GET  | /api/v1/open/users | 获取用户列表 | read:users |

## 🎯 典型使用场景

### 场景1：小程序读取用户数据

```javascript
const client = new HomeApiClient('sk_live_xxxxx');

const users = await client.getUsers({ page: 1, pageSize: 20 });
```

### 场景2：数据分析平台

```javascript
// 只需要只读权限
const analyticsClient = new HomeApiClient('sk_live_read_only_key');

const users = await analyticsClient.getUsers();

// 生成报表...
```

## ⚠️ 注意事项

### 安全建议

1. **永远不要**在前端代码中使用API密钥
2. **定期轮换**API密钥（建议每3个月）
3. **使用环境变量**存储密钥，不要硬编码
4. **只给应用分配需要的 Scope**，避免扩大外部访问范围

### 性能优化

1. 使用**连接池**复用HTTP连接
2. 合理设置**超时时间**

### 最佳实践

1. 为不同环境使用不同密钥（开发/测试/生产）
2. 按功能划分Scope，实现最小权限原则
3. 实施明确的错误处理和重试机制

## 🔧 故障排查

### 问题1：401 Unauthorized

- 检查API密钥是否正确
- 确认密钥未过期
- 验证应用已激活

### 问题2：403 Forbidden

- 检查密钥是否有所需的Scope
- 确认IP不在黑名单中
- 验证IP在白名单中（如果配置了）

### 问题3：429 Too Many Requests

- 已超过速率限制
- 实施退避重试策略
- 考虑升级API配额

## 🚧 待完成功能

- [ ] OAuth 2.0支持
- [ ] GraphQL端点
- [ ] SDK发布（Node.js/Python/Go）
- [ ] 开发者门户
- [ ] API版本管理（v1/v2）
- [ ] 计费系统集成

## 📚 相关文档

- [完整集成指南](docs/api-integration-guide.md)
- [API参考文档](http://localhost:3000/api-docs)
- [架构设计文档](docs/api-architecture.md)

## 💬 获取帮助

- 内部Slack: #api-support
- Email: api-team@yourcompany.com
- GitHub Issues: [提交问题](https://github.com/yourcompany/home-server/issues)
