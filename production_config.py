"""
生产环境配置文件
"""
import os

class ProductionConfig:
    """生产环境配置"""
    
    # 基本配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-super-secret-production-key-here'
    DEBUG = False
    TESTING = False
    
    # 数据库配置
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or '/var/www/chat_system/instance/chat_system.sqlite'
    
    # Flask-SocketIO 配置
    SOCKETIO_ASYNC_MODE = 'threading'
    SOCKETIO_CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # 文件上传配置
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or '/var/www/chat_system/instance/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # 会话配置
    SESSION_COOKIE_SECURE = True  # HTTPS only
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 86400  # 24小时
    
    # 日志配置
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE') or '/var/log/chat_system/app.log'
    
    # 性能配置
    SQLALCHEMY_POOL_SIZE = 10
    SQLALCHEMY_POOL_TIMEOUT = 30
    SQLALCHEMY_POOL_RECYCLE = 3600
    
    # 安全配置
    WTF_CSRF_TIME_LIMIT = None
    WTF_CSRF_SSL_STRICT = True
    
    @staticmethod
    def init_app(app):
        """初始化应用配置"""
        import logging
        from logging.handlers import RotatingFileHandler
        
        # 确保日志目录存在
        log_dir = os.path.dirname(ProductionConfig.LOG_FILE)
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        # 配置日志处理器
        file_handler = RotatingFileHandler(
            ProductionConfig.LOG_FILE,
            maxBytes=10240000,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s %(name)s %(threadName)s: %(message)s'
        ))
        file_handler.setLevel(getattr(logging, ProductionConfig.LOG_LEVEL))
        app.logger.addHandler(file_handler)
        app.logger.setLevel(getattr(logging, ProductionConfig.LOG_LEVEL))
        app.logger.info('Chat System startup')
