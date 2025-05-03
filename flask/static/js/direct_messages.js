/**
 * Private chat message management module
 * Supports normal messages and end-to-end encrypted messages
 */

// 跟踪TweetNaCl.js库的加载状态
let tweetNaClLoaded = false;

/**
 * 检查TweetNaCl.js库是否已加载
 * @returns {boolean} 库是否已加载
 */
function checkTweetNaClLoaded() {
    // 通过检查nacl对象是否存在来判断库是否已加载
    return typeof nacl !== 'undefined';
}

/**
 * 加载TweetNaCl.js库
 */
function loadTweetNaCl() {
    return new Promise((resolve, reject) => {
        if (checkTweetNaClLoaded()) {
            tweetNaClLoaded = true;
            resolve(true);
            return;
        }
        
        // 直接加载本地版本
        const localScript = document.createElement('script');
        localScript.src = '/static/js/lib/tweetnacl.min.js';
        
        localScript.onload = function() {
            console.log('TweetNaCl.js库从本地加载成功!');
            tweetNaClLoaded = true;
            
            // 尝试初始化加密管理器
            if (typeof cryptoManager !== 'undefined') {
                console.log('初始化加密管理器...');
                cryptoManager.init()
                    .then(result => {
                        console.log(`加密管理器初始化${result ? '成功' : '失败'}`);
                        
                        // 触发自定义事件通知其他模块库已加载
                        const event = new CustomEvent('tweetNaClLoaded');
                        document.dispatchEvent(event);
                        
                        resolve(true);
                    })
                    .catch(error => {
                        console.error('初始化加密管理器时出错:', error);
                        resolve(false);
                    });
            } else {
                console.warn('加密管理器不可用，无法初始化');
                
                // 仍然触发库加载事件
                const event = new CustomEvent('tweetNaClLoaded');
                document.dispatchEvent(event);
                
                resolve(true);
            }
        };
        
        localScript.onerror = function() {
            console.error('TweetNaCl.js库从本地加载失败，无法使用加密功能');
            // 使用降级方案
            if (typeof window.initTweetNaClFallback === 'function') {
                console.log('使用TweetNaCl降级方案');
                window.initTweetNaClFallback();
                tweetNaClLoaded = true;
                resolve(true);
            } else {
                reject(new Error('无法加载TweetNaCl库'));
            }
        };
        
        document.head.appendChild(localScript);
    });
}

// 当文档加载完成时检查并加载TweetNaCl.js库
document.addEventListener('DOMContentLoaded', function() {
    console.log('检查TweetNaCl.js库是否已加载...');
    
    // 检查库是否已加载
    if (checkTweetNaClLoaded()) {
        console.log('TweetNaCl.js库已加载');
    } else {
        console.log('TweetNaCl.js库未加载，尝试加载...');
        loadTweetNaCl().catch(error => {
            console.error('无法加载TweetNaCl.js库:', error);
            // 如果有降级方案，应用它
            if (typeof window.initTweetNaClFallback === 'function') {
                window.initTweetNaClFallback();
            }
        });
    }
    
    // 加载完成后，确保encryptForSelf方法存在
    if (typeof cryptoManager !== 'undefined') {
        ensureEncryptForSelfMethod();
    } else {
        // 如果cryptoManager还没有加载，等待它加载
        document.addEventListener('cryptoManagerInitialized', function() {
            ensureEncryptForSelfMethod();
        });
    }
});

// Store user information for the current chat
let currentChatUser = null;
// Caches the obtained user public key
const userPublicKeys = {};
// Tag whether the private chat window is closing
let isClosingDM = false;

/**
 * 为加密管理器添加解密自己消息的方法
 */
function ensureDecryptSelfMessageMethod() {
    // 确保cryptoManager已初始化
    if (typeof cryptoManager === 'undefined' || !cryptoManager) {
        console.error('加密管理器不可用');
        return false;
    }
    
    // 如果已经有decryptSelfMessage方法，不需要添加
    if (typeof cryptoManager.decryptSelfMessage === 'function') {
        return true;
    }
    
    // 添加decryptSelfMessage方法，使用当前用户ID作为发送者
    cryptoManager.decryptSelfMessage = async function(encryptedContent, iv) {
        try {
            // 使用decryptMessage方法，但是将发送者设为自己
            return await this.decryptMessage(encryptedContent, iv, currentUser.id);
        } catch (error) {
            console.error('解密自己的消息失败:', error);
            return null;
        }
    };
    
    return typeof cryptoManager.decryptSelfMessage === 'function';
}

// 初始化时确保所有必要的加密方法都存在
function ensureCryptoMethods() {
    // 确保为自己加密的方法存在
    const selfEncryptMethodAdded = ensureEncryptForSelfMethod();
    debugLog('为自己加密方法添加状态:', selfEncryptMethodAdded ? '成功' : '失败');
    
    // 确保解密自己消息的方法存在
    const selfDecryptMethodAdded = ensureDecryptSelfMessageMethod();
    debugLog('解密自己消息方法添加状态:', selfDecryptMethodAdded ? '成功' : '失败');
    
    return selfEncryptMethodAdded && selfDecryptMethodAdded;
}

// 更新文档加载时的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 添加消息提示音
    if (!document.getElementById('message-sound')) {
        const messageSound = document.createElement('audio');
        messageSound.id = 'message-sound';
        messageSound.src = '/static/sounds/message.mp3';
        messageSound.preload = 'auto';
        document.body.appendChild(messageSound);
    }
    
    // Initialize private chat ui element
    setupDirectMessageListeners();
    
    // Listen to socket.io events
    listenForDirectMessages();
    
    // Ensure that the direct message user items in the sidebar have relative positioning properties
    const directMessageUsers = document.querySelectorAll('.channel-item[data-user-id]');
    directMessageUsers.forEach(item => {
        item.style.position = 'relative';
    });
    
    // Add private chat style
    addDirectMessageStyles();
    
    // 监听网络状态变化
    window.addEventListener('online', handleNetworkStatusChange);
    window.addEventListener('offline', handleNetworkStatusChange);
    
    // 确保加密方法已添加
    if (typeof cryptoManager !== 'undefined') {
        ensureCryptoMethods();
    } else {
        // 如果cryptoManager还没有加载，等待它加载
        document.addEventListener('cryptoManagerInitialized', function() {
            ensureCryptoMethods();
        });
    }
    
    // 如果存在离线加密API并且网络已连接，尝试同步离线消息
    if (window.offlineCryptoAPI && navigator.onLine) {
        window.offlineCryptoAPI.syncWithServer();
    }
    
    // 监听网络状态变化，自动同步离线消息
    window.addEventListener('online', function() {
        console.log('网络连接已恢复');
        if (window.offlineCryptoAPI) {
            window.offlineCryptoAPI.syncWithServer();
        }
    });
    
    // 添加一个CSS样式用于离线消息
    const style = document.createElement('style');
    style.textContent = `
        .offline-message {
            opacity: 0.8;
        }
        .offline-indicator {
            display: inline-block;
            font-size: 0.7em;
            color: #ff9800;
            margin-left: 5px;
            vertical-align: middle;
        }
    `;
    document.head.appendChild(style);
    
    // 检查是否支持离线API
    if (!window.offlineCryptoAPI) {
        // 初始化离线API
        window.offlineCryptoAPI = {
            storeOfflineMessage: function(message) {
                try {
                    const offlineMessages = JSON.parse(localStorage.getItem('offline_messages') || '[]');
                    message.id = Date.now(); // 为消息添加唯一ID
                    offlineMessages.push(message);
                    localStorage.setItem('offline_messages', JSON.stringify(offlineMessages));
                    return true;
                } catch (error) {
                    console.error('存储离线消息失败:', error);
                    return false;
                }
            },
            getOfflineMessages: function() {
                try {
                    return JSON.parse(localStorage.getItem('offline_messages') || '[]');
                } catch (error) {
                    console.error('获取离线消息失败:', error);
                    return [];
                }
            },
            removeOfflineMessage: function(messageId) {
                try {
                    const offlineMessages = JSON.parse(localStorage.getItem('offline_messages') || '[]');
                    const updatedMessages = offlineMessages.filter(msg => msg.id !== messageId);
                    localStorage.setItem('offline_messages', JSON.stringify(updatedMessages));
                    return true;
                } catch (error) {
                    console.error('删除离线消息失败:', error);
                    return false;
                }
            },
            storePublicKey: function(userId, publicKey) {
                try {
                    const publicKeys = JSON.parse(localStorage.getItem('publicKeys') || '{}');
                    publicKeys[userId] = publicKey;
                    localStorage.setItem('publicKeys', JSON.stringify(publicKeys));
                    return true;
                } catch (error) {
                    console.error('存储用户公钥失败:', error);
                    return false;
                }
            },
            getPublicKey: function(userId) {
                try {
                    const publicKeys = JSON.parse(localStorage.getItem('publicKeys') || '{}');
                    return publicKeys[userId];
                } catch (error) {
                    console.error('获取用户公钥失败:', error);
                    return null;
                }
            }
        };
    }
    
    // 当网络恢复时同步离线消息
    window.addEventListener('online', function() {
        console.log('网络已恢复连接，开始同步离线消息');
        syncOfflineMessages();
    });
    
    // 页面加载时也尝试同步
    if (navigator.onLine) {
        syncOfflineMessages();
    }
});

/**
 * Set up event listeners related to private chat
 */
function setupDirectMessageListeners() {
    console.log('设置Direct Message事件监听器');
    
    // Find all private chat user items and output them for debugging
    const directMessageUserItems = document.querySelectorAll('.channel-item[data-user-id]');
    console.log(`找到 ${directMessageUserItems.length} 个Direct Message用户项`);
    
    // Add a click event individually for each private chat user item to ensure it is triggered
    directMessageUserItems.forEach(item => {
        // Get data attributes directly through getAttribute to avoid possible problems using dataset API
        const userId = item.getAttribute('data-user-id');
        console.log(`为用户ID=${userId}的Direct Message项添加点击事件`);
        
        // Remove possible click events before (prevent duplication)
        item.removeEventListener('click', directMessageUserClickHandler);
        
        // Pass the user id using the bind method to ensure that the correct id can be obtained in the processing function
        item.addEventListener('click', function(e) {
            directMessageUserClickHandler.call(this, e, userId);
        });
    });
    
    // Listen to send message form submission
    const dmForm = document.getElementById('dm-form');
    if (dmForm) {
        dmForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendDirectMessage(currentChatUser.id);
        });
    }
    
    // Make sure the Close button event is correctly bound to the window object
    window.closeDirectMessageChat = closeDirectMessageChat;
}

/**
 * Add private chat style
 */
function addDirectMessageStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .direct-message-container {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 420px;
            height: 560px;
            background-color: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            display: flex !important;
            flex-direction: column;
            z-index: 1000;
            transition: all 0.2s ease;
            overflow: hidden;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 0, 0, 0.08);
        }
        
        /* 离线状态样式 */
        .direct-message-container.offline {
            border: 1px solid rgba(255, 0, 0, 0.3);
        }
        
        /* 网络状态指示器 */
        .network-status {
            position: absolute;
            top: 60px;
            left: 0;
            right: 0;
            text-align: center;
            padding: 8px 16px;
            background-color: rgba(255, 0, 0, 0.1);
            color: #ff0000;
            font-size: 14px;
            font-weight: 500;
            z-index: 10;
            border-bottom: 1px solid rgba(255, 0, 0, 0.2);
        }
        
        .dark .network-status {
            background-color: rgba(255, 0, 0, 0.2);
            color: #ff6b6b;
        }
        
        /* 拖拽状态的样式 */
        .direct-message-container.dragging {
            opacity: 0.85;
            transform: scale(1.01);
            box-shadow: 0 8px 30px rgba(59, 130, 246, 0.3);
            z-index: 1001;
        }
        
        /* 调整大小状态的样式 */
        .direct-message-container.resizing {
            transition: none;
            user-select: none;
            opacity: 0.9;
            box-shadow: 0 5px 25px rgba(59, 130, 246, 0.3);
        }
        
        .dark .direct-message-container {
            background-color: rgba(31, 41, 55, 0.92);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
            color: #e2e8f0;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .direct-message-header {
            display: flex;
            align-items: center;
            padding: 20px;
            background: linear-gradient(135deg, #4f46e5, #3b82f6);
            color: white;
            border-radius: 16px 16px 0 0;
            position: relative;
            cursor: move;
        }
        
        .user-avatar {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            overflow: hidden;
            margin-right: 14px;
            position: relative;
            background-color: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 600;
            color: white;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .user-avatar span {
            transform: translateY(1px);
        }
        
        .status-indicator {
            position: absolute;
            right: 0;
            bottom: 0;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid #4f46e5;
        }
        
        .status-indicator.online {
            background-color: #10b981;
        }
        
        .status-indicator.offline {
            background-color: #9ca3af;
        }
        
        .user-info h5 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 3px;
            letter-spacing: 0.2px;
        }
        
        .user-info small {
            font-size: 13px;
            opacity: 0.9;
        }
        
        .encryption-badge {
            margin-left: auto;
            background-color: rgba(255, 255, 255, 0.15);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            backdrop-filter: blur(4px);
        }
        
        .direct-messages-list {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            background-color: rgba(249, 250, 251, 0.7);
            display: flex;
            flex-direction: column;
            gap: 18px;
        }
        
        .dark .direct-messages-list {
            background-color: rgba(17, 24, 39, 0.7);
        }
        
        .message {
            display: flex;
            max-width: 82%;
            position: relative;
            align-items: flex-start;
            margin: 0 4px;
            cursor: default;
        }
        
        .message.outgoing {
            align-self: flex-end;
            flex-direction: row-reverse;
        }
        
        .message.incoming {
            align-self: flex-start;
        }
        
        .message-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            overflow: hidden;
            margin: 0 12px;
            background-color: #6366f1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 600;
            color: white;
            align-self: flex-start;
            margin-top: 4px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        
        .message.outgoing .message-avatar {
            background-color: #3b82f6;
        }
        
        .message-content {
            background-color: white;
            padding: 14px 18px;
            border-radius: 18px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            display: flex;
            flex-direction: column;
            gap: 4px;
            position: relative;
            min-width: 120px;
            transition: transform 0.15s ease-out;
        }
        
        .message:hover .message-content {
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }
        
        .dark .message-content {
            background-color: #1f2937;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        
        .message.outgoing .message-content {
            background-color: #4f46e5;
            color: white;
        }
        
        /* 气泡尖角效果改进 */
        .message.incoming .message-content:before {
            content: '';
            position: absolute;
            left: -8px;
            top: 16px;
            width: 0;
            height: 0;
            border-top: 6px solid transparent;
            border-right: 10px solid white;
            border-bottom: 6px solid transparent;
            filter: drop-shadow(-2px 2px 2px rgba(0, 0, 0, 0.04));
        }
        
        .dark .message.incoming .message-content:before {
            border-right-color: #1f2937;
            filter: drop-shadow(-2px 2px 2px rgba(0, 0, 0, 0.1));
        }
        
        .message.outgoing .message-content:before {
            content: '';
            position: absolute;
            right: -8px;
            top: 16px;
            width: 0;
            height: 0;
            border-top: 6px solid transparent;
            border-left: 10px solid #4f46e5;
            border-bottom: 6px solid transparent;
            filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.04));
        }
        
        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 2px;
            font-size: 13px;
        }
        
        .message-sender {
            font-weight: 600;
            margin-right: auto;
            color: #4b5563;
        }
        
        .dark .message-sender {
            color: #e5e7eb;
        }
        
        .message.outgoing .message-sender {
            color: rgba(255, 255, 255, 0.95);
        }
        
        .encryption-icon {
            margin-left: 6px;
            font-size: 12px;
        }
        
        .message-text {
            word-break: break-word;
            line-height: 1.5;
            font-size: 15px;
            letter-spacing: 0.2px;
        }
        
        .message.outgoing .message-text a {
            color: rgba(255, 255, 255, 0.95);
            text-decoration: underline;
        }
        
        /* 重新设计的聊天输入区域 */
        .direct-message-input {
            padding: 18px 24px 22px;
            background-color: rgba(255, 255, 255, 0.98);
            border-top: 1px solid rgba(229, 231, 235, 0.5);
            position: relative;
        }
        
        .dark .direct-message-input {
            background-color: rgba(31, 41, 55, 0.98);
            border-top-color: rgba(75, 85, 99, 0.3);
        }
        
        .dm-form {
            display: flex;
            align-items: center;
            gap: 12px;
            position: relative;
            max-width: 95%;
            margin: 0 auto;
        }
        
        /* 输入框容器 */
        .input-container {
            flex: 1;
            position: relative;
            border-radius: 24px;
            background-color: white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            transition: all 0.2s ease;
        }
        
        .dark .input-container {
            background-color: rgba(55, 65, 81, 0.9);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        
        .input-container:focus-within {
            box-shadow: 0 3px 12px rgba(99, 102, 241, 0.15);
        }
        
        #dm-input {
            width: 100%;
            border: none;
            border-radius: 24px;
            padding: 15px 20px;
            font-size: 15px;
            line-height: 1.5;
            outline: none;
            resize: none;
            min-height: 24px;
            max-height: 120px;
            background-color: transparent;
            font-family: inherit;
            font-weight: 400;
            letter-spacing: 0.2px;
            overflow-y: auto;
        }
        
        .dark #dm-input {
            color: #e5e7eb;
        }
        
        /* 美化输入框滚动条 */
        #dm-input::-webkit-scrollbar {
            width: 4px;
        }
        
        #dm-input::-webkit-scrollbar-track {
            background: transparent;
        }
        
        #dm-input::-webkit-scrollbar-thumb {
            background: rgba(209, 213, 219, 0.5);
            border-radius: 2px;
        }
        
        .dark #dm-input::-webkit-scrollbar-thumb {
            background: rgba(75, 85, 99, 0.5);
        }
        
        /* 输入框占位符样式 */
        #dm-input::placeholder {
            color: rgba(107, 114, 128, 0.7);
            font-weight: 400;
        }
        
        .dark #dm-input::placeholder {
            color: rgba(156, 163, 175, 0.7);
        }
        
        /* 纯净的发送按钮设计 */
        #dm-send-btn {
            width: 46px;
            height: 46px;
            background-color: #4f46e5;
            color: white;
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease, background-color 0.2s ease;
            flex-shrink: 0;
            box-shadow: 0 2px 6px rgba(79, 70, 229, 0.25);
        }
        
        #dm-send-btn:hover {
            background-color: #4338ca;
            transform: translateY(-2px);
        }
        
        #dm-send-btn:active {
            transform: scale(0.95);
        }
        
        #dm-send-btn i {
            font-size: 16px;
        }
        
        /* 输入框底部装饰元素 */
        .direct-message-input::after {
            content: '';
            position: absolute;
            bottom: 11px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 4px;
            background-color: rgba(209, 213, 219, 0.7);
            border-radius: 2px;
        }
        
        .dark .direct-message-input::after {
            background-color: rgba(75, 85, 99, 0.5);
        }
        
        /* 美化消息时间显示 */
        .message-time {
            font-size: 11px;
            opacity: 0.7;
            margin-left: 8px;
            font-weight: 400;
        }
        
        .message.outgoing .message-time {
            color: rgba(255, 255, 255, 0.8);
        }
        
        .close-dm-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s;
            z-index: 5;
            font-size: 16px;
            backdrop-filter: blur(2px);
        }
        
        .close-dm-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }
        
        .close-dm-btn:active {
            transform: scale(0.9);
        }
        
        .resize-handle {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 24px;
            height: 24px;
            cursor: nwse-resize;
            z-index: 10;
            display: flex;
            align-items: flex-end;
            justify-content: flex-end;
            padding: 3px;
            opacity: 0.2;
            transition: opacity 0.2s;
        }
        
        .resize-handle:hover {
            opacity: 0.6;
        }
        
        .resize-handle::after {
            content: "";
            width: 10px;
            height: 10px;
            border-right: 2px solid #4b5563;
            border-bottom: 2px solid #4b5563;
            opacity: 0.8;
        }
        
        /* 调整大小指示器的样式 */
        .resize-indicator {
            position: absolute;
            bottom: 3px;
            right: 3px;
            color: #4b5563;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        
        .resize-handle:hover .resize-indicator {
            opacity: 1;
        }
        
        .resizing .resize-indicator {
            opacity: 1;
            color: #3b82f6;
        }
        
        /* 自定义滚动条 */
        .direct-messages-list::-webkit-scrollbar {
            width: 6px;
        }
        
        .direct-messages-list::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.03);
            border-radius: 3px;
        }
        
        .direct-messages-list::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.12);
            border-radius: 3px;
        }
        
        .dark .direct-messages-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.03);
        }
        
        .dark .direct-messages-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.12);
        }
        
        /* 打开窗口的动画 */
        @keyframes dm-fade-in {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .direct-message-container {
            animation: dm-fade-in 0.25s ease-out forwards;
        }
        
        /* 响应式调整 */
        @media (max-width: 768px) {
            .direct-message-container {
                width: 380px;
                height: 540px;
            }
        }
        
        @media (max-width: 480px) {
            .direct-message-container {
                width: 100%;
                height: 70vh;
                bottom: 0;
                right: 0;
                border-radius: 16px 16px 0 0;
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Click event handling function for private chat user items
 * @param {Event} e -Event Object
 * @param {string} userId -User ID (passed by parameters, not obtained from dataset)
 */
function directMessageUserClickHandler(e, userId) {
    console.log('Direct Message用户项被点击', e);
    
    // Prevent events from bubbling and prevent other processors from being triggered
    e.preventDefault();
    e.stopPropagation();
    
    // If the user id is not passed through the parameter, try to get it from the dataset (compatible method)
    if (!userId) {
        userId = this.dataset.userId || this.getAttribute('data-user-id');
    }
    
    console.log('Direct Message用户ID:', userId);
    
    if (userId) {
        console.log(`准备打开与用户ID=${userId}的Direct Message`);
        
        // Check if the current chat user is the same person
        if (currentChatUser && currentChatUser.id == userId) {
            // If it is the current user and the private chat window exists, focus on the window
            const dmContainer = document.getElementById('direct-message-container');
            if (dmContainer) {
                // Focus window (you can add a small animation effect)
                dmContainer.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    dmContainer.style.transform = '';
                }, 200);
                
                // Focus input box
                const inputElement = dmContainer.querySelector('#dm-input');
                if (inputElement) {
                    inputElement.focus();
                }
                return;
            }
        }
        
        // Open private chat directly without delay
        openDirectMessageChat(userId);
    } else {
        console.error('无法获取用户ID，Direct Message打开失败');
    }
}

/**
 * Listen for direct messages from other users
 */
function listenForDirectMessages() {
    if (typeof socket === 'undefined') {
        console.warn('Socket.io not available, direct messages will be polled');
        setupSocketFallback();
        return;
    }
    
    // 检查socket连接是否已建立
    if (socket.connected) {
        console.log('Socket.IO已连接');
        setupSocketListeners();
    } else {
        console.log('Socket.IO未连接，等待连接...');
        // 监听连接事件
        socket.on('connect', function() {
            console.log('Socket.IO已连接');
            setupSocketListeners();
        });
        
        // 监听断开连接事件
        socket.on('disconnect', function() {
            console.warn('Socket.IO连接已断开，消息将通过轮询获取');
            // 确保轮询在连接断开时仍在运行
            if (currentChatUser && !messagePollingInterval) {
                startMessagePolling();
            }
        });
        
        // 监听连接错误事件
        socket.on('connect_error', function(error) {
            console.error('Socket.IO连接错误:', error);
            // 确保轮询在连接错误时仍在运行
            if (currentChatUser && !messagePollingInterval) {
                startMessagePolling();
            }
        });
        
        // 尝试手动连接
        socket.connect();
    }
}

/**
 * 设置Socket.IO事件监听器
 */
function setupSocketListeners() {
    // 移除任何现有的监听器以避免重复
    socket.off('direct_message');
    socket.off('user_status');
    
    // 监听私聊消息
    socket.on('direct_message', handleDirectMessage);
    
    // 监听用户状态变化
    socket.on('user_status', handleUserStatus);
    
    // 发送一个ping以保持连接活跃
    setInterval(function() {
        if (socket.connected) {
            socket.emit('ping', { timestamp: new Date().getTime() });
        }
    }, 30000); // 每30秒ping一次
}

/**
 * 处理收到的私聊消息
 */
async function handleDirectMessage(data) {
    console.log('接收到私聊消息:', data);

    // 检查消息类型：是接收到的还是自己发送的
    const isFromCurrentUser = data.sender && data.sender.id === currentUser.id;
    const isToCurrentChatUser = data.recipient_id === currentChatUser?.id;
    const isFromCurrentChatUser = data.sender && data.sender.id === currentChatUser?.id;
    
    console.log('消息分析:', {
        isFromCurrentUser,
        isToCurrentChatUser,
        isFromCurrentChatUser,
        currentChatUser: currentChatUser?.id,
        sender: data.sender?.id,
        recipient: data.recipient_id
    });
    
    // 将socket消息转换为标准消息对象格式
    const message = {
        id: data.id,
        sender_id: data.sender.id,
        recipient_id: data.recipient_id,
        content: data.content,
        encrypted_content: data.encrypted_content,
        iv: data.iv,
        is_encrypted: data.encrypted_content && data.iv,
        message_type: data.message_type,
        created_at: data.created_at,
        is_outgoing: isFromCurrentUser,
        other_user: isFromCurrentUser ? {id: data.recipient_id} : data.sender
    };
    
    // 保存消息到本地存储以保持持久化
    saveMessageToLocalStorage(message);
    
    // 消息由当前聊天对象发送给我的，或者是我发送给当前聊天对象的
    if (currentChatUser && (isFromCurrentChatUser || (isFromCurrentUser && isToCurrentChatUser))) {
        // 添加到当前打开的聊天窗口
        const messagesContainer = document.querySelector('.direct-messages-list');
        if (messagesContainer) {
            // 准备消息对象
            message.other_user = currentChatUser;
            
            // 检查消息是否已存在，避免重复显示
            const existingMessage = messagesContainer.querySelector(`.message[data-message-id="${message.id}"]`);
            if (!existingMessage) {
                // 添加到聊天窗口
                await appendDirectMessage(message);
                
                // 如果是收到的消息，标记为已读并滚动到底部
                if (!isFromCurrentUser) {
                    markMessageAsRead(data.id);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    
                    // 播放消息提示音
                    playMessageSound();
                }
            }
        }
    } else {
        // 如果不是当前聊天用户发送的消息，显示通知
        const isEncrypted = data.encrypted_content && data.iv;
        
        // 如果接收到加密消息，在后台尝试建立会话以备将来使用
        if (isEncrypted && !isFromCurrentUser && typeof cryptoManager !== 'undefined' && cryptoManager.hasKeyPair()) {
            try {
                // 确保与发送者建立了加密会话
                await establishE2EESession(data.sender.id);
                console.log('与用户 ' + data.sender.id + ' 建立了加密会话');
            } catch (e) {
                console.error('无法建立加密会话:', e);
            }
        }
        
        // 更新未读指示器（只有收到的消息才更新）
        if (!isFromCurrentUser) {
            updateUnreadIndicator(data.sender.id);
            
            // 显示通知
            showDirectMessageNotification(data.sender, data, isEncrypted);
            
            // 播放消息提示音
            playMessageSound();
        }
    }
}

/**
 * 处理用户状态变化
 */
function handleUserStatus(data) {
    // 如果当前正在和这个用户聊天，更新他们的状态
    if (currentChatUser && data.user_id == currentChatUser.id) {
        const statusIndicator = document.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.classList.remove('online', 'offline');
            statusIndicator.classList.add(data.status);
        }
    }
}

