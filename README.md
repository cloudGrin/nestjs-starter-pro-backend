# Home Admin

Personal admin backend built with NestJS, TypeORM, MySQL, JWT RBAC, and API-Key based open APIs.

## Scope

This project is intentionally a single-server personal admin system:

- RBAC for admin users.
- API Key authentication for future Web/H5/app integrations.
- MySQL with explicit TypeORM migrations.
- Process-memory cache for the current single-instance deployment model.
- Local or Aliyun OSS file storage.
- Internal notifications with optional Bark and Feishu delivery.
- Code cron jobs for scheduled maintenance.

Out of scope by design:

- Multiple backend services.
- Distributed cache or distributed locks.
- Generic domain/application layers for simple CRUD.
- Event bus or event-driven architecture.
- Generic workflow engines.
- Organization/department management.
- Excel import/export platforms.
- Broad statistics platforms.

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm test:env:up
pnpm test:e2e
pnpm run migration:run
pnpm start:prod
```

## Synology Docker Deployment

This deployment uses an existing MySQL instance and starts only the backend API and frontend nginx container. Keep `home-admin` and `home-web` as sibling directories.

```bash
cp .env.synology.example .env.synology
openssl rand -base64 32
openssl rand -base64 32
./scripts/deploy-synology.sh
```

Set `DB_HOST` to the MySQL address reachable from Docker. Do not use `localhost` for MySQL inside the backend container.

## Configuration

Copy `.env.example` to `.env` and edit the values you need.

Important defaults:

- `DB_SYNCHRONIZE` is not supported. Schema changes go through migrations.
- `TRUST_PROXY=false` by default. Enable only when running behind a trusted reverse proxy.
- `FILE_STORAGE=local` by default. Set `FILE_STORAGE=oss` and OSS variables when needed.
- `SWAGGER_ENABLE` must be `false` in production.

## First Admin User

On a fresh database the application creates one `super_admin` account automatically and logs the generated password. Read the application logs immediately after first startup, then change the password.

## Architecture

The intended flow is simple:

- Controllers handle HTTP and DTO validation.
- Services own business rules.
- TypeORM repositories are injected directly into services.
- Guards enforce authentication and permission declarations.
- Open APIs are thin adapters over existing services with independent DTOs and API-key scopes.

No permission declaration means access is denied unless the route is explicitly public or allows any authenticated user.

## API Key Use

Use the admin API to create an API app, generate a key once, and store the raw key securely. External services call open APIs with:

```http
X-API-Key: sk_live_xxx
```

Scopes are checked by open API controllers through API scope decorators.
The authenticated API app is available as `req.user` by Passport convention; this project intentionally does not add a second `req.app` context shape.
