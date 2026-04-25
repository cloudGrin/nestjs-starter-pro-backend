# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-04

### 🎉 Major Release - Lightweight Edition

This is a complete redesign from an enterprise-grade RBAC system to a lightweight personal admin backend.

**Philosophy**: "80% of projects only need 20% of enterprise features. We built that 20%."

### ✨ Added

#### Core Features

- **Simplified RBAC System**: User, Role, Permission, Menu management with OR-logic permission checks
- **Dual Authentication**: JWT authentication (for users) + API Key authentication (for third-party apps)
- **File Management**: Support for local storage and Aliyun OSS with chunked upload
- **Task Scheduling**: Cron-based task scheduling with execution logs
- **Notification System**: Internal notifications with Bark/Feishu external channels
- **Data Dictionary**: System dictionary management for dropdown options
- **System Configuration**: Dynamic system configuration management
- **Health Check**: Liveness and Readiness probes for container orchestration

#### Technical Features

- **Explicit Schema Management**: TypeORM with `synchronize: false`, schema initialized through migrations
- **Layered Architecture**: Strict separation of Controller → Service → Repository
- **Complete Testing**: Unit tests + E2E tests with coverage reports
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation

### 🔥 Removed (Enterprise Features)

We removed the following enterprise-grade features to keep the framework lightweight and maintainable:

- ❌ **Audit Logs**: Removed global audit logging (adds database overhead)
- ❌ **Login Logs**: Removed login history tracking (use application monitoring instead)
- ❌ **Online Users**: Removed real-time online user tracking (use session management)
- ❌ **Department Management**: Removed organizational hierarchy (not needed for small teams)
- ❌ **Captcha**: Removed CAPTCHA module (use Cloudflare/rate limiting)
- ❌ **Permission Groups**: Removed permission grouping (simplified to flat structure)
- ❌ **Permission Inheritance**: Removed parent-child permission relationships (over-engineering)
- ❌ **AND/OR Logic Selector**: Unified to OR logic (simpler permission checks)
- ❌ **Data Scope**: Removed data-level permission filtering (use API-level filtering)

### 📝 Architecture Decisions

For detailed explanations of why we removed certain features, see [docs/ADR.md](docs/ADR.md).

### 📊 Comparison

For a detailed comparison with other frameworks (RuoYi, Nest Admin, NestJS Boilerplate), see [docs/COMPARISON.md](docs/COMPARISON.md).

### 🎯 Target Audience

- **Freelancers**: Building admin dashboards for clients quickly
- **Personal projects**: Managing private modules while keeping a clear external API surface
- **Learners**: Studying NestJS best practices with clean code examples
- **Side Projects**: Personal projects that need professional backend structure

### 📚 Documentation

- **README.md**: Getting started guide (English + Chinese)
- **CLAUDE.md**: AI-assisted development guide for Claude/ChatGPT
- **docs/FEATURES.md**: Detailed feature documentation
- **docs/ADR.md**: Architecture decision records
- **docs/COMPARISON.md**: Framework comparison

### 🔐 Security

- ✅ No vulnerabilities in dependencies (`npm audit` clean)
- ✅ Environment variables properly managed (`.env.example` provided)
- ✅ Secrets encrypted (bcrypt for passwords, JWT for tokens)
- ✅ API Key authentication with secure hashing

### 🚀 Performance

- Fast startup time (~2 seconds in production)
- Optimized database queries (no N+1 problems)
- Process memory caching for user permissions
- Efficient TypeORM queries with QueryBuilder

### 🛠️ Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.x
- **Database**: MySQL 8.0+ (with TypeORM)
- **Cache**: Process memory cache
- **Authentication**: JWT + Passport
- **Validation**: class-validator + class-transformer
- **Testing**: Jest + Supertest
- **Documentation**: Swagger/OpenAPI
- **Linting**: ESLint 9 + Prettier 3

### 📦 Package Management

- **Package Manager**: npm (lock file included)
- **Node Version**: >= 20.x
- **Dependencies**: All production dependencies at latest stable versions

### 🙏 Acknowledgments

Built with inspiration from:

- RuoYi (若依) - Enterprise admin framework
- NestJS official examples
- Clean Architecture principles

---

## [Unreleased]

### Planned Features

- [ ] Rate limiting middleware
- [ ] Internationalization (i18n) support
- [ ] Multi-tenancy support (optional)
- [ ] GraphQL API endpoint (optional)
- [ ] Message queue integration (Bull/BullMQ)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[MIT](LICENSE) © 2025 Grin
