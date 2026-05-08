#!/bin/bash

echo "🚀 启动报价系统..."
echo ""

# 切换到脚本所在目录
cd "$(dirname "$0")"

# 启动 HTTP 服务器（端口 8000）
echo "🔧 启动服务器（端口 8000）..."
python3 -m http.server 8000 &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 2

# 打开浏览器
echo "🌐 打开浏览器..."
open http://localhost:8000

echo ""
echo "✅ 报价系统已启动！"
echo ""

# 获取局域网 IP 地址
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "无法获取")

echo "📊 报价系统: http://localhost:8000"
if [ "$LOCAL_IP" != "无法获取" ]; then
    echo "🌐 局域网访问: http://$LOCAL_IP:8000"
fi
echo "🌐 端口: 8000"
echo ""
echo "功能："
echo "  - 产品报价"
echo "  - SVG 识别"
echo "  - 运费计算"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 等待用户中断
wait $SERVER_PID
