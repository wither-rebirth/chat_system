/**
 * Mention Manager
 * For handling @mention functionality and displaying mention history
 */

// Current loaded mention records
let mentionItems = [];
let currentMentionPage = 0;
let itemsPerPage = 20;
let totalMentions = 0;

// Autocomplete variables
let activeMentionSuggestions = false;
let currentMentionQuery = '';
let selectedSuggestionIndex = -1;
let mentionSuggestions = [];
let mentionPopup = null;

// Initialize mention manager
function initMentionManager() {
    console.log('Initializing mention manager');

    // 设置提及按钮事件
    setupMentionButton();
    
    // 创建自动完成弹窗
    createMentionPopup();
    
    // 设置输入框监听事件，用于触发@自动完成
    setupMessageInputListener();
    
    // 添加提及面板打开事件监听
    document.addEventListener('mentionPanelOpened', function() {
        loadMentionItems(true);
    });
    
    // 确保提及面板在切换后显示最新内容
    document.addEventListener('click', function(e) {
        if (e.target.closest('#toggleMention') || e.target.id === 'toggleMention' || 
            e.target.closest('#toggleMentions') || e.target.id === 'toggleMentions') {
            console.log('Detected mention panel opening');
            setTimeout(() => {
                loadMentionItems(true);
            }, 100);
        }
    });
    
    // 优化提及面板UI
    enhanceMentionPanel();
    
    // 监听消息内容，检测提及
    listenForMentions();
    
    // 确保面板存在并正常工作
    checkPanelWrapper();
    
    console.log('Mention manager initialization complete');
}

// 创建@自动完成弹窗
function createMentionPopup() {
    // 移除可能已存在的弹窗
    const existingPopup = document.getElementById('mentionSuggestionsPopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // 创建弹窗元素
    mentionPopup = document.createElement('div');
    mentionPopup.id = 'mentionSuggestionsPopup';
    mentionPopup.className = 'fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 overflow-hidden hidden';
    mentionPopup.style.minWidth = '200px';
    mentionPopup.style.maxHeight = '300px';
    mentionPopup.style.overflowY = 'auto';
    mentionPopup.innerHTML = `
        <div class="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
            Type to search users...
        </div>
        <div class="mention-suggestions-list"></div>
    `;
    
    // 添加到body
    document.body.appendChild(mentionPopup);
    
    // 添加全局点击事件，点击外部关闭弹窗
    document.addEventListener('click', function(e) {
        if (activeMentionSuggestions && !mentionPopup.contains(e.target) && !e.target.matches('#messageInput')) {
            hideMentionSuggestions();
        }
    });
}

// 设置消息输入框监听
function setupMessageInputListener() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) {
        console.error('Cannot find messageInput element for mention autocomplete');
        return;
    }
    
    // 监听输入事件，检测@符号
    messageInput.addEventListener('input', function(e) {
        const text = this.value;
        const cursorPos = this.selectionStart;
        
        // 查找光标位置前的文本
        const textBeforeCursor = text.substring(0, cursorPos);
        
        // 查找最后一个@符号的位置
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        // 如果找到@符号并且它后面跟着的是用户名部分（没有空格）
        if (lastAtIndex !== -1 && textBeforeCursor.substring(lastAtIndex).indexOf(' ') === -1) {
            // 提取查询字符串（@后面的部分）
            const query = textBeforeCursor.substring(lastAtIndex + 1);
            
            // 更新当前查询
            currentMentionQuery = query;
            
            // 显示建议
            showMentionSuggestions(query);
            
            // 更新弹窗位置
            updateMentionPopupPosition();
        } else {
            // 隐藏建议
            hideMentionSuggestions();
        }
    });
    
    // 监听按键事件，处理上下键和回车键
    messageInput.addEventListener('keydown', function(e) {
        if (!activeMentionSuggestions) return;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                navigateMentionSuggestion(-1);
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                navigateMentionSuggestion(1);
                break;
                
            case 'Enter':
                if (selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    selectMentionSuggestion(selectedSuggestionIndex);
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                hideMentionSuggestions();
                break;
        }
    });
}

// 显示@用户建议
function showMentionSuggestions(query) {
    console.log('Showing mention suggestions for query:', query);
    
    // 如果查询为空，显示所有频道成员
    if (!query) {
        fetchChannelMembers().then(members => {
            mentionSuggestions = members;
            renderMentionSuggestions();
        });
        return;
    }
    
    // 否则搜索用户
    searchUsers(query).then(users => {
        mentionSuggestions = users;
        renderMentionSuggestions();
    });
}

