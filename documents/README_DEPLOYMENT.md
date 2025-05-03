# Gunicorn与Nginx部署指南

本文档介绍如何使用Gunicorn和Nginx部署Flask应用。

## 先决条件

- Python 3.8+
- 虚拟环境
- Nginx
- Gunicorn
- 一个域名（可选，用于HTTPS）

## 安装依赖

```bash
# 安装虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装应用依赖
pip install -r requirements.txt

# 安装Gunicorn和gevent-websocket
pip install gunicorn gevent gevent-websocket
```

## 配置Gunicorn

Gunicorn配置文件`gunicorn.conf.py`已设置好。主要配置包括：

- 绑定到127.0.0.1:8000
- 使用gevent-websocket作为工作类型
- 根据CPU核心自动设置工作进程数
- 日志保存到logs目录

## 配置Nginx

1. 在服务器上安装Nginx：

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install epel-release
sudo yum install nginx
```

2. 修改`nginx.conf`中的域名和SSL证书路径，然后将其复制到服务器：

```bash
# 备份原配置
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# 复制新配置
sudo cp nginx.conf /etc/nginx/nginx.conf

# 检查配置语法
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

## 设置SSL证书（推荐使用Let's Encrypt）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书并自动配置Nginx
sudo certbot --nginx -d your_domain.com -d www.your_domain.com
```

## 启动应用

使用提供的启动脚本：

```bash
./start_server.sh
```

或者设置为系统服务，确保应用在重启后自动运行。

### 创建systemd服务

创建文件 `/etc/systemd/system/chat-app.service`：

```ini
[Unit]
Description=Gunicorn instance to serve chat application
After=network.target

[Service]
User=your_username
Group=your_group
WorkingDirectory=/path/to/your/app
Environment="PATH=/path/to/your/app/venv/bin"
ExecStart=/path/to/your/app/venv/bin/gunicorn --config gunicorn.conf.py wsgi:application
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

启用并启动服务：

```bash
sudo systemctl enable chat-app
sudo systemctl start chat-app
```

## 监控和日志

- Gunicorn日志：`logs/gunicorn_access.log` 和 `logs/gunicorn_error.log`
- Nginx日志：`/var/log/nginx/access.log` 和 `/var/log/nginx/error.log`

## 排障指南

### 检查Gunicorn是否运行

```bash
ps aux | grep gunicorn
```

### 检查端口是否在监听

```bash
sudo netstat -tlpn | grep 8000
```

### 检查Nginx状态

```bash
sudo systemctl status nginx
```

### 查看Nginx错误日志

```bash
sudo tail -f /var/log/nginx/error.log
```

### 查看Gunicorn错误日志

```bash
tail -f logs/gunicorn_error.log
```

## 性能优化

1. **增加工作进程**：修改`gunicorn.conf.py`中的`workers`参数

2. **启用Nginx缓存**：对静态文件启用缓存

3. **优化静态文件**：压缩CSS和JavaScript文件

4. **调整Nginx缓冲区大小**：
   ```
   proxy_buffers 16 16k;
   proxy_buffer_size 16k;
   ```

5. **启用HTTP/2**：已在Nginx配置中开启

## 安全考虑

1. **设置防火墙**：只允许必要的端口
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow ssh
   sudo ufw enable
   ```

2. **定期更新**：
   ```bash
   sudo apt update && sudo apt upgrade
   ```

3. **自动更新SSL证书**：
   ```bash
   sudo certbot renew --dry-run
   ``` 