"""
加密工具模块
提供加密操作所需的辅助函数
"""
from flask import jsonify
import re
import json

def validate_public_key(public_key):
    """
    验证公钥格式是否有效
    
    参数:
        public_key: 字符串格式的公钥
        
    返回:
        bool: 公钥格式是否有效
    """
    if not public_key:
        return False
    
    # 通用验证：检查基本格式和长度
    # 对于大多数公钥格式，如Base64等
    if len(public_key) < 32:  # 公钥一般很长
        return False
    
    # 检查格式：可以根据实际需求调整
    # 这里假设公钥是Base64格式
    base64_pattern = r'^[A-Za-z0-9+/]+={0,2}$'
    if not re.match(base64_pattern, public_key):
        return False
    
    return True

def create_error_response(message, status_code=400):
    """
    创建统一的错误响应
    
    参数:
        message: 错误消息
        status_code: HTTP状态码
        
    返回:
        tuple: (JSON响应, 状态码)
    """
    return jsonify({
        'success': False,
        'message': message
    }), status_code

def parse_encrypted_data(encrypted_data_str):
    """
    解析加密数据字符串
    
    参数:
        encrypted_data_str: 加密数据的JSON字符串
        
    返回:
        dict: 解析后的加密数据字典
    """
    try:
        return json.loads(encrypted_data_str)
    except Exception:
        return None 