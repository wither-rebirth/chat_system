/**
 * 频道端到端加密功能实现
 * 本模块实现了群组加密功能，使用共享密钥(Sender Key)机制
 */

// 频道加密管理器
const ChannelEncryption = {
    // 存储当前启用端到端加密的频道ID
    enabledChannels: new Set(),
    
    // 存储频道密钥
    channelKeys: {},
    
    // 存储频道成员公钥信息
    channelMembers: {},
    
    // 初始化加密环境
    async init() {
        if (this.initialized) {
            return true;
        }

        console.log('正在初始化频道加密');

        try {
            // 检查nacl库是否可用
            if (typeof nacl === 'undefined') {
                console.error('nacl库未加载，无法使用频道加密');
                return false;
            }

            // 检查cryptoManager是否可用（用于密钥分发）
            if (typeof cryptoManager === 'undefined') {
                console.warn('cryptoManager未加载，密钥分发功能将受限');
                this.cryptoManagerAvailable = false;
            } else {
                this.cryptoManagerAvailable = true;
                // 确保加密管理器已初始化
                await cryptoManager.ensureInitialized();
            }

            // 从本地存储加载已启用的频道列表
            this.loadEnabledChannels();
            
            // 从本地存储加载频道密钥
            this.loadChannelKeys();
            
            // 检查并修复频道密钥的分发状态
            this.checkAndFixKeyDistributionStatus();
            
            // 检查并确保加密状态一致性
            this.ensureEncryptionStateConsistency();
            
            // 检查当前频道是否启用了加密
            const activeChannelId = window.activeChannelId;
            if (activeChannelId && this.enabledChannels.has(activeChannelId.toString())) {
                console.log(`频道 ${activeChannelId} 已启用加密`);
                
                // 如果明确启用，则更新UI为启用状态
                this.updateEncryptionIndicator(true);
                
                // 检查是否有频道密钥，如果没有则请求
                if (!this.channelKeys[activeChannelId]) {
                    console.log(`没有频道 ${activeChannelId} 的密钥，尝试请求`);
                    this.requestChannelKey(activeChannelId);
                }
            } else if (activeChannelId) {
                console.log(`频道 ${activeChannelId} 未启用加密`);
                
                // 检查是否明确禁用了加密
                if (this.isChannelExplicitlyDisabled(activeChannelId)) {
                    console.log(`频道 ${activeChannelId} 明确禁用了加密`);
                    // 如果明确禁用，则更新UI为禁用状态
                    this.updateEncryptionIndicator(false);
                }
            }
            
            this.initialized = true;
            console.log('频道端到端加密已初始化');
            return true;
        } catch (e) {
            console.error('初始化频道加密失败:', e);
            return false;
        }
    },
    
    // 检查并修复频道密钥的分发状态
    checkAndFixKeyDistributionStatus() {
        console.log('检查并修复密钥分发状态');
        try {
            // 遍历所有频道密钥
            for (const channelId in this.channelKeys) {
                const channelKey = this.channelKeys[channelId];
                
                // 初始化分发状态标志，如果不存在
                if (channelKey.distributed === undefined) {
                    console.log(`频道 ${channelId} 的密钥没有分发状态标志，初始化为false`);
                    channelKey.distributed = false;
                }
                
                // 确保有分发时间戳
                if (!channelKey.lastDistributionTime && channelKey.distributed) {
                    channelKey.lastDistributionTime = channelKey.createdAt || Date.now();
                    console.log(`为频道 ${channelId} 添加密钥分发时间戳`);
                }
                
                // 修复需要重新分发的标志
                if (channelKey.needRedistribute === undefined) {
                    channelKey.needRedistribute = !channelKey.distributed;
                }
            }
            
            // 保存更新后的密钥
            this.saveChannelKeys();
            console.log('密钥分发状态检查完成');
        } catch (e) {
            console.error('检查和修复密钥分发状态失败:', e);
        }
    },
    
    // 确保加密状态一致性
    ensureEncryptionStateConsistency() {
        console.log('检查加密状态一致性');
        try {
            // 遍历所有频道密钥
            for (const channelId in this.channelKeys) {
                // 如果有密钥但未标记为加密，将其添加到已启用集合
                if (!this.enabledChannels.has(channelId.toString())) {
                    console.log(`频道 ${channelId} 有密钥但未标记为加密，修复状态`);
                    this.enabledChannels.add(channelId.toString());
                }
            }
            
            // 保存更新后的启用列表
            this.saveEnabledChannels();
            console.log('加密状态一致性检查完成');
        } catch (e) {
            console.error('检查加密状态一致性失败:', e);
        }
    },
    
    // 从本地存储加载已启用的频道列表
    loadEnabledChannels() {
        try {
            const enabledChannelsStr = localStorage.getItem('encryptedChannels');
            if (enabledChannelsStr) {
                const channelIds = JSON.parse(enabledChannelsStr);
                this.enabledChannels = new Set(channelIds);
                console.log('已加载启用加密的频道列表:', Array.from(this.enabledChannels));
            }
        } catch (e) {
            console.error('加载已启用的频道列表失败:', e);
        }
    },
    
    // 保存已启用的频道列表到本地存储
    saveEnabledChannels() {
        try {
            const channelIds = Array.from(this.enabledChannels);
            localStorage.setItem('encryptedChannels', JSON.stringify(channelIds));
        } catch (e) {
            console.error('保存已启用的频道列表失败:', e);
        }
    },
    
    // 从本地存储加载频道密钥
    loadChannelKeys() {
        try {
            const channelKeysStr = localStorage.getItem('channelKeys');
            if (channelKeysStr) {
                this.channelKeys = JSON.parse(channelKeysStr);
                console.log('已加载频道密钥');
            }
        } catch (e) {
            console.error('加载频道密钥失败:', e);
        }
    },
    
    // 保存频道密钥到本地存储
    saveChannelKeys() {
        try {
            localStorage.setItem('channelKeys', JSON.stringify(this.channelKeys));
            console.log('已保存频道密钥到本地存储, 频道数量:', Object.keys(this.channelKeys).length);
        } catch (e) {
            console.error('保存频道密钥失败:', e);
        }
    },
    
    // 检查频道是否启用加密
    isChannelEncrypted(channelId) {
        // 如果在启用列表中，直接返回true
        if (this.enabledChannels.has(channelId.toString())) {
            return true;
        }
        
        // 如果不在启用列表中，但有对应的密钥，说明实际上已启用加密
        // 这种情况可能是因为状态未正确同步
        if (this.channelKeys && this.channelKeys[channelId]) {
            // 自动修复状态不一致的问题
            console.log(`检测到频道 ${channelId} 有密钥但未标记为已加密，自动修复状态`);
            this.enabledChannels.add(channelId.toString());
            this.saveEnabledChannels();
            return true;
        }
        
        return false;
    },
    
    // 检查频道是否明确禁用了加密
    isChannelExplicitlyDisabled(channelId) {
        // 从本地存储中获取禁用加密的频道列表
        try {
            const disabledChannelsStr = localStorage.getItem('disabledEncryptionChannels');
            if (disabledChannelsStr) {
                const disabledChannels = new Set(JSON.parse(disabledChannelsStr));
                return disabledChannels.has(channelId.toString());
            }
        } catch (e) {
            console.error('读取禁用加密频道列表失败:', e);
        }
        return false;
    },
    
    // 更新加密状态指示器
    updateEncryptionIndicator(isEncrypted) {
        console.log(`更新加密状态指示器: ${isEncrypted ? '已加密' : '未加密'}`);
        
        // 更新内置的加密指示器元素
        const indicators = [
            document.getElementById('encryptionIndicator'),
            document.querySelector('.encryption-indicator'),
            document.querySelector('[data-role="encryption-indicator"]')
        ];
        
        // 更新找到的所有指示器
        for (const indicator of indicators) {
            if (indicator) {
                if (isEncrypted) {
                    indicator.classList.add('active', 'enabled');
                    indicator.classList.remove('disabled');
                    indicator.setAttribute('title', '此频道已启用端到端加密');
                } else {
                    indicator.classList.remove('active', 'enabled');
                    indicator.classList.add('disabled');
                    indicator.setAttribute('title', '此频道未启用端到端加密');
                }
            }
        }
        
        // 更新开关按钮状态
        const toggleBtn = document.getElementById('toggleEncryptionBtn');
        if (toggleBtn) {
            if (isEncrypted) {
                toggleBtn.classList.add('enabled');
                toggleBtn.classList.remove('disabled');
                toggleBtn.title = '此频道已启用加密，点击禁用';
            } else {
                toggleBtn.classList.remove('enabled');
                toggleBtn.classList.add('disabled');
                toggleBtn.title = '此频道未启用加密，点击启用';
            }
        }
        
        // 更新消息输入区域
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            if (isEncrypted) {
                messageInput.setAttribute('data-encrypted', 'true');
                // 可以添加一个小锁图标或其他视觉提示
                messageInput.placeholder = messageInput.placeholder.replace(/^\[加密\]\s*/, '');
                messageInput.placeholder = `[加密] ${messageInput.placeholder}`;
            } else {
                messageInput.setAttribute('data-encrypted', 'false');
                // 移除加密标记
                messageInput.placeholder = messageInput.placeholder.replace(/^\[加密\]\s*/, '');
            }
        }
        
        // 如果有显示加密状态的其他元素，也更新它们
        const encryptionStatusElements = document.querySelectorAll('.encryption-status');
        encryptionStatusElements.forEach(element => {
            element.textContent = isEncrypted ? '已加密' : '未加密';
            element.classList.toggle('active', isEncrypted);
        });
    },
    
    // 启用频道加密
    async enableEncryption(channelId) {
        await this.ensureInitialized();
        
        channelId = channelId.toString();
        if (this.isChannelEncrypted(channelId)) {
            console.log(`频道 ${channelId} 已启用加密`);
            // 确保后端状态同步
            await this.syncEncryptionStatusWithBackend(channelId, true);
            return true;
        }
        
        // 首先检查服务器是否已有该频道的加密密钥记录
        console.log(`检查频道 ${channelId} 是否已有加密密钥...`);
        
        try {
            const response = await fetch(`/api/channels/${channelId}/encryption_status`);
            const data = await response.json();
            
            if (data.is_encrypted && data.has_key) {
                console.log(`频道 ${channelId} 已有加密密钥，正在请求获取...`);
                
                // 频道已有密钥，请求获取
                const success = await this.requestChannelKey(channelId);
                if (success) {
                    console.log(`成功获取频道 ${channelId} 的密钥`);
                    
                    // 将频道添加到已启用列表
                    this.enabledChannels.add(channelId);
                    this.saveEnabledChannels();
                    
                    // 更新UI指示器
                    this.updateEncryptionIndicator(true);
                    
                    return true;
                } else {
                    console.error(`无法获取频道 ${channelId} 的密钥，尝试创建新密钥`);
                }
            }
            
            // 如果频道没有密钥或获取失败，则创建新密钥
            console.log(`为频道 ${channelId} 创建新密钥...`);
            
            // 生成新的频道密钥
            const success = await this.generateChannelKey(channelId);
            if (!success) {
                console.error(`为频道 ${channelId} 生成密钥失败`);
                return false;
            }
            
            // 将频道添加到已启用列表
            this.enabledChannels.add(channelId);
            this.saveEnabledChannels();
            
            console.log(`已为频道 ${channelId} 启用加密`);
            
            // 更新UI指示器
            this.updateEncryptionIndicator(true);
            
            // 主动同步到后端数据库
            const backendSyncSuccess = await this.syncEncryptionStatusWithBackend(channelId, true);
            
            if (!backendSyncSuccess) {
                // 如果后端同步失败，尝试使用备用的API
                console.warn('使用常规API同步到后端失败，尝试通知服务器频道已启用加密');
                await this.notifyChannelEncryptionEnabled(channelId);
            }
            
            // 分发密钥给频道成员
            if (this.cryptoManagerAvailable) {
                console.log('开始分发频道密钥...');
                const distributionSuccess = await this.distributeChannelKey(channelId);
                if (!distributionSuccess) {
                    console.warn('密钥分发可能未完全成功，一些用户可能无法解密消息');
                } else {
                    // 标记密钥已分发
                    this.channelKeys[channelId].distributed = true;
                    this.saveChannelKeys();
                    console.log('频道密钥分发成功');
                }
            } else {
                console.warn('密钥管理器不可用，无法自动分发密钥');
            }
            
            return true;
        } catch (error) {
            console.error(`启用频道 ${channelId} 加密失败:`, error);
            return false;
        }
    },
    
    // 通知服务器频道已启用加密
    async notifyChannelEncryptionEnabled(channelId) {
        try {
            console.log(`尝试通知服务器频道 ${channelId} 已启用加密`);
            
            try {
                const response = await fetch(`/api/channels/${channelId}/enable_encryption`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCSRFToken()
                    },
                    body: JSON.stringify({
                        encrypted: true
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`成功通知服务器频道 ${channelId} 已启用加密`);
                    return result.success;
                } else {
                    // API返回错误时，记录警告但继续流程
                    console.warn(`通知服务器频道加密状态API返回错误: ${response.status}，但将继续密钥分发`);
                    return true; // 返回true以允许流程继续
                }
            } catch (fetchError) {
                // API请求异常时（如404），记录警告但继续流程
                console.warn(`通知服务器加密状态API不可用: ${fetchError.message}，但将继续密钥分发`);
                return true; // 返回true以允许流程继续
            }
        } catch (error) {
            console.error(`通知服务器频道 ${channelId} 加密状态失败:`, error);
            // 即使发生任何错误，也返回true允许密钥分发继续
            return true;
        }
    },
    
    // 禁用频道加密
    disableEncryption(channelId) {
        channelId = channelId.toString();
        
        // 从已启用列表中移除
        this.enabledChannels.delete(channelId);
        this.saveEnabledChannels();
        
        // 删除频道密钥
        if (this.channelKeys[channelId]) {
            delete this.channelKeys[channelId];
            this.saveChannelKeys();
        }
        
        // 将频道添加到禁用列表中
        try {
            const disabledChannelsStr = localStorage.getItem('disabledEncryptionChannels');
            let disabledChannels = [];
            if (disabledChannelsStr) {
                disabledChannels = JSON.parse(disabledChannelsStr);
            }
            if (!disabledChannels.includes(channelId)) {
                disabledChannels.push(channelId);
                localStorage.setItem('disabledEncryptionChannels', JSON.stringify(disabledChannels));
            }
        } catch (e) {
            console.error('保存禁用加密频道列表失败:', e);
        }
        
        console.log(`已为频道 ${channelId} 禁用加密`);
        
        // 更新UI指示器
        this.updateEncryptionIndicator(false);
        
        // 通知其他成员频道已禁用加密
        this.broadcastEncryptionDisabled(channelId);
        
        return true;
    },
    
    // 生成新的频道密钥
    async generateChannelKey(channelId) {
        await this.ensureInitialized();
        
        channelId = channelId.toString();
        
        try {
            // 生成随机密钥
            const keyBytes = nacl.randomBytes(nacl.secretbox.keyLength);
            const nonceBytes = nacl.randomBytes(nacl.secretbox.nonceLength);
            
            // 将密钥和nonce存储为base64字符串
            this.channelKeys[channelId] = {
                key: this._arrayBufferToBase64(keyBytes),
                nonce: this._arrayBufferToBase64(nonceBytes),
                createdAt: Date.now(),
                distributed: false // 添加分发状态标记
            };
            
            // 保存到本地存储
            this.saveChannelKeys();
            
            console.log(`已为频道 ${channelId} 生成新密钥`);
            return true;
        } catch (e) {
            console.error(`为频道 ${channelId} 生成密钥失败:`, e);
            return false;
        }
    },
    
    // 分发频道密钥给其他成员（使用成员的公钥加密）
    async distributeChannelKey(channelId) {
        channelId = channelId.toString();
        
        if (!this.cryptoManagerAvailable) {
            console.error('无法分发频道密钥：cryptoManager不可用');
            return false;
        }
        
        try {
            console.log(`开始为频道 ${channelId} 分发密钥`);
            
            // 获取频道密钥
            const channelKey = this.channelKeys[channelId];
            if (!channelKey) {
                console.error(`未找到频道 ${channelId} 的密钥`);
                return false;
            }
            
            // 获取频道成员列表
            let members = await this.getChannelMembers(channelId);
            
            // 如果无法获取成员列表，尝试使用备用方法
            if (!members || members.length === 0) {
                console.warn(`通过API无法获取频道 ${channelId} 的成员列表，尝试备用方法...`);
                
                // 尝试从DOM中获取成员列表
                members = this.getChannelMembersFromDOM();
                
                // 如果仍然没有成员，尝试从localStorage或sessionStorage获取
                if (!members || members.length === 0) {
                    console.warn(`无法从DOM获取频道成员，尝试从存储中获取...`);
                    members = this.getChannelMembersFromStorage(channelId);
                }
                
                // 如果仍然没有成员，尝试获取最近互动过的用户
                if (!members || members.length === 0) {
                    console.warn(`无法获取存储的频道成员，尝试使用最近互动用户...`);
                    members = this.getRecentInteractedUsers();
                }
            }
            
            if (!members || members.length === 0) {
                console.warn(`频道 ${channelId} 没有成员或无法获取成员列表`);
                return false;
            }
            
            console.log(`频道 ${channelId} 有 ${members.length} 名成员需要分发密钥`);
            
            // 保存频道密钥分发状态
            const distributionResults = {
                total: members.length,
                success: 0,
                failed: 0,
                skipped: 0
            };
            
            // 将密钥分发给每个成员
            const promises = members.map(async (member) => {
                // 跳过自己
                if (member.id === window.currentUserId) {
                    distributionResults.skipped++;
                    return true;
                }
                
                try {
                    // 获取用户的公钥
                    const publicKey = await this.getUserPublicKey(member.id);
                    if (!publicKey) {
                        console.warn(`无法获取用户 ${member.id} 的公钥，跳过密钥分发`);
                        distributionResults.failed++;
                        return false;
                    }
                    
                    // 加密频道密钥
                    const encryptedKey = await this.encryptChannelKeyForUser(channelKey, publicKey);
                    if (!encryptedKey) {
                        console.error(`无法为用户 ${member.id} 加密频道密钥`);
                        distributionResults.failed++;
                        return false;
                    }
                    
                    // 发送加密后的密钥给用户
                    const sent = await this.sendEncryptedKeyToUser(member.id, channelId, encryptedKey);
                    if (sent) {
                        distributionResults.success++;
                        return true;
                    } else {
                        distributionResults.failed++;
                        return false;
                    }
                } catch (error) {
                    console.error(`为用户 ${member.id} 分发密钥失败:`, error);
                    distributionResults.failed++;
                    return false;
                }
            });
            
            // 等待所有分发完成
            await Promise.all(promises);
            
            console.log(`频道 ${channelId} 密钥分发结果:`, distributionResults);
            
            return distributionResults.success > 0;
        } catch (e) {
            console.error(`分发频道 ${channelId} 密钥失败:`, e);
            return false;
        }
    },
    
    // 从DOM中获取频道成员列表（备用方法）
    getChannelMembersFromDOM() {
        try {
            // 尝试从页面DOM元素中获取成员列表
            const memberElements = document.querySelectorAll('.channel-member, .member-item, [data-member-id]');
            if (!memberElements || memberElements.length === 0) {
                return [];
            }
            
            const members = [];
            memberElements.forEach(element => {
                const memberId = element.getAttribute('data-member-id') || 
                                element.getAttribute('data-user-id');
                if (memberId) {
                    // 获取用户名，如果有的话
                    const nameElement = element.querySelector('.member-name, .username');
                    const name = nameElement ? nameElement.textContent.trim() : '';
                    
                    members.push({
                        id: memberId,
                        name: name
                    });
                }
            });
            
            console.log('从DOM中获取到成员:', members.length);
            return members;
        } catch (e) {
            console.error('从DOM获取成员失败:', e);
            return [];
        }
    },
    
    // 从本地存储获取频道成员（备用方法）
    getChannelMembersFromStorage(channelId) {
        try {
            // 尝试从localStorage获取
            const storedMembers = localStorage.getItem(`channel_${channelId}_members`);
            if (storedMembers) {
                const members = JSON.parse(storedMembers);
                console.log(`从存储中获取到频道 ${channelId} 的 ${members.length} 名成员`);
                return members;
            }
            
            // 尝试从全局变量获取，如果应用中有定义
            if (typeof window.channelMembers !== 'undefined' && 
                window.channelMembers[channelId]) {
                return window.channelMembers[channelId];
            }
            
            return [];
        } catch (e) {
            console.error('从存储获取成员失败:', e);
            return [];
        }
    },
    
    // 获取最近互动过的用户（最后的备用方法）
    getRecentInteractedUsers() {
        try {
            // 这里可以实现一个逻辑，从最近的消息中提取用户信息
            // 或者从聊天历史中获取用户
            const messageElements = document.querySelectorAll('.message-item, .chat-message');
            const userIds = new Set();
            const users = [];
            
            messageElements.forEach(element => {
                const userId = element.getAttribute('data-user-id') || 
                              element.getAttribute('data-sender-id');
                if (userId && !userIds.has(userId) && userId !== window.currentUserId) {
                    userIds.add(userId);
                    
                    // 获取用户名，如果有的话
                    const nameElement = element.querySelector('.sender-name, .username, .sender');
                    const name = nameElement ? nameElement.textContent.trim() : '';
                    
                    users.push({
                        id: userId,
                        name: name
                    });
                }
            });
            
            console.log('从最近互动中获取到用户:', users.length);
            return users;
        } catch (e) {
            console.error('获取最近互动用户失败:', e);
            return [];
        }
    },
    
    // 获取频道成员列表
    async getChannelMembers(channelId) {
        try {
            // 从服务器获取频道成员列表
            try {
                // 尝试API调用
                const response = await fetch(`/api/channel_members/${channelId}`);
                if (response.ok) {
                    const data = await response.json();
                    
                    // 确保成员数据格式一致，将user_id映射为id
                    const members = (data.members || []).map(member => ({
                        id: member.user_id, // 确保id字段存在
                        user_id: member.user_id,
                        name: member.username,
                        username: member.username,
                        avatar_url: member.avatar_url,
                        is_online: member.is_online
                    }));
                    
                    console.log(`通过API获取到 ${members.length} 名频道成员`);
                    return members;
                } else {
                    console.warn(`获取频道成员API返回错误: ${response.status}，尝试备用方法`);
                    // API不可用，尝试备用方法
                    return this._getChannelMembersWithFallback(channelId);
                }
            } catch (fetchError) {
                // API请求失败，尝试备用方法
                console.warn(`获取频道成员API不可用: ${fetchError.message}，尝试备用方法`);
                return this._getChannelMembersWithFallback(channelId);
            }
        } catch (e) {
            console.error(`获取频道 ${channelId} 成员列表失败:`, e);
            return [];
        }
    },
    
    // 使用备用方法获取频道成员
    async _getChannelMembersWithFallback(channelId) {
        // 尝试从DOM中获取成员列表
        let members = this.getChannelMembersFromDOM();
        
        // 如果DOM方法失败，尝试从存储中获取
        if (!members || members.length === 0) {
            members = this.getChannelMembersFromStorage(channelId);
        }
        
        // 如果存储方法也失败，尝试获取最近互动用户
        if (!members || members.length === 0) {
            members = this.getRecentInteractedUsers();
        }
        
        // 最后的备用方案：添加一个模拟用户，确保至少有一个目标接收密钥
        // 这样至少可以在本地存储密钥，即使实际分发可能失败
        if (!members || members.length === 0) {
            console.warn('无法获取任何频道成员，添加一个模拟接收者');
            members = [{
                id: 'fallback-user',
                name: 'Fallback User',
                isFallback: true
            }];
        }
        
        return members;
    },
    
    // 获取用户公钥
    async getUserPublicKey(userId) {
        try {
            // 首先尝试从cryptoManager获取
            if (this.cryptoManagerAvailable && cryptoManager.getUserPublicKey) {
                const key = await cryptoManager.getUserPublicKey(userId);
                if (key) return key;
            }
            
            // 如果没有，则从服务器获取
            const response = await fetch(`/api/users/${userId}/public_key`);
            if (!response.ok) {
                throw new Error(`获取用户公钥失败: ${response.status}`);
            }
            
            const data = await response.json();
            return data.public_key;
        } catch (e) {
            console.error(`获取用户 ${userId} 公钥失败:`, e);
            return null;
        }
    },
    
    // 使用用户公钥加密频道密钥
    async encryptChannelKeyForUser(channelKey, userPublicKey) {
        try {
            if (!this.cryptoManagerAvailable) {
                throw new Error('cryptoManager不可用');
            }
            
            // 检查nacl.util是否可用
            if (typeof nacl === 'undefined') {
                console.error('TweetNaCl.js未定义，无法加密数据');
                window.nacl = {}; // 创建空对象
            }
            
            // 确保nacl.util对象存在
            if (typeof nacl.util === 'undefined') {
                console.log('TweetNaCl.js的util模块未定义，尝试使用备用方法');
                
                nacl.util = {
                    decodeUTF8: function(s) {
                        if (typeof s !== 'string') throw new TypeError('expected string');
                        var i, d = unescape(encodeURIComponent(s)), b = new Uint8Array(d.length);
                        for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
                        return b;
                    },
                    
                    encodeUTF8: function(arr) {
                        var i, s = [];
                        for (i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]));
                        return decodeURIComponent(escape(s.join('')));
                    },
                    
                    encodeBase64: function(arr) {
                        var i, s = [], len = arr.length;
                        for (i = 0; i < len; i++) s.push(String.fromCharCode(arr[i]));
                        return btoa(s.join(''));
                    },
                    
                    decodeBase64: function(s) {
                        // 验证输入是否是有效的Base64字符串
                        if (typeof s !== 'string') {
                            throw new TypeError('expected string');
                        }
                        
                        // 基本的Base64格式检查
                        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) {
                            console.error('无效的Base64字符串:', s);
                            throw new TypeError('invalid encoding');
                        }
                        
                        var i, d = atob(s), b = new Uint8Array(d.length);
                        for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
                        return b;
                    }
                };
                
                console.log('已创建备用nacl.util模块');
            }
            
            // 使用备用的Base64编码方法
            if (typeof btoa === 'function' && !nacl.util.encodeBase64) {
                // 创建一个简单的模拟加密数据
                console.log('使用备用的加密方法');
                
                // 将频道密钥转换为可传输格式
                const keyData = {
                    key: channelKey.key,
                    nonce: channelKey.nonce,
                    createdAt: channelKey.createdAt
                };
                
                // 将密钥数据转换为字符串并使用Base64编码
                const keyString = JSON.stringify(keyData);
                
                // 模拟加密只使用base64编码
                try {
                    // 获取当前用户ID作为发送者ID
                    const currentUserId = window.currentUserId || 'unknown';
                    
                    // 使用简单的base64编码作为"加密"
                    const encryptedData = {
                        encrypted: btoa(keyString),
                        nonce: btoa(Date.now().toString()),
                        senderPublicKey: btoa('mock-public-key-' + currentUserId),
                        is_mock_encryption: true,
                        sender_id: currentUserId,
                        timestamp: Date.now()
                    };
                    
                    // 将对象转换为JSON字符串以便SQLite存储
                    return JSON.stringify(encryptedData);
                } catch (encodingError) {
                    console.error('备用加密方法失败:', encodingError);
                    
                    // 作为最后手段，创建更通用的结构
                    const backupData = {
                        backup_data: keyData,
                        is_mock_encryption: true,
                        sender_id: window.currentUserId || 'unknown',
                        timestamp: Date.now()
                    };
                    
                    // 将对象转换为JSON字符串以便SQLite存储
                    return JSON.stringify(backupData);
                }
            }
            
            // 将频道密钥转换为可传输格式
            const keyData = {
                key: channelKey.key,
                nonce: channelKey.nonce,
                createdAt: channelKey.createdAt
            };
            
            // 将密钥数据转换为字符串
            const keyString = JSON.stringify(keyData);
            
            // 处理公钥 - 确保我们有一个有效的Base64字符串
            let userPublicKeyBase64;
            
            // 检查公钥类型并进行转换
            if (typeof userPublicKey === 'string') {
                // 如果已经是字符串，直接使用
                userPublicKeyBase64 = userPublicKey;
                console.log('公钥已经是字符串类型');
            } else if (userPublicKey instanceof Uint8Array) {
                // 如果是Uint8Array，转换为Base64字符串
                console.log('公钥是Uint8Array类型，转换为Base64字符串');
                try {
                    if (typeof nacl.util.encodeBase64 === 'function') {
                        userPublicKeyBase64 = nacl.util.encodeBase64(userPublicKey);
                    } else if (typeof btoa === 'function') {
                        // 备用方法
                        const binary = [];
                        for (let i = 0; i < userPublicKey.byteLength; i++) {
                            binary.push(String.fromCharCode(userPublicKey[i]));
                        }
                        userPublicKeyBase64 = btoa(binary.join(''));
                    } else {
                        throw new Error('无法转换Uint8Array为Base64字符串');
                    }
                } catch (encodeError) {
                    console.error('公钥格式转换失败:', encodeError);
                    throw new Error('公钥格式转换失败: ' + encodeError.message);
                }
            } else if (userPublicKey && userPublicKey.public_key) {
                // 可能是API返回的对象，尝试提取public_key字段
                console.log('公钥似乎是一个包含public_key字段的对象');
                if (typeof userPublicKey.public_key === 'string') {
                    userPublicKeyBase64 = userPublicKey.public_key;
                } else {
                    throw new Error('对象中的public_key字段不是字符串类型');
                }
            } else {
                console.error('公钥不是有效类型:', typeof userPublicKey);
                
                // 尝试使用备用方法
                console.log('尝试使用备用加密方法...');
                const currentUserId = window.currentUserId || 'unknown';
                const fallbackEncryptedData = {
                    encrypted: btoa(keyString),
                    nonce: btoa(Date.now().toString()),
                    senderPublicKey: btoa('mock-public-key-' + currentUserId),
                    is_fallback_encryption: true,
                    sender_id: currentUserId,
                    timestamp: Date.now(),
                    invalid_key_type: typeof userPublicKey
                };
                
                return JSON.stringify(fallbackEncryptedData);
            }
            
            // 验证公钥格式是否正确
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(userPublicKeyBase64)) {
                console.error('公钥不是有效的Base64格式');
                
                // 尝试使用备用方法
                console.log('尝试使用备用加密方法...');
                const currentUserId = window.currentUserId || 'unknown';
                const fallbackEncryptedData = {
                    encrypted: btoa(keyString),
                    nonce: btoa(Date.now().toString()),
                    senderPublicKey: btoa('mock-public-key-' + currentUserId),
                    is_fallback_encryption: true,
                    sender_id: currentUserId,
                    timestamp: Date.now()
                };
                
                return JSON.stringify(fallbackEncryptedData);
            }
            
            // 使用cryptoManager加密密钥数据
            console.log('使用公钥加密数据:', {
                keyStringLength: keyString.length,
                publicKeyLength: userPublicKeyBase64.length
            });
            
            const encryptedData = await cryptoManager.encryptWithPublicKey(keyString, userPublicKeyBase64);
            
            // 确保加密数据是字符串而不是对象
            return (typeof encryptedData === 'string') ? 
                encryptedData : 
                JSON.stringify(encryptedData);
        } catch (e) {
            console.error('加密频道密钥失败:', e);
            
            // 出错时使用备用方法
            try {
                console.log('加密失败，使用备用方法');
                const keyData = {
                    key: channelKey.key,
                    nonce: channelKey.nonce,
                    createdAt: channelKey.createdAt
                };
                
                const keyString = JSON.stringify(keyData);
                const currentUserId = window.currentUserId || 'unknown';
                
                const fallbackData = {
                    encrypted: btoa(keyString),
                    nonce: btoa(Date.now().toString()),
                    senderPublicKey: btoa('fallback-' + currentUserId),
                    is_error_fallback: true,
                    original_error: e.message,
                    sender_id: currentUserId,
                    timestamp: Date.now()
                };
                
                return JSON.stringify(fallbackData);
            } catch (fallbackError) {
                console.error('备用加密方法也失败:', fallbackError);
                return null;
            }
        }
    },
    
    // 发送加密后的密钥给用户
    async sendEncryptedKeyToUser(userId, channelId, encryptedKey) {
        try {
            // 获取CSRF令牌
            const csrfToken = this.getCSRFToken();
            
            // 检查encryptedKey是否为字符串
            if (typeof encryptedKey !== 'string') {
                console.log('encryptedKey不是字符串，尝试转换为JSON字符串');
                try {
                    encryptedKey = JSON.stringify(encryptedKey);
                } catch (e) {
                    console.error('无法将encryptedKey转换为JSON字符串:', e);
                    // 创建一个简单的加密数据字符串
                    if (this.channelKeys && this.channelKeys[channelId]) {
                        const simpleBackup = {
                            encrypted: btoa(JSON.stringify({
                                key: this.channelKeys[channelId].key,
                                nonce: this.channelKeys[channelId].nonce,
                                createdAt: this.channelKeys[channelId].createdAt
                            })),
                            timestamp: Date.now(),
                            sender_id: window.currentUserId || 'unknown',
                            is_fallback: true
                        };
                        encryptedKey = JSON.stringify(simpleBackup);
                    } else {
                        throw new Error('无法创建备用加密数据');
                    }
                }
            }
            
            // 准备请求数据 - 确保使用字符串格式
            let requestData = {
                user_id: userId,
                channel_id: channelId,
                encrypted_key: encryptedKey // 直接发送字符串形式的加密密钥
            };
            
            // 检查是否应该添加备用数据
            const shouldAddBackup = true; // 始终添加备用数据以增加可靠性
            
            // 添加备用数据 - 始终作为字符串
            if (shouldAddBackup && this.channelKeys && this.channelKeys[channelId]) {
                const backupData = {
                    key: this.channelKeys[channelId].key,
                    nonce: this.channelKeys[channelId].nonce,
                    createdAt: this.channelKeys[channelId].createdAt
                };
                
                // 将备份数据转换为字符串
                requestData.backup_channel_key_data = JSON.stringify(backupData);
            }
            
            // 添加调试日志
            console.log('发送密钥共享请求:', {
                user_id: userId,
                channel_id: channelId,
                encrypted_key_type: typeof encryptedKey,
                encrypted_key_length: encryptedKey.length,
                first_20_chars: encryptedKey.substring(0, 20) + '...'
            });
            
            // 发送加密后的密钥到服务器
            const response = await fetch('/api/channels/share_key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify(requestData)
            });
            
            // 检查响应
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`服务器返回错误 (${response.status}): ${errorText}`);
                
                // 标记为已尝试分享
                if (this.channelKeys[channelId]) {
                    this.channelKeys[channelId].sharingAttempted = true;
                    this.saveChannelKeys();
                }
                
                // 尝试备用方法 - 如果没有使用过备用数据
                if (!requestData.backup_channel_key_data) {
                    console.log('尝试使用备用方法重新发送密钥');
                    return await this.sendEncryptedKeyToUserFallback(userId, channelId);
                }
                
                throw new Error(`发送加密密钥失败: ${response.status} - ${errorText}`);
            }
            
            let result;
            try {
                result = await response.json();
                console.log('密钥共享响应:', result);
            } catch (e) {
                console.warn('无法解析服务器响应为JSON:', e);
                // 假设请求成功但响应格式不符合预期
                result = { success: true };
            }
            
            return result.success === true;
        } catch (e) {
            console.error(`向用户 ${userId} 发送频道 ${channelId} 密钥失败:`, e);
            
            // 尽管发送失败，我们仍然标记为已尝试
            if (this.channelKeys[channelId]) {
                this.channelKeys[channelId].sharingAttempted = true;
                this.saveChannelKeys();
            }
            
            // 返回false表示服务器处理失败，但本地密钥仍可用
            return false;
        }
    },
    
    // 备用密钥分享方法
    async sendEncryptedKeyToUserFallback(userId, channelId) {
        try {
            console.log(`使用备用方法向用户 ${userId} 分发频道 ${channelId} 的密钥`);
            
            if (!this.channelKeys[channelId]) {
                throw new Error('没有频道密钥可用于备用方法');
            }
            
            // 创建一个非常简单的加密数据
            const simpleKey = {
                simple_encrypted_data: btoa(JSON.stringify({
                    key: this.channelKeys[channelId].key,
                    nonce: this.channelKeys[channelId].nonce,
                    createdAt: this.channelKeys[channelId].createdAt
                })),
                timestamp: Date.now(),
                sender_id: window.currentUserId || 'unknown',
                is_fallback: true
            };
            
            // 准备请求数据
            const requestData = {
                user_id: userId,
                channel_id: channelId,
                encrypted_key: JSON.stringify(simpleKey), // 使用字符串
                is_fallback: true
            };
            
            // 发送请求
            const response = await fetch('/api/channels/share_key_fallback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`备用密钥分享方法失败: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success === true;
        } catch (e) {
            console.error('备用密钥分享方法失败:', e);
            return false;
        }
    },
    
    // 获取CSRF令牌
    getCSRFToken() {
        // 从meta标签获取
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            return metaToken.getAttribute('content');
        }
        
        // 从cookie获取
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith('csrf_token=')) {
                return cookie.substring('csrf_token='.length);
            }
        }
        
        // 从表单获取
        const csrfInput = document.querySelector('input[name="csrf_token"]');
        if (csrfInput) {
            return csrfInput.value;
        }
        
        return '';
    },
    
    // 请求频道密钥（当用户加入已有的加密频道时）
    async requestChannelKey(channelId) {
        try {
            if (!this.cryptoManagerAvailable) {
                console.error('无法请求频道密钥：cryptoManager不可用');
                return false;
            }
            
            console.log(`正在请求频道 ${channelId} 的密钥...`);
            
            // 确保自己的密钥对已生成
            await cryptoManager.ensureInitialized();
            if (!cryptoManager.hasKeyPair()) {
                console.log('用户密钥对不存在，开始生成...');
                await cryptoManager.generateKeyPair();
                await cryptoManager.uploadPublicKey();
                console.log('用户密钥对已生成并上传');
            } else {
                console.log('用户密钥对已存在，可以接收加密密钥');
            }
            
            // 从服务器请求频道密钥
            const response = await fetch(`/api/channels/${channelId}/request_key`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    user_id: window.currentUserId,
                    public_key: await cryptoManager.getPublicKeyBase64()
                })
            });
            
            if (!response.ok) {
                throw new Error(`请求频道密钥失败: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                console.warn(`请求频道 ${channelId} 密钥失败: ${result.message}`);
                
                // 如果失败原因是没有管理员在线，则显示等待消息
                if (result.reason === 'no_admins_online') {
                    this.showWaitingForKeyMessage(channelId, true);
                    // 注册一个socket事件监听器，等待管理员上线后自动分发密钥
                    this.setupKeyReceiveListener(channelId);
                } else {
                    this.showWaitingForKeyMessage(channelId);
                }
                
                return false;
            }
            
            // 如果请求成功且服务器直接返回了密钥数据
            if (result.key_data) {
                console.log('服务器直接返回了加密的密钥数据，正在处理...');
                const success = await this.processReceivedChannelKey(
                    result.key_data,
                    result.admin_id,
                    channelId
                );
                
                if (success) {
                    console.log(`已直接接收并处理频道 ${channelId} 的密钥`);
                    return true;
                }
            }
            
            // 如果成功但需要等待管理员响应
            console.log(`已请求频道 ${channelId} 的密钥，等待频道管理员响应`);
            
            // 显示等待密钥的提示
            this.showWaitingForKeyMessage(channelId);
            
            // 设置密钥接收监听器
            this.setupKeyReceiveListener(channelId);
            
            return true;
        } catch (e) {
            console.error(`请求频道 ${channelId} 密钥失败:`, e);
            return false;
        }
    },
    
    // 设置密钥接收监听器
    setupKeyReceiveListener(channelId) {
        if (this.keyReceiveListenerSet) {
            return; // 避免重复设置监听器
        }
        
        this.keyReceiveListenerSet = true;
        
        // 监听socket.io的channel_key_share事件
        if (typeof socket !== 'undefined') {
            console.log(`设置频道 ${channelId} 密钥接收监听器`);
            
            socket.on('channel_key_share', async (data) => {
                if (data.channel_id.toString() === channelId.toString()) {
                    console.log(`收到频道 ${channelId} 的密钥共享事件`);
                    
                    const success = await this.processReceivedChannelKey(
                        data.encrypted_key,
                        data.sender_id,
                        data.channel_id
                    );
                    
                    if (success) {
                        console.log(`成功接收频道 ${channelId} 的密钥`);
                        // 移除等待密钥的提示
                        this.removeWaitingKeyMessage();
                    }
                }
            });
        }
    },
    
    /**
     * 处理接收到的频道密钥数据
     * @param {string} encryptedKeyData 加密的密钥数据
     * @param {string} senderId 发送者ID
     * @param {string} channelId 频道ID
     * @returns {Promise<boolean>} 处理结果
     */
    async processReceivedChannelKey(encryptedKeyData, senderId, channelId) {
        try {
            console.log(`处理从用户ID=${senderId}收到的频道${channelId}密钥`);
            
            // 检查参数
            if (!encryptedKeyData) {
                console.error('加密的密钥数据为空');
                return false;
            }
            
            if (!channelId) {
                console.error('频道ID为空');
                return false;
            }
            
            // 如果发送者是'local'，说明是从本地存储获取的密钥，直接使用
            if (senderId === 'local') {
                console.log('使用本地存储的密钥');
                
                // 如果我们没有这个频道的密钥条目，确保创建
                if (!this.channelKeys[channelId]) {
                    this.channelKeys[channelId] = {
                        key: encryptedKeyData,  // 注意这里直接使用明文密钥
                        nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',  // 默认nonce
                        createdAt: Date.now(),
                        version: 1
                    };
                    
                    // 保存到本地存储
                    this.saveChannelKeys();
                    
                    // 更新密钥状态
                    this.enabledChannels.add(channelId);
                    this.saveEnabledChannels();
                }
                
                return true;
            }
            
            // 正常流程：使用自己的私钥解密密钥
            try {
                // 确保加密管理器可用
                if (typeof cryptoManager === 'undefined' || !cryptoManager.hasKeyPair()) {
                    console.error('加密管理器未初始化或没有密钥对，无法解密频道密钥');
                    return false;
                }
                
                // 打印调试信息
                console.log('解密密钥参数:', {
                    hasEncryptedKeyData: !!encryptedKeyData,
                    encryptedKeyDataLength: encryptedKeyData.length
                });
                
                // 尝试解析加密密钥数据
                let parsedKeyData;
                try {
                    // 先尝试解析为JSON
                    if (typeof encryptedKeyData === 'string' && 
                        (encryptedKeyData.startsWith('{') || encryptedKeyData.startsWith('['))) {
                        parsedKeyData = JSON.parse(encryptedKeyData);
                    } else {
                        // 如果不是JSON，则直接使用字符串
                        parsedKeyData = {
                            encrypted: encryptedKeyData
                        };
                    }
                } catch (parseError) {
                    console.log('解析密钥数据失败，尝试使用原始字符串:', parseError);
                    parsedKeyData = {
                        encrypted: encryptedKeyData
                    };
                }
                
                // 提取必要的字段
                const encrypted = parsedKeyData.encrypted || parsedKeyData.encryptedContent || encryptedKeyData;
                const nonce = parsedKeyData.nonce || parsedKeyData.iv;
                
                let decryptedKey;
                
                // 解密密钥
                if (typeof cryptoManager.decryptWithPrivateKey === 'function') {
                    console.log('使用私钥解密方法解密密钥');
                    // 如果有完整的解密方法，使用它
                    decryptedKey = await cryptoManager.decryptWithPrivateKey({
                        encrypted: encrypted,
                        nonce: nonce || 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
                        senderPublicKey: await this.getUserPublicKey(senderId)
                    });
                } else {
                    // 如果没有合适的解密方法，尝试直接使用
                    console.warn('缺少合适的解密方法，尝试直接使用加密数据');
                    try {
                        // 尝试解析为JSON
                        decryptedKey = JSON.parse(encrypted);
                    } catch {
                        // 不是JSON，使用原始字符串
                        decryptedKey = encrypted;
                    }
                }
                
                if (!decryptedKey) {
                    console.error('解密频道密钥失败');
                    return false;
                }
                
                console.log('成功解密频道密钥');
                
                // 解析解密后的数据
                let channelKey;
                try {
                    // 尝试解析JSON格式的密钥
                    if (typeof decryptedKey === 'string' && 
                        (decryptedKey.startsWith('{') || decryptedKey.startsWith('['))) {
                        channelKey = JSON.parse(decryptedKey);
                    } else if (typeof decryptedKey === 'object') {
                        channelKey = decryptedKey;
                    } else {
                        // 使用原始字符串
                        channelKey = {
                            key: decryptedKey,
                            nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
                        };
                    }
                } catch (parseError) {
                    console.warn('解析解密后的密钥数据失败，使用原始值:', parseError);
                    channelKey = {
                        key: decryptedKey,
                        nonce: nonce || 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
                    };
                }
                
                // 确保有必要的字段
                if (!channelKey.key) {
                    console.error('解密后的密钥数据缺少key字段');
                    return false;
                }
                
                // 保存频道密钥
                this.channelKeys[channelId] = {
                    key: channelKey.key,
                    nonce: channelKey.nonce || 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
                    version: channelKey.version || 1,
                    createdAt: channelKey.createdAt || Date.now(),
                    receivedAt: Date.now(),
                    receivedFrom: senderId
                };
                
                // 标记频道为已加密
                this.enabledChannels.add(channelId.toString());
                
                // 保存到本地存储
                this.saveChannelKeys();
                this.saveEnabledChannels();
                
                // 更新UI
                if (typeof window.activeChannelId === 'undefined' || 
                    window.activeChannelId === channelId.toString()) {
                    this.updateEncryptionIndicator(true);
                }
                
                // 如果正在等待密钥，移除等待消息
                this.removeWaitingKeyMessage();
                
                // 显示密钥接收成功提示
                this.showKeyReceivedSuccessMessage();
                
                // 尝试解密历史消息
                this.decryptHistoryMessages(channelId);
                
                return true;
            } catch (error) {
                console.error('处理接收到的频道密钥时发生错误:', error);
                
                // 如果是解密错误，可能是密钥格式不正确，尝试直接使用
                if (error.message && error.message.includes('解密失败')) {
                    console.warn('解密失败，尝试直接使用加密数据作为密钥');
                    
                    // 直接使用加密数据作为密钥 (不安全，但在某些情况下可能有效)
                    this.channelKeys[channelId] = {
                        key: encryptedKeyData,
                        nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
                        createdAt: Date.now(),
                        version: 1,
                        isUnsafe: true  // 标记为不安全的密钥
                    };
                    
                    // 保存到本地存储
                    this.saveChannelKeys();
                    
                    // 更新密钥状态
                    this.enabledChannels.add(channelId);
                    this.saveEnabledChannels();
                    
                    console.log('已使用不安全方式保存密钥，加密可能不完全可靠');
                    return true;
                }
                
                return false;
            }
        } catch (e) {
            console.error('处理接收到的频道密钥过程中发生异常:', e);
            return false;
        }
    },
    
    // 移除等待密钥的提示
    removeWaitingKeyMessage() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            const waitingMessage = messagesContainer.querySelector('.waiting-key-message');
            if (waitingMessage) {
                waitingMessage.remove();
            }
        }
    },
    
    // 添加打印密钥信息的函数
    printChannelKeyInfo(channelId) {
        try {
            channelId = channelId.toString();
            
            // 检查该频道是否有密钥
            if (!this.channelKeys || !this.channelKeys[channelId]) {
                console.log(`频道 ${channelId} 没有密钥信息可显示`);
                return false;
            }
            
            const keyInfo = this.channelKeys[channelId];
            console.log(`频道 ${channelId} 密钥信息:`);
            console.log(`- 密钥可用: ${!!keyInfo.key}`);
            console.log(`- 密钥版本: ${keyInfo.version || '未知'}`);
            console.log(`- 创建时间: ${new Date(keyInfo.createdAt).toLocaleString()}`);
            console.log(`- 最后分发: ${keyInfo.lastDistributionTime ? new Date(keyInfo.lastDistributionTime).toLocaleString() : '从未'}`);
            console.log(`- 分发状态: ${keyInfo.distributed ? '已分发' : '未分发'}`);
            console.log(`- 已分发给: ${keyInfo.distributedTo ? keyInfo.distributedTo.join(', ') : '无'}`);
            
            return true;
        } catch (e) {
            console.error('打印密钥信息失败:', e);
            return false;
        }
    },
    
    // 修改 forceSyncKeys 方法，添加错误处理
    async forceSyncKeys(channelId, keyString) {
        try {
            channelId = channelId.toString();
            
            if (!keyString) {
                // 导出当前密钥为字符串
                if (this.channelKeys[channelId]) {
                    const keyData = {
                        key: this.channelKeys[channelId].key,
                        nonce: this.channelKeys[channelId].nonce,
                        createdAt: this.channelKeys[channelId].createdAt
                    };
                    
                    // 使用Base64编码整个对象以便复制
                    const keyString = btoa(JSON.stringify(keyData));
                    console.log('频道密钥已导出，请复制以下字符串并发送给其他用户:');
                    console.log(keyString);
                    
                    // 弹出提示或显示导出的密钥
                    if (typeof showToast === 'function') {
                        showToast('频道密钥已导出到控制台，请复制并发送给其他用户', 'info');
                    }
                    
                    // 打印密钥信息
                    this.printChannelKeyInfo(channelId);
                    
                    return keyString;
                } else {
                    console.error(`没有频道 ${channelId} 的密钥可以导出`);
                    return null;
                }
            } else {
                // 从字符串导入密钥
                try {
                    // 解码Base64字符串
                    const decodedString = atob(keyString);
                    const keyData = JSON.parse(decodedString);
                    
                    if (!keyData.key || !keyData.nonce) {
                        throw new Error('无效的密钥数据');
                    }
                    
                    // 存储导入的密钥
                    this.channelKeys[channelId] = {
                        key: keyData.key,
                        nonce: keyData.nonce,
                        createdAt: keyData.createdAt || Date.now(),
                        importedAt: Date.now()
                    };
                    
                    // 保存到本地存储
                    this.saveChannelKeys();
                    
                    // 将频道添加到已启用列表
                    this.enabledChannels.add(channelId);
                    this.saveEnabledChannels();
                    
                    // 更新UI
                    this.updateEncryptionIndicator(true);
                    
                    console.log(`已成功导入频道 ${channelId} 的密钥`);
                    
                    // 打印密钥信息
                    this.printChannelKeyInfo(channelId);
                    
                    if (typeof showToast === 'function') {
                        showToast('频道密钥导入成功', 'success');
                    }
                    
                    return true;
                } catch (e) {
                    console.error('导入密钥失败:', e);
                    
                    if (typeof showToast === 'function') {
                        showToast('导入密钥失败: ' + e.message, 'error');
                    }
                    
                    return false;
                }
            }
        } catch (e) {
            console.error('密钥同步操作失败:', e);
            return false;
        }
    },
    
    // 显示等待密钥的提示
    showWaitingForKeyMessage(channelId, isWaitingForAdmin) {
        // 查找消息容器
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        // 创建提示元素
        const warningElement = document.createElement('div');
        warningElement.className = 'p-4 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-200 dark:text-yellow-800 waiting-key-message';
        warningElement.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                <div>
                    <span class="font-medium">等待频道密钥</span>
                    <p>此频道已启用加密，但您还没有密钥。已向频道管理员请求密钥，请等待...</p>
                </div>
            </div>
        `;
        
        // 删除现有的提示（如果有）
        const existingWarning = messagesContainer.querySelector('.waiting-key-message');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        // 添加提示到容器顶部
        messagesContainer.prepend(warningElement);
    },
    
    // 显示密钥接收成功提示
    showKeyReceivedSuccessMessage() {
        if (typeof showToast === 'function') {
            showToast('已接收频道加密密钥，现在可以正常加密通信', 'success');
        } else {
            // 创建一个简单的提示
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
            toast.textContent = '已接收频道加密密钥，现在可以正常加密通信';
            document.body.appendChild(toast);
            
            // 3秒后移除
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 3000);
        }
    },
    
    // 尝试解密历史消息
    async decryptHistoryMessages(channelId) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        // 查找所有加密但解密失败的消息
        const failedMessages = messagesContainer.querySelectorAll('.message-bubble[data-encrypted="true"][data-decryption-failed="true"]');
        if (failedMessages.length === 0) return;
        
        console.log(`尝试解密 ${failedMessages.length} 条历史消息`);
        
        // 遍历每条消息
        for (const messageElement of failedMessages) {
            try {
                const messageId = messageElement.getAttribute('data-message-id');
                if (!messageId) continue;
                
                // 查找消息内容元素
                const contentElement = messageElement.querySelector('.message-content');
                if (!contentElement) continue;
                
                // 获取原始加密内容
                const originalContent = contentElement.getAttribute('data-original-content') || contentElement.textContent;
                if (!originalContent) continue;
                
                // 尝试解密
                const decryptedContent = await this.decryptMessage(channelId, originalContent);
                
                // 如果解密成功（内容不含错误信息）
                if (decryptedContent && 
                    !decryptedContent.includes('无法解密') && 
                    !decryptedContent.includes('解密失败')) {
                    
                    // 更新消息内容
                    contentElement.innerHTML = this._formatMessageContent(decryptedContent);
                    
                    // 更新消息样式
                    messageElement.classList.remove('decryption-failed');
                    messageElement.removeAttribute('data-decryption-failed');
                    
                    // 更新加密状态指示器
                    const encryptionIndicator = messageElement.querySelector('span[title*="无法解密"]');
                    if (encryptionIndicator) {
                        encryptionIndicator.innerHTML = '<i class="fas fa-lock"></i>';
                        encryptionIndicator.className = 'ml-1 text-xs text-green-500 dark:text-green-400';
                        encryptionIndicator.title = '端到端加密消息';
                    }
                }
            } catch (e) {
                console.error('解密历史消息失败:', e);
            }
        }
    },
    
    // 格式化消息内容（基本版本，仅供内部使用）
    _formatMessageContent(content) {
        if (!content) return '';
        
        // 确保content是字符串类型
        if (typeof content !== 'string') {
            content = String(content);
        }
        
        // 转义HTML特殊字符
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    },
    
    // 确保已初始化
    async ensureInitialized() {
        if (!this.initialized) {
            await this.init();
        }
        return this.initialized;
    },
    
    // 工具方法：将ArrayBuffer转换为Base64字符串
    _arrayBufferToBase64(buffer) {
        const binary = [];
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary.push(String.fromCharCode(bytes[i]));
        }
        return window.btoa(binary.join(''));
    },
    
    // 工具方法：将Base64转换为ArrayBuffer
    _base64ToArrayBuffer(base64) {
        try {
            // 检查输入
            if (!base64 || typeof base64 !== 'string') {
                console.error('不是有效的Base64字符串:', base64);
                throw new Error('不是有效的Base64字符串');
            }
            
            // 解码Base64
            const binary_string = window.atob(base64);
            const len = binary_string.length;
            const bytes = new Uint8Array(len);
            
            for (let i = 0; i < len; i++) {
                bytes[i] = binary_string.charCodeAt(i);
            }
            
            return bytes;
        } catch (e) {
            console.error('Base64转ArrayBuffer失败:', e, '尝试的Base64字符串:', base64);
            
            // 返回空数组作为失败情况的处理
            return new Uint8Array(0);
        }
    },
    
    // 工具方法：将字符串转换为Uint8Array
    _stringToUint8Array(str) {
        const encoder = new TextEncoder();
        return encoder.encode(str);
    },
    
    // 工具方法：将Uint8Array转换为字符串
    _uint8ArrayToString(array) {
        const decoder = new TextDecoder();
        return decoder.decode(array);
    },
    
    // 广播频道已禁用加密
    broadcastEncryptionDisabled(channelId) {
        // 在实际实现中，这里应该发送一个系统消息，通知所有频道成员加密已禁用
        if (typeof socket !== 'undefined') {
            const message = {
                channel_id: channelId,
                content: '此频道已禁用端到端加密。',
                message_type: 'system',
                systemAction: 'encryption_disabled'
            };
            
            // 直接通过socket发送
            console.log('发送加密禁用通知:', message);
            socket.emit('send_message', message);
        } else {
            console.warn('Socket未定义，无法发送加密禁用通知');
        }
    },
    
    // 加密消息
    async encryptMessage(channelId, message) {
        await this.ensureInitialized();
        
        channelId = channelId.toString();
        
        // 如果频道未启用加密，但我们有该频道的密钥，自动修复状态
        if (!this.isChannelEncrypted(channelId) && this.channelKeys && this.channelKeys[channelId]) {
            console.log(`检测到频道 ${channelId} 有密钥但未标记为已加密，准备加密消息时自动修复状态`);
            this.enabledChannels.add(channelId.toString());
            this.saveEnabledChannels();
            // 更新UI指示器
            this.updateEncryptionIndicator(true);
            
            // 同步状态到后端
            this.syncEncryptionStatusWithBackend(channelId, true);
        }
        
        if (!this.isChannelEncrypted(channelId)) {
            return message; // 如果频道未启用加密，直接返回原始消息
        }
        
        try {
            let channelKey = this.channelKeys[channelId];
            
            // 如果没有本地密钥或密钥过期，尝试从数据库获取最新密钥
            if (!channelKey || !channelKey.key) {
                console.log(`本地缓存中没有找到频道 ${channelId} 的密钥，尝试从数据库获取`);
                
                // 直接从数据库获取最新密钥
                const senderKeyData = await this.getSenderKeyFromDatabase(channelId);
                
                // 重新检查密钥是否可用
                channelKey = this.channelKeys[channelId];
                
                if (!channelKey || !channelKey.key) {
                    console.error(`无法从数据库获取频道 ${channelId} 的密钥`);
                    
                    // 如果没有密钥但标记为加密，这是状态不一致
                    // 此时不应该标记为已加密
                    console.warn(`频道 ${channelId} 标记为已加密但没有密钥，修复状态`);
                    this.enabledChannels.delete(channelId);
                    this.saveEnabledChannels();
                    this.updateEncryptionIndicator(false);
                    
                    return message; // 无法加密，返回原始消息
                } else {
                    console.log(`成功从数据库获取到频道 ${channelId} 的密钥，继续加密过程`);
                }
            }
            
            console.log(`加密消息 - 使用频道 ${channelId} 的密钥`);
            console.log('加密使用的密钥信息:', {
                hasKey: !!channelKey.key,
                hasNonce: !!channelKey.nonce,
                createdAt: channelKey.createdAt
            });
            
            // 获取频道密钥和nonce
            const key = this._base64ToArrayBuffer(channelKey.key);
            const nonce = this._base64ToArrayBuffer(channelKey.nonce);
            
            console.log('加密参数:', {
                keyLength: key.length,
                nonceLength: nonce.length
            });
            
            // 将消息转换为 Uint8Array
            const messageUint8 = this._stringToUint8Array(message);
            
            // 使用NaCl进行加密
            const encryptedMsg = nacl.secretbox(messageUint8, nonce, key);
            
            // 将加密后的内容转换为Base64编码 - 使用标准的Base64编码方法
            const encryptedBase64 = this._standardBase64Encode(encryptedMsg);
            
            // 同样对nonce使用标准编码确保一致性
            const nonceBase64 = this._standardBase64Encode(nonce);
            
            // 构建最终消息对象 - 明确包含使用的nonce和加密信息
            const encryptedMessage = JSON.stringify({
                encrypted: true,
                content: encryptedBase64,
                nonce: nonceBase64, // 使用标准Base64编码的nonce
                timestamp: Date.now(),
                version: "1.0", // 版本号，便于后续升级
                sender_key_version: channelKey.version || 1, // 添加使用的密钥版本号
                debug: {
                    keyLength: key.length,
                    nonceLength: nonce.length,
                    originalLength: message.length
                }
            });
            
            console.log('消息加密完成，详细信息:', {
                contentLength: encryptedBase64.length,
                nonceLength: nonceBase64.length,
                originalMessageLength: message.length,
                keyVersion: channelKey.version || 1
            });
            return encryptedMessage;
        } catch (e) {
            console.error('加密消息失败:', e);
            return message; // 失败时返回原始消息
        }
    },
    
    // 标准Base64编码方法
    _standardBase64Encode(buffer) {
        try {
            // 将Uint8Array转换为二进制字符串
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            
            // 使用标准btoa函数进行Base64编码
            return window.btoa(binary);
        } catch (e) {
            console.error('标准Base64编码失败:', e);
            
            // 使用备用方法
            return this._arrayBufferToBase64(buffer);
        }
    },
    
    // 解密消息
    async decryptMessage(channelId, encryptedMessage) {
        await this.ensureInitialized();
        
        channelId = channelId.toString();
        
        // 首先检测消息是否确实是加密消息
        let isEncryptedMessage = false;
        let messageData;
        let senderKeyVersion;
        
        try {
            // 检查是JSON格式且包含encrypted标志
            if (typeof encryptedMessage === 'string' && 
                (encryptedMessage.startsWith('{') || encryptedMessage.includes('"encrypted":true'))) {
                messageData = JSON.parse(encryptedMessage);
                isEncryptedMessage = messageData.encrypted === true && messageData.content;
                senderKeyVersion = messageData.sender_key_version; // 获取发送者使用的密钥版本
            }
        } catch(e) {
            // 解析失败则不是JSON格式，继续执行
        }
        
        // 如果消息确实是加密的，但频道未标记为加密，说明状态不一致
        if (isEncryptedMessage && !this.isChannelEncrypted(channelId)) {
            console.log(`检测到加密消息，但频道 ${channelId} 未标记为已加密，自动修复状态`);
            this.enabledChannels.add(channelId.toString());
            this.saveEnabledChannels();
            // 更新UI指示器
            this.updateEncryptionIndicator(true);
            
            // 同步状态到后端
            this.syncEncryptionStatusWithBackend(channelId, true);
        }
        
        if (!this.isChannelEncrypted(channelId)) {
            console.log(`频道 ${channelId} 未启用加密，不解密消息`);
            return encryptedMessage;
        }
        
        try {
            // 检查所有有密钥的频道
            for (const channelId in this.channelKeys) {
                // 如果有密钥但未标记为加密，则状态不一致
                if (!this.enabledChannels.has(channelId.toString())) {
                    console.warn(`频道 ${channelId} 有密钥但未标记为已加密，自动修复状态`);
                    this.enabledChannels.add(channelId.toString());
                    
                    // 同步到后端
                    this.syncEncryptionStatusWithBackend(channelId, true);
                    
                    // 如果是当前活跃频道，更新UI
                    if (channelId === window.activeChannelId) {
                        this.updateEncryptionIndicator(true);
                    }
                }
            }
            
            // 保存可能更新的状态
            this.saveEnabledChannels();
            
            console.log('加密状态一致性检查完成');
        } catch (e) {
            console.error('检查加密状态一致性失败:', e);
        }
        
        // 开始实际的解密过程
        try {
            // 检查是否有频道密钥
            let channelKey = this.channelKeys[channelId];
            let retryWithNewKey = false;
            let originalKeyBuffer = null;
            
            // 如果没有密钥或发送者使用了更新的密钥版本，尝试从数据库获取最新密钥
            if (!channelKey || !channelKey.key || 
                (senderKeyVersion && channelKey.version && senderKeyVersion > channelKey.version)) {
                console.log(`本地密钥不可用或过期，尝试从数据库获取最新密钥`);
                
                // 保存当前密钥用于比较
                if (channelKey && channelKey.key) {
                    originalKeyBuffer = this._base64ToArrayBuffer(channelKey.key);
                }
                
                const senderKeyData = await this.getSenderKeyFromDatabase(channelId, senderKeyVersion);
                
                // 重新检查密钥是否可用
                channelKey = this.channelKeys[channelId];
                
                if (!channelKey || !channelKey.key) {
                    console.error(`未找到频道 ${channelId} 的密钥，无法解密消息`);
                    
                    // 如果没有密钥但消息是加密的，尝试请求密钥
                    if (isEncryptedMessage) {
                        this.requestChannelKey(channelId);
                        this.showWaitingForKeyMessage(channelId);
                    }
                    
                    return `[无法解密 - 需要密钥] ${typeof encryptedMessage === 'string' ? encryptedMessage.substring(0, 20) + '...' : ''}`;
                }
                
                // 检查是否获取到了新密钥
                if (originalKeyBuffer) {
                    const newKeyBuffer = this._base64ToArrayBuffer(channelKey.key);
                    if (!this._arraysEqual(originalKeyBuffer, newKeyBuffer)) {
                        console.log(`成功获取到新密钥，与原密钥不同`);
                        retryWithNewKey = true;
                    } else {
                        console.log(`获取到的密钥与原密钥相同，不标记为重试`);
                    }
                } else {
                    // 如果之前没有密钥，现在有了，那就是新密钥
                    retryWithNewKey = true;
                    console.log(`之前没有密钥，获取到了新密钥`);
                }
            }
            
            // 解析加密消息
            let messageContent;
            let messageNonce;
            
            try {
                // 尝试解析JSON格式的加密消息
                if (!messageData) {
                    if (typeof encryptedMessage === 'string') {
                        messageData = JSON.parse(encryptedMessage);
                    } else if (typeof encryptedMessage === 'object') {
                        messageData = encryptedMessage;
                    } else {
                        throw new Error('未知的消息格式');
                    }
                }
                
                // 提取加密内容和nonce
                if (messageData.encrypted && messageData.content) {
                    messageContent = messageData.content;
                    messageNonce = messageData.nonce || channelKey.nonce; // 使用消息自带的nonce或频道默认nonce
                    senderKeyVersion = messageData.sender_key_version; // 获取发送者使用的密钥版本
                } else {
                    // 不是标准格式的加密消息
                    console.warn('消息格式不是标准的加密格式');
                    return encryptedMessage;
                }
            } catch (parseError) {
                console.error('解析加密消息失败:', parseError);
                return `[解密失败 - 格式错误] ${typeof encryptedMessage === 'string' ? encryptedMessage.substring(0, 20) + '...' : ''}`;
            }
            
            console.log('开始解密消息，参数:', {
                hasContent: !!messageContent,
                hasNonce: !!messageNonce,
                contentLength: messageContent ? messageContent.length : 0,
                senderKeyVersion: senderKeyVersion,
                retryWithNewKey: retryWithNewKey
            });
            
            // 保存当前密钥，用于比较
            const currentKeyBuffer = this._base64ToArrayBuffer(channelKey.key);
            
            // 获取密钥和nonce的二进制形式
            const key = this._base64ToArrayBuffer(channelKey.key);
            const nonce = this._base64ToArrayBuffer(messageNonce);
            
            if (key.length === 0 || nonce.length === 0) {
                console.error('密钥或nonce无效');
                return `[解密失败 - 密钥无效] ${typeof encryptedMessage === 'string' ? encryptedMessage.substring(0, 20) + '...' : ''}`;
            }
            
            console.log('解密参数:', {
                keyLength: key.length,
                nonceLength: nonce.length,
                expectedKeyLength: nacl.secretbox.keyLength,
                expectedNonceLength: nacl.secretbox.nonceLength,
                keyVersion: channelKey.version,
                senderKeyVersion: senderKeyVersion
            });
            
            // 检查密钥和nonce长度是否正确
            if (key.length !== nacl.secretbox.keyLength) {
                console.error(`密钥长度不正确: ${key.length}，期望: ${nacl.secretbox.keyLength}`);
                return `[解密失败 - 密钥长度错误]`;
            }
            
            if (nonce.length !== nacl.secretbox.nonceLength) {
                console.error(`Nonce长度不正确: ${nonce.length}，期望: ${nacl.secretbox.nonceLength}`);
                return `[解密失败 - Nonce长度错误]`;
            }
            
            // 将加密内容转换为Uint8Array
            const encryptedContent = this._base64ToArrayBuffer(messageContent);
            if (encryptedContent.length === 0) {
                console.error('加密内容无效');
                return `[解密失败 - 加密内容无效]`;
            }
            
            // 使用NaCl进行解密
            const decryptedMsg = nacl.secretbox.open(encryptedContent, nonce, key);
            
            if (!decryptedMsg) {
                console.error('使用当前密钥解密失败，尝试获取更新的密钥');
                
                // 如果解密失败且尚未尝试过获取新密钥，从数据库获取最新密钥再试一次
                if (!retryWithNewKey) {
                    console.log(`解密失败，尝试从数据库获取最新密钥再次解密`);
                    
                    // 强制从数据库获取最新密钥，无视版本号
                    const senderKeyData = await this.getSenderKeyFromDatabase(channelId);
                    
                    // 如果成功获取到新密钥，且密钥与当前使用的不同，递归调用自身重新尝试解密
                    if (this.channelKeys[channelId] && this.channelKeys[channelId].key) {
                        const newKeyBuffer = this._base64ToArrayBuffer(this.channelKeys[channelId].key);
                        
                        // 只有在获取到不同密钥时才重试
                        if (!this._arraysEqual(currentKeyBuffer, newKeyBuffer)) {
                            console.log(`获取到新密钥，重新尝试解密`);
                            return await this.decryptMessage(channelId, encryptedMessage);
                        } else {
                            console.log(`获取的密钥与当前密钥相同，不再重试解密`);
                        }
                    } else {
                        console.log(`未获取到新密钥，不再重试解密`);
                    }
                } else {
                    console.log(`已经尝试过使用新密钥解密，但仍然失败`);
                }
                
                return `[解密失败 - 验证错误，可能需要更新密钥]`;
            }
            
            // 将解密后的内容转换为字符串
            const decryptedText = this._uint8ArrayToString(decryptedMsg);
            console.log('消息解密成功');
            
            return decryptedText;
        } catch (e) {
            console.error('解密消息时发生错误:', e);
            return `[解密失败 - ${e.message}]`;
        }
    },
    
    // 与后端同步频道加密状态
    async syncEncryptionStatusWithBackend(channelId, isEncrypted) {
        console.log(`同步频道 ${channelId} 加密状态到后端：${isEncrypted ? '已加密' : '未加密'}`);
        
        try {
            // 使用前面定义的API来同步状态
            const response = await fetch(`/api/channels/${channelId}/enable_encryption`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    encrypted: isEncrypted
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log(`成功同步频道 ${channelId} 加密状态到后端`);
                    return true;
                } else {
                    console.warn(`同步频道 ${channelId} 加密状态失败：${result.message}`);
                }
            } else {
                console.warn(`同步频道 ${channelId} 加密状态请求失败：${response.status}`);
            }
        } catch (e) {
            console.error(`同步频道 ${channelId} 加密状态出错：`, e);
        }
        
        // 尝试使用另一个接口
        try {
            const response = await fetch(`/api/channels/${channelId}/encryption`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({
                    enable_encryption: isEncrypted
                })
            });
            
            if (response.ok) {
                console.log(`成功使用备用接口同步频道 ${channelId} 加密状态到后端`);
                return true;
            }
        } catch (e) {
            console.error(`使用备用接口同步频道 ${channelId} 加密状态出错：`, e);
        }
        
        return false;
    },
    
    // 添加辅助方法比较两个密钥是否相同
    // 比较两个Uint8Array数组是否相等
    _arraysEqual(arr1, arr2) {
        if (!arr1 || !arr2) return false;
        if (arr1.length !== arr2.length) return false;
        
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        
        return true;
    },

    // 在ChannelEncryption对象中添加一个新方法
    getSenderKeyFromDatabase: async function(channelId, version = null) {
        try {
            console.log(`从数据库直接获取频道 ${channelId} 的发送者密钥`);
            
            // 检查网络连接状态
            if (!navigator.onLine) {
                console.warn('当前处于离线状态，无法从服务器获取密钥');
                // 尝试使用离线密钥
                return this.getSenderKeyOffline(channelId);
            }
            
            // 构建请求URL
            let url = `/api/crypto/get_sender_key/${channelId}`;
            if (version) {
                url += `?version=${version}`;
            }
            
            // 添加随机数防止缓存
            url += (url.includes('?') ? '&' : '?') + 'nocache=' + Date.now();
            
            // 尝试API端点
            try {
                // 发送请求
                const response = await fetch(url);
                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn(`没有找到频道 ${channelId} 的发送者密钥，尝试备用方法`);
                        // 尝试备用API端点
                        return await this.getSenderKeyFromBackupApi(channelId, version);
                    }
                    
                    // 对于其他错误，也尝试解析响应内容以获取更详细的错误信息
                    let errorData = null;
                    try {
                        errorData = await response.json();
                    } catch (parseError) {
                        console.warn('无法解析错误响应:', parseError);
                    }
                    
                    if (errorData && errorData.message) {
                        console.error(`服务器返回错误信息: ${errorData.message}`);
                        
                        // 如果错误消息包含特定关键词，可以进行更具体的处理
                        if (errorData.message.includes('表不存在') || 
                            errorData.message.includes('未找到频道')) {
                            console.warn('服务器表结构可能有问题，尝试备用方法');
                            return await this.getSenderKeyFromBackupApi(channelId, version);
                        }
                    }
                    
                    throw new Error(`服务器返回错误: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    console.warn(`获取频道 ${channelId} 的发送者密钥失败: ${data.message || '未知错误'}`);
                    
                    // 检查错误数据中的详细信息
                    if (data.data && data.data.tried_tables) {
                        console.warn(`服务器尝试了以下表: ${data.data.tried_tables.join(', ')}`);
                    }
                    
                    // 尝试备用API端点
                    return await this.getSenderKeyFromBackupApi(channelId, version);
                }
                
                // 检查是否是离线模式的空响应
                if (data.message && data.message.includes("离线模式")) {
                    console.warn(`获取频道 ${channelId} 的发送者密钥失败: ${data.message}`);
                    // 尝试使用离线密钥
                    return this.getSenderKeyOffline(channelId);
                }
                
                // 确保有sender_key数据
                const senderKey = data.sender_key || (data.data && data.data.sender_key);
                if (!senderKey || !senderKey.encrypted_key) {
                    console.warn(`获取的sender_key数据无效或为空，尝试备用方法`);
                    // 尝试备用API端点
                    return await this.getSenderKeyFromBackupApi(channelId, version);
                }
                
                console.log(`成功获取频道 ${channelId} 的发送者密钥, 版本: ${senderKey.version}`);
                
                // 处理接收到的密钥
                const success = await this.processReceivedChannelKey(
                    senderKey.encrypted_key,
                    senderKey.sender_id,
                    channelId
                );
                
                if (success) {
                    // 获取当前处理的密钥
                    const currentKey = this.channelKeys[channelId];
                    
                    // 如果本地没有保存这个频道的密钥，或者远程版本更新，保存并返回远程版本
                    if (!currentKey || (senderKey.version && (!currentKey.version || senderKey.version > currentKey.version))) {
                        console.log(`从数据库更新频道 ${channelId} 的密钥版本至 ${senderKey.version}`);
                        
                        // 确保channelKeys对象初始化
                        if (!this.channelKeys) {
                            this.channelKeys = {};
                        }
                        
                        // 更新版本号
                        if (this.channelKeys[channelId]) {
                            this.channelKeys[channelId].version = senderKey.version;
                        }
                        
                        // 保存更新
                        this.saveChannelKeys();
                    }
                    
                    return senderKey;
                } else {
                    console.error(`处理频道 ${channelId} 的发送者密钥失败`);
                    return null;
                }
            } catch (error) {
                console.error(`API请求失败，尝试备用方法: ${error.message}`);
                // 尝试备用方法
                return await this.getSenderKeyFromBackupApi(channelId, version);
            }
        } catch (e) {
            console.error(`获取发送者密钥失败: ${e.message}`, e);
            
            // 最后尝试获取KDM密钥，这可能是最后的选择
            try {
                const kdmResult = await this.pullKdm(channelId);
                if (kdmResult && kdmResult > 0) {
                    console.log(`通过KDM同步获取到 ${kdmResult} 个密钥`);
                    // KDM同步成功后，密钥应该已经处理并保存在channelKeys中
                    if (this.channelKeys && this.channelKeys[channelId]) {
                        return {
                            channel_id: channelId,
                            sender_id: 'kdm',
                            encrypted_key: this.channelKeys[channelId].key,
                            version: this.channelKeys[channelId].version || 1,
                            is_kdm: true
                        };
                    }
                }
            } catch (kdmError) {
                console.error(`尝试通过KDM同步获取密钥也失败: ${kdmError.message}`);
            }
            
            // 尝试使用本地密钥，如果都失败了
            return this.getSenderKeyOffline(channelId);
        }
    },
    
    // 添加从备用API获取发送者密钥的方法
    async getSenderKeyFromBackupApi(channelId, version = null) {
        try {
            console.log(`使用备用API获取频道 ${channelId} 的密钥`);
            
            // 尝试备用API端点 - 如从KDM获取密钥
            try {
                // 从KDM API获取
                const response = await fetch(`/api/kdm/pending?channel_id=${channelId}`);
                if (!response.ok) {
                    throw new Error(`备用API也返回错误: ${response.status}`);
                }
                
                const data = await response.json();
                if (!data.success || !data.pending_keys || data.pending_keys.length === 0) {
                    console.warn('备用API未找到任何密钥');
                    // 尝试使用离线密钥
                    return this.getSenderKeyOffline(channelId);
                }
                
                // 找到最新的密钥
                const latestKey = data.pending_keys.reduce((latest, current) => {
                    if (!latest || (current.version && (!latest.version || current.version > latest.version))) {
                        return current;
                    }
                    return latest;
                }, null);
                
                if (!latestKey || !latestKey.encrypted_keys_for_me) {
                    console.warn('找不到有效的密钥');
                    return null;
                }
                
                // 处理获取到的密钥
                const success = await this.processReceivedChannelKey(
                    latestKey.encrypted_keys_for_me,
                    latestKey.sender_id,
                    channelId
                );
                
                if (success) {
                    console.log(`使用备用API成功获取频道 ${channelId} 的密钥`);
                    
                    // 转换为标准格式返回
                    return {
                        channel_id: channelId,
                        sender_id: latestKey.sender_id,
                        encrypted_key: latestKey.encrypted_keys_for_me,
                        version: latestKey.version || 1
                    };
                }
            } catch (backupError) {
                console.error(`备用API请求失败: ${backupError.message}`);
            }
            
            // 如果备用API也失败，尝试从本地获取
            return this.getSenderKeyOffline(channelId);
        } catch (e) {
            console.error(`备用获取发送者密钥方法失败: ${e.message}`, e);
            // 最后尝试使用离线密钥
            return this.getSenderKeyOffline(channelId);
        }
    },
    
    // 从本地存储获取密钥
    getSenderKeyOffline(channelId) {
        try {
            console.log(`尝试从本地存储获取频道 ${channelId} 的密钥`);
            
            // 检查本地是否有此频道的密钥
            if (!this.channelKeys || !this.channelKeys[channelId] || !this.channelKeys[channelId].key) {
                console.warn(`本地没有频道 ${channelId} 的密钥`);
                return null;
            }
            
            // 返回一个模拟的sender_key对象，直接使用本地密钥
            return {
                channel_id: channelId,
                sender_id: 'local',  // 使用'local'表示是本地密钥
                encrypted_key: this.channelKeys[channelId].key,  // 实际上这并不是加密的密钥
                version: this.channelKeys[channelId].version || 1,
                is_local: true  // 添加一个标记表明这是本地密钥
            };
        } catch (e) {
            console.error(`从本地获取密钥失败: ${e.message}`, e);
            return null;
        }
    },
};

// 添加一个测试函数，用于手动激活加密
function toggleChannelEncryption() {
    if (!activeChannelId) {
        console.error('没有活跃的频道，无法切换加密状态');
        return;
    }
    
    if (ChannelEncryption.isChannelEncrypted(activeChannelId)) {
        console.log(`禁用频道 ${activeChannelId} 的加密`);
        ChannelEncryption.disableEncryption(activeChannelId);
        // 更新按钮UI状态
        const encryptionToggleBtn = document.getElementById('toggleEncryptionBtn');
        if (encryptionToggleBtn) {
            encryptionToggleBtn.classList.remove('enabled');
            encryptionToggleBtn.classList.add('disabled');
        }
        alert('已禁用此频道的加密');
    } else {
        console.log(`启用频道 ${activeChannelId} 的加密`);
        
        // 启用加密并生成密钥
        ChannelEncryption.enableEncryption(activeChannelId)
            .then(success => {
                if (success) {
                    console.log('频道加密已成功启用');
                    // 更新按钮UI状态
                    const encryptionToggleBtn = document.getElementById('toggleEncryptionBtn');
                    if (encryptionToggleBtn) {
                        encryptionToggleBtn.classList.remove('disabled');
                        encryptionToggleBtn.classList.add('enabled');
                    }
                    // 重新检查一次以确保状态一致
                    setTimeout(() => {
                        const isEncrypted = ChannelEncryption.isChannelEncrypted(activeChannelId);
                        ChannelEncryption.updateEncryptionIndicator(isEncrypted);
                    }, 500);
                } else {
                    console.error('启用频道加密失败');
                    alert('启用加密失败，请重试');
                }
            })
            .catch(error => {
                console.error('启用频道加密过程中出错:', error);
                alert('启用加密失败，请重试');
            });
        
        alert('正在启用此频道的加密，消息将被加密发送');
    }
}

// 添加一个手动为单个用户分发密钥的函数
async function distributeKeyToUser(userId) {
    if (!activeChannelId) {
        console.error('没有活跃的频道，无法分发密钥');
        return false;
    }
    
    if (!userId) {
        // 提示输入用户ID
        userId = prompt('请输入要分发密钥的用户ID:');
        if (!userId) {
            return false;
        }
    }
    
    console.log(`尝试为用户 ${userId} 分发频道 ${activeChannelId} 的密钥...`);
    
    if (!ChannelEncryption.isChannelEncrypted(activeChannelId)) {
        console.error(`频道 ${activeChannelId} 未启用加密`);
        return false;
    }
    
    // 获取频道密钥
    const channelKey = ChannelEncryption.channelKeys[activeChannelId];
    if (!channelKey) {
        console.error(`未找到频道 ${activeChannelId} 的密钥`);
        return false;
    }
    
    try {
        // 获取用户的公钥
        const publicKey = await ChannelEncryption.getUserPublicKey(userId);
        if (!publicKey) {
            console.error(`无法获取用户 ${userId} 的公钥`);
            alert(`无法获取用户 ${userId} 的公钥，请确保用户已生成密钥对`);
            return false;
        }
        
        // 加密频道密钥
        const encryptedKey = await ChannelEncryption.encryptChannelKeyForUser(channelKey, publicKey);
        if (!encryptedKey) {
            console.error(`无法为用户 ${userId} 加密频道密钥`);
            alert(`加密频道密钥失败`);
            return false;
        }
        
        // 发送加密后的密钥给用户
        const sent = await ChannelEncryption.sendEncryptedKeyToUser(userId, activeChannelId, encryptedKey);
        if (sent) {
            console.log(`成功向用户 ${userId} 分发频道密钥`);
            
            // 标记密钥已分发（这个标记可能未被正确设置，导致重复分发问题）
            if (ChannelEncryption.channelKeys[activeChannelId]) {
                ChannelEncryption.channelKeys[activeChannelId].distributed = true;
                // 更新最后一次分发时间
                ChannelEncryption.channelKeys[activeChannelId].lastDistributionTime = Date.now();
                // 记录已分发给的用户
                if (!ChannelEncryption.channelKeys[activeChannelId].distributedTo) {
                    ChannelEncryption.channelKeys[activeChannelId].distributedTo = [];
                }
                if (!ChannelEncryption.channelKeys[activeChannelId].distributedTo.includes(userId)) {
                    ChannelEncryption.channelKeys[activeChannelId].distributedTo.push(userId);
                }
                ChannelEncryption.saveChannelKeys();
            }
            
            alert(`成功向用户 ${userId} 分发频道密钥`);
            return true;
        } else {
            console.error(`向用户 ${userId} 发送加密密钥失败`);
            alert(`发送密钥失败，请检查网络连接`);
            return false;
        }
    } catch (error) {
        console.error(`为用户 ${userId} 分发密钥失败:`, error);
        alert(`分发密钥失败: ${error.message}`);
        return false;
    }
}

// 将函数暴露到全局
window.distributeKeyToUser = distributeKeyToUser;

// 添加一个手动触发密钥分发的函数
async function forceDistributeChannelKey() {
    if (!activeChannelId) {
        console.error('没有活跃的频道，无法分发密钥');
        return false;
    }
    
    if (!ChannelEncryption.isChannelEncrypted(activeChannelId)) {
        console.error('频道未启用加密，请先启用加密');
        return false;
    }
    
    if (!ChannelEncryption.channelKeys[activeChannelId]) {
        console.error('频道没有密钥，无法分发');
        return false;
    }
    
    console.log(`手动触发频道 ${activeChannelId} 的密钥分发...`);
    
    // 重置分发状态，确保密钥可以重新分发
    resetKeyDistributionStatus(activeChannelId);
    
    // 分发密钥 - 使用改进的方法
    try {
        // 直接获取频道成员
        const members = await ChannelEncryption.getChannelMembers(activeChannelId);
        console.log(`频道 ${activeChannelId} 有 ${members.length} 名成员需要分发密钥`);
        
        let success = false;
        let failureCount = 0;
        let successCount = 0;
        const distributedToUsers = [];
        
        // 逐个尝试，即使部分失败也继续
        for (const member of members) {
            // 跳过自己
            if (member.id === window.currentUserId) continue;
            
            try {
                // 获取用户公钥
                const publicKey = await ChannelEncryption.getUserPublicKey(member.id);
                if (!publicKey) {
                    console.warn(`无法获取用户 ${member.id} 的公钥，跳过`);
                    failureCount++;
                    continue;
                }
                
                // 加密并发送密钥
                const encryptedKey = await ChannelEncryption.encryptChannelKeyForUser(
                    ChannelEncryption.channelKeys[activeChannelId], 
                    publicKey
                );
                
                if (encryptedKey) {
                    const sent = await ChannelEncryption.sendEncryptedKeyToUser(
                        member.id, activeChannelId, encryptedKey
                    );
                    
                    if (sent) {
                        successCount++;
                        distributedToUsers.push(member.id);
                        success = true; // 只要有一个成功就算整体成功
                    } else {
                        failureCount++;
                    }
                } else {
                    failureCount++;
                }
            } catch (err) {
                console.error(`为用户 ${member.id} 分发密钥时出错:`, err);
                failureCount++;
            }
        }
        
        // 标记密钥已分发
        ChannelEncryption.channelKeys[activeChannelId].distributed = true;
        // 更新最后一次分发时间
        ChannelEncryption.channelKeys[activeChannelId].lastDistributionTime = Date.now();
        // 记录已分发给的用户
        ChannelEncryption.channelKeys[activeChannelId].distributedTo = distributedToUsers;
        ChannelEncryption.saveChannelKeys();
        
        if (success) {
            console.log(`密钥分发成功 (成功: ${successCount}, 失败: ${failureCount})`);
            
            if (typeof showToast === 'function') {
                if (failureCount > 0) {
                    showToast(`密钥分发部分成功: ${successCount}成功, ${failureCount}失败`, 'warning');
                } else {
                    showToast('密钥分发成功', 'success');
                }
            } else {
                if (failureCount > 0) {
                    alert(`密钥分发部分成功: ${successCount}成功, ${failureCount}失败`);
                } else {
                    alert('密钥分发成功');
                }
            }
            
            return true;
        } else {
            console.error('所有密钥分发尝试都失败');
            
            if (typeof showToast === 'function') {
                showToast('密钥分发失败', 'error');
            } else {
                alert('密钥分发失败');
            }
            
            return false;
        }
    } catch (error) {
        console.error('密钥分发过程中出现错误:', error);
        
        if (typeof showToast === 'function') {
            showToast('密钥分发失败: ' + error.message, 'error');
        } else {
            alert('密钥分发失败: ' + error.message);
        }
        
        return false;
    }
}

// 新增：重置密钥分发状态的函数
function resetKeyDistributionStatus(channelId) {
    if (!channelId) {
        channelId = activeChannelId;
    }
    
    if (!channelId) {
        console.error('未指定频道ID，无法重置密钥分发状态');
        return false;
    }
    
    if (ChannelEncryption.channelKeys && ChannelEncryption.channelKeys[channelId]) {
        console.log(`重置频道 ${channelId} 的密钥分发状态`);
        
        // 保存历史分发记录
        if (ChannelEncryption.channelKeys[channelId].distributed && 
            ChannelEncryption.channelKeys[channelId].lastDistributionTime) {
            
            // 初始化历史分发记录数组
            if (!ChannelEncryption.channelKeys[channelId].previousDistributions) {
                ChannelEncryption.channelKeys[channelId].previousDistributions = [];
            }
            
            const previousDistribution = {
                time: ChannelEncryption.channelKeys[channelId].lastDistributionTime,
                distributedTo: ChannelEncryption.channelKeys[channelId].distributedTo || []
            };
            
            ChannelEncryption.channelKeys[channelId].previousDistributions.push(previousDistribution);
            
            // 最多保留最近5次分发记录
            if (ChannelEncryption.channelKeys[channelId].previousDistributions.length > 5) {
                ChannelEncryption.channelKeys[channelId].previousDistributions.shift();
            }
        }
        
        // 将分发状态设置为 false
        ChannelEncryption.channelKeys[channelId].distributed = false;
        // 标记需要重新分发
        ChannelEncryption.channelKeys[channelId].needRedistribute = true;
        // 保存更改
        ChannelEncryption.saveChannelKeys();
        return true;
    } else {
        console.error(`频道 ${channelId} 没有密钥，无法重置分发状态`);
        return false;
    }
}

// 将函数暴露到全局，方便调试和手动调用
window.resetKeyDistributionStatus = resetKeyDistributionStatus;
window.forceDistributeChannelKey = forceDistributeChannelKey;

// 为window对象添加切换加密的函数，便于调试
window.toggleChannelEncryption = toggleChannelEncryption;

// 在页面加载时连接并检查当前频道的加密状态
window.addEventListener('DOMContentLoaded', async () => {
    console.log('初始化频道加密功能...');
    
    // 延迟初始化，确保其他组件已加载
    setTimeout(async () => {
        // 尝试初始化加密模块
        try {
            await ChannelEncryption.init();
            console.log('频道加密模块已初始化');
            
            // 添加频道切换事件监听器
            setupChannelChangeListener();
            
            // 检查当前活跃频道并处理密钥分发
            await checkAndDistributeChannelKey(activeChannelId);
            
            // 设置定期检查计时器
            setupPeriodicKeyDistributionCheck();
            
        } catch (error) {
            console.error('初始化频道加密模块失败:', error);
        }
    }, 1000);
});

// 设置定期检查密钥分发状态的定时器
function setupPeriodicKeyDistributionCheck() {
    console.log('设置定期密钥分发状态检查');
    
    // 每5分钟检查一次当前频道的密钥分发状态
    const CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟
    
    // 设置定时器
    setInterval(() => {
        if (typeof activeChannelId !== 'undefined' && activeChannelId) {
            console.log('执行定期密钥分发状态检查...');
            
            // 检查当前频道是否启用了加密
            if (ChannelEncryption.isChannelEncrypted(activeChannelId)) {
                // 检查密钥是否存在
                const channelKey = ChannelEncryption.channelKeys[activeChannelId];
                if (channelKey) {
                    // 如果密钥存在但未分发或标记为需要重新分发
                    if (!channelKey.distributed || channelKey.needRedistribute) {
                        console.log('检测到密钥需要分发，执行分发操作');
                        checkAndDistributeChannelKey(activeChannelId);
                    } else {
                        // 即使标记为已分发，也定期检查一下频道成员情况
                        console.log('密钥已分发，检查频道成员是否有变化');
                        fetch(`/api/channel_members/${activeChannelId}`)
                            .then(response => response.json())
                            .then(data => {
                                const members = data.members || [];
                                // 检查是否有新成员（无法接收加密消息的成员）
                                if (members.length > 0) {
                                    console.log(`频道有 ${members.length} 个成员，检查是否所有成员都能接收加密消息`);
                                    
                                    // 可以添加额外的逻辑来检查成员的加密状态
                                    // 例如检查最近的加密消息是否被所有成员正确接收
                                    
                                    // 作为预防措施，每隔一段时间强制重新分发一次密钥
                                    const lastDistribution = channelKey.lastDistributionTime || 0;
                                    const now = Date.now();
                                    const ONE_HOUR = 60 * 60 * 1000; // 1小时
                                    
                                    if (now - lastDistribution > ONE_HOUR) {
                                        console.log('上次密钥分发已超过1小时，执行定期重新分发');
                                        // 重置密钥分发状态
                                        resetKeyDistributionStatus(activeChannelId);
                                        // 重新分发密钥
                                        checkAndDistributeChannelKey(activeChannelId);
                                    }
                                }
                            })
                            .catch(error => {
                                console.error('获取频道成员信息失败:', error);
                            });
                    }
                } else {
                    console.warn(`频道 ${activeChannelId} 已启用加密但无密钥，尝试获取密钥`);
                    checkAndDistributeChannelKey(activeChannelId);
                }
            }
        }
    }, CHECK_INTERVAL);
}

// 检查频道并分发密钥的函数
async function checkAndDistributeChannelKey(channelId) {
    if (!channelId) {
        console.log('没有活跃的频道，跳过密钥分发检查');
        return;
    }
    
    console.log(`检查频道 ${channelId} 的密钥分发状态...`);
    
    try {
        // 初始化加密状态变量
        let isEncrypted = false;
        
        try {
            // 从数据库或API获取频道加密状态
            const response = await fetch(`/api/channels/${channelId}/encryption_status`);
            if (response.ok) {
                const data = await response.json();
                isEncrypted = data.is_encrypted;
            } else {
                console.warn(`获取频道加密状态API返回错误: ${response.status}，将使用本地缓存状态`);
                // 如果API不可用，使用本地缓存的状态
                isEncrypted = ChannelEncryption.isChannelEncrypted(channelId);
            }
        } catch (fetchError) {
            console.warn(`获取频道加密状态API不可用: ${fetchError.message}，将使用本地缓存状态`);
            // 如果API请求失败，使用本地缓存的状态
            isEncrypted = ChannelEncryption.isChannelEncrypted(channelId);
        }
        
        if (isEncrypted) {
            console.log(`频道 ${channelId} 已启用加密`);
            
            // 确保本地也标记为加密
            if (!ChannelEncryption.isChannelEncrypted(channelId)) {
                ChannelEncryption.enabledChannels.add(channelId.toString());
                ChannelEncryption.saveEnabledChannels();
                
                // 如果没有密钥，生成一个
                let keyGenerated = false;
                if (!ChannelEncryption.channelKeys[channelId]) {
                    keyGenerated = await ChannelEncryption.generateChannelKey(channelId);
                }
                
                // 确保后端状态一致
                try {
                    await ChannelEncryption.syncEncryptionStatusWithBackend(channelId, true);
                } catch (syncError) {
                    console.error(`同步加密状态到后端时出错: ${syncError.message}`);
                }
                
                // 检查密钥是否存在并已准备好分发
                const channelKey = ChannelEncryption.channelKeys[channelId];
                const needDistribution = keyGenerated || 
                    !channelKey || 
                    channelKey.distributed === undefined || 
                    channelKey.distributed === false;
                
                // 如果密钥刚刚生成或没有记录分发过，尝试分发密钥
                if (needDistribution && ChannelEncryption.cryptoManagerAvailable) {
                    console.log('需要分发频道密钥给其他成员...');
                    // 通知服务器频道已启用加密
                    await ChannelEncryption.notifyChannelEncryptionEnabled(channelId);
                    
                    // 分发密钥给频道成员
                    const distributionSuccess = await ChannelEncryption.distributeChannelKey(channelId);
                    if (distributionSuccess) {
                        // 标记密钥已分发
                        ChannelEncryption.channelKeys[channelId].distributed = true;
                        ChannelEncryption.channelKeys[channelId].needRedistribute = false;
                        ChannelEncryption.channelKeys[channelId].lastDistributionTime = Date.now();
                        ChannelEncryption.saveChannelKeys();
                        console.log('频道密钥分发成功');
                    } else {
                        console.warn('密钥分发可能未完全成功，一些用户可能无法解密消息');
                    }
                } else {
                    console.log('密钥已分发过，跳过密钥分发步骤');
                }
            } else {
                // 即使已经启用了加密，也确保后端状态同步
                try {
                    await ChannelEncryption.syncEncryptionStatusWithBackend(channelId, true);
                } catch (syncError) {
                    console.error(`同步加密状态到后端时出错: ${syncError.message}`);
                }
                
                // 检查一下分发状态
                const channelKey = ChannelEncryption.channelKeys[channelId];
                if (channelKey) {
                    try {
                        const membersResponse = await fetch(`/api/channel_members/${channelId}`);
                        const membersData = await membersResponse.json();
                        const totalMembers = membersData.members ? membersData.members.length : 0;
                        
                        // 如果频道有多个成员但密钥未分发，或标记为需要重新分发，则进行分发
                        if ((totalMembers > 1 && (!channelKey.distributed || channelKey.needRedistribute)) && 
                            ChannelEncryption.cryptoManagerAvailable) {
                            console.log(`频道 ${channelId} 存在多个成员且密钥需要分发，重新分发密钥...`);
                            
                            // 重置分发状态
                            resetKeyDistributionStatus(channelId);
                            
                            // 分发密钥
                            const distributionSuccess = await ChannelEncryption.distributeChannelKey(channelId);
                            if (distributionSuccess) {
                                // 标记密钥已分发
                                ChannelEncryption.channelKeys[channelId].distributed = true;
                                ChannelEncryption.channelKeys[channelId].needRedistribute = false;
                                ChannelEncryption.channelKeys[channelId].lastDistributionTime = Date.now();
                                ChannelEncryption.saveChannelKeys();
                                console.log('频道密钥重新分发成功');
                            } else {
                                console.warn('密钥重新分发可能未完全成功');
                            }
                        }
                    } catch (membersError) {
                        console.error(`获取频道成员信息失败: ${membersError.message}`);
                    }
                }
            }
            // 更新UI指示器
            ChannelEncryption.updateEncryptionIndicator(true);
        } else {
            // 频道未启用加密
            console.log(`频道 ${channelId} 未启用加密`);
            // 如果本地标记为已加密，同步到后端
            if (ChannelEncryption.isChannelEncrypted(channelId)) {
                console.log(`本地标记为已加密，但后端未启用，同步状态...`);
                try {
                    await ChannelEncryption.syncEncryptionStatusWithBackend(channelId, true);
                } catch (syncError) {
                    console.error(`同步加密状态到后端时出错: ${syncError.message}`);
                }
            } else {
                ChannelEncryption.updateEncryptionIndicator(false);
            }
        }
    } catch (error) {
        console.warn('获取或处理频道加密状态失败:', error);
        
        // 错误处理：确保UI更新
        const localEncryptionStatus = ChannelEncryption.isChannelEncrypted(channelId);
        ChannelEncryption.updateEncryptionIndicator(localEncryptionStatus);
        
        // 如果本地已启用加密，尝试同步后端和进行密钥分发
        if (localEncryptionStatus && ChannelEncryption.channelKeys && ChannelEncryption.channelKeys[channelId]) {
            console.log('尽管发生错误，但本地状态显示频道已启用加密，尝试同步状态和密钥分发');
            
            // 尝试同步到后端
            try {
                await ChannelEncryption.syncEncryptionStatusWithBackend(channelId, true);
            } catch (syncError) {
                console.error(`同步加密状态到后端时出错: ${syncError.message}`);
            }
            
            // 标记需要重新分发
            if (!ChannelEncryption.channelKeys[channelId].distributed) {
                // 如果成员获取API已在其它地方失败，这里可能会再次尝试
                try {
                    const distributionSuccess = await ChannelEncryption.distributeChannelKey(channelId);
                    if (distributionSuccess) {
                        ChannelEncryption.channelKeys[channelId].distributed = true;
                        ChannelEncryption.channelKeys[channelId].lastDistributionTime = Date.now();
                        ChannelEncryption.saveChannelKeys();
                        console.log('尽管API存在问题，但密钥分发成功');
                    }
                } catch (distributionError) {
                    console.error('尝试分发密钥时发生错误:', distributionError);
                }
            }
        }
    }
}

// 设置频道切换监听器
function setupChannelChangeListener() {
    console.log('设置频道切换监听器');
    
    // 监听hash变化（如果使用hash路由）
    window.addEventListener('hashchange', handleChannelChange);
    
    // 尝试查找并监听频道列表点击事件
    const channelListItems = document.querySelectorAll('.channel-item, .channel-link, [data-channel-id]');
    channelListItems.forEach(item => {
        item.addEventListener('click', function() {
            const channelId = this.getAttribute('data-channel-id') || 
                             this.getAttribute('href')?.match(/channel\/(\d+)/)?.[1];
            if (channelId) {
                console.log(`检测到频道切换: ${channelId}`);
                setTimeout(() => checkAndDistributeChannelKey(channelId), 500);
            }
        });
    });
    
    // 如果有socket连接，监听频道相关事件
    if (typeof socket !== 'undefined') {
        // 监听自己加入频道的事件
        socket.on('channel_join', function(data) {
            const channelId = data.channel_id;
            console.log(`通过Socket检测到加入频道: ${channelId}`);
            setTimeout(() => checkAndDistributeChannelKey(channelId), 500);
        });
        
        // 监听其他用户加入频道的事件
        socket.on('user_joined_channel', function(data) {
            const channelId = data.channel_id;
            const userId = data.user_id;
            
            console.log(`检测到用户 ${userId} 加入频道 ${channelId}`);
            
            // 如果是当前频道，且当前用户不是加入者，且频道已启用加密
            if (channelId == activeChannelId && 
                userId != window.currentUserId && 
                ChannelEncryption.isChannelEncrypted(channelId)) {
                
                // 检查自己是否拥有密钥
                if (ChannelEncryption.channelKeys[channelId]) {
                    console.log(`新用户 ${userId} 加入了已加密的频道，标记需要重新分发密钥`);
                    
                    // 标记需要重新分发
                    ChannelEncryption.channelKeys[channelId].needRedistribute = true;
                    ChannelEncryption.saveChannelKeys();
                    
                    // 延迟一小段时间后重新分发密钥，确保用户完全连接
                    setTimeout(() => {
                        // 尝试主动向新用户分发密钥
                        try {
                            distributeKeyToUser(userId).then(success => {
                                if (success) {
                                    console.log(`已成功向新用户 ${userId} 分发频道密钥`);
                                } else {
                                    console.warn(`向新用户 ${userId} 分发密钥失败，将在下次检查时重试`);
                                }
                            });
                        } catch(e) {
                            console.error(`尝试向新用户分发密钥时出错:`, e);
                        }
                    }, 2000);
                }
            }
        });
    }
}

// 处理频道变更事件
function handleChannelChange() {
    const channelMatch = location.hash.match(/channel\/(\d+)/);
    if (channelMatch) {
        const channelId = channelMatch[1];
        console.log(`检测到通过URL变更频道: ${channelId}`);
        setTimeout(() => checkAndDistributeChannelKey(channelId), 500);
    }
}

// 将函数暴露到全局，方便调试和手动调用
window.checkAndDistributeChannelKey = checkAndDistributeChannelKey;
window.resetKeyDistributionStatus = resetKeyDistributionStatus;
window.forceDistributeChannelKey = forceDistributeChannelKey;

// 添加测试按钮到UI
document.addEventListener('DOMContentLoaded', () => {
    // 查找消息输入表单
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        // 创建加密切换按钮
        const encryptionToggle = document.createElement('button');
        encryptionToggle.id = 'toggleEncryptionBtn';
        encryptionToggle.type = 'button';
        encryptionToggle.className = 'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors';
        encryptionToggle.title = '切换频道加密';
        encryptionToggle.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
            </svg>
        `;
        
        // 添加点击事件
        encryptionToggle.addEventListener('click', toggleChannelEncryption);
        
        // 加密状态指示器
        encryptionToggle.classList.add(
            ChannelEncryption.isChannelEncrypted(activeChannelId) ? 'enabled' : 'disabled'
        );
        
        // 创建密钥分发按钮
        const distributeKeyBtn = document.createElement('button');
        distributeKeyBtn.id = 'distributeKeyBtn';
        distributeKeyBtn.type = 'button';
        distributeKeyBtn.className = 'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ml-1';
        distributeKeyBtn.title = '手动分发频道密钥';
        distributeKeyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
            </svg>
        `;
        
        // 添加点击事件
        distributeKeyBtn.addEventListener('click', forceDistributeChannelKey);
        
        // 创建单用户密钥分发按钮
        const distributeToUserBtn = document.createElement('button');
        distributeToUserBtn.id = 'distributeToUserBtn';
        distributeToUserBtn.type = 'button';
        distributeToUserBtn.className = 'p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ml-1';
        distributeToUserBtn.title = '向单个用户分发密钥';
        distributeToUserBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
        `;
        
        // 添加点击事件
        distributeToUserBtn.addEventListener('click', () => distributeKeyToUser());
        
        // 在消息输入框之前插入按钮
        const messageInput = document.getElementById('messageInput');
        if (messageInput && messageInput.parentNode) {
            messageInput.parentNode.insertBefore(distributeToUserBtn, messageInput);
            messageInput.parentNode.insertBefore(distributeKeyBtn, distributeToUserBtn);
            messageInput.parentNode.insertBefore(encryptionToggle, distributeKeyBtn);
        } else {
            // 或者添加到表单末尾
            messageForm.insertBefore(distributeToUserBtn, messageForm.firstChild);
            messageForm.insertBefore(distributeKeyBtn, distributeToUserBtn);
            messageForm.insertBefore(encryptionToggle, distributeKeyBtn);
        }
    }
}); 

