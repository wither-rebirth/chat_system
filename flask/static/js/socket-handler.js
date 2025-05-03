// 添加频道密钥相关的Socket事件处理

// 接收频道密钥请求（管理员接收）
socket.on('channel_key_request', function(data) {
    console.log('收到频道密钥请求:', data);
    
    // 显示密钥请求通知
    showKeyRequestNotification(data);
    
    // 如果用户是当前频道的管理员，自动分发密钥
    if (data.channel_id == activeChannelId && typeof ChannelEncryption !== 'undefined') {
        // 检查是否有频道密钥
        if (ChannelEncryption.channelKeys[data.channel_id]) {
            // 自动分发密钥
            console.log(`自动分发频道 ${data.channel_id} 密钥给用户 ${data.requester_username}`);
            ChannelEncryption.distributeChannelKey(data.channel_id);
        }
    }
});

// 接收频道密钥（普通成员接收）
socket.on('channel_key_share', async function(data) {
    console.log('收到频道密钥共享:', data.channel_id);
    
    if (typeof ChannelEncryption === 'undefined') {
        console.error('无法处理频道密钥：ChannelEncryption未定义');
        return;
    }
    
    try {
        // 确保加密模块已初始化
        await ChannelEncryption.ensureInitialized();
        
        // 处理接收到的密钥
        const success = await ChannelEncryption.processReceivedChannelKey(
            data.encrypted_key,
            data.sender_id,
            data.channel_id
        );
        
        if (success) {
            console.log(`已成功接收并保存频道 ${data.channel_id} 的密钥`);
            
            // 如果当前在这个频道，刷新消息
            if (data.channel_id == activeChannelId) {
                // 更新加密状态指示器
                ChannelEncryption.updateEncryptionIndicator(true);
                
                // 显示成功消息
                if (typeof showToast === 'function') {
                    showToast(`已从 ${data.sender_username} 接收频道密钥，消息已加密`, 'success');
                }
            }
        } else {
            console.error(`处理频道 ${data.channel_id} 密钥失败`);
        }
    } catch (e) {
        console.error('处理频道密钥共享事件失败:', e);
    }
});

