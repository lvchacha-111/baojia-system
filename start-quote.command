#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 启动报价系统..."
echo ""

# 杀掉旧进程
kill $(lsof -ti:8090) 2>/dev/null
kill $(lsof -ti:8000) 2>/dev/null
kill $(lsof -ti:8002) 2>/dev/null

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

# 检查 Python 依赖
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 安装 Python 依赖..."
    python3 -m pip install -q fastapi uvicorn openpyxl
fi

# 启动运费后端（端口 8002）
echo "🔧 启动运费后端（端口 8002）..."
cd "$DIR/管理后台"
python3 backend/app/main.py &
BACKEND_PID=$!
cd "$DIR"
sleep 3

echo "✅ 运费后端已启动"

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

LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 报价前台:    http://localhost:8000"
echo "  🔧 管理后台:    http://localhost:8002/admin"
echo "  ⚙️  PocketBase:  http://localhost:8090/_/"
if [ -n "$LOCAL_IP" ]; then
    echo "  🌐 局域网:      http://$LOCAL_IP:8000"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

cleanup() {
    echo ""
    echo "🛑 正在停止..."
    kill $PB_PID 2>/dev/null
    kill $HTTP_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    echo "✅ 已停止"
    exit 0
}
trap cleanup INT TERM

wait
