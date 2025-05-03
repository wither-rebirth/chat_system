from functools import wraps
from flask import request, jsonify, current_app, g
from flask_login import current_user

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

def room_access_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
            
        room_id = kwargs.get('room_id')
        if not room_id:
            return jsonify({"error": "Room ID is required"}), 400
            
        from flask import g
        db = g.db
        
        # Check if user is a member of the room
        member = db.execute(
            'SELECT 1 FROM user_rooms WHERE user_id = ? AND room_id = ?', 
            (current_user.id, room_id)
        ).fetchone()
        
        if not member:
            return jsonify({"error": "Access denied to this room"}), 403
            
        return f(*args, **kwargs)
    return decorated_function
    
def channel_access_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
            
        room_id = kwargs.get('room_id')
        channel_id = kwargs.get('channel_id')
        
        if not room_id or not channel_id:
            return jsonify({"error": "Room ID and Channel ID are required"}), 400
            
        from flask import g
        db = g.db
        
        # First verify the channel belongs to the specified room
        channel = db.execute(
            'SELECT 1 FROM channels WHERE channel_id = ? AND room_id = ?', 
            (channel_id, room_id)
        ).fetchone()
        
        if not channel:
            return jsonify({"error": "Channel not found in this room"}), 404
            
        # Then check if user has access to the room
        member = db.execute(
            'SELECT role FROM user_rooms WHERE user_id = ? AND room_id = ?', 
            (current_user.id, room_id)
        ).fetchone()
        
        if not member:
            return jsonify({"error": "Access denied to this room"}), 403
        
        # 检查用户是否是管理员
        is_admin = member['role'] in ['admin', 'owner']
            
        # For private channels, check specific channel access
        # 但如果用户是管理员，则可以访问所有频道
        channel_is_private = db.execute(
            'SELECT is_private FROM channels WHERE channel_id = ?',
            (channel_id,)
        ).fetchone()
        
        if channel_is_private and channel_is_private['is_private'] == 1 and not is_admin:
            channel_member = db.execute(
                'SELECT 1 FROM user_channels WHERE user_id = ? AND channel_id = ?',
                (current_user.id, channel_id)
            ).fetchone()
            
            if not channel_member:
                return jsonify({"error": "Access denied to this private channel"}), 403
                
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
            
        room_id = kwargs.get('room_id')
        if not room_id:
            return jsonify({"error": "Room ID is required"}), 400
            
        from flask import g
        db = g.db
        
        # Check if user is an admin or owner of the room
        member = db.execute(
            'SELECT role FROM user_rooms WHERE user_id = ? AND room_id = ?', 
            (current_user.id, room_id)
        ).fetchone()
        
        if not member or member['role'] not in ['admin', 'owner']:
            return jsonify({"error": "Admin privileges required"}), 403
            
        return f(*args, **kwargs)
    return decorated_function

def owner_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
            
        room_id = kwargs.get('room_id')
        if not room_id:
            return jsonify({"error": "Room ID is required"}), 400
            
        from flask import g
        db = g.db
        
        # Check if user is the owner of the room
        member = db.execute(
            'SELECT role FROM user_rooms WHERE user_id = ? AND room_id = ?', 
            (current_user.id, room_id)
        ).fetchone()
        
        if not member or member['role'] != 'owner':
            return jsonify({"error": "Owner privileges required"}), 403
            
        return f(*args, **kwargs)
    return decorated_function 