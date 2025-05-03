# Secure Chat System

A real-time encrypted chat application built with Flask, Socket.IO, and SQLite, supporting end-to-end encryption for private messages.

## Features

- **User Authentication**: Secure login and registration system
- **Chat Rooms**: Public and private chat rooms with multiple channels
- **Real-time Messaging**: Instant message delivery using WebSockets
- **End-to-End Encryption**: Secure private messaging with E2EE
- **File Sharing**: Upload and share files within channels
- **Role-Based Access Control**: Different permissions for owners, admins, and members
- **Resource Management**: Share links and documents with team members

## System Requirements

- Python 3.8+
- pip (Python package manager)
- Modern web browser with WebSocket support

## Project Structure

```
/
├── flask/                  # Main application directory
│   ├── app.py              # Application initialization
│   ├── wsgi.py             # WSGI entry point
│   ├── run_app.py          # Development server script
│   ├── config.py           # Configuration settings
│   ├── init_db.py          # Database initialization script
│   ├── schema.sql          # Database schema
│   ├── socket_events.py    # WebSocket event handlers
│   ├── blueprints/         # Flask blueprints (routes)
│   ├── models/             # Data models
│   ├── templates/          # HTML templates
│   ├── static/             # Static files (CSS, JS, images)
│   └── utils/              # Utility functions
├── venv/                   # Python virtual environment
└── requirements.txt        # Python dependencies
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/secure-chat-system.git
   cd secure-chat-system
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Initialize the database:
   ```
   cd flask
   python init_db.py
   ```

## Running the Application

### Development Mode

Run the application in development mode:

```
cd flask
python run_app.py
```

The application will be available at http://localhost:5000

### Production Mode

For production deployment:

1. Set environment variables:
   ```
   export FLASK_ENV=production
   export FLASK_APP=wsgi.py
   ```

2. Use a production WSGI server like Gunicorn:
   ```
   gunicorn --worker-class eventlet -w 1 wsgi:app
   ```

3. Set up SSL certificates for HTTPS (recommended for production)

## Default Users

After initialization, the following test accounts are available:

| Username | Password    | Role  |
|----------|-------------|-------|
| admin    | admin123    | Admin |
| alice    | password123 | User  |
| bob      | password456 | User  |
| charlie  | password789 | User  |

## Security Features

- Password hashing with Werkzeug
- CSRF protection
- End-to-end encryption for private messages
- Public key infrastructure for secure key exchange
- Session management and protection
- HTTPS support in production

## Environment Variables

Configure the application using the following environment variables:

- `FLASK_ENV`: Application environment (development/production)
- `SECRET_KEY`: Flask secret key for session encryption
- `PORT`: Server port (default: 5000)
- `SSL_CERT_PATH`: Path to SSL certificate file
- `SSL_KEY_PATH`: Path to SSL key file

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

# 频道加密密钥管理

本文档说明如何使用频道加密系统的密钥管理功能，特别是如何处理密钥轮换和密钥共享。

## 密钥管理概述

系统使用了以下密钥管理策略：

1. **sender_key 存储时机**：
   - 用户首次在加密频道发言时
   - 频道成员变更（加人、踢人、退群）引起密钥轮换时

2. **密钥存储格式**：
   - 每个用户使用自己的公钥加密相同的 sender_key
   - 使用不同的公钥可以确保只有拥有相应私钥的用户才能解密密钥

## 前端密钥轮换处理

当需要进行密钥轮换时（例如用户被移出频道），前端需要监听并处理 `key_rotation_needed` 事件：

```javascript
// 监听密钥轮换事件
socket.on('key_rotation_needed', async function(data) {
  if (data.channel_id) {
    console.log(`需要轮换频道 ${data.channel_id} 的密钥，版本 ${data.new_version}，原因: ${data.reason}`);
    
    // 1. 生成新的 sender_key (对称密钥)
    const newSenderKey = await crypto.generateChannelKey();
    
    // 2. 获取需要分发新密钥的所有成员列表
    const members = data.members || [];
    
    // 3. 为每个成员使用其公钥加密新的 sender_key
    for (const member of members) {
      try {
        // 获取成员公钥
        const response = await fetch(`/api/users/${member.id}/public_key`);
        const keyData = await response.json();
        
        if (!keyData.success || !keyData.public_key) {
          console.error(`无法获取用户 ${member.id} 的公钥`);
          continue;
        }
        
        // 使用公钥加密 sender_key
        const publicKey = keyData.public_key;
        const encryptedKey = await crypto.encryptWithPublicKey(newSenderKey, publicKey);
        
        // 调用 API 分发加密的密钥
        await fetch('/api/channels/share_key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: member.id,
            channel_id: data.channel_id,
            encrypted_key: encryptedKey,
            is_key_rotation: true,  // 重要: 标记这是密钥轮换
            key_version: data.new_version
          })
        });
        
        console.log(`已为用户 ${member.id} 分发新密钥`);
      } catch (error) {
        console.error(`为用户 ${member.id} 分发密钥失败:`, error);
      }
    }
    
    // 4. 更新本地存储的频道密钥
    await storeChannelKey(data.channel_id, newSenderKey, data.new_version);
    
    console.log(`频道 ${data.channel_id} 密钥轮换完成，新版本: ${data.new_version}`);
  }
});
```

## 接收密钥处理

当用户接收到新密钥时，前端需要监听 `channel_key_share` 事件并处理：

```javascript
// 监听密钥共享事件
socket.on('channel_key_share', async function(data) {
  try {
    console.log(`收到频道 ${data.channel_id} 的密钥共享`);
    
    // 1. 使用私钥解密 sender_key
    const encryptedKey = data.encrypted_key;
    const senderKey = await crypto.decryptWithPrivateKey(encryptedKey, myPrivateKey);
    
    // 2. 保存解密后的 sender_key
    await storeChannelKey(data.channel_id, senderKey, data.key_version);
    
    // 3. 通知用户密钥已更新
    if (data.is_key_rotation) {
      console.log(`频道 ${data.channel_id} 的密钥已轮换，版本 ${data.key_version}`);
      showNotification('频道密钥已更新', '由于安全原因，频道密钥已被轮换。你可以继续安全地发送消息。');
    } else {
      console.log(`首次收到频道 ${data.channel_id} 的密钥，版本 ${data.key_version}`);
    }
  } catch (error) {
    console.error('处理密钥共享失败:', error);
  }
});
```

## 密钥请求处理

当用户需要请求频道密钥时：

```javascript
// 请求频道密钥
async function requestChannelKey(channelId) {
  try {
    const response = await fetch(`/api/channels/${channelId}/request_key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      console.log(`已请求频道 ${channelId} 的密钥，请求ID: ${data.request_id}`);
      showNotification('密钥请求已发送', '请等待管理员批准您的密钥请求。');
    } else {
      console.error('请求密钥失败:', data.message);
    }
  } catch (error) {
    console.error('发送密钥请求时出错:', error);
  }
}
```

## 管理员处理密钥请求

当管理员收到密钥请求时：

```javascript
// 监听密钥请求事件
socket.on('channel_key_request', async function(data) {
  console.log(`用户 ${data.requester_username} 请求频道 ${data.channel_id} 的密钥`);
  
  // 向管理员显示请求通知
  showKeyRequestNotification(data);
});

// 处理密钥请求批准
async function approveKeyRequest(requestData) {
  try {
    // 1. 获取请求者的公钥
    const response = await fetch(`/api/users/${requestData.requester_id}/public_key`);
    const keyData = await response.json();
    
    if (!keyData.success || !keyData.public_key) {
      console.error(`无法获取用户 ${requestData.requester_id} 的公钥`);
      return;
    }
    
    // 2. 获取当前频道密钥
    const channelKey = await getChannelKey(requestData.channel_id);
    
    // 3. 使用请求者的公钥加密频道密钥
    const encryptedKey = await crypto.encryptWithPublicKey(channelKey, keyData.public_key);
    
    // 4. 分享加密的密钥
    await fetch('/api/channels/share_key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: requestData.requester_id,
        channel_id: requestData.channel_id,
        encrypted_key: encryptedKey,
        is_key_rotation: false  // 这不是密钥轮换，而是新用户请求
      })
    });
    
    console.log(`已与用户 ${requestData.requester_username} 共享频道 ${requestData.channel_id} 的密钥`);
  } catch (error) {
    console.error('批准密钥请求时出错:', error);
  }
}
```

## 重要注意事项

1. **密钥版本管理**：系统使用密钥版本来跟踪当前活跃的密钥。密钥轮换时，版本号会递增。

2. **公钥加密**：每个用户的密钥都是使用其个人公钥加密的，确保只有该用户可以解密。

3. **密钥共享安全**：所有密钥共享操作都应通过安全的HTTPS连接进行。

4. **首次发言处理**：当用户首次在频道发言时，系统会检查是否需要保存其密钥。

5. **轮换标记**：在密钥轮换情况下，前端必须设置 `is_key_rotation: true` 参数，以便后端正确处理。
