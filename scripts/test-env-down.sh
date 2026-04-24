#!/bin/bash

# E2E测试环境停止脚本

echo "🛑 停止E2E测试环境..."

# 停止并删除容器
docker compose -f docker-compose.test.yml down

echo "✅ E2E测试环境已停止"
echo ""
echo "💡 提示："
echo "   数据卷已保留，下次启动时数据仍在"
echo "   如需完全清理数据，运行："
echo "   ./scripts/test-env-clean.sh"
echo ""
