/**
 * 固定消息处理
 * 处理固定消息按钮和固定消息面板
 */

// 当文档加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing pin message functionality');
    
    // 将固定消息函数暴露到全局作用域
    window.pinMessageHandler = pinMessage;
    window.unpinMessageHandler = unpinMessage;
    window.updatePinnedMessages = updatePinnedMessagesList;
    
    // 设置Pin按钮
    setupPinButton();
    
    // 设置消息固定按钮
    setupMessagePinButtons();
    
    // 初始化固定消息管理器
    initPinHandler();
});

// 设置Pin按钮功能
function setupPinButton() {
    const pinButton = document.getElementById('togglePinned');
    if (!pinButton) {
        console.error('未找到Pin按钮 #togglePinned');
        return;
    }
    
    console.log('Setting up Pin button click events');
    
    // 添加点击事件
    pinButton.addEventListener('click', function(e) {
        console.log('Pin button clicked');
        e.preventDefault();
        e.stopPropagation();
        
        // 获取面板元素
        const pinnedPanel = document.getElementById('pinnedPanel');
        if (!pinnedPanel) {
            console.error('未找到固定消息面板 #pinnedPanel');
            return;
        }
        
        // 切换面板可见性
        togglePanel(pinnedPanel);
    });
}

// 切换面板可见性
function togglePanel(panel) {
    // 检查面板是否隐藏
    const isHidden = panel.classList.contains('translate-x-full');
    
    // 切换可见性
    if (isHidden) {
        panel.classList.remove('translate-x-full');
    } else {
        panel.classList.add('translate-x-full');
    }
    
    console.log(`面板 ${panel.id} 现在是 ${isHidden ? '可见' : '隐藏'} 的`);
}

// 设置消息固定按钮
function setupMessagePinButtons() {
    // 使用事件委托，监听整个消息容器
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) {
        console.error('未找到消息容器 #messagesContainer');
        return;
    }
    
    // 添加点击事件委托
    messagesContainer.addEventListener('click', function(e) {
        // 检查是否点击了固定按钮
        const starButton = e.target.closest('.message-star-btn');
        if (starButton) {
            e.preventDefault();
            e.stopPropagation();
            
            // 获取消息ID
            const messageId = starButton.getAttribute('data-message-id');
            if (messageId) {
                console.log(`尝试固定消息 ID: ${messageId}`);
                pinMessage(messageId);
            }
        }
    });
}

// 固定消息
function pinMessage(messageId) {
    if (!messageId) {
        console.error('无效的消息ID');
        return;
    }
    
    console.log(`正在固定消息: ${messageId}`);
    
    // 获取当前活跃频道ID
    const channelId = activeChannelId;
    if (!channelId) {
        showToast('无法确定当前频道', 'error');
        return;
    }
    
    // 发送API请求固定消息
    fetch('/api/pin_message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message_id: messageId,
            channel_id: channelId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('请求失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast('消息已固定', 'success');
            
            // 如果面板可见，则更新固定消息列表
            const pinnedPanel = document.getElementById('pinnedPanel');
            if (pinnedPanel && !pinnedPanel.classList.contains('translate-x-full')) {
                updatePinnedMessagesList();
            }
        } else {
            showToast(data.message || '固定消息失败', 'error');
        }
    })
    .catch(error => {
        console.error('固定消息错误:', error);
        // 模拟成功（以便开发测试）
        showToast('消息已固定（模拟）', 'success');
        
        // 获取要固定的消息
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            // 将消息添加到固定消息面板
            addToPinnedPanel(messageElement, messageId);
        }
    });
}

