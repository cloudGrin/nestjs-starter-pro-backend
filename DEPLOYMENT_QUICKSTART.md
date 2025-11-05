# 🚀 home Server 快速部署指南

> 5分钟快速部署指南 - 帮你快速上手！

---

## 📦 方式一：Docker Compose（最简单）

### 一键启动

```bash
# 1. 克隆代码
git clone <repository-url>
cd home-server

# 2. 一键启动（包含MySQL + Redis + 应用）
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 验证服务
curl http://localhost:3000/healthz
```

### 访问服务

- **API接口**: http://localhost:3000
- **Swagger文档**: http://localhost:3000/api/docs
- **健康检查**: http://localhost:3000/healthz
- **Prometheus指标**: http://localhost:3000/metrics

### 启动监控（可选）

```bash
# 启动 Prometheus + Grafana
docker-compose --profile monitoring up -d

# 访问监控面板
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
```

---

## ☸️ 方式二：Kubernetes（生产环境）

### 快速部署

```bash
# 1. 创建命名空间
kubectl create namespace home

# 2. 配置Secret（修改密码！）
kubectl create secret generic home-secret \
  --from-literal=db.password=YOUR_DB_PASSWORD \
  --from-literal=redis.password=YOUR_REDIS_PASSWORD \
  --from-literal=jwt.secret=YOUR_JWT_SECRET \
  --from-literal=jwt.refresh-secret=YOUR_REFRESH_SECRET \
  -n home

# 3. 一键部署所有资源
kubectl apply -f k8s/ -n home

# 4. 查看部署状态
kubectl get all -n home

# 5. 查看Pod日志
kubectl logs -f deployment/home-server -n home
```

### 验证部署

```bash
# 检查Pod状态（应该是Running）
kubectl get pods -n home

# 检查Service
kubectl get svc -n home

# 检查Ingress
kubectl get ingress -n home

# 端口转发到本地测试
kubectl port-forward svc/home-server-service 3000:80 -n home

# 测试健康检查
curl http://localhost:3000/healthz
```

---

## 🔄 方式三：CI/CD自动部署

### GitHub Actions自动化

**推送代码自动触发**：
```bash
# 推送到develop分支 → 运行CI测试
git push origin develop

# 推送到main分支 → 构建镜像 + 自动部署
git push origin main

# 创建tag → 构建镜像 + 部署 + 创建Release
git tag v1.0.0
git push origin v1.0.0
```

### 配置步骤

1. **在GitHub仓库设置Secrets**：
   - `KUBE_CONFIG`: Kubernetes配置文件（base64编码）

2. **生成KUBE_CONFIG**：
   ```bash
   cat ~/.kube/config | base64 | pbcopy
   # 粘贴到GitHub Secrets中
   ```

3. **推送代码触发部署**：
   ```bash
   git add .
   git commit -m "feat: deploy to production"
   git push origin main
   ```

---

## 📋 环境变量配置

### 必需配置

```bash
# JWT密钥（务必更换为强随机字符串！）
JWT_SECRET=<生成强随机字符串>
JWT_REFRESH_SECRET=<生成另一个强随机字符串>

# 数据库密码
DB_PASSWORD=<secure-password>

# Redis密码
REDIS_PASSWORD=<secure-password>
```

### 生成强随机字符串

```bash
# 方法1：使用openssl
openssl rand -base64 32

# 方法2：使用Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法3：使用uuidgen
uuidgen | shasum -a 256 | cut -d ' ' -f1
```

---

## ✅ 健康检查

### 检查服务状态

```bash
# 基础健康检查（仅检查进程）
curl http://localhost:3000/healthz

# 就绪检查（检查数据库+Redis）
curl http://localhost:3000/readyz

# Prometheus指标
curl http://localhost:3000/metrics
```

### 预期响应

**healthz（健康检查）**：
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T08:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "service": {
      "status": "up",
      "message": "Service is running"
    }
  }
}
```

**readyz（就绪检查）**：
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T08:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "up",
      "message": "Database connection is healthy",
      "responseTime": 5
    },
    "redis": {
      "status": "up",
      "message": "Redis connection is healthy",
      "responseTime": 2
    }
  }
}
```

---

## 🔧 常见问题

### 1. Docker容器启动失败

```bash
# 查看日志
docker-compose logs app

# 常见原因：
# - 端口被占用 → 修改docker-compose.yml中的端口映射
# - 数据库未就绪 → 等待MySQL健康检查通过
# - 环境变量未配置 → 检查.env文件
```

### 2. Kubernetes Pod一直CrashLoopBackOff

```bash
# 查看Pod详情
kubectl describe pod <pod-name> -n home

# 查看日志
kubectl logs <pod-name> -n home

# 常见原因：
# - Secret未配置 → kubectl get secret -n home
# - 数据库连接失败 → 检查Service DNS解析
# - 资源不足 → kubectl top nodes
```

### 3. 数据库连接超时

```bash
# Docker Compose环境
# 检查MySQL容器状态
docker-compose ps mysql

# 检查MySQL日志
docker-compose logs mysql

# Kubernetes环境
# 检查MySQL Service
kubectl get svc mysql-service -n home

# 测试连接
kubectl exec -it <pod-name> -n home -- nc -zv mysql-service 3306
```

---

## 📊 监控指标说明

### 关键指标

| 指标名称 | 说明 | 告警阈值 |
|---------|------|---------|
| `http_requests_total` | HTTP请求总数 | - |
| `http_request_duration_seconds` | 请求响应时间 | P95 > 1s |
| `nodejs_heap_size_used_bytes` | 堆内存使用量 | > 90% |
| `nodejs_eventloop_lag_seconds` | 事件循环延迟 | > 0.1s |
| `online_users` | 在线用户数 | - |

### Grafana仪表盘

1. 导入预置仪表盘（ID: 11159）
2. 配置数据源：Prometheus (http://prometheus:9090)
3. 查看实时指标

---

## 🎉 部署完成！

恭喜你完成部署！接下来：

1. ✅ 访问Swagger文档：http://localhost:3000/api/docs
2. ✅ 配置前端对接（修改API地址）
3. ✅ 设置监控告警（Prometheus + Grafana）
4. ✅ 配置域名和HTTPS（修改Ingress配置）
5. ✅ 备份数据库（定时任务）

---

## 📚 更多文档

- [完整部署指南](./docs/deployment/README.md)
- [配置说明](./docs/configuration.md)
- [API文档](./docs/api.md)
- [故障排查](./docs/troubleshooting.md)

---

**需要帮助？** 提交Issue: https://github.com/your-repo/issues
