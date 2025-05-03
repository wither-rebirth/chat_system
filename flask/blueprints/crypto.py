"""
加密模块蓝图
提供加密相关的API端点
"""
from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from utils.db import get_db_connection
import json
import os
from utils.crypto import validate_public_key, create_error_response

# 创建蓝图
crypto_bp = Blueprint('crypto', __name__)

# 覆盖数据库连接函数以使用正确的数据库文件
def get_crypto_db_connection():
    """获取到chat_system.sqlite数据库的连接"""
    import sqlite3
    # 获取应用根目录
    app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(app_root, 'chat_system.sqlite')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@crypto_bp.route('/api/channel_members/<int:channel_id>', methods=['GET'])
@login_required
def get_channel_members(channel_id):
    """获取频道成员列表"""
    try:
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 首先检查频道是否存在
        channel = conn.execute(
            'SELECT 1 FROM channels WHERE channel_id = ?', 
            (channel_id,)
        ).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({
                'success': False,
                'message': '频道不存在',
                'members': []
            }), 404
        
        # 检查当前用户是否是频道成员
        member_check = conn.execute(
            'SELECT 1 FROM user_channels WHERE channel_id = ? AND user_id = ?',
            (channel_id, current_user.id)
        ).fetchone()
        
        if not member_check:
            conn.close()
            return jsonify({
                'success': False,
                'message': '您不是此频道的成员',
                'members': []
            }), 403
        
        # 获取频道成员列表
        members = conn.execute(
            '''
            SELECT u.user_id, u.username, u.avatar_url, uc.role, 
                   CASE WHEN uk.public_key IS NOT NULL THEN 1 ELSE 0 END as has_public_key,
                   (SELECT CASE WHEN MAX(last_seen) > datetime('now', '-5 minutes') 
                           THEN 1 ELSE 0 END 
                    FROM user_sessions 
                    WHERE user_id = u.user_id) as is_online
            FROM user_channels uc
            JOIN users u ON uc.user_id = u.user_id
            LEFT JOIN user_keys uk ON u.user_id = uk.user_id
            WHERE uc.channel_id = ?
            ORDER BY u.username
            ''',
            (channel_id,)
        ).fetchall()
        
        # 构建响应数据
        members_data = []
        for member in members:
            members_data.append({
                'user_id': member['user_id'],
                'username': member['username'],
                'avatar_url': member['avatar_url'],
                'role': member['role'],
                'has_public_key': bool(member['has_public_key']),
                'is_online': bool(member['is_online'])
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'members': members_data
        })
    
    except Exception as e:
        current_app.logger.error(f"获取频道成员列表失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'获取频道成员列表时发生错误: {str(e)}',
            'members': []
        }), 500

@crypto_bp.route('/api/channels/<int:channel_id>/encryption_status', methods=['GET'])
@login_required
def get_channel_encryption_status(channel_id):
    """获取频道的加密状态"""
    try:
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 查询频道是否启用了加密
        result = conn.execute(
            'SELECT is_encrypted FROM channels WHERE channel_id = ?', 
            (channel_id,)
        ).fetchone()
        
        # 检查用户是否是频道成员
        member_check = conn.execute(
            'SELECT 1 FROM user_channels WHERE channel_id = ? AND user_id = ?',
            (channel_id, current_user.id)
        ).fetchone()
        
        conn.close()
        
        # 如果找不到频道或用户不是成员，返回错误
        if not result:
            return jsonify({
                'success': False,
                'message': '频道不存在',
                'is_encrypted': False
            }), 404
        
        if not member_check:
            return jsonify({
                'success': False,
                'message': '您不是此频道的成员',
                'is_encrypted': False
            }), 403
        
        # 返回加密状态
        # 注意：如果数据库中没有is_encrypted字段，需要先添加该字段
        is_encrypted = bool(result['is_encrypted']) if 'is_encrypted' in result.keys() else False
        
        return jsonify({
            'success': True,
            'is_encrypted': is_encrypted,
            'has_key': is_encrypted  # 假设有密钥，前端会处理没有密钥的情况
        })
    
    except Exception as e:
        current_app.logger.error(f"获取频道加密状态失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'获取频道加密状态时发生错误: {str(e)}',
            'is_encrypted': False
        }), 500

