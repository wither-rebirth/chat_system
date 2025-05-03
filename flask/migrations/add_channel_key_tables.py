"""
数据库迁移脚本：添加频道密钥请求和密钥共享的数据库表，以及用户加密信息表
"""

import os
import sys
import datetime
from pathlib import Path

# 添加项目根目录到Python路径
root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from app import app, db
from models import ChannelKeyRequest, ChannelKeyShare, UserCryptoInfo

def create_tables():
    """创建密钥请求、密钥共享和用户加密信息相关的数据库表"""
    with app.app_context():
        print("开始创建密钥相关的数据库表...")
        
        # 检查表是否已存在
        inspector = db.inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        tables_to_create = []
        
        # 检查密钥请求表
        if 'channel_key_requests' not in existing_tables:
            tables_to_create.append(ChannelKeyRequest.__table__)
            print("- 将创建 channel_key_requests 表")
        else:
            print("- channel_key_requests 表已存在，跳过")
        
        # 检查密钥共享表
        if 'channel_key_shares' not in existing_tables:
            tables_to_create.append(ChannelKeyShare.__table__)
            print("- 将创建 channel_key_shares 表")
        else:
            print("- channel_key_shares 表已存在，跳过")
        
        # 检查用户加密信息表
        if 'user_crypto_info' not in existing_tables:
            tables_to_create.append(UserCryptoInfo.__table__)
            print("- 将创建 user_crypto_info 表")
        else:
            print("- user_crypto_info 表已存在，跳过")
        
        # 创建表
        if tables_to_create:
            db.create_all(tables=tables_to_create)
            print("表创建完成!")
        else:
            print("没有需要创建的新表。")
        
        print("数据库迁移完成!")

if __name__ == "__main__":
    create_tables() 