"""
Socket.IO event handling module
Handles all real-time communication events
"""
from flask import request, current_app, session
from flask_socketio import emit, join_room, leave_room, disconnect
from flask_login import current_user
from datetime import datetime
import json
from utils.db import get_db_connection

# For tracking currently online users
online_users = {}
# For tracking each user's session IDs
user_sessions = {}

# 获取用户的Socket ID
def get_user_socket_id(user_id):
    """
    获取指定用户ID的Socket ID
    如果用户有多个会话，返回第一个会话的ID
    如果用户不在线，返回None
    """
    if user_id in user_sessions and user_sessions[user_id]:
        return user_sessions[user_id][0]
    return None

def process_channel_key(conn, channel_id, user_id, username):
    """
    处理频道密钥，确保用户在加密频道中有对应的密钥记录
    无论消息是否加密，都应该调用此函数来确保密钥共享正常
    
    参数:
    - conn: 数据库连接
    - channel_id: 频道ID
    - user_id: 用户ID
    - username: 用户名，用于日志记录
    
    返回:
    - True: 如果用户已有密钥或成功处理了密钥
    - False: 如果处理失败
    """
    try:
        # 检查频道是否启用了加密
        channel = conn.execute("SELECT is_encrypted FROM channels WHERE channel_id = ?", 
                             (channel_id,)).fetchone()
        
        if not channel or not channel['is_encrypted']:
            # 频道不存在或未启用加密
            return True
        
        print(f"处理频道 {channel_id} 的密钥，用户 {user_id}")
        
        # 检查用户是否已有密钥记录
        user_has_key = conn.execute("""
            SELECT 1 FROM user_channel_keys 
            WHERE channel_id = ? AND user_id = ? AND is_active = 1
        """, (channel_id, user_id)).fetchone()
        
        # 如果用户已有密钥，无需处理
        if user_has_key:
            print(f"用户 {user_id} 已有频道 {channel_id} 的密钥记录")
            return True
        
        # 获取密钥版本
        key_version = 1  # 默认值
        master_key = conn.execute("""
            SELECT key_version FROM channel_master_keys 
            WHERE channel_id = ? AND is_active = 1
            ORDER BY key_version DESC LIMIT 1
        """, (channel_id,)).fetchone()
        
        if master_key:
            if isinstance(master_key, dict) and 'key_version' in master_key:
                key_version = master_key['key_version']
            else:
                key_version = master_key[0]
                
        # 查找密钥共享记录
        key_shares = conn.execute("""
            SELECT * FROM channel_key_shares 
            WHERE channel_id = ? AND recipient_id = ?
            ORDER BY created_at DESC
        """, (channel_id, user_id)).fetchall()
        
        if key_shares:
            print(f"找到 {len(key_shares)} 条密钥共享记录")
            
            # 使用最新的密钥共享记录
            latest_share = key_shares[0]
            encrypted_key = latest_share['encrypted_key']
            
            # 获取nonce值
            current_nonce = None
            try:
                if 'nonce' in latest_share:
                    current_nonce = latest_share['nonce']
                elif hasattr(latest_share, 'nonce'):
                    current_nonce = latest_share.nonce
                elif isinstance(latest_share, (list, tuple)) and len(latest_share) > 3:
                    # 尝试从列表/元组中获取
                    current_nonce = latest_share[3]
            except Exception as e:
                print(f"获取nonce值时出错: {str(e)}")
            
            if not current_nonce:
                current_nonce = 'auto_generated'
            
            # 尝试插入密钥记录
            try:
                conn.execute("""
                    INSERT INTO user_channel_keys
                    (channel_id, user_id, key_version, encrypted_key, nonce, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (channel_id, user_id, key_version, encrypted_key, current_nonce))
                conn.commit()
                print(f"成功插入新的密钥记录: 用户={user_id}, 频道={channel_id}, 版本={key_version}")
                return True
            except Exception as e:
                # 如果插入失败，可能是因为唯一约束冲突，尝试更新
                print(f"插入密钥记录失败: {str(e)}")
                try:
                    conn.execute("""
                        UPDATE user_channel_keys
                        SET encrypted_key = ?, nonce = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
                        WHERE channel_id = ? AND user_id = ? AND key_version = ?
                    """, (encrypted_key, current_nonce, channel_id, user_id, key_version))
                    conn.commit()
                    print(f"成功更新现有密钥记录")
                    return True
                except Exception as update_err:
                    print(f"更新密钥记录失败: {str(update_err)}")
                    
                    # 最后尝试：删除重建
                    try:
                        conn.execute("""
                            DELETE FROM user_channel_keys
                            WHERE channel_id = ? AND user_id = ? AND key_version = ?
                        """, (channel_id, user_id, key_version))
                        conn.commit()
                        
                        conn.execute("""
                            INSERT INTO user_channel_keys
                            (channel_id, user_id, key_version, encrypted_key, nonce, is_active, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        """, (channel_id, user_id, key_version, encrypted_key, current_nonce))
                        conn.commit()
                        print(f"通过删除重建方式成功创建密钥记录")
                        return True
                    except Exception as rebuild_err:
                        print(f"删除重建失败: {str(rebuild_err)}")
        else:
            print(f"未找到用户 {user_id} 在频道 {channel_id} 的密钥共享记录")
            
            # 可以尝试自动触发密钥请求
            try:
                # 查找管理员
                admin = conn.execute("""
                    SELECT ur.user_id 
                    FROM user_rooms ur
                    JOIN channels c ON c.room_id = ur.room_id
                    WHERE c.channel_id = ? AND ur.role IN ('admin', 'owner')
                    ORDER BY CASE WHEN ur.role = 'owner' THEN 0 ELSE 1 END
                    LIMIT 1
                """, (channel_id,)).fetchone()
                
                if admin:
                    admin_id = admin['user_id'] if 'user_id' in admin else admin[0]
                    # 创建密钥请求
                    conn.execute("""
                        INSERT INTO key_distribution_requests
                        (channel_id, requester_id, admin_id, status, created_at)
                        VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
                    """, (channel_id, user_id, admin_id))
                    conn.commit()
                    print(f"已自动创建密钥请求: 用户={user_id}, 管理员={admin_id}")
                    
                    # 发送通知
                    if 'socketio' in globals() or hasattr(current_app, 'socketio'):
                        socketio = current_app.socketio if hasattr(current_app, 'socketio') else globals().get('socketio')
                        if socketio:
                            socketio.emit('channel_key_request', {
                                'channel_id': channel_id,
                                'requester_id': user_id,
                                'requester_username': username,
                                'timestamp': datetime.now().isoformat()
                            }, room=f'user_{admin_id}')
            except Exception as req_err:
                print(f"创建密钥请求失败: {str(req_err)}")
                
        return False
    except Exception as e:
        print(f"处理频道密钥时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def register_socket_events(socketio):
    """Register all Socket.IO event handlers"""
    
    @socketio.on('connect')
    def handle_connect():
        print(f"Socket.IO connection: SID={request.sid}")
        
        # Check if user is authenticated
        if current_user.is_authenticated:
            user_id = current_user.id
            print(f"Authenticated user connected: id={user_id}, username={current_user.username}, SID={request.sid}")
            
            # Record user online
            if user_id not in online_users:
                online_users[user_id] = {}
                
            # Add or update this user's session
            online_users[user_id][request.sid] = {
                'user_id': user_id,
                'username': current_user.username,
                'socket_id': request.sid,
                'avatar': current_user.avatar_url if hasattr(current_user, 'avatar_url') else None,
                'last_active': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            # Update user session mapping
            if user_id not in user_sessions:
                user_sessions[user_id] = []
            if request.sid not in user_sessions[user_id]:
                user_sessions[user_id].append(request.sid)
            
            # Update user status in database
            conn = get_db_connection()
            conn.execute('UPDATE users SET is_active = 1 WHERE user_id = ?', (user_id,))
            conn.commit()
            conn.close()
            
            # Broadcast user online message
            emit('user_online', {
                'user_id': user_id,
                'username': current_user.username,
                'online_count': len(online_users)
            }, broadcast=True)
        else:
            print(f"Unauthenticated user connection attempt: SID={request.sid}")
            # Disconnect unauthenticated user
            disconnect()

    @socketio.on('disconnect')
    def handle_disconnect():
        print(f"Socket.IO disconnection: SID={request.sid}")
        
        # Check if user is authenticated
        if current_user.is_authenticated:
            user_id = current_user.id
            
            # Remove this session from online users list
            if user_id in online_users and request.sid in online_users[user_id]:
                print(f"Authenticated user disconnected: id={user_id}, username={current_user.username}, SID={request.sid}")
                del online_users[user_id][request.sid]
                
                # If user has no other active sessions, clean up user data
                if not online_users[user_id]:
                    del online_users[user_id]
                    
                # Update user session mapping
                if user_id in user_sessions and request.sid in user_sessions[user_id]:
                    user_sessions[user_id].remove(request.sid)
                    if not user_sessions[user_id]:
                        del user_sessions[user_id]
                
                # If user has no active sessions, update database status
                if user_id not in user_sessions or not user_sessions[user_id]:
                    conn = get_db_connection()
                    conn.execute('UPDATE users SET is_active = 0 WHERE user_id = ?', (user_id,))
                    conn.commit()
                    conn.close()
                    
                    # Only broadcast offline message when all user sessions are disconnected
                    emit('user_offline', {
                        'user_id': user_id,
                        'username': current_user.username,
                        'online_count': len(online_users)
                    }, broadcast=True)

    @socketio.on('join_room')
    def handle_join_room(data):
        """Join room Socket.IO event"""
        if not current_user.is_authenticated:
            return
            
        room_id = data.get('room_id')
        if not room_id:
            return
        
        # Check if user has permission to join the room
        conn = get_db_connection()
        room_member = conn.execute(
            'SELECT 1 FROM user_rooms WHERE user_id = ? AND room_id = ?',
            (current_user.id, room_id)
        ).fetchone()
        conn.close()
        
        if not room_member:
            return
        
        room_key = f'room_{room_id}'
        join_room(room_key)
        emit('room_status', {
            'room_id': room_id,
            'user_id': current_user.id,
            'username': current_user.username,
            'status': 'joined',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }, room=room_key)

    @socketio.on('leave_room')
    def handle_leave_room(data):
        """Leave room Socket.IO event"""
        if not current_user.is_authenticated:
            return
            
        room_id = data.get('room_id')
        if not room_id:
            return
        
        room_key = f'room_{room_id}'
        leave_room(room_key)
        emit('room_status', {
            'room_id': room_id,
            'user_id': current_user.id,
            'username': current_user.username,
            'status': 'left',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }, room=room_key)

    @socketio.on('join_channel')
    def handle_join_channel(data):
        """Join channel Socket.IO event"""
        if not current_user.is_authenticated:
            return
            
        channel_id = data.get('channel_id')
        if not channel_id:
            return
        
        # Check if user has permission to join the channel
        conn = get_db_connection()
        
        # Get the room this channel belongs to
        channel = conn.execute(
            'SELECT room_id, is_private FROM channels WHERE channel_id = ?',
            (channel_id,)
        ).fetchone()
        
        if not channel:
            conn.close()
            return
        
        # Check if user is a member of the room or an admin
        room_member = conn.execute(
            'SELECT role FROM user_rooms WHERE user_id = ? AND room_id = ?',
            (current_user.id, channel['room_id'])
        ).fetchone()
        
        is_admin = room_member and room_member['role'] in ['admin', 'owner']
        
        if not room_member and not is_admin:
            conn.close()
            return
        
        # If it's a private channel, also check if user is a member of this channel
        # But if user is an admin, they can access all channels
        if channel['is_private'] == 1 and not is_admin:
            channel_member = conn.execute(
                'SELECT 1 FROM user_channels WHERE user_id = ? AND channel_id = ?',
                (current_user.id, channel_id)
            ).fetchone()
            
            if not channel_member:
                conn.close()
                return
        
        # Log channel join action
        conn.execute('''
            INSERT INTO channel_logs (channel_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
        ''', (
            channel_id,
            current_user.id,
            'user_joined_channel',
            json.dumps({
                'user_id': current_user.id,
                'username': current_user.username
            })
        ))
        conn.commit()
        
        conn.close()
        
        channel_key = f'channel_{channel_id}'
        join_room(channel_key)
        emit('channel_status', {
            'channel_id': channel_id,
            'user_id': current_user.id,
            'username': current_user.username,
            'status': 'joined',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }, room=channel_key)

    @socketio.on('leave_channel')
    def handle_leave_channel(data):
        """Leave channel Socket.IO event"""
        if not current_user.is_authenticated:
            return
            
        channel_id = data.get('channel_id')
        if not channel_id:
            return
        
        # Log channel leave action
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO channel_logs (channel_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
        ''', (
            channel_id,
            current_user.id,
            'user_left_channel',
            json.dumps({
                'user_id': current_user.id,
                'username': current_user.username
            })
        ))
        conn.commit()
        conn.close()
        
        channel_key = f'channel_{channel_id}'
        leave_room(channel_key)
        emit('channel_status', {
            'channel_id': channel_id,
            'user_id': current_user.id,
            'username': current_user.username,
            'status': 'left',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }, room=channel_key)

    @socketio.on('send_message')
    def handle_message(data):
        """Handle message sending"""
        if not current_user.is_authenticated:
            return
            
        channel_id = data.get('channel_id')
        content = data.get('content')
        message_type = data.get('type', 'text')
        parent_id = data.get('parent_id')
        # 新增：检查消息是否已加密
        is_encrypted = data.get('encrypted', False)
        
        if not channel_id or not content:
            return
        
        # Validate user's access to the channel
        conn = get_db_connection()
        
        # Get channel information
        channel = conn.execute('''
            SELECT c.*, r.room_id 
            FROM channels c 
            JOIN rooms r ON c.room_id = r.room_id 
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return
        
        # Check if user has permission to access the room
        room_access = conn.execute('''
            SELECT role FROM user_rooms WHERE user_id = ? AND room_id = ?
        ''', (current_user.id, channel['room_id'])).fetchone()
        
        if not room_access:
            conn.close()
            return
        
        # Check if user is an admin
        is_admin = room_access and room_access['role'] in ['admin', 'owner']
        
        # If it's a private channel, also check if user has permission to access this channel
        # But if user is an admin, they can access all channels
        if channel['is_private'] and not is_admin:
            channel_access = conn.execute('''
                SELECT 1 FROM user_channels WHERE user_id = ? AND channel_id = ?
            ''', (current_user.id, channel_id)).fetchone()
            
            if not channel_access:
                conn.close()
                return
        
        # Check if the channel is encrypted
        is_channel_encrypted = ('is_encrypted' in channel.keys() and channel['is_encrypted'] == 1)
        
        # 检查用户是否被静音
        user_muted = conn.execute('''
            SELECT is_muted FROM user_channels 
            WHERE user_id = ? AND channel_id = ? AND is_muted = 1
        ''', (current_user.id, channel_id)).fetchone()
        
        if user_muted:
            conn.close()
            return
        
        # 插入消息到数据库
        cursor = conn.execute('''
            INSERT INTO messages (channel_id, user_id, content, message_type, parent_id, is_encrypted)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (channel_id, current_user.id, content, message_type, parent_id, 1 if is_encrypted else 0))
        
        message_id = cursor.lastrowid
        conn.commit()
        
        print(f"用户 {current_user.id} 在频道 {channel_id} 发送了消息 ID={message_id}, 加密状态={is_encrypted}")
        
        # 如果频道启用了加密，处理sender_key
        if is_channel_encrypted:
            print(f"频道 {channel_id} 启用了加密，检查是否需要保存sender_key")
            # 使用新的辅助函数处理密钥
            process_channel_key(conn, channel_id, current_user.id, current_user.username)
        
        # Log message sending action
        conn.execute('''
            INSERT INTO channel_logs (channel_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
        ''', (
            channel_id,
            current_user.id,
            'send_message',
            json.dumps({
                'message_id': message_id,
                'content_preview': content[:50] + ('...' if len(content) > 50 else ''),
                'encrypted': is_encrypted
            })
        ))
        conn.commit()
        
        # Get created message
        message = conn.execute('''
            SELECT m.*, u.username, u.avatar_url
            FROM messages m
            JOIN users u ON m.user_id = u.user_id
            WHERE m.message_id = ?
        ''', (message_id,)).fetchone()
        
        conn.close()
        
        # Broadcast message to all users in the channel
        channel_key = f'channel_{channel_id}'
        emit('new_message', {
            'id': message['message_id'],
            'channel_id': channel_id,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'avatar_url': current_user.avatar_url
            },
            'content': content,
            'message_type': message_type,
            'created_at': message['created_at'],
            'parent_id': parent_id,
            'encrypted': is_encrypted  # 新增：传递加密状态
        }, room=channel_key)

    @socketio.on('direct_message')
    def handle_direct_message(data):
        """处理私聊消息发送"""
        if not current_user.is_authenticated:
            print(f"未授权用户尝试发送私聊消息: {request.sid}")
            return
            
        recipient_id = data.get('recipient_id')
        content = data.get('content')
        encrypted_content = data.get('encrypted_content')  # 加密内容
        iv = data.get('iv')  # 用于加密的初始化向量
        message_type = data.get('message_type', 'text')
        
        print(f"收到私聊消息请求: {{recipient_id: {recipient_id}, " +
              f"has_content: {content is not None}, " +
              f"has_encrypted_content: {encrypted_content is not None}, " +
              f"has_iv: {iv is not None}, " +
              f"message_type: {message_type}}}")
        
        # 需要有未加密内容或加密内容中的一个
        if not recipient_id or (not content and not encrypted_content):
            print("缺少必要的消息内容，无法处理私聊消息")
            return
        
        # 验证收件人是否存在
        conn = get_db_connection()
        recipient = conn.execute('SELECT * FROM users WHERE user_id = ?', (recipient_id,)).fetchone()
        
        if not recipient:
            conn.close()
            print(f"收件人不存在: {recipient_id}")
            emit('error', {'message': '收件人不存在'}, room=request.sid)
            return
        
        # 判断消息是否加密
        is_encrypted = encrypted_content is not None and iv is not None
        print(f"消息加密状态: {is_encrypted}")
        
        if is_encrypted:
            print(f"加密内容长度: {len(encrypted_content) if encrypted_content else 0}, " +
                  f"IV长度: {len(iv) if iv else 0}")
        
        # 安全性考虑：优先使用加密内容，否则使用明文
        # 在实际应用中，如果双方都有密钥，应该强制使用加密
        insert_params = [
            current_user.id, 
            recipient_id, 
            content if not is_encrypted else None,  # 如果有加密内容则不保存明文
            encrypted_content,
            iv,
            message_type
        ]
        
        try:
            cursor = conn.execute('''
                INSERT INTO direct_messages 
                (sender_id, recipient_id, content, encrypted_content, iv, message_type)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', insert_params)
            
            message_id = cursor.lastrowid
            print(f"成功创建私聊消息, ID: {message_id}")
            
            # 获取完整消息信息
            message = conn.execute('SELECT * FROM direct_messages WHERE dm_id = ?', (message_id,)).fetchone()
            conn.commit()
            
            # 向接收者发送消息
            recipient_sid = get_user_socket_id(recipient_id)
            if recipient_sid:
                print(f"接收者在线，发送消息到Socket ID: {recipient_sid}")
                # 发送消息给接收者
                message_data = {
                    'id': message_id,
                    'sender': {
                        'id': current_user.id,
                        'username': current_user.username,
                        'avatar_url': current_user.avatar_url
                    },
                    'recipient_id': recipient_id,
                    'content': content if not is_encrypted else None,
                    'encrypted_content': encrypted_content,
                    'iv': iv,
                    'message_type': message_type,
                    'created_at': message['created_at'],
                    'is_encrypted': is_encrypted
                }
                print(f"发送给接收者的消息数据: {message_data}")
                emit('direct_message', message_data, room=recipient_sid)
            else:
                print(f"接收者不在线，消息将在用户下次登录时显示")
            
            # 向发送者确认消息已发送
            confirmation_data = {
                'id': message_id,
                'sender': {
                    'id': current_user.id,
                    'username': current_user.username,
                    'avatar_url': current_user.avatar_url
                },
                'recipient_id': recipient_id,
                'content': content if not is_encrypted else None,
                'encrypted_content': encrypted_content,
                'iv': iv,
                'message_type': message_type,
                'created_at': message['created_at'],
                'is_encrypted': is_encrypted
            }
            print(f"发送确认消息给发送者: {request.sid}")
            emit('direct_message', confirmation_data, room=request.sid)
        except Exception as e:
            print(f"处理私聊消息时发生错误: {str(e)}")
            emit('error', {'message': f'发送消息失败: {str(e)}'}, room=request.sid)
        finally:
            conn.close()

        # 如果发送加密消息，检查是否有相关频道需要处理密钥
        if is_encrypted and 'channel_id' in data:
            channel_id = data.get('channel_id')
            if channel_id:
                print(f"加密私信涉及频道 {channel_id}，检查是否需要保存sender_key")
                process_channel_key(conn, channel_id, current_user.id, current_user.username)

    @socketio.on('request_user_list')
    def handle_user_list_request():
        """Handle user list request"""
        if not current_user.is_authenticated:
            return
            
        conn = get_db_connection()
        users = conn.execute('SELECT user_id, username, is_active, avatar_url FROM users').fetchall()
        conn.close()
        
        # Convert users to list of dictionaries
        users_list = [{
            'user_id': user['user_id'],
            'username': user['username'],
            'is_active': bool(user['is_active']),
            'avatar_url': user['avatar_url']
        } for user in users]
        
        # Send to requester
        emit('user_list', {'users': users_list}, room=request.sid) 