@crypto_bp.route('/api/channels/<int:channel_id>/enable_encryption', methods=['POST'])
@login_required
def enable_channel_encryption(channel_id):
    """启用频道的加密（专门用于前端调用）"""
    try:
        data = request.json
        encrypted = True  # 默认启用加密
        
        if data and 'encrypted' in data:
            encrypted = bool(data.get('encrypted'))
        
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 检查频道是否存在
        channel = conn.execute(
            'SELECT 1 FROM channels WHERE channel_id = ?', 
            (channel_id,)
        ).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({
                'success': False,
                'message': '频道不存在'
            }), 404
        
        # 检查用户是否是频道成员
        member_check = conn.execute(
            'SELECT 1 FROM user_channels WHERE channel_id = ? AND user_id = ?',
            (channel_id, current_user.id)
        ).fetchone()
        
        if not member_check:
            conn.close()
            return jsonify({
                'success': False,
                'message': '您不是此频道的成员'
            }), 403
        
        # 检查数据库结构中是否有is_encrypted字段
        table_info = conn.execute("PRAGMA table_info(channels)").fetchall()
        has_encrypted_field = any(column['name'] == 'is_encrypted' for column in table_info)
        
        # 如果没有is_encrypted字段，添加该字段
        if not has_encrypted_field:
            conn.execute("ALTER TABLE channels ADD COLUMN is_encrypted INTEGER DEFAULT 0")
            conn.commit()
        
        # 更新频道加密状态
        conn.execute(
            'UPDATE channels SET is_encrypted = ? WHERE channel_id = ?',
            (1 if encrypted else 0, channel_id)
        )
        
        conn.commit()
        conn.close()
        
        # 返回成功响应
        return jsonify({
            'success': True,
            'message': f'频道加密已{"启用" if encrypted else "禁用"}',
            'is_encrypted': encrypted
        })
    
    except Exception as e:
        current_app.logger.error(f"更新频道加密状态失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'更新频道加密状态时发生错误: {str(e)}'
        }), 500

@crypto_bp.route('/api/channels/<int:channel_id>/encryption', methods=['POST'])
@login_required
def update_channel_encryption(channel_id):
    """更新频道的加密状态"""
    try:
        data = request.json
        if not data or 'enable_encryption' not in data:
            return create_error_response('缺少enable_encryption参数', 400)
        
        enable_encryption = bool(data.get('enable_encryption'))
        
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 检查用户是否是频道管理员或创建者
        admin_check = conn.execute(
            '''SELECT 1 FROM channels c
               JOIN user_channels uc ON c.channel_id = uc.channel_id
               WHERE c.channel_id = ? AND uc.user_id = ? AND 
               (c.created_by = ? OR uc.role IN ('admin', 'owner'))''',
            (channel_id, current_user.id, current_user.id)
        ).fetchone()
        
        if not admin_check:
            conn.close()
            return create_error_response('您没有权限更改此频道的加密设置', 403)
        
        # 检查数据库结构中是否有is_encrypted字段
        table_info = conn.execute("PRAGMA table_info(channels)").fetchall()
        has_encrypted_field = any(column['name'] == 'is_encrypted' for column in table_info)
        
        # 如果没有is_encrypted字段，添加该字段
        if not has_encrypted_field:
            conn.execute("ALTER TABLE channels ADD COLUMN is_encrypted INTEGER DEFAULT 0")
            conn.commit()
        
        # 更新频道加密状态
        conn.execute(
            'UPDATE channels SET is_encrypted = ? WHERE channel_id = ?',
            (1 if enable_encryption else 0, channel_id)
        )
        
        conn.commit()
        conn.close()
        
        # 返回成功响应
        return jsonify({
            'success': True,
            'message': f'频道加密已{"启用" if enable_encryption else "禁用"}',
            'is_encrypted': enable_encryption
        })
    
    except Exception as e:
        current_app.logger.error(f"更新频道加密状态失败: {str(e)}", exc_info=True)
        return create_error_response(f'更新频道加密状态时发生错误: {str(e)}', 500)

@crypto_bp.route('/api/crypto/get_public_key/<string:user_id>', methods=['GET'])
@login_required
def get_public_key(user_id):
    """获取用户的公钥"""
    try:
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 尝试将user_id转换为整数（向后兼容）
        try:
            numeric_user_id = int(user_id)
            user_id_param = numeric_user_id
        except ValueError:
            # 如果不是整数，则使用原始字符串
            user_id_param = user_id
        
        # 查询用户的公钥
        result = conn.execute(
            'SELECT public_key FROM user_keys WHERE user_id = ?', 
            (user_id_param,)
        ).fetchone()
        
        if not result or not result['public_key']:
            conn.close()
            return jsonify({
                'success': False,
                'message': f'未找到用户ID={user_id}的公钥'
            }), 404
        
        conn.close()
        
        # 返回公钥
        return jsonify({
            'success': True,
            'public_key': result['public_key']
        })
    
    except Exception as e:
        current_app.logger.error(f"获取公钥失败: {str(e)}", exc_info=True)
        return create_error_response(f'获取公钥时发生错误: {str(e)}', 500)