// 添加消息到固定消息面板
function addToPinnedPanel(originalMessage, messageId) {
    const pinnedPanel = document.getElementById('pinnedPanel');
    if (!pinnedPanel) {
        console.error('未找到固定消息面板 #pinnedPanel');
        return;
    }
    
    // 获取固定消息容器
    const pinnedMessagesContainer = document.getElementById('pinnedMessagesContainer');
    if (!pinnedMessagesContainer) {
        console.error('未找到固定消息容器 #pinnedMessagesContainer');
        return;
    }
    
    // 检查消息是否已经固定（避免重复）
    const existingPinned = pinnedMessagesContainer.querySelector(`[data-message-id="${messageId}"]`);
    if (existingPinned) {
        console.log('Message already pinned, avoiding duplicate');
        return;
    }
    
    // 获取消息主体内容
    const messageContent = originalMessage.querySelector('.message-content');
    const senderName = originalMessage.querySelector('.sender-name');
    const messageTime = originalMessage.querySelector('.message-time');
    
    // 克隆消息元素
    const clonedMessage = originalMessage.cloneNode(true);
    clonedMessage.classList.add('pinned-message');
    clonedMessage.classList.add('bg-blue-50');
    clonedMessage.classList.add('dark:bg-blue-900/10');
    clonedMessage.classList.add('p-3');
    clonedMessage.classList.add('border');
    clonedMessage.classList.add('border-blue-100');
    clonedMessage.classList.add('dark:border-blue-800');
    clonedMessage.classList.add('shadow-sm');
    clonedMessage.classList.add('opacity-0'); // 初始透明，用于动画
    
    // 查找并修改操作按钮
    const actionButtons = clonedMessage.querySelector('.opacity-0.group-hover\\:opacity-100');
    if (actionButtons) {
        actionButtons.classList.remove('opacity-0', 'group-hover:opacity-100');
        actionButtons.classList.add('opacity-100');
        
        // 移除其他按钮，只保留解除固定按钮
        const buttons = actionButtons.querySelectorAll('button');
        buttons.forEach(button => {
            if (!button.classList.contains('message-star-btn')) {
                button.remove();
            } else {
                // 更改固定按钮图标为解除固定
                button.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                `;
                button.title = "解除固定";
                button.classList.add('text-red-500');
                button.classList.remove('hover:text-yellow-500');
                button.classList.add('hover:bg-red-50');
                button.classList.add('dark:hover:bg-red-900/20');
                
                // 添加解除固定事件
                button.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    unpinMessage(messageId);
                };
            }
        });
    }
    
    // 添加显示固定时间
    const timeInfo = clonedMessage.querySelector('.message-time');
    if (timeInfo) {
        const now = new Date();
        timeInfo.textContent = timeInfo.textContent + ' · 刚刚固定';
    }
    
    // 添加到固定消息面板
    pinnedMessagesContainer.appendChild(clonedMessage);
    
    // 添加进入动画
    setTimeout(() => {
        clonedMessage.classList.add('animate-bounce-in');
    }, 10);
    
    // 显示固定消息面板
    pinnedPanel.classList.remove('translate-x-full');
}

// 更新固定消息列表
function updatePinnedMessagesList() {
    const messageContainer = document.querySelector('#pinnedPanel .p-6');
    if (!messageContainer) {
        console.error('Pinned message container not found');
        return;
    }
    
    // 获取当前活跃频道ID
    const channelId = activeChannelId;
    if (!channelId) {
        messageContainer.innerHTML = `
            <div class="text-center py-8 px-4 animate-fade-in">
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <img src="../static/images/unpinned.png" class="w-16 h-16 mx-auto mb-4 opacity-70 dark:opacity-90" />
                    <h3 class="font-semibold text-lg text-gray-700 dark:text-gray-200 mb-2">Please select a channel first</h3>
                    <p class="text-sm mt-2 text-gray-500 dark:text-gray-400">
                        After selecting a channel, you can view pinned messages in that channel.
                    </p>
                </div>
            </div>
        `;
        return;
    }
    
    // 显示加载中状态
    messageContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-40">
            <div class="relative w-16 h-16">
                <div class="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 animate-spin"></div>
                <div class="absolute inset-3 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </div>
            </div>
            <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading pinned messages...</p>
        </div>
    `;
    
    // 获取固定消息列表
    fetch(`/api/pinned_messages?channel_id=${channelId}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Request failed');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.pinned_messages && data.pinned_messages.length > 0) {
            // 清空容器
            messageContainer.innerHTML = '';
            
            // 显示固定消息
            data.pinned_messages.forEach(message => {
                // 创建固定消息元素
                const pinnedMessage = createPinnedMessageElement(message);
                messageContainer.appendChild(pinnedMessage);
            });
        } else {
            // 显示无固定消息状态
            messageContainer.innerHTML = `
                <div class="text-center py-8 px-4 animate-fade-in">
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <img src="../static/images/unpinned.png" class="w-16 h-16 mx-auto mb-4 opacity-70 dark:opacity-90" />
                        <h3 class="font-semibold text-lg text-gray-700 dark:text-gray-200 mb-2">No pinned messages yet</h3>
                        <p class="text-sm mt-2 text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                            Important messages pinned by admins or moderators will appear here for all members to reference.
                        </p>
                        
                        <div class="mt-4 flex items-center justify-center">
                            <div class="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Click the 📌 icon next to a message to pin it
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error getting pinned messages:', error);
        
        // 显示加载错误状态
        messageContainer.innerHTML = `
            <div class="text-center py-8 px-4">
                <div class="bg-red-50 dark:bg-red-900/10 rounded-xl p-6 border border-red-100 dark:border-red-800/30 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 class="font-semibold text-lg text-gray-700 dark:text-gray-200 mb-2">Failed to load</h3>
                    <p class="text-sm mt-2 text-gray-500 dark:text-gray-400">
                        Unable to load pinned messages. Please try again later.
                    </p>
                    <button class="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md shadow-sm transition-colors" onclick="updatePinnedMessagesList()">
                        Retry
                    </button>
                </div>
            </div>
        `;
    });
}

// 创建固定消息元素
function createPinnedMessageElement(message) {
    // 创建美观的固定消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = 'pinned-message bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 mb-3 relative animate-fade-in opacity-0';
    messageDiv.setAttribute('data-message-id', message.id);
    
    // 创建一个固定标记角标
    const pinBadge = document.createElement('div');
    pinBadge.className = 'absolute -right-1.5 -top-1.5 bg-red-500 text-white h-5 w-5 rounded-full flex items-center justify-center shadow-sm';
    pinBadge.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>';
    
    // 获取用户首字母
    const userInitial = message.user ? message.user.username[0].toUpperCase() : '?';
    
    // 构建消息HTML
    messageDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold shadow-sm flex-shrink-0">${userInitial}</div>
        <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
                <p class="text-sm text-gray-700 dark:text-gray-300">
                    <strong class="sender-name">${message.user ? message.user.username : 'Unknown User'}</strong> · 
                    <span class="message-time text-xs text-gray-500">${formatMessageTime(message.created_at)}</span>
                </p>
                <div class="flex gap-1 opacity-100 ml-auto">
                    <button class="p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded message-star-btn" data-message-id="${message.id}" title="Unpin">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="mt-1.5 text-sm text-gray-800 dark:text-gray-200 break-words message-content bg-white dark:bg-gray-700 p-2 rounded">
                ${formatMessageContent(message.content || '')}
            </div>
            <div class="mt-1 text-xs text-blue-500 dark:text-blue-400">
                <span class="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Pinned by ${message.pinned_by ? message.pinned_by.username : 'Unknown User'} · ${formatPinnedTime(message.pinned_at)}
                </span>
            </div>
        </div>
    `;
    
    // 添加解除固定事件
    const unpinBtn = messageDiv.querySelector('.message-star-btn');
    if (unpinBtn) {
        unpinBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 添加动画效果
            messageDiv.classList.add('animate-fade-out');
            setTimeout(() => {
                unpinMessage(message.id);
            }, 300);
        });
    }
    
    // 添加固定角标
    messageDiv.appendChild(pinBadge);
    
    return messageDiv;
}

// 格式化固定时间
function formatPinnedTime(timestamp) {
    if (!timestamp) return 'just now';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
        return `${diffDays} days ago`;
    } else if (diffHours > 0) {
        return `${diffHours} hours ago`;
    } else if (diffMins > 0) {
        return `${diffMins} minutes ago`;
    } else {
        return 'just now';
    }
}

// 解除固定消息
function unpinMessage(messageId) {
    if (!messageId) {
        console.error('Invalid message ID');
        return;
    }
    
    console.log(`正在解除固定消息: ${messageId}`);
    
    // 获取当前活跃频道ID
    const channelId = activeChannelId;
    if (!channelId) {
        showToast('无法确定当前频道', 'error');
        return;
    }
    
    // 发送API请求解除固定消息
    fetch('/api/unpin_message', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message_id: messageId,
            channel_id: channelId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('请求失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast('消息已解除固定', 'success');
            
            // 移除固定消息元素
            removePinnedMessage(messageId);
        } else {
            showToast(data.message || '解除固定消息失败', 'error');
        }
    })
    .catch(error => {
        console.error('解除固定消息错误:', error);
        
        // 模拟成功（用于开发测试）
        showToast('消息已解除固定（模拟）', 'success');
        
        // 移除固定消息元素
        removePinnedMessage(messageId);
    });
}

// 从面板中移除固定消息
function removePinnedMessage(messageId) {
    // 查找固定消息元素
    const pinnedMessage = document.querySelector(`#pinnedPanel .pinned-message[data-message-id="${messageId}"]`);
    if (pinnedMessage) {
        // 添加移除动画
        pinnedMessage.classList.add('animate-fade-out');
        
        // 动画结束后移除元素
        setTimeout(() => {
            // 移除元素
            pinnedMessage.remove();
            
            // 检查是否没有固定消息了
            const pinnedMessagesContainer = document.querySelector('#pinnedPanel .p-6');
            if (pinnedMessagesContainer && !pinnedMessagesContainer.querySelector('.pinned-message')) {
                // 显示无固定消息状态（美化版本）
                pinnedMessagesContainer.innerHTML = `
                    <div class="text-center py-8 px-4 animate-fade-in">
                        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <img src="../static/images/unpinned.png" class="w-16 h-16 mx-auto mb-4 opacity-70 dark:opacity-90" />
                            <h3 class="font-semibold text-lg text-gray-700 dark:text-gray-200 mb-2">No pinned messages yet</h3>
                            <p class="text-sm mt-2 text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                Important messages pinned by admins or moderators will appear here for all members to reference.
                            </p>
                            
                            <div class="mt-4 flex items-center justify-center">
                                <div class="text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Click the 📌 icon next to a message to pin it
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }, 300); // 匹配动画持续时间
    }
}

// 显示提示信息
function showToast(message, type = 'info') {
    // 如果已经有全局的showToast函数，使用它
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // 否则创建一个临时的toast
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-md z-50 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 2秒后自动消失
    setTimeout(function() {
        document.body.removeChild(toast);
    }, 2000);
}

// 格式化消息内容，处理链接等
function formatMessageContent(content) {
    if (!content) return '';
    
    // 转义HTML特殊字符
    let formattedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // 检测图片URL模式并转换为<img>标签 - 先处理图片
    if (formattedContent.includes('/uploads/') && (
        formattedContent.includes('.png') || 
        formattedContent.includes('.jpg') || 
        formattedContent.includes('.jpeg') || 
        formattedContent.includes('.gif')
    )) {
        // 如果整个内容看起来像是一个图片URL，则转换为图片标签
        return `<img src="${formattedContent}" alt="Uploaded Image" class="mt-2 max-w-xs rounded shadow-sm" style="max-height:300px;">`;
    }
    
    // 检测静态路径的图片并替换为新路径
    if (formattedContent.includes('/static/uploads/') && (
        formattedContent.includes('.png') || 
        formattedContent.includes('.jpg') || 
        formattedContent.includes('.jpeg') || 
        formattedContent.includes('.gif')
    )) {
        // 提取文件名
        const filename = formattedContent.split('/').pop();
        return `<img src="/uploads/${filename}" alt="Uploaded Image" class="mt-2 max-w-xs rounded shadow-sm" style="max-height:300px;">`;
    }
    
    // 将URL转换为链接
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formattedContent = formattedContent.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" class="text-blue-500 hover:underline">${url}</a>`;
    });
    
    return formattedContent;
}

// 格式化消息时间
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 初始化固定消息管理
function initPinHandler() {
    console.log('Initializing pinned messages manager...');
    
    // 检查固定消息面板是否存在，如果不存在则创建
    if (!document.getElementById('pinnedPanel')) {
        createPinnedPanel();
    }
    
    // 设置消息固定按钮事件监听
    setupMessagePinButtons();
    
    // 添加面板切换事件监听
    const togglePinnedButton = document.getElementById('togglePinned');
    if (togglePinnedButton) {
        togglePinnedButton.addEventListener('click', function(e) {
            e.preventDefault();
            const pinnedPanel = document.getElementById('pinnedPanel');
            if (pinnedPanel) {
                pinnedPanel.classList.toggle('translate-x-full');
                
                // 如果面板可见，重新加载固定消息
                if (!pinnedPanel.classList.contains('translate-x-full')) {
                    updatePinnedMessagesList();
                }
            }
        });
    }
    
    // 设置关闭按钮事件
    const closePinnedPanelBtn = document.getElementById('closePinnedPanel');
    if (closePinnedPanelBtn) {
        closePinnedPanelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const pinnedPanel = document.getElementById('pinnedPanel');
            if (pinnedPanel) {
                pinnedPanel.classList.add('translate-x-full');
            }
        });
    }
} 