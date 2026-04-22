# NestJS Starter Pro

> A lightweight, production-ready admin backend built with NestJS.
> Enterprise-grade code quality with **only the essential features** you actually need.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-success)]()
[![NestJS](https://img.shields.io/badge/nestjs-11.x-red)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue)](https://www.typescriptlang.org/)

[English](#english) | [中文](#中文)

---

## 🎯 Why NestJS Starter Pro?

Most backend frameworks fall into two extremes:

- **Enterprise frameworks** (like RuoYi, NestJS Admin): Feature-complete but **overcomplicated**. High learning curve, hard to customize.
- **Demo projects**: Too basic, just CRUD examples. **Not production-ready**.

**NestJS Starter Pro fills the gap**:

- ✅ Lean code quality (layered architecture, TypeORM migrations, focused tests)
- ✅ Simplified RBAC (no permission groups, no complex AND/OR logic)
- ✅ Dual authentication (JWT for users + API Key for third-party apps)
- ✅ Essential features only (file upload, task scheduling, notifications)
- ❌ No audit logs or complex organization processes (**you probably don't need them**)

**Design Philosophy**:

> 80% of projects only need 20% of enterprise features. We built that 20%.

---

## 🚀 Perfect For

- 💼 **Freelancers** building client projects quickly
- 🚀 **Startups** creating MVPs without technical debt
- 🎓 **Learners** studying NestJS best practices with real-world code
- 🛠️ **Side projects** that need professional backend infrastructure
- 📦 **Teams** wanting a clean base to build upon

---

## ⚡ Core Features

### Authentication & Authorization

- 🔐 **Simplified RBAC Permission System**
  - Role-based access control (no complex permission inheritance)
  - OR-logic permission checks (simplified from enterprise AND/OR complexity)
  - Easy permission management via decorators

- 🔑 **Dual Authentication System** (Unique!)
  - **JWT Authentication**: For web/mobile users
  - **API Key Authentication**: For third-party apps, mini-programs, static pages
  - Seamless integration for both authentication methods

### Essential Modules

- 👥 **User Management**: CRUD, role assignment, profile management
- 📁 **File Management**: Local and Aliyun OSS storage, chunked upload, image compression
- ⏰ **Task Scheduling**: Cron-based jobs with execution logs
- 🔔 **Notification System**: Internal notifications plus Bark/Feishu external channels
- 📊 **Data Dictionary**: System configurations and dropdown options
- 📋 **Menu Management**: Dynamic menu generation based on roles

### Developer Experience

- 📖 **Swagger API Documentation**: Auto-generated, interactive API docs
- 🧪 **Complete Test Suite**: Unit tests + E2E tests with good coverage
- 🔧 **TypeORM Migrations**: Explicit schema setup (`synchronize: false`)
- 🎨 **Strict Architecture**: Controller → Service → Repository (enforced)
- 📝 **Comprehensive Docs**: `CLAUDE.md` for AI-assisted development

---

## 🏗️ Architecture Highlights

### Layered Architecture (Strictly Enforced)

```
┌─────────────────────────────────────┐
│     Presentation Layer              │
│  (Controllers + DTO + Decorators)   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│     Business Logic Layer            │
│    (Services + Interfaces)          │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│     Data Access Layer               │
│  (Repositories + TypeORM Queries)   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│       Database Layer                │
│     (MySQL + Memory Cache)          │
└─────────────────────────────────────┘
```

**Core Principles**:

- ❌ Controllers CANNOT call Repositories directly
- ❌ Business logic MUST NOT be in Controllers
- ✅ All database operations in Repositories
- ✅ All business logic in Services

### What We Removed (And Why)

| Removed Feature               | Why You Don't Need It (Probably)                              |
| ----------------------------- | ------------------------------------------------------------- |
| Audit Logs                    | Log files + database logs are enough for most projects        |
| Login Logs                    | Unless you're a bank, user analytics tools work better        |
| Permission Groups             | Adds complexity; direct role-permission mapping is clearer    |
| Permission Inheritance        | Over-engineering; flat permissions are easier to reason about |
| AND/OR Logic Selector         | 90% of cases only need OR logic                               |
| Data Scope (Dept/Self/Custom) | Add it when you actually need it, not before                  |

See [docs/ADR.md](docs/ADR.md) for detailed architecture decisions.

---

## 📦 Tech Stack

| Category           | Technologies                                    |
| ------------------ | ----------------------------------------------- |
| **Framework**      | NestJS 11 + Express                             |
| **Language**       | TypeScript 5 (Strict Mode)                      |
| **Database**       | MySQL 8.0+                                      |
| **Cache**          | Process memory cache                            |
| **ORM**            | TypeORM (migration-based, `synchronize: false`) |
| **Authentication** | JWT + Passport                                  |
| **Validation**     | class-validator + class-transformer             |
| **Documentation**  | Swagger (OpenAPI 3)                             |
| **Testing**        | Jest + Supertest                                |
| **Code Quality**   | ESLint + Prettier                               |

---

## 🏃 Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nestjs-starter-pro.git
cd nestjs-starter-pro

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials

# Initialize database schema
npm run migration:run

# Start development server
npm run start:dev
```

**Access**:

- API: http://localhost:3000/api/v1
- Swagger Docs: http://localhost:3000/api-docs

### First Admin

After the schema is initialized and the app starts against an empty `users` table, it creates an `admin` account with a random password. The password is printed to the application log once; change it after the first login.

---

## 📁 Project Structure

```
nestjs-starter-pro/
├── src/
│   ├── common/                 # Shared utilities
│   │   ├── constants/          # Constants
│   │   ├── enums/              # Enums
│   │   ├── interfaces/         # Interfaces
│   │   └── utils/              # Utility functions
│   ├── config/                 # Configuration
│   │   ├── configuration.ts    # Config loader
│   │   ├── config.types.ts     # Config types
│   │   └── config.validation.ts # Joi validation
│   ├── core/                   # Core infrastructure
│   │   ├── base/               # Base entities
│   │   ├── decorators/         # Custom decorators
│   │   ├── filters/            # Exception filters
│   │   ├── guards/             # Auth guards
│   │   ├── interceptors/       # Interceptors
│   │   └── pipes/              # Validation pipes
│   ├── modules/                # Business modules
│   │   ├── auth/               # Authentication
│   │   ├── user/               # User management
│   │   ├── role/               # Role management
│   │   ├── permission/         # Permission management
│   │   ├── menu/               # Menu management
│   │   ├── file/               # File management
│   │   ├── task/               # Task scheduling
│   │   ├── notification/       # Notifications
│   │   ├── dict/               # Data dictionary
│   │   ├── config/             # System config
│   │   ├── api-auth/           # API Key auth
│   │   ├── open-api/           # Open API gateway
│   │   └── health/             # Health checks
│   ├── migrations/             # Current schema initialization
│   ├── app.module.ts           # Root module
│   └── main.ts                 # Entry point
├── test/                       # Tests
├── docs/                       # Documentation
│   ├── ADR.md                  # Architecture decisions
│   ├── COMPARISON.md           # vs other frameworks
│   └── CLAUDE.md               # AI development guide
├── .env.example                # Environment template
└── package.json
```

---

## 💻 Usage Examples

### Permission-Based Access Control

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  // Single permission required
  @Post()
  @RequirePermissions('user:create')
  async create(@Body() dto: CreateUserDto) {
    return await this.userService.create(dto);
  }

  // Multiple permissions (OR logic)
  @Delete(':id')
  @RequirePermissions('user:delete', 'user:manage')
  async delete(@Param('id') id: string) {
    // User needs either 'delete' OR 'manage' permission
    return await this.userService.remove(id);
  }
}
```

### Public Endpoints (No Auth Required)

```typescript
@Controller('auth')
export class AuthController {
  @Public() // Skip authentication
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }
}
```

### Database Schema

```bash
# Generate a migration from entity changes when you intentionally evolve schema
npm run build
npm run migration:generate -- migrations/AddUserPhoneNumber

# Apply migrations
npm run migration:run

# Rollback last migration
npm run migration:revert
```

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 🚢 Deployment

### Docker

```bash
docker build -t nestjs-starter-pro .
docker run -d -p 3000:3000 --name app nestjs-starter-pro
```

### PM2

```bash
npm run build
pm2 start dist/main.js --name nestjs-app
```

See [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md) for a lightweight deployment guide.

---

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)**: AI-assisted development guide (prompt for Claude/ChatGPT)
- **[docs/ADR.md](docs/ADR.md)**: Architecture decision records (why we built it this way)
- **[docs/COMPARISON.md](docs/COMPARISON.md)**: Comparison with other NestJS frameworks
- **[Swagger API Docs](http://localhost:3000/api-docs)**: Interactive API documentation

---

## 🗺️ Roadmap

### v2.1 (Planned)

- [ ] GraphQL support (optional module)
- [ ] MongoDB adapter (alongside MySQL)
- [ ] Built-in rate limiting per user
- [ ] API versioning examples

### v2.2 (Future)

- [ ] Multi-tenancy support
- [ ] Microservices example
- [ ] gRPC integration
- [ ] Event sourcing pattern

See [ROADMAP.md](docs/ROADMAP.md) for full roadmap.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Quick Checklist**:

- ✅ Follow existing code style (ESLint + Prettier)
- ✅ Write tests for new features
- ✅ Update documentation
- ✅ Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)

---

## 🙌 Inspiration & Alternatives

This project was inspired by:

- [RuoYi](https://github.com/yangzongzhuan/RuoYi) - Excellent but too complex for small projects
- [Nest Admin](https://github.com/nest-admin/nest-admin) - Alternative NestJS admin reference
- Clean Architecture principles from Uncle Bob

**When NOT to use this**:

- You need multi-tenancy out of the box → Consider SaaS-specific frameworks
- You need microservices architecture → Check NestJS microservices docs
- You need GraphQL API → Look at NestJS GraphQL starters
- You need a full-featured CMS → Try Strapi or Directus

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 💬 Community

- 💡 **GitHub Discussions**: Ask questions, share ideas
- 🐛 **GitHub Issues**: Report bugs, request features
- ⭐ **Star this repo**: If you find it useful!

---

**Built with ❤️ by developers who got tired of over-engineered backends.**

**Philosophy**: Keep it simple, keep it clean, make it work.

---

## 中文

> 基于 NestJS 的轻量级、生产就绪的管理后台框架。
> 企业级代码质量，但**只保留你真正需要的核心功能**。

---

## 🎯 为什么选择 NestJS Starter Pro？

大多数后台框架都走向了两个极端：

- **企业级框架**（如若依、NestJS Admin）：功能齐全但**过度复杂**。学习成本高，难以定制。
- **Demo 级项目**：过于简陋，只有基础 CRUD。**无法直接用于生产**。

**NestJS Starter Pro 填补了这个空白**：

- ✅ 企业级代码质量（分层架构、TypeORM Migration、完整测试）
- ✅ 简化的 RBAC（去掉权限组、复杂的 AND/OR 逻辑）
- ✅ 双认证体系（JWT 用户认证 + API Key 第三方接入）
- ✅ 只保留核心功能（文件管理、任务调度、通知推送）
- ❌ 没有审计日志和复杂组织流程（**你大概率用不上**）

**设计理念**：

> 80% 的项目只需要 20% 的企业级功能。我们实现了那 20%。

---

## 🚀 适用场景

- 💼 **接私活/外包**：快速启动客户项目
- 🚀 **初创公司**：构建 MVP 但不想留技术债
- 🎓 **学习 NestJS**：通过实战代码学习最佳实践
- 🛠️ **个人项目**：需要专业的后台基础设施
- 📦 **小团队**：想要干净的代码库作为起点

---

## ⚡ 核心特性

### 认证与授权

- 🔐 **简化的 RBAC 权限系统**
  - 基于角色的访问控制（去掉复杂的权限继承）
  - OR 逻辑权限检查（简化企业级 AND/OR 复杂逻辑）
  - 通过装饰器轻松管理权限

- 🔑 **双认证体系**（独特优势！）
  - **JWT 认证**：适用于 Web/移动端用户
  - **API Key 认证**：适用于第三方应用、小程序、静态页面
  - 两种认证方式无缝集成

### 核心模块

- 👥 **用户管理**：CRUD、角色分配、个人资料管理
- 📁 **文件管理**：支持本地/OSS、分片上传、图片压缩
- ⏰ **任务调度**：基于 Cron 的定时任务，带执行日志
- 🔔 **通知系统**：站内通知 + Bark/飞书站外通知
- 📊 **数据字典**：系统配置和下拉选项
- 📋 **菜单管理**：基于角色的动态菜单生成

### 开发体验

- 📖 **Swagger API 文档**：自动生成、可交互的 API 文档
- 🧪 **完整测试套件**：单元测试 + E2E 测试，良好覆盖率
- 🔧 **TypeORM Migration**：显式数据库结构管理（`synchronize: false`）
- 🎨 **严格架构**：Controller → Service → Repository（强制执行）
- 📝 **完善文档**：`CLAUDE.md` 支持 AI 辅助开发

---

## 🏗️ 架构亮点

### 我们移除的功能（以及原因）

| 移除的功能        | 为什么你（大概率）不需要                  |
| ----------------- | ----------------------------------------- |
| 审计日志          | 日志文件 + 数据库日志对大多数项目已经够用 |
| 登录日志          | 除非你是银行，否则用户分析工具更好        |
| 权限组            | 增加复杂度；直接角色-权限映射更清晰       |
| 权限继承          | 过度设计；扁平权限更容易理解              |
| AND/OR 逻辑选择器 | 90% 的情况只需要 OR 逻辑                  |
| 数据权限范围      | 真正需要时再加，不要提前设计              |

详见 [docs/ADR.md](docs/ADR.md) 了解详细的架构决策。

---

## 🏃 快速开始

```bash
# 克隆项目
git clone https://github.com/yourusername/nestjs-starter-pro.git
cd nestjs-starter-pro

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入数据库信息

# 初始化数据库结构
npm run migration:run

# 启动开发服务器
npm run start:dev
```

访问：

- API: http://localhost:3000/api/v1
- Swagger 文档: http://localhost:3000/api-docs

空库首次启动时会自动创建 `admin` 超级管理员账号，随机密码只会输出到应用日志一次；首次登录后请立即修改。

---

## 📚 文档

- **[CLAUDE.md](CLAUDE.md)**：AI 辅助开发指南
- **[docs/ADR.md](docs/ADR.md)**：架构决策记录
- **[docs/COMPARISON.md](docs/COMPARISON.md)**：与其他框架对比

---

## 🤝 贡献

欢迎贡献代码！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解指南。

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

---

**由厌倦了过度设计后台的开发者用 ❤️ 构建。**

**理念**：保持简单，保持干净，让它工作。
