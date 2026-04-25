# CLAUDE.md - AI开发指南

> 本文档专为AI助手（Claude Code等）设计，帮助快速理解项目架构、代码规范、开发流程和技术决策。

**最后更新**: 2025-11-04
**项目定位**: 轻量级后台管理框架
**技术栈**: NestJS 11 + TypeScript 5 + MySQL 8 + 进程内缓存

---

## 📋 项目概览

### 基本信息

- **项目名称**: Home Admin
- **当前版本**: v2.0
- **主要分支**: `main`
- **技术架构**:
  - 后端框架: NestJS 11.x
  - 开发语言: TypeScript 5.x
  - 数据库: MySQL 8.0+
  - 缓存: 进程内缓存
  - ORM: TypeORM (使用Migration管理)

### 项目定位

Home Admin 是一个面向个人使用的轻量级管理后台，基于 NestJS 构建。项目保留单服务、MySQL migration、JWT 登录、API Key 开放接口、文件、通知和 cron 扩展点，避免微服务、Redis、工作流平台等个人项目不需要的复杂度。

### 核心特性

1. **轻量级 RBAC 权限系统**
   - 基于角色的访问控制（Role + Permission）
   - 灵活的角色和权限管理，支持自定义角色
   - 简化的 OR 逻辑权限检查（非企业级的 AND/OR 复杂逻辑）

2. **双认证体系**
   - JWT 认证：用于用户登录（Web端、移动端）
   - API Key 认证：用于第三方应用接入（小程序、静态页面等）

3. **文件管理系统**
   - 支持本地/OSS 存储策略
   - 文件分片上传
   - 图片压缩与缩略图生成

4. **任务调度系统**
   - 基于 Cron 表达式的定时任务
   - 任务执行日志
   - 支持动态启用/禁用

5. **通知推送系统**
   - 站内通知
   - 站外通知支持（Bark、飞书）
   - 通知模板管理

---

## 🏗️ 系统架构

### 分层架构设计

项目遵循严格的分层架构（Clean Architecture）：

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  (Controllers + DTO + Decorators)       │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│          Business Logic Layer           │
│         (Services + Interfaces)         │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│         Data Access Layer               │
│    (Repositories + TypeORM Queries)     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           Database Layer                │
│         (MySQL + Memory Cache)          │
└─────────────────────────────────────────┘
```

**核心原则**:

- ❌ **禁止跨层调用** (Controller 不能直接调 Repository)
- ❌ **禁止业务逻辑写在 Controller** (Controller 只负责路由和参数校验)
- ❌ **禁止在 Service 中直接操作 Entity** (必须通过 Repository)
- ✅ **所有数据库操作必须在 Repository 中**
- ✅ **所有业务逻辑必须在 Service 中**

### 模块职责划分

#### 核心权限模块

| 模块           | 路径                     | 职责                            | 依赖关系               |
| -------------- | ------------------------ | ------------------------------- | ---------------------- |
| **auth**       | `src/modules/auth`       | JWT认证、RefreshToken、登录登出 | user, role, permission |
| **user**       | `src/modules/user`       | 用户管理、用户信息维护          | role                   |
| **role**       | `src/modules/role`       | 角色管理、角色权限分配          | permission             |
| **permission** | `src/modules/permission` | 权限定义、权限维护              | -                      |
| **menu**       | `src/modules/menu`       | 菜单管理、菜单权限控制          | role                   |

#### 基础功能模块

| 模块             | 路径                       | 职责                 | 说明                 |
| ---------------- | -------------------------- | -------------------- | -------------------- |
| **file**         | `src/modules/file`         | 文件上传、存储、访问 | 支持本地/OSS         |
| **dict**         | `src/modules/dict`         | 数据字典管理         | 用于下拉选项等       |
| **config**       | `src/modules/config`       | 系统配置管理         | 动态配置             |
| **task**         | `src/modules/task`         | 定时任务管理         | 基于@nestjs/schedule |
| **notification** | `src/modules/notification` | 通知推送             | 站内通知 + Bark/飞书 |
| **health**       | `src/modules/health`       | 健康检查             | 用于监控             |

#### 开放 API 模块

| 模块         | 路径                   | 职责          | 说明                     |
| ------------ | ---------------------- | ------------- | ------------------------ |
| **api-auth** | `src/modules/api-auth` | API Key 认证  | 为第三方应用颁发 API Key |
| **open-api** | `src/modules/open-api` | 开放 API 网关 | 统一的开放接口入口       |

### 核心基础设施

#### 守卫 (Guards)

```typescript
// src/core/guards/
├── jwt-auth.guard.ts          // JWT认证守卫
├── api-key.guard.ts           // API Key认证守卫
├── permissions.guard.ts       // 权限守卫（简化版，OR逻辑）
└── roles.guard.ts             // 角色守卫
```

**关键实现 - PermissionsGuard (简化版)**:

```typescript
/**
 * 权限守卫（简化版 - 轻量级实现）
 * 已移除的企业级功能：
 * - ❌ 权限组（permission groups）
 * - ❌ 权限继承（parent/child permissions）
 * - ❌ AND/OR 逻辑选择（统一使用 OR 逻辑）
 * - ❌ 数据权限范围（data scope）
 */

