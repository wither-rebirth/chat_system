"""
Entry point for running Flask application
"""
from app import app, socketio
import os
import ssl
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler

# If this file is run directly
if __name__ == "__main__":
    # 使用固定端口8000
    port = 8000
    print(f"服务将在固定端口 {port} 上启动")
    
    # Get SSL certificate paths
    cert_path = os.environ.get('SSL_CERT_PATH', 'chat.crt')
    key_path = os.environ.get('SSL_KEY_PATH', 'chat.key')
    
    # Check if certificate files exist
    if os.path.exists(cert_path) and os.path.exists(key_path):
        # Create SSL context for gevent
        ssl_args = {
            'keyfile': key_path,
            'certfile': cert_path
        }
        print(f"Running application with SSL certificates: {cert_path}, {key_path}")
    else:
        ssl_args = {}
        print("Warning: SSL certificates not found, running in non-HTTPS mode (not recommended for production)")
    
    # Create gevent WSGI server with WebSocket handler
    server = pywsgi.WSGIServer(
        ('0.0.0.0', port),
        app,
        handler_class=WebSocketHandler,
        **ssl_args
    )
    
    print(f"Starting server on port {port}...")
    # Start server
    server.serve_forever() 