// 渲染@用户建议
function renderMentionSuggestions() {
    console.log('Rendering mention suggestions, count:', mentionSuggestions.length);
    
    const popup = document.getElementById('mentionSuggestionsPopup');
    if (!popup) {
        console.error('Mention suggestions popup element not found');
        return;
    }
    
    // 获取建议列表容器
    const listContainer = popup.querySelector('.mention-suggestions-list');
    if (!listContainer) {
        console.error('Mention suggestions list container not found');
        return;
    }
    
    // 清空现有内容
    listContainer.innerHTML = '';
    
    // 如果没有建议，显示空状态
    if (mentionSuggestions.length === 0) {
        listContainer.innerHTML = `
            <div class="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                未找到用户
            </div>
        `;
        
        // 确保弹窗显示
        popup.classList.remove('hidden');
        activeMentionSuggestions = true;
        return;
    }
    
    // 添加建议项
    mentionSuggestions.forEach((user, index) => {
        const item = document.createElement('div');
        item.className = `mention-suggestion-item p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${index === selectedSuggestionIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`;
        item.dataset.index = index;
        
        item.innerHTML = `
            <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden mr-2">
                    ${user.avatar ? `<img src="${user.avatar}" alt="${user.username}" class="w-full h-full object-cover" />` : 
                    `<span class="text-sm font-semibold text-gray-600 dark:text-gray-200">${user.username.substring(0, 2).toUpperCase()}</span>`}
                </div>
                <div>
                    <div class="font-medium text-gray-800 dark:text-gray-200">${user.display_name || user.username}</div>
                    ${user.display_name ? `<div class="text-xs text-gray-500 dark:text-gray-400">@${user.username}</div>` : ''}
                </div>
            </div>
        `;
        
        // 添加点击事件
        item.addEventListener('click', () => {
            selectMentionSuggestion(index);
        });
        
        // 添加到容器
        listContainer.appendChild(item);
    });
    
    // 确保弹窗显示
    popup.classList.remove('hidden');
    activeMentionSuggestions = true;
    
    // 更新弹窗位置
    updateMentionPopupPosition();
    
    console.log('Mention suggestions rendered');
}

// 更新提及弹窗位置
function updateMentionPopupPosition() {
    const messageInput = document.getElementById('messageInput');
    const popup = document.getElementById('mentionPopup');
    
    if (!messageInput || !popup) return;
    
    const inputRect = messageInput.getBoundingClientRect();
    
    // 设置弹窗位置为输入框上方
    popup.style.bottom = `${window.innerHeight - inputRect.top + 5}px`;
    popup.style.left = `${inputRect.left}px`;
    popup.style.maxWidth = `${inputRect.width}px`;
}

// 获取光标位置
function getCursorPosition(input) {
    const rect = input.getBoundingClientRect();
    
    // 创建一个临时元素来计算光标位置
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    
    // 复制输入框的样式
    ['fontSize', 'fontFamily', 'lineHeight', 'padding', 'border', 'width'].forEach(prop => {
        div.style[prop] = getComputedStyle(input)[prop];
    });
    
    // 获取光标前的文本
    const textBeforeCursor = input.value.substring(0, input.selectionStart);
    div.textContent = textBeforeCursor;
    
    // 添加到body测量
    document.body.appendChild(div);
    
    // 获取最后一行的位置
    const lastLine = div.getBoundingClientRect();
    
    // 清理
    document.body.removeChild(div);
    
    return {
        left: rect.left + lastLine.width,
        top: rect.top + lastLine.height
    };
}

// 导航提及建议
function navigateMentionSuggestion(direction) {
    if (!activeMentionSuggestions || mentionSuggestions.length === 0) return;
    
    // 计算新的索引
    let newIndex = selectedSuggestionIndex + direction;
    
    // 边界检查
    if (newIndex < 0) {
        newIndex = mentionSuggestions.length - 1;
    } else if (newIndex >= mentionSuggestions.length) {
        newIndex = 0;
    }
    
    // 更新选中索引
    selectedSuggestionIndex = newIndex;
    
    // 更新UI显示
    const items = document.querySelectorAll('.mention-suggestion-item');
    
    items.forEach((item, index) => {
        if (index === selectedSuggestionIndex) {
            item.classList.add('bg-blue-50', 'dark:bg-blue-900/30');
            
            // 确保滚动到可见区域
            const container = document.getElementById('mentionSuggestionsPopup');
            const itemTop = item.offsetTop;
            const itemHeight = item.offsetHeight;
            const containerTop = container.scrollTop;
            const containerHeight = container.offsetHeight;
            
            if (itemTop < containerTop) {
                container.scrollTop = itemTop;
            } else if (itemTop + itemHeight > containerTop + containerHeight) {
                container.scrollTop = itemTop + itemHeight - containerHeight;
            }
        } else {
            item.classList.remove('bg-blue-50', 'dark:bg-blue-900/30');
        }
    });
}

