"""
Main application file - Modular version
Initialize Flask application and its extensions
And register each blueprint module
"""
import sys
import os

# Add current directory to system path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from flask import Flask, render_template, request, redirect, url_for, flash, session, g, send_from_directory, abort
from flask_socketio import SocketIO
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_wtf.csrf import CSRFProtect
import sqlite3
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import json
# from flask_session import Session  # No longer using Flask-Session extension
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_talisman import Talisman

# Import configuration
from config import config

# Import utils module functions
from utils.db import get_db_connection, init_app as init_db
from utils.errors import register_error_handlers

# Import blueprints
from blueprints.resources import resources_bp
from blueprints.uploads import uploads_bp
from blueprints.auth import auth_bp, load_user
from blueprints.main import main_bp
from blueprints.chat import chat_bp
from blueprints.crypto import crypto_bp

# Load environment variables
load_dotenv()

# Create Flask application
app = Flask(__name__)

# Add ProxyFix middleware to trust reverse proxy headers
# 修改ProxyFix配置以支持更多代理头部
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1, x_port=1, x_prefix=1, x_for=1)

# Load configuration based on environment variable
env = os.environ.get('FLASK_ENV', 'default')
app.config.from_object(config[env])
print(f"Loading configuration: {env}")

# Ensure uploads directory exists
uploads_path = os.path.join(app.static_folder, app.config['UPLOAD_FOLDER'].split('/')[-1])
os.makedirs(uploads_path, exist_ok=True)

# Initialize CSRF protection
csrf = CSRFProtect(app)

# Initialize session extension - No longer using Flask-Session extension, using Flask's built-in cookie-based sessions
# Session(app)

# Initialize database connection
init_db(app)

# Register error handlers
register_error_handlers(app)

# Initialize Talisman
# 根据环境决定是否强制HTTPS
if env == 'production':
    Talisman(app, 
             force_https=True,  # 生产环境强制使用HTTPS
             strict_transport_security=True,  # 生产环境使用HSTS
             session_cookie_secure=True,  # 生产环境仅允许HTTPS使用session
             content_security_policy=None)  # Disable CSP to avoid conflicts with existing JavaScript
else:
    # 开发环境使用宽松配置
    Talisman(app, 
             force_https=False,  # 开发环境不强制使用HTTPS
             strict_transport_security=False,  # 开发环境不使用HSTS
             session_cookie_secure=False,  # 开发环境允许HTTP使用session
             content_security_policy=None)  # Disable CSP to avoid conflicts with existing JavaScript

# Initialize Socket.IO
socketio = SocketIO(
    app, 
    cors_allowed_origins="*",  # Allow all origins
    manage_session=False,      # Don't manage sessions
    logger=True,               # Enable logging
    engineio_logger=True,      # Enable Engine.IO logging
    async_mode='gevent',       # 使用gevent模式替代eventlet
    monkey_patching=True       # 启用monkey patching以避免线程问题
)

# Initialize LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'  # View to redirect to when not logged in
login_manager.login_message = "Please login to access this page"  # Login prompt message
login_manager.session_protection = "strong"  # Session protection level
login_manager.refresh_view = "auth.login"  # View to redirect to when session expires

# HTTPS redirect
@app.before_request
def redirect_to_https():
    # 只在生产环境下强制重定向到HTTPS
    if env == 'production':
        # 如果不是HTTPS且不是从localhost访问，则重定向到HTTPS
        if not request.is_secure and not request.host.startswith(('localhost', '127.0.0.1')):
            url = request.url.replace('http://', 'https://', 1)
            return redirect(url, code=301)

# Add security headers
@app.after_request
def add_security_headers(response):
    # 安全头部设置
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # 只在生产环境添加HSTS头
    if env == 'production':
        # 添加HSTS头
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    
    return response

# Register user loader function
@login_manager.user_loader
def user_loader(user_id):
    print(f"Loading user: id={user_id}")
    user = load_user(user_id)
    if user:
        print(f"User loaded: {user}")
    else:
        print(f"User load failed: id={user_id}")
    return user

# Register blueprints
app.register_blueprint(main_bp)  # Main blueprint remains at root, no prefix needed
app.register_blueprint(auth_bp, url_prefix='/auth')  # Authentication routes
app.register_blueprint(resources_bp)
app.register_blueprint(uploads_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(crypto_bp)  # 注册加密蓝图

# Simplify CSRF configuration - Only use CSRF protection in forms
# This will allow API requests to bypass CSRF protection
app.config['WTF_CSRF_CHECK_DEFAULT'] = False

# Import Socket.IO events
from socket_events import register_socket_events
register_socket_events(socketio)

# Main function
if __name__ == '__main__':
    app.run(debug=app.config['DEBUG']) 