// 简化的SQL查询
const query = `
  SELECT DISTINCT p.code
  FROM permissions p
  INNER JOIN role_permissions rp ON p.id = rp.permission_id
  INNER JOIN user_roles ur ON rp.role_id = ur.role_id
  INNER JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = ? AND p.is_active = true AND r.is_active = true
`;

// OR 逻辑：用户拥有任一所需权限即可通过
const result = evaluations.some((item) => item.matched);
```

#### 拦截器 (Interceptors)

```typescript
// src/core/interceptors/
├── logging.interceptor.ts     // 日志拦截器（记录请求响应）
├── timeout.interceptor.ts     // 超时拦截器
└── transform.interceptor.ts   // 响应转换拦截器（统一响应格式）
```

#### 过滤器 (Filters)

```typescript
// src/core/filters/
├── http-exception.filter.ts   // HTTP异常过滤器
├── all-exception.filter.ts    // 全局异常过滤器
└── validation-exception.filter.ts  // 参数校验异常过滤器
```

#### 装饰器 (Decorators)

```typescript
// src/core/decorators/
├── current-user.decorator.ts       // 获取当前用户
├── public.decorator.ts             // 标记公开接口（不需要认证）
├── require-permissions.decorator.ts // 权限检查装饰器
└── roles.decorator.ts              // 角色检查装饰器
```

---

## 📐 代码规范与约定

### 1. 文件命名规范

```
# 模块命名：kebab-case
src/modules/gift-money/
src/modules/child-growth/

# 文件命名：
user.entity.ts              // Entity
user.service.ts             // Service
user.controller.ts          // Controller
user.repository.ts          // Repository (可选)
create-user.dto.ts          // DTO
update-user.dto.ts
query-user.dto.ts

# 类命名：PascalCase
UserEntity
UserService
UserController
CreateUserDto

# 变量/方法命名：camelCase
getUserById()
createUser()
findActiveUsers()

# 常量命名：UPPER_SNAKE_CASE
MAX_FILE_SIZE
DEFAULT_PAGE_SIZE
```

### 2. Entity 设计规范

#### 基础实体继承

```typescript
import { BaseEntity } from '@/core/base/base.entity';
import { SoftDeleteBaseEntity } from '@/core/base/soft-delete-base.entity';

// 不需要软删除的实体（如：字典、配置）
@Entity('dict')
export class DictEntity extends BaseEntity {
  // 自动包含：id, createdAt, updatedAt, version
}

// 需要软删除的实体（如：用户、角色、权限）
@Entity('users')
export class UserEntity extends SoftDeleteBaseEntity {
  // 自动包含：id, createdAt, updatedAt, version, deletedAt
}
```

#### 字段定义规范

```typescript
// ✅ 正确示例：完整的元数据
@Column({
  type: 'varchar',
  length: 100,
  nullable: true,
  comment: '用户昵称'
})
nickname: string;

@Column({
  type: 'enum',
  enum: UserStatus,
  default: UserStatus.ACTIVE,
  comment: '用户状态'
})
status: UserStatus;

// ✅ 关系定义规范（显式指定外键列名）
@ManyToOne(() => RoleEntity)
@JoinColumn({ name: 'role_id' })
role: RoleEntity;

@Column({ comment: '角色ID' })
roleId: string;