// 显示密钥请求通知
function showKeyRequestNotification(data) {
    // 如果有通知系统，使用它
    if (typeof showToast === 'function') {
        showToast(`用户 ${data.requester_username} 请求频道 ${data.channel_id} 的加密密钥`, 'info');
    }
    
    // 如果当前是管理员且在相应频道
    if (data.channel_id == activeChannelId) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'key-request-notification p-4 mb-4 bg-blue-100 text-blue-700 rounded-lg';
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <p><strong>${data.requester_username}</strong> 请求此频道的加密密钥</p>
                    <p class="text-sm text-blue-600">请求时间: ${new Date(data.timestamp).toLocaleString()}</p>
                </div>
                <div>
                    <button class="approve-key-request px-3 py-1 mr-2 bg-green-500 text-white rounded hover:bg-green-600"
                            data-request-id="${data.request_id}" 
                            data-user-id="${data.requester_id}"
                            data-channel-id="${data.channel_id}">
                        批准
                    </button>
                    <button class="dismiss-notification px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                        忽略
                    </button>
                </div>
            </div>
        `;
        
        // 查找消息容器
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            // 添加通知到容器顶部
            messagesContainer.prepend(notification);
            
            // 添加按钮事件处理
            const approveBtn = notification.querySelector('.approve-key-request');
            if (approveBtn) {
                approveBtn.addEventListener('click', function() {
                    const userId = this.getAttribute('data-user-id');
                    const channelId = this.getAttribute('data-channel-id');
                    
                    // 分发密钥
                    if (typeof ChannelEncryption !== 'undefined') {
                        ChannelEncryption.distributeChannelKey(channelId);
                        
                        // 移除通知
                        notification.remove();
                    }
                });
            }
            
            const dismissBtn = notification.querySelector('.dismiss-notification');
            if (dismissBtn) {
                dismissBtn.addEventListener('click', function() {
                    notification.remove();
                });
            }
        }
    }
}

// 添加KDM同步相关的Socket事件处理
socket.on('kdm_sync_request', function(data) {
    console.log('收到KDM同步请求:', data);
    
    // 检查版本号
    const lastVersion = data.last_version_seen || 0;
    
    // 如果有ChannelEncryption模块
    if (typeof ChannelEncryption !== 'undefined' && typeof ChannelEncryption.getLastKdmVersion === 'function') {
        // 获取本地最新版本号
        const localVersion = ChannelEncryption.getLastKdmVersion();
        
        // 回复当前版本号
        socket.emit('kdm_sync_response', {
            last_version_seen: localVersion
        });
        
        // 如果服务器版本比本地新，主动拉取
        if (lastVersion > localVersion) {
            console.log(`服务器KDM版本(${lastVersion})比本地(${localVersion})新，开始同步`);
            if (typeof ChannelEncryption.pullKdm === 'function') {
                ChannelEncryption.pullKdm();
            }
        }
    }
});

// 接收KDM更新
socket.on('kdm_update', async function(data) {
    console.log('收到KDM更新:', data);
    
    // 如果有加密密钥数据且ChannelEncryption可用
    if (data.encrypted_keys_for_me && typeof ChannelEncryption !== 'undefined') {
        try {
            // 确保加密模块已初始化
            if (typeof ChannelEncryption.ensureInitialized === 'function') {
                await ChannelEncryption.ensureInitialized();
            }
            
            // 处理接收到的密钥
            if (typeof ChannelEncryption.processReceivedChannelKey === 'function') {
                const success = await ChannelEncryption.processReceivedChannelKey(
                    data.encrypted_keys_for_me,
                    data.sender_id,
                    data.channel_id
                );
                
                if (success) {
                    console.log(`已成功接收频道 ${data.channel_id} 的KDM密钥更新`);
                    
                    // 更新最新版本号
                    if (data.version && typeof ChannelEncryption.updateLastKdmVersion === 'function') {
                        ChannelEncryption.updateLastKdmVersion(data.version);
                    }
                    
                    // 如果当前在这个频道，更新UI
                    if (window.activeChannelId == data.channel_id) {
                        ChannelEncryption.updateEncryptionIndicator(true);
                    }
                } else {
                    console.error(`处理频道 ${data.channel_id} 的KDM密钥更新失败`);
                }
            }
        } catch (e) {
            console.error('处理KDM更新失败:', e);
        }
    }
});

// 频道成员变更事件处理
socket.on('member-update', function(data) {
    console.log('收到频道成员变更事件:', data);
    
    // 如果在当前频道且已启用加密
    if (window.activeChannelId == data.channel_id && 
        typeof ChannelEncryption !== 'undefined' &&
        ChannelEncryption.isChannelEncrypted(data.channel_id)) {
        
        console.log('频道成员变更，需要更新密钥');
        
        // 标记需要在下次发消息前重新生成密钥
        if (typeof window.needKeyRefresh === 'undefined') {
            window.needKeyRefresh = true;
        }
        
        // 显示通知
        const notificationElement = document.createElement('div');
        notificationElement.className = 'p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg member-update-notification';
        notificationElement.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                </svg>
                <div>
                    <span class="font-medium">频道成员已变更</span>
                    <p>频道成员列表发生变化，将在您下次发送消息时更新加密密钥。</p>
                </div>
            </div>
        `;
        
        // 添加通知到界面
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            // 删除已有的相同通知
            const existingNotification = messagesContainer.querySelector('.member-update-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            // 添加新通知
            messagesContainer.prepend(notificationElement);
            
            // 3秒后自动移除
            setTimeout(() => {
                if (notificationElement.parentNode) {
                    notificationElement.parentNode.removeChild(notificationElement);
                }
            }, 5000);
        }
    }
}); 