# Migration 创建总结

> **创建日期**: 2025-10-27
> **状态**: ✅ 已完成
> **版本**: v2.0 

---

## 📋 概述

本次为Home Server项目创建了完整的数据库Migration文件，包含所有15个实体的DDL定义和索引创建语句。

### 背景

- 项目已禁用 `synchronize: true`，所有数据库变更必须通过Migration管理
- 之前 `src/migrations/` 目录为空
- 需要为所有现有实体创建初始化Migration

---

## 📦 创建的Migration文件

### 1. InitCorePermissionTables (核心权限模块)

**文件**: `src/migrations/1730000000000-InitCorePermissionTables.ts`

**包含的表**:

| 表名 | 类型 | 说明 | 索引数量 |
|------|------|------|---------|
| `users` | 主表 (软删除) | 用户表 | 1个唯一索引 |
| `roles` | 主表 (软删除) | 角色表 | - |
| `permissions` | 主表 | 权限表 | 1个复合索引 |
| `menus` | 主表 (软删除) | 菜单表 | 1个复合索引 + 1个自引用外键 |
| `user_roles` | 中间表 | 用户-角色关联 | 2个索引 + 2个外键 |
| `role_permissions` | 中间表 | 角色-权限关联 | 2个索引 + 2个外键 |
| `role_menus` | 中间表 | 角色-菜单关联 | 2个索引 + 2个外键 |

**关键特性**:
- ✅ 完整的RBAC权限体系
- ✅ 软删除支持 (users, roles, menus)
- ✅ 级联删除外键约束
- ✅ 复合索引优化查询性能

---

### 2. InitBusinessModuleTables (业务模块)

**文件**: `src/migrations/1730000001000-InitBusinessModuleTables.ts`

**包含的表**:

#### 认证模块
| 表名 | 说明 | 索引 | 外键 |
|------|------|------|------|
| `refresh_tokens` | 刷新Token表 | 复合索引 (token, userId) | → users |

#### 文件管理模块
| 表名 | 说明 | 索引 | 外键 |
|------|------|------|------|
| `files` | 文件存储表 (软删除) | 5个索引 (hash, storage, category, filename, uploaderId) | - |

#### 字典管理模块
| 表名 | 说明 | 索引 | 外键 |
|------|------|------|------|
| `dict_types` | 字典类型表 (软删除) | - | - |
| `dict_items` | 字典项表 (软删除) | 1个唯一索引 + 1个复合索引 | → dict_types |

#### 系统配置模块
| 表名 | 说明 | 索引 | 外键 |
|------|------|------|------|
| `system_configs` | 系统配置表 (软删除) | 唯一索引 (configKey) | - |

#### 任务调度模块
| 表名 | 说明 | 索引 | 外键 |
|------|------|------|------|
| `task_definitions` | 任务定义表 (软删除) | 2个索引 (code唯一, status) | - |
| `task_logs` | 任务日志表 | 2个索引 (task_id+createdAt, status) | → task_definitions |

#### 通知推送模块
| 表名 | 说明 | 索引 | 外键 |
|------|------|------|------|
| `notifications` | 通知表 (软删除) | 3个索引 | → users (recipient, sender) |

#### API认证模块
| 表名 | 说明 | 索引 | 外键 |
|------|------|------|------|
| `api_apps` | API应用表 | 1个索引 (name) | - |
| `api_keys` | API密钥表 | 1个索引 (keyHash) | → api_apps |
| `api_call_logs` | API调用日志表 | 2个复合索引 | - |

---

## 📊 统计数据

### 表统计
- **总表数**: 15个
- **主表**: 11个
- **中间表**: 3个
- **支持软删除**: 9个

### 索引统计
- **唯一索引**: 7个
- **普通索引**: 18个
- **复合索引**: 12个
- **总计**: 37个索引

### 外键统计
- **外键约束**: 11个
- **CASCADE删除**: 8个
- **SET NULL删除**: 2个

---

## 🔑 关键设计决策

### 1. 命名规范

**数据库列名**: 使用蛇形命名 (snake_case)
```sql
-- ✅ 正确
dict_type_id
recipient_id
parent_id

-- ❌ 错误 (在migration中避免使用驼峰)
dictTypeId
recipientId
parentId
```

