#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 启动报价系统..."
echo ""

# 杀掉旧进程
kill $(lsof -ti:8090) 2>/dev/null
kill $(lsof -ti:8000) 2>/dev/null

# 启动 PocketBase 后端（端口 8090）
echo "📦 启动 PocketBase（端口 8090）..."
"$DIR/pocketbase/pocketbase" serve --http 127.0.0.1:8090 &
PB_PID=$!
sleep 1

if ! kill -0 $PB_PID 2>/dev/null; then
    echo "❌ PocketBase 启动失败"
    exit 1
fi
echo "✅ PocketBase 已启动"

# 启动 HTTP 前端（端口 8000）
echo "🌐 启动网页服务（端口 8000）..."
cd "$DIR"
python3 -m http.server 8000 &
HTTP_PID=$!
sleep 1

echo "✅ 网页服务已启动"
echo ""

# 打开浏览器
open http://localhost:8000

echo "━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 前台:  http://localhost:8000"
echo "  ⚙️  后台:  http://localhost:8090/_/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

cleanup() {
    echo ""
    echo "🛑 正在停止..."
    kill $PB_PID 2>/dev/null
    kill $HTTP_PID 2>/dev/null
    echo "✅ 已停止"
    exit 0
}
trap cleanup INT TERM

wait
