# Changelog

## 2.0.0

- Repositioned the project as a lightweight personal admin backend.
- Kept a single NestJS application instead of service splitting.
- Kept RBAC, JWT auth, API Key auth, user/role/menu/permission modules, file storage, notifications, cron, and health checks.
- Removed obsolete enterprise scaffold concepts from code and docs.
- Replaced external cache assumptions with process-memory cache.
- Kept database schema management migration-only.

## Notes

Planned work should stay aligned with the personal-admin goal:

- Add business modules only when there is a concrete personal use case.
- Prefer explicit services and DTOs over generic engines.
- Keep external API support scope-based and API-Key driven.
