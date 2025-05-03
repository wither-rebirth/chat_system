from flask import Blueprint, render_template, request, redirect, url_for, flash, session, g, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import re
import bcrypt

from utils.db import get_db_connection
from utils.crypto import validate_public_key
from models.user import User

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# Route: Login
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login requests"""
    # Check current login status
    if current_user.is_authenticated:
        print(f"User already logged in: {current_user}")
        return redirect(url_for('chat.index'))
    
    error = None
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        remember = 'remember' in request.form
        
        print(f"Login attempt: username={username}, remember={remember}")
        
        # Validate form data
        if not username or not password:
            error = 'Username and password are required'
            flash(error)
            return render_template('login.html')
        
        # Find user
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ? OR email = ?', 
                           (username, username)).fetchone()
        
        if user:
            user_id = user['user_id']
            print(f"User found: id={user_id}, username={user['username']}")
            
            # Verify password using bcrypt
            if bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                print(f"Password verification passed")
                
                # Create user object
                user_obj = User(
                    id=user_id,
                    username=user['username'],
                    email=user['email'],
                    password_hash=user['password_hash'],
                    is_active=True,  # Ensure user status is active
                    avatar_url=user['avatar_url'],
                    public_key=user['public_key'] if 'public_key' in user else None,
                    key_updated_at=user['key_updated_at'] if 'key_updated_at' in user else None
                )
                
                # Update user online status
                conn.execute('UPDATE users SET is_active = 1, last_login = ? WHERE user_id = ?', 
                           (datetime.now().strftime('%Y-%m-%d %H:%M:%S'), user_id))
                conn.commit()
                
                # Clear any existing session data before login
                session.clear()
                
                # Login user
                print(f"Calling login_user function: user_id={user_id}, remember={remember}")
                login_success = login_user(user_obj, remember=remember)
                
                # Add user session data
                session['user_id'] = user_id
                session['username'] = user['username']
                
                # Check redirect target
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)
                else:
                    return redirect(url_for('chat.index'))
            else:
                error = 'Incorrect password'
                print(f"Password verification failed: {error}")
        else:
            error = 'User does not exist'
            print(f"Login failed: {error}")
        
        conn.close()
        flash(error)
        
    return render_template('login.html')

# Password validation function
def validate_password(password):
    """
    Validate password strength
    Password should be at least 8 characters, contain uppercase and lowercase letters,
    numbers, and special characters
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    # Check password complexity
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit = bool(re.search(r'\d', password))
    has_special = bool(re.search(r'[^A-Za-z0-9]', password))
    
    if not (has_upper and has_lower and has_digit and has_special):
        return False, "Password must contain uppercase and lowercase letters, numbers, and special characters"
    
    return True, ""

# Username validation function
def validate_username(username):
    """
    Validate username format
    Username should be 3-20 characters, only letters, numbers, and underscores allowed
    """
    if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
        return False, "Username should be 3-20 characters, only letters, numbers, and underscores allowed"
    return True, ""