// ✅ 多对多关系
@ManyToMany(() => RoleEntity, (role) => role.users, { cascade: true })
@JoinTable({
  name: 'user_roles',
  joinColumn: { name: 'user_id' },
  inverseJoinColumn: { name: 'role_id' }
})
roles: RoleEntity[];
```

#### 权限相关实体设计

**当前系统采用简化版 RBAC**:

```typescript
// RoleEntity (简化版)
@Entity('roles')
export class RoleEntity extends SoftDeleteBaseEntity {
  @Column({ length: 50, unique: true, comment: '角色代码' })
  code: string; // 如：PARENT, CHILD, ELDER, GUEST

  @Column({ length: 100, comment: '角色名称' })
  name: string; // 如：家长、孩子、老人、访客

  @Column({ type: 'boolean', default: false, comment: '是否为系统角色（不可删除）' })
  isSystem: boolean;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles)
  @JoinTable({ name: 'role_permissions' })
  permissions: PermissionEntity[];

  // ❌ 已移除的企业级字段：
  // dataScope - 数据权限范围（ALL/DEPT/SELF/CUSTOM）
  // customDataScope - 自定义数据权限SQL
}

// PermissionEntity (简化版 - 轻量级系统)
@Entity('permissions')
export class PermissionEntity extends BaseEntity {
  @Column({ length: 100, unique: true, comment: '权限代码' })
  code: string; // 格式：{module}:{resource}:{action}
  // 如：finance:record:create

  @Column({ length: 100, comment: '权限名称' })
  name: string;

  @Column({
    type: 'enum',
    enum: PermissionType,
    default: PermissionType.API,
    comment: '权限类型',
  })
  type: PermissionType; // 'API' | 'FEATURE'

  @Column({ type: 'varchar', length: 50, comment: '所属模块' })
  module: string; // 如：finance, inventory, medicine

  // ❌ 已移除的企业级字段：
  // parentId - 权限继承（过度设计）
  // logic - AND/OR逻辑（简化为统一OR逻辑）
  // resourceType - 已简化为 type 字段
}

// UserEntity (简化版)
@Entity('users')
export class UserEntity extends SoftDeleteBaseEntity {
  @Column({ length: 50, unique: true, comment: '用户名' })
  username: string;

  @Column({ length: 100, unique: true, comment: '邮箱' })
  email: string;

