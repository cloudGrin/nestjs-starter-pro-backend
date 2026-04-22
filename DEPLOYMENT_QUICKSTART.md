# home Server 快速部署指南

保留两种直接可控的部署方式：Docker Compose 适合本机或小型服务器，Docker/PM2 适合已有运行环境的主机部署。

---

## 方式一：Docker Compose

```bash
# 1. 克隆代码
git clone <repository-url>
cd home-server

# 2. 启动 MySQL 和应用
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 验证服务
curl http://localhost:3000/healthz
```

访问地址：

- API: http://localhost:3000
- Swagger 文档: http://localhost:3000/api-docs
- 健康检查: http://localhost:3000/healthz

---

## 方式二：Docker 或 PM2

### Docker

```bash
docker build -t home-server .
docker run -d -p 3000:3000 --name home-server home-server
```

### PM2

```bash
pnpm install --frozen-lockfile
pnpm build
pm2 start dist/main.js --name home-server
```

---

## 环境变量

至少需要配置：

```bash
JWT_SECRET=<secure-random-string>
JWT_REFRESH_SECRET=<another-secure-random-string>
DB_HOST=<mysql-host>
DB_PORT=3306
DB_USERNAME=<mysql-user>
DB_PASSWORD=<mysql-password>
DB_DATABASE=<mysql-database>
```

生成随机密钥：

```bash
openssl rand -base64 32
```

---

## 健康检查

```bash
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
```

`healthz` 只检查应用进程状态；`readyz` 会检查数据库和进程内缓存。

---

## 常见问题

### Docker 容器启动失败

```bash
docker-compose logs app
docker-compose ps
```

常见原因：

- 端口被占用，调整 `docker-compose.yml` 的端口映射。
- MySQL 尚未就绪，等待健康检查通过。
- 环境变量缺失或密码配置不一致。

### 数据库连接超时

```bash
docker-compose ps mysql
docker-compose logs mysql
```

确认 `DB_HOST`、`DB_PORT`、用户名、密码和数据库名与运行环境一致。

---

## 部署后检查

1. 访问 Swagger 文档：http://localhost:3000/api-docs
2. 调用健康检查：http://localhost:3000/healthz
3. 查看应用日志，确认数据库连接正常。
