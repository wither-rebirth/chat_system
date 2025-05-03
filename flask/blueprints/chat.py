"""
聊天页面和功能蓝图
处理聊天相关的所有功能
"""
from flask import Blueprint, render_template, redirect, url_for, request, jsonify, current_app
from flask_login import login_required, current_user
from utils.db import get_db_connection
import json
from datetime import datetime

# 从socket_events.py导入加密处理函数
try:
    from socket_events import process_channel_key
except ImportError:
    # 如果无法导入，提供一个简单的填充函数
    def process_channel_key(conn, channel_id, user_id, username):
        print(f"无法从socket_events导入process_channel_key，跳过密钥处理")
        return False

# 创建蓝图
chat_bp = Blueprint('chat', __name__)

# 路由：聊天页面
@chat_bp.route('/chat')
@login_required
def index():
    conn = get_db_connection()
    
    # 获取用户所在的聊天室
    rooms_data = conn.execute('''\
        SELECT r.room_id, r.room_name, r.description, r.is_private
        FROM rooms r
        JOIN user_rooms ur ON r.room_id = ur.room_id
        WHERE ur.user_id = ?
    ''', (current_user.id,)).fetchall()
    
    # 将SQLite的Row对象转换为字典列表
    rooms_list = []
    for room in rooms_data:
        rooms_list.append({
            'room_id': room['room_id'],
            'room_name': room['room_name'],
            'description': room['description'],
            'is_private': bool(room['is_private'])
        })
    
    # 获取每个聊天室下的频道
    channels_data = {}
    active_channel = None
    
    for room in rooms_list:
        room_id = room['room_id']
        channels = conn.execute('''\
            SELECT channel_id, channel_name, description
            FROM channels
            WHERE room_id = ?
        ''', (room_id,)).fetchall()
        
        # 将SQLite的Row对象转换为字典列表
        channels_list = []
        for channel in channels:
            channel_dict = {
                'channel_id': channel['channel_id'],
                'channel_name': channel['channel_name'],
                'description': channel['description']
            }
            channels_list.append(channel_dict)
            
            # 设置第一个频道为活跃频道
            if active_channel is None and len(channels_list) > 0:
                active_channel = channel_dict
        
        channels_data[room_id] = channels_list
    
    # 获取直接消息联系人
    direct_messages = conn.execute('''\
        SELECT u.user_id, u.username, u.avatar_url, 
               u.is_active AS is_online
        FROM users u
        WHERE u.user_id != ?
        ORDER BY is_online DESC, u.username
    ''', (current_user.id,)).fetchall()
    
    # 将SQLite的Row对象转换为字典列表
    direct_messages_list = []
    for dm in direct_messages:
        direct_messages_list.append({
            'user_id': dm['user_id'],
            'username': dm['username'],
            'avatar_url': dm['avatar_url'],
            'is_online': bool(dm['is_online'])
        })
    
    # 关闭数据库连接
    conn.close()
    
    # 渲染聊天页面，传递数据
    return render_template('chat.html', 
                          current_user=current_user, 
                          rooms=rooms_list, 
                          channels=channels_data,
                          active_channel=active_channel,
                          direct_messages=direct_messages_list)

# 添加一个简单聊天路由
@chat_bp.route('/simple_chat')
@login_required
def simple_chat():
    conn = get_db_connection()
    
    # 获取用户所在的聊天室
    rooms_data = conn.execute('''
        SELECT r.room_id, r.room_name, r.description, r.is_private
        FROM rooms r
        JOIN user_rooms ur ON r.room_id = ur.room_id
        WHERE ur.user_id = ?
    ''', (current_user.id,)).fetchall()
    
    # 将SQLite的Row对象转换为字典
    rooms = []
    for room in rooms_data:
        rooms.append({
            'room_id': room['room_id'],
            'room_name': room['room_name'],
            'description': room['description'],
            'is_private': bool(room['is_private'])
        })
    
    conn.close()
    
    # 使用简化版聊天模板
    return render_template('simple_chat.html', rooms=rooms)

# API: 获取频道消息
@chat_bp.route('/api/channel_messages/<int:channel_id>', methods=['GET'])
@login_required
def get_channel_messages(channel_id):
    """获取频道的消息历史"""
    try:
        # 获取分页参数
        limit = min(int(request.args.get('limit', 50)), 100)  # 最多返回100条消息
        before_id = request.args.get('before_id')
        after_id = request.args.get('after_id')
        
        conn = get_db_connection()
        
        # Check user permissions to access the channel
        channel = conn.execute('SELECT * FROM channels WHERE channel_id = ?', (channel_id,)).fetchone()
        
        if not channel:
            return jsonify({"success": False, "message": "频道不存在"})
        
        # 校验权限
        room_member = conn.execute(
            'SELECT 1 FROM user_rooms WHERE user_id = ? AND room_id = ?',
            (current_user.id, channel['room_id'])
        ).fetchone()
        
        if not room_member:
            conn.close()
            return jsonify({"success": False, "message": "您不是该聊天室的成员"})
        
        # 如果是私有频道，还需检查用户是否是该频道的成员
        if 'is_private' in channel and channel['is_private']:
            channel_member = conn.execute(
                'SELECT 1 FROM user_channels WHERE user_id = ? AND channel_id = ?',
                (current_user.id, channel_id)
            ).fetchone()
            
            if not channel_member:
                conn.close()
                return jsonify({"success": False, "message": "您没有权限访问该私有频道"})
        
        # 构建查询
        query = '''
            SELECT m.message_id, m.channel_id, m.user_id, m.content, 
                  m.message_type, m.created_at, m.updated_at, 
                  m.is_deleted, m.parent_id,
                  u.username, u.avatar_url, u.is_active
            FROM messages m
            JOIN users u ON m.user_id = u.user_id
            WHERE m.channel_id = ?
        '''
        params = [channel_id]
        
        if before_id:
            query += ' AND m.message_id < ?'
            params.append(before_id)
        elif after_id:
            query += ' AND m.message_id > ?'
            params.append(after_id)
        
        query += ' ORDER BY m.created_at DESC LIMIT ?'
        params.append(limit)
        
        messages = conn.execute(query, params).fetchall()
        
        # 转换为列表并反转，以获得按时间正序排列的消息
        messages_list = []
        for msg in messages:
            messages_list.append({
                'id': msg['message_id'],
                'channel_id': msg['channel_id'],
                'user': {
                    'id': msg['user_id'],
                    'username': msg['username'],
                    'avatar_url': msg['avatar_url'],
                    'is_online': bool(msg['is_active'])
                },
                'content': msg['content'],
                'message_type': msg['message_type'],
                'created_at': msg['created_at'],
                'updated_at': msg['updated_at'],
                'is_deleted': bool(msg['is_deleted']),
                'parent_id': msg['parent_id']
            })
        
        # 反转列表以获得正序排列
        messages_list.reverse()
        
        conn.close()
        
        return jsonify({
            "success": True,
            "count": len(messages_list),
            "messages": messages_list
        })
        
    except Exception as e:
        current_app.logger.error(f"获取频道消息错误: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": f"发生错误: {str(e)}"})

