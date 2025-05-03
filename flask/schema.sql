-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    public_key TEXT,  -- 用户的X25519公钥
    key_updated_at TIMESTAMP  -- 公钥最后更新时间
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    room_id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    is_private INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
    channel_id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_name TEXT NOT NULL,
    description TEXT,
    room_id INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    is_private INTEGER DEFAULT 0,
    is_encrypted INTEGER DEFAULT 0,  -- 新增：标记频道是否启用端到端加密
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- User-Room membership 
CREATE TABLE IF NOT EXISTS user_rooms (
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member', -- member, admin, owner
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, room_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);

-- User-Channel membership
CREATE TABLE IF NOT EXISTS user_channels (
    user_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member', -- member, admin
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_muted INTEGER DEFAULT 0, -- whether user is muted
    PRIMARY KEY (user_id, channel_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    message_id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    parent_id INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_encrypted INTEGER NOT NULL DEFAULT 0, -- 用于标记消息是否加密
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (parent_id) REFERENCES messages(message_id)
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    channel_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0,
    is_encrypted INTEGER DEFAULT 0, -- 新增：标记文件是否加密
    message_id INTEGER, -- Associated message if any
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (message_id) REFERENCES messages(message_id)
);

-- User relationships (contacts/friends)
CREATE TABLE IF NOT EXISTS user_relations (
    user_id INTEGER NOT NULL,
    related_user_id INTEGER NOT NULL,
    relation_type TEXT NOT NULL, -- friend, blocked, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, related_user_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Direct messages (DMs)
CREATE TABLE IF NOT EXISTS direct_messages (
    dm_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    content TEXT,  -- 未加密内容（仅用于回退）
    encrypted_content TEXT,  -- 加密后的内容（给接收者的）
    iv TEXT,  -- 接收者的随机向量/nonce
    encrypted_for_self TEXT, -- 加密后的内容（给发送者自己的副本）
    iv_for_self TEXT, -- 发送者自己的随机向量/nonce
    message_type TEXT DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    is_deleted INTEGER DEFAULT 0,
    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (recipient_id) REFERENCES users(user_id)
);

-- Channel logs (audit trail)
CREATE TABLE IF NOT EXISTS channel_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- update_header, add_member, remove_member, etc.
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT, -- JSON or text description of the change
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Pinned messages table
CREATE TABLE IF NOT EXISTS pinned_messages (
    pin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL, -- Can be numeric ID or client-generated ID (e.g., 'msg_timestamp_random')
    channel_id INTEGER NOT NULL,
    pinned_by INTEGER NOT NULL, -- ID of user who pinned the message
    pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_content TEXT, -- Copy of message content, useful for viewing even if original is deleted
    sender_id INTEGER, -- ID of original message sender
    created_at TIMESTAMP, -- Original message creation time
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (pinned_by) REFERENCES users(user_id)
);

-- 频道加密设置表
CREATE TABLE IF NOT EXISTS channel_encryption (
    channel_id INTEGER PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    encrypted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_key_rotation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    key_rotation_frequency INTEGER DEFAULT 0, -- 0表示不自动轮换密钥
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_encrypted ON messages(is_encrypted);
CREATE INDEX IF NOT EXISTS idx_channels_room ON channels(room_id);
CREATE INDEX IF NOT EXISTS idx_channels_encrypted ON channels(is_encrypted);
CREATE INDEX IF NOT EXISTS idx_user_rooms_room ON user_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_user_rooms_user ON user_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_channel_logs_channel ON channel_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_logs_user ON channel_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_logs_action ON channel_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_channels_muted ON user_channels(is_muted);

-- Indexes for pinned messages
CREATE INDEX IF NOT EXISTS idx_pinned_messages_channel ON pinned_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_message ON pinned_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_pinned_at ON pinned_messages(pinned_at);

-- Indexes for direct messages
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at);

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

-- Add mentions table
CREATE TABLE IF NOT EXISTS mentions (
    mention_id INTEGER PRIMARY KEY,
    message_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (message_id) REFERENCES messages (message_id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels (channel_id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- 频道密钥表
CREATE TABLE IF NOT EXISTS channel_keys (
    key_id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    key_data TEXT NOT NULL, -- 加密的群组密钥
    nonce TEXT NOT NULL, -- 用于加密的nonce
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL, -- 创建密钥的用户ID
    is_active INTEGER DEFAULT 1, -- 标记是否为当前活跃密钥
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- 修改为主密钥和用户密钥分离的结构
-- 频道主密钥表（由频道管理员管理）
CREATE TABLE IF NOT EXISTS channel_master_keys (
    key_id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    key_data TEXT NOT NULL, -- 加密的主群组密钥（使用管理员公钥加密）
    nonce TEXT NOT NULL,    -- 用于加密的nonce
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL, -- 创建密钥的管理员ID
    is_active INTEGER DEFAULT 1, -- 标记是否为当前活跃密钥
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    UNIQUE(channel_id, key_version)
);

-- 用户频道密钥表（为每个频道的每个用户存储一个加密的GK）
CREATE TABLE IF NOT EXISTS user_channel_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1, -- 对应主密钥的版本
    encrypted_key TEXT NOT NULL, -- 用用户公钥加密的群组密钥
    nonce TEXT NOT NULL,         -- 用于加密的nonce
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(channel_id, user_id, key_version)
);

-- 密钥分发请求记录
CREATE TABLE IF NOT EXISTS key_distribution_requests (
    request_id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    requester_id INTEGER NOT NULL,  -- 请求密钥的用户
    admin_id INTEGER,               -- 处理请求的管理员
    key_version INTEGER,            -- 请求的密钥版本（空表示最新）
    status TEXT DEFAULT 'pending',  -- pending, completed, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 密钥轮换日志
CREATE TABLE IF NOT EXISTS key_rotation_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    old_key_version INTEGER,
    new_key_version INTEGER NOT NULL,
    rotated_by INTEGER NOT NULL,  -- 执行轮换的管理员
    rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,                  -- 轮换原因
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (rotated_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 为新表添加索引
CREATE INDEX IF NOT EXISTS idx_cmaster_keys_channel ON channel_master_keys(channel_id);
CREATE INDEX IF NOT EXISTS idx_cmaster_keys_version ON channel_master_keys(key_version);
CREATE INDEX IF NOT EXISTS idx_cmaster_keys_active ON channel_master_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_user_channel_keys_channel ON user_channel_keys(channel_id);
CREATE INDEX IF NOT EXISTS idx_user_channel_keys_user ON user_channel_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_channel_keys_version ON user_channel_keys(key_version);
CREATE INDEX IF NOT EXISTS idx_user_channel_keys_active ON user_channel_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_key_requests_channel ON key_distribution_requests(channel_id);
CREATE INDEX IF NOT EXISTS idx_key_requests_requester ON key_distribution_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_key_requests_status ON key_distribution_requests(status);

CREATE INDEX IF NOT EXISTS idx_key_rotation_channel ON key_rotation_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_key_rotation_version ON key_rotation_logs(new_key_version);