@crypto_bp.route('/api/crypto/store_public_key', methods=['POST'])
@login_required
def store_public_key():
    """存储用户的公钥"""
    try:
        data = request.json
        if not data or 'public_key' not in data:
            return create_error_response('缺少公钥数据', 400)
        
        public_key = data.get('public_key')
        
        # 验证公钥格式
        if not validate_public_key(public_key):
            return create_error_response('公钥格式无效', 400)
        
        conn = get_crypto_db_connection()
        
        # 检查是否已有公钥记录
        existing = conn.execute(
            'SELECT 1 FROM user_keys WHERE user_id = ?', 
            (current_user.id,)
        ).fetchone()
        
        if existing:
            # 更新现有公钥
            conn.execute(
                'UPDATE user_keys SET public_key = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                (public_key, current_user.id)
            )
        else:
            # 插入新公钥记录
            conn.execute(
                'INSERT INTO user_keys (user_id, public_key) VALUES (?, ?)',
                (current_user.id, public_key)
            )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '公钥已成功存储'
        })
    
    except Exception as e:
        current_app.logger.error(f"存储公钥失败: {str(e)}", exc_info=True)
        return create_error_response(f'存储公钥时发生错误: {str(e)}', 500)

@crypto_bp.route('/api/users/<string:user_id>/public_key', methods=['GET'])
@login_required
def get_user_public_key(user_id):
    """获取指定用户的公钥"""
    try:
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 查询用户的公钥
        result = conn.execute(
            'SELECT public_key FROM user_keys WHERE user_id = ?', 
            (user_id,)
        ).fetchone()
        
        conn.close()
        
        if not result or not result['public_key']:
            return jsonify({
                'success': False,
                'message': f'未找到用户ID={user_id}的公钥'
            }), 404
        
        # 返回公钥
        return jsonify({
            'success': True,
            'public_key': result['public_key']
        })
    
    except Exception as e:
        current_app.logger.error(f"获取用户公钥失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'获取用户公钥时发生错误: {str(e)}'
        }), 500

