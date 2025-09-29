"""
Gunicorn 配置文件
用于生产环境部署
"""
import multiprocessing
import os

# 服务器套接字
bind = "127.0.0.1:5000"
backlog = 2048

# Worker 进程
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "eventlet"  # 支持 WebSocket
worker_connections = 1000
timeout = 30
keepalive = 2

# 重启
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# 日志
accesslog = "/var/log/chat_system/gunicorn_access.log"
errorlog = "/var/log/chat_system/gunicorn_error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# 进程命名
proc_name = "chat_system"

# 用户和组（部署时需要调整）
user = "www-data"
group = "www-data"

# PID 文件
pidfile = "/var/run/chat_system/gunicorn.pid"

# 优雅重启
graceful_timeout = 30

# SSL 配置（如果使用 HTTPS）
# keyfile = "/path/to/private.key"
# certfile = "/path/to/certificate.crt"

# 环境变量
raw_env = [
    'FLASK_ENV=production',
    'FLASK_CONFIG=production',
]

def when_ready(server):
    """服务器准备就绪时的回调"""
    server.log.info("Chat System server is ready. Listening on: %s", server.address)

def worker_int(worker):
    """Worker 收到 INT 信号时的回调"""
    worker.log.info("worker received INT or QUIT signal")

def pre_fork(server, worker):
    """Fork worker 之前的回调"""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    """Fork worker 之后的回调"""
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_worker_init(worker):
    """Worker 初始化完成后的回调"""
    worker.log.info("Worker initialized (pid: %s)", worker.pid)

def worker_abort(worker):
    """Worker 异常退出时的回调"""
    worker.log.info("Worker aborted (pid: %s)", worker.pid)