// 选择提及建议
function selectMentionSuggestion(index) {
    if (!activeMentionSuggestions || !mentionSuggestions[index]) return;
    
    const selectedUser = mentionSuggestions[index];
    const messageInput = document.getElementById('messageInput');
    
    if (!messageInput) return;
    
    // 获取文本和光标位置
    const text = messageInput.value;
    const cursorPos = messageInput.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    
    // 查找@符号位置
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;
    
    // 计算新文本，替换@username
    const newText = text.substring(0, lastAtIndex) + 
                   `@${selectedUser.username} ` + 
                   text.substring(cursorPos);
    
    // 更新输入框文本
    messageInput.value = newText;
    
    // 设置新的光标位置（在插入的用户名之后）
    const newCursorPos = lastAtIndex + selectedUser.username.length + 2; // @username + 空格
    messageInput.setSelectionRange(newCursorPos, newCursorPos);
    
    // 隐藏提及建议
    hideMentionSuggestions();
    
    // 激活输入框
    messageInput.focus();
}

// 隐藏提及建议
function hideMentionSuggestions() {
    const popup = document.getElementById('mentionSuggestionsPopup');
    if (popup) {
        popup.classList.add('hidden');
    }
    
    // 重置状态
    activeMentionSuggestions = false;
    selectedSuggestionIndex = -1;
    currentMentionQuery = '';
    mentionSuggestions = [];
}

// 获取频道成员列表
async function fetchChannelMembers() {
    console.log('Fetching channel members for mention suggestions');
    
    // 获取当前活跃频道ID
    const channelId = window.activeChannelId || 
                     document.querySelector('.channel.active')?.getAttribute('data-channel-id');
    
    if (!channelId) {
        console.error('Cannot determine active channel ID');
        return Promise.resolve([]);
    }
    
    console.log('Fetching members for channel ID:', channelId);
    
    // 调用API获取频道成员
    return fetch(`/api/channel_members/${channelId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch channel members: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received channel members:', data);
            if (data.success && Array.isArray(data.members)) {
                return data.members.map(member => ({
                    id: member.user_id,
                    username: member.username,
                    display_name: member.display_name || member.username,
                    avatar: member.avatar_url || '/static/images/default-avatar.png'
                }));
            }
            return [];
        })
        .catch(error => {
            console.error('Error fetching channel members:', error);
            return [];
        });
}

// 搜索用户
async function searchUsers(query) {
    console.log('Searching users for mention query:', query);
    
    if (!query) {
        return fetchChannelMembers(); // 如果查询为空，返回所有频道成员
    }
    
    // 调用API搜索用户
    return fetch(`/api/search_users?query=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to search users: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received user search results:', data);
            if (data.success && Array.isArray(data.users)) {
                return data.users.map(user => ({
                    id: user.user_id,
                    username: user.username,
                    display_name: user.display_name || user.username,
                    avatar: user.avatar_url || '/static/images/default-avatar.png'
                }));
            }
            return [];
        })
        .catch(error => {
            console.error('Error searching users:', error);
            return fetchChannelMembers().then(members => {
                // 在API失败的情况下，从频道成员中过滤匹配项
                return members.filter(member => 
                    member.username.toLowerCase().includes(query.toLowerCase()) ||
                    (member.display_name && member.display_name.toLowerCase().includes(query.toLowerCase()))
                );
            });
        });
}