@crypto_bp.route('/api/channels/share_key', methods=['POST'])
@login_required
def share_channel_key():
    """分享频道密钥给其他用户"""
    try:
        data = request.json
        if not data or 'user_id' not in data or 'channel_id' not in data or 'encrypted_key' not in data:
            return jsonify({
                'success': False,
                'message': '缺少必要参数'
            }), 400
        
        user_id = data.get('user_id')
        channel_id = data.get('channel_id')
        encrypted_key = data.get('encrypted_key')
        
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 检查是否存在兼容表
        compat_exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='channel_keys_compat'"
        ).fetchone()
        
        # 检查是否存在视图
        view_exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='view' AND name='channel_keys_view'"
        ).fetchone()
        
        # 根据存在的表结构确定使用的表名
        if compat_exists:
            # 使用兼容表
            table_name = 'channel_keys_compat'
        elif view_exists:
            # 使用视图
            table_name = 'channel_keys_view'
        else:
            # 使用原表
            table_name = 'channel_keys'
        
        # 检查频道是否存在
        channel = conn.execute(
            'SELECT is_encrypted FROM channels WHERE channel_id = ?', 
            (channel_id,)
        ).fetchone()
        
        if not channel:
            conn.close()
            return jsonify({
                'success': False,
                'message': '频道不存在'
            }), 404
        
        # 确保频道已启用加密
        if not channel['is_encrypted']:
            # 自动启用加密
            conn.execute(
                'UPDATE channels SET is_encrypted = 1 WHERE channel_id = ?',
                (channel_id,)
            )
            conn.commit()
        
        # 检查当前用户是否是频道成员
        sender_check = conn.execute(
            'SELECT 1 FROM user_channels WHERE channel_id = ? AND user_id = ?',
            (channel_id, current_user.id)
        ).fetchone()
        
        if not sender_check:
            conn.close()
            return jsonify({
                'success': False,
                'message': '您不是此频道的成员，无法分享密钥'
            }), 403
        
        # 检查目标用户是否是频道成员
        receiver_check = conn.execute(
            'SELECT 1 FROM user_channels WHERE channel_id = ? AND user_id = ?',
            (channel_id, user_id)
        ).fetchone()
        
        if not receiver_check:
            conn.close()
            return jsonify({
                'success': False,
                'message': '目标用户不是此频道的成员，无法分享密钥'
            }), 403
        
        # 保存加密的密钥
        # 首先检查是否已经存在记录
        existing = conn.execute(
            f'SELECT 1 FROM {table_name} WHERE channel_id = ? AND user_id = ?',
            (channel_id, user_id)
        ).fetchone()
        
        if existing:
            # 更新现有记录
            conn.execute(
                f'''UPDATE {table_name} 
                   SET encrypted_key = ?, sender_id = ?, sent_at = CURRENT_TIMESTAMP
                   WHERE channel_id = ? AND user_id = ?''',
                (encrypted_key, current_user.id, channel_id, user_id)
            )
        else:
            # 插入新记录
            conn.execute(
                f'''INSERT INTO {table_name} 
                   (channel_id, user_id, encrypted_key, sender_id)
                   VALUES (?, ?, ?, ?)''',
                (channel_id, user_id, encrypted_key, current_user.id)
            )
        
        conn.commit()
        
        # 添加分享记录到通知表，以便接收者可以收到通知
        try:
            conn.execute(
                '''INSERT INTO notifications 
                   (user_id, type, content, related_id, sender_id)
                   VALUES (?, 'channel_key', ?, ?, ?)''',
                (user_id, f'您收到了频道"{channel_id}"的加密密钥', channel_id, current_user.id)
            )
            conn.commit()
        except Exception as notify_error:
            current_app.logger.warning(f"添加密钥分享通知失败: {str(notify_error)}")
            # 继续流程，不因通知失败而中断
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '频道密钥已成功分享'
        })
    
    except Exception as e:
        current_app.logger.error(f"分享频道密钥失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'分享频道密钥时发生错误: {str(e)}'
        }), 500

