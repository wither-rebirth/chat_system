# Chat System 云服务器部署指南

## 🚀 概述

本指南将帮助你在云服务器上部署 Chat System 聊天应用，使用 Nginx + Gunicorn + Flask 的生产环境架构。

## 📋 系统要求

### 最低配置
- **CPU**: 1 核心
- **内存**: 1GB RAM
- **存储**: 10GB 可用空间
- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

### 推荐配置
- **CPU**: 2+ 核心
- **内存**: 2GB+ RAM
- **存储**: 20GB+ 可用空间
- **网络**: 稳定的互联网连接

## 🏗️ 架构图

```
互联网 → Nginx (反向代理) → Gunicorn (WSGI服务器) → Flask应用
                ↓
            静态文件服务
                ↓
            WebSocket支持
```

## 📦 准备工作

### 1. 云服务器设置

1. **购买云服务器**（阿里云、腾讯云、AWS等）
2. **配置安全组规则**：
   - 开放端口 22 (SSH)
   - 开放端口 80 (HTTP)
   - 开放端口 443 (HTTPS)

3. **连接到服务器**：
```bash
ssh root@your-server-ip
```

### 2. 域名配置（可选但推荐）

1. 购买域名
2. 在域名解析商添加 A 记录指向服务器 IP
3. 等待 DNS 传播完成（通常需要几分钟到几小时）

## 🛠️ 自动化部署

### 方法一：一键自动部署（推荐）

1. **上传代码到服务器**：
```bash
# 在本地
git clone https://github.com/your-username/chat_system.git
scp -r chat_system root@your-server-ip:/tmp/

# 在服务器上
mv /tmp/chat_system /var/www/
cd /var/www/chat_system
```

2. **运行自动部署脚本**：
```bash
sudo ./deploy.sh production
```

脚本会自动完成以下操作：
- 安装系统依赖
- 创建 Python 虚拟环境
- 安装应用依赖
- 配置数据库
- 配置 Nginx
- 配置 systemd 服务
- 设置文件权限
- 启动服务

## 🔧 手动部署

如果自动部署失败，可以按照以下步骤手动部署：

### 1. 安装系统依赖

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx supervisor sqlite3
sudo apt install -y build-essential python3-dev libssl-dev libffi-dev

# CentOS/RHEL
sudo yum update
sudo yum install -y python3 python3-pip nginx supervisor sqlite
sudo yum groupinstall -y "Development Tools"
sudo yum install -y python3-devel openssl-devel libffi-devel
```

### 2. 创建应用目录

```bash
sudo mkdir -p /var/www/chat_system
sudo mkdir -p /var/www/chat_system/instance
sudo mkdir -p /var/www/chat_system/instance/uploads
sudo mkdir -p /var/log/chat_system
sudo mkdir -p /var/run/chat_system
```

### 3. 设置 Python 环境

```bash
cd /var/www/chat_system
sudo python3 -m venv venv
sudo chown -R www-data:www-data venv/
sudo -u www-data venv/bin/pip install --upgrade pip
sudo -u www-data venv/bin/pip install -r requirements.txt
sudo -u www-data venv/bin/pip install gunicorn eventlet
```

### 4. 初始化数据库

```bash
cd /var/www/chat_system
sudo -u www-data FLASK_ENV=production venv/bin/python flask/init_db.py
```

### 5. 配置 Nginx

```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/chat_system

# 创建软链接
sudo ln -s /etc/nginx/sites-available/chat_system /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo systemctl reload nginx
```

### 6. 配置 systemd 服务

```bash
# 复制服务文件
sudo cp chat_system.service /etc/systemd/system/

# 重新加载 systemd
sudo systemctl daemon-reload

# 启用并启动服务
sudo systemctl enable chat_system
sudo systemctl start chat_system
```

### 7. 设置文件权限

```bash
sudo chown -R www-data:www-data /var/www/chat_system
sudo chown -R www-data:www-data /var/log/chat_system
sudo chown -R www-data:www-data /var/run/chat_system
sudo chmod -R 755 /var/www/chat_system
```

## 🔒 SSL/HTTPS 配置

### 使用 Let's Encrypt 免费证书

1. **安装 Certbot**：
```bash
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