/**
 * 设置Socket.IO的降级方案
 */
function setupSocketFallback() {
    console.log('设置Socket.IO降级方案');
    
    // 创建一个模拟的socket对象
    window.socket = {
        connected: false,
        connect: function() {
            console.log('模拟Socket.IO连接尝试');
            return false;
        },
        on: function(event, callback) {
            console.log('添加事件监听:', event);
            // 不实际做任何事情
        },
        off: function(event) {
            console.log('移除事件监听:', event);
            // 不实际做任何事情
        },
        emit: function(event, data) {
            console.log('模拟事件发送:', event);
            // 不实际做任何事情
        }
    };
    
    // 确保当聊天窗口打开时，轮询会启动
    document.addEventListener('dm_window_opened', function() {
        if (currentChatUser) {
            startMessagePolling();
        }
    });
}

/**
 * 打开与用户的私聊窗口
 * @param {string|number} userId 用户ID
 */
async function openDirectMessageChat(userId) {
    console.log(`打开与用户${userId}的聊天窗口`);
    
    // 如果已经打开了这个用户的聊天窗口，就不用再加载了
    if (currentChatUser && currentChatUser.id == userId) {
        console.log(`已经打开了与用户${userId}的聊天窗口`);
        return;
    }
    
    // 显示加载指示器
    document.getElementById('direct-message-loader')?.classList.add('active');
    
    try {
        // 尝试建立E2EE会话，即使失败也继续加载消息
        try {
            if (typeof cryptoManager !== 'undefined') {
                const sessionEstablished = await cryptoManager.establishSession(userId);
                console.log(`与用户${userId}的E2EE会话状态: ${sessionEstablished ? '已建立' : '建立失败'}`);
            }
        } catch (e) {
            console.warn(`建立与用户${userId}的加密会话失败，将尝试继续加载消息:`, e);
        }
        
        // 多个端点格式，按顺序尝试
        const endpoints = [
            `/api/direct_messages/user/${userId}`,  // 首选格式
            `/api/direct_messages/${userId}`,       // 替代格式1
        ];
        
        let response = null;
        let data = null;
        let error = null;
        
        // 尝试所有端点直到成功
        for (const endpoint of endpoints) {
            try {
                console.log(`尝试从 ${endpoint} 加载消息`);
                response = await fetch(endpoint);
                
                if (response.ok) {
                    data = await response.json();
                    if (data.success) {
                        console.log(`从 ${endpoint} 成功加载消息`);
                        break; // 找到有效端点，停止尝试
                    }
                } else {
                    console.warn(`端点 ${endpoint} 返回错误状态: ${response.status}`);
                }
            } catch (e) {
                console.warn(`访问端点 ${endpoint} 时出错:`, e);
                error = e;
            }
        }
        
        // 如果所有端点都失败
        if (!data || !data.success) {
            if (response) {
                console.error(`加载消息失败，状态码: ${response.status}`);
                throw new Error(`加载消息失败，状态码: ${response.status}`);
            } else if (error) {
                console.error('所有消息加载端点都失败:', error);
                throw error;
            } else {
                throw new Error('未知原因无法加载消息');
            }
        }
        
        // 显示聊天界面
        await showDirectMessageInterface(data.user, data.messages);
        
    } catch (error) {
        console.error('加载私聊消息失败:', error);
        showError(`无法加载与用户${userId}的消息: ${error.message}`);
    } finally {
        // 隐藏加载指示器
        document.getElementById('direct-message-loader')?.classList.remove('active');
    }
}

/**
 * Display private chat interface
 * @param {Object} user User to chat with
 * @param {Array} messages Message history
 */
async function showDirectMessageInterface(user, messages) {
    if (isClosingDM) return;
    
    // Save current chat user
    currentChatUser = user;
    
    // Create a container
    const dmContainer = createDirectMessageContainer();
    document.body.appendChild(dmContainer);
    
    // Update user information
    const avatar = dmContainer.querySelector('.dm-avatar');
    avatar.textContent = user.username.charAt(0).toUpperCase();
    
    const username = dmContainer.querySelector('.dm-username');
    username.textContent = user.username;
    
    // Get message list element
    const messagesList = dmContainer.querySelector('.direct-messages-list');
    
    // 添加自定义属性，用于保存已添加的消息ID
    messagesList.dataset.addedMessageIds = JSON.stringify([]);
    
    // Add message history
    if (messages && messages.length > 0) {
        // 显示加载指示器 - 使用更简洁优雅的设计
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-messages';
        loadingIndicator.style.textAlign = 'center';
        loadingIndicator.style.padding = '20px';
        loadingIndicator.style.color = '#6366f1';
        loadingIndicator.style.fontSize = '14px';
        loadingIndicator.style.fontWeight = '500';
        loadingIndicator.style.display = 'flex';
        loadingIndicator.style.alignItems = 'center';
        loadingIndicator.style.justifyContent = 'center';
        loadingIndicator.style.gap = '10px';
        loadingIndicator.innerHTML = `
            <div class="loading-spinner" style="width: 18px; height: 18px; border: 2px solid rgba(99, 102, 241, 0.2); border-radius: 50%; border-top-color: #6366f1; animation: spin 0.8s linear infinite;"></div>
            <span>Loading messages...</span>
        `;
        messagesList.appendChild(loadingIndicator);
        
        // 确保消息数组是有效的
        const validMessages = messages.filter(msg => msg && (msg.id || msg.created_at));
        
        // 首先按照时间排序消息 - 使用更可靠的排序逻辑
        validMessages.sort((a, b) => {
            // 尝试使用created_at时间戳
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            
            // 如果时间戳相同，尝试使用ID排序
            if (timeA === timeB) {
                const idA = parseInt(a.id || '0');
                const idB = parseInt(b.id || '0');
                return idA - idB;
            }
            
            return timeA - timeB;
        });
        
        console.log('Sorted messages:', validMessages.map(m => ({id: m.id, time: m.created_at})));
        
        // 记录已添加的消息ID，避免重复添加
        const addedMessageIds = new Set();
        
        // 清空消息列表，确保不会有旧消息残留
        messagesList.innerHTML = '';
        
        // 重新添加加载指示器
        messagesList.appendChild(loadingIndicator);
        
        // 处理消息批次，避免UI阻塞
        const BATCH_SIZE = 10; // 每批处理10条消息
        
        for (let i = 0; i < validMessages.length; i += BATCH_SIZE) {
            const batch = validMessages.slice(i, i + BATCH_SIZE);
            
            // 处理这一批消息
            const batchPromises = batch.map(async (message) => {
                // 确保消息有ID
                if (!message.id) {
                    console.warn('Message missing ID, skipping', message);
                    return;
                }
                
                // 检查这条消息是否已经添加过
                if (!addedMessageIds.has(message.id)) {
                    addedMessageIds.add(message.id);
                    await appendDirectMessageSync(message, messagesList);
                } else {
                    console.log(`Skipping duplicate message ID ${message.id}`);
                }
            });
            
            // 等待这一批消息处理完成
            await Promise.all(batchPromises);
            
            // 等待短暂时间，让UI更新
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // 更新已添加消息ID的记录
        messagesList.dataset.addedMessageIds = JSON.stringify(Array.from(addedMessageIds));
        
        // 移除可能存在的加载指示器
        const indicator = messagesList.querySelector('.loading-messages');
        if (indicator) {
            indicator.remove();
        }
        
        // 滚动到底部
        setTimeout(() => {
            messagesList.scrollTop = messagesList.scrollHeight;
        }, 100);
    }
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('dm-input');
        if (input) input.focus();
    }, 200);
    
    // Add event handlers
    dmContainer.querySelector('.close-dm-btn').addEventListener('click', closeDirectMessageChat);
    
    // Form submit event
    const form = document.getElementById('dm-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        sendDirectMessage(currentChatUser.id);
    });
    
    // Make window draggable and resizable
    makeResizable(dmContainer);
    makeDraggable(dmContainer);
    
    // Auto-grow textarea
    const textarea = document.getElementById('dm-input');
    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        const maxHeight = 120; // Max height in px
        const newHeight = Math.min(this.scrollHeight, maxHeight);
        this.style.height = newHeight + 'px';
    });
    
    // Mark all messages from this user as read
    if (messages && messages.length > 0) {
        messages.forEach(msg => {
            if (msg.sender_id === user.id && !msg.read_at) {
                markMessageAsRead(msg.id);
            }
        });
        
        // Clear unread indicator
        updateUnreadIndicator(user.id, true);
    }
    
    // 启动消息轮询，自动检查新消息
    startMessagePolling();
    
    // 分发窗口打开事件
    document.dispatchEvent(new CustomEvent('dm_window_opened', { detail: { userId: user.id } }));
}

/**
 * Create a private chat container
 */
function createDirectMessageContainer() {
    console.log('Creating new direct message container');
    
    // Check if the container already exists
    let container = document.getElementById('direct-message-container');
    if (container) {
        console.log('Container already exists, returning existing container');
        return container;
    }
    
    // Create new private chat container
    container = document.createElement('div');
    container.id = 'direct-message-container';
    container.className = 'direct-message-container';
    
    // Ensure container is visible
    container.style.display = 'flex';
    container.style.zIndex = '9999';  // Ensure top level
    
    // Add basic structure
    container.innerHTML = `
        <div class="direct-message-header">
            <div class="dm-user-info">
                <div class="dm-avatar"></div>
                <div class="dm-username"></div>
                <div class="encryption-badge">
                    <i class="fas fa-lock"></i> Encrypted
                </div>
            </div>
            <button class="close-dm-btn">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="direct-messages-list"></div>
        <div class="direct-message-input">
            <form id="dm-form" class="dm-form">
                <div class="input-container">
                    <textarea id="dm-input" placeholder="Type a message..." rows="1"></textarea>
                </div>
                <button id="dm-send-btn" type="submit">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </form>
        </div>
        <div class="resize-handle"></div>
    `;
    
    return container;
}

