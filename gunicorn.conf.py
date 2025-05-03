"""
Gunicorn配置文件
"""
import multiprocessing
import os

# 获取项目根目录的绝对路径
project_root = os.path.dirname(os.path.abspath(__file__))

# 绑定的IP和端口
bind = "127.0.0.1:8000"

# 工作进程数，通常为CPU核心数的2-4倍
workers = multiprocessing.cpu_count() * 2 + 1

# 使用gevent作为worker类型，支持WebSocket
worker_class = "geventwebsocket.gunicorn.workers.GeventWebSocketWorker"

# 每个工作进程处理的请求数，达到则自动重启该进程
max_requests = 1000
max_requests_jitter = 50

# 工作进程超时时间（秒）
timeout = 120

# 优雅的重启时间（秒）
graceful_timeout = 10

# 日志配置（使用绝对路径）
accesslog = os.path.join(project_root, "logs", "gunicorn_access.log")
errorlog = os.path.join(project_root, "logs", "gunicorn_error.log")
loglevel = "info"

# 守护进程模式
daemon = False

# 进程ID文件
pidfile = os.path.join(project_root, "gunicorn.pid")

# 预加载应用
preload_app = True

# 在退出前等待的秒数
shutdown_timeout = 10 