# Home Admin Development Notes

## Project Goal

Home Admin is a personal admin backend. It should stay easy to run, easy to extend, and useful as a data backend for future external Web/H5/app ideas.

Keep the project as one NestJS server. Do not introduce distributed infrastructure unless there is a real requirement.

## Current Modules

- `auth`: JWT login, refresh token, logout.
- `user`: user profile and admin user management.
- `role`: role management, role-permission and role-menu assignment.
- `permission`: permission records enforced by guards.
- `menu`: role-based admin menu tree.
- `api-auth`: API apps and API keys.
- `open-api`: API-Key protected external APIs.
- `file`: direct upload, download, list, delete with local or OSS storage.
- `notification`: internal notification records plus Bark/Feishu delivery.
- `cron`: code-defined scheduled jobs.
- `health`: health and readiness endpoints.

## Architecture Rules

- Controllers should only coordinate HTTP, DTOs, decorators, and service calls.
- Services own business behavior.
- Inject TypeORM repositories directly into services when needed.
- Use DTOs for request bodies and response contracts.
- Use migrations for schema changes. Do not enable automatic schema sync.
- No route is accessible by default: use permission decorators, `@AllowAuthenticated`, or `@Public`.

## Configuration Notes

- `TRUST_PROXY=false` by default. Enable it only behind a trusted reverse proxy.
- `FILE_STORAGE=local` by default. OSS is optional.
- Notification external delivery supports Bark and Feishu only.
- Cache is process memory by design for the current single-server target.

## Test Commands

```bash
pnpm test
pnpm test:e2e
pnpm build
pnpm lint
```

## Implementation Bias

- Prefer concrete code over generic engines.
- Delete dead scaffolding when a feature is removed.
- Do not add extra servers, background platforms, or cross-process coordination for speculative needs.
- Keep external API features scope-based and explicit.