/**
 * 添加消息到聊天窗口 (同步版本，用于初始加载)
 * @param {Object} message 消息对象 
 * @param {HTMLElement} messagesList 消息列表容器
 */
async function appendDirectMessageSync(message, messagesList) {
    if (!currentChatUser || !messagesList) return false;
    
    console.log('Adding message synchronously:', message.id, message.created_at);
    
    // 先检查消息ID是否存在于DOM中，避免重复添加
    if (message.id) {
        const existingMessage = messagesList.querySelector(`.message[data-message-id="${message.id}"]`);
        if (existingMessage) {
            console.log(`Message ID=${message.id} already exists in DOM, skipping`);
            return false;
        }
    }
    
    const isOutgoing = message.is_outgoing || message.sender_id == currentUser.id;
    const username = isOutgoing ? currentUser.username : (message.other_user?.username || 'User');
    
    // 检查消息是否是加密的
    const isEncrypted = message.is_encrypted || (message.encrypted_content && message.iv);
    
    // 处理消息内容 - 解密或使用原始内容
    let content = message.content;
    let decryptSuccess = true; // 用于标记解密是否成功
    
    // 如果是加密消息，尝试解密
    if (isEncrypted) {
        try {
            debugLog('尝试解密消息...');
            
            // 确保加密管理器可用
            if (typeof cryptoManager !== 'undefined' && cryptoManager.hasKeyPair()) {
                debugLog('加密管理器可用，准备解密');
                
                // 处理不同解密场景
                if (isOutgoing) {
                    // 这是自己发送的消息
                    if (message.encrypted_for_self && message.iv_for_self) {
                        // 使用为自己加密的副本进行解密
                        debugLog('使用为自己加密的副本解密自己发送的消息');
                        const decryptedContent = await cryptoManager.decryptSelfMessage(
                            message.encrypted_for_self,
                            message.iv_for_self
                        );
                        
                        if (decryptedContent) {
                            debugLog('自发送消息解密成功');
                            content = decryptedContent;
                        } else {
                            // 如果使用自加密副本解密失败，尝试使用备份的明文
                            debugLog('自发送消息解密失败，尝试使用备份明文');
                            if (message.plaintext_backup) {
                                content = message.plaintext_backup;
                            } else {
                                decryptSuccess = false;
                                debugLog('无法解密自己的消息，且没有明文备份，跳过渲染');
                                return; // 直接返回，不渲染这条消息
                            }
                        }
                    } else if (message.content && typeof message.content === 'object' && message.content.content) {
                        // 可能是我们之前修改过的格式，直接提取content
                        content = message.content.content;
                    } else {
                        // 如果没有加密信息，尝试使用原始内容
                        content = message.content || "";
                    }
                } else {
                    // 这是从他人收到的消息
                    if (message.encrypted_content && message.iv) {
                        // 使用正常解密流程
                        debugLog('解密收到的消息');
                        const decryptedContent = await cryptoManager.decryptMessage(
                            message.encrypted_content,
                            message.iv,
                            message.sender_id
                        );
                        
                        if (decryptedContent) {
                            debugLog('收到的消息解密成功');
                            content = decryptedContent;
                        } else {
                            decryptSuccess = false;
                            debugLog('无法解密收到的消息，跳过渲染');
                            return; // 解密失败，不渲染消息
                        }
                    } else if (message.content && typeof message.content === 'object' && message.content.content) {
                        // 检查是否是包含内容的对象
                        content = message.content.content;
                    } else {
                        // 无法解密，跳过渲染
                        decryptSuccess = false;
                        debugLog('收到的消息没有加密内容，跳过渲染');
                        return;
                    }
                }
            } else {
                debugLog('加密管理器不可用，显示原始内容');
                decryptSuccess = false;
                return; // 不渲染加密消息
            }
        } catch (e) {
            console.error('解密消息失败:', e);
            debugLog('解密消息失败，跳过渲染');
            return; // 直接返回，不渲染这条消息
        }
    }
    
    // 如果没有内容但有备份，使用备份
    if (!content && message.plaintext_backup) {
        content = message.plaintext_backup;
    }
    
    // 检查内容是否为加密占位符或空，如果是则跳过渲染
    if (!content || content === "[Encrypted message]" || content === "[Unable to display message content]") {
        console.log(`Skipping message ID=${message.id} - Cannot display encrypted content`);
        return false;
    }
    
    // 确保内容不为null或undefined
    content = content || "";
    
    // Format message content, support basic line breaks and emoticons
    content = formatMessageContent(content);
    
    // Create message elements
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    if (message.id) {
        messageElement.dataset.messageId = message.id;
    }
    
    // 确保时间戳是有效的
    const timestamp = message.created_at ? new Date(message.created_at) : new Date();
    messageElement.dataset.timestamp = timestamp.getTime();
    messageElement.title = formatDateTime(timestamp);
    
    // Set the message content
    messageElement.innerHTML = `
        <div class="message-avatar">
            <span>${username.charAt(0).toUpperCase()}</span>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">${username}</span>
                ${isEncrypted ? '<i class="fas fa-lock encryption-icon" title="Encrypted message"></i>' : ''}
                <span class="message-time">${formatTime(timestamp)}</span>
            </div>
            <div class="message-text">${content}</div>
        </div>
    `;
    
    // 添加到DOM，保持时间顺序
    let inserted = false;
    
    // 获取所有现有消息
    const existingMessages = messagesList.querySelectorAll('.message');
    
    // 提取时间戳
    const msgTime = timestamp.getTime();
    
    // 如果没有现有消息，直接添加
    if (existingMessages.length === 0) {
        messagesList.appendChild(messageElement);
        return true;
    }
    
    // 遍历现有消息，找到合适的插入位置
    for (let i = 0; i < existingMessages.length; i++) {
        const existingMsg = existingMessages[i];
        const existingTime = parseInt(existingMsg.dataset.timestamp || '0', 10);
        
        if (msgTime < existingTime) {
            // 找到了插入位置
            existingMsg.parentNode.insertBefore(messageElement, existingMsg);
            inserted = true;
            break;
        }
    }
    
    // 如果未找到插入位置，添加到末尾
    if (!inserted) {
        messagesList.appendChild(messageElement);
    }
    
    return true;
}

/**
 * 格式化时间显示 (小时:分钟)
 * @param {Date} date 日期对象
 * @returns {string} 格式化的时间字符串
 */
function formatTime(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    let hours = date.getHours();
    let minutes = date.getMinutes();
    
    // 确保分钟数是两位数
    if (minutes < 10) minutes = '0' + minutes;
    
    return `${hours}:${minutes}`;
}

/**
 * Make elements resizable
 */
