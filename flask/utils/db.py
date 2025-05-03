import sqlite3
import os
from flask import g, current_app

def get_db_connection():
    """获取数据库连接"""
    db_path = None
    
    # 检查应用上下文中是否指定了数据库路径
    if current_app and hasattr(current_app, 'config'):
        db_path = current_app.config.get('DATABASE')
    
    # 如果没有配置，使用默认的chat_system.sqlite
    if not db_path:
        # 获取应用根目录（假设utils目录位于应用的根目录下）
        app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(app_root, 'chat_system.sqlite')
    
    # 创建数据库连接
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def close_db_connection(exception=None):
    """Close database connection"""
    if hasattr(g, 'db'):
        g.db.close()
        
def init_app(app):
    """Initialize database connection functionality for the application"""
    # Set up database connection before each request
    @app.before_request
    def before_request():
        g.db = get_db_connection()

    # Close database connection after each request
    @app.teardown_request
    def teardown_request(exception):
        close_db_connection(exception) 