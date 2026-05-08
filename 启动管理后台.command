#!/bin/bash

echo "🚀 启动管理后台..."
echo ""

# 切换到脚本所在目录
cd "$(dirname "$0")/管理后台"

# 检查 Python 依赖
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 安装 Python 依赖..."
    python3 -m pip install -q fastapi uvicorn openpyxl
fi

# 启动后端服务器（端口 8002）
echo "🔧 启动后端服务器（端口 8002）..."
python3 backend/app/main.py &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 3

# 打开浏览器
echo "🌐 打开浏览器..."
open http://localhost:8002/admin

echo ""
echo "✅ 管理后台已启动！"
echo ""

# 获取局域网 IP 地址
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "无法获取")

echo "🔧 管理员后台: http://localhost:8002/admin"
if [ "$LOCAL_IP" != "无法获取" ]; then
    echo "🌐 局域网访问: http://$LOCAL_IP:8002/admin"
fi
echo "🌐 端口: 8002"
echo "🔑 默认密码: admin"
echo ""
echo "功能："
echo "  - 运费规则管理"
echo "  - 参数配置"
echo "  - Excel 导入/导出"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 等待用户中断
wait $SERVER_PID
