# API Key Quickstart

Home Admin supports external service access through API Keys. This is intended for small Web, H5, mini-program, or native app integrations that use this admin backend as their data backend.

## Create An API App

Use an authenticated admin account:

```http
POST /api/v1/api-apps
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "mini-program",
  "description": "Personal mini-program backend",
  "scopes": ["users:read"]
}
```

## Generate A Key

```http
POST /api/v1/api-apps/1/keys
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "production",
  "environment": "production",
  "scopes": ["users:read"]
}
```

The raw key is returned only once. Store it immediately.

## Call Open APIs

```http
GET /api/v1/open/users
X-API-Key: sk_live_xxx
```

The API key must be active, not expired, and include the scope required by the open API route.

## Current Design Limits

- Each app can have up to five active keys.
- Key validation uses process-memory cache.
- Deleting an app disables it and revokes related keys.
- No distributed lock or external cache is required for the current single-server goal.