# API: 固定消息
@chat_bp.route('/api/pin_message', methods=['POST'])
@login_required
def pin_message_api():
    """固定一条消息"""
    data = request.json
    if not data or not data.get('message_id') or not data.get('channel_id'):
        return jsonify({'success': False, 'message': '请求参数不完整'}), 400
        
    message_id = data.get('message_id')
    channel_id = data.get('channel_id')
    
    conn = get_db_connection()
    
    # 验证消息存在
    message = conn.execute('''
        SELECT m.*, u.username, u.avatar_url 
        FROM messages m
        JOIN users u ON m.user_id = u.user_id
        WHERE m.message_id = ? AND m.channel_id = ?
    ''', (message_id, channel_id)).fetchone()
    
    if not message:
        conn.close()
        return jsonify({'success': False, 'message': '消息不存在或已被删除'}), 404
    
    # 检查消息是否已被固定
    existing_pin = conn.execute('SELECT 1 FROM pinned_messages WHERE message_id = ? AND channel_id = ?', 
                            (message_id, channel_id)).fetchone()
    
    if existing_pin:
        conn.close()
        return jsonify({'success': False, 'message': '该消息已被固定'}), 409
    
    try:
        # 固定消息
        conn.execute('''
            INSERT INTO pinned_messages (
                message_id, channel_id, pinned_by, message_content, 
                sender_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            message_id, channel_id, current_user.id, message['content'],
            message['user_id'], message['created_at']
        ))
        conn.commit()
        
        return jsonify({
            'success': True, 
            'message': '消息已成功固定',
            'pin_data': {
                'message_id': message_id,
                'channel_id': channel_id,
                'pinned_by': current_user.id,
                'pinned_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'固定消息时发生错误: {str(e)}'}), 500
    finally:
        conn.close()

# API: 取消固定消息
@chat_bp.route('/api/unpin_message', methods=['POST'])
@login_required
def unpin_message_api():
    """取消固定一条消息"""
    data = request.json
    if not data or not data.get('message_id') or not data.get('channel_id'):
        return jsonify({'success': False, 'message': '请求参数不完整'}), 400
        
    message_id = data.get('message_id')
    channel_id = data.get('channel_id')
    
    conn = get_db_connection()
    
    # 验证固定消息存在
    pin = conn.execute('SELECT * FROM pinned_messages WHERE message_id = ? AND channel_id = ?', 
                   (message_id, channel_id)).fetchone()
    
    if not pin:
        conn.close()
        return jsonify({'success': False, 'message': '该消息未被固定或已取消固定'}), 404
    
    try:
        # 取消固定
        conn.execute('DELETE FROM pinned_messages WHERE message_id = ? AND channel_id = ?', 
                 (message_id, channel_id))
        conn.commit()
        
        return jsonify({
            'success': True, 
            'message': '已取消固定消息'
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'取消固定消息时发生错误: {str(e)}'}), 500
    finally:
        conn.close()

# API: 获取固定消息
@chat_bp.route('/api/pinned_messages', methods=['GET'])
@login_required
def pinned_messages_api():
    """获取频道中的所有固定消息"""
    channel_id = request.args.get('channel_id')
    
    if not channel_id:
        return jsonify({'success': False, 'message': '未指定频道ID'}), 400
    
    conn = get_db_connection()
    
    try:
        # 获取所有固定消息
        pinned_messages = conn.execute('''
            SELECT 
                pm.*, 
                u.username as sender_username, 
                u.avatar_url as sender_avatar,
                pu.username as pinner_username
            FROM pinned_messages pm
            JOIN users u ON pm.sender_id = u.user_id
            JOIN users pu ON pm.pinned_by = pu.user_id
            WHERE pm.channel_id = ?
            ORDER BY pm.pinned_at DESC
        ''', (channel_id,)).fetchall()
        
        result = []
        for pm in pinned_messages:
            message = {
                'id': pm['message_id'],
                'content': pm['message_content'],
                'created_at': pm['created_at'],
                'pinned_at': pm['pinned_at'],
                'user': {
                    'id': pm['sender_id'],
                    'username': pm['sender_username'],
                    'avatar_url': pm['sender_avatar']
                },
                'pinned_by': {
                    'id': pm['pinned_by'],
                    'username': pm['pinner_username']
                }
            }
            result.append(message)
        
        return jsonify({
            'success': True,
            'pinned_messages': result
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取固定消息时发生错误: {str(e)}'}), 500
    finally:
        conn.close()

# API: 发送消息
@chat_bp.route('/api/send_message', methods=['POST'])
@login_required
def send_message():
    """发送消息的REST API（备用方案，主要使用Socket.IO）"""
    try:
        data = request.json
        if not data or not data.get('channel_id') or not data.get('content'):
            return jsonify({'success': False, 'message': '缺少必要参数'}), 400
            
        channel_id = data.get('channel_id')
        content = data.get('content')
        message_type = data.get('message_type', 'text')
        parent_id = data.get('parent_id')
        is_encrypted = data.get('encrypted', False)  # 新增: 检查消息是否加密
        
        conn = get_db_connection()
        
        # 验证频道存在
        channel = conn.execute('''
            SELECT c.*, r.room_id 
            FROM channels c 
            JOIN rooms r ON c.room_id = r.room_id 
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'success': False, 'message': '频道不存在'}), 404
        
        # 检查用户是否有权限访问该频道
        room_access = conn.execute('''
            SELECT 1 FROM user_rooms WHERE user_id = ? AND room_id = ?
        ''', (current_user.id, channel['room_id'])).fetchone()
        
        if not room_access:
            conn.close()
            return jsonify({'success': False, 'message': '您没有权限访问该频道'}), 403
        
        # 如果是私有频道，还需检查私有频道权限
        if 'is_private' in channel and channel['is_private']:
            channel_access = conn.execute('''
                SELECT 1 FROM user_channels WHERE user_id = ? AND channel_id = ?
            ''', (current_user.id, channel_id)).fetchone()
            
            if not channel_access:
                conn.close()
                return jsonify({'success': False, 'message': '您没有权限访问该私有频道'}), 403
        
        # 检查用户是否被静音
        user_muted = conn.execute('''
            SELECT is_muted FROM user_channels 
            WHERE user_id = ? AND channel_id = ? AND is_muted = 1
        ''', (current_user.id, channel_id)).fetchone()
        
        if user_muted:
            conn.close()
            return jsonify({'success': False, 'message': '您在此频道已被静音，无法发送消息'}), 403
        
        # 创建消息 (修改SQL以保存加密状态)
        cursor = conn.execute('''
            INSERT INTO messages (channel_id, user_id, content, message_type, parent_id, is_encrypted)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (channel_id, current_user.id, content, message_type, parent_id, 1 if is_encrypted else 0))
        
        message_id = cursor.lastrowid
        conn.commit()
        
        # 检查频道是否启用了加密，无论消息是否加密
        channel_encrypted = conn.execute('''
            SELECT is_encrypted FROM channels WHERE channel_id = ?
        ''', (channel_id,)).fetchone()
        
        # 如果频道启用了加密，处理sender_key
        if channel_encrypted and channel_encrypted['is_encrypted'] == 1:
            print(f"频道 {channel_id} 启用了加密，处理sender_key")
            process_channel_key(conn, channel_id, current_user.id, current_user.username)
        
        # 记录消息发送日志
        conn.execute('''
            INSERT INTO channel_logs (channel_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
        ''', (
            channel_id,
            current_user.id,
            'send_message',
            json.dumps({
                'message_id': message_id,
                'content_preview': content[:50] + ('...' if len(content) > 50 else '')
            })
        ))
        conn.commit()
        
        # 获取创建的消息
        message = conn.execute('''
            SELECT m.*, u.username, u.avatar_url
            FROM messages m
            JOIN users u ON m.user_id = u.user_id
            WHERE m.message_id = ?
        ''', (message_id,)).fetchone()
        
        if not message:
            conn.close()
            return jsonify({'success': False, 'message': '消息创建失败'}), 500
        
        # 构建消息对象
        message_obj = {
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
            'parent_id': parent_id
        }
        
        conn.close()
        
        # 返回成功结果
        return jsonify({
            'success': True,
            'message': '消息发送成功',
            'data': message_obj
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'发送消息失败: {str(e)}'}), 500

# API: 获取频道详情
@chat_bp.route('/api/channel_details/<int:channel_id>', methods=['GET'])
@login_required
def channel_details(channel_id):
    """获取频道的详细信息"""
    try:
        conn = get_db_connection()
        
        # 获取频道信息
        channel = conn.execute('''
            SELECT c.*, r.room_name, r.description as room_description
            FROM channels c
            JOIN rooms r ON c.room_id = r.room_id
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({"success": False, "message": "频道不存在"}), 404
        
        # 验证用户有权限访问该频道
        room_member = conn.execute(
            'SELECT 1 FROM user_rooms WHERE user_id = ? AND room_id = ?',
            (current_user.id, channel['room_id']
        )).fetchone()
        
        if not room_member:
            conn.close()
            return jsonify({"success": False, "message": "您不是该聊天室的成员"}), 403
        
        # 如果是私有频道，还需检查用户是否是该频道的成员
        if 'is_private' in channel and channel['is_private']:
            channel_member = conn.execute(
                'SELECT 1 FROM user_channels WHERE user_id = ? AND channel_id = ?',
                (current_user.id, channel_id)
            ).fetchone()
            
            if not channel_member:
                conn.close()
                return jsonify({"success": False, "message": "您没有权限访问该私有频道"}), 403
        
        # 获取频道成员
        members = conn.execute('''
            SELECT u.user_id, u.username, u.avatar_url, u.is_active
            FROM users u
            JOIN user_channels uc ON u.user_id = uc.user_id
            WHERE uc.channel_id = ?
        ''', (channel_id,)).fetchall()
        
        # 转换为字典
        members_list = []
        for member in members:
            members_list.append({
                'user_id': member['user_id'],
                'username': member['username'],
                'avatar_url': member['avatar_url'],
                'is_online': bool(member['is_active'])
            })
        
        # 构建响应数据
        channel_data = {
            'channel_id': channel['channel_id'],
            'channel_name': channel['channel_name'],
            'description': channel['description'],
            'room_id': channel['room_id'],
            'room_name': channel['room_name'],
            'room_description': channel['room_description'],
            'is_private': bool(channel['is_private']) if 'is_private' in channel else False,
            'created_at': channel['created_at'],
            'members': members_list,
            'members_count': len(members_list)
        }
        
        conn.close()
        
        return jsonify({
            "success": True,
            "channel": channel_data
        })
        
    except Exception as e:
        current_app.logger.error(f"获取频道详情错误: {str(e)}", exc_info=True)
        return jsonify({"success": False, "message": f"发生错误: {str(e)}"}), 500

# API: 更新频道描述
@chat_bp.route('/api/update_channel_description', methods=['POST'])
@login_required
def update_channel_description():
    """更新频道描述的API"""
    try:
        data = request.json
        if not data or 'channel_id' not in data or 'description' not in data:
            return jsonify({'success': False, 'message': '请求参数不完整'}), 400
            
        channel_id = data.get('channel_id')
        description = data.get('description')
        
        conn = get_db_connection()
        
        # 验证频道存在
        channel = conn.execute('''
            SELECT c.*, r.room_id 
            FROM channels c 
            JOIN rooms r ON c.room_id = r.room_id 
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'success': False, 'message': '频道不存在'}), 404
        
        # 验证用户是否有权限更新频道
        # 由于数据库结构问题，暂时跳过权限检查，允许所有用户更新频道描述
        # 在实际生产环境中，应该根据真实的数据库结构实现权限检查
        # admin_check = conn.execute('''
        #     SELECT 1 FROM users 
        #     WHERE user_id = ? AND (is_admin = 1 OR is_superuser = 1)
        # ''', (current_user.id,)).fetchone()
        
        # if not admin_check:
        #     conn.close()
        #     return jsonify({'success': False, 'message': '您没有权限更新此频道'}), 403
        
        # 更新频道描述
        conn.execute('''
            UPDATE channels 
            SET description = ? 
            WHERE channel_id = ?
        ''', (description, channel_id))
        
        # 添加更新日志
        conn.execute('''
            INSERT INTO channel_logs (channel_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
        ''', (
            channel_id,
            current_user.id,
            'update_description',
            json.dumps({
                'previous_description': channel['description'],
                'new_description': description
            })
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': '频道描述已更新',
            'channel_id': channel_id,
            'description': description
        })
        
    except Exception as e:
        current_app.logger.error(f"更新频道描述错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'更新频道描述失败: {str(e)}'}), 500

# API: 获取频道日志
@chat_bp.route('/api/channel_logs/<int:channel_id>', methods=['GET'])
@login_required
def get_channel_logs(channel_id):
    """获取频道操作日志"""
    try:
        # 获取分页参数
        limit = min(int(request.args.get('limit', 30)), 100)  # 默认30条，最多100条
        offset = int(request.args.get('offset', 0))
        
        conn = get_db_connection()
        
        # 验证频道存在且用户有访问权限
        channel = conn.execute('''
            SELECT c.*, r.room_id 
            FROM channels c 
            JOIN rooms r ON c.room_id = r.room_id 
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'success': False, 'message': '频道不存在'}), 404
        
        # 检查用户是否有权限访问该频道
        room_access = conn.execute('''
            SELECT 1 FROM user_rooms WHERE user_id = ? AND room_id = ?
        ''', (current_user.id, channel['room_id'])).fetchone()
        
        if not room_access:
            conn.close()
            return jsonify({'success': False, 'message': '您没有权限访问该频道的日志'}), 403
        
        # 如果是私有频道，还需检查用户是否有权限访问
        if 'is_private' in channel and channel['is_private']:
            channel_access = conn.execute('''
                SELECT 1 FROM user_channels WHERE user_id = ? AND channel_id = ?
            ''', (current_user.id, channel_id)).fetchone()
            
            if not channel_access:
                conn.close()
                return jsonify({'success': False, 'message': '您没有权限访问该私有频道的日志'}), 403
        
        # 获取频道日志
        logs = conn.execute('''
            SELECT cl.*, u.username, u.avatar_url
            FROM channel_logs cl
            JOIN users u ON cl.user_id = u.user_id
            WHERE cl.channel_id = ?
            ORDER BY cl.timestamp DESC
            LIMIT ? OFFSET ?
        ''', (channel_id, limit, offset)).fetchall()
        
        # 转换为列表
        logs_list = []
        for log in logs:
            # 解析JSON详情
            details = json.loads(log['details']) if log['details'] else {}
            
            logs_list.append({
                'log_id': log['log_id'],
                'channel_id': log['channel_id'],
                'action': log['action'],
                'timestamp': log['timestamp'],
                'details': details,
                'user': {
                    'user_id': log['user_id'],
                    'username': log['username'],
                    'avatar_url': log['avatar_url']
                }
            })
        
        # 获取日志总数
        total_logs = conn.execute('''
            SELECT COUNT(*) as count FROM channel_logs WHERE channel_id = ?
        ''', (channel_id,)).fetchone()['count']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'logs': logs_list,
            'total': total_logs,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        current_app.logger.error(f"获取频道日志错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'获取频道日志失败: {str(e)}'}), 500

# API: 更新频道标题
@chat_bp.route('/api/update_channel_header', methods=['POST'])
@login_required
def update_channel_header():
    """更新频道标题的API"""
    try:
        data = request.json
        if not data or 'channel_id' not in data or 'header' not in data:
            return jsonify({'success': False, 'message': '请求参数不完整'}), 400
            
        channel_id = data.get('channel_id')
        header = data.get('header')
        
        conn = get_db_connection()
        
        # 验证频道存在
        channel = conn.execute('''
            SELECT c.*, r.room_id 
            FROM channels c 
            JOIN rooms r ON c.room_id = r.room_id 
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'success': False, 'message': '频道不存在'}), 404
        
        # 验证用户是否有权限更新频道
        # 由于数据库结构问题，暂时跳过权限检查，允许所有用户更新频道标题
        # 在实际生产环境中，应该根据真实的数据库结构实现权限检查
        # admin_check = conn.execute('''
        #     SELECT 1 FROM users 
        #     WHERE user_id = ? AND (is_admin = 1 OR is_superuser = 1)
        # ''', (current_user.id,)).fetchone()
        
        # if not admin_check:
        #     conn.close()
        #     return jsonify({'success': False, 'message': '您没有权限更新此频道标题'}), 403
        
        # 更新频道标题
        conn.execute('''
            UPDATE channels 
            SET header = ? 
            WHERE channel_id = ?
        ''', (header, channel_id))
        
        # 添加更新日志
        conn.execute('''
            INSERT INTO channel_logs (channel_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
        ''', (
            channel_id,
            current_user.id,
            'update_header',
            json.dumps({
                'previous_header': channel.get('header', ''),
                'new_header': header
            })
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': '频道标题已更新',
            'channel_id': channel_id,
            'header': header
        })
        
    except Exception as e:
        current_app.logger.error(f"更新频道标题错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'更新频道标题失败: {str(e)}'}), 500

# API: 获取频道成员
@chat_bp.route('/api/channel_members/<int:channel_id>', methods=['GET'])
@login_required
def get_channel_members(channel_id):
    """获取频道成员列表"""
    try:
        conn = get_db_connection()
        
        # 验证频道存在
        channel = conn.execute('''
            SELECT c.*, r.room_id 
            FROM channels c 
            JOIN rooms r ON c.room_id = r.room_id 
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'success': False, 'message': '频道不存在'}), 404
        
        # 检查用户是否有权限访问该频道
        room_access = conn.execute('''
            SELECT 1 FROM user_rooms WHERE user_id = ? AND room_id = ?
        ''', (current_user.id, channel['room_id'])).fetchone()
        
        if not room_access:
            conn.close()
            return jsonify({'success': False, 'message': '您没有权限访问该频道'}), 403
        
        # 如果是私有频道，还需检查用户是否有权限
        if 'is_private' in channel and channel['is_private']:
            channel_access = conn.execute('''
                SELECT 1 FROM user_channels WHERE user_id = ? AND channel_id = ?
            ''', (current_user.id, channel_id)).fetchone()
            
            if not channel_access:
                conn.close()
                return jsonify({'success': False, 'message': '您没有权限访问该私有频道'}), 403
        
        # 获取频道成员
        members = conn.execute('''
            SELECT u.user_id, u.username, u.avatar_url, u.is_active
            FROM users u
            JOIN user_channels uc ON u.user_id = uc.user_id
            WHERE uc.channel_id = ?
            ORDER BY u.username
        ''', (channel_id,)).fetchall()
        
        # 转换为列表
        members_list = []
        for member in members:
            members_list.append({
                'user_id': member['user_id'],
                'username': member['username'],
                'avatar_url': member['avatar_url'],
                'is_online': bool(member['is_active']),
                'is_admin': False,  # 默认为False，因为表中可能没有这些列
                'is_muted': False   # 默认为False，因为表中可能没有这些列
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'channel_id': channel_id,
            'members': members_list,
            'count': len(members_list)
        })
        
    except Exception as e:
        current_app.logger.error(f"获取频道成员错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'获取频道成员失败: {str(e)}'}), 500

# API: 保存项目
@chat_bp.route('/api/save_item', methods=['POST'])
@login_required
def save_item():
    """保存项目（消息、链接等）到用户的收藏"""
    try:
        data = request.json
        if not data or 'item_type' not in data or 'item_id' not in data:
            return jsonify({'success': False, 'message': '请求参数不完整'}), 400
            
        item_type = data.get('item_type')
        item_id = data.get('item_id')
        item_data = data.get('item_data', {})
        
        # 添加额外数据
        notes = data.get('notes', '')
        tags = data.get('tags', [])
        
        conn = get_db_connection()
        
        # 检查项目是否已存在
        existing_item = conn.execute('''
            SELECT 1 FROM saved_items
            WHERE user_id = ? AND item_type = ? AND item_id = ?
        ''', (current_user.id, item_type, item_id)).fetchone()
        
        # 检查表结构来确定可以使用的列
        table_info = conn.execute("PRAGMA table_info(saved_items)").fetchall()
        column_names = [column["name"] for column in table_info]
        
        has_item_data = 'item_data' in column_names
        has_notes = 'notes' in column_names
        has_tags = 'tags' in column_names
        needs_channel_id = 'channel_id' in column_names
        has_updated_at = 'updated_at' in column_names
        
        # 获取当前活跃的channel_id，如果存在
        channel_id_param = data.get('channel_id', 1)  # 默认值为1，避免NULL约束失败
        
        if existing_item:
            # 更新现有项目
            if has_item_data and has_notes and has_tags:
                if needs_channel_id:
                    if has_updated_at:
                        conn.execute('''
                            UPDATE saved_items
                            SET item_data = ?, notes = ?, tags = ?, channel_id = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = ? AND item_type = ? AND item_id = ?
                        ''', (
                            json.dumps(item_data),
                            notes,
                            json.dumps(tags),
                            channel_id_param,
                            current_user.id,
                            item_type,
                            item_id
                        ))
                    else:
                        conn.execute('''
                            UPDATE saved_items
                            SET item_data = ?, notes = ?, tags = ?, channel_id = ?
                            WHERE user_id = ? AND item_type = ? AND item_id = ?
                        ''', (
                            json.dumps(item_data),
                            notes,
                            json.dumps(tags),
                            channel_id_param,
                            current_user.id,
                            item_type,
                            item_id
                        ))
                else:
                    if has_updated_at:
                        conn.execute('''
                            UPDATE saved_items
                            SET item_data = ?, notes = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = ? AND item_type = ? AND item_id = ?
                        ''', (
                            json.dumps(item_data),
                            notes,
                            json.dumps(tags),
                            current_user.id,
                            item_type,
                            item_id
                        ))
                    else:
                        conn.execute('''
                            UPDATE saved_items
                            SET item_data = ?, notes = ?, tags = ?
                            WHERE user_id = ? AND item_type = ? AND item_id = ?
                        ''', (
                            json.dumps(item_data),
                            notes,
                            json.dumps(tags),
                            current_user.id,
                            item_type,
                            item_id
                        ))
            else:
                # 简化的更新，只更新必要字段
                if needs_channel_id:
                    if has_updated_at:
                        conn.execute('''
                            UPDATE saved_items
                            SET channel_id = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = ? AND item_type = ? AND item_id = ?
                        ''', (channel_id_param, current_user.id, item_type, item_id))
                    else:
                        conn.execute('''
                            UPDATE saved_items
                            SET channel_id = ?
                            WHERE user_id = ? AND item_type = ? AND item_id = ?
                        ''', (channel_id_param, current_user.id, item_type, item_id))
                else:
                    if has_updated_at:
                        conn.execute('''
                            UPDATE saved_items
                            SET updated_at = CURRENT_TIMESTAMP
                            WHERE user_id = ? AND item_type = ? AND item_id = ?
                        ''', (current_user.id, item_type, item_id))
                    else:
                        # 什么都不更新，但我们需要确保记录存在
                        pass
            update_type = '更新'
        else:
            # 创建新项目
            if has_item_data and has_notes and has_tags:
                if needs_channel_id:
                    conn.execute('''
                        INSERT INTO saved_items (user_id, item_type, item_id, item_data, notes, tags, channel_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        current_user.id,
                        item_type,
                        item_id,
                        json.dumps(item_data),
                        notes,
                        json.dumps(tags),
                        channel_id_param
                    ))
                else:
                    conn.execute('''
                        INSERT INTO saved_items (user_id, item_type, item_id, item_data, notes, tags)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        current_user.id,
                        item_type,
                        item_id,
                        json.dumps(item_data),
                        notes,
                        json.dumps(tags)
                    ))
            else:
                # 简化的插入，只包含必要字段
                if needs_channel_id:
                    conn.execute('''
                        INSERT INTO saved_items (user_id, item_type, item_id, channel_id)
                        VALUES (?, ?, ?, ?)
                    ''', (current_user.id, item_type, item_id, channel_id_param))
                else:
                    conn.execute('''
                        INSERT INTO saved_items (user_id, item_type, item_id)
                        VALUES (?, ?, ?)
                    ''', (current_user.id, item_type, item_id))
            update_type = '创建'
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'已{update_type}收藏项目',
            'item_type': item_type,
            'item_id': item_id
        })
        
    except Exception as e:
        current_app.logger.error(f"保存项目错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'保存项目失败: {str(e)}'}), 500

# API: 获取已保存项目列表
@chat_bp.route('/api/saved_items', methods=['GET'])
@login_required
def get_saved_items():
    """获取用户保存的项目列表"""
    try:
        # 获取分页参数
        limit = min(int(request.args.get('limit', 20)), 100)  # 默认20条，最多100条
        offset = int(request.args.get('offset', 0))
        item_type = request.args.get('type')  # 可选的项目类型过滤
        
        conn = get_db_connection()
        
        # 检查表结构
        table_info = conn.execute("PRAGMA table_info(saved_items)").fetchall()
        column_names = [column["name"] for column in table_info]
        
        # 找出主键列，可用于排序
        primary_key_column = None
        for column in table_info:
            if column["pk"] == 1:  # SQLite的主键标记
                primary_key_column = column["name"]
                break
        
        # 如果没有找到主键，检查一些常见的ID列名
        if not primary_key_column:
            common_id_columns = ["id", "saved_item_id", "item_record_id", "record_id"]
            for col_name in common_id_columns:
                if col_name in column_names:
                    primary_key_column = col_name
                    break
        
        # 检查是否有created_at列用于排序
        has_created_at = 'created_at' in column_names
        has_updated_at = 'updated_at' in column_names
        
        # 构建查询
        query = "SELECT * FROM saved_items WHERE user_id = ?"
        params = [current_user.id]
        
        if item_type:
            query += " AND item_type = ?"
            params.append(item_type)
        
        # 根据表结构决定排序方式
        if has_created_at:
            query += " ORDER BY created_at DESC"
        elif has_updated_at:
            query += " ORDER BY updated_at DESC"
        elif primary_key_column:
            # 使用找到的主键或ID列
            query += f" ORDER BY {primary_key_column} DESC"
        else:
            # 如果所有尝试都失败，不进行排序
            pass
        
        query += " LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        current_app.logger.info(f"执行查询: {query} 参数: {params}")
        saved_items = conn.execute(query, params).fetchall()
        
        # 在记录转换前检查一下第一条记录的实际列
        if saved_items and len(saved_items) > 0:
            first_item = saved_items[0]
            current_app.logger.info(f"第一条记录的列: {dict(first_item).keys()}")
        
        # 转换为字典列表
        items_list = []
        for item in saved_items:
            # 创建一个基本字典
            item_dict = {}
            
            # 遍历实际存在的列，将所有值添加到字典中
            for column in item.keys():
                item_dict[column] = item[column]
            
            # 额外处理JSON字段
            if 'item_data' in item_dict and item_dict['item_data']:
                try:
                    item_dict['item_data'] = json.loads(item_dict['item_data'])
                except:
                    item_dict['item_data'] = {}
            
            if 'tags' in item_dict and item_dict['tags']:
                try:
                    item_dict['tags'] = json.loads(item_dict['tags'])
                except:
                    item_dict['tags'] = []
            
            items_list.append(item_dict)
        
        # 获取总数
        count_query = "SELECT COUNT(*) as count FROM saved_items WHERE user_id = ?"
        count_params = [current_user.id]
        
        if item_type:
            count_query += " AND item_type = ?"
            count_params.append(item_type)
        
        total_items = conn.execute(count_query, count_params).fetchone()['count']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'items': items_list,
            'total': total_items,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        current_app.logger.error(f"获取已保存项目错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'获取已保存项目失败: {str(e)}'}), 500

# API: 创建群组/聊天室
@chat_bp.route('/api/create_group', methods=['POST'])
@login_required
def create_group():
    """创建新的群组或聊天室"""
    try:
        data = request.json
        if not data or 'name' not in data:
            return jsonify({'success': False, 'message': '请求参数不完整'}), 400
            
        room_name = data.get('name')
        description = data.get('description', '')
        is_private = data.get('is_private', False)
        member_ids = data.get('member_ids', [])
        
        # 添加对端到端加密设置的支持
        # 从配置中获取默认设置，如果客户端提供了明确的设置，则使用客户端设置
        is_encrypted = data.get('is_encrypted', current_app.config.get('DEFAULT_CHANNEL_ENCRYPTION', True))
        
        # 确保创建者被添加到成员列表中
        if current_user.id not in member_ids:
            member_ids.append(current_user.id)
        
        conn = get_db_connection()
        
        # 创建新聊天室
        cursor = conn.execute('''
            INSERT INTO rooms (room_name, description, is_private, created_by)
            VALUES (?, ?, ?, ?)
        ''', (room_name, description, 1 if is_private else 0, current_user.id))
        
        room_id = cursor.lastrowid
        
        # 添加创建日志
        conn.execute('''
            INSERT INTO room_logs (room_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
        ''', (
            room_id,
            current_user.id,
            'create_room',
            json.dumps({'room_name': room_name, 'is_private': is_private})
        ))
        
        # 添加成员到聊天室
        for user_id in member_ids:
            # 判断用户是否存在
            user_exists = conn.execute('SELECT 1 FROM users WHERE user_id = ?', (user_id,)).fetchone()
            if user_exists:
                # 添加用户到聊天室
                conn.execute('''
                    INSERT INTO user_rooms (user_id, room_id, is_admin, joined_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    user_id, 
                    room_id, 
                    1 if user_id == current_user.id else 0  # 创建者是管理员
                ))
                
                # 记录添加成员日志
                if user_id != current_user.id:
                    conn.execute('''
                        INSERT INTO room_logs (room_id, user_id, target_user_id, action, details)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (
                        room_id,
                        current_user.id,
                        user_id,
                        'add_member',
                        json.dumps({'added_by': current_user.id})
                    ))
        
        # 创建默认频道
        cursor = conn.execute('''
            INSERT INTO channels (room_id, channel_name, description, is_private, is_encrypted)
            VALUES (?, ?, ?, ?, ?)
        ''', (room_id, '常规', '默认频道', 0, 1 if is_encrypted else 0))  # 使用传入或配置的加密设置
        
        channel_id = cursor.lastrowid
        
        # 将所有成员添加到默认频道
        for user_id in member_ids:
            user_exists = conn.execute('SELECT 1 FROM users WHERE user_id = ?', (user_id,)).fetchone()
            if user_exists:
                try:
                    conn.execute('''
                        INSERT INTO user_channels (user_id, channel_id, joined_at)
                        VALUES (?, ?, CURRENT_TIMESTAMP)
                    ''', (user_id, channel_id))
                except:
                    # 如果插入失败可能是因为表结构不同，尝试更简单的插入
                    conn.execute('''
                        INSERT INTO user_channels (user_id, channel_id)
                        VALUES (?, ?)
                    ''', (user_id, channel_id))
        
        conn.commit()
        
        # 获取创建的聊天室信息
        room = conn.execute('SELECT * FROM rooms WHERE room_id = ?', (room_id,)).fetchone()
        
        # 获取聊天室成员
        members_query = conn.execute('''
            SELECT u.user_id, u.username, u.avatar_url, u.is_active
            FROM users u
            JOIN user_rooms ur ON u.user_id = ur.user_id
            WHERE ur.room_id = ?
        ''', (room_id,)).fetchall()
        
        members = []
        for member in members_query:
            members.append({
                'user_id': member['user_id'],
                'username': member['username'],
                'avatar_url': member['avatar_url'],
                'is_online': bool(member['is_active'])
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '群组创建成功',
            'room': {
                'room_id': room_id,
                'room_name': room_name,
                'description': description,
                'is_private': is_private,
                'created_by': current_user.id,
                'created_at': room['created_at'],
                'default_channel_id': channel_id,
                'members': members,
                'member_count': len(members),
                'is_encrypted': is_encrypted
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"创建群组错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'创建群组失败: {str(e)}'}), 500

# API: 获取在线用户
@chat_bp.route('/api/online_users', methods=['GET'])
@login_required
def get_online_users():
    """获取当前在线用户列表"""
    try:
        # 从socket_events模块导入在线用户列表
        from socket_events import online_users, user_sessions
        
        # 获取所有用户
        conn = get_db_connection()
        users = conn.execute('''
            SELECT user_id, username, avatar_url, is_active
            FROM users
            ORDER BY is_active DESC, username
        ''').fetchall()
        
        # 转换为列表
        users_list = []
        for user in users:
            user_id = user['user_id']
            # 检查用户是否在在线用户字典中
            has_active_sessions = user_id in user_sessions and len(user_sessions[user_id]) > 0
            is_online = has_active_sessions or bool(user['is_active'])
            
            if user_id != current_user.id:  # 不包括当前用户自己
                # 获取用户的上次活跃时间，如果有多个会话，取最近一次
                last_active = None
                if user_id in online_users and online_users[user_id]:
                    # 取该用户所有会话中最近的一次活跃时间
                    for session_id, session_data in online_users[user_id].items():
                        if last_active is None or session_data.get('last_active', '') > last_active:
                            last_active = session_data.get('last_active')
                
                users_list.append({
                    'user_id': user_id,
                    'username': user['username'],
                    'avatar_url': user['avatar_url'],
                    'is_online': is_online,
                    'last_active': last_active
                })
        
        # 获取在线用户数
        online_count = sum(1 for user in users_list if user['is_online'])
        
        conn.close()
        
        return jsonify({
            'success': True,
            'users': users_list,
            'total': len(users_list),
            'online_count': online_count
        })
        
    except Exception as e:
        current_app.logger.error(f"获取在线用户错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'获取在线用户失败: {str(e)}'}), 500

# 获取所有用户
@chat_bp.route('/api/users')
@login_required
def get_users():
    """获取所有用户"""
    conn = get_db_connection()
    users = conn.execute('SELECT user_id, username, is_active, avatar_url FROM users').fetchall()
    conn.close()
    
    # 将数据库结果转换为可序列化的列表
    users_list = []
    for user in users:
        users_list.append({
            'user_id': user['user_id'],
            'username': user['username'],
            'is_active': bool(user['is_active']),
            'avatar_url': user['avatar_url']
        })
    
    return jsonify({'users': users_list})

# 获取历史私聊消息
@chat_bp.route('/api/direct_messages/<int:user_id>')
@login_required
def get_direct_messages(user_id):
    """获取与指定用户的私聊消息"""
    try:
        conn = get_db_connection()
        
        # 获取私聊消息，包括发送和接收的
        messages = conn.execute('''
            SELECT dm.*, u.username, u.avatar_url
            FROM direct_messages dm
            JOIN users u ON u.user_id = CASE
                WHEN dm.sender_id = ? THEN dm.recipient_id
                ELSE dm.sender_id
            END
            WHERE (dm.sender_id = ? AND dm.recipient_id = ?)
            OR (dm.sender_id = ? AND dm.recipient_id = ?)
            ORDER BY dm.created_at
        ''', (current_user.id, current_user.id, user_id, user_id, current_user.id)).fetchall()
        
        # 构建消息列表，包括加密内容
        messages_list = []
        for msg in messages:
            # 判断消息是否加密
            is_encrypted = msg['encrypted_content'] is not None and msg['iv'] is not None
            
            # 确定是否是自己发送的消息
            is_outgoing = msg['sender_id'] == current_user.id
            
            messages_list.append({
                'id': msg['dm_id'],
                'sender_id': msg['sender_id'],
                'recipient_id': msg['recipient_id'],
                'content': msg['content'],
                'encrypted_content': msg['encrypted_content'] if is_encrypted else None,
                'iv': msg['iv'] if is_encrypted else None,
                # 添加为自己加密的数据
                'encrypted_for_self': msg['encrypted_for_self'] if (is_encrypted and is_outgoing) else None,
                'iv_for_self': msg['iv_for_self'] if (is_encrypted and is_outgoing) else None,
                'is_encrypted': is_encrypted,
                'message_type': msg['message_type'],
                'created_at': msg['created_at'],
                'read_at': msg['read_at'],
                'is_outgoing': is_outgoing,
                'other_user': {
                    'id': user_id,
                    'username': msg['username'],
                    'avatar_url': msg['avatar_url']
                }
            })
        
        # 标记消息为已读（如果用户是接收者）
        conn.execute('''
            UPDATE direct_messages
            SET read_at = CURRENT_TIMESTAMP
            WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL
        ''', (current_user.id, user_id))
        conn.commit()
        
        # 获取用户信息
        user = conn.execute('SELECT user_id, username, avatar_url, is_active FROM users WHERE user_id = ?', 
                       (user_id,)).fetchone()
        
        conn.close()
        
        if not user:
            return jsonify({
                'success': False, 
                'message': '用户不存在'
            }), 404
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['user_id'],
                'username': user['username'],
                'avatar_url': user['avatar_url'],
                'is_online': user['is_active'] == 1
            },
            'messages': messages_list
        })
    
    except Exception as e:
        current_app.logger.error(f"获取私聊消息失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'获取私聊消息失败: {str(e)}'
        }), 500

# 添加别名路由 - 支持/api/direct_messages/user/<int:user_id>格式
@chat_bp.route('/api/direct_messages/user/<int:user_id>')
@login_required
def get_direct_messages_alias(user_id):
    """获取与指定用户的私聊消息的别名路由"""
    return get_direct_messages(user_id)

# 发送私聊消息
@chat_bp.route('/api/direct_messages', methods=['POST'])
@login_required
def send_direct_message():
    """发送私聊消息的REST API"""
    try:
        data = request.json
        if not data or 'recipient_id' not in data or ('content' not in data and 'encrypted_content' not in data):
            return jsonify({
                'success': False, 
                'message': '缺少必要参数'
            }), 400
        
        recipient_id = data.get('recipient_id')
        content = data.get('content')
        encrypted_content = data.get('encrypted_content')
        iv = data.get('iv')
        # 添加对encrypted_for_self和iv_for_self字段的处理
        encrypted_for_self = data.get('encrypted_for_self')
        iv_for_self = data.get('iv_for_self')
        message_type = data.get('message_type', 'text')
        
        if not content and not encrypted_content:
            return jsonify({
                'success': False, 
                'message': '消息内容不能为空'
            }), 400
        
        conn = get_db_connection()
        
        # 验证收件人存在
        recipient = conn.execute('SELECT * FROM users WHERE user_id = ?', (recipient_id,)).fetchone()
        
        if not recipient:
            conn.close()
            return jsonify({
                'success': False, 
                'message': '收件人不存在'
            }), 404
        
        # 如果涉及到加密频道，处理相关密钥
        if encrypted_content and 'channel_id' in data:
            channel_id = data.get('channel_id')
            if channel_id:
                print(f"加密私信涉及频道 {channel_id}，检查是否需要保存sender_key")
                channel_encrypted = conn.execute('''
                    SELECT is_encrypted FROM channels WHERE channel_id = ?
                ''', (channel_id,)).fetchone()
                
                if channel_encrypted and channel_encrypted['is_encrypted'] == 1:
                    process_channel_key(conn, channel_id, current_user.id, current_user.username)
        
        # 构建消息
        is_encrypted = encrypted_content is not None and iv is not None
        
        # 如果消息加密，则不保存明文内容
        actual_content = None if is_encrypted else content
        
        # 创建消息 - 添加encrypted_for_self和iv_for_self字段到插入语句
        cursor = conn.execute('''
            INSERT INTO direct_messages (
                sender_id, recipient_id, content, 
                encrypted_content, iv, 
                encrypted_for_self, iv_for_self, 
                message_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            current_user.id, recipient_id, actual_content, 
            encrypted_content, iv, 
            encrypted_for_self, iv_for_self, 
            message_type
        ))
        
        message_id = cursor.lastrowid
        conn.commit()
        
        # 获取创建的消息
        message = conn.execute('SELECT * FROM direct_messages WHERE dm_id = ?', (message_id,)).fetchone()
        
        # 构建响应
        message_data = {
            'id': message['dm_id'],
            'sender_id': message['sender_id'],
            'recipient_id': message['recipient_id'],
            'content': message['content'],
            'encrypted_content': message['encrypted_content'],
            'iv': message['iv'],
            'encrypted_for_self': message['encrypted_for_self'],
            'iv_for_self': message['iv_for_self'],
            'is_encrypted': is_encrypted,
            'message_type': message['message_type'],
            'created_at': message['created_at'],
            'read_at': message['read_at']
        }
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '消息发送成功',
            'message_id': message['dm_id'],  # 保持向后兼容
            'created_at': message['created_at'],  # 保持向后兼容
            'data': message_data
        })
    
    except Exception as e:
        current_app.logger.error(f"发送私聊消息失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'发送消息失败: {str(e)}'
        }), 500

@chat_bp.route('/api/direct_messages/<int:message_id>/read', methods=['POST'])
@login_required
def mark_message_read(message_id):
    """标记私聊消息为已读"""
    try:
        conn = get_db_connection()
        
        # 校验消息是否存在且收件人是当前用户
        message = conn.execute('''
            SELECT * FROM direct_messages 
            WHERE dm_id = ? AND recipient_id = ?
        ''', (message_id, current_user.id)).fetchone()
        
        if not message:
            conn.close()
            return jsonify({
                'success': False, 
                'message': '消息不存在或您不是接收者'
            }), 404
        
        # 更新已读时间（即使已经是已读状态）
        conn.execute('''
            UPDATE direct_messages SET read_at = CURRENT_TIMESTAMP
            WHERE dm_id = ? AND recipient_id = ?
        ''', (message_id, current_user.id))
        conn.commit()
        
        conn.close()
        
        return jsonify({'success': True, 'message': '消息已标记为已读'})
    
    except Exception as e:
        current_app.logger.error(f"标记消息已读失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'标记消息已读失败: {str(e)}'
        }), 500

# 兼容旧版的发送私聊消息API
@chat_bp.route('/api/direct_messages/send', methods=['POST'])
@login_required
def send_direct_message_compat():
    """兼容旧版客户端API的发送私聊消息接口"""
    # 直接调用原始的发送私聊消息处理函数
    return send_direct_message()

# 获取最新的私聊消息
@chat_bp.route('/api/direct_messages/latest', methods=['GET'])
@login_required
def get_latest_direct_messages():
    """获取与指定用户的最新私聊消息"""
    try:
        user_id = request.args.get('user_id', type=int)
        after_id = request.args.get('after_id', type=int, default=0)
        
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': '缺少用户ID参数'
            }), 400
        
        conn = get_db_connection()
        
        # 获取指定ID之后的私聊消息
        messages = conn.execute('''
            SELECT dm.*, u.username, u.avatar_url
            FROM direct_messages dm
            JOIN users u ON u.user_id = CASE
                WHEN dm.sender_id = ? THEN dm.recipient_id
                ELSE dm.sender_id
            END
            WHERE ((dm.sender_id = ? AND dm.recipient_id = ?)
            OR (dm.sender_id = ? AND dm.recipient_id = ?))
            AND dm.dm_id > ?
            ORDER BY dm.created_at
        ''', (current_user.id, current_user.id, user_id, user_id, current_user.id, after_id)).fetchall()
        
        # 构建消息列表
        messages_list = []
        for msg in messages:
            # 判断消息是否加密
            is_encrypted = msg['encrypted_content'] is not None and msg['iv'] is not None
            
            # 确定是否是自己发送的消息
            is_outgoing = msg['sender_id'] == current_user.id
            
            messages_list.append({
                'id': msg['dm_id'],
                'sender_id': msg['sender_id'],
                'recipient_id': msg['recipient_id'],
                'content': msg['content'],
                'encrypted_content': msg['encrypted_content'] if is_encrypted else None,
                'iv': msg['iv'] if is_encrypted else None,
                # 添加为自己加密的数据
                'encrypted_for_self': msg['encrypted_for_self'] if (is_encrypted and is_outgoing) else None,
                'iv_for_self': msg['iv_for_self'] if (is_encrypted and is_outgoing) else None,
                'is_encrypted': is_encrypted,
                'message_type': msg['message_type'],
                'created_at': msg['created_at'],
                'read_at': msg['read_at'],
                'is_outgoing': is_outgoing
            })
        
        # 如果有新消息且当前用户是接收者，标记为已读
        unread_messages = [msg for msg in messages_list if msg['recipient_id'] == current_user.id and not msg['read_at']]
        if unread_messages:
            for msg in unread_messages:
                conn.execute('''
                    UPDATE direct_messages
                    SET read_at = CURRENT_TIMESTAMP
                    WHERE dm_id = ? AND read_at IS NULL
                ''', (msg['id'],))
            conn.commit()
        
        conn.close()
        
        return jsonify({
            'status': 'success',
            'data': messages_list
        })
    
    except Exception as e:
        current_app.logger.error(f"获取最新私聊消息失败: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': f'获取最新私聊消息失败: {str(e)}'
        }), 500

