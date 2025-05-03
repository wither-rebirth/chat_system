-- 在user_channels表中添加is_muted字段
ALTER TABLE user_channels ADD COLUMN is_muted INTEGER DEFAULT 0;

-- 创建索引以提高查询效率
CREATE INDEX IF NOT EXISTS idx_user_channels_muted ON user_channels(is_muted); 