  @ManyToMany(() => RoleEntity, (role) => role.users, { cascade: true })
  @JoinTable({ name: 'user_roles' })
  roles: RoleEntity[];
}
```

### 3. DTO 设计规范

#### 基础 DTO 规范

```typescript
import { IsString, IsOptional, IsEnum, IsInt, Min, Max, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Create DTO
export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  @IsString()
  @MaxLength(50)
  username: string;

  @ApiProperty({ description: '邮箱', example: 'zhangsan@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: '昵称', example: '张三' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @ApiProperty({ description: '用户状态', enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;
}

// Update DTO（使用 PartialType 简化）
import { PartialType } from '@nestjs/mapped-types';

export class UpdateUserDto extends PartialType(CreateUserDto) {}

// Query DTO（分页查询）
export class QueryUserDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
```

### 4. Service 设计规范

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    // 可以注入其他 Service
    private readonly roleService: RoleService,
  ) {}

  /**
   * 创建用户
   */
  async create(dto: CreateUserDto): Promise<UserEntity> {
    // 1. 业务逻辑验证
    const exists = await this.userRepository.findOne({
      where: { username: dto.username },
    });
    if (exists) {
      throw new BadRequestException('用户名已存在');
    }

    // 2. 创建实体
    const user = this.userRepository.create(dto);

    // 3. 保存
    return await this.userRepository.save(user);
  }

  /**
   * 根据ID查找用户（带错误处理）
   */
  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'], // 加载关联关系
    });

    if (!user) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }

    return user;
  }

  /**
   * 分页查询
   */
  async findPage(dto: QueryUserDto) {
    const { page = 1, pageSize = 10, keyword } = dto;

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles');

    // 关键词搜索
    if (keyword) {
      query.andWhere('(user.username LIKE :keyword OR user.email LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    // 分页
    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 更新用户
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);

    // 合并更新
    Object.assign(user, dto);

    return await this.userRepository.save(user);
  }

  /**
   * 软删除
   */
  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.softRemove(user);
  }
}
```

### 5. Controller 设计规范

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/core/guards/jwt-auth.guard';
import { AllowAuthenticated } from '@/core/decorators/allow-authenticated.decorator';
import { RequirePermissions } from '@/core/decorators/require-permissions.decorator';
import { Public } from '@/core/decorators/public.decorator';

@ApiTags('用户管理')
@Controller('users')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions('user:create')
  @ApiOperation({ summary: '创建用户' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() dto: CreateUserDto) {
    return await this.userService.create(dto);
  }

  @Get()
  @RequirePermissions('user:list')
  @ApiOperation({ summary: '用户列表（分页）' })
  async findPage(@Query() dto: QueryUserDto) {
    return await this.userService.findPage(dto);
  }

  @Get(':id')
  @RequirePermissions('user:detail')
  @ApiOperation({ summary: '用户详情' })
  async findOne(@Param('id') id: string) {
    return await this.userService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('user:update')
  @ApiOperation({ summary: '更新用户' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return await this.userService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  @ApiOperation({ summary: '删除用户' })
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return MessageResponseDto.of('删除成功');
  }
}
```

### 6. 权限装饰器使用规范

#### 简化的权限检查（OR 逻辑）

```typescript
import { RequirePermissions } from '@/core/decorators/require-permissions.decorator';

@Controller('finance/records')
export class FinanceRecordController {
  // ✅ 登录用户可访问，显式跳过业务权限检查
  @Get()
  @AllowAuthenticated()
  async list() {
    // 只要通过了 JwtAuthGuard 即可访问
  }

  // ✅ 需要单个权限
  @Post()
  @RequirePermissions('finance:record:create')
  async create() {
    // 需要 finance:record:create 权限
  }

  // ✅ 需要多个权限之一（OR 逻辑）
  @Delete(':id')
  @RequirePermissions('finance:record:delete', 'finance:record:manage')
  async delete() {
    // 只要拥有 delete 或 manage 权限之一即可
  }
}
```

#### 公开接口（不需要认证）

```typescript
import { Public } from '@/core/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  @Public() // 标记为公开接口
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }
}
```

---

## 🔑 认证与授权

### 1. JWT 认证流程

```typescript
// 1. 用户登录
POST /api/v1/auth/login
{
  "username": "admin",
  "password": "password"
}

// 2. 返回 Token
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 604800  // 7天
}

// 3. 使用 Token 访问受保护接口
GET /api/v1/users
Headers:
  Authorization: Bearer eyJhbGc...

// 4. Token 过期后刷新
POST /api/v1/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}
```

### 2. API Key 认证流程

用于第三方应用（小程序、静态页面等）接入：

```typescript
// 1. 管理员创建 API Key
POST /api/v1/api-auth/keys
{
  "name": "小程序应用",
  "description": "财务管理小程序",
  "expiresAt": "2025-12-31"
}

// 2. 返回 API Key
{
  "key": "pk_live_51H7...",
  "secret": "sk_live_51H7..."
}

// 3. 使用 API Key 访问开放接口
GET /api/v1/open-api/finance/records
Headers:
  X-API-Key: pk_live_51H7...
  X-API-Secret: sk_live_51H7...
```

### 3. 权限检查流程

**当前系统使用简化的 OR 逻辑**：

```typescript
// 伪代码逻辑
function checkPermissions(user, requiredPermissions) {
  // 1. 获取用户所有权限
  const userPermissions = new Set<string>();
  for (const role of user.roles) {
    for (const permission of role.permissions) {
      userPermissions.add(permission.code);
    }
  }

  // 2. OR 逻辑：只要拥有任一所需权限即可
  return requiredPermissions.some((p) => userPermissions.has(p));
}
```

**权限命名规范**:

```
格式：{module}:{resource}:{action}

