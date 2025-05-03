import os
from flask import Flask, session, send_from_directory, g
from flask_login import LoginManager
from datetime import timedelta
from werkzeug.security import check_password_hash
import logging
from .auth import authenticate_user

# 设置登录管理器
login_manager = LoginManager()

def create_app():
    """创建并配置应用程序"""
    app = Flask(__name__, static_folder='static')
    
    # 基本配置
    app.config.from_mapping(
        SECRET_KEY='dev',
        SESSION_COOKIE_HTTPONLY=True,  # 防止XSS获取cookie
        PERMANENT_SESSION_LIFETIME=timedelta(days=7),  # 会话持续时间
        DATABASE=os.path.join(app.root_path, 'chat_system.sqlite'),  # 数据库路径
    )
    
    # 配置日志记录
    logging.basicConfig(
        level=logging.DEBUG,
        format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # 注册登录管理器
    login_manager.init_app(app)
    
    # 从auth模块导入用户加载器
    from .models.users import User
    
    @login_manager.user_loader
    def load_user(user_id):
        """加载用户"""
        return User.get(user_id)
    
    # 配置登录视图
    login_manager.login_view = 'auth.login'
    login_manager.login_message = '请先登录以访问此页面'
    
    # 注册蓝图
    from .blueprints.auth import auth_bp
    from .blueprints.base import base_bp
    from .blueprints.admin import admin_bp
    from .blueprints.messages import messages_bp
    from .blueprints.channels import channels_bp
    from .blueprints.crypto import crypto_bp  # 加密蓝图
    from .blueprints.profiles import profiles_bp  # 用户资料蓝图
    from .blueprints.files import files_bp  # 文件蓝图
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(base_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(channels_bp)
    app.register_blueprint(crypto_bp)  # 注册加密蓝图
    app.register_blueprint(profiles_bp)  # 注册用户资料蓝图
    app.register_blueprint(files_bp)  # 注册文件蓝图
    
    # 创建数据库表（如果不存在）
    from . import db
    db.init_app(app)
    
    # 设置全局会话管理
    @app.before_request
    def make_session_permanent():
        session.permanent = True
    
    return app 