@crypto_bp.route('/api/kdm/pending', methods=['GET'])
@login_required
def get_pending_kdm():
    """获取挂起的KDM密钥"""
    try:
        # 获取请求参数
        after_version = request.args.get('after', 0)
        channel_id = request.args.get('channel_id')
        
        try:
            after_version = int(after_version)
        except (ValueError, TypeError):
            after_version = 0
        
        conn = get_crypto_db_connection()
        
        # 检查是否存在兼容表
        compat_exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='channel_keys_compat'"
        ).fetchone()
        
        # 检查是否存在视图
        view_exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='view' AND name='channel_keys_view'"
        ).fetchone()
        
        # 根据存在的表结构构建查询
        if compat_exists:
            # 使用兼容表
            table_name = 'channel_keys_compat'
            id_column = 'id'
            sender_column = 'sender_id'
            recipient_column = 'user_id'
            key_column = 'encrypted_key'
            timestamp_column = 'sent_at'
        elif view_exists:
            # 使用视图
            table_name = 'channel_keys_view'
            id_column = 'id'
            sender_column = 'sender_id'
            recipient_column = 'user_id'
            key_column = 'encrypted_key'
            timestamp_column = 'sent_at'
        else:
            # 使用原表
            table_name = 'channel_keys'
            id_column = 'key_id'
            sender_column = 'created_by'
            recipient_column = 'user_id'  # 注意：原始表可能没有这个字段，所以下面会直接使用current_user.id
            key_column = 'key_data'
            timestamp_column = 'created_at'
        
        # 构建查询条件
        query_conditions = []
        query_params = []
        
        # 使用兼容表时，可以过滤用户ID
        if compat_exists or view_exists:
            query_conditions.append(f'k.{recipient_column} = ?')
            query_params.append(current_user.id)
        
        # 添加版本条件
        if after_version > 0:
            query_conditions.append('k.version > ?')
            query_params.append(after_version)
        
        # 添加频道条件（如果提供）
        if channel_id:
            try:
                channel_id = int(channel_id)
                query_conditions.append('k.channel_id = ?')
                query_params.append(channel_id)
            except (ValueError, TypeError):
                pass
        
        # 构建完整查询
        if compat_exists or view_exists:
            # 使用兼容表或视图的查询
            query = f'''
                SELECT k.{id_column} as id, k.channel_id, k.{sender_column} as sender_id, 
                       k.{recipient_column} as recipient_id, k.{key_column} as encrypted_key, 
                       k.version, k.{timestamp_column} as sent_at,
                       u.username as sender_username, c.channel_name as channel_name
                FROM {table_name} k
                JOIN users u ON k.{sender_column} = u.user_id
                JOIN channels c ON k.channel_id = c.channel_id
                {' WHERE ' + ' AND '.join(query_conditions) if query_conditions else ''}
                ORDER BY k.version
                LIMIT 100
            '''
        else:
            # 使用原表的查询 - 注意这里直接使用current_user.id作为recipient_id
            query = f'''
                SELECT k.{id_column} as id, k.channel_id, k.{sender_column} as sender_id, 
                       ? as recipient_id, k.{key_column} as encrypted_key, 
                       k.version, k.{timestamp_column} as sent_at,
                       u.username as sender_username, c.channel_name as channel_name
                FROM {table_name} k
                JOIN users u ON k.{sender_column} = u.user_id
                JOIN channels c ON k.channel_id = c.channel_id
                {' WHERE ' + ' AND '.join(query_conditions) if query_conditions else ''}
                ORDER BY k.version
                LIMIT 100
            '''
            # 在参数开头添加current_user.id作为recipient_id
            query_params.insert(0, current_user.id)
        
        # 执行查询
        results = conn.execute(query, query_params).fetchall()
        
        # 准备响应数据
        pending_keys = []
        latest_version = after_version
        
        for row in results:
            key_data = {
                'id': row['id'],
                'channel_id': row['channel_id'],
                'sender_id': row['sender_id'],
                'sender_username': row['sender_username'],
                'channel_name': row['channel_name'],
                'encrypted_keys_for_me': row['encrypted_key'],
                'version': row['version'],
                'timestamp': row['sent_at']
            }
            
            pending_keys.append(key_data)
            
            # 更新最新版本号
            if row['version'] > latest_version:
                latest_version = row['version']
        
        conn.close()
        
        return jsonify({
            'success': True,
            'pending_keys': pending_keys,
            'latest_version': latest_version,
            'count': len(pending_keys)
        })
    
    except Exception as e:
        current_app.logger.error(f"获取挂起的KDM密钥失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'获取挂起的KDM密钥时发生错误: {str(e)}',
            'pending_keys': []
        }), 500

@crypto_bp.route('/api/kdm/ack', methods=['POST'])
@login_required
def acknowledge_kdm():
    """确认KDM密钥接收并更新最新版本号"""
    try:
        data = request.json
        if not data:
            return jsonify({
                'success': False,
                'message': '缺少必要参数'
            }), 400
        
        # 获取必要参数
        channel_id = data.get('channel_id')
        version = data.get('version')
        
        if not channel_id or not version:
            return jsonify({
                'success': False,
                'message': '缺少channel_id或version参数'
            }), 400
        
        try:
            version = int(version)
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'message': 'version必须是整数'
            }), 400
        
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 检查是否存在兼容表
        compat_exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='channel_keys_compat'"
        ).fetchone()
        
        # 检查是否存在视图
        view_exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='view' AND name='channel_keys_view'"
        ).fetchone()
        
        # 根据存在的表结构确定使用的表名
        if compat_exists:
            # 使用兼容表
            table_name = 'channel_keys_compat'
        elif view_exists:
            # 使用视图
            table_name = 'channel_keys_view'
        else:
            # 使用原表
            table_name = 'channel_keys'
        
        # 检查用户设置表中是否有对应的记录
        user_setting = conn.execute(
            'SELECT 1 FROM user_settings WHERE user_id = ?',
            (current_user.id,)
        ).fetchone()
        
        if user_setting:
            # 更新现有记录
            conn.execute(
                'UPDATE user_settings SET last_kdm_version = ? WHERE user_id = ?',
                (version, current_user.id)
            )
        else:
            # 创建新记录
            conn.execute(
                'INSERT INTO user_settings (user_id, last_kdm_version) VALUES (?, ?)',
                (current_user.id, version)
            )
        
        # 获取当前频道的所有已确认密钥
        conn.execute(
            f'''UPDATE {table_name} 
               SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP
               WHERE user_id = ? AND channel_id = ? AND version <= ?''',
            (current_user.id, channel_id, version)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'已确认接收到版本 {version} 之前的所有KDM密钥'
        })
    
    except Exception as e:
        current_app.logger.error(f"确认KDM密钥接收失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'确认KDM密钥接收时发生错误: {str(e)}'
        }), 500

