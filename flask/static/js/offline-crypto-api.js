/**
 * 离线加密API模拟
 * 
 * 当服务器的加密API不可用时，提供基本的加密功能
 * 数据存储在localStorage中
 */

class OfflineCryptoAPI {
    constructor() {
        this.initialized = false;
        this.publicKeys = {}; // 用户ID -> 公钥的映射
        this.storageKey = 'offline_crypto_api_state';
        this.debug = true;
        this.offlineMessages = []; // 存储离线时发送的消息
        this.syncInProgress = false;
    }
    
    /**
     * 初始化离线API
     */
    init() {
        this.log('初始化离线加密API');
        this.loadState();
        this.initialized = true;
        
        // 监听网络状态变化
        window.addEventListener('online', () => this.onNetworkStatusChange(true));
        window.addEventListener('offline', () => this.onNetworkStatusChange(false));
        
        this.log('离线加密API初始化完成');
    }
    
    /**
     * 获取存储的离线消息
     * @returns {Array} 离线消息数组
     */
    getOfflineMessages() {
        return this.offlineMessages || [];
    }
    
    /**
     * 网络状态变化处理
     * @param {boolean} isOnline 是否在线
     */
    onNetworkStatusChange(isOnline) {
        if (isOnline) {
            this.log('网络连接恢复，尝试同步数据');
            this.syncWithServer();
        } else {
            this.log('网络连接断开，切换到离线模式');
        }
    }
    
    /**
     * 与服务器同步数据
     */
    async syncWithServer() {
        if (this.syncInProgress) {
            this.log('同步已在进行中，跳过...');
            return;
        }
        
        this.syncInProgress = true;
        this.log('开始与服务器同步数据');
        
        try {
            // 1. 同步公钥数据
            await this.syncPublicKeys();
            
            // 2. 同步离线发送的消息
            await this.syncOfflineMessages();
            
            this.log('服务器数据同步完成');
        } catch (error) {
            this.log(`同步失败: ${error.message}`);
        } finally {
            this.syncInProgress = false;
        }
    }
    
    /**
     * 同步公钥数据到服务器
     */
    async syncPublicKeys() {
        // 待实现：将本地存储的公钥上传到服务器
        this.log('同步公钥数据 (功能待实现)');
    }
    