示例：
finance:record:create      // 创建财务记录
finance:record:update      // 更新财务记录
finance:record:delete      // 删除财务记录
finance:record:list        // 查看财务记录列表
inventory:item:manage      // 管理库存物品（增删改）
medicine:record:view       // 查看药品记录
```

---

## 🗄️ 数据库管理

### 1. Schema 管理

**项目禁用 `synchronize: true`，通过 `src/migrations/1730000000000-InitSchema.ts` 初始化当前 schema。**

当前项目尚未发布，不保留历史增量迁移；修改实体后优先同步更新初始化迁移，避免迁移目录膨胀。真正上线并产生历史数据后，再恢复“一次结构变更一个迁移”的规则。

```bash
pnpm run build
pnpm run migration:run
```

空库首次启动时，`AdminBootstrapService` 会自动创建 `admin` 超级管理员账号，并把随机密码输出到应用日志一次。不要把默认密码写入源码、migration 或文档。

### 2. 数据库查询最佳实践

#### 使用 QueryBuilder（推荐用于复杂查询）

```typescript
// ✅ 推荐：使用 QueryBuilder
async findActiveUsersWithRoles(keyword: string) {
  return await this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.roles', 'roles')
    .where('user.deletedAt IS NULL')
    .andWhere('user.status = :status', { status: 'ACTIVE' })
    .andWhere('user.username LIKE :keyword', { keyword: `%${keyword}%` })
    .orderBy('user.createdAt', 'DESC')
    .getMany();
}
```

#### 使用 Repository 方法（推荐用于简单查询）

```typescript
// ✅ 推荐：简单查询
async findById(id: string) {
  return await this.userRepository.findOne({
    where: { id },
    relations: ['roles', 'roles.permissions'],
  });
}

// ✅ 推荐：分页查询
async findPage(page: number, pageSize: number) {
  return await this.userRepository.findAndCount({
    skip: (page - 1) * pageSize,
    take: pageSize,
    order: { createdAt: 'DESC' },
  });
}
```

#### 避免 N+1 查询问题

```typescript
// ❌ 错误：N+1 查询
async getUsersWithRoles() {
  const users = await this.userRepository.find();
  for (const user of users) {
    user.roles = await this.roleRepository.find({
      where: { userId: user.id }
    });
  }
  return users;
}

// ✅ 正确：使用 relations 预加载
async getUsersWithRoles() {
  return await this.userRepository.find({
    relations: ['roles'],
  });
}

// ✅ 正确：使用 QueryBuilder 的 leftJoinAndSelect
async getUsersWithRoles() {
  return await this.userRepository
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.roles', 'roles')
    .getMany();
}
```

---

## 📦 文件存储系统

### 支持的存储策略

项目支持两种文件存储策略，通过环境变量 `FILE_STORAGE_TYPE` 配置：

#### 1. 本地存储（默认）

```env
FILE_STORAGE_TYPE=local
FILE_LOCAL_UPLOAD_PATH=./uploads  # 上传目录
FILE_LOCAL_STATIC_PATH=/static    # 静态资源访问路径
```

#### 2. 阿里云 OSS

```env
FILE_STORAGE_TYPE=oss
FILE_OSS_ACCESS_KEY_ID=xxx
FILE_OSS_ACCESS_KEY_SECRET=xxx
FILE_OSS_BUCKET=my-bucket
FILE_OSS_REGION=oss-cn-hangzhou
FILE_OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
```

### 文件上传使用示例

```typescript
// 1. Controller 中接收文件
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file: Express.Multer.File) {
  return await this.fileService.upload(file);
}

// 2. 批量上传
@Post('upload/batch')
@UseInterceptors(FilesInterceptor('files', 10))  // 最多10个文件
async uploadBatch(@UploadedFiles() files: Express.Multer.File[]) {
  return await Promise.all(
    files.map(file => this.fileService.upload(file))
  );
}

// 3. 文件分片上传（大文件）
@Post('upload/chunk')
async uploadChunk(@Body() dto: UploadChunkDto) {
  return await this.fileService.uploadChunk(dto);
}

// 4. 合并分片
@Post('upload/merge')
async mergeChunks(@Body() dto: MergeChunksDto) {
  return await this.fileService.mergeChunks(dto);
}
```

---

## ⏰ 任务调度系统

### 定时任务使用示例

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TaskService {
  // 每天凌晨2点执行
  @Cron('0 2 * * *', {
    name: 'cleanupExpiredFiles',
    timeZone: 'Asia/Shanghai',
  })
  async cleanupExpiredFiles() {
    this.logger.log('开始清理过期文件...');
    // 业务逻辑
  }

  // 每小时执行
  @Cron(CronExpression.EVERY_HOUR)
  async checkMedicineExpiration() {
    this.logger.log('检查药品过期情况...');
    // 业务逻辑
  }

  // 每周一上午9点执行
  @Cron('0 9 * * 1')
  async sendWeeklySummary() {
    this.logger.log('发送本周汇总报告...');
    // 业务逻辑
  }
}
```

### Cron 表达式速查

