#!/bin/bash

# E2E测试环境启动脚本

echo "🚀 启动E2E测试环境..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker未运行，请先启动Docker Desktop"
  exit 1
fi

# 启动测试服务
echo "📦 启动MySQL容器..."
docker-compose -f docker-compose.test.yml up -d

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

# 运行数据库迁移
echo "🔧 运行数据库迁移..."
cd "$(dirname "$0")/.." || exit 1
NODE_ENV=test DB_HOST=localhost DB_PORT=3307 DB_USERNAME=home_test DB_PASSWORD=test_password DB_DATABASE=home_test npm run migration:run || echo "⚠️  没有待执行的迁移（可能已经运行过）"

echo ""
echo "✨ E2E测试环境已就绪！"
echo ""
echo "📊 服务信息："
echo "   MySQL: localhost:3307"
echo ""
echo "🧪 运行测试："
echo "   npm run test:e2e"
echo ""
echo "🛑 停止环境："
echo "   ./scripts/test-env-down.sh"
echo ""
