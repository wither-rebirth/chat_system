#!/bin/bash

# Chat System 快速部署脚本
# 适用于 Ubuntu/Debian 系统

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Chat System 快速部署脚本${NC}"
echo "====================================="

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 请使用 sudo 运行此脚本${NC}"
    exit 1
fi

# 读取用户输入
read -p "请输入您的域名（或留空使用IP）: " DOMAIN_NAME
read -p "是否配置SSL证书？(y/n): " SETUP_SSL

echo -e "${BLUE}📦 安装系统依赖...${NC}"
apt update
apt install -y python3 python3-pip python3-venv nginx sqlite3 git curl

echo -e "${BLUE}📁 创建应用目录...${NC}"
mkdir -p /var/www/chat_system/{instance,instance/uploads}
mkdir -p /var/log/chat_system
mkdir -p /var/run/chat_system

echo -e "${BLUE}🐍 设置Python环境...${NC}"
cd /var/www/chat_system
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn eventlet

echo -e "${BLUE}🗄️ 初始化数据库...${NC}"
FLASK_ENV=production python flask/init_db.py

echo -e "${BLUE}🌐 配置Nginx...${NC}"
# 修改nginx配置中的域名
if [ ! -z "$DOMAIN_NAME" ]; then
    sed -i "s/your-domain.com/$DOMAIN_NAME/g" nginx.conf
fi

cp nginx.conf /etc/nginx/sites-available/chat_system
ln -sf /etc/nginx/sites-available/chat_system /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo -e "${BLUE}⚙️ 配置systemd服务...${NC}"
cp chat_system.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable chat_system

echo -e "${BLUE}🔐 设置文件权限...${NC}"
useradd -r -s /bin/false www-data 2>/dev/null || true
chown -R www-data:www-data /var/www/chat_system
chown -R www-data:www-data /var/log/chat_system
chown -R www-data:www-data /var/run/chat_system

echo -e "${BLUE}🚀 启动服务...${NC}"
systemctl start chat_system
systemctl start nginx

# SSL配置
if [ "$SETUP_SSL" = "y" ] && [ ! -z "$DOMAIN_NAME" ]; then
    echo -e "${BLUE}🔒 配置SSL证书...${NC}"
    snap install --classic certbot 2>/dev/null || true
    ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
    certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME
fi

echo -e "${GREEN}✅ 部署完成！${NC}"
echo "====================================="
echo "🌐 访问地址："
if [ ! -z "$DOMAIN_NAME" ]; then
    if [ "$SETUP_SSL" = "y" ]; then
        echo "   https://$DOMAIN_NAME"
    else
        echo "   http://$DOMAIN_NAME"
    fi
else
    echo "   http://$(curl -s ifconfig.me)"
fi

echo ""
echo "📋 常用命令："
echo "   查看应用状态: systemctl status chat_system"
echo "   查看应用日志: journalctl -u chat_system -f"
echo "   重启应用: systemctl restart chat_system"
echo "   查看Nginx状态: systemctl status nginx"

echo ""
echo -e "${GREEN}🎉 Chat System 部署成功！${NC}"