2. **获取证书**：
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

3. **设置自动续期**：
```bash
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔍 验证部署

### 检查服务状态

```bash
# 检查应用服务
sudo systemctl status chat_system

# 检查 Nginx
sudo systemctl status nginx

# 检查端口
sudo netstat -tulpn | grep -E ":80|:443|:5000"
```

### 查看日志

```bash
# 应用日志
sudo journalctl -u chat_system -f

# Nginx 访问日志
sudo tail -f /var/log/nginx/chat_system_access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/chat_system_error.log

# 应用错误日志
sudo tail -f /var/log/chat_system/app.log
```

### 测试功能

1. **访问网站**：
   - HTTP: `http://your-domain.com` 或 `http://your-server-ip`
   - HTTPS: `https://your-domain.com`

2. **测试功能**：
   - 用户注册和登录
   - 创建频道和发送消息
   - 文件上传功能
   - 实时聊天功能

## 📝 环境变量配置

创建环境变量文件：

```bash
sudo nano /var/www/chat_system/.env
```

添加以下内容：

```bash
# 生产环境配置
FLASK_ENV=production
FLASK_CONFIG=production
SECRET_KEY=your-super-secret-key-here

# 数据库配置
DATABASE_PATH=/var/www/chat_system/instance/chat_system.sqlite

# 文件上传配置
UPLOAD_FOLDER=/var/www/chat_system/instance/uploads

# 日志配置
LOG_LEVEL=INFO
LOG_FILE=/var/log/chat_system/app.log

# CORS 配置
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

## 🔄 更新和维护

### 更新应用

```bash
# 1. 备份数据库
sudo cp /var/www/chat_system/instance/chat_system.sqlite /var/backups/chat_system/

# 2. 拉取最新代码
cd /var/www/chat_system
sudo git pull origin main

# 3. 更新依赖
sudo -u www-data venv/bin/pip install -r requirements.txt

# 4. 运行数据库迁移（如果有）
sudo -u www-data FLASK_ENV=production venv/bin/python flask/migrations/

# 5. 重启服务
sudo systemctl restart chat_system
sudo systemctl reload nginx
```

### 定期维护

```bash
# 查看磁盘使用情况
df -h

# 清理日志文件
sudo journalctl --vacuum-time=30d

# 备份数据库
sudo cp /var/www/chat_system/instance/chat_system.sqlite /var/backups/chat_system/backup_$(date +%Y%m%d).sqlite

# 更新系统包
sudo apt update && sudo apt upgrade -y
```

## 🚨 故障排除

### 常见问题

1. **服务无法启动**：
```bash
sudo journalctl -u chat_system -n 50
sudo systemctl restart chat_system
```

2. **Nginx 配置错误**：
```bash
sudo nginx -t
sudo systemctl reload nginx
```

3. **权限问题**：
```bash
sudo chown -R www-data:www-data /var/www/chat_system
sudo chmod -R 755 /var/www/chat_system
```

4. **数据库问题**：
```bash
sudo -u www-data sqlite3 /var/www/chat_system/instance/chat_system.sqlite ".tables"
```

5. **端口被占用**：
```bash
sudo lsof -i :5000
sudo kill -9 <PID>
```

### 性能优化

1. **增加 Gunicorn workers**：
   编辑 `gunicorn_config.py` 中的 `workers` 参数

2. **启用 Nginx 缓存**：
   在 Nginx 配置中添加缓存设置

3. **数据库优化**：
   定期清理旧数据，添加索引

## 📞 联系支持

如果遇到问题，请：

1. 查看日志文件
2. 检查系统资源使用情况
3. 参考故障排除章节
4. 联系技术支持

## 🎉 部署完成

恭喜！你的 Chat System 现在已经成功部署在云服务器上。你可以：

- 通过域名或 IP 地址访问应用
- 邀请用户注册和使用
- 监控系统运行状态
- 定期进行维护和更新

祝你使用愉快！