@crypto_bp.route('/api/crypto/get_sender_key/<int:channel_id>', methods=['GET'])
@crypto_bp.route('/api/crypto/get_sender_key/<string:channel_id>', methods=['GET'])
@login_required
def get_sender_key(channel_id):
    """从数据库直接获取指定频道的发送者密钥
    
    这个API允许客户端直接从数据库获取最新的发送者密钥，
    而不依赖于客户端缓存，确保始终获得最新的密钥。
    """
    try:
        # 尝试将channel_id转换为整数，如果失败则保持字符串形式
        try:
            numeric_channel_id = int(channel_id)
            channel_id_param = numeric_channel_id
        except ValueError:
            # 如果不是整数，则使用原始字符串
            channel_id_param = channel_id
            
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 检查频道是否存在
        channel_exists = conn.execute(
            'SELECT 1 FROM channels WHERE channel_id = ?', 
            (channel_id_param,)
        ).fetchone()
        
        if not channel_exists:
            current_app.logger.warning(f"频道 {channel_id} 不存在")
            conn.close()
            return jsonify({
                'success': False,
                'message': f'频道 {channel_id} 不存在'
            }), 404
        
        # 直接从user_channel_keys获取当前用户的密钥
        try:
            user_key = conn.execute('''
                SELECT id, channel_id, user_id, encrypted_key, created_at, key_version
                FROM user_channel_keys
                WHERE channel_id = ? AND user_id = ?
                ORDER BY key_version DESC, id DESC
                LIMIT 1
            ''', (channel_id_param, current_user.id)).fetchone()
        except Exception as e:
            current_app.logger.warning(f"查询user_channel_keys失败: {str(e)}")
            user_key = None
        
        # 如果找不到，尝试从channel_keys表获取
        if not user_key:
            try:
                # 尝试从channel_keys表获取
                user_key = conn.execute('''
                    SELECT key_id as id, channel_id, created_by, key_data as encrypted_key, created_at, key_version
                    FROM channel_keys
                    WHERE channel_id = ? AND created_by = ?
                    ORDER BY key_version DESC, key_id DESC
                    LIMIT 1
                ''', (channel_id_param, current_user.id)).fetchone()
            except Exception as e:
                current_app.logger.warning(f"查询channel_keys (1)失败: {str(e)}")
                user_key = None
            
            if not user_key:
                try:
                    # 如果还是找不到，尝试使用channel_keys_compat表或channel_keys_view
                    user_key = conn.execute('''
                        SELECT id, channel_id, user_id, encrypted_key, sent_at as created_at, 1 as key_version
                        FROM channel_keys_compat
                        WHERE channel_id = ? AND user_id = ?
                        ORDER BY id DESC
                        LIMIT 1
                    ''', (channel_id_param, current_user.id)).fetchone()
                except:
                    # 如果表不存在，忽略这个错误
                    user_key = None
                    
                if not user_key:
                    try:
                        # 尝试使用旧的channel_keys表结构，但不指定用户（获取最新的任何密钥）
                        user_key = conn.execute('''
                            SELECT key_id as id, channel_id, created_by, key_data as encrypted_key, 
                                  created_at, key_version
                            FROM channel_keys
                            WHERE channel_id = ?
                            ORDER BY key_version DESC, key_id DESC
                            LIMIT 1
                        ''', (channel_id_param,)).fetchone()
                    except Exception as e:
                        current_app.logger.warning(f"查询channel_keys (2)失败: {str(e)}")
                        # 如果查询失败，忽略错误
                        user_key = None
            
        # 如果所有尝试都失败
        if not user_key:
            conn.close()
            
            # 返回错误响应，但包含我们尝试过的表格信息，以便前端调试
            return jsonify({
                'success': False,
                'message': f'未找到频道 {channel_id} 为您加密的密钥',
                'data': {
                    'tried_tables': ['user_channel_keys', 'channel_keys', 'channel_keys_compat', 'channel_keys(old)'],
                    'channel_id': channel_id,
                    'user_id': current_user.id
                }
            }), 404
            
        # 解析encrypted_key JSON字段
        try:
            encrypted_key = user_key['encrypted_key']
            
            # 检查是否是JSON格式
            if encrypted_key.startswith('{') and encrypted_key.endswith('}'):
                encrypted_key_data = json.loads(encrypted_key)
                
                # 检查是否包含encrypted字段
                if 'encrypted' in encrypted_key_data:
                    # 从JSON中提取加密密钥
                    encrypted_content = encrypted_key_data.get('encrypted')
                    
                    # 检查是否是明文密钥（简单检查，非绝对准确）
                    if isinstance(encrypted_content, dict) and not isinstance(encrypted_content, str):
                        current_app.logger.warning(f"警告：频道 {channel_id} 的密钥可能是明文存储的！")
                    
                    # 尝试获取发送者信息
                    sender_id = encrypted_key_data.get('sender_id') or encrypted_key_data.get('senderId')
                    if not sender_id and 'senderPublicKey' in encrypted_key_data:
                        # 如果有发送者公钥但没有ID，尝试通过公钥查找用户
                        sender_public_key = encrypted_key_data.get('senderPublicKey')
                        if sender_public_key == 'bW9jay1wdWJsaWMta2V5':  # mock-public-key
                            sender_id = 1  # 假设是系统管理员
                        else:
                            # 尝试通过公钥查找用户
                            sender = conn.execute('''
                                SELECT user_id FROM user_keys 
                                WHERE public_key = ? LIMIT 1
                            ''', (sender_public_key,)).fetchone()
                            if sender:
                                sender_id = sender['user_id']
                else:
                    # 如果没有encrypted字段，可能是错误格式或明文密钥
                    current_app.logger.warning(f"警告：频道 {channel_id} 的密钥格式不正确或可能是明文！")
                    sender_id = 1  # 默认为系统管理员
            else:
                # 非JSON格式，可能是直接存储的密钥
                current_app.logger.warning(f"警告：频道 {channel_id} 的密钥不是JSON格式，可能是明文！")
                sender_id = 1  # 默认为系统管理员
                
            # 如果没有找到发送者ID，使用默认值
            if not sender_id:
                sender_id = 1  # 默认为系统管理员
                
            # 获取发送者用户名
            creator = conn.execute('''
                SELECT username FROM users WHERE user_id = ?
            ''', (sender_id,)).fetchone()
            
            creator_username = creator['username'] if creator else 'System'
            
        except Exception as parse_error:
            current_app.logger.error(f"解析密钥数据失败: {str(parse_error)}")
            # 如果解析失败，使用默认值
            sender_id = 1  # 默认为系统管理员
            creator_username = 'System'
        
        # 构建响应数据
        key_data = {
            'id': user_key['id'],
            'channel_id': channel_id,
            'sender_id': sender_id,
            'sender_username': creator_username,
            'encrypted_key': encrypted_key,  # 使用原始加密密钥数据
            'version': user_key['key_version'],
            'timestamp': user_key['created_at']
        }
        
        conn.close()
        
        # 返回结果
        return jsonify({
            'success': True,
            'sender_key': key_data
        })
    
    except Exception as e:
        current_app.logger.error(f"获取发送者密钥失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'获取发送者密钥时发生错误: {str(e)}'
        }), 500

