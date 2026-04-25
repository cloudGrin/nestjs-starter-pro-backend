# Home Admin Deployment Quickstart

## Docker

```bash
pnpm install
pnpm build
pnpm run migration:run
pnpm start:prod
```

Or with Docker:

```bash
docker build -t home-admin .
docker run -d -p 3000:3000 --name home-admin home-admin
docker logs -f home-admin
```

## Process Manager

```bash
pnpm install
pnpm build
pnpm run migration:run
pm2 start dist/main.js --name home-admin
```

## Required Production Settings

- Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Set `DB_PASSWORD`.
- Set `CORS_ORIGIN` to explicit trusted origins.
- Keep `SWAGGER_ENABLE=false` unless you intentionally expose docs.
- Set `TRUST_PROXY=true` only behind a trusted reverse proxy.

The application uses migrations only. Do not enable TypeORM automatic schema sync.