// 确保提及面板存在并正常工作
function checkPanelWrapper() {
    // 检查面板是否存在
    let mentionsPanel = document.getElementById('mentionsPanel');
    if (!mentionsPanel) {
        console.error('mentionsPanel does not exist, attempting to create...');
        
        // 创建提及面板
        mentionsPanel = document.createElement('div');
        mentionsPanel.id = 'mentionsPanel';
        mentionsPanel.className = 'fixed top-0 right-0 w-96 h-full bg-white shadow-lg border-l z-50 transform translate-x-full transition-transform duration-300 dark:bg-gray-800 dark:border-gray-700 theme-transition side-panel';
        mentionsPanel.innerHTML = `
            <div class="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 class="font-semibold text-gray-800 dark:text-white">Recent Mentions</h2>
                <button onclick="closePanel('mentionsPanel')" class="text-gray-500 hover:text-gray-800 dark:hover:text-white text-lg transition-colors">&times;</button>
            </div>
            <div class="p-6 text-center text-gray-500 dark:text-gray-300">
                <img src="../static/images/艾特.png" class="w-10 h-10 mx-auto mb-4 opacity-70 dark:opacity-90" />
                <p class="font-medium">No mentions yet</p>
                <p class="text-sm mt-2 text-gray-400 dark:text-gray-500">
                    When other users mention you in messages, they'll appear here.
                </p>
            </div>
        `;
        
        // 添加到body
        document.body.appendChild(mentionsPanel);
        console.log('Created mentionsPanel');
        
        // 优化提及面板UI
        setTimeout(enhanceMentionPanel, 100);
    }
    
    // 确保togglePanel函数存在
    if (typeof window.togglePanel !== 'function') {
        console.error('togglePanel function does not exist, adding temporary implementation');
        window.togglePanel = function(panelId) {
            const panel = document.getElementById(panelId);
            if (panel) {
                if (panel.classList.contains('translate-x-full')) {
                    // 显示面板
                    panel.classList.remove('translate-x-full');
                    
                    // 如果是提及面板，触发更新事件
                    if (panelId === 'mentionsPanel') {
                        loadMentionItems(true);
                    }
                } else {
                    // 隐藏面板
                    panel.classList.add('translate-x-full');
                }
            } else {
                console.error(`Panel ${panelId} does not exist`);
            }
        };
    }
    
    // 确保closePanel函数存在
    if (typeof window.closePanel !== 'function') {
        console.error('closePanel function does not exist, adding temporary implementation');
        window.closePanel = function(panelId) {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.add('translate-x-full');
            } else {
                console.error(`Panel ${panelId} does not exist`);
            }
        };
    }
}

// 设置提及按钮事件
function setupMentionButton() {
    console.log('Setting up mention button events');
    
    // 处理顶部栏的提及按钮 (ID可能是toggleMention或toggleMentions)
    const mentionButton = document.getElementById('toggleMention') || document.getElementById('toggleMentions');
    if (mentionButton) {
        console.log('Found mention button:', mentionButton.id);
        
        // 克隆并替换按钮以确保事件干净
        const newMentionButton = mentionButton.cloneNode(true);
        mentionButton.parentNode.replaceChild(newMentionButton, mentionButton);
        
        // 为新按钮添加事件监听
        newMentionButton.addEventListener('click', function(e) {
            console.log('Mention button clicked, ID:', this.id);
            e.preventDefault();
            e.stopPropagation();
            togglePanel('mentionsPanel');
        });
    } else {
        console.error('Cannot find mention button (toggleMention or toggleMentions)');
    }
    
    // 设置输入栏的@按钮
    const mentionInputBtn = document.getElementById('mentionInputBtn');
    if (mentionInputBtn) {
        console.log('Found mentionInputBtn button');
        
        // 移除之前的事件，通过克隆节点方式
        const newMentionBtn = mentionInputBtn.cloneNode(true);
        mentionInputBtn.parentNode.replaceChild(newMentionBtn, mentionInputBtn);
        
        // 添加新的点击事件监听器
        newMentionBtn.addEventListener('click', function(event) {
            console.log('mentionInputBtn button clicked');
            event.preventDefault();
            event.stopPropagation();
            
            // 在光标位置插入@符号
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                // 获取当前光标位置
                const cursorPos = messageInput.selectionStart;
                
                // 获取当前文本
                const text = messageInput.value;
                
                // 插入@符号
                const newText = text.substring(0, cursorPos) + '@' + text.substring(messageInput.selectionEnd);
                messageInput.value = newText;
                
                // 设置新的光标位置
                const newCursorPos = cursorPos + 1;
                messageInput.setSelectionRange(newCursorPos, newCursorPos);
                
                // 聚焦输入框
                messageInput.focus();
                
                // 触发input事件以显示自动完成
                messageInput.dispatchEvent(new Event('input'));
                
                // 显示空白的提及建议（显示所有频道成员）
                showMentionSuggestions('');
                updateMentionPopupPosition();
            }
        });
    } else {
        console.error('Cannot find mentionInputBtn button');
    }
}

