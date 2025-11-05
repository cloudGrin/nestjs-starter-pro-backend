#!/bin/bash

# E2E测试环境完全清理脚本

echo "🧹 清理E2E测试环境..."

# 停止容器
docker-compose -f docker-compose.test.yml down

# 删除数据卷
echo "🗑️  删除数据卷..."
docker-compose -f docker-compose.test.yml down -v

echo "✅ E2E测试环境已完全清理"
echo ""
echo "💡 下次运行测试前需要重新启动环境："
echo "   ./scripts/test-env-up.sh"
echo ""
