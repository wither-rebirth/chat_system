"""
加密相关表结构迁移脚本
添加支持端到端加密所需的数据库表和字段
"""
import sqlite3
import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

def run_migration():
    """执行迁移脚本，添加加密相关表结构"""
    print("开始执行加密功能迁移...")
    
    # 获取数据库连接
    conn = sqlite3.connect('chat_system.sqlite')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # 检查channels表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channels'")
        if not cursor.fetchone():
            print("错误: channels表不存在")
            return False
        
        # 检查channels表是否已有is_encrypted字段
        cursor.execute("PRAGMA table_info(channels)")
        columns = cursor.fetchall()
        has_encrypted_field = any(column['name'] == 'is_encrypted' for column in columns)
        
        # 如果没有is_encrypted字段，添加该字段
        if not has_encrypted_field:
            print("添加is_encrypted字段到channels表")
            cursor.execute("ALTER TABLE channels ADD COLUMN is_encrypted INTEGER DEFAULT 0")
            conn.commit()
        else:
            print("channels表已有is_encrypted字段")
        
        # 检查user_keys表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_keys'")
        if not cursor.fetchone():
            print("创建user_keys表")
            cursor.execute('''
                CREATE TABLE user_keys (
                    user_id TEXT PRIMARY KEY,
                    public_key TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.commit()
        else:
            print("user_keys表已存在")
        
        # 检查channel_keys表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_keys'")
        if not cursor.fetchone():
            print("创建channel_keys表")
            cursor.execute('''
                CREATE TABLE channel_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id INTEGER NOT NULL,
                    user_id TEXT NOT NULL,
                    encrypted_key TEXT NOT NULL,
                    sender_id TEXT,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    received_at TIMESTAMP,
                    UNIQUE(channel_id, user_id)
                )
            ''')
            conn.commit()
        else:
            print("channel_keys表已存在")
        
        # 检查notifications表是否存在，如果不存在则创建
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'")
        if not cursor.fetchone():
            print("创建notifications表")
            cursor.execute('''
                CREATE TABLE notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    content TEXT,
                    related_id TEXT,
                    sender_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    read INTEGER DEFAULT 0
                )
            ''')
            conn.commit()
        else:
            print("notifications表已存在")
        
        print("迁移完成")
        return True
    
    except Exception as e:
        print(f"迁移失败: {str(e)}")
        return False
    
    finally:
        conn.close()

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1) 