// 优化提及面板UI
function enhanceMentionPanel() {
    const panelHeader = document.querySelector('#mentionsPanel .flex.items-center.justify-between');
    if (!panelHeader) return;
    
    // 更新面板标题和样式
    panelHeader.innerHTML = `
        <div class="flex flex-col p-4 border-b border-gray-100 dark:border-gray-700 w-full">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <img src="../static/images/艾特.png" class="h-5 w-5 mr-2 opacity-75" alt="mention" />
                My Mentions
            </h2>
            
            <div class="flex items-center justify-between">
                <div class="text-xs text-gray-500 dark:text-gray-400">
                    <span class="channel-mention-info">Mentions from all channels</span>
                </div>
                <button id="refreshMentions" class="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Refresh mentions">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
                <button onclick="closePanel('mentionsPanel')" class="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    // 创建内容容器
    const panelContent = document.querySelector('#mentionsPanel > div:nth-child(2)');
    if (panelContent) {
        panelContent.className = 'flex-1 overflow-y-auto';
        panelContent.innerHTML = `
            <div id="mentionItemsContainer" class="p-4 space-y-4">
                <!-- 提及记录将通过JavaScript动态加载 -->
                <div class="text-center py-10">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p class="mt-2 text-gray-500 dark:text-gray-400">Loading mentions...</p>
                </div>
            </div>
        `;
    }
    
    // 为刷新按钮添加事件
    const refreshBtn = document.getElementById('refreshMentions');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // 添加旋转动画效果
            this.classList.add('animate-spin');
            
            // 强制刷新提及记录
            loadMentionItems(true);
            
            // 500ms后停止旋转
            setTimeout(() => {
                this.classList.remove('animate-spin');
                
                // 显示刷新成功提示
                showToast('Mentions refreshed', 'success');
            }, 500);
        });
    }
}

// 加载提及记录
function loadMentionItems(reset = false) {
    console.log('Loading mention items, reset:', reset);
    
    if (reset) {
        currentMentionPage = 0;
        mentionItems = [];
    }
    
    const container = document.getElementById('mentionItemsContainer');
    if (!container) {
        console.error('Cannot find mentionItemsContainer element');
        return;
    }
    
    // 获取当前活跃频道ID
    const activeChannelId = window.activeChannelId || null;
    
    // 如果是重置，显示加载指示器
    if (reset) {
        container.innerHTML = `
            <div class="text-center py-10">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p class="mt-2 text-gray-500 dark:text-gray-400">Loading mentions...</p>
            </div>
        `;
    }
    
    // 构建请求URL，添加时间戳避免缓存
    let url = `/api/mentions?limit=${itemsPerPage}&offset=${currentMentionPage * itemsPerPage}&_t=${Date.now()}`;
    
    // 加入频道过滤，使得每个频道的提及互相隔离
    if (activeChannelId) {
        url += `&channel_id=${activeChannelId}`;
        
        // 更新面板标题显示当前频道
        updatePanelChannelInfo(activeChannelId);
    }
    
    // 发送请求，添加no-cache头部
    fetch(url, {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Load mentions response:', data);
        
        if (data.success) {
            mentionItems = reset ? data.mentions : [...mentionItems, ...data.mentions];
            totalMentions = data.total;
            
            // 渲染提及记录
            renderMentionItems(container, reset);
        } else {
            container.innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <p>Loading failed: ${data.message || 'Unknown error'}</p>
                    <button class="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded" onclick="loadMentionItems(true)">
                        Retry
                    </button>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error loading mention items:', error);
        container.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <p>Loading failed: ${error.message || 'Network error'}</p>
                <button class="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded" onclick="loadMentionItems(true)">
                    Retry
                </button>
            </div>
        `;
    });
}

// 更新面板频道信息
function updatePanelChannelInfo(channelId) {
    const infoElement = document.querySelector('.channel-mention-info');
    if (!infoElement) return;
    
    if (!channelId) {
        infoElement.textContent = 'Mentions from all channels';
        return;
    }
    
    // 获取频道名称
    const channelElement = document.querySelector(`[data-channel-id="${channelId}"] .channel-name`);
    const channelName = channelElement ? channelElement.textContent : 'Current channel';
    infoElement.textContent = `Mentions in ${channelName}`;
}