function makeResizable(element) {
    const resizeHandle = element.querySelector('.resize-handle');
    if (!resizeHandle) return;
    
    let originalWidth, originalHeight, originalX, originalY;
    let minWidth = 300, minHeight = 400;
    
    // Add a visual indicator
    const resizeIndicator = document.createElement('div');
    resizeIndicator.className = 'resize-indicator';
    resizeIndicator.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 18 18 12 18 12 22"></polyline>
            <polygon points="22 22 16 22 22 16 22 22"></polygon>
        </svg>
    `;
    resizeHandle.appendChild(resizeIndicator);
    
    // Add mouse event handling
    resizeHandle.addEventListener('mousedown', initResize);
    resizeHandle.addEventListener('touchstart', initResizeTouchStart);
    
    function initResize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Get initial size and position
        originalWidth = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
        originalHeight = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
        originalX = e.pageX;
        originalY = e.pageY;
        
        // Add a class when resize
        element.classList.add('resizing');
        
        // Add global events
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        // Display adjustment indicator
        resizeHandle.style.opacity = '0.8';
    }
    
    function initResizeTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Get initial size and position
        originalWidth = parseFloat(getComputedStyle(element, null).getPropertyValue('width').replace('px', ''));
        originalHeight = parseFloat(getComputedStyle(element, null).getPropertyValue('height').replace('px', ''));
        originalX = e.touches[0].pageX;
        originalY = e.touches[0].pageY;
        
        // Add a class when resize
        element.classList.add('resizing');
        
        // Add global events
        document.addEventListener('touchmove', resizeTouch);
        document.addEventListener('touchend', stopResizeTouch);
        
        // Display adjustment indicator
        resizeHandle.style.opacity = '0.8';
    }
    
    function resize(e) {
        // Calculate the new size
        const width = originalWidth + (e.pageX - originalX);
        const height = originalHeight + (e.pageY - originalY);
        
        // Apply minimum size limit
        if (width >= minWidth) {
            element.style.width = width + 'px';
        }
        
        if (height >= minHeight) {
            element.style.height = height + 'px';
        }
        
        // Make sure the message list scrolls to the bottom
        const messagesList = element.querySelector('.direct-messages-list');
        if (messagesList) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    }
    
    function resizeTouch(e) {
        if (e.touches.length !== 1) return;
        
        // Calculate the new size
        const width = originalWidth + (e.touches[0].pageX - originalX);
        const height = originalHeight + (e.touches[0].pageY - originalY);
        
        // Apply minimum size limit
        if (width >= minWidth) {
            element.style.width = width + 'px';
        }
        
        if (height >= minHeight) {
            element.style.height = height + 'px';
        }
        
        // Make sure the message list scrolls to the bottom
        const messagesList = element.querySelector('.direct-messages-list');
        if (messagesList) {
            messagesList.scrollTop = messagesList.scrollHeight;
        }
    }
    
    function stopResize() {
        // Remove event listener
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        
        // Remove the class when resize
        element.classList.remove('resizing');
        
        // Hide adjustment indicator
        resizeHandle.style.opacity = '';
        
        // Save the current size to local storage
        try {
            localStorage.setItem('dmWindowWidth', element.style.width);
            localStorage.setItem('dmWindowHeight', element.style.height);
        } catch (e) {
            console.error('Unable to save window size:', e);
        }
    }
    
    function stopResizeTouch() {
        // Remove event listener
        document.removeEventListener('touchmove', resizeTouch);
        document.removeEventListener('touchend', stopResizeTouch);
        
        // Remove the class when resize
        element.classList.remove('resizing');
        
        // Hide adjustment indicator
        resizeHandle.style.opacity = '';
        
        // Save the current size to local storage
        try {
            localStorage.setItem('dmWindowWidth', element.style.width);
            localStorage.setItem('dmWindowHeight', element.style.height);
        } catch (e) {
            console.error('Unable to save window size:', e);
        }
    }
    
    // If saved sizes exist, apply them
    try {
        const savedWidth = localStorage.getItem('dmWindowWidth');
        const savedHeight = localStorage.getItem('dmWindowHeight');
        
        if (savedWidth && savedWidth !== 'auto') {
            element.style.width = savedWidth;
        }
        
        if (savedHeight && savedHeight !== 'auto') {
            element.style.height = savedHeight;
        }
    } catch (e) {
        console.error('Unable to restore window size:', e);
    }
}

/**
 * Make elements draggable
 */
function makeDraggable(element) {
    const header = element.querySelector('.direct-message-header');
    if (!header) return;
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    header.addEventListener('mousedown', dragMouseDown);
    header.addEventListener('touchstart', dragTouchStart, { passive: false });
    
    function dragMouseDown(e) {
        // If you click the Close button, don't start dragging
        if (e.target.closest('.close-dm-btn')) return;
        
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // Add drag status class to enhance display effect
        element.classList.add('dragging');
        
        // Turn off animation effects to make drag smoother
        element.style.transition = 'none';
        
        document.addEventListener('mouseup', closeDragElement);
        document.addEventListener('mousemove', elementDrag);
    }
    
    function dragTouchStart(e) {
        // If you click the Close button, don't start dragging
        if (e.target.closest('.close-dm-btn')) return;
        
        e.preventDefault();
        pos3 = e.touches[0].clientX;
        pos4 = e.touches[0].clientY;
        
        // Add drag status class
        element.classList.add('dragging');
        
        // Turn off animation effects to make drag smoother
        element.style.transition = 'none';
        
        document.addEventListener('touchend', closeDragTouchElement);
        document.addEventListener('touchmove', elementTouchDrag);
    }
    
    function elementDrag(e) {
        e.preventDefault();
        
        // Use client coordinates directly to improve sensitivity
        const newX = e.clientX;
        const newY = e.clientY;
        
        // Calculate displacement and improve sensitivity coefficient
        const dx = (newX - pos3) * 1.2;
        const dy = (newY - pos4) * 1.2;
        
        pos3 = newX;
        pos4 = newY;
        
        // Calculate new location
        const newTop = element.offsetTop + dy;
        const newLeft = element.offsetLeft + dx;
        
        // Make sure the window is not dragged out of the viewport
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const elementWidth = element.offsetWidth;
        const elementHeight = element.offsetHeight;
        
        // Limit boundaries (leave 20px margins)
        const minLeft = -elementWidth + 50;
        const maxLeft = windowWidth - 50;
        const minTop = 0;
        const maxTop = windowHeight - 50;
        
        // Apply location restrictions
        element.style.top = Math.min(Math.max(newTop, minTop), maxTop) + "px";
        element.style.left = Math.min(Math.max(newLeft, minLeft), maxLeft) + "px";
        
        // Adjust positioning method
        if (element.style.position !== 'absolute') {
            element.style.position = 'absolute';
            element.style.bottom = 'auto';
            element.style.right = 'auto';
        }
    }
    
    function elementTouchDrag(e) {
        if (e.touches.length !== 1) return;
        
        // Use touch coordinates directly to improve sensitivity
        const newX = e.touches[0].clientX;
        const newY = e.touches[0].clientY;
        
        // Calculate displacement and improve sensitivity coefficient
        const dx = (newX - pos3) * 1.2;
        const dy = (newY - pos4) * 1.2;
        
        pos3 = newX;
        pos4 = newY;
        
        // Calculate new location
        const newTop = element.offsetTop + dy;
        const newLeft = element.offsetLeft + dx;
        
        // Make sure the window is not dragged out of the viewport
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const elementWidth = element.offsetWidth;
        const elementHeight = element.offsetHeight;
        
        // Limit boundaries (leave 20px margins)
        const minLeft = -elementWidth + 50;
        const maxLeft = windowWidth - 50;
        const minTop = 0;
        const maxTop = windowHeight - 50;
        
        // Apply location restrictions
        element.style.top = Math.min(Math.max(newTop, minTop), maxTop) + "px";
        element.style.left = Math.min(Math.max(newLeft, minLeft), maxLeft) + "px";
        
        // Adjust positioning method
        if (element.style.position !== 'absolute') {
            element.style.position = 'absolute';
            element.style.bottom = 'auto';
            element.style.right = 'auto';
        }
    }
    
    function closeDragElement() {
        document.removeEventListener('mouseup', closeDragElement);
        document.removeEventListener('mousemove', elementDrag);
        
        // Restore animation effects
        element.style.transition = '';
        
        // Remove drag status class
        element.classList.remove('dragging');
    }
    
    function closeDragTouchElement() {
        document.removeEventListener('touchend', closeDragTouchElement);
        document.removeEventListener('touchmove', elementTouchDrag);
        
        // Restore animation effects
        element.style.transition = '';
        
        // Remove drag status class
        element.classList.remove('dragging');
    }
}

/**
 * Add a message to the chat window
 * @param {Object} message Message object
 */
async function appendDirectMessage(message) {
    if (!currentChatUser) return;
    
    const messagesList = document.querySelector('.direct-messages-list');
    if (!messagesList) return;
    
    console.log('准备添加消息:', message);
    
    // 获取已添加的消息ID列表
    let addedMessageIds = [];
    try {
        addedMessageIds = JSON.parse(messagesList.dataset.addedMessageIds || '[]');
    } catch (e) {
        console.error('解析已添加消息ID失败:', e);
        addedMessageIds = [];
    }
    
    // 先检查消息ID是否存在于记录中，避免重复添加
    if (message.id && addedMessageIds.includes(message.id)) {
        console.log(`消息ID=${message.id}已经添加过，跳过添加`);
        return;
    }
    
    // 先检查消息ID是否存在于DOM中，避免重复添加
    if (message.id) {
        const existingMessage = messagesList.querySelector(`.message[data-message-id="${message.id}"]`);
        if (existingMessage) {
            console.log(`消息ID=${message.id}已存在于DOM中，跳过添加`);
            return;
        }
    }
    
    const isOutgoing = message.is_outgoing || message.sender_id == currentUser.id;
    const username = isOutgoing ? currentUser.username : (message.other_user?.username || 'User');
    
    // 检查消息是否是加密的
    const isEncrypted = message.is_encrypted || (message.encrypted_content && message.iv);
    console.log(`消息ID=${message.id} 加密状态:`, isEncrypted);
    
    if (isEncrypted) {
        console.log('加密消息数据:', {
            hasEncryptedContent: !!message.encrypted_content,
            encryptedContentLength: message.encrypted_content?.length,
            hasIV: !!message.iv,
            ivLength: message.iv?.length,
            hasEncryptedForSelf: !!message.encrypted_for_self,
            hasIVForSelf: !!message.iv_for_self
        });
    }
    
    // 处理消息内容 - 解密或使用原始内容
    let content = message.content;
    let decryptSuccess = true; // 用于标记解密是否成功
    
    // 如果是加密消息，尝试解密
    if (isEncrypted) {
        try {
            debugLog('尝试解密消息...');
            
            // 确保加密管理器可用
            if (typeof cryptoManager !== 'undefined' && cryptoManager.hasKeyPair()) {
                debugLog('加密管理器可用，准备解密');
                
                // 处理不同解密场景
                if (isOutgoing) {
                    // 这是自己发送的消息
                    if (message.encrypted_for_self && message.iv_for_self) {
                        // 使用为自己加密的副本进行解密
                        debugLog('使用为自己加密的副本解密自己发送的消息');
                        const decryptedContent = await cryptoManager.decryptSelfMessage(
                            message.encrypted_for_self,
                            message.iv_for_self
                        );
                        
                        if (decryptedContent) {
                            debugLog('自发送消息解密成功');
                            content = decryptedContent;
                        } else {
                            // 如果使用自加密副本解密失败，尝试使用备份的明文
                            debugLog('自发送消息解密失败，尝试使用备份明文');
                            if (message.plaintext_backup) {
                                content = message.plaintext_backup;
                            } else {
                                decryptSuccess = false;
                                debugLog('无法解密自己的消息，且没有明文备份，跳过渲染');
                                return; // 直接返回，不渲染这条消息
                            }
                        }
                    } else if (message.content && typeof message.content === 'object' && message.content.content) {
                        // 可能是我们之前修改过的格式，直接提取content
                        content = message.content.content;
                    } else {
                        // 如果没有加密信息，尝试使用原始内容
                        content = message.content || "";
                    }
                } else {
                    // 这是从他人收到的消息
                    if (message.encrypted_content && message.iv) {
                        // 使用正常解密流程
                        debugLog('解密收到的消息');
                        const decryptedContent = await cryptoManager.decryptMessage(
                            message.encrypted_content,
                            message.iv,
                            message.sender_id
                        );
                        
                        if (decryptedContent) {
                            debugLog('收到的消息解密成功');
                            content = decryptedContent;
                        } else {
                            decryptSuccess = false;
                            debugLog('无法解密收到的消息，跳过渲染');
                            return; // 解密失败，不渲染消息
                        }
                    } else if (message.content && typeof message.content === 'object' && message.content.content) {
                        // 检查是否是包含内容的对象
                        content = message.content.content;
                    } else {
                        // 无法解密，跳过渲染
                        decryptSuccess = false;
                        debugLog('收到的消息没有加密内容，跳过渲染');
                        return;
                    }
                }
            } else {
                debugLog('加密管理器不可用，显示原始内容');
                decryptSuccess = false;
                return; // 不渲染加密消息
            }
        } catch (e) {
            console.error('解密消息失败:', e);
            debugLog('解密消息失败，跳过渲染');
            return; // 直接返回，不渲染这条消息
        }
    }
    
    // 只有当消息内容可用或解密成功时才继续
    if (!content && !decryptSuccess) {
        debugLog('消息内容为空且解密失败，跳过渲染');
        return; // 直接返回，不渲染这条消息
    }
    
    // 检查内容是否为加密占位符或空，如果是则跳过渲染
    if (content === "[Encrypted message]" || content === "[Unable to display message content]") {
        console.log(`跳过消息ID=${message.id} - 不显示占位符消息`);
        return;
    }
    
    // 确保内容不为null或undefined
    content = content || "";
    
    // Format message content, support basic line breaks and emoticons
    content = formatMessageContent(content);
    
    // Create message elements
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    if (message.id) {
        messageElement.dataset.messageId = message.id;
    }
    
    // 确保时间戳是有效的
    const timestamp = message.created_at ? new Date(message.created_at) : new Date();
    messageElement.dataset.timestamp = timestamp.getTime();
    messageElement.title = formatDateTime(timestamp);
    
    // Set the message content
    messageElement.innerHTML = `
        <div class="message-avatar">
            <span>${username.charAt(0).toUpperCase()}</span>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender">${username}</span>
                ${isEncrypted ? '<i class="fas fa-lock encryption-icon" title="Encrypted message"></i>' : ''}
                <span class="message-time">${formatTime(timestamp)}</span>
            </div>
            <div class="message-text">${content}</div>
        </div>
    `;
    
    // 按照消息时间戳插入到合适的位置，而不是总是追加到末尾
    let inserted = false;
    
    // 获取所有现有消息
    const existingMessages = messagesList.querySelectorAll('.message');
    
    // 如果没有任何消息，直接添加
    if (existingMessages.length === 0) {
        messagesList.appendChild(messageElement);
    } else {
        // 寻找合适的插入位置
        for (let i = 0; i < existingMessages.length; i++) {
            const existingMsg = existingMessages[i];
            const existingTime = parseInt(existingMsg.dataset.timestamp || '0', 10);
            
            if (timestamp.getTime() < existingTime) {
                // 找到了插入位置
                existingMsg.parentNode.insertBefore(messageElement, existingMsg);
                inserted = true;
                break;
            }
        }
        
        // 如果没有找到合适的位置，添加到末尾
        if (!inserted) {
            messagesList.appendChild(messageElement);
        }
    }
    
    // 记录已添加的消息ID
    if (message.id) {
        addedMessageIds.push(message.id);
        messagesList.dataset.addedMessageIds = JSON.stringify(addedMessageIds);
    }
    
    console.log('消息已添加到聊天窗口');
    
    // Scroll to the bottom
    setTimeout(() => {
        messagesList.scrollTop = messagesList.scrollHeight;
    }, 10);
    
    return true;
}

/**
 * Format message content
 * @param {string} content Message content
 * @returns {string} Formatted message content
 */
function formatMessageContent(content) {
    if (!content) return '';
    
    // Handle html escape
    content = content.replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
    
    // Convert line breaks to <br>
    content = content.replace(/\n/g, '<br>');
    
    // Support basic url links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    content = content.replace(urlRegex, url => {
        return `<a href="${url}" target="_blank" class="text-blue-500 hover:underline">${url}</a>`;
    });
    
    // Supports common emojis
    const emojiMap = {
        ':)': '😊', ':-)': '😊', ':D': '😃', ':-D': '😃',
        ':(': '😞', ':-(': '😞', ':P': '😛', ':-P': '😛',
        ';)': '😉', ';-)': '😉', ':O': '😮', ':-O': '😮',
        '<3': '❤️', '</3': '💔'
    };
    
    for (const [symbol, emoji] of Object.entries(emojiMap)) {
        content = content.replace(new RegExp(symbol.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1'), 'g'), emoji);
    }
    
    return content;
}

/**
 * 显示错误信息
 * @param {string} message 错误消息
 */
function showError(message) {
    console.error(message);
    if (typeof showToast === 'function') {
        showToast(message, 'error');
    } else {
        alert(message);
    }
}

/**
 * 调试辅助函数
 */
function debugLog(...args) {
    const debug = true; // 设置为false可以关闭调试输出
    if (debug) {
        console.log('[DEBUG]', ...args);
    }
}

/**
 * 发送私聊消息给指定用户
 * @param {number} userId - 接收消息的用户ID
 */
async function sendDirectMessage(userId) {
    debugLog('正在发送私聊消息给用户:', userId);
    
    // 获取消息内容
    const inputField = document.getElementById('dm-input');
    if (!inputField) {
        console.error('无法找到消息输入框');
        return;
    }
    
    const content = inputField.value.trim();
    
    // 检查消息是否为空
    if (!content) {
        return;
    }
    
    // 获取加密设置
    const encryptToggle = document.querySelector('.encryption-badge');
    const shouldEncrypt = encryptToggle && !encryptToggle.classList.contains('disabled');
    
    debugLog('消息内容:', content, '是否加密:', shouldEncrypt);
    
    // 清空输入框
    inputField.value = '';
    
    // 准备消息对象
    let messageData = {
        recipient_id: userId,
        content: content,
        message_type: 'text'
    };
    
    // 保存原始明文消息，以便在UI中显示
    window._lastSentMessage = {
        content: content,
        recipientId: userId,
        timestamp: Date.now()
    };
    
    // 为标识临时消息生成唯一ID
    const tempId = 'temp-' + Date.now();
    
    try {
        // 处理加密
        if (shouldEncrypt && typeof cryptoManager !== 'undefined' && cryptoManager.hasKeyPair()) {
            try {
                debugLog('正在加密消息...');
                
                // 确认已经建立了加密会话
                const sessionEstablished = await establishE2EESession(userId);
                if (!sessionEstablished) {
                    throw new Error('无法建立加密会话。请稍后再试。');
                }
                
                // 1. 为接收者加密消息
                const encryptedForRecipient = await cryptoManager.encryptMessage(content, userId);
                if (!encryptedForRecipient || !encryptedForRecipient.encryptedContent) {
                    throw new Error('为接收者加密消息失败');
                }
                
                // 2. 为自己加密消息副本 - 使用自己的公钥加密
                let encryptedForSelf = null;
                
                // 确保encryptForSelf方法存在
                ensureEncryptForSelfMethod();
                
                if (typeof cryptoManager.encryptForSelf === 'function') {
                    encryptedForSelf = await cryptoManager.encryptForSelf(content);
                    if (!encryptedForSelf || !encryptedForSelf.encryptedContent) {
                        debugLog('为自己加密消息失败，将使用原始内容作为备份');
                    }
                } else {
                    debugLog('encryptForSelf方法不存在，跳过为自己加密');
                }
                
                // 更新消息数据
                messageData = {
                    recipient_id: userId,
                    message_type: 'text',
                    encrypted_content: encryptedForRecipient.encryptedContent,
                    iv: encryptedForRecipient.iv,
                    // 添加为自己加密的副本
                    encrypted_for_self: encryptedForSelf ? encryptedForSelf.encryptedContent : null,
                    iv_for_self: encryptedForSelf ? encryptedForSelf.iv : null
                };
                
                debugLog('消息已加密', {
                    encryptedContentLength: encryptedForRecipient.encryptedContent?.length,
                    ivLength: encryptedForRecipient.iv?.length,
                    encryptedForSelfLength: encryptedForSelf?.encryptedContent?.length,
                    ivForSelfLength: encryptedForSelf?.iv?.length
                });
            } catch (encryptError) {
                console.error('加密消息失败:', encryptError);
                showError('加密消息失败: ' + encryptError.message);
                return;
            }
        }
        
        // 显示发送中的加载状态
        const messagesContainer = document.querySelector('.direct-messages-list');
        
        // 检查是否已有相同内容的临时消息正在发送
        const existingTempMessages = messagesContainer.querySelectorAll('.message.outgoing .message-status');
        let isDuplicate = false;
        
        existingTempMessages.forEach(statusEl => {
            if (statusEl.textContent === '发送中...' && statusEl.closest('.message-text')?.textContent === content) {
                isDuplicate = true;
            }
        });
        
        if (isDuplicate) {
            console.log('检测到重复发送，忽略此次发送请求');
            return;
        }
        
        // 临时消息显示
        const tempMessageEl = document.createElement('div');
        tempMessageEl.id = tempId;
        tempMessageEl.className = 'message outgoing';
        
        // 消息显示内容
        let displayContent = formatMessageContent(content);
        
        // 设置消息内容
        tempMessageEl.innerHTML = `
            <div class="message-avatar">
                <span>${currentUser.username.charAt(0).toUpperCase()}</span>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${currentUser.username}</span>
                    ${shouldEncrypt ? '<i class="fas fa-lock encryption-icon" title="已加密消息"></i>' : ''}
                </div>
                <div class="message-text">${displayContent}</div>
                <div class="message-status">发送中...</div>
            </div>
        `;
        
        // 添加临时消息到列表
        messagesContainer.appendChild(tempMessageEl);
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 获取CSRF令牌
        const csrfToken = getCSRFToken();
        debugLog('CSRF令牌:', csrfToken ? '已获取' : '未获取');
        
        // 发送消息到服务器
        debugLog('发送消息数据:', JSON.stringify(messageData));
        
        // 准备请求头
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 只有在有令牌时才添加CSRF头
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        const response = await fetch('/api/direct_messages/send', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(messageData),
            credentials: 'same-origin' // 确保发送cookies
        });
        
        // 检查HTTP响应状态
        debugLog('HTTP响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`服务器返回错误状态码: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        debugLog('服务器响应:', data);
        
        // 获取状态元素
        const statusEl = tempMessageEl.querySelector('.message-status');
        
        // 检查响应是否成功 - 服务器可能返回 success:true 或 status:'success'
        if (data.success === true || data.status === 'success') {
            debugLog('消息发送成功');
            
            // 从响应中提取信息 - 处理不同的响应格式
            const messageId = data.message_id || 
                             (data.data && data.data.id) || 
                             (data.data && data.data.message_id);
                             
            const createdAt = data.created_at || 
                             (data.data && data.data.created_at) || 
                             new Date().toISOString();
            
            debugLog('消息ID:', messageId, '创建时间:', createdAt);
                             
            // 创建完整的消息对象用于本地存储
            const message = {
                id: messageId || tempId,  // 如果没有ID，使用临时ID
                sender_id: currentUser.id,
                recipient_id: userId,
                content: shouldEncrypt ? null : content,
                encrypted_content: shouldEncrypt ? messageData.encrypted_content : null,
                iv: shouldEncrypt ? messageData.iv : null,
                // 保存为自己加密的副本
                encrypted_for_self: shouldEncrypt ? messageData.encrypted_for_self : null,
                iv_for_self: shouldEncrypt ? messageData.iv_for_self : null,
                is_encrypted: shouldEncrypt,
                message_type: 'text',
                created_at: createdAt,
                is_outgoing: true,
                other_user: { id: userId },
                // 保存明文以备不时之需
                plaintext_backup: content
            };
            
            // 保存到本地存储
            saveMessageToLocalStorage(message);
            
            // 更新成功状态
            if (statusEl) {
                statusEl.textContent = '已发送';
                statusEl.style.color = 'green';
                
                // 2秒后移除状态指示
                setTimeout(() => {
                    if (statusEl && statusEl.parentNode) {
                        statusEl.remove();
                    }
                }, 2000);
            }
            
            // 更新消息ID
            if (messageId) {
                tempMessageEl.setAttribute('data-message-id', messageId);
            }
        } else {
            // 显示错误状态
            const errorMessage = data.message || '发送失败，请重试';
            
            debugLog('消息发送失败:', errorMessage);
            
            if (statusEl) {
                statusEl.textContent = errorMessage;
                statusEl.style.color = 'red';
            }
        }
    } catch (error) {
        console.error('发送消息过程中出错:', error);
        debugLog('错误详情:', error.stack);
        
        // 尝试查找临时消息元素并更新状态
        const tempEl = document.getElementById(tempId);
        if (tempEl) {
            const statusEl = tempEl.querySelector('.message-status');
            if (statusEl) {
                statusEl.textContent = '发送失败: ' + (error.message || '未知错误');
                statusEl.style.color = 'red';
            }
        }
    }
}

