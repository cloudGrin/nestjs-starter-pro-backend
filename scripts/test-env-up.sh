#!/bin/bash
set -e

# E2E测试环境启动脚本

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 启动E2E测试环境..."

# 检查Docker是否运行
if ! docker_info_output=$(docker info 2>&1); then
  echo "❌ Docker不可用，请确认Docker Desktop已启动，且当前用户有权限访问Docker。"
  echo "$docker_info_output"
  exit 1
fi

# 启动测试服务
echo "📦 启动MySQL容器..."
docker compose -f docker-compose.test.yml up -d --remove-orphans

# 等待服务健康检查通过
echo "⏳ 等待服务启动..."
sleep 5

# 检查MySQL健康状态
echo "🔍 检查MySQL状态..."
until docker exec home-mysql-test mysqladmin ping -h localhost -u root -ptest_root_password --silent 2>/dev/null; do
  echo "   等待MySQL启动..."
  sleep 2
done
echo "✅ MySQL已就绪"

# 重建测试数据库，避免本地 Docker volume 中的旧 schema 与当前首迁移漂移。
echo "🧹 重建测试数据库..."
docker exec home-mysql-test mysql -u root -ptest_root_password -e "DROP DATABASE IF EXISTS home_test; CREATE DATABASE home_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON home_test.* TO 'home_test'@'%'; FLUSH PRIVILEGES;"

# 运行数据库迁移
echo "🔧 运行数据库迁移..."
NODE_ENV=test DB_HOST=localhost DB_PORT=3307 DB_USERNAME=home_test DB_PASSWORD=test_password DB_DATABASE=home_test pnpm run migration:run:ts

echo ""
echo "✨ E2E测试环境已就绪！"
echo ""
echo "📊 服务信息："
echo "   MySQL: localhost:3307"
echo ""
echo "🧪 运行测试："
echo "   pnpm test:e2e"
echo ""
echo "🛑 停止环境："
echo "   ./scripts/test-env-down.sh"
echo ""