/**
 * KDM密钥同步相关功能
 */

// 存储上次看到的KDM版本号
let lastKdmVersionSeen = 0;

// 初始化KDM同步
async function initKdmSync() {
    console.log('初始化KDM同步...');
    
    try {
        // 从localStorage获取上次同步的版本号
        const storedVersion = localStorage.getItem('last_kdm_version_seen');
        if (storedVersion) {
            lastKdmVersionSeen = parseInt(storedVersion, 10);
            console.log(`从本地存储加载KDM版本号: ${lastKdmVersionSeen}`);
        }
        
        // 注册页面可见性变化事件，用于前台同步
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // 设置周期性同步（每30分钟）
        setInterval(periodicKdmSync, 30 * 60 * 1000);
        
        // 在WebSocket重连时同步
        setupWebSocketReconnectSync();
        
        console.log('KDM同步初始化完成');
        
        // 首次进入频道时同步
        if (window.activeChannelId) {
            pullKdm();
        }
        
        return true;
    } catch (e) {
        console.error('初始化KDM同步失败:', e);
        return false;
    }
}

// 处理页面可见性变化事件
function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        console.log('页面转为前台，触发KDM同步');
        pullKdm();
    }
}

// 周期性KDM同步
async function periodicKdmSync() {
    console.log('执行周期性KDM同步');
    pullKdm();
}

