"""
Database Initialization Script
For creating database tables and inserting initial data, with support for end-to-end encryption and double encryption
"""
import sqlite3
import os
import base64
from werkzeug.security import generate_password_hash
import bcrypt
from datetime import datetime
import json

def init_db():
    """Initialize database, create tables and insert initial data"""
    # Ensure database file exists
    db_path = 'chat_system.sqlite'
    
    # Read schema.sql file
    with open('schema.sql', 'r') as f:
        schema = f.read()
    
    # Connect to database and create tables
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(schema)
    
    # Check if admin user already exists
    admin_exists = conn.execute('SELECT 1 FROM users WHERE username = ?', ('admin',)).fetchone()
    
    # If admin user doesn't exist, create initial data
    if not admin_exists:
        # Create admin user with bcrypt hashed password
        salt = bcrypt.gensalt(rounds=12)
        admin_password = bcrypt.hashpw('admin123'.encode('utf-8'), salt).decode('utf-8')
        conn.execute('INSERT INTO users (username, email, password_hash, is_active) VALUES (?, ?, ?, ?)',
                    ('admin', 'admin@example.com', admin_password, 1))
        
        # Create test users with bcrypt hashed passwords
        salt1 = bcrypt.gensalt(rounds=12)
        test_user1 = bcrypt.hashpw('password123'.encode('utf-8'), salt1).decode('utf-8')
        
        salt2 = bcrypt.gensalt(rounds=12)
        test_user2 = bcrypt.hashpw('password456'.encode('utf-8'), salt2).decode('utf-8')
        
        salt3 = bcrypt.gensalt(rounds=12)
        test_user3 = bcrypt.hashpw('password789'.encode('utf-8'), salt3).decode('utf-8')
        
        conn.execute('INSERT INTO users (username, email, password_hash, is_active) VALUES (?, ?, ?, ?)',
                    ('alice', 'alice@example.com', test_user1, 1))
        conn.execute('INSERT INTO users (username, email, password_hash, is_active) VALUES (?, ?, ?, ?)',
                    ('bob', 'bob@example.com', test_user2, 1))
        conn.execute('INSERT INTO users (username, email, password_hash, is_active) VALUES (?, ?, ?, ?)',
                    ('charlie', 'charlie@example.com', test_user3, 1))
        
        # Get user IDs
        admin_id = conn.execute('SELECT user_id FROM users WHERE username = ?', ('admin',)).fetchone()['user_id']
        alice_id = conn.execute('SELECT user_id FROM users WHERE username = ?', ('alice',)).fetchone()['user_id']
        bob_id = conn.execute('SELECT user_id FROM users WHERE username = ?', ('bob',)).fetchone()['user_id']
        charlie_id = conn.execute('SELECT user_id FROM users WHERE username = ?', ('charlie',)).fetchone()['user_id']
        
        # Create public chat room
        conn.execute('INSERT INTO rooms (room_name, created_by, is_private, description) VALUES (?, ?, ?, ?)',
                    ('General', admin_id, 0, 'Chat room accessible to all members'))
        
        # Create private chat room
        conn.execute('INSERT INTO rooms (room_name, created_by, is_private, description) VALUES (?, ?, ?, ?)',
                    ('Development Team', admin_id, 1, 'Chat room exclusive to the software development team'))
        
        # Get room IDs
        general_room_id = conn.execute('SELECT room_id FROM rooms WHERE room_name = ?', ('General',)).fetchone()['room_id']
        dev_room_id = conn.execute('SELECT room_id FROM rooms WHERE room_name = ?', ('Development Team',)).fetchone()['room_id']
        
        # Create channels in General chat room
        conn.execute('INSERT INTO channels (channel_name, description, room_id, created_by) VALUES (?, ?, ?, ?)',
                    ('Announcements', 'Important announcements channel', general_room_id, admin_id))
        conn.execute('INSERT INTO channels (channel_name, description, room_id, created_by) VALUES (?, ?, ?, ?)',
                    ('Casual Chat', 'Daily casual conversation channel', general_room_id, admin_id))
        
        # Create channels in Development Team chat room
        conn.execute('INSERT INTO channels (channel_name, description, room_id, created_by, is_private) VALUES (?, ?, ?, ?, ?)',
                    ('Frontend', 'Frontend development discussion', dev_room_id, admin_id, 0))
        conn.execute('INSERT INTO channels (channel_name, description, room_id, created_by, is_private) VALUES (?, ?, ?, ?, ?)',
                    ('Backend', 'Backend development discussion', dev_room_id, admin_id, 0))
        
        # 创建一个启用端到端加密的安全频道
        conn.execute('INSERT INTO channels (channel_name, description, room_id, created_by, is_private, is_encrypted) VALUES (?, ?, ?, ?, ?, ?)',
                    ('Secure Chat', 'End-to-end encrypted channel for sensitive discussions', dev_room_id, admin_id, 1, 1))
        
        # Get all channel IDs
        all_channels = conn.execute('SELECT channel_id, room_id, channel_name, is_private, is_encrypted FROM channels').fetchall()
        
        # Add users to chat rooms
        # All users join General chat room
        conn.execute('INSERT INTO user_rooms (user_id, room_id, role) VALUES (?, ?, ?)', (admin_id, general_room_id, 'owner'))
        conn.execute('INSERT INTO user_rooms (user_id, room_id, role) VALUES (?, ?, ?)', (alice_id, general_room_id, 'member'))
        conn.execute('INSERT INTO user_rooms (user_id, room_id, role) VALUES (?, ?, ?)', (bob_id, general_room_id, 'member'))
        conn.execute('INSERT INTO user_rooms (user_id, room_id, role) VALUES (?, ?, ?)', (charlie_id, general_room_id, 'member'))
        
        # Some users join Development Team chat room
        conn.execute('INSERT INTO user_rooms (user_id, room_id, role) VALUES (?, ?, ?)', (admin_id, dev_room_id, 'owner'))
        conn.execute('INSERT INTO user_rooms (user_id, room_id, role) VALUES (?, ?, ?)', (alice_id, dev_room_id, 'admin'))
        conn.execute('INSERT INTO user_rooms (user_id, room_id, role) VALUES (?, ?, ?)', (bob_id, dev_room_id, 'member'))
        
        # Get all users
        all_users = conn.execute('SELECT user_id, username FROM users').fetchall()
        
        # Add users to channels
        # To ensure admin can access all channels, add admin to all channels
        for channel in all_channels:
            conn.execute('INSERT INTO user_channels (user_id, channel_id, role) VALUES (?, ?, ?)', 
                        (admin_id, channel['channel_id'], 'admin'))
        
        # Add regular users to public channels and specific private channels
        for channel in all_channels:
            for user in all_users:
                user_id = user['user_id']
                
                if user_id != admin_id:  # admin already added
                    # Check if user is a member of this room
                    room_member = conn.execute(
                        'SELECT 1 FROM user_rooms WHERE user_id = ? AND room_id = ?',
                        (user_id, channel['room_id'])
                    ).fetchone()
                    
                    if room_member:
                        # If it's a public channel, add user
                        if channel['is_private'] == 0:
                            conn.execute(
                                'INSERT INTO user_channels (user_id, channel_id, role) VALUES (?, ?, ?)',
                                (user_id, channel['channel_id'], 'member')
                            )
                        
                            # 如果是端到端加密频道，同时添加Alice和Bob作为成员
                            if channel['is_encrypted'] == 1 and user_id in (alice_id, bob_id):
                                conn.execute(
                                    'INSERT INTO user_channels (user_id, channel_id, role) VALUES (?, ?, ?)',
                                    (user_id, channel['channel_id'], 'member')
                                )
        
        # Get channel IDs
        announcement_channel_id = conn.execute('SELECT channel_id FROM channels WHERE channel_name = ? AND room_id = ?', 
                                            ('Announcements', general_room_id)).fetchone()['channel_id']
        chat_channel_id = conn.execute('SELECT channel_id FROM channels WHERE channel_name = ? AND room_id = ?', 
                                    ('Casual Chat', general_room_id)).fetchone()['channel_id']
        secure_channel_id = conn.execute('SELECT channel_id FROM channels WHERE channel_name = ? AND room_id = ?', 
                                    ('Secure Chat', dev_room_id)).fetchone()['channel_id']
        
        # 为加密频道创建加密设置
        conn.execute('INSERT INTO channel_encryption (channel_id, enabled) VALUES (?, ?)', 
                    (secure_channel_id, 1))
        
        # 为加密频道创建示例密钥
        mock_key_data = base64.b64encode(os.urandom(32)).decode('utf-8')
        mock_nonce = base64.b64encode(os.urandom(24)).decode('utf-8')
        
        conn.execute('''
            INSERT INTO channel_keys (channel_id, key_data, nonce, created_by) 
            VALUES (?, ?, ?, ?)
        ''', (secure_channel_id, mock_key_data, mock_nonce, admin_id))
        
        # Create welcome message
        welcome_message = 'Welcome to the internal chat system! This is a secure and efficient tool for team communication.'
        conn.execute('INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)',
                    (announcement_channel_id, admin_id, welcome_message))
        
        # Add some example messages
        conn.execute('INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)',
                    (chat_channel_id, alice_id, 'Hello everyone, I am Alice!'))
        conn.execute('INSERT INTO messages (channel_id, user_id, content) VALUES (?, ?, ?)',
                    (chat_channel_id, bob_id, 'Hi Alice, I am Bob! Nice to meet you!'))
        
        # 添加一条加密消息示例
        mock_encrypted_content = base64.b64encode('This is a secure message'.encode('utf-8')).decode('utf-8')
        encrypted_message = json.dumps({
            'encrypted': True,
            'content': mock_encrypted_content,
            'nonce': mock_nonce,
            'timestamp': datetime.now().timestamp()
        })
        
        conn.execute('INSERT INTO messages (channel_id, user_id, content, is_encrypted) VALUES (?, ?, ?, ?)',
                    (secure_channel_id, alice_id, encrypted_message, 1))
        
        # Create user relationships (friendships)
        conn.execute('INSERT INTO user_relations (user_id, related_user_id, relation_type) VALUES (?, ?, ?)',
                    (alice_id, bob_id, 'friend'))
        conn.execute('INSERT INTO user_relations (user_id, related_user_id, relation_type) VALUES (?, ?, ?)',
                    (bob_id, alice_id, 'friend'))
        conn.execute('INSERT INTO user_relations (user_id, related_user_id, relation_type) VALUES (?, ?, ?)',
                    (alice_id, charlie_id, 'friend'))
        conn.execute('INSERT INTO user_relations (user_id, related_user_id, relation_type) VALUES (?, ?, ?)',
                    (charlie_id, alice_id, 'friend'))
        
        # Create direct messages
        # Initially store in plain text but will be migrated to encrypted format
        conn.execute('INSERT INTO direct_messages (sender_id, recipient_id, content) VALUES (?, ?, ?)',
                    (alice_id, bob_id, 'Hi Bob, this is a private message that others cannot see.'))
        conn.execute('INSERT INTO direct_messages (sender_id, recipient_id, content) VALUES (?, ?, ?)',
                    (bob_id, alice_id, 'Got it, Alice! This private messaging method is very convenient.'))
        
        # Add admin role to admin user
        conn.execute('''
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, role),
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
        ''')
        
        conn.execute('INSERT INTO user_roles (user_id, role) VALUES (?, ?)', (admin_id, 'admin'))
        
        # Commit changes
        conn.commit()
        print('Initial data created successfully')
    else:
        print('Data already exists, skipping initialization')
    
    # Check and add possibly missing tables
    check_and_add_saved_items_table(conn)
    
    # Add end-to-end encryption support with double encryption
    add_e2ee_support(conn)
    
    # 添加频道端到端加密支持
    add_channel_e2ee_support(conn)
    
    # 添加频道密钥分发相关表
    add_channel_key_distribution_support(conn)
    
    # 检查并修复channel_key_shares表
    ensure_keyshares_nonce_field(conn)
    
    # 添加KDM密钥同步相关字段和表
    add_channel_key_version_support(conn)
    
    conn.close()
    print('Database initialization completed')