/**
 * Close the private chat window
 */
function closeDirectMessageChat() {
    console.log('Closing direct message window');
    
    // 停止消息轮询
    stopMessagePolling();
    
    // 保存当前用户ID以便分发事件使用
    const userId = currentChatUser ? currentChatUser.id : null;
    
    const dmContainer = document.getElementById('direct-message-container');
    if (dmContainer) {
        // Remove elements directly, don't wait for animation
        if (dmContainer.parentNode) {
            dmContainer.parentNode.removeChild(dmContainer);
        }
    }
    
    // Reset the current chat user
    currentChatUser = null;
    
    // 分发窗口关闭事件
    if (userId) {
        document.dispatchEvent(new CustomEvent('dm_window_closed', { detail: { userId: userId } }));
    }
}

/**
 * Mark the message as read
 * @param {string} messageId Message ID
 */
function markMessageAsRead(messageId) {
    if (!messageId) return;
    
    debugLog(`标记消息ID=${messageId}为已读`);
    
    fetch(`/api/direct_messages/${messageId}/read`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            // 处理404或其他错误情况
            if (response.status === 404) {
                debugLog(`消息ID=${messageId}不存在或您不是接收者`);
                return null;
            }
            throw new Error(`标记消息已读请求失败: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.success) {
            debugLog(`消息ID=${messageId}已标记为已读`);
        }
    })
    .catch(error => {
        console.error('标记消息已读时出错:', error);
        // 非致命错误，可以静默失败
    });
}

/**
 * Update unread message indicator
 * @param {string} userId User ID
 * @param {boolean} clear Whether to clear the indicator
 */
function updateUnreadIndicator(userId, clear = false) {
    const userItem = document.querySelector(`.channel-item[data-user-id="${userId}"]`);
    if (!userItem) return;
    
    const indicator = userItem.querySelector('.unread-indicator');
    
    if (clear) {
        if (indicator) {
            indicator.remove();
        }
    } else {
        if (!indicator) {
            const newIndicator = document.createElement('span');
            newIndicator.className = 'unread-indicator';
            userItem.appendChild(newIndicator);
        }
    }
}

/**
 * Show private chat message notification
 * @param {Object} sender Sender information
 * @param {Object} message Message object
 * @param {boolean} isEncrypted Is it an encrypted message?
 */
function showDirectMessageNotification(sender, message, isEncrypted) {
    // If the browser supports notification
    if ('Notification' in window) {
        // Check permissions
        if (Notification.permission === 'granted') {
            createNotification(sender, message, isEncrypted);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    createNotification(sender, message, isEncrypted);
                }
            });
        }
    }
    
    // Display in-page notifications at the same time
    showToast(`${sender.username} sent a ${isEncrypted ? 'encrypted' : ''} message`, 'info');
}

/**
 * Create a browser notification
 * @param {Object} sender Sender information
 * @param {Object} message Message object
 * @param {boolean} isEncrypted Is it an encrypted message?
 */
function createNotification(sender, message, isEncrypted) {
    const title = `${sender.username} sent a message`;
    const options = {
        body: isEncrypted ? '[Encrypted message]' : message.content,
        icon: sender.avatar_url || '/static/img/default-avatar.png'
    };
    
    const notification = new Notification(title, options);
    
    notification.onclick = function() {
        window.focus();
        openDirectMessageChat(sender.id);
        this.close();
    };
    
    // Automatically close after 5 seconds
    setTimeout(() => notification.close(), 5000);
}

/**
 * Establish an E2EE session with the specified user
 * @param {string} userId User ID
 * @returns {Promise<boolean>} 会话建立是否成功
 */
async function establishE2EESession(userId) {
    console.log(`正在与用户ID=${userId}建立E2EE会话...`);
    
    // 检查TweetNaCl.js库是否已加载
    if (!checkTweetNaClLoaded()) {
        console.error('加密库未加载，无法建立E2EE会话');
        showError('建立加密会话失败：加密库未加载');
        return false;
    }
    
    // 检查加密管理器是否可用
    if (typeof cryptoManager === 'undefined') {
        console.error('加密管理器未定义，无法建立E2EE会话');
        showError('建立加密会话失败：加密管理器未初始化');
        return false;
    }
    
    try {
        // 尝试初始化加密管理器（如果尚未初始化）
        if (!cryptoManager.initialized) {
            console.log('加密管理器尚未初始化，正在初始化...');
            const initResult = await cryptoManager.init();
            if (!initResult) {
                throw new Error('加密管理器初始化失败');
            }
        }
        
        // 尝试预加载用户公钥
        await preloadUserPublicKey(userId);
        
        // 建立会话
        const result = await cryptoManager.establishSession(userId);
        
        if (result) {
            console.log(`与用户ID=${userId}的E2EE会话建立成功`);
            showSessionStatus(userId);
            return true;
        } else {
            // 如果建立会话失败，尝试从离线API获取公钥
            console.log('通过API建立会话失败，尝试使用离线公钥');
            
            // 从离线API获取公钥
            const publicKey = getPublicKeyFromOffline(userId);
            if (publicKey) {
                // 手动处理公钥并建立会话
                console.log('从离线API获取到公钥，尝试手动建立会话');
                
                // 解码公钥并设置会话
                const decodedPublicKey = b64Utils.decode(publicKey);
                if (decodedPublicKey) {
                    // 计算共享密钥
                    const sharedKey = nacl.box.before(decodedPublicKey, cryptoManager.keyPair.secretKey);
                    
                    // 保存会话密钥
                    cryptoManager.sessionKeys[userId] = sharedKey;
                    console.log(`手动建立与用户ID=${userId}的会话成功`);
                    
                    showSessionStatus(userId);
                    return true;
                }
            }
            
            throw new Error('建立会话失败，可能是获取公钥失败');
        }
    } catch (error) {
        console.error('建立E2EE会话时出错:', error);
        showError(`建立加密会话失败: ${error.message}`);
        return false;
    }
}

/**
 * Show session status
 * @param {string} userId User ID
 */
function showSessionStatus(userId) {
    const statusElement = document.getElementById('e2ee-status');
    if (!statusElement) return;
    
    if (!checkTweetNaClLoaded()) {
        statusElement.innerHTML = '<span class="text-danger">加密库未加载，无法使用加密消息</span>';
        statusElement.classList.remove('d-none');
        return;
    }
    
    if (typeof cryptoManager === 'undefined' || !cryptoManager.initialized) {
        statusElement.innerHTML = '<span class="text-warning">加密管理器未初始化，正在准备中...</span>';
        statusElement.classList.remove('d-none');
        return;
    }
    
    if (cryptoManager.sessionKeys && cryptoManager.sessionKeys[userId]) {
        statusElement.innerHTML = '<span class="text-success"><i class="fas fa-lock"></i> 已建立加密会话</span>';
    } else {
        statusElement.innerHTML = '<span class="text-warning"><i class="fas fa-unlock"></i> 未建立加密会话，发送消息时将自动建立</span>';
    }
    
    statusElement.classList.remove('d-none');
}

/**
 * Format date time
 * @param {string} dateStr Date string
 */
function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get CSRF token
 */
function getCSRFToken() {
    // 尝试从cookie中获取CSRF令牌
    const cookies = document.cookie.split(';');
    
    // 首先尝试获取Django风格的csrftoken
    let token = '';
    
    // 尝试从cookie中获取
    for (const cookie of cookies) {
        const trimmedCookie = cookie.trim();
        
        // 检查Django风格的令牌
        if (trimmedCookie.startsWith('csrftoken=')) {
            token = trimmedCookie.substring('csrftoken='.length);
            break;
        }
        
        // 检查Flask风格的令牌
        if (trimmedCookie.startsWith('_csrf_token=')) {
            token = trimmedCookie.substring('_csrf_token='.length);
            break;
        }
    }
    
    // 如果cookie中找不到，尝试从meta标签获取
    if (!token) {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            token = metaTag.getAttribute('content');
        }
    }
    
    // 如果仍然找不到，尝试从隐藏输入字段获取
    if (!token) {
        const csrfInput = document.querySelector('input[name="csrf_token"]');
        if (csrfInput) {
            token = csrfInput.value;
        }
    }
    
    console.log('CSRF令牌:', token ? '已找到' : '未找到');
    return token;
}

/**
 * 加密消息
 * @param {string} message 要加密的消息
 * @param {number} recipientId 接收者ID
 * @returns {Promise<Object|null>} 包含加密内容和IV的对象，失败则返回null
 */
async function encryptMessage(message, recipientId) {
  try {
    console.log(`开始加密发送给用户ID=${recipientId}的消息`);
    
    // 确保加密管理器已初始化
    if (typeof cryptoManager === 'undefined') {
      console.error('加密管理器未定义');
      return null;
    }
    
    await cryptoManager.ensureInitialized();
    
    // 确保有密钥对
    if (!cryptoManager.hasKeyPair()) {
      console.log('没有密钥对，尝试生成');
      await cryptoManager.generateKeyPair();
      await cryptoManager.uploadPublicKey();
    }
    
    // 确保与用户建立了会话
    if (!cryptoManager.sessionKeys[recipientId]) {
      console.log('没有与此用户的会话密钥，尝试建立');
      const sessionResult = await establishE2EESession(recipientId);
      if (!sessionResult) {
        console.error('无法建立加密会话');
        return null;
      }
    }
    
    // 加密消息 - 注意参数顺序应该是(message, recipientId)而不是(recipientId, message)
    const encryptedData = await cryptoManager.encryptMessage(message, recipientId);
    
    // 检查返回值并构建一致的返回格式
    if (encryptedData && encryptedData.encryptedContent && encryptedData.iv) {
      return {
        encryptedMessage: encryptedData.encryptedContent,
        iv: encryptedData.iv
      };
    } else {
      console.error('加密返回数据格式不正确:', encryptedData);
      return null;
    }
  } catch (error) {
    console.error('消息加密失败:', error);
    return null;
  }
}

/**
 * 显示加密系统离线消息
 */
function displayE2EEOfflineMessage() {
    const container = document.querySelector('.direct-messages-container');
    if (container) {
        const offlineMsg = document.createElement('div');
        offlineMsg.className = 'e2ee-offline-message';
        offlineMsg.innerHTML = `
            <div class="alert alert-warning">
                <strong>加密系统当前离线</strong>
                <p>无法加载加密库，部分功能可能不可用。消息可能会以未加密的形式发送。</p>
            </div>
        `;
        container.prepend(offlineMsg);
    }
}

/**
 * 同步离线消息到服务器
 * 当网络恢复时自动调用
 */
function syncOfflineMessages() {
    // 检查是否在线
    if (!navigator.onLine) {
        console.log('网络离线，无法同步消息');
        return;
    }
    
    // 检查离线消息存储API是否可用
    if (!window.offlineCryptoAPI) {
        console.log('离线消息存储API不可用');
        return;
    }
    
    // 获取所有离线消息
    const offlineMessages = window.offlineCryptoAPI.getOfflineMessages();
    
    if (!offlineMessages || offlineMessages.length === 0) {
        console.log('没有需要同步的离线消息');
        return;
    }
    
    console.log(`开始同步${offlineMessages.length}条离线消息`);
    
    // 显示同步指示器
    const syncIndicator = document.createElement('div');
    syncIndicator.className = 'sync-indicator';
    syncIndicator.textContent = `正在同步${offlineMessages.length}条离线消息...`;
    document.body.appendChild(syncIndicator);
    
    let successCount = 0;
    let failCount = 0;
    
    // 使用Promise.all处理所有消息同步
    const syncPromises = offlineMessages.map(message => {
        return new Promise((resolve) => {
            // 更新UI，显示正在同步
            updateOfflineMessageStatus(message.id, 'syncing');
            
            const messageData = {
                recipient_username: message.recipient_username,
                content: message.content,
                encrypted: message.shouldEncrypt
            };
            
            // 如果需要加密且还没有加密
            if (message.shouldEncrypt && window.encryptionAPI && !message.isAlreadyEncrypted) {
                try {
                    messageData.content = window.encryptionAPI.encryptMessage(
                        message.content, 
                        message.recipient_username
                    );
                } catch (error) {
                    console.error('加密离线消息失败:', error);
                    updateOfflineMessageStatus(message.id, 'failed');
                    failCount++;
                    resolve(); // 继续处理其他消息
                    return;
                }
            }
            
            // 发送到服务器
            fetch('/api/direct_messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageData)
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('同步消息失败');
            })
            .then(data => {
                if (data.success) {
                    // 同步成功，移除离线标记
                    window.offlineCryptoAPI.removeOfflineMessage(message.id);
                    updateOfflineMessageStatus(message.id, 'synced', data.message_id);
                    successCount++;
                } else {
                    // 同步失败
                    updateOfflineMessageStatus(message.id, 'failed');
                    failCount++;
                    console.error('同步消息失败:', data.message || '服务器错误');
                }
                resolve();
            })
            .catch(error => {
                console.error('同步消息错误:', error);
                updateOfflineMessageStatus(message.id, 'failed');
                failCount++;
                resolve();
            });
        });
    });
    
    // 等待所有同步操作完成
    Promise.all(syncPromises).then(() => {
        // 移除同步指示器
        syncIndicator.remove();
        
        // 显示同步结果
        if (successCount > 0) {
            showSuccess(`成功同步${successCount}条消息`);
        }
        
        if (failCount > 0) {
            showError(`${failCount}条消息同步失败`);
        }
        
        // 更新离线消息计数
        updateOfflineMessageIndicators();
    });
}

/**
 * 更新离线消息状态
 */
function updateOfflineMessageStatus(messageId, status, newId = null) {
    const messageElement = document.querySelector(`.message[data-offline-id="${messageId}"]`);
    if (!messageElement) return;
    
    // 移除现有状态类
    messageElement.classList.remove('syncing', 'synced', 'failed');
    
    // 获取指示器元素
    let indicator = messageElement.querySelector('.offline-indicator');
    if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'offline-indicator';
        messageElement.appendChild(indicator);
    }
    
    // 更新状态
    switch(status) {
        case 'syncing':
            messageElement.classList.add('syncing');
            indicator.textContent = '同步中...';
            break;
        case 'synced':
            messageElement.classList.add('synced');
            indicator.textContent = '已同步';
            
            // 如果提供了新ID，更新消息ID
            if (newId) {
                messageElement.removeAttribute('data-offline-id');
                messageElement.setAttribute('data-message-id', newId);
                
                // 延迟移除指示器
                setTimeout(() => {
                    indicator.remove();
                    messageElement.classList.remove('offline-message', 'synced');
                }, 5000);
            }
            break;
        case 'failed':
            messageElement.classList.add('failed');
            indicator.textContent = '同步失败';
            break;
    }
}

/**
 * 更新离线消息指示器
 */
function updateOfflineMessageIndicators() {
    // 检查离线消息存储API是否可用
    if (!window.offlineCryptoAPI) return;
    
    // 获取离线消息数量
    const offlineMessages = window.offlineCryptoAPI.getOfflineMessages();
    const count = offlineMessages ? offlineMessages.length : 0;
    
    // 更新页面上的所有离线消息计数器
    const counters = document.querySelectorAll('.offline-message-counter');
    counters.forEach(counter => {
        counter.textContent = count;
        counter.style.display = count > 0 ? 'block' : 'none';
    });
    
    // 如果有离线消息且我们在线，显示同步按钮
    const syncButtons = document.querySelectorAll('.sync-offline-messages');
    syncButtons.forEach(button => {
        if (count > 0 && navigator.onLine) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }
    });
}

/**
 * 显示成功消息
 */
function showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.textContent = message;
    
    document.body.appendChild(successElement);
    
    // 3秒后移除
    setTimeout(() => {
        successElement.style.opacity = '0';
        setTimeout(() => {
            successElement.remove();
        }, 300);
    }, 3000);
}

/**
 * 添加离线消息样式
 */
function addOfflineMessageStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .offline-message {
            opacity: 0.8;
            position: relative;
        }
        
        .offline-indicator {
            font-size: 0.7em;
            color: #888;
            background-color: #f0f0f0;
            padding: 2px 5px;
            border-radius: 3px;
            position: absolute;
            bottom: -5px;
            right: 10px;
        }
        
        .message.syncing {
            background-color: rgba(255, 255, 0, 0.1);
        }
        
        .message.synced {
            background-color: rgba(0, 255, 0, 0.1);
        }
        
        .message.failed {
            background-color: rgba(255, 0, 0, 0.1);
        }
        
        .sync-indicator {
            position: fixed;
            top: 50px;
            right: 20px;
            background-color: rgba(0, 0, 255, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 1000;
        }
        
        .success-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(0, 128, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 1000;
            transition: opacity 0.3s;
        }
        
        .offline-message-counter {
            display: none;
            background-color: red;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 12px;
            line-height: 20px;
            text-align: center;
            position: absolute;
            top: -5px;
            right: -5px;
        }
        
        .sync-offline-messages {
            display: none;
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin-left: 10px;
        }
        
        .sync-offline-messages:hover {
            background-color: #388E3C;
        }
    `;
    document.head.appendChild(style);
}

// 在页面加载完成后初始化离线消息功能
document.addEventListener('DOMContentLoaded', function() {
    // 添加离线消息样式
    addOfflineMessageStyles();
    
    // 更新离线消息计数
    updateOfflineMessageIndicators();
    
    // 监听在线状态变化
    window.addEventListener('online', function() {
        console.log('网络连接已恢复');
        updateOfflineMessageIndicators();
        
        // 可选：自动同步离线消息
        // syncOfflineMessages();
    });
    
    window.addEventListener('offline', function() {
        console.log('网络连接已断开');
        updateOfflineMessageIndicators();
    });
    
    // 添加同步按钮到UI（如果需要）
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
        const syncButton = document.createElement('button');
        syncButton.className = 'sync-offline-messages';
        syncButton.textContent = '同步离线消息';
        syncButton.style.display = 'none';
        syncButton.addEventListener('click', syncOfflineMessages);
        
        const counter = document.createElement('span');
        counter.className = 'offline-message-counter';
        counter.textContent = '0';
        
        syncButton.appendChild(counter);
        chatHeader.appendChild(syncButton);
    }
});

/**
 * 保存消息到本地存储以便在刷新后保持消息历史
 * @param {Object} message - 要保存的消息对象
 */
function saveMessageToLocalStorage(message) {
    // 禁用本地存储功能
    console.log('本地存储功能已禁用');
    return false;
}

/**
 * 从本地存储加载特定用户的消息历史
 * @param {number} userId - 要加载消息的用户ID
 * @returns {Array} - 消息数组
 */
function loadMessagesFromLocalStorage(userId) {
    // 禁用本地存储功能
    console.log('本地存储功能已禁用');
    return [];
}

/**
 * 打开与特定用户的私聊窗口
 * @param {number} userId - 用户ID
 * @param {boolean} closeWindow - 如果窗口已经打开，是否关闭它
 */
function scrollChatToBottom(userId) {
    const messagesContainer = document.getElementById(`direct-messages-${userId}`);
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// 添加轮询变量
let messagePollingInterval = null;

/**
 * 启动消息轮询
 * 更频繁地检查新消息
 */
function startMessagePolling() {
    // 如果已经有轮询在运行，先停止它
    stopMessagePolling();
    
    // 只有在有当前聊天用户时才启动轮询
    if (!currentChatUser) return;
    
    console.log('启动消息轮询，间隔1秒...');
    
    // 立即执行一次轮询
    pollMessages();
    
    // 设置轮询间隔，每1秒检查一次新消息
    messagePollingInterval = setInterval(pollMessages, 1000); // 缩短为1秒
}

/**
 * 执行消息轮询
 */
async function pollMessages() {
    // 安全检查：确保有当前聊天用户
    if (!currentChatUser) {
        stopMessagePolling();
        return;
    }
    
    // 防止重复轮询
    if (window._isPolling) {
        return;
    }
    
    window._isPolling = true;
    
    try {
        // 获取当前用户ID
        const userId = currentChatUser.id;
        
        // 获取消息列表容器
        const messagesContainer = document.querySelector('.direct-messages-list');
        if (!messagesContainer) {
            window._isPolling = false;
            return;
        }
        
        // 获取所有已显示的消息ID
        const existingMessageIds = new Set();
        messagesContainer.querySelectorAll('.message[data-message-id]').forEach(el => {
            const id = el.dataset.messageId;
            if (id && id !== 'undefined' && !id.startsWith('temp-')) {
                existingMessageIds.add(id);
            }
        });
        
        // 获取已显示的最后一条消息ID
        const lastMessageElement = messagesContainer.querySelector('.message:last-child');
        const lastMessageId = lastMessageElement ? parseInt(lastMessageElement.dataset.messageId || '0') : 0;
        
        // 防止非数字ID导致的问题
        const safeLastMessageId = isNaN(lastMessageId) ? 0 : lastMessageId;
        
        // 添加时间戳参数防止缓存
        const timestamp = new Date().getTime();
        
        // 构建多个可能的API URL
        const possibleUrls = [
            `/api/direct_messages/latest?user_id=${userId}&after_id=${safeLastMessageId}&_=${timestamp}`,
            `/api/messages/direct?user_id=${userId}&after_id=${safeLastMessageId}&_=${timestamp}`,
            `/api/user/messages/latest?user_id=${userId}&after_id=${safeLastMessageId}&_=${timestamp}`
        ];
        
        let successful = false;
        let data = null;
        
        // 尝试所有可能的URL，直到成功
        for (const url of possibleUrls) {
            if (successful) break;
            
            try {
                // 设置超时
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时
                
                const response = await fetch(url, {
                    signal: controller.signal
                }).catch(e => {
                    if (e.name === 'AbortError') {
                        console.warn(`获取消息超时: ${url}`);
                    }
                    throw e;
                });
                
                clearTimeout(timeoutId);
                
                if (response && response.ok) {
                    data = await response.json();
                    successful = true;
                    break;
                }
            } catch (urlError) {
                console.warn(`轮询URL ${url} 失败: ${urlError.message}`);
                // 继续尝试下一个URL
            }
        }
        
        // 如果所有URL均失败，静默失败（日志会显示在控制台）
        if (!successful || !data) {
            console.warn('所有轮询URL均失败');
            window._isPolling = false;
            return;
        }
        
        // 处理响应数据
        const messages = (data.status === 'success' && data.data) ? data.data : 
                         (data.messages) ? data.messages : [];
        
        if (messages.length > 0) {
            console.log(`轮询发现${messages.length}条新消息`);
            
            // 根据时间戳和ID排序消息
            messages.sort((a, b) => {
                // 首先按照时间戳排序
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                
                // 如果时间戳相同，则按照ID排序
                if (timeA === timeB) {
                    const idA = parseInt(a.id || '0');
                    const idB = parseInt(b.id || '0');
                    return idA - idB;
                }
                
                return timeA - timeB;
            });
            
            // 遍历新消息，检查是否有未显示的
            let hasNewMessages = false;
            
            for (const message of messages) {
                // 安全检查：确保消息有有效ID
                if (!message.id) continue;
                
                const messageId = message.id.toString();
                
                // 如果消息ID已经存在于DOM中，跳过此消息
                if (existingMessageIds.has(messageId)) {
                    console.log(`跳过已存在的消息ID: ${messageId}`);
                    continue;
                }
                
                hasNewMessages = true;
                
                // 准备消息对象
                const msgObj = {
                    ...message,
                    other_user: currentChatUser,
                    is_outgoing: message.sender_id == currentUser.id
                };
                
                try {
                    // 保存到本地存储
                    saveMessageToLocalStorage(msgObj);
                    
                    // 检查DOM中是否已经有此消息ID
                    const existingMessage = messagesContainer.querySelector(`.message[data-message-id="${messageId}"]`);
                    if (!existingMessage) {
                        // 添加到界面
                        await appendDirectMessage(msgObj);
                        
                        // 如果是收到的消息，标记为已读
                        if (message.sender_id == currentChatUser.id) {
                            try {
                                markMessageAsRead(message.id);
                            } catch (markError) {
                                console.warn('标记消息已读失败:', markError);
                            }
                            
                            // 播放消息提示音
                            playMessageSound();
                        }
                    } else {
                        console.log(`消息ID ${messageId} 已存在于DOM中，跳过添加`);
                    }
                } catch (processError) {
                    console.error('处理消息失败:', processError);
                }
            }
            
            // 如果有新消息，滚动到底部
            if (hasNewMessages && messagesContainer) {
                try {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                } catch (scrollError) {
                    console.warn('滚动消息列表失败:', scrollError);
                }
            }
        }
    } catch (error) {
        console.error('轮询消息时出错:', error);
    } finally {
        // 确保标志位被重置
        window._isPolling = false;
    }
}

/**
 * 播放消息提示音
 */
function playMessageSound() {
    const messageSound = document.getElementById('message-sound');
    if (messageSound) {
        // 重置音频位置以确保能够再次播放
        messageSound.currentTime = 0;
        messageSound.play().catch(e => console.error('无法播放消息提示音:', e));
    }
}

/**
 * 停止消息轮询
 */
function stopMessagePolling() {
    if (messagePollingInterval) {
        console.log('停止消息轮询');
        clearInterval(messagePollingInterval);
        messagePollingInterval = null;
    }
}

/**
 * 处理网络状态变化
 */
function handleNetworkStatusChange(event) {
    console.log(`网络状态变化: ${event.type}`);
    
    if (event.type === 'online') {
        console.log('网络已恢复连接');
        
        // 如果Socket.IO存在，尝试重新连接
        if (typeof socket !== 'undefined') {
            if (!socket.connected) {
                console.log('尝试重新连接Socket.IO');
                socket.connect();
            }
        }
        
        // 如果当前有聊天窗口打开，确保轮询在运行
        if (currentChatUser && !messagePollingInterval) {
            console.log('恢复消息轮询');
            startMessagePolling();
        }
    } else if (event.type === 'offline') {
        console.log('网络连接已断开');
        
        // 显示网络离线通知
        showError('网络连接已断开，消息将在网络恢复后自动同步');
        
        // 如果有聊天窗口打开，确保知道网络状态
        if (currentChatUser) {
            const container = document.getElementById('direct-message-container');
            if (container) {
                // 添加离线状态指示
                if (!container.classList.contains('offline')) {
                    container.classList.add('offline');
                    
                    // 添加或更新网络状态指示器
                    let statusIndicator = container.querySelector('.network-status');
                    if (!statusIndicator) {
                        statusIndicator = document.createElement('div');
                        statusIndicator.className = 'network-status';
                        container.appendChild(statusIndicator);
                    }
                    statusIndicator.innerHTML = '<i class="fas fa-wifi-slash"></i> 网络已断开';
                }
            }
        }
    }
}

/**
 * 为自己加密消息的包装函数
 * 如果cryptoManager没有encryptForSelf方法，添加该方法
 */
function ensureEncryptForSelfMethod() {
    if (typeof cryptoManager === 'undefined') {
        console.error('加密管理器未定义，无法添加encryptForSelf方法');
        return false;
    }
    
    if (typeof cryptoManager.encryptForSelf !== 'function') {
        console.log('向加密管理器添加encryptForSelf方法');
        
        // 添加为自己加密消息的方法 - 这会使用自己的公钥
        cryptoManager.encryptForSelf = async function(message) {
            try {
                if (!this.initialized || !this.keyPair) {
                    console.log('加密管理器未初始化，无法为自己加密消息');
                    return null;
                }
                
                // 使用自己的ID（通常是当前登录用户的ID）
                const userId = window.currentUserId;
                if (!userId) {
                    console.error('无法确定当前用户ID');
                    return null;
                }
                
                // 使用相同的加密消息函数，但接收者是自己
                return await this.encryptMessage(message, userId);
            } catch (error) {
                console.error('为自己加密消息失败:', error);
                return null;
            }
        };
        
        return true;
    }
    
    return true;
}

// 在文档加载时添加encryptForSelf方法
document.addEventListener('DOMContentLoaded', function() {
    // 现有的初始化代码...
    
    // 加载完成后，确保encryptForSelf方法存在
    if (typeof cryptoManager !== 'undefined') {
        ensureEncryptForSelfMethod();
    } else {
        // 如果cryptoManager还没有加载，等待它加载
        document.addEventListener('cryptoManagerInitialized', function() {
            ensureEncryptForSelfMethod();
        });
    }
});

/**
 * 在离线API中存储用户公钥
 * @param {string} userId 用户ID
 * @param {string} publicKey 公钥(Base64格式)
 * @returns {boolean} 是否成功存储
 */
function storePublicKeyOffline(userId, publicKey) {
    if (!userId || !publicKey) {
        console.error('存储公钥失败：缺少用户ID或公钥');
        return false;
    }
    
    if (typeof window.offlineCryptoAPI === 'undefined') {
        console.error('离线加密API未定义，无法存储公钥');
        return false;
    }
    
    try {
        console.log(`将用户ID=${userId}的公钥存储在离线API中`);
        const result = window.offlineCryptoAPI.storePublicKey(userId, publicKey);
        return result;
    } catch (error) {
        console.error('存储用户公钥到离线API失败:', error);
        return false;
    }
}

/**
 * 从离线API获取用户公钥
 * @param {string} userId 用户ID
 * @returns {string|null} 公钥(Base64格式)或null
 */
function getPublicKeyFromOffline(userId) {
    if (!userId) {
        console.error('获取公钥失败：缺少用户ID');
        return null;
    }
    
    if (typeof window.offlineCryptoAPI === 'undefined') {
        console.error('离线加密API未定义，无法获取公钥');
        return null;
    }
    
    try {
        console.log(`从离线API获取用户ID=${userId}的公钥`);
        const publicKey = window.offlineCryptoAPI.getPublicKey(userId);
        return publicKey;
    } catch (error) {
        console.error('从离线API获取用户公钥失败:', error);
        return null;
    }
}

/**
 * 建立E2EE会话前尝试预存储用户公钥
 * @param {string} userId 用户ID
 */
async function preloadUserPublicKey(userId) {
    console.log(`尝试预先获取用户ID=${userId}的公钥`);
    
    try {
        // 首先尝试从API获取公钥
        const response = await fetch(`/api/crypto/get_public_key/${userId}`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.public_key) {
                // 存储到离线API
                storePublicKeyOffline(userId, data.public_key);
                console.log(`已预加载并存储用户ID=${userId}的公钥`);
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error(`预加载用户公钥失败:`, error);
        return false;
    }
}

/**
 * 存储消息到本地存储
 * @param {Object[]} messages 消息数组
 */
function storeMessagesLocally(messages) {
    // 禁用本地存储功能
    console.log('本地存储功能已禁用');
    return false;
}

/**
 * 从本地存储中加载消息
 * @param {string} otherUserId 与之对话的用户ID
 * @returns {Object[]} 消息数组
 */
function loadMessagesFromLocalStorage(otherUserId) {
    // 禁用本地存储功能
    console.log('本地存储功能已禁用');
    return [];
}