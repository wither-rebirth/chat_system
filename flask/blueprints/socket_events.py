@socketio.on('kdm_sync')
def handle_kdm_sync(data):
    """处理KDM同步请求"""
    try:
        if not current_user.is_authenticated:
            return
        
        # 获取请求中的版本号
        after_version = data.get('after', 0)
        try:
            after_version = int(after_version)
        except (ValueError, TypeError):
            after_version = 0
        
        # 连接数据库
        conn = get_db_connection()
        
        # 查询此用户是否有未收到的密钥
        query = '''
            SELECT k.id, k.channel_id, k.sender_id, k.user_id as recipient_id, 
                   k.encrypted_key, k.version, k.sent_at,
                   u.username as sender_username, c.name as channel_name
            FROM channel_keys k
            JOIN users u ON k.sender_id = u.user_id
            JOIN channels c ON k.channel_id = c.channel_id
            WHERE k.user_id = ? AND k.version > ? AND (k.acknowledged IS NULL OR k.acknowledged = 0)
            ORDER BY k.version
            LIMIT 50
        '''
        
        results = conn.execute(query, (current_user.id, after_version)).fetchall()
        
        # 如果有未接收的密钥，立即发送
        if results:
            for row in results:
                # 构建KDM更新数据
                kdm_data = {
                    'id': row['id'],
                    'channel_id': row['channel_id'],
                    'sender_id': row['sender_id'],
                    'sender_username': row['sender_username'],
                    'channel_name': row['channel_name'],
                    'encrypted_keys_for_me': row['encrypted_key'],
                    'version': row['version'],
                    'timestamp': row['sent_at']
                }
                
                # 发送KDM更新
                emit('kdm_update', kdm_data)
                
                # 记录日志
                print(f"已向用户 {current_user.id} 推送KDM更新，版本 {row['version']}")
        
        # 关闭数据库连接
        conn.close()
    
    except Exception as e:
        print(f"处理KDM同步请求时出错: {str(e)}")


@socketio.on('connect')
def handle_connect():
    """客户端连接时的处理"""
    if current_user.is_authenticated:
        # 现有代码...
        
        # 添加KDM同步处理
        try:
            # 连接数据库
            conn = get_db_connection()
            
            # 获取用户最后同步的KDM版本
            user_setting = conn.execute(
                'SELECT last_kdm_version FROM user_settings WHERE user_id = ?',
                (current_user.id,)
            ).fetchone()
            
            last_version = 0
            if user_setting and 'last_kdm_version' in user_setting.keys():
                last_version = user_setting['last_kdm_version']
            
            # 查询用户是否有新的未确认密钥
            query = '''
                SELECT COUNT(1) as pending_count 
                FROM channel_keys 
                WHERE user_id = ? AND version > ? AND (acknowledged IS NULL OR acknowledged = 0)
            '''
            
            result = conn.execute(query, (current_user.id, last_version)).fetchone()
            pending_count = result['pending_count'] if result else 0
            
            # 如果有未同步的密钥，通知客户端
            if pending_count > 0:
                # 发送KDM同步请求
                emit('kdm_sync_request', {
                    'last_version_seen': last_version,
                    'pending_count': pending_count
                })
                
                print(f"用户 {current_user.id} 连接时有 {pending_count} 个未同步的KDM密钥")
            
            conn.close()
        except Exception as e:
            print(f"连接时检查KDM同步状态失败: {str(e)}")
            
    # 其他现有代码... 