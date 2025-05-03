#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os
import sys

# 添加父目录到路径，以便可以导入模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect('flask/chat_system.sqlite')
    conn.row_factory = sqlite3.Row
    return conn

def run_migration():
    """运行迁移，添加nonce字段到channel_key_shares表"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("正在检查channel_key_shares表是否存在...")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_key_shares'")
    if not cursor.fetchone():
        print("表不存在，需要先创建表")
        try:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS channel_key_shares (
                share_id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                recipient_id INTEGER NOT NULL,
                encrypted_key TEXT NOT NULL,
                nonce TEXT DEFAULT 'auto_generated',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_key_shares_channel ON channel_key_shares(channel_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_key_shares_recipient ON channel_key_shares(recipient_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_key_shares_sender ON channel_key_shares(sender_id)")
            conn.commit()
            print("表已创建，已包含nonce字段")
        except Exception as e:
            print(f"创建表失败: {str(e)}")
            conn.close()
            return
    else:
        print("表已存在，检查是否需要添加nonce字段...")
        
        # 检查nonce字段是否存在
        cursor.execute("PRAGMA table_info(channel_key_shares)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if 'nonce' not in column_names:
            print("nonce字段不存在，添加字段...")
            try:
                cursor.execute("ALTER TABLE channel_key_shares ADD COLUMN nonce TEXT DEFAULT 'auto_generated'")
                conn.commit()
                print("成功添加nonce字段")
            except Exception as e:
                print(f"添加字段失败: {str(e)}")
        else:
            print("nonce字段已存在，无需添加")
    
    # 检查user_channel_keys表中有哪些记录但channel_key_shares表中没有对应记录
    print("查找缺失的密钥共享记录...")
    cursor.execute("""
    SELECT uck.channel_id, uck.user_id, uck.encrypted_key, uck.nonce
    FROM user_channel_keys uck
    LEFT JOIN channel_key_shares cks ON 
        uck.channel_id = cks.channel_id AND 
        uck.user_id = cks.recipient_id
    WHERE cks.share_id IS NULL
    """)
    
    missing_records = cursor.fetchall()
    if missing_records:
        print(f"发现{len(missing_records)}条缺失的密钥共享记录，尝试补充...")
        for record in missing_records:
            channel_id = record[0]
            user_id = record[1]
            encrypted_key = record[2]
            nonce = record[3]
            
            # 找一个有效的发送者ID（频道管理员）
            cursor.execute("""
            SELECT ur.user_id 
            FROM user_rooms ur
            JOIN channels c ON c.room_id = ur.room_id
            WHERE c.channel_id = ? AND ur.role IN ('admin', 'owner')
            ORDER BY CASE WHEN ur.role = 'owner' THEN 0 ELSE 1 END
            LIMIT 1
            """, (channel_id,))
            
            admin_result = cursor.fetchone()
            sender_id = admin_result[0] if admin_result else 1  # 默认使用ID为1的用户
            
            try:
                cursor.execute("""
                INSERT INTO channel_key_shares
                (channel_id, sender_id, recipient_id, encrypted_key, nonce, created_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """, (channel_id, sender_id, user_id, encrypted_key, nonce))
                print(f"为用户{user_id}在频道{channel_id}中补充密钥共享记录")
            except Exception as e:
                print(f"补充记录失败: {str(e)}")
        
        conn.commit()
        print("缺失记录补充完成")
    else:
        print("未发现缺失的密钥共享记录")
    
    conn.close()
    print("迁移完成")

if __name__ == "__main__":
    print("开始执行添加nonce字段到channel_key_shares表的迁移...")
    run_migration()
    print("迁移执行完毕") 