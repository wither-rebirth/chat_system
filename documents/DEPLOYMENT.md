# Flask应用部署指南

本文档提供了如何使用Gunicorn和Nginx在生产环境中部署Flask应用的详细说明。

## 先决条件

- Python 3.x
- pip（Python包管理器）
- Nginx
- 基本的Linux系统管理知识

## 步骤1：准备Flask应用

### 安装依赖

```bash
pip install -r requirements.txt
```

确保`requirements.txt`包含以下包：

```
flask
flask-socketio
gunicorn
eventlet
gevent
gevent-websocket
```

### 确保WSGI入口点正确

确认`wsgi.py`文件存在并正确配置：

```python
import os
from app import app, socketio

# 根据环境变量设置URL方案
if 'SCHEME' in os.environ:
    app.config['PREFERRED_URL_SCHEME'] = os.environ.get('SCHEME', 'http')

# 为Gunicorn创建WSGI应用实例
application = app

# 直接运行此文件时启动开发服务器
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8000))
    socketio.run(app, host='0.0.0.0', port=port)
```

## 步骤2：配置Gunicorn

### 创建Gunicorn配置文件

创建`gunicorn_config.py`：

```python
# gunicorn_config.py
import multiprocessing

# 绑定的IP和端口
bind = "127.0.0.1:8000"

# 工作进程数量 - 推荐值为(2 x 核心数 + 1)
workers = multiprocessing.cpu_count() * 2 + 1

# 工作模式
worker_class = "eventlet"  # 对于WebSocket支持，使用eventlet或gevent

# 每个工作进程处理的最大并发请求数
worker_connections = 1000

# 超时时间（秒）
timeout = 120

# 访问日志和错误日志
accesslog = "/var/log/gunicorn/access.log"
errorlog = "/var/log/gunicorn/error.log"
loglevel = "info"

# 守护进程模式
daemon = True

# PID文件
pidfile = "/var/run/gunicorn/gunicorn.pid"
```

### 创建必要的目录

```bash
sudo mkdir -p /var/log/gunicorn
sudo mkdir -p /var/run/gunicorn
sudo chown -R 用户名:用户组 /var/log/gunicorn
sudo chown -R 用户名:用户组 /var/run/gunicorn
```

## 步骤3：配置Nginx作为反向代理

### 安装Nginx

```bash
# Debian/Ubuntu系统
sudo apt-get update
sudo apt-get install nginx

# CentOS/RHEL系统
sudo yum install nginx
```

### 创建Nginx配置文件

创建`/etc/nginx/sites-available/flask_app`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 静态文件
    location /static {
        alias /path/to/your/app/static;
        expires 30d;
    }

    # 反向代理到Gunicorn
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # 处理Cookie
        proxy_cookie_path / "/; HttpOnly; Secure; SameSite=Strict";
        
        # 禁用缓冲
        proxy_buffering off;
        proxy_redirect off;
        
        # 超时设置
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
    }

    # 为WebSocket连接配置
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8000;  # 注意：不要在这里添加路径部分
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket特定的超时设置
        proxy_read_timeout 86400;
    }
}
```

### 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/flask_app /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl restart nginx
```

## 步骤4：设置HTTPS（推荐）

### 使用Let's Encrypt获取SSL证书

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 更新Nginx配置

证书安装后，Certbot会自动更新Nginx配置。确保包含以下内容：

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # ... 其余配置与HTTP服务器块相同 ...
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

## 步骤5：启动应用

### 创建启动脚本

创建`start_production.sh`：

```bash
#!/bin/bash

# 设置工作目录
cd /path/to/your/app

# 激活虚拟环境（如果使用）
source /path/to/venv/bin/activate

# 使用Gunicorn启动应用
export SCHEME=https
gunicorn -c gunicorn_config.py wsgi:application
```

### 使脚本可执行

```bash
chmod +x start_production.sh
```

### 创建Systemd服务（推荐）

创建`/etc/systemd/system/flask_app.service`：

```
[Unit]
Description=Gunicorn instance to serve Flask application
After=network.target

[Service]
User=yourusername
Group=yourgroup
WorkingDirectory=/path/to/your/app
Environment="PATH=/path/to/venv/bin"
Environment="SCHEME=https"
ExecStart=/path/to/venv/bin/gunicorn -c gunicorn_config.py wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 启动服务

```bash
sudo systemctl start flask_app
sudo systemctl enable flask_app  # 设置开机自启
```

## 步骤6：监控和维护

### 查看日志

```bash
# Gunicorn日志
sudo tail -f /var/log/gunicorn/access.log
sudo tail -f /var/log/gunicorn/error.log

# Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 重启服务

```bash
sudo systemctl restart flask_app
sudo systemctl restart nginx
```

### 查看服务状态

```bash
sudo systemctl status flask_app
sudo systemctl status nginx
```

## 故障排除

### 常见问题与解决方案

1. **无法连接到服务器**
   - 检查防火墙设置：`sudo ufw status`
   - 确保端口80和443开放：`sudo ufw allow 80/tcp` 和 `sudo ufw allow 443/tcp`

2. **Nginx错误**
   - 检查配置：`sudo nginx -t`
   - 查看错误日志：`sudo tail -f /var/log/nginx/error.log`

3. **Gunicorn无法启动**
   - 检查权限：`ls -la /path/to/your/app`
   - 检查Python路径：`which python`
   - 查看Gunicorn错误：`sudo tail -f /var/log/gunicorn/error.log`

4. **WebSocket连接问题**
   - 确保Nginx配置中包含正确的WebSocket头
   - 检查浏览器控制台中的错误
   - 确认使用了正确的工作进程类型（eventlet或gevent）

5. **SSL证书问题**
   - 验证证书：`sudo certbot certificates`
   - 更新证书：`sudo certbot renew --dry-run`

## 安全建议

1. 始终使用HTTPS
2. 设置适当的请求头，如`X-Content-Type-Options`和`X-Frame-Options`
3. 实施速率限制以防止暴力攻击
4. 定期更新所有软件包
5. 使用防火墙限制访问
6. 考虑实施Web应用防火墙(WAF)

## 进一步优化

1. 启用HTTP/2以提高性能
2. 配置Brotli或Gzip压缩
3. 设置浏览器缓存以减少请求量
4. 使用CDN分发静态内容
5. 实施负载均衡以提高可用性 