// 渲染提及记录
function renderMentionItems(container, reset = false) {
    // 清空容器内容（如果需要重置）
    if (reset) {
        container.innerHTML = '';
    }
    
    // 如果没有提及记录，显示空状态
    if (mentionItems.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 animate-fade-in">
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md mx-auto border border-gray-100 dark:border-gray-700">
                    <div class="relative w-24 h-24 mx-auto mb-6">
                        <div class="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-pulse"></div>
                        <img src="../static/images/艾特.png" class="relative w-full h-full p-2" />
                    </div>
                    <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-2">No mentions yet</h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                        When other users mention you in their messages, they will appear here.
                    </p>
                </div>
            </div>
        `;
        return;
    }
    
    // 为每个提及记录创建元素
    mentionItems.forEach((item, index) => {
        const itemElement = createMentionItemElement(item);
        
        // 添加延迟进入动画效果
        if (reset) {
            itemElement.style.animationDelay = `${index * 0.05}s`;
        }
        
        container.appendChild(itemElement);
    });
    
    // 如果还有更多记录，添加加载更多按钮
    if (mentionItems.length < totalMentions) {
        const loadMoreDiv = document.createElement('div');
        loadMoreDiv.className = 'text-center py-4 animate-fade-in';
        loadMoreDiv.innerHTML = `
            <button class="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg text-sm transition-colors flex items-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                </svg>
                Load more mentions
            </button>
        `;
        
        // 添加加载更多点击事件
        loadMoreDiv.querySelector('button').addEventListener('click', function() {
            // 显示加载指示器
            this.innerHTML = `
                <svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
            `;
            this.disabled = true;
            
            currentMentionPage++;
            loadMentionItems(false);
            
            // 防止按钮闪烁
            setTimeout(() => {
                this.parentNode.remove();
            }, 500);
        });
        
        container.appendChild(loadMoreDiv);
    }
}

// 创建提及记录元素
function createMentionItemElement(item) {
    const div = document.createElement('div');
    div.className = 'bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-600 p-4 hover:shadow-lg transition-all mb-4 transform hover:-translate-y-0.5 animate-fade-in';
    div.setAttribute('data-mention-id', item.mention_id);
    
    // 格式化时间
    const mentionTime = formatMentionTime(item.created_at);
    const channelName = item.channel_name || 'Unknown channel';
    
    // 构建消息内容，高亮@提及
    let messageContent = item.message_content || '';
    const username = getCurrentUsername();
    if (username) {
        // 高亮@提及
        messageContent = messageContent.replace(
            new RegExp(`@${username}`, 'g'), 
            `<span class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 rounded font-medium">@${username}</span>`
        );
    }
    
    // 构建提及记录HTML
    div.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
                <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                    ${item.from_user.avatar_url ? 
                        `<img src="${item.from_user.avatar_url}" alt="${item.from_user.username}" class="w-full h-full object-cover">` : 
                        item.from_user.username[0].toUpperCase()}
                </div>
            </div>
            <div class="flex-1">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="font-medium text-gray-900 dark:text-white">${item.from_user.username}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">${mentionTime}</span>
                    </div>
                    <button class="goto-mention-btn p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20" title="查看原始消息">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </button>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mt-2 border border-gray-100 dark:border-gray-600">
                    <div class="text-sm text-gray-800 dark:text-gray-200 break-words">
                        ${messageContent}
                    </div>
                </div>
                <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span>${channelName}</span>
                </div>
            </div>
        </div>
    `;
    
    // 添加事件监听器
    setTimeout(() => {
        // 查看原始消息按钮
        const gotoBtn = div.querySelector('.goto-mention-btn');
        if (gotoBtn) {
            gotoBtn.addEventListener('click', function() {
                goToOriginalMessage(item);
            });
        }
    }, 10);
    
    return div;
}

// 跳转到原始消息
function goToOriginalMessage(mention) {
    // 关闭面板
    closePanel('mentionsPanel');
    
    // 先切换到正确的频道
    if (mention.channel_id && mention.channel_id !== activeChannelId) {
        switchToChannel(mention.channel_id);
        
        // 给一点时间让频道切换完成
        setTimeout(() => {
            highlightOriginalMessage(mention);
        }, 1000);
    } else {
        highlightOriginalMessage(mention);
    }
}

// 高亮显示原始消息
function highlightOriginalMessage(mention) {
    // 查找消息元素
    const messageElement = document.querySelector(`.message-bubble[data-message-id="${mention.message_id}"]`);
    if (messageElement) {
        // 滚动到消息位置
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 添加高亮效果
        messageElement.classList.add('bg-blue-100', 'dark:bg-blue-900/30');
        setTimeout(() => {
            messageElement.classList.remove('bg-blue-100', 'dark:bg-blue-900/30');
        }, 3000);
    } else {
        showToast('Cannot find original message, it may have been deleted', 'warning');
    }
}

// 格式化提及时间
function formatMentionTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) {
        return 'Just now';
    } else if (diff < 3600) {
        return `${Math.floor(diff / 60)} minutes ago`;
    } else if (diff < 86400) {
        return `${Math.floor(diff / 3600)} hours ago`;
    } else if (diff < 604800) {
        return `${Math.floor(diff / 86400)} days ago`;
    } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
}

// 获取当前用户名
function getCurrentUsername() {
    // 从全局变量或DOM中获取
    if (window.currentUser && window.currentUser.username) {
        return window.currentUser.username;
    }
    
    // 尝试从页面元素获取
    const userElement = document.querySelector('.user-profile-name');
    return userElement ? userElement.textContent.trim() : null;
}

// 在光标位置插入@提及
function insertMentionAtCursor() {
    console.log('Insert @mention function called');
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) {
        console.error('Cannot find messageInput element');
        return;
    }
    
    // 获取当前光标位置
    const cursorPos = messageInput.selectionStart;
    console.log('Current cursor position:', cursorPos);
    
    // 获取当前文本
    const currentValue = messageInput.value;
    
    // 直接插入@符号，不添加额外空格
    const newValue = currentValue.substring(0, cursorPos) + '@' + currentValue.substring(messageInput.selectionEnd);
    messageInput.value = newValue;
    
    // 将光标移到@符号后
    const newPosition = cursorPos + 1;
    messageInput.setSelectionRange(newPosition, newPosition);
    messageInput.focus();
    
    // 触发input事件以调整输入框高度
    messageInput.dispatchEvent(new Event('input'));
    
    console.log('@mention inserted into input field, new value:', messageInput.value, 'cursor position:', newPosition);
    return newPosition; // 返回新的光标位置，便于调用者继续处理
}

// 监听消息内容，检测提及
function listenForMentions() {
    console.log('Starting to listen for message mentions');
    
    // 监听消息发送事件 - 使用多种事件名称保证捕获
    const eventNames = ['messageSent', 'messageCreated', 'newMessage'];
    
    eventNames.forEach(eventName => {
        document.addEventListener(eventName, function(e) {
            console.log(`Captured ${eventName} event:`, e.detail);
            
            if (e.detail && e.detail.message) {
                const message = e.detail.message;
                console.log('Processing mention check:', message);
                checkForMentions(message);
            } else {
                console.error(`${eventName} event missing required message data`);
            }
        });
    });
    
    // 直接监听聊天应用的消息发送函数
    const originalSendMessage = window.sendMessage;
    if (typeof originalSendMessage === 'function') {
        window.sendMessage = function(messageData) {
            const result = originalSendMessage.apply(this, arguments);
            
            // 在原始函数执行后，检查提及
            console.log('Message send function called, checking mentions:', messageData);
            setTimeout(() => {
                checkForMentions(messageData);
            }, 100);
            
            return result;
        };
        console.log('Hooked message send function');
    }
    
    // 监听消息DOM添加，适用于可能未触发事件的情况
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 检查新添加的消息节点
                    mutation.addedNodes.forEach(node => {
                        if (node.classList && node.classList.contains('message-bubble')) {
                            const messageId = node.getAttribute('data-message-id');
                            const content = node.querySelector('.message-content')?.textContent;
                            const channelId = window.activeChannelId;
                            
                            if (messageId && content && content.includes('@') && channelId) {
                                console.log('Detected new message in DOM:', {id: messageId, content, channelId});
                                checkForMentions({
                                    id: messageId, 
                                    message_id: messageId,
                                    content: content,
                                    channel_id: channelId
                                });
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(messagesContainer, { childList: true, subtree: true });
        console.log('Message DOM change listener set up');
    }
    
    console.log('Mention listeners set up');
}

// 检查消息是否包含提及
function checkForMentions(message) {
    console.log('Checking if message contains mentions:', message);
    
    // 确保消息有内容
    if (!message || !message.content) {
        console.log('Message is empty or has no content, skipping mention check');
        return;
    }
    
    const content = message.content;
    const usernamePattern = /@(\w+)/g;
    const matches = content.match(usernamePattern);
    
    if (!matches) {
        console.log('No mentions detected');
        return;
    }
    
    // 获取所有被提及的用户名
    const mentionedUsers = matches.map(match => match.substring(1));
    console.log('Detected mentioned users:', mentionedUsers);
    
    // 为每个提及创建记录
    mentionedUsers.forEach(username => {
        console.log('Processing mentioned user:', username);
        createMention(message, username);
    });
}

// 创建提及记录
function createMention(message, mentionedUsername) {
    console.log('Creating mention record:', message, 'mentioned user:', mentionedUsername);
    
    // 检查消息对象有效性
    if (!message) {
        console.error('Invalid message object');
        return;
    }
    
    // 获取消息ID - 处理不同的字段名
    let messageId = null;
    if (message.id) {
        messageId = message.id;
    } else if (message.message_id) {
        messageId = message.message_id;
    }
    
    // 检查频道ID
    const channelId = message.channel_id;
    
    console.log('Extracted info - Message ID:', messageId, 'Channel ID:', channelId, 'Mentioned user:', mentionedUsername);
    
    // 检查是否有必要的参数
    if (!messageId || !channelId || !mentionedUsername) {
        console.error('Creating mention record missing required parameters:', {
            messageId: messageId,
            channelId: channelId,
            mentionedUsername: mentionedUsername
        });
        
        // 尝试从服务器获取最新消息ID
        if (channelId && message.content && mentionedUsername) {
            console.log('Attempting to get latest message ID...');
            fetchLatestMessageIdAndCreateMention(message, mentionedUsername);
            return;
        }
        
        return;
    }
    
    const requestData = {
        message_id: messageId,
        channel_id: channelId,
        mentioned_username: mentionedUsername
    };
    
    console.log('Sending mention API request:', requestData);
    
    // 调用API创建提及记录
    fetch('/api/create_mention', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        console.log('Mention API response status:', response.status);
        if (!response.ok) {
            throw new Error(`API request failed, status code: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Create mention record result:', data);
        if (data.success) {
            console.log('Mention record created successfully:', data.mention_id);
        } else {
            console.error('Mention record creation failed:', data.message);
        }
    })
    .catch(error => {
        console.error('Error creating mention record:', error);
    });
}