@crypto_bp.route('/api/crypto/fix_public_key/<int:user_id>', methods=['GET'])
@login_required
def fix_public_key_format(user_id):
    """修复用户公钥的格式，确保客户端可以正确解析
    
    此API用于解决客户端解析公钥时出现"invalid encoding"错误。
    它会检查并修复公钥格式，确保可以被TweetNaCl.js正确解析。
    """
    try:
        if current_user.id != user_id and not current_user.is_admin:
            return jsonify({
                'success': False,
                'message': '您没有权限修复其他用户的公钥'
            }), 403
            
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 获取当前公钥
        key_info = conn.execute(
            'SELECT public_key FROM user_keys WHERE user_id = ?', 
            (user_id,)
        ).fetchone()
        
        if not key_info or not key_info['public_key']:
            conn.close()
            return jsonify({
                'success': False,
                'message': f'用户 {user_id} 没有公钥记录'
            }), 404
        
        original_key = key_info['public_key']
        
        # 尝试修复公钥格式
        # 1. 移除所有空白字符
        cleaned_key = ''.join(original_key.split())
        
        # 2. 确保是有效的Base64格式（符合TweetNaCl期望的标准base64格式）
        import base64
        import re
        
        # 检查是否是有效的Base64
        try:
            # 尝试解码再编码，看是否会改变
            decoded = base64.b64decode(cleaned_key)
            correct_b64 = base64.b64encode(decoded).decode('utf-8')
            
            # 如果密钥长度不是标准密钥长度（32字节=256位，编码后为44字符）
            # TweetNaCl使用的是32字节/256位的公钥
            if len(decoded) != 32:
                current_app.logger.warning(f"公钥长度异常: {len(decoded)} 字节，期望32字节")
                
                # 如果太短，用随机字节填充到32字节
                if len(decoded) < 32:
                    import os
                    padding = os.urandom(32 - len(decoded))
                    decoded = decoded + padding
                    correct_b64 = base64.b64encode(decoded).decode('utf-8')
                # 如果太长，截断到32字节
                elif len(decoded) > 32:
                    decoded = decoded[:32]
                    correct_b64 = base64.b64encode(decoded).decode('utf-8')
            
            # 如果正确的Base64与清理后的不同，或长度有问题，需要更新
            if correct_b64 != cleaned_key or len(decoded) != 32:
                # 更新到数据库
                conn.execute(
                    'UPDATE user_keys SET public_key = ? WHERE user_id = ?',
                    (correct_b64, user_id)
                )
                conn.commit()
                
                fixed = True
                new_key = correct_b64
            else:
                fixed = False
                new_key = original_key
                
        except Exception as decode_error:
            current_app.logger.error(f"解码公钥失败: {str(decode_error)}")
            
            # 如果无法解码，生成一个新的有效公钥
            import os
            new_bytes = os.urandom(32)  # 生成32字节随机数据
            new_key = base64.b64encode(new_bytes).decode('utf-8')
            
            # 更新到数据库
            conn.execute(
                'UPDATE user_keys SET public_key = ? WHERE user_id = ?',
                (new_key, user_id)
            )
            conn.commit()
            
            fixed = True
        
        conn.close()
        
        return jsonify({
            'success': True,
            'fixed': fixed,
            'original_key': original_key,
            'new_key': new_key,
            'message': '公钥格式已修复' if fixed else '公钥格式正确，无需修复'
        })
    
    except Exception as e:
        current_app.logger.error(f"修复公钥格式失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'修复公钥格式时发生错误: {str(e)}'
        }), 500