# Route: Register
@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        errors = []
        
        # Validate form data
        if not username or not email or not password or not confirm_password:
            errors.append('All fields are required')
            
        if password != confirm_password:
            errors.append('Passwords do not match')
        
        # Validate username
        is_valid_username, username_error = validate_username(username)
        if not is_valid_username:
            errors.append(username_error)
            
        # Validate password strength
        is_valid_password, password_error = validate_password(password)
        if not is_valid_password:
            errors.append(password_error)
            
        # Validate email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            errors.append('Please enter a valid email address')
        
        # If there are errors, display them and return to registration page
        if errors:
            for error in errors:
                flash(error)
            return render_template('register.html')
        
        conn = get_db_connection()
        
        # Check if username already exists
        if conn.execute('SELECT 1 FROM users WHERE username = ?', (username,)).fetchone():
            conn.close()
            flash('Username already exists')
            return render_template('register.html')
        
        # Check if email already exists
        if conn.execute('SELECT 1 FROM users WHERE email = ?', (email,)).fetchone():
            conn.close()
            flash('Email already registered')
            return render_template('register.html')
        
        # Create new user - using bcrypt with salt for password hashing
        # 生成随机盐值并对密码进行哈希
        salt = bcrypt.gensalt(rounds=12)  # 推荐使用12轮加密，提供足够的安全性
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        conn.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                    (username, email, password_hash))
        conn.commit()
        
        # Get newly created user ID
        user_id = conn.execute('SELECT user_id FROM users WHERE username = ?', (username,)).fetchone()['user_id']
        
        # 为新用户生成密钥并存储
        try:
            import base64
            import os
            # 生成一个随机公钥（在真实场景中应该用TweetNaCl库在客户端生成）
            mock_public_key = base64.b64encode(os.urandom(32)).decode('utf-8')
            
            # 检查user_keys表是否存在
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_keys'")
            table_exists = cursor.fetchone()
            
            if table_exists:
                # 将公钥保存到user_keys表
                conn.execute(
                    "INSERT INTO user_keys (user_id, public_key) VALUES (?, ?)",
                    (user_id, mock_public_key)
                )
                conn.commit()
                print(f"已为新用户 {username} (ID={user_id}) 创建加密密钥")
        except Exception as e:
            print(f"为新用户创建密钥时出错: {str(e)}")
        
        # Add user to public chat room
        default_room = conn.execute('SELECT room_id FROM rooms WHERE room_name = ?', ('Public Chat Room',)).fetchone()
        
        if default_room:
            default_room_id = default_room['room_id']
            conn.execute('INSERT INTO user_rooms (user_id, room_id, role) VALUES (?, ?, ?)',
                       (user_id, default_room_id, 'member'))
            
            # Add user to all public channels in the default chat room
            public_channels = conn.execute(
                'SELECT channel_id FROM channels WHERE room_id = ? AND is_private = 0',
                (default_room_id,)
            ).fetchall()
            
            for channel in public_channels:
                conn.execute('INSERT INTO user_channels (user_id, channel_id) VALUES (?, ?)',
                           (user_id, channel['channel_id']))
            
            conn.commit()
            
        conn.close()
        
        flash('Registration successful, please login')
        return redirect(url_for('auth.login'))
        
    return render_template('register.html')

# Route: Logout
@auth_bp.route('/logout')
@login_required
def logout():
    """Simplified user logout handling"""
    # Get current user info for logging
    username = current_user.username if current_user.is_authenticated else 'Unknown'
    user_id = current_user.id if current_user.is_authenticated else None
    
    # Print log
    print(f"User logout: id={user_id}, username={username}")
    
    # Update user status in database
    if user_id:
        try:
            conn = get_db_connection()
            conn.execute('UPDATE users SET is_active = 0 WHERE user_id = ?', (user_id,))
            conn.commit()
            conn.close()
            print(f"Updated user status: offline")
        except Exception as e:
            print(f"Failed to update user status: {str(e)}")
    
    # Use Flask-Login's logout_user function
    logout_user()
    
    # Clear session data
    session.clear()
    
    # Log the event
    print(f"User {username} has logged out")
    
    # Redirect to homepage
    flash('You have been successfully logged out')
    return redirect(url_for('main.index', logged_out=True))

# Route: Forgot password
@auth_bp.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'GET':
        return render_template('forgot-password.html')
    
    if request.method == 'POST':
        email = request.form.get('email')
        
        # Check if email exists
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()
        
        if user:
            # In a real application, this would generate a unique reset token, save it to the database
            # and send an email with the reset link
            # Since this is a demo, we only redirect to a page with success parameter
            return redirect(url_for('auth.forgot_password', success=True))
        else:
            # Return success even if user doesn't exist to prevent enumeration attacks
            return redirect(url_for('auth.forgot_password', success=True))

# Route: Reset password
@auth_bp.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    # In a real application, this would validate the token and allow the user to set a new password
    # Since this is a demo, we just provide a simple form
    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Passwords do not match')
            return render_template('reset-password.html', token=token)
        
        # This should find the user associated with the token and update their password
        # Since this is a demo, we just display a success message
        flash('Password has been reset successfully, please login')
        return redirect(url_for('auth.login'))
    
    return render_template('reset-password.html', token=token)