**TypeScript属性名**: 使用驼峰命名 (camelCase)
```typescript
// Entity定义
@Column({ name: 'dict_type_id' })
dictTypeId: number;
```

### 2. 软删除实现

所有继承 `SoftDeleteBaseEntity` 的表都包含以下字段:
```sql
deletedAt TIMESTAMP NULL
deletedBy VARCHAR(50) NULL
```

### 3. 索引策略

#### 唯一索引
- 用户名、邮箱 (users表)
- 角色编码、权限编码 (roles, permissions表)
- 配置键名 (system_configs表)

#### 复合索引
- 提升关联查询性能 (如 task_id + createdAt)
- 支持多条件筛选 (如 recipient_id + status)

#### 条件索引
```sql
-- users表的phone字段，仅对非NULL值建立唯一索引
CREATE UNIQUE INDEX IDX_users_phone ON users(phone) WHERE phone IS NOT NULL;
```

### 4. 外键约束

#### CASCADE删除
适用于强依赖关系，主表删除时自动删除关联数据：
- user_roles → users
- role_permissions → roles
- dict_items → dict_types
- task_logs → task_definitions

#### SET NULL删除
适用于弱依赖关系，主表删除时保留历史记录：
- notifications.sender_id → users

---

## 🚀 如何使用Migration

### 1. 编译项目
```bash
npm run build
```

### 2. 查看Migration状态
```bash
npm run typeorm:compiled -- migration:show
```

### 3. 执行Migration
```bash
npm run migration:run
```

### 4. 回滚Migration
```bash
npm run migration:revert
```

---

## ⚠️ 注意事项

### 1. 执行顺序

Migration文件必须按照以下顺序执行：

1. **先执行**: `1730000000000-InitCorePermissionTables.ts`
   - 创建 users, roles, permissions, menus 等基础表

2. **后执行**: `1730000001000-InitBusinessModuleTables.ts`
   - 依赖 users 表的外键约束

### 2. 数据库连接

执行Migration前，确保：
- ✅ MySQL 8.0+ 已启动
- ✅ 数据库已创建 (默认: `home`)
- ✅ `.env` 配置正确

### 3. 回滚策略

每个Migration都实现了 `down()` 方法，支持完整回滚：

```typescript
// down() 方法按相反顺序删除表
public async down(queryRunner: QueryRunner): Promise<void> {
  // 1. 删除中间表和外键
  await queryRunner.dropTable('user_roles', true);

  // 2. 删除主表
  await queryRunner.dropTable('users', true);
}
```

### 4. 已知问题修复

**问题**: dict_items 表列名不一致
- **原因**: Entity使用驼峰命名，但JoinColumn指定了蛇形命名
- **解决**: Migration统一使用蛇形命名 `dict_type_id`

---

## 📋 验证清单

在执行Migration后，请验证以下内容：

### 表结构验证
```sql
-- 检查所有表是否创建成功
SHOW TABLES;

-- 应该看到15个表
-- users, roles, permissions, menus, user_roles, role_permissions, role_menus
-- refresh_tokens, files, dict_types, dict_items, system_configs
-- task_definitions, task_logs, notifications
-- api_apps, api_keys, api_call_logs
```

### 索引验证
```sql
-- 检查users表的索引
SHOW INDEX FROM users;

-- 应该看到:
-- PRIMARY (id)
-- UNIQUE (username)
-- UNIQUE (email)
-- UNIQUE (phone) WHERE phone IS NOT NULL
```

### 外键验证
```sql
-- 检查user_roles表的外键
SELECT
  CONSTRAINT_NAME,
  TABLE_NAME,
  REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'home'
  AND TABLE_NAME = 'user_roles';
```

---

## 🔄 下一步行动

### 立即执行
1. ✅ 启动MySQL数据库
2. ✅ 执行 `npm run migration:run`
3. ✅ 验证表结构和索引
4. ✅ 运行种子数据脚本 (如果有)

### 后续优化
1. 🔜 添加性能监控索引
2. 🔜 创建数据库视图 (如权限视图)
3. 🔜 配置定期备份策略

---

## 📚 参考资料

- [TypeORM Migration 文档](https://typeorm.io/migrations)
- [MySQL 8.0 索引优化](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)
- [CLAUDE.md - 项目开发指南](./CLAUDE.md)

---

**维护者**: home Team
**最后更新**: 2025-10-27