// 获取最新消息ID并创建提及
function fetchLatestMessageIdAndCreateMention(message, mentionedUsername) {
    // 从服务器获取最新消息
    console.log('Getting latest channel message...');
    fetch(`/api/latest_message?channel_id=${message.channel_id}&content=${encodeURIComponent(message.content)}&user_id=${currentUserId}`)
    .then(response => response.json())
    .then(data => {
        if (data.success && data.message && data.message.message_id) {
            console.log('Got latest message:', data.message);
            // 使用获取到的消息ID创建提及
            const newMessage = {
                id: data.message.message_id,
                message_id: data.message.message_id, // 兼容两种格式
                channel_id: message.channel_id,
                content: message.content
            };
            createMention(newMessage, mentionedUsername);
        } else {
            console.error('Failed to get latest message:', data.message || 'Unknown error');
        }
    })
    .catch(error => {
        console.error('Error getting latest message:', error);
    });
}

// 专门设置@输入按钮
function setupMentionInputButton() {
    console.log('Setting up @ input button');
    const mentionInputBtn = document.getElementById('mentionInputBtn');
    const messageInput = document.getElementById('messageInput');
    
    if (mentionInputBtn && messageInput) {
        console.log('Found mentionInputBtn button, adding click event');
        
        // 移除之前可能存在的事件处理器
        const newBtn = mentionInputBtn.cloneNode(true);
        mentionInputBtn.parentNode.replaceChild(newBtn, mentionInputBtn);
        
        // 添加新的事件处理器
        newBtn.addEventListener('click', function(event) {
            console.log('@ button clicked, inserting @ at cursor');
            event.preventDefault();
            event.stopPropagation();
            
            // 获取当前光标位置
            const cursorPos = messageInput.selectionStart;
            console.log('Current cursor position:', cursorPos);
            
            // 获取当前文本
            const currentValue = messageInput.value;
            
            // 在光标位置插入@符号
            const newValue = currentValue.substring(0, cursorPos) + '@' + currentValue.substring(messageInput.selectionEnd);
            messageInput.value = newValue;
            
            // 将光标移到@符号后
            const newPosition = cursorPos + 1;
            messageInput.selectionStart = newPosition;
            messageInput.selectionEnd = newPosition;
            messageInput.focus();
            
            // 触发input事件以调整输入框高度
            messageInput.dispatchEvent(new Event('input'));
            
            console.log('@符号已插入到输入框, 新内容:', messageInput.value);
        });
        
        console.log('Successfully attached event to @ button');
    } else {
        console.error('Could not setup @ button - Missing elements:', {
            mentionInputBtn: !!mentionInputBtn,
            messageInput: !!messageInput
        });
    }
}