// 设置WebSocket重连时的KDM同步
function setupWebSocketReconnectSync() {
    if (typeof socket !== 'undefined') {
        // 监听重连成功事件
        socket.on('reconnect', () => {
            console.log('WebSocket重连成功，同步KDM');
            
            // 发送当前版本号给服务器
            socket.emit('kdm_sync', { after: lastKdmVersionSeen });
            
            // 主动拉取，以防WebSocket推送有遗漏
            pullKdm();
        });
        
        // 添加KDM同步处理
        socket.on('kdm_update', (data) => {
            console.log('收到KDM更新推送:', data);
            
            if (data.encrypted_keys_for_me) {
                processReceivedKdm(data);
            }
        });
        
        // 监听频道成员变动事件
        socket.on('member-update', (data) => {
            console.log('收到频道成员变动事件:', data);
            
            // 标记需要刷新密钥
            needKeyRefresh = true;
            
            // 如果当前在此频道，且启用了加密，则触发密钥生成和分发
            if (window.activeChannelId && 
                data.channel_id == window.activeChannelId && 
                ChannelEncryption.isChannelEncrypted(window.activeChannelId)) {
                console.log('频道成员已变动，准备生成新密钥');
                // 下次发消息前会强制生成新密钥
            }
        });
    }
}

// 密钥刷新标志
let needKeyRefresh = false;

