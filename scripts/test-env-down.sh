#!/bin/bash
set -e

# E2E测试环境停止脚本

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "🛑 停止E2E测试环境..."

# 停止并删除容器
docker compose -f docker-compose.test.yml down

echo "✅ E2E测试环境已停止"
echo ""
echo "💡 提示："
echo "   Docker数据卷已保留；为避免schema漂移，下次启动会重建home_test数据库"
echo "   如需完全清理数据，运行："
echo "   ./scripts/test-env-clean.sh"
echo ""
