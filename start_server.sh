#!/bin/bash

# 设置环境变量 - 使用开发环境配置
export FLASK_ENV=development

# 获取端口号，默认为8000
PORT=${1:-8000}
export PORT=$PORT

# 设置URL方案（http或https）
SCHEME=${2:-http}
export PREFERRED_URL_SCHEME=$SCHEME

# 激活虚拟环境
source venv/bin/activate

# 简单启动方式
echo "启动Flask应用在端口: $PORT, 使用${SCHEME}协议..."
cd flask
python wsgi.py 