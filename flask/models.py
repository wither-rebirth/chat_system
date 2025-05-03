# ... 现有代码 ...

# 密钥请求和密钥共享相关的模型

class ChannelKeyRequest(db.Model):
    """频道密钥请求模型"""
    __tablename__ = 'channel_key_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    requester_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, fulfilled, rejected
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    fulfilled_at = db.Column(db.DateTime, nullable=True)
    
    # 关系
    channel = db.relationship('Channel', backref=db.backref('key_requests', lazy=True))
    requester = db.relationship('User', foreign_keys=[requester_id], backref=db.backref('key_requests_sent', lazy=True))
    admin = db.relationship('User', foreign_keys=[admin_id], backref=db.backref('key_requests_received', lazy=True))
    
    def __repr__(self):
        return f'<ChannelKeyRequest {self.id} for channel {self.channel_id}>'
    
    def to_dict(self):
        """将对象转换为字典"""
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'requester_id': self.requester_id,
            'admin_id': self.admin_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'fulfilled_at': self.fulfilled_at.isoformat() if self.fulfilled_at else None,
            'requester_username': self.requester.username if self.requester else None,
            'admin_username': self.admin.username if self.admin else None
        }


class ChannelKeyShare(db.Model):
    """频道密钥共享记录模型"""
    __tablename__ = 'channel_key_shares'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    encrypted_key = db.Column(db.Text, nullable=False)  # 加密后的密钥数据
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    
    # 关系
    channel = db.relationship('Channel', backref=db.backref('key_shares', lazy=True))
    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('key_shares_sent', lazy=True))
    recipient = db.relationship('User', foreign_keys=[recipient_id], backref=db.backref('key_shares_received', lazy=True))
    
    def __repr__(self):
        return f'<ChannelKeyShare {self.id} for channel {self.channel_id}>'
    
    def to_dict(self):
        """将对象转换为字典"""
        return {
            'id': self.id,
            'channel_id': self.channel_id,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'sender_username': self.sender.username if self.sender else None,
            'recipient_username': self.recipient.username if self.recipient else None
        }


class UserCryptoInfo(db.Model):
    """用户加密信息模型，存储用户的公钥等加密信息"""
    __tablename__ = 'user_crypto_info'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    public_key = db.Column(db.Text, nullable=True)  # 公钥，用于加密
    key_generated_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)
    
    # 关系
    user = db.relationship('User', backref=db.backref('crypto_info', uselist=False, lazy=True))
    
    def __repr__(self):
        return f'<UserCryptoInfo {self.id} for user {self.user_id}>' 