def check_and_add_saved_items_table(conn):
    # Check if saved_items table exists
    table_exists = conn.execute('''
        SELECT name 
        FROM sqlite_master 
        WHERE type='table' AND name='saved_items'
    ''').fetchone()
    
    if not table_exists:
        print("Creating saved_items table...")
        conn.executescript('''
            -- Create saved messages/files table
            CREATE TABLE IF NOT EXISTS saved_items (
                save_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,             -- User who saved this item
                item_type TEXT NOT NULL,              -- 'message', 'file'
                item_id INTEGER NOT NULL,             -- message_id or file_id
                channel_id INTEGER NOT NULL,          -- Channel it belongs to
                saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,                           -- User's notes or comments
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
            );
            
            -- Indexes for saved items
            CREATE INDEX IF NOT EXISTS idx_saved_items_user ON saved_items(user_id);
            CREATE INDEX IF NOT EXISTS idx_saved_items_channel ON saved_items(channel_id);
            CREATE INDEX IF NOT EXISTS idx_saved_items_item ON saved_items(item_type, item_id);
            CREATE INDEX IF NOT EXISTS idx_saved_items_saved_at ON saved_items(saved_at);
        ''')
        conn.commit()
        print("saved_items table created successfully")
    else:
        print("saved_items table already exists")