# User load function for Flask-Login
def load_user(user_id):
    """Load user object based on user ID
    
    Args:
        user_id: User ID (string)
        
    Returns:
        User: User object, or None if user doesn't exist
    """
    try:
        # Ensure user_id is an integer
        user_id = int(user_id)
        
        # Load user data from database
        conn = get_db_connection()
        user_data = conn.execute('SELECT * FROM users WHERE user_id = ?', (user_id,)).fetchone()
        conn.close()
        
        if user_data:
            # Create and return user object
            return User(
                id=user_data['user_id'],
                username=user_data['username'],
                email=user_data['email'],
                password_hash=user_data['password_hash'],
                is_active=user_data['is_active'],
                avatar_url=user_data['avatar_url'],
                public_key=user_data['public_key'] if 'public_key' in user_data else None,
                key_updated_at=user_data['key_updated_at'] if 'key_updated_at' in user_data else None
            )
    except Exception as e:
        print(f"Error loading user: {e}")
    
    return None

# Route: Upload user E2EE public key
@auth_bp.route('/api/user/upload_pubkey', methods=['POST'])
@login_required
def upload_pubkey():
    """
    Upload user's end-to-end encryption public key
    Public key should be generated by the client, with private key kept locally on client
    """
    try:
        data = request.json
        if not data or 'public_key' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing public key data'
            }), 400
        
        public_key = data['public_key']
        
        # Validate public key format
        if not validate_public_key(public_key):
            return jsonify({
                'success': False,
                'message': 'Invalid public key format'
            }), 400
        
        # Update user's public key in the database
        conn = get_db_connection()
        conn.execute(
            'UPDATE users SET public_key = ?, key_updated_at = ? WHERE user_id = ?',
            (public_key, datetime.now().isoformat(), current_user.id)
        )
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Public key updated successfully',
            'public_key': public_key,
            'updated_at': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error updating public key: {str(e)}'
        }), 500

# Route: Get user's E2EE public key
@auth_bp.route('/api/user/<int:user_id>/pubkey', methods=['GET'])
@login_required
def get_user_pubkey(user_id):
    """
    Get specified user's public key
    Used to establish end-to-end encrypted sessions
    """
    try:
        conn = get_db_connection()
        user = conn.execute(
            'SELECT user_id, username, public_key, key_updated_at FROM users WHERE user_id = ?',
            (user_id,)
        ).fetchone()
        conn.close()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User does not exist'
            }), 404
        
        if not user['public_key']:
            return jsonify({
                'success': False,
                'message': 'This user has not set up E2EE keys yet'
            }), 404
        
        return jsonify({
            'success': True,
            'user_id': user['user_id'],
            'username': user['username'],
            'public_key': user['public_key'],
            'key_updated_at': user['key_updated_at']
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error retrieving public key: {str(e)}'
        }), 500

# 兼容前端API: 获取用户公钥
@auth_bp.route('/api/user/get_public_key/<string:user_id>', methods=['GET'])
@login_required
def get_public_key_compat(user_id):
    """
    兼容前端请求的获取用户公钥API
    支持字符串格式的用户ID
    """
    try:
        # 连接数据库
        conn = get_db_connection()
        
        # 尝试将user_id转换为整数（向后兼容）
        try:
            numeric_user_id = int(user_id)
            user_id_param = numeric_user_id
        except ValueError:
            # 如果不是整数，则使用原始字符串
            user_id_param = user_id
        
        # 查询用户的公钥
        result = conn.execute(
            'SELECT public_key FROM users WHERE user_id = ?', 
            (user_id_param,)
        ).fetchone()
        
        if not result or not result['public_key']:
            # 尝试从user_keys表中查询
            result = conn.execute(
                'SELECT public_key FROM user_keys WHERE user_id = ?', 
                (user_id_param,)
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
        current_app.logger.error(f"获取公钥失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'获取公钥时发生错误: {str(e)}'
        }), 500 