    /**
     * 同步离线发送的消息
     */
    async syncOfflineMessages() {
        if (this.offlineMessages.length === 0) {
            this.log('没有离线消息需要同步');
            return;
        }
        
        this.log(`开始同步${this.offlineMessages.length}条离线消息`);
        
        const messagesToSync = [...this.offlineMessages];
        let syncedCount = 0;
        
        for (const message of messagesToSync) {
            try {
                // 尝试通过原始的API发送消息
                const response = await fetch('/api/direct_messages/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': this.getCSRFToken()
                    },
                    body: JSON.stringify(message)
                });
                
                if (response.ok) {
                    // 消息同步成功，从离线队列中移除
                    const index = this.offlineMessages.findIndex(m => 
                        m.recipient_id === message.recipient_id && 
                        m.content === message.content &&
                        m.created_at === message.created_at
                    );
                    
                    if (index !== -1) {
                        this.offlineMessages.splice(index, 1);
                        syncedCount++;
                    }
                } else {
                    throw new Error(`服务器返回错误: ${response.status}`);
                }
            } catch (error) {
                this.log(`同步消息失败: ${error.message}`);
            }
        }
        
        this.log(`成功同步了${syncedCount}条消息，还有${this.offlineMessages.length}条未同步`);
        this.saveState();
    }
    
    /**
     * 存储离线消息
     * @param {Object} message 消息对象
     */
    storeOfflineMessage(message) {
        // 添加时间戳
        message.created_at = message.created_at || new Date().toISOString();
        message.synced = false;
        
        this.offlineMessages.push(message);
        this.saveState();
        
        this.log(`已存储离线消息，接收者ID=${message.recipient_id}`);
        return true;
    }
    
    /**
     * 获取CSRF令牌
     */
    getCSRFToken() {
        // 从cookie中获取
        if (document.cookie.includes('csrf_token=')) {
            const match = document.cookie.match(/csrf_token=([^;]+)/);
            return match ? match[1] : '';
        }
        
        // 尝试从页面中的隐藏元素获取
        const csrfElement = document.querySelector('meta[name="csrf-token"]') || 
                           document.querySelector('input[name="csrf_token"]');
        
        return csrfElement ? csrfElement.content || csrfElement.value : '';
    }
    
    /**
     * 存储用户公钥
     * @param {string} userId 用户ID
     * @param {string} publicKey 公钥(Base64格式)
     */
    storePublicKey(userId, publicKey) {
        this.publicKeys[userId] = publicKey;
        this.saveState();
        this.log(`已存储用户ID=${userId}的公钥`);
        return true;
    }
    
    /**
     * 获取用户公钥
     * @param {string} userId 用户ID
     * @returns {string|null} 公钥(Base64格式)或null
     */
    getPublicKey(userId) {
        return this.publicKeys[userId] || null;
    }
    
    /**
     * 处理API请求
     * @param {string} endpoint API端点
     * @param {Object} data 请求数据
     * @returns {Promise<Object>} API响应
     */
    async handleRequest(endpoint, data) {
        this.log(`处理API请求: ${endpoint}`);
        
        switch (endpoint) {
            case '/api/crypto/upload_public_key':
            case '/api/user/public_key':
            case '/user/public_key':
                if (data.public_key) {
                    // 存储当前用户的公钥
                    const currentUserId = window.currentUserId || 'current_user';
                    this.storePublicKey(currentUserId, data.public_key);
                    return { success: true, message: '公钥已存储在本地' };
                }
                return { success: false, message: '缺少公钥数据' };
                
            case '/api/crypto/get_public_key':
            case '/api/user/get_public_key':
                if (data.user_id) {
                    const publicKey = this.getPublicKey(data.user_id);
                    if (publicKey) {
                        return { success: true, public_key: publicKey };
                    }
                    return { success: false, message: '未找到该用户的公钥' };
                }
                return { success: false, message: '缺少用户ID' };
            
            // 处理带有用户ID的get_public_key路径
            default:
                // 检查是否是带有用户ID的get_public_key请求
                if (endpoint.includes('/api/crypto/get_public_key/') || 
                    endpoint.includes('/api/user/get_public_key/')) {
                    
                    // 提取URL中的用户ID
                    const urlParts = endpoint.split('/');
                    const userId = urlParts[urlParts.length - 1];
                    
                    if (userId) {
                        this.log(`尝试获取用户ID=${userId}的公钥`);
                        const publicKey = this.getPublicKey(userId);
                        
                        if (publicKey) {
                            return { success: true, public_key: publicKey };
                        }
                        return { success: false, message: '未找到该用户的公钥' };
                    }
                    return { success: false, message: '无效的用户ID' };
                }
                
                // 处理直接消息发送
                if (endpoint.includes('/api/direct_messages/send')) {
                    if (data.recipient_id) {
                        // 存储离线消息
                        this.storeOfflineMessage(data);
                        return { 
                            success: true, 
                            message: '消息已存储在本地队列中，将在网络恢复时发送',
                            is_offline: true,
                            id: 'offline_' + Date.now(),  // 生成临时ID
                            created_at: data.created_at || new Date().toISOString()
                        };
                    }
                    return { success: false, message: '缺少接收者ID' };
                }
                
                // 处理标记消息已读请求
                if (endpoint.includes('/api/direct_messages/') && endpoint.includes('/read')) {
                    // 提取消息ID
                    const urlParts = endpoint.split('/');
                    const messageIdIndex = urlParts.indexOf('direct_messages') + 1;
                    if (messageIdIndex < urlParts.length) {
                        const messageId = urlParts[messageIdIndex];
                        this.log(`标记消息ID=${messageId}为已读`);
                        // 离线模式下，直接返回成功
                        return { success: true };
                    }
                    return { success: false, message: '无效的消息ID' };
                }
                
                // 处理获取与用户的消息历史
                if (endpoint.match(/\/api\/direct_messages\/(\d+)$/) || endpoint.match(/\/api\/direct_messages\/user\/(\d+)$/)) {
                    // 提取用户ID
                    const urlParts = endpoint.split('/');
                    const userId = urlParts[urlParts.length - 1];
                    this.log(`获取与用户ID=${userId}的聊天记录`);
                    
                    // 在离线模式下，返回空消息列表
                    return { 
                        success: true,
                        user: {
                            id: userId,
                            username: `User${userId}`,
                            avatar_url: '/static/img/default-avatar.png',
                            is_online: false
                        },
                        messages: []
                    };
                }
                
                // 处理加密API相关的API请求
                if (endpoint.includes('/api/direct_messages/send') || 
                    endpoint.includes('/api/crypto/') || 
                    endpoint.includes('/api/user/public_key') || 
                    endpoint.includes('/user/public_key')) {
                    
                    // 解析请求体数据
                    let data = {};
                    if (data) {
                        try {
                            data = JSON.parse(data);
                        } catch (e) {
                            this.log('无法解析请求数据:', e);
                        }
                    }
                    
                    // 提取URL中的用户ID (如 /api/crypto/get_public_key/123)
                    if (endpoint.includes('/get_public_key/')) {
                        // 用更可靠的方式提取用户ID，处理可能包含特殊字符的Base64编码ID
                        const urlParts = endpoint.split('/');
                        const userId = urlParts[urlParts.length - 1];
                        data.user_id = userId;
                        this.log(`从URL中提取用户ID: ${userId}`);
                    }
                    
                    // 处理获取sender_key请求
                    if (endpoint.includes('/api/crypto/get_sender_key/')) {
                        // 提取channel_id
                        const urlParts = endpoint.split('/');
                        const channelId = urlParts[urlParts.length - 1];
                        this.log(`离线网络：模拟获取channel_id=${channelId}的sender_key`);
                        
                        // 返回模拟的sender_key响应
                        return {
                            success: true,
                            sender_key: {
                                encrypted_key: null, // 离线模式下没有保存sender_key
                                sender_id: "offline_user",
                                channel_id: channelId,
                                version: 1
                            },
                            message: "离线模式下暂无sender_key数据"
                        };
                    }
                    
                    // 使用离线API处理请求
                    const offlineResponse = await this.handleRequest(endpoint, data);
                    
                    // 返回一个模拟的Response对象
                    return offlineResponse;
                }
                
                return { success: false, message: `未知API端点: ${endpoint}` };
        }
    }
    
    /**
     * 拦截fetch请求
     * 应该在页面加载时调用一次这个方法来注册拦截器
     */
    setupFetchInterceptor() {
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = async function(input, init) {
            let url = typeof input === 'string' ? input : input.url;
            let method = init && init.method ? init.method : 'GET';
            
            // 检查是否离线
            if (!navigator.onLine) {
                self.log('网络离线，使用离线API处理请求');
                
                // 如果是发送消息或加密相关的API请求
                if (url.includes('/api/direct_messages/send') || 
                    url.includes('/api/crypto/') || 
                    url.includes('/api/user/public_key') || 
                    url.includes('/user/public_key')) {
                    
                    // 解析请求体数据
                    let data = {};
                    if (init && init.body) {
                        try {
                            data = JSON.parse(init.body);
                        } catch (e) {
                            self.log('无法解析请求数据:', e);
                        }
                    }
                    
                    // 提取URL中的用户ID (如 /api/crypto/get_public_key/123)
                    if (url.includes('/get_public_key/')) {
                        // 用更可靠的方式提取用户ID，处理可能包含特殊字符的Base64编码ID
                        const urlParts = url.split('/');
                        const userId = urlParts[urlParts.length - 1];
                        data.user_id = userId;
                        self.log(`从URL中提取用户ID: ${userId}`);
                    }
                    
                    // 使用离线API处理请求
                    const offlineResponse = await self.handleRequest(url, data);
                    
                    // 返回一个模拟的Response对象
                    return new Response(JSON.stringify(offlineResponse), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // 处理直接消息已读请求 /api/direct_messages/{id}/read
                if (url.includes('/api/direct_messages/') && url.includes('/read')) {
                    // 模拟已读操作成功
                    self.log('模拟标记消息已读操作');
                    return new Response(JSON.stringify({ success: true }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // 处理获取直接消息请求 /api/direct_messages/{user_id} 或 /api/direct_messages/user/{user_id}
                if (url.match(/\/api\/direct_messages\/(\d+)$/) || url.match(/\/api\/direct_messages\/user\/(\d+)$/)) {
                    // 提取用户ID
                    const urlParts = url.split('/');
                    const userId = urlParts[urlParts.length - 1];
                    self.log(`模拟获取与用户ID=${userId}的聊天记录`);
                    
                    // 返回空消息列表作为响应
                    return new Response(JSON.stringify({ 
                        success: true,
                        user: {
                            id: userId,
                            username: `User${userId}`,
                            avatar_url: '/static/img/default-avatar.png',
                            is_online: false
                        },
                        messages: []
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            }
            
            // 尝试执行原始请求
            try {
                const response = await originalFetch.apply(this, arguments);
                
                // 处理404等错误 - 特殊处理direct_messages相关的请求
                if ((response.status === 404 || response.status >= 500) && url.includes('/api/direct_messages/')) {
                    self.log(`API ${url} 返回${response.status}，提供模拟响应`);
                    
                    // 标记消息已读请求的特殊处理
                    if (url.includes('/read') && method.toUpperCase() === 'POST') {
                        self.log('为标记消息已读请求提供模拟成功响应');
                        return new Response(JSON.stringify({ success: true }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    
                    // 获取消息请求的特殊处理
                    if (url.match(/\/direct_messages\/(\d+)$/) || url.match(/\/direct_messages\/user\/(\d+)$/)) {
                        const urlParts = url.split('/');
                        const userId = urlParts[urlParts.length - 1];
                        self.log(`为获取与用户ID=${userId}的聊天记录提供模拟响应`);
                        
                        return new Response(JSON.stringify({ 
                            success: true,
                            user: {
                                id: userId,
                                username: `User${userId}`,
                                avatar_url: '/static/img/default-avatar.png',
                                is_online: false
                            },
                            messages: []
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    
                    // 发送消息请求的特殊处理
                    if (url.includes('/api/direct_messages/send') || url.includes('/api/direct_messages') && method.toUpperCase() === 'POST') {
                        self.log('为发送消息请求提供模拟成功响应');
                        return new Response(JSON.stringify({ 
                            success: true,
                            message: '消息发送成功（模拟）',
                            message_id: 'offline_' + Date.now(),
                            created_at: new Date().toISOString(),
                            data: {
                                id: 'offline_' + Date.now(),
                                content: '离线消息（模拟）',
                                created_at: new Date().toISOString()
                            }
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }
                
                // 如果是加密相关的API请求，并且返回错误，使用离线API
                if ((response.status === 404 || response.status >= 500) && 
                    (url.includes('/api/crypto/') || url.includes('/api/user/public_key') || url.includes('/user/public_key'))) {
                    
                    self.log(`加密API ${url} 返回${response.status}，切换到离线模式`);
                    
                    // 处理获取sender_key请求
                    if (url.includes('/api/crypto/get_sender_key/')) {
                        // 提取channel_id
                        const urlParts = url.split('/');
                        const channelId = urlParts[urlParts.length - 1];
                        self.log(`离线网络：模拟获取channel_id=${channelId}的sender_key`);
                        
                        // 返回模拟的sender_key响应
                        return new Response(JSON.stringify({
                            success: true,
                            sender_key: {
                                encrypted_key: null, // 离线模式下没有保存sender_key
                                sender_id: "offline_user",
                                channel_id: channelId,
                                version: 1
                            },
                            message: "离线模式下暂无sender_key数据"
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    
                    // 解析请求体数据
                    let data = {};
                    if (init && init.body) {
                        try {
                            data = JSON.parse(init.body);
                        } catch (e) {
                            self.log('无法解析请求数据:', e);
                        }
                    }
                    
                    // 提取URL中的用户ID (如 /api/crypto/get_public_key/123)
                    if (url.includes('/get_public_key/')) {
                        // 用更可靠的方式提取用户ID，处理可能包含特殊字符的Base64编码ID
                        const urlParts = url.split('/');
                        const userId = urlParts[urlParts.length - 1];
                        data.user_id = userId;
                        self.log(`从URL中提取用户ID: ${userId}`);
                    }
                    
                    // 使用离线API处理请求
                    const offlineResponse = await self.handleRequest(url, data);
                    
                    // 返回一个模拟的Response对象
                    return new Response(JSON.stringify(offlineResponse), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                return response;
            } catch (error) {
                self.log(`API请求失败: ${error.message}`);
                
                // 处理direct_messages相关请求的异常
                if (url.includes('/api/direct_messages/')) {
                    // 标记消息已读请求的特殊处理
                    if (url.includes('/read') && method.toUpperCase() === 'POST') {
                        self.log('为标记消息已读请求提供模拟成功响应');
                        return new Response(JSON.stringify({ success: true }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    
                    // 获取消息请求的特殊处理
                    if (url.match(/\/direct_messages\/(\d+)$/) || url.match(/\/direct_messages\/user\/(\d+)$/)) {
                        const urlParts = url.split('/');
                        const userId = urlParts[urlParts.length - 1];
                        self.log(`为获取与用户ID=${userId}的聊天记录提供模拟响应`);
                        
                        return new Response(JSON.stringify({ 
                            success: true,
                            user: {
                                id: userId,
                                username: `User${userId}`,
                                avatar_url: '/static/img/default-avatar.png',
                                is_online: false
                            },
                            messages: []
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }
                
                // 处理加密API相关请求的异常
                if (url.includes('/api/crypto/') || url.includes('/api/user/public_key') || url.includes('/user/public_key')) {
                    self.log(`加密API请求失败，切换到离线模式: ${error.message}`);
                    
                    // 处理获取sender_key请求
                    if (url.includes('/api/crypto/get_sender_key/')) {
                        // 提取channel_id
                        const urlParts = url.split('/');
                        const channelId = urlParts[urlParts.length - 1];
                        self.log(`离线网络：模拟获取channel_id=${channelId}的sender_key`);
                        
                        // 返回模拟的sender_key响应
                        return new Response(JSON.stringify({
                            success: true,
                            sender_key: {
                                encrypted_key: null, // 离线模式下没有保存sender_key
                                sender_id: "offline_user",
                                channel_id: channelId,
                                version: 1
                            },
                            message: "离线模式下暂无sender_key数据"
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    
                    // 解析请求体数据
                    let data = {};
                    if (init && init.body) {
                        try {
                            data = JSON.parse(init.body);
                        } catch (e) {
                            self.log('无法解析请求数据:', e);
                        }
                    }
                    
                    // 提取URL中的用户ID (如 /api/crypto/get_public_key/123)
                    if (url.includes('/get_public_key/')) {
                        // 用更可靠的方式提取用户ID，处理可能包含特殊字符的Base64编码ID
                        const urlParts = url.split('/');
                        const userId = urlParts[urlParts.length - 1];
                        data.user_id = userId;
                        self.log(`从URL中提取用户ID: ${userId}`);
                    }
                    
                    // 使用离线API处理请求
                    const offlineResponse = await self.handleRequest(url, data);
                    
                    // 返回一个模拟的Response对象
                    return new Response(JSON.stringify(offlineResponse), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                
                // 对于其他未处理的异常，抛出原始错误
                throw error;
            }
        };
        
        this.log('已设置fetch请求拦截器');
    }
    
    /**
     * 保存状态到localStorage
     */
    saveState() {
        try {
            const state = {
                publicKeys: this.publicKeys,
                offlineMessages: this.offlineMessages,
                updatedAt: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (error) {
            console.error('保存离线API状态失败:', error);
        }
    }
    
    /**
     * 从localStorage加载状态
     */
    loadState() {
        try {
            const stateJson = localStorage.getItem(this.storageKey);
            if (stateJson) {
                const state = JSON.parse(stateJson);
                this.publicKeys = state.publicKeys || {};
                this.offlineMessages = state.offlineMessages || [];
                this.log('已从本地存储加载状态');
                this.log(`加载了${Object.keys(this.publicKeys).length}个公钥和${this.offlineMessages.length}条离线消息`);
            }
        } catch (error) {
            console.error('加载离线API状态失败:', error);
        }
    }
    
    /**
     * 记录日志
     * @param {string} message 日志消息
     * @private
     */
    log(message) {
        if (this.debug) {
            console.log(`[OfflineCryptoAPI] ${message}`);
        }
    }
}

// 创建离线API实例
window.offlineCryptoAPI = new OfflineCryptoAPI();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化离线加密API');
    window.offlineCryptoAPI.init();
    window.offlineCryptoAPI.setupFetchInterceptor();
}); 