```
 ┌────────────── 秒 (0-59)
 │ ┌──────────── 分钟 (0-59)
 │ │ ┌────────── 小时 (0-23)
 │ │ │ ┌──────── 日期 (1-31)
 │ │ │ │ ┌────── 月份 (1-12)
 │ │ │ │ │ ┌──── 星期 (0-7, 0和7都代表周日)
 │ │ │ │ │ │
 * * * * * *

常用示例：
0 0 2 * * *       每天凌晨2点
0 */30 * * * *    每30分钟
0 0 9-18 * * 1-5  工作日每小时9-18点
0 0 0 1 * *       每月1号凌晨
```

---

## 🧪 测试策略

### 单元测试

```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('UserService', () => {
  let service: UserService;
  let repository: Repository<UserEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      const user = { id: '1', username: 'test' } as UserEntity;
      jest.spyOn(repository, 'findOne').mockResolvedValue(user);

      const result = await service.findById('1');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### E2E 测试

```typescript
// user.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 登录获取 token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'password' });

    accessToken = response.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/users (GET) - should return user list', () => {
    return request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('total');
      });
  });

  it('/users (POST) - should create user', () => {
    return request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(201);
  });
});
```

### 运行测试

```bash
# 单元测试
pnpm run test

# 单元测试（监听模式）
pnpm run test:watch

# E2E 测试
pnpm run test:e2e

# 测试覆盖率
pnpm run test:cov
```

---

## 🚀 部署指南

### 环境变量配置

```bash
# .env.production
NODE_ENV=production
PORT=3000
API_PREFIX=api
API_VERSION=v1

# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=home

# JWT
JWT_SECRET=your-super-secret-key-at-least-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# 文件存储
FILE_STORAGE_TYPE=local
FILE_MAX_SIZE=10485760  # 10MB
```

### Docker 部署

```bash
# 1. 构建镜像
docker build -t home-server:latest .

# 2. 运行容器
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=host.docker.internal \
  --name home-server \
  home-server:latest

# 3. 查看日志
docker logs -f home-server

# 4. 停止容器
docker stop home-server
```

### PM2 部署

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 构建项目
pnpm run build

# 3. 启动应用
pm2 start dist/main.js --name home-server

# 4. 设置开机自启
pm2 startup
pm2 save

# 5. 查看状态
pm2 status

# 6. 查看日志
pm2 logs home-server

# 7. 重启
pm2 restart home-server

# 8. 停止
pm2 stop home-server
```

---

## 🛠️ 常见开发任务

### 1. 添加新的业务模块

```bash
# 使用 NestJS CLI 快速创建
nest g resource modules/example

# 选项：
# ? What transport layer do you use? REST API
# ? Would you like to generate CRUD entry points? Yes

# 生成的文件：
# src/modules/example/
# ├── controllers/
# │   └── example.controller.ts
# ├── services/
# │   └── example.service.ts
# ├── entities/
# │   └── example.entity.ts
# ├── dto/
# │   ├── create-example.dto.ts
# │   └── update-example.dto.ts
# └── example.module.ts
```

### 2. 添加新权限

```typescript
// 1. 在 permission.service.ts 中定义权限
const newPermissions = [
  {
    code: 'example:item:create',
    name: '创建示例项',
    type: PermissionType.API,
    module: 'example',
  },
  {
    code: 'example:item:update',
    name: '更新示例项',
    type: PermissionType.API,
    module: 'example',
  },
];

// 2. 在 Controller 中使用，权限数据由 migration/初始化数据显式维护
@Post()
@RequirePermissions('example:item:create')
async create(@Body() dto: CreateExampleDto) {
  return await this.exampleService.create(dto);
}
```

### 3. 添加新角色

```typescript
// 通过 API 创建角色
POST /api/v1/roles
{
  "code": "MANAGER",
  "name": "管理员",
  "description": "系统管理员角色",
  "isSystem": false,
  "permissionIds": ["uuid1", "uuid2", "uuid3"]
}
```

### 4. 配置新的环境变量

```typescript
// 1. 在 .env 中添加
NEW_FEATURE_ENABLED = true;

// 2. 在 src/config/configuration.ts 中定义
export default () => ({
  // ...其他配置
  newFeature: {
    enabled: process.env.NEW_FEATURE_ENABLED === 'true',
  },
});

// 3. 在 src/config/config.validation.ts 中添加验证
export const configValidationSchema = Joi.object({
  // ...其他验证
  NEW_FEATURE_ENABLED: Joi.boolean().default(false),
});

// 4. 在代码中使用
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SomeService {
  constructor(private configService: ConfigService) {}

  doSomething() {
    const enabled = this.configService.get<boolean>('newFeature.enabled');
    if (enabled) {
      // ...
    }
  }
}
```

