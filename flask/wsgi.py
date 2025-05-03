"""
WSGI Entry Point
Used to start Flask application with Gunicorn
"""
# 在Python 3.13中gevent的monkey.patch_all()可能会引起问题
# 由于gunicorn的gevent worker已经会处理monkey patching
# 所以这里不再需要显式调用

import os
from app import app, socketio

# 确保APP_URL_SCHEME设置为正确的协议，以便在反向代理环境中正确生成URL
app.config['PREFERRED_URL_SCHEME'] = os.environ.get('PREFERRED_URL_SCHEME', 'http')

# 创建WSGI应用实例供Gunicorn使用
application = app

# 仅在直接运行时执行
if __name__ == '__main__':
    # 直接执行此文件时，启动应用，通常用于开发
    port = int(os.environ.get('PORT', 8000))
    print(f"应用将在端口 {port} 上启动")
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=False
    ) 