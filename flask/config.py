"""
Configuration file
Contains various configuration options for the application
Supports different environments (development, testing, production)
"""
import os
from datetime import timedelta

class Config:
    """Base configuration, applicable to all environments"""
    # Application settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev_key_for_testing'
    DATABASE = 'chat_system.sqlite'
    UPLOAD_FOLDER = os.path.join('static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # 端到端加密设置
    DEFAULT_CHANNEL_ENCRYPTION = True  # 默认启用频道端到端加密
    
    # Session settings - Using Flask's default cookie storage, not file system
    # SESSION_TYPE = 'filesystem'
    # SESSION_FILE_DIR = 'flask_session'
    SESSION_PERMANENT = False
    PERMANENT_SESSION_LIFETIME = timedelta(hours=1)
    
    # Security settings - 基本安全配置
    SESSION_COOKIE_HTTPONLY = True  # 防止JavaScript访问Cookie
    SESSION_COOKIE_SAMESITE = 'Lax'  # 防止CSRF攻击
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = 'Lax'
    
    # 反向代理设置
    PREFERRED_URL_SCHEME = os.environ.get('PREFERRED_URL_SCHEME', 'http')
    SERVER_NAME = None  # 让Flask自动处理主机名，适应反向代理
    APPLICATION_ROOT = '/'
    
    # CSRF protection
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600  # 1 hour
    # 启用CSRF检查时间安全性
    WTF_CSRF_SSL_STRICT = False  # 在非HTTPS连接上也接受CSRF令牌
    
    # Flask-Login settings
    LOGIN_DISABLED = False


class DevelopmentConfig(Config):
    """Development environment configuration"""
    DEBUG = True
    TESTING = False
    
    # 开发环境不强制安全Cookie设置
    SESSION_COOKIE_SECURE = False  # 开发环境允许HTTP发送Cookie
    REMEMBER_COOKIE_SECURE = False  # 开发环境允许HTTP发送记住我Cookie
    

class TestingConfig(Config):
    """Testing environment configuration"""
    DEBUG = False
    TESTING = True
    
    # Test database
    DATABASE = 'test_chat_system.sqlite'
    
    # 测试环境禁用安全Cookie与CSRF
    SESSION_COOKIE_SECURE = False
    REMEMBER_COOKIE_SECURE = False
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    """Production environment configuration"""
    DEBUG = False
    TESTING = False
    
    # 生产环境启用安全Cookie设置
    SESSION_COOKIE_SECURE = True  # 生产环境仅通过HTTPS发送Cookie
    REMEMBER_COOKIE_SECURE = True  # 生产环境仅通过HTTPS发送记住我Cookie
    WTF_CSRF_ENABLED = True
    SESSION_COOKIE_HTTPONLY = True
    
    # SameSite policy
    SESSION_COOKIE_SAMESITE = 'Lax'
    REMEMBER_COOKIE_SAMESITE = 'Lax'
    
    # Enable longer session timeout
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)


# Configuration dictionary for selecting configuration based on environment variable
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig  # Default configuration
} 