// 在文档加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event triggered, preparing to initialize mentionManager');
    
    // 定义全局函数，确保其他地方可以访问
    window.globalMentionFunctions = {
        insertMentionAtCursor: insertMentionAtCursor,
        loadMentionItems: loadMentionItems,
        toggleMentionPanel: function() {
            togglePanel('mentionsPanel');
        }
    };
    
    // 将关键函数添加到全局作用域
    window.checkForMentions = checkForMentions;
    window.createMention = createMention;
    window.insertMentionAtCursor = insertMentionAtCursor;
    
    // 立即初始化基本功能
    checkPanelWrapper();
    
    // 立即设置@按钮
    setupMentionInputButton();
    
    // 延迟初始化，确保其他必要组件已加载
    setTimeout(function() {
        console.log('Starting to initialize mentionManager');
        initMentionManager();
        
        // 重新设置按钮事件，确保可以正常工作
        setTimeout(function() {
            console.log('Resetting mention button events');
            setupMentionButton();
            // 再次确保@按钮设置正确
            setupMentionInputButton();
        }, 500);
    }, 1000);
});

// 暴露公共方法
window.mentionManager = {
    init: initMentionManager,
    refresh: function() { loadMentionItems(true); },
    insertMention: insertMentionAtCursor,
    checkMentions: checkForMentions,
    createMention: createMention
}; 