---

## 💡 开发技巧与最佳实践

### 1. 使用 TypeScript 严格模式

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### 2. 避免循环依赖

```typescript
// ❌ 错误：循环依赖
// user.service.ts
@Injectable()
export class UserService {
  constructor(private readonly roleService: RoleService) {}
}

// role.service.ts
@Injectable()
export class RoleService {
  constructor(private readonly userService: UserService) {}
}

// ✅ 正确：使用 forwardRef
// user.service.ts
@Injectable()
export class UserService {
  constructor(
    @Inject(forwardRef(() => RoleService))
    private readonly roleService: RoleService,
  ) {}
}
```

### 3. 使用项目内置缓存

```typescript
import { CacheService } from '~/shared/cache/cache.service';

@Injectable()
export class UserService {
  constructor(private readonly cacheService: CacheService) {}

  async findById(id: string): Promise<UserEntity> {
    // 1. 尝试从缓存获取
    const cacheKey = `user:${id}`;
    const cached = await this.cacheService.get<UserEntity>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. 从数据库查询
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // 3. 写入缓存（TTL: 5分钟）
    await this.cacheService.set(cacheKey, user, 300);

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findById(id);
    Object.assign(user, dto);
    const updated = await this.userRepository.save(user);

    // 更新后删除缓存
    await this.cacheService.del(`user:${id}`);

    return updated;
  }
}
```

### 4. 统一异常处理

```typescript
// 使用 NestJS 内置异常类
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

// ✅ 推荐：使用语义化的异常
if (!user) {
  throw new NotFoundException('用户不存在');
}

if (existingUser) {
  throw new ConflictException('用户名已存在');
}

if (!hasPermission) {
  throw new ForbiddenException('无权限访问');
}
```

### 5. 日志记录

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async create(dto: CreateUserDto): Promise<UserEntity> {
    this.logger.log(`Creating user: ${dto.username}`);

    try {
      const user = await this.userRepository.save(dto);
      this.logger.log(`User created successfully: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

---

## 📚 Git 提交规范

```bash
# 格式
<type>(<scope>): <subject>

# type 类型
feat:     新功能
fix:      修复 bug
refactor: 重构（不改变功能）
docs:     文档更新
style:    代码格式调整（不影响功能）
test:     测试相关
chore:    构建/工具链相关
perf:     性能优化

# 示例
git commit -m "feat(finance): 添加记账模块基础功能"
git commit -m "fix(user): 修复用户列表分页错误"
git commit -m "refactor(permission): 简化权限检查逻辑"
git commit -m "docs: 更新 API 文档"
git commit -m "test(role): 添加角色服务单元测试"
git commit -m "chore: 升级依赖包版本"
```

---

## 🔍 故障排查

### 常见问题

#### 1. 编译错误："Cannot find module"

**原因**: 导入路径错误或模块未安装

**解决**:

```bash
# 检查 tsconfig.json 中的 paths 配置
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

#### 2. 数据库连接失败

**原因**: 数据库配置错误或数据库未启动

**解决**:

```bash
# 检查 .env 配置
# 确认数据库服务运行
mysql -u root -p

# 初始化结构
pnpm run migration:run
```

#### 3. 权限检查失败

**原因**: 用户缺少所需权限或权限配置错误

**解决**:

```typescript
// 1. 检查用户权限
SELECT u.username, r.name as role, p.code as permission
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.id = 'user-uuid';

// 2. 为角色分配权限
POST /api/v1/roles/{roleId}/permissions
{
  "permissionIds": ["perm1", "perm2"]
}
```

---

## 📞 获取帮助

### 文档位置

- **项目说明**: README.md
- **AI 开发指南**: CLAUDE.md (本文档)
- **改造历史**: docs/archive/

### 调试技巧

```bash
# 1. 查看详细日志
pnpm run start:dev

# 2. 初始化数据库结构
pnpm run migration:run

# 3. 检查环境配置
node -p "require('./dist/config/configuration').default()"

# 4. 检查编译错误
pnpm run build

# 5. 运行测试
pnpm run test
pnpm run test:e2e
```

---

**最后更新**: 2025-11-04
**维护者**: Grin
**版本**: v2.0