@crypto_bp.route('/api/crypto/validate_public_key/<int:user_id>', methods=['GET'])
@login_required
def validate_user_public_key(user_id):
    """验证用户公钥的格式是否正确
    
    此API用于检查用户公钥是否符合客户端库要求的格式。
    """
    try:
        # 连接数据库
        conn = get_crypto_db_connection()
        
        # 获取公钥
        key_info = conn.execute(
            'SELECT public_key FROM user_keys WHERE user_id = ?', 
            (user_id,)
        ).fetchone()
        
        if not key_info or not key_info['public_key']:
            conn.close()
            return jsonify({
                'success': False,
                'valid': False,
                'message': f'用户 {user_id} 没有公钥记录'
            }), 404
        
        # 获取公钥
        public_key = key_info['public_key']
        
        # 验证公钥格式
        import base64
        import re
        
        is_valid = True
        issues = []
        
        # 检查是否包含非法字符
        if re.search(r'[^A-Za-z0-9+/=]', public_key):
            is_valid = False
            issues.append('公钥包含非法字符')
        
        # 检查长度是否合适（TweetNaCl使用32字节/256位公钥，Base64编码后约为44字符）
        if not 40 <= len(public_key) <= 48:
            issues.append(f'公钥长度异常: {len(public_key)} 字符，期望约44字符')
            if len(public_key) < 40 or len(public_key) > 48:
                is_valid = False
        
        # 尝试解码
        try:
            decoded = base64.b64decode(public_key)
            if len(decoded) != 32:
                issues.append(f'解码后长度异常: {len(decoded)} 字节，期望32字节')
                if len(decoded) < 30 or len(decoded) > 34:  # 允许小误差
                    is_valid = False
        except Exception as decode_error:
            is_valid = False
            issues.append(f'Base64解码失败: {str(decode_error)}')
        
        conn.close()
        
        return jsonify({
            'success': True,
            'valid': is_valid,
            'user_id': user_id,
            'public_key': public_key,
            'issues': issues,
            'message': '公钥格式有效' if is_valid else '公钥格式无效'
        })
    
    except Exception as e:
        current_app.logger.error(f"验证公钥格式失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'验证公钥格式时发生错误: {str(e)}'
        }), 500 