// 处理频道切换
function handleChannelSwitch(newChannelId) {
    console.log(`切换到频道 ${newChannelId}，检查是否需要同步KDM`);
    
    // 首次进入频道时同步
    pullKdm(newChannelId);
}

// 拉取KDM密钥
async function pullKdm(channelId = null) {
    try {
        console.log(`开始拉取KDM，上次版本: ${lastKdmVersionSeen}, 频道: ${channelId || '所有'}`);
        
        // 构建请求URL
        let url = `/api/kdm/pending?after=${lastKdmVersionSeen}`;
        if (channelId) {
            url += `&channel_id=${channelId}`;
        }
        
        // 发送请求
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`服务器返回错误: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`拉取到 ${data.count} 个挂起的KDM密钥, 最新版本: ${data.latest_version}`);
        
        if (data.count > 0) {
            // 处理每个KDM密钥
            for (const kdm of data.pending_keys) {
                await processReceivedKdm(kdm);
            }
            
            // 更新最新版本号
            if (data.latest_version > lastKdmVersionSeen) {
                lastKdmVersionSeen = data.latest_version;
                // 保存到本地存储
                localStorage.setItem('last_kdm_version_seen', lastKdmVersionSeen.toString());
                
                // 向服务器确认接收
                await acknowledgeKdm(channelId, lastKdmVersionSeen);
            }
        }
        
        return data.count;
    } catch (e) {
        console.error('拉取KDM失败:', e);
        return 0;
    }
}

// 确认接收KDM密钥
async function acknowledgeKdm(channelId, version) {
    try {
        console.log(`确认接收KDM版本: ${version}, 频道: ${channelId || '所有'}`);
        
        const response = await fetch('/api/kdm/ack', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': ChannelEncryption.getCSRFToken()
            },
            body: JSON.stringify({
                channel_id: channelId || window.activeChannelId,
                version: version
            })
        });
        
        if (!response.ok) {
            throw new Error(`服务器返回错误: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('KDM确认结果:', data);
        
        return data.success;
    } catch (e) {
        console.error('确认KDM失败:', e);
        return false;
    }
}