def add_e2ee_support(conn):
    """Add end-to-end encryption support to database with double encryption"""
    cursor = conn.cursor()
    
    # Check if public_key column already exists in users table
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    user_columns = [column[1] for column in columns]
    
    if 'public_key' not in user_columns:
        print("添加用户公钥字段...")
        cursor.execute("ALTER TABLE users ADD COLUMN public_key TEXT")
        cursor.execute("ALTER TABLE users ADD COLUMN key_updated_at TIMESTAMP")
        print("用户表更新完成")
    
    # Check if encryption-related columns exist in direct_messages table
    cursor.execute("PRAGMA table_info(direct_messages)")
    columns = cursor.fetchall()
    dm_columns = [column[1] for column in columns]
    
    # Add encryption-related fields for double encryption
    columns_to_add = {
        'encrypted_content': "加密后的内容（给接收者的）",
        'iv': "接收者的随机向量/nonce",
        'encrypted_for_self': "加密后的内容（给发送者自己的副本）",
        'iv_for_self': "发送者自己的随机向量/nonce"
    }
    
    for col_name, description in columns_to_add.items():
        if col_name not in dm_columns:
            print(f"添加字段: {col_name} - {description}")
            cursor.execute(f"ALTER TABLE direct_messages ADD COLUMN {col_name} TEXT")
    
    # Ensure content field is nullable (for fully encrypted messages)
    if 'encrypted_content' not in dm_columns or 'encrypted_for_self' not in dm_columns:
        print("确保内容字段可为空（用于完全加密消息）...")
        
        # Create a temporary table with the updated schema
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS direct_messages_temp (
            dm_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            recipient_id INTEGER NOT NULL,
            content TEXT,
            encrypted_content TEXT,
            iv TEXT,
            encrypted_for_self TEXT,
            iv_for_self TEXT,
            message_type TEXT DEFAULT 'text',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP,
            is_deleted INTEGER DEFAULT 0
        )
        """)
        
        # Copy existing data to the new table
        existing_columns = ", ".join(dm_columns)
        cursor.execute(f"""
        INSERT INTO direct_messages_temp ({existing_columns})
        SELECT {existing_columns} FROM direct_messages
        """)
        
        # Drop old table and rename new one
        cursor.execute("DROP TABLE direct_messages")
        cursor.execute("ALTER TABLE direct_messages_temp RENAME TO direct_messages")
        
        print("消息表更新完成，添加了双重加密支持")
    
    # Create or update user_keys table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_keys'")
    if not cursor.fetchone():
        print('创建user_keys表...')
        cursor.execute('''
        CREATE TABLE user_keys (
            key_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            public_key TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (user_id)
        )
        ''')
        print('user_keys表创建成功')
        
        # Generate mock key pairs for existing users
        cursor.execute("SELECT user_id, username FROM users")
        users = cursor.fetchall()
        
        print(f"为{len(users)}个现有用户生成密钥对...")
        for user in users:
            user_id = user[0]
            username = user[1]
            
            # Generate a mock public key (in a real scenario, use proper crypto libraries)
            mock_public_key = base64.b64encode(os.urandom(32)).decode('utf-8')
            
            # Save public key to user_keys table
            cursor.execute(
                "INSERT INTO user_keys (user_id, public_key) VALUES (?, ?)",
                (user_id, mock_public_key)
            )
            
            # Update the users table with the same key
            cursor.execute(
                "UPDATE users SET public_key = ?, key_updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                (mock_public_key, user_id)
            )
            
            print(f"为用户 {username} (ID={user_id}) 生成密钥对")
    else:
        print('user_keys表已存在')
        # Check table structure
        cursor.execute("PRAGMA table_info(user_keys)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        # Check if we need to add updated_at column
        if 'updated_at' not in column_names:
            print('向user_keys表添加updated_at列...')
            cursor.execute("ALTER TABLE user_keys ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        
        # Check for users without keys and create them
        cursor.execute("""
        SELECT u.user_id, u.username FROM users u
        LEFT JOIN user_keys k ON u.user_id = k.user_id
        WHERE k.user_id IS NULL
        """)
        
        users_without_keys = cursor.fetchall()
        if users_without_keys:
            print(f"为{len(users_without_keys)}个缺少密钥的用户生成密钥对...")
            for user in users_without_keys:
                user_id = user[0]
                username = user[1]
                
                # Generate a mock public key
                mock_public_key = base64.b64encode(os.urandom(32)).decode('utf-8')
                
                # Save to user_keys table
                cursor.execute(
                    "INSERT INTO user_keys (user_id, public_key) VALUES (?, ?)",
                    (user_id, mock_public_key)
                )
                
                # Update the users table
                cursor.execute(
                    "UPDATE users SET public_key = ?, key_updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                    (mock_public_key, user_id)
                )
                
                print(f"为用户 {username} (ID={user_id}) 生成密钥对")
        
        # Sync keys between tables to ensure consistency
        cursor.execute("""
        UPDATE users 
        SET public_key = (
            SELECT public_key FROM user_keys 
            WHERE user_keys.user_id = users.user_id
        ),
        key_updated_at = CURRENT_TIMESTAMP
        WHERE public_key IS NULL OR public_key = ''
        """)
    
    # Check for existing direct messages that need encryption
    cursor.execute("""
    SELECT dm_id, sender_id, recipient_id, content 
    FROM direct_messages 
    WHERE (encrypted_content IS NULL OR encrypted_for_self IS NULL) AND content IS NOT NULL
    """)
    
    messages_to_encrypt = cursor.fetchall()
    if messages_to_encrypt:
        print(f"加密{len(messages_to_encrypt)}条现有私信...")
        for msg in messages_to_encrypt:
            dm_id = msg[0]
            sender_id = msg[1]
            recipient_id = msg[2]
            content = msg[3]
            
            # Generate mock encryption (in a real scenario, use proper encryption)
            mock_iv_recipient = base64.b64encode(os.urandom(16)).decode('utf-8')
            mock_iv_sender = base64.b64encode(os.urandom(16)).decode('utf-8')
            mock_encrypted_for_recipient = base64.b64encode(content.encode('utf-8')).decode('utf-8')
            mock_encrypted_for_sender = base64.b64encode(content.encode('utf-8')).decode('utf-8')
            
            # Update the message with encrypted versions
            cursor.execute("""
            UPDATE direct_messages 
            SET encrypted_content = ?, 
                iv = ?,
                encrypted_for_self = ?,
                iv_for_self = ?
            WHERE dm_id = ?
            """, (mock_encrypted_for_recipient, mock_iv_recipient, 
                  mock_encrypted_for_sender, mock_iv_sender, dm_id))
            
        print("完成现有消息加密")
    
    # Commit all changes
    conn.commit()
    print("已成功实现端到端双重加密支持")

def add_channel_e2ee_support(conn):
    """添加频道端到端加密支持"""
    cursor = conn.cursor()
    
    # 检查频道表中是否有is_encrypted字段
    cursor.execute("PRAGMA table_info(channels)")
    columns = cursor.fetchall()
    channel_columns = [column[1] for column in columns]
    
    if 'is_encrypted' not in channel_columns:
        print("添加频道加密标记字段...")
        cursor.execute("ALTER TABLE channels ADD COLUMN is_encrypted INTEGER DEFAULT 0")
        print("频道表更新完成")
    
    # 检查消息表中是否有is_encrypted字段
    cursor.execute("PRAGMA table_info(messages)")
    columns = cursor.fetchall()
    message_columns = [column[1] for column in columns]
    
    if 'is_encrypted' not in message_columns:
        print("添加消息加密标记字段...")
        cursor.execute("ALTER TABLE messages ADD COLUMN is_encrypted INTEGER DEFAULT 0")
        print("消息表更新完成")
    
    # 检查频道加密设置表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_encryption'")
    if not cursor.fetchone():
        print("创建频道加密设置表...")
        cursor.execute('''
        CREATE TABLE channel_encryption (
            channel_id INTEGER PRIMARY KEY,
            enabled INTEGER NOT NULL DEFAULT 0,
            encrypted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_key_rotation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            key_rotation_frequency INTEGER DEFAULT 0,
            FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
        )
        ''')
        print("频道加密设置表创建成功")
    
    # 检查主群组密钥表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_master_keys'")
    if not cursor.fetchone():
        print("创建频道主密钥表...")
        cursor.execute('''
        CREATE TABLE channel_master_keys (
            key_id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            key_version INTEGER NOT NULL DEFAULT 1,
            key_data TEXT NOT NULL,
            nonce TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER NOT NULL,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(user_id),
            UNIQUE(channel_id, key_version)
        )
        ''')
        print("频道主密钥表创建成功")
        
        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cmaster_keys_channel ON channel_master_keys(channel_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cmaster_keys_version ON channel_master_keys(key_version)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cmaster_keys_active ON channel_master_keys(is_active)")
    
    # 检查用户频道密钥表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_channel_keys'")
    if not cursor.fetchone():
        print("创建用户频道密钥表...")
        cursor.execute('''
        CREATE TABLE user_channel_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            key_version INTEGER NOT NULL DEFAULT 1,
            encrypted_key TEXT NOT NULL,
            nonce TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            UNIQUE(channel_id, user_id, key_version)
        )
        ''')
        print("用户频道密钥表创建成功")
        
        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_channel_keys_channel ON user_channel_keys(channel_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_channel_keys_user ON user_channel_keys(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_channel_keys_version ON user_channel_keys(key_version)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_channel_keys_active ON user_channel_keys(is_active)")
    
    # 检查密钥轮换日志表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='key_rotation_logs'")
    if not cursor.fetchone():
        print("创建密钥轮换日志表...")
        cursor.execute('''
        CREATE TABLE key_rotation_logs (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            old_key_version INTEGER,
            new_key_version INTEGER NOT NULL,
            rotated_by INTEGER NOT NULL,
            rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reason TEXT,
            FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
            FOREIGN KEY (rotated_by) REFERENCES users(user_id) ON DELETE CASCADE
        )
        ''')
        print("密钥轮换日志表创建成功")
        
        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_key_rotation_channel ON key_rotation_logs(channel_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_key_rotation_version ON key_rotation_logs(new_key_version)")
    
    # 从旧的channel_keys表迁移数据到新的表结构(如果存在)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_keys'")
    if cursor.fetchone():
        print("检测到旧的channel_keys表，迁移数据...")
        
        # 查找管理员用户ID
        admin_id = cursor.execute("SELECT user_id FROM users WHERE username = 'admin'").fetchone()
        admin_id = admin_id[0] if admin_id else 1
        
        # 获取所有旧的channel_keys记录
        old_keys = cursor.execute("""
        SELECT channel_id, key_data, nonce, created_by, created_at, is_active 
        FROM channel_keys
        """).fetchall()
        
        if old_keys:
            print(f"发现{len(old_keys)}条旧密钥记录需要迁移")
            
            for old_key in old_keys:
                channel_id = old_key[0]
                key_data = old_key[1]
                nonce = old_key[2]
                created_by = old_key[3]
                created_at = old_key[4]
                is_active = old_key[5]
                
                # 插入到新的主密钥表
                cursor.execute("""
                INSERT INTO channel_master_keys 
                (channel_id, key_version, key_data, nonce, created_by, created_at, is_active)
                VALUES (?, 1, ?, ?, ?, ?, ?)
                """, (channel_id, key_data, nonce, created_by, created_at, is_active))
                
                master_key_id = cursor.lastrowid
                print(f"为频道 {channel_id} 创建了主密钥记录 ID={master_key_id}")
                
                # 不再为每个成员创建用户密钥记录，因为现在只在用户首次发言或密钥轮换时创建
                print(f"注意: 不再为用户自动创建密钥记录，将在用户首次发言或密钥轮换时创建")
            
            print("密钥数据迁移完成")
    
    # 检查现有加密频道
    cursor.execute("SELECT channel_id, channel_name FROM channels WHERE is_encrypted = 1")
    encrypted_channels = cursor.fetchall()
    
    if encrypted_channels:
        print(f"检测到{len(encrypted_channels)}个加密频道")
        
        # 查找管理员用户ID
        admin_id = cursor.execute("SELECT user_id FROM users WHERE username = 'admin'").fetchone()
        admin_id = admin_id[0] if admin_id else 1
        
        for channel in encrypted_channels:
            channel_id = channel[0]
            channel_name = channel[1]
            
            # 检查是否已有频道加密设置
            encryption_settings = cursor.execute("SELECT 1 FROM channel_encryption WHERE channel_id = ?", 
                                                (channel_id,)).fetchone()
            
            if not encryption_settings:
                print(f"为频道 '{channel_name}' (ID={channel_id}) 创建加密设置")
                cursor.execute('''
                INSERT INTO channel_encryption (channel_id, enabled)
                VALUES (?, 1)
                ''', (channel_id,))
            
            # 检查是否已有频道主密钥
            master_key = cursor.execute("SELECT 1 FROM channel_master_keys WHERE channel_id = ?", 
                                      (channel_id,)).fetchone()
            
            if not master_key:
                print(f"为频道 '{channel_name}' (ID={channel_id}) 创建主密钥")
                # 创建一个模拟密钥
                mock_key_data = base64.b64encode(os.urandom(32)).decode('utf-8')
                mock_nonce = base64.b64encode(os.urandom(24)).decode('utf-8')
                
                cursor.execute('''
                INSERT INTO channel_master_keys (channel_id, key_data, nonce, created_by)
                VALUES (?, ?, ?, ?)
                ''', (channel_id, mock_key_data, mock_nonce, admin_id))
                
                master_key_id = cursor.lastrowid
                print(f"创建了主密钥记录 ID={master_key_id}")
                
                # 不再为每个成员预先创建密钥记录
                print(f"注意: 不再为用户自动创建密钥记录，将在用户首次发言或密钥轮换时创建")
    else:
        print("未检测到加密频道")
    
    # 为文件添加加密支持
    cursor.execute("PRAGMA table_info(files)")
    columns = cursor.fetchall()
    file_columns = [column[1] for column in columns]
    
    if 'is_encrypted' not in file_columns:
        print("添加文件加密标记字段...")
        cursor.execute("ALTER TABLE files ADD COLUMN is_encrypted INTEGER DEFAULT 0")
        print("文件表更新完成")
    
    # 提交所有更改
    conn.commit()
    print("频道端到端加密支持设置完成，已更新为新的群组密钥管理结构")

def add_channel_key_distribution_support(conn):
    """添加频道密钥请求和分发相关的表和初始数据"""
    cursor = conn.cursor()
    
    # 检查密钥分发请求表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='key_distribution_requests'")
    if not cursor.fetchone():
        print("创建密钥分发请求表...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS key_distribution_requests (
            request_id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER NOT NULL,
            requester_id INTEGER NOT NULL,
            admin_id INTEGER,
            key_version INTEGER,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
            FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
        )
        """)
        print("密钥分发请求表已创建")
        
        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_key_requests_channel ON key_distribution_requests(channel_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_key_requests_requester ON key_distribution_requests(requester_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_key_requests_status ON key_distribution_requests(status)")
    
    # 迁移旧的密钥请求数据(如果存在)
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_key_requests'")
    if cursor.fetchone():
        print("检测到旧的channel_key_requests表，迁移数据...")
        
        # 获取旧表中的数据
        old_requests = cursor.execute("""
        SELECT id, channel_id, requester_id, admin_id, status, created_at, fulfilled_at
        FROM channel_key_requests
        """).fetchall()
        
        if old_requests:
            print(f"发现{len(old_requests)}条旧密钥请求记录需要迁移")
            
            for old_req in old_requests:
                req_id = old_req[0]
                channel_id = old_req[1]
                requester_id = old_req[2]
                admin_id = old_req[3]
                status = old_req[4]
                created_at = old_req[5]
                fulfilled_at = old_req[6]
                
                # 默认使用版本1密钥(旧系统没有版本概念)
                key_version = 1
                
                # 插入到新表
                cursor.execute("""
                INSERT INTO key_distribution_requests
                (request_id, channel_id, requester_id, admin_id, key_version, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (req_id, channel_id, requester_id, admin_id, key_version, status, created_at, fulfilled_at or created_at))
                
                print(f"迁移了密钥请求记录ID={req_id}")
            
            print("密钥请求数据迁移完成")
    
    # 确保所有用户都有公钥记录
    print("确保所有用户都有有效的公钥...")
    cursor.execute("SELECT user_id, username FROM users")
    all_users = cursor.fetchall()
    
    for user in all_users:
        user_id = user[0]
        username = user[1]
        
        # 检查用户是否已有公钥
        user_key = cursor.execute("""
        SELECT public_key FROM user_keys 
        WHERE user_id = ?
        """, (user_id,)).fetchone()
        
        if not user_key or not user_key[0]:
            # 生成新的公钥
            mock_public_key = base64.b64encode(os.urandom(32)).decode('utf-8')
            
            # 如果用户密钥记录存在但公钥为空，则更新
            if user_key:
                cursor.execute("""
                UPDATE user_keys 
                SET public_key = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """, (mock_public_key, user_id))
                print(f"更新了用户 '{username}' (ID={user_id}) 的公钥")
            else:
                # 创建新的用户密钥记录
                cursor.execute("""
                INSERT INTO user_keys (user_id, public_key)
                VALUES (?, ?)
                """, (user_id, mock_public_key))
                print(f"为用户 '{username}' (ID={user_id}) 创建了公钥记录")
            
            # 同时更新用户表中的公钥字段
            cursor.execute("""
            UPDATE users
            SET public_key = ?, key_updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            """, (mock_public_key, user_id))
    
    # 同步用户公钥信息
    cursor.execute("""
    UPDATE users
    SET public_key = (
        SELECT public_key FROM user_keys
        WHERE user_keys.user_id = users.user_id
    ),
    key_updated_at = CURRENT_TIMESTAMP
    WHERE EXISTS (
        SELECT 1 FROM user_keys
        WHERE user_keys.user_id = users.user_id
        AND (users.public_key IS NULL OR users.public_key != user_keys.public_key)
    )
    """)
    
    # 检查所有加密频道
    print("初始化频道加密设置...")
    cursor.execute("""
    SELECT c.channel_id, c.channel_name, c.created_by 
    FROM channels c
    WHERE c.is_encrypted = 1
    """)
    encrypted_channels = cursor.fetchall()
    
    if encrypted_channels:
        print(f"发现{len(encrypted_channels)}个加密频道需要初始化")
        
        for channel in encrypted_channels:
            channel_id = channel[0]
            channel_name = channel[1]
            creator_id = channel[2]
            
            print(f"处理频道 '{channel_name}' (ID={channel_id})...")
            
            # 检查是否已有主密钥
            master_key = cursor.execute("""
            SELECT key_id, key_version, key_data, nonce, created_by 
            FROM channel_master_keys
            WHERE channel_id = ? AND is_active = 1
            ORDER BY key_version DESC LIMIT 1
            """, (channel_id,)).fetchone()
            
            # 如果没有主密钥，创建新的主密钥
            if not master_key:
                # 使用频道创建者作为密钥创建者
                admin_id = creator_id
                
                # 生成新的密钥数据
                mock_key_data = base64.b64encode(os.urandom(32)).decode('utf-8')
                mock_nonce = base64.b64encode(os.urandom(24)).decode('utf-8')
                
                cursor.execute("""
                INSERT INTO channel_master_keys
                (channel_id, key_version, key_data, nonce, created_by, is_active)
                VALUES (?, 1, ?, ?, ?, 1)
                """, (channel_id, mock_key_data, mock_nonce, admin_id))
                
                master_key_id = cursor.lastrowid
                print(f"创建了频道 '{channel_name}' 的新主密钥 (ID={master_key_id})")
            else:
                print(f"使用频道 '{channel_name}' 的现有主密钥 (版本={master_key[1]})")
            
            # 更新频道加密设置
            cursor.execute("""
            SELECT 1 FROM channel_encryption
            WHERE channel_id = ?
            """, (channel_id,))
            
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO channel_encryption
                (channel_id, enabled, encrypted_at, last_key_rotation)
                VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (channel_id,))
                print(f"创建了频道 '{channel_name}' 的加密设置记录")
            
            # 创建channel_key_shares表，用于记录密钥共享操作
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
            
            print(f"密钥共享记录表创建或验证完成")
    else:
        print("未发现加密频道，无需初始化")
    
    # 提交所有更改
    conn.commit()
    print("频道密钥分发支持配置完成 - 注意: 不再预创建用户密钥记录，将在用户首次发言或密钥轮换时动态创建")

def ensure_keyshares_nonce_field(conn):
    """确保channel_key_shares表有nonce字段，并补充缺失的密钥共享记录"""
    cursor = conn.cursor()
    
    print("检查channel_key_shares表是否存在...")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='channel_key_shares'")
    if cursor.fetchone():
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
    else:
        print("表不存在，无需处理")
    
    # 检查user_channel_keys表中有哪些记录但channel_key_shares表中没有对应记录
    print("查找缺失的密钥共享记录...")
    try:
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
    except Exception as e:
        print(f"查询缺失记录时发生错误: {str(e)}")
    
    conn.commit()
    print("channel_key_shares表检查和修复完成")

def add_channel_key_version_support(conn):
    """为KDM密钥同步添加必要的数据库字段"""
    print("开始添加KDM密钥同步支持...")
    
    try:
        # 启用外键约束
        conn.execute("PRAGMA foreign_keys = ON")
        
        # 开始事务
        conn.execute("BEGIN TRANSACTION")
        
        # 检查channel_keys表是否存在
        table_exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='channel_keys'"
        ).fetchone()
        
        if not table_exists:
            print("channel_keys表不存在，创建该表")
            conn.execute('''
                CREATE TABLE channel_keys (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    sender_id INTEGER NOT NULL,
                    encrypted_key TEXT NOT NULL,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    version INTEGER DEFAULT 1,
                    acknowledged INTEGER DEFAULT 0,
                    acknowledged_at TIMESTAMP,
                    FOREIGN KEY (channel_id) REFERENCES channels (channel_id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users (user_id) ON DELETE CASCADE
                )
            ''')
            print("channel_keys表创建成功")
        else:
            # 检查表结构是否符合前端预期
            column_info = conn.execute("PRAGMA table_info(channel_keys)").fetchall()
            column_names = [column['name'] for column in column_info]
            
            # 如果现有表结构不包含sender_id或user_id，说明表结构不符合前端预期
            if 'sender_id' not in column_names or 'user_id' not in column_names:
                print("检测到channel_keys表结构与前端预期不符，创建兼容表...")
                
                # 创建一个符合前端预期结构的新表
                conn.execute('''
                CREATE TABLE IF NOT EXISTS channel_keys_compat (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    channel_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    sender_id INTEGER NOT NULL,
                    encrypted_key TEXT NOT NULL,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    version INTEGER DEFAULT 1,
                    acknowledged INTEGER DEFAULT 0,
                    acknowledged_at TIMESTAMP,
                    FOREIGN KEY (channel_id) REFERENCES channels (channel_id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users (user_id) ON DELETE CASCADE
                )
                ''')
                
                # 获取旧表中的数据并尝试转换到新表
                # 检查哪些字段在旧表中存在
                has_version = 'version' in column_names
                has_acknowledged = 'acknowledged' in column_names
                has_acknowledged_at = 'acknowledged_at' in column_names
                
                # 根据存在的字段构建查询
                select_fields = ["key_id", "channel_id", "key_data", "nonce", "created_by", "created_at"]
                if has_version:
                    select_fields.append("version")
                if has_acknowledged:
                    select_fields.append("acknowledged")
                if has_acknowledged_at:
                    select_fields.append("acknowledged_at")
                
                # 构建和执行查询
                select_query = f"SELECT {', '.join(select_fields)} FROM channel_keys"
                old_keys = conn.execute(select_query).fetchall()
                
                if old_keys:
                    print(f"迁移{len(old_keys)}条密钥记录到兼容表...")
                    for old_key in old_keys:
                        # 对于每个旧记录，为系统中的所有用户创建一个新记录
                        # 在实际应用中可能需要更复杂的逻辑来确定哪些用户应该获得密钥
                        
                        key_id = old_key['key_id']
                        channel_id = old_key['channel_id']
                        key_data = old_key['key_data']
                        created_by = old_key['created_by']
                        
                        # 获取版本号，默认为1
                        version = old_key['version'] if has_version and 'version' in old_key.keys() else 1
                        
                        # 获取频道的所有成员
                        channel_members = conn.execute("""
                        SELECT user_id FROM user_channels WHERE channel_id = ?
                        """, (channel_id,)).fetchall()
                        
                        for member in channel_members:
                            user_id = member['user_id']
                            # 跳过发送者自己
                            if user_id == created_by:
                                continue
                                
                            # 插入到兼容表
                            conn.execute("""
                            INSERT INTO channel_keys_compat
                            (channel_id, user_id, sender_id, encrypted_key, version, sent_at)
                            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                            """, (channel_id, user_id, created_by, key_data, version))
                            
                            print(f"为用户{user_id}创建了频道{channel_id}的密钥记录")
                else:
                    print("旧表中没有数据需要迁移")
                
                print("创建视图以兼容现有代码...")
                # 创建一个视图，使旧的代码仍然可以工作
                conn.execute("DROP VIEW IF EXISTS channel_keys_view")
                conn.execute("""
                CREATE VIEW channel_keys_view AS
                SELECT id, channel_id, user_id, sender_id, encrypted_key, 
                       sent_at, version, acknowledged, acknowledged_at
                FROM channel_keys_compat
                """)
                
                print("创建触发器以保持同步...")
                # 创建触发器使对视图的修改应用到实际表
                conn.execute("DROP TRIGGER IF EXISTS channel_keys_instead_of_insert")
                conn.execute("""
                CREATE TRIGGER channel_keys_instead_of_insert
                INSTEAD OF INSERT ON channel_keys_view
                BEGIN
                    INSERT INTO channel_keys_compat 
                    (channel_id, user_id, sender_id, encrypted_key, version, acknowledged, acknowledged_at)
                    VALUES 
                    (NEW.channel_id, NEW.user_id, NEW.sender_id, NEW.encrypted_key, NEW.version, NEW.acknowledged, NEW.acknowledged_at);
                END;
                """)
                
                conn.execute("DROP TRIGGER IF EXISTS channel_keys_instead_of_update")
                conn.execute("""
                CREATE TRIGGER channel_keys_instead_of_update
                INSTEAD OF UPDATE ON channel_keys_view
                BEGIN
                    UPDATE channel_keys_compat
                    SET encrypted_key = NEW.encrypted_key,
                        version = NEW.version,
                        acknowledged = NEW.acknowledged,
                        acknowledged_at = NEW.acknowledged_at
                    WHERE id = OLD.id;
                END;
                """)
                
                print("兼容层设置完成")
            else:
                # 检查version字段是否已存在
                if 'version' not in column_names:
                    print("添加version字段到channel_keys表...")
                    conn.execute("ALTER TABLE channel_keys ADD COLUMN version INTEGER DEFAULT 1")
                    
                    # 为现有记录设置一个初始版本
                    print("为现有记录设置初始版本...")
                    conn.execute("UPDATE channel_keys SET version = 1")
                else:
                    print("version字段已存在")
                
                # 添加acknowledged字段（如果不存在）
                if 'acknowledged' not in column_names:
                    print("添加acknowledged字段到channel_keys表...")
                    conn.execute("ALTER TABLE channel_keys ADD COLUMN acknowledged INTEGER DEFAULT 0")
                else:
                    print("acknowledged字段已存在")
                
                # 添加acknowledged_at字段（如果不存在）
                if 'acknowledged_at' not in column_names:
                    print("添加acknowledged_at字段到channel_keys表...")
                    conn.execute("ALTER TABLE channel_keys ADD COLUMN acknowledged_at TIMESTAMP")
                else:
                    print("acknowledged_at字段已存在")
        
        # 检查user_settings表是否存在
        user_settings_exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'"
        ).fetchone()
        
        # 创建user_settings表（如果不存在）
        if not user_settings_exists:
            print("创建user_settings表...")
            conn.execute('''
                CREATE TABLE user_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    last_kdm_version INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
                    UNIQUE (user_id)
                )
            ''')
        else:
            # 检查last_kdm_version字段是否存在
            settings_columns = conn.execute("PRAGMA table_info(user_settings)").fetchall()
            settings_column_names = [column['name'] for column in settings_columns]
            
            # 添加last_kdm_version字段（如果不存在）
            if 'last_kdm_version' not in settings_column_names:
                print("添加last_kdm_version字段到user_settings表...")
                conn.execute("ALTER TABLE user_settings ADD COLUMN last_kdm_version INTEGER DEFAULT 0")
            else:
                print("last_kdm_version字段已存在")
        
        # 为现有用户创建用户设置记录
        print("为现有用户创建用户设置记录...")
        conn.execute('''
            INSERT OR IGNORE INTO user_settings (user_id, last_kdm_version)
            SELECT user_id, 0 FROM users
        ''')
        
        # 提交事务
        conn.execute("COMMIT")
        print("KDM密钥同步支持添加成功")
    
    except Exception as e:
        # 发生错误时回滚事务
        if conn:
            conn.execute("ROLLBACK")
        print(f"添加KDM密钥同步支持失败: {str(e)}")
        raise

if __name__ == '__main__':
    # Check if database file exists, if it does then delete it
    if os.path.exists('chat_system.sqlite'):
        os.remove('chat_system.sqlite')
        print("Deleted existing database file")
    
    # Initialize database
    init_db() 