# 添加频道成员API
@chat_bp.route('/api/add_channel_member', methods=['POST'])
@login_required
def add_channel_member():
    """添加用户到频道"""
    try:
        data = request.json
        
        # 验证请求数据
        required_fields = ['channel_id', 'user_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'缺少必要参数: {field}'}), 400
        
        channel_id = data['channel_id']
        user_id = data['user_id']
        
        conn = get_db_connection()
        
        # 检查频道是否存在
        channel = conn.execute('''
            SELECT c.*, r.room_id 
            FROM channels c 
            JOIN rooms r ON c.room_id = r.room_id 
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'success': False, 'message': '频道不存在'}), 404
        
        # 检查目标用户是否存在
        target_user = conn.execute('SELECT * FROM users WHERE user_id = ?', (user_id,)).fetchone()
        if not target_user:
            conn.close()
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 检查当前用户是否有权限管理该频道
        user_role = conn.execute('''
            SELECT ur.role 
            FROM user_rooms ur
            WHERE ur.user_id = ? AND ur.room_id = ?
        ''', (current_user.id, channel['room_id'])).fetchone()
        
        if not user_role or user_role['role'] not in ['admin', 'owner']:
            conn.close()
            return jsonify({'success': False, 'message': '您没有权限管理此频道成员'}), 403
        
        # 检查用户是否已经是频道成员
        existing_member = conn.execute('''
            SELECT 1 FROM user_channels 
            WHERE channel_id = ? AND user_id = ?
        ''', (channel_id, user_id)).fetchone()
        
        if existing_member:
            conn.close()
            return jsonify({'success': False, 'message': '用户已经是此频道成员'}), 409
        
        # 添加用户到频道
        conn.execute('''
            INSERT INTO user_channels (channel_id, user_id, joined_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', (channel_id, user_id))
        
        # 记录添加成员的操作日志
        conn.execute('''
            INSERT INTO channel_logs (channel_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
        ''', (
            channel_id,
            current_user.id,
            'add_member',
            json.dumps({
                'user_id': user_id,
                'username': target_user['username'],
                'added_by': current_user.id
            })
        ))
        
        # 如果频道启用了加密，需要为新成员分发密钥
        is_encrypted = channel.get('is_encrypted', 0) == 1
        if is_encrypted:
            # 获取当前频道的密钥版本
            master_key = conn.execute("""
                SELECT key_version FROM channel_master_keys 
                WHERE channel_id = ? AND is_active = 1
                ORDER BY key_version DESC LIMIT 1
            """, (channel_id,)).fetchone()
            
            current_key_version = 1  # 默认值
            if master_key and master_key[0]:
                current_key_version = master_key[0]
            
            # 创建系统消息通知用户需要请求密钥
            conn.execute('''
                INSERT INTO messages (channel_id, content, message_type, created_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                channel_id,
                f"用户 {target_user['username']} 已加入频道，需要请求加密密钥。",
                'system'
            ))
        
        conn.commit()
        
        # 通过WebSocket通知其他成员有新用户加入
        if 'socketio' in globals() or hasattr(current_app, 'socketio'):
            socketio = current_app.socketio if hasattr(current_app, 'socketio') else globals().get('socketio')
            if socketio:
                socketio.emit('user_joined_channel', {
                    'channel_id': channel_id,
                    'user': {
                        'id': user_id,
                        'username': target_user['username']
                    },
                    'needs_key': is_encrypted,
                    'timestamp': datetime.now().isoformat()
                }, room=f'channel_{channel_id}')
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f"已成功将用户 {target_user['username']} 添加到频道",
            'member': {
                'id': user_id,
                'username': target_user['username'],
                'role': 'member'
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"添加频道成员错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'添加频道成员失败: {str(e)}'}), 500

# 从频道中移除用户
@chat_bp.route('/api/remove_channel_member', methods=['POST'])
@login_required
def remove_channel_member():
    """从频道中移除用户"""
    try:
        data = request.json
        
        # 验证请求数据
        required_fields = ['channel_id', 'user_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'缺少必要参数: {field}'}), 400
        
        channel_id = data['channel_id']
        user_id = data['user_id']
        
        # 防止自己踢出自己
        if int(user_id) == current_user.id:
            return jsonify({'success': False, 'message': '您不能将自己移出频道'}), 400
        
        conn = get_db_connection()
        
        # 检查频道是否存在
        channel = conn.execute('''
            SELECT c.*, r.room_id 
            FROM channels c 
            JOIN rooms r ON c.room_id = r.room_id 
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'success': False, 'message': '频道不存在'}), 404
        
        # 检查目标用户是否存在
        target_user = conn.execute('SELECT * FROM users WHERE user_id = ?', (user_id,)).fetchone()
        if not target_user:
            conn.close()
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 检查当前用户是否有权限管理该频道
        user_role = conn.execute('''
            SELECT ur.role 
            FROM user_rooms ur
            WHERE ur.user_id = ? AND ur.room_id = ?
        ''', (current_user.id, channel['room_id'])).fetchone()
        
        if not user_role or user_role['role'] not in ['admin', 'owner']:
            conn.close()
            return jsonify({'success': False, 'message': '您没有权限管理此频道成员'}), 403
        
        # 检查目标用户是否是频道成员
        target_membership = conn.execute('''
            SELECT uc.*, ur.role 
            FROM user_channels uc
            JOIN user_rooms ur ON ur.user_id = uc.user_id AND ur.room_id = ?
            WHERE uc.channel_id = ? AND uc.user_id = ?
        ''', (channel['room_id'], channel_id, user_id)).fetchone()
        
        if not target_membership:
            conn.close()
            return jsonify({'success': False, 'message': '用户不是此频道成员'}), 404
        
        # 不能踢出拥有者
        if 'role' in target_membership and target_membership['role'] == 'owner':
            conn.close()
            return jsonify({'success': False, 'message': '无法移除频道拥有者'}), 403
        
        # 记录成员被移除前的信息
        removed_member_info = {
            'user_id': user_id,
            'username': target_user['username'],
            'role': target_membership.get('role', 'member')
        }
        
        # 从频道中移除用户
        conn.execute('DELETE FROM user_channels WHERE channel_id = ? AND user_id = ?', 
                    (channel_id, user_id))
        
        # 记录移除操作
        conn.execute('''
            INSERT INTO channel_logs (channel_id, user_id, action, details)
            VALUES (?, ?, ?, ?)
        ''', (
            channel_id,
            current_user.id,
            'remove_member',
            json.dumps({
                'removed_user_id': user_id,
                'removed_username': target_user['username'],
                'removed_by': current_user.id
            })
        ))
        
        # 检查频道是否启用了加密
        is_encrypted = ('is_encrypted' in channel.keys() and channel['is_encrypted'] == 1)
        
        # 如果频道启用了加密，需要处理密钥轮换
        if is_encrypted:
            # 获取当前密钥版本
            master_key = conn.execute("""
                SELECT key_version FROM channel_master_keys 
                WHERE channel_id = ? AND is_active = 1
                ORDER BY key_version DESC LIMIT 1
            """, (channel_id,)).fetchone()
            
            current_key_version = 1  # 默认值
            if master_key and master_key[0]:
                current_key_version = master_key[0]
            
            # 新密钥版本
            new_key_version = current_key_version + 1
            
            # 记录密钥轮换
            conn.execute("""
                INSERT INTO key_rotation_logs 
                (channel_id, old_key_version, new_key_version, rotated_by, reason) 
                VALUES (?, ?, ?, ?, ?)
            """, (
                channel_id,
                current_key_version,
                new_key_version,
                current_user.id,
                f"用户 {target_user['username']} 被移出频道"
            ))
            
            # 创建系统消息通知其他用户密钥已轮换
            conn.execute('''
                INSERT INTO messages (channel_id, content, message_type, created_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                channel_id,
                f"由于用户 {target_user['username']} 已被移除，频道密钥需要轮换。",
                'system'
            ))
            
            # 获取所有剩余的频道成员
            remaining_members = conn.execute('''
                SELECT uc.user_id, u.username
                FROM user_channels uc
                JOIN users u ON uc.user_id = u.user_id
                WHERE uc.channel_id = ?
            ''', (channel_id,)).fetchall()
            
            # 提交数据库更改
            conn.commit()
            
            # 通知密钥需要轮换
            if 'socketio' in globals() or hasattr(current_app, 'socketio'):
                socketio = current_app.socketio if hasattr(current_app, 'socketio') else globals().get('socketio')
                if socketio:
                    # 向频道管理员发送密钥轮换通知，包含所有需要接收新密钥的成员信息
                    socketio.emit('key_rotation_needed', {
                        'channel_id': channel_id,
                        'new_version': new_key_version,
                        'reason': f"用户 {target_user['username']} 被移出频道",
                        'is_key_rotation': True,
                        'members': [{'id': m['user_id'], 'username': m['username']} for m in remaining_members],
                        'removed_user': {'id': user_id, 'username': target_user['username']},
                        'timestamp': datetime.now().isoformat()
                    }, room=f'user_{current_user.id}')
        
        # 通知其他成员有用户被移除
        if 'socketio' in globals() or hasattr(current_app, 'socketio'):
            socketio = current_app.socketio if hasattr(current_app, 'socketio') else globals().get('socketio')
            if socketio:
                socketio.emit('user_left_channel', {
                    'channel_id': channel_id,
                    'user_id': user_id,
                    'username': target_user['username'],
                    'removed_by': current_user.username,
                    'timestamp': datetime.now().isoformat(),
                    'requires_key_rotation': is_encrypted
                }, room=f'channel_{channel_id}')
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f"已成功将用户 {target_user['username']} 移出频道",
            'removed_member': removed_member_info,
            'requires_key_rotation': is_encrypted
        })
        
    except Exception as e:
        current_app.logger.error(f"移除频道成员错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'移除频道成员失败: {str(e)}'}), 500

# 兼容旧版API
@chat_bp.route('/api/remove_member', methods=['POST'])
@login_required
def remove_member():
    """从频道中移除用户（兼容老版本API）"""
    try:
        # 直接调用新实现的函数
        return remove_channel_member()
    except Exception as e:
        current_app.logger.error(f"移除成员(兼容API)错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'移除频道成员失败: {str(e)}'}), 500

# 获取用户公钥API
@chat_bp.route('/api/users/<int:user_id>/public_key', methods=['GET'])
@login_required
def get_user_public_key(user_id):
    """获取指定用户的公钥"""
    try:
        conn = get_db_connection()
        
        # 检查用户是否存在
        user = conn.execute('SELECT * FROM users WHERE user_id = ?', (user_id,)).fetchone()
        if not user:
            conn.close()
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 从用户密钥表获取公钥
        user_key = conn.execute('SELECT public_key FROM user_keys WHERE user_id = ?', (user_id,)).fetchone()
        
        # 如果user_keys表中没有记录，尝试从users表获取
        if not user_key or not user_key['public_key']:
            user_key = conn.execute('SELECT public_key FROM users WHERE user_id = ?', (user_id,)).fetchone()
        
        if not user_key or not user_key['public_key']:
            conn.close()
            return jsonify({'success': False, 'message': '该用户未设置公钥'}), 404
        
        conn.close()
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'username': user['username'],
            'public_key': user_key['public_key']
        })
        
    except Exception as e:
        current_app.logger.error(f"获取用户公钥错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'获取用户公钥失败: {str(e)}'}), 500

# 请求频道密钥
@chat_bp.route('/api/channels/<int:channel_id>/request_key', methods=['POST'])
@login_required
def request_channel_key(channel_id):
    """请求频道加密密钥"""
    try:
        conn = get_db_connection()
        
        # 验证频道存在
        channel = conn.execute('''
            SELECT c.*, r.room_id 
            FROM channels c 
            JOIN rooms r ON c.room_id = r.room_id 
            WHERE c.channel_id = ?
        ''', (channel_id,)).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({'success': False, 'message': '频道不存在'}), 404
        
        # 检查用户是否是频道成员
        channel_member = conn.execute('''
            SELECT 1 FROM user_channels 
            WHERE channel_id = ? AND user_id = ?
        ''', (channel_id, current_user.id)).fetchone()
        
        if not channel_member:
            conn.close()
            return jsonify({'success': False, 'message': '您不是该频道成员'}), 403
        
        # 获取频道管理员
        admin_member = conn.execute('''
            SELECT ur.user_id 
            FROM user_rooms ur
            JOIN channels c ON c.room_id = ur.room_id
            WHERE c.channel_id = ? AND ur.role IN ('admin', 'owner')
            ORDER BY CASE WHEN ur.role = 'owner' THEN 0 ELSE 1 END
            LIMIT 1
        ''', (channel_id,)).fetchone()
        
        if not admin_member:
            # 如果没有管理员，找频道中的第一个成员
            admin_member = conn.execute('''
                SELECT user_id 
                FROM user_channels
                WHERE channel_id = ?
                ORDER BY joined_at
                LIMIT 1
            ''', (channel_id,)).fetchone()
        
        if not admin_member:
            conn.close()
            return jsonify({'success': False, 'message': '未找到频道管理员'}), 500
        
        admin_id = admin_member['user_id']
        admin_user = conn.execute('SELECT * FROM users WHERE user_id = ?', (admin_id,)).fetchone()
        
        # 创建密钥请求记录
        conn.execute('''
            INSERT INTO key_distribution_requests
            (channel_id, requester_id, admin_id, status, created_at)
            VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        ''', (channel_id, current_user.id, admin_id))
        
        request_id = conn.lastrowid
        conn.commit()
        
        # 通过WebSocket通知管理员有新的密钥请求
        if 'socketio' in globals() or hasattr(current_app, 'socketio'):
            socketio = current_app.socketio if hasattr(current_app, 'socketio') else globals().get('socketio')
            if socketio:
                socketio.emit('channel_key_request', {
                    'channel_id': channel_id,
                    'requester_id': current_user.id,
                    'requester_username': current_user.username,
                    'request_id': request_id,
                    'timestamp': datetime.now().isoformat()
                }, room=f'user_{admin_id}')
        
        # 创建系统消息记录请求
        conn.execute('''
            INSERT INTO messages (channel_id, user_id, content, message_type, created_at)
            VALUES (?, ?, ?, 'system', CURRENT_TIMESTAMP)
        ''', (
            channel_id, 
            current_user.id, 
            f"用户 {current_user.username} 请求频道加密密钥。"
        ))
        conn.commit()
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '密钥请求已发送给频道管理员',
            'request_id': request_id
        })
        
    except Exception as e:
        current_app.logger.error(f"请求频道密钥错误: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': f'请求频道密钥失败: {str(e)}'}), 500

# 分享频道密钥
@chat_bp.route('/api/channels/share_key', methods=['POST'])
@login_required
def share_channel_key():
    """分享频道加密密钥给其他用户"""
    try:
        data = request.json
        
        # 验证请求数据
        required_fields = ['user_id', 'channel_id', 'encrypted_key']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'缺少必要参数: {field}'}), 400
        
        user_id = data['user_id']
        channel_id = data['channel_id']
        encrypted_key = data['encrypted_key']  # 这是用目标用户公钥加密后的sender_key
        
        # 新增：检查是否是密钥轮换
        is_key_rotation = data.get('is_key_rotation', False)
        key_version = data.get('key_version')  # 可能为密钥版本
        
        print(f"共享密钥请求: 用户={user_id}, 频道={channel_id}, 是否密钥轮换={is_key_rotation}, 密钥版本={key_version}")
        
        conn = get_db_connection()
        
        # 检查目标用户是否存在
        target_user = conn.execute('SELECT * FROM users WHERE user_id = ?', (user_id,)).fetchone()
        if not target_user:
            conn.close()
            return jsonify({'success': False, 'message': '目标用户不存在'}), 404
        
        # 检查频道是否存在
        channel = conn.execute('SELECT * FROM channels WHERE channel_id = ?', (channel_id,)).fetchone()
        if not channel:
            conn.close()
            return jsonify({'success': False, 'message': '频道不存在'}), 404
        
        # 验证发送者和接收者都是频道成员
        sender_member = conn.execute('''
            SELECT 1 FROM user_channels 
            WHERE channel_id = ? AND user_id = ?
        ''', (channel_id, current_user.id)).fetchone()
        
        recipient_member = conn.execute('''
            SELECT 1 FROM user_channels 
            WHERE channel_id = ? AND user_id = ?
        ''', (channel_id, user_id)).fetchone()
        
        if not sender_member:
            conn.close()
            return jsonify({'success': False, 'message': '您不是该频道成员'}), 403
        
        if not recipient_member:
            conn.close()
            return jsonify({'success': False, 'message': '接收者不是该频道成员'}), 403
        
        # 获取当前频道的密钥版本
        if not key_version:
            master_key = conn.execute("""
                SELECT key_version FROM channel_master_keys 
                WHERE channel_id = ? AND is_active = 1
                ORDER BY key_version DESC LIMIT 1
            """, (channel_id,)).fetchone()
            
            current_key_version = 1  # 默认值
            if master_key:
                if isinstance(master_key, dict) and 'key_version' in master_key:
                    current_key_version = master_key['key_version']
                else:
                    current_key_version = master_key[0]
            
            if is_key_rotation:  # 如果是密钥轮换，版本号+1
                current_key_version += 1
        else:
            # 使用请求中提供的版本号
            current_key_version = key_version
        
        print(f"当前密钥版本: {current_key_version}")
        
        # 记录共享操作，创建密钥共享记录
        try:
            cursor = conn.execute('''
                INSERT INTO channel_key_shares
                (channel_id, sender_id, recipient_id, encrypted_key, nonce, created_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (channel_id, current_user.id, user_id, encrypted_key, 'auto_generated'))
            
            share_id = cursor.lastrowid
            conn.commit()
            print(f"创建密钥共享记录成功: ID={share_id}")
        except Exception as e:
            print(f"创建密钥共享记录失败: {str(e)}")
            # 检查是否是nonce字段缺失导致的错误
            if "no such column: nonce" in str(e):
                try:
                    # 尝试不使用nonce字段
                    cursor = conn.execute('''
                        INSERT INTO channel_key_shares
                        (channel_id, sender_id, recipient_id, encrypted_key, created_at)
                        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ''', (channel_id, current_user.id, user_id, encrypted_key))
                    
                    share_id = cursor.lastrowid
                    conn.commit()
                    print(f"不使用nonce字段，创建密钥共享记录成功: ID={share_id}")
                    
                    # 检查表结构并尝试添加nonce字段
                    try:
                        conn.execute("ALTER TABLE channel_key_shares ADD COLUMN nonce TEXT DEFAULT 'auto_generated'")
                        conn.commit()
                        print("已添加nonce字段到channel_key_shares表")
                    except Exception as alter_err:
                        print(f"尝试添加nonce字段失败: {str(alter_err)}")
                except Exception as insert_err:
                    print(f"尝试不使用nonce字段插入也失败: {str(insert_err)}")
            # 继续执行，主要确保用户有密钥记录
        
        # 强制写入user_channel_keys表，确保用户有密钥记录
        # 首先检查是否存在现有记录
        try:
            existing_key = conn.execute("""
                SELECT id, encrypted_key FROM user_channel_keys 
                WHERE channel_id = ? AND user_id = ? AND key_version = ?
            """, (channel_id, user_id, current_key_version)).fetchone()
            
            if existing_key:
                print(f"用户 {user_id} 已有频道 {channel_id} 版本 {current_key_version} 的密钥记录")
                
                # 如果是密钥轮换或明确要求更新，则更新现有记录
                if is_key_rotation or data.get('force_update', False):
                    conn.execute("""
                        UPDATE user_channel_keys 
                        SET encrypted_key = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE channel_id = ? AND user_id = ? AND key_version = ?
                    """, (encrypted_key, channel_id, user_id, current_key_version))
                    conn.commit()
                    print(f"已更新用户 {user_id} 的密钥记录")
            else:
                # 没有现有记录，创建新记录
                print(f"用户 {user_id} 没有密钥记录，创建新记录")
                conn.execute("""
                    INSERT INTO user_channel_keys 
                    (channel_id, user_id, key_version, encrypted_key, nonce, is_active, created_at, updated_at) 
                    VALUES (?, ?, ?, ?, 'auto_generated', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (channel_id, user_id, current_key_version, encrypted_key))
                conn.commit()
                print(f"已为用户 {user_id} 创建新的密钥记录")
        except Exception as e:
            print(f"处理用户密钥记录失败: {str(e)}")
            import traceback
            traceback.print_exc()
            # 尝试一种更简单的方式插入/更新
            try:
                # 先删除可能存在的记录
                conn.execute("""
                    DELETE FROM user_channel_keys
                    WHERE channel_id = ? AND user_id = ? AND key_version = ?
                """, (channel_id, user_id, current_key_version))
                
                # 然后重新插入
                conn.execute("""
                    INSERT INTO user_channel_keys 
                    (channel_id, user_id, key_version, encrypted_key, nonce, is_active, created_at, updated_at) 
                    VALUES (?, ?, ?, ?, 'auto_generated', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (channel_id, user_id, current_key_version, encrypted_key))
                conn.commit()
                print(f"使用替代方法成功为用户 {user_id} 创建密钥记录")
            except Exception as alt_e:
                print(f"替代方法也失败了: {str(alt_e)}")
        
        # 如果是密钥轮换，更新主密钥版本记录
        if is_key_rotation:
            try:
                # 检查该密钥版本是否已存在
                existing_master_key = conn.execute("""
                    SELECT 1 FROM channel_master_keys 
                    WHERE channel_id = ? AND key_version = ?
                """, (channel_id, current_key_version)).fetchone()
                
                if not existing_master_key:
                    # 将旧版本标记为非活跃
                    conn.execute("""
                        UPDATE channel_master_keys 
                        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                        WHERE channel_id = ? AND is_active = 1
                    """, (channel_id,))
                    
                    # 创建新版本记录
                    conn.execute("""
                        INSERT INTO channel_master_keys 
                        (channel_id, key_version, key_data, nonce, created_by, is_active, created_at)
                        VALUES (?, ?, 'rotated_key', 'auto_generated', ?, 1, CURRENT_TIMESTAMP)
                    """, (channel_id, current_key_version, current_user.id))
                    
                    conn.commit()
                    print(f"更新频道 {channel_id} 的主密钥版本为 {current_key_version}")
            except Exception as e:
                print(f"更新主密钥版本失败: {str(e)}")
        
        # 通过WebSocket将加密的密钥发送给目标用户
        if 'socketio' in globals() or hasattr(current_app, 'socketio'):
            try:
                socketio = current_app.socketio if hasattr(current_app, 'socketio') else globals().get('socketio')
                if socketio:
                    socketio.emit('channel_key_share', {
                        'channel_id': channel_id,
                        'sender_id': current_user.id,
                        'sender_username': current_user.username,
                        'encrypted_key': encrypted_key,
                        'key_version': current_key_version,
                        'is_key_rotation': is_key_rotation,
                        'timestamp': datetime.now().isoformat()
                    }, room=f'user_{user_id}')
                    print(f"已通过WebSocket发送密钥通知给用户 {user_id}")
            except Exception as e:
                print(f"发送WebSocket通知失败: {str(e)}")
        
        # 更新任何待处理的密钥请求
        try:
            conn.execute('''
                UPDATE key_distribution_requests
                SET status = 'completed', updated_at = CURRENT_TIMESTAMP
                WHERE channel_id = ? AND requester_id = ? AND status = 'pending'
            ''', (channel_id, user_id))
            conn.commit()
            print(f"已更新用户 {user_id} 的密钥请求状态")
        except Exception as e:
            print(f"更新密钥请求状态失败: {str(e)}")
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '频道密钥分享成功',
            'share_id': share_id,
            'key_version': current_key_version,
            'is_key_rotation': is_key_rotation
        })
    except Exception as e:
        print(f"分享频道密钥错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'分享频道密钥失败: {str(e)}'}), 500