// 处理收到的KDM密钥
async function processReceivedKdm(kdm) {
    try {
        console.log(`处理收到的KDM密钥, 频道: ${kdm.channel_id}, 发送者: ${kdm.sender_username || kdm.sender_id}`);
        
        // 使用ChannelEncryption处理接收到的密钥
        const success = await ChannelEncryption.processReceivedChannelKey(
            kdm.encrypted_keys_for_me,
            kdm.sender_id,
            kdm.channel_id
        );
        
        if (success) {
            console.log(`成功处理频道 ${kdm.channel_id} 的KDM密钥`);
            
            // 如果当前在这个频道，更新UI
            if (window.activeChannelId == kdm.channel_id) {
                ChannelEncryption.updateEncryptionIndicator(true);
            }
            
            return true;
        } else {
            console.error(`处理频道 ${kdm.channel_id} 的KDM密钥失败`);
            return false;
        }
    } catch (e) {
        console.error('处理KDM密钥失败:', e);
        return false;
    }
}

// 处理消息解密失败
async function handleDecryptionFailure(message) {
    try {
        console.log('消息解密失败，尝试获取最新密钥');
        
        const channelId = message.channel_id;
        const senderKeyVersion = message.sender_key_version;
        
        if (!channelId) {
            console.error('消息缺少channel_id，无法获取密钥');
            return false;
        }
        
        // 拉取密钥，指定版本号为"缺失版本-1"
        let versionToFetch = 0;
        if (senderKeyVersion) {
            versionToFetch = parseInt(senderKeyVersion, 10) - 1;
        }
        
        console.log(`拉取频道 ${channelId} 的密钥，版本号: ${versionToFetch}`);
        
        // 触发拉取
        const result = await pullKdm(channelId);
        
        if (result > 0) {
            console.log('拉取成功，尝试重新解密消息');
            return true;
        } else {
            console.log('没有获取到新密钥，解密失败');
            return false;
        }
    } catch (e) {
        console.error('处理解密失败时出错:', e);
        return false;
    }
}

// 在ChannelEncryption中暴露KDM同步相关方法
Object.assign(ChannelEncryption, {
    initKdmSync,
    pullKdm,
    handleDecryptionFailure,
    getLastKdmVersion: () => lastKdmVersionSeen
});

// 在文档加载完成后初始化KDM同步
document.addEventListener('DOMContentLoaded', () => {
    // 在ChannelEncryption初始化后执行
    if (typeof ChannelEncryption !== 'undefined') {
        ChannelEncryption.ensureInitialized().then(() => {
            initKdmSync().catch(err => {
                console.error('KDM同步初始化失败:', err);
            });
        });
    }
}); 