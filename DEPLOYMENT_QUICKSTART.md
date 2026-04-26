# Home Admin Deployment Quickstart

## Docker Compose

```bash
cp .env.example .env
openssl rand -base64 48
openssl rand -base64 48
```

Edit `.env` for production:

- `NODE_ENV=production`
- `DB_PASSWORD=<strong password>`
- `MYSQL_ROOT_PASSWORD=<strong password>`
- `JWT_SECRET=<first generated value>`
- `JWT_REFRESH_SECRET=<second generated value>`
- `CORS_ORIGIN=https://your-domain.example`
- `SWAGGER_ENABLE=false`

Start:

```bash
docker compose up -d --build
docker compose logs -f app
```

The container runs database migrations before starting the application.
The MySQL port is bound to `127.0.0.1:3306` by default, so it is not exposed on public network interfaces.
On a fresh database the application logs the generated initial `admin` password once. Read the startup logs and change the password after login.

## Manual Node Process

```bash
pnpm install
pnpm build
pnpm run migration:run
pnpm start:prod
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
- Keep `SWAGGER_ENABLE=false`; production validation rejects enabling Swagger.
- Set `TRUST_PROXY=true` only behind a trusted reverse proxy.

The application uses migrations only. Do not enable TypeORM automatic schema sync.
