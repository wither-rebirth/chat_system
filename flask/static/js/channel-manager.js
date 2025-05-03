/**
 * Channel Manager
 * Manage channel switching, message loading and sending
 */

// Format file size display
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Currently active channel id
let activeChannelId = null;

// Save message cache
const messageCache = {};

// Processed message id collection to prevent duplication
const processedMessageIds = new Set();

// Whether the global tag has been initialized
let isChannelManagerInitialized = false;

// Initialize the channel manager
function initChannelManager() {
    // Prevent repeated initialization
    if (isChannelManagerInitialized) {
        console.log('Channel manager already initialized, skipping');
        return;
    }
    
    console.log('Initializing channel manager');
    
    // Initialize room expansion/collapse status
    initRoomExpandState();
    
    // Get the active channel id (if present)
    const activeChannelElement = document.querySelector('.channel-item.active');
    if (activeChannelElement) {
        const channelId = activeChannelElement.getAttribute('data-channel-id');
        if (channelId) {
            activeChannelId = parseInt(channelId, 10);
            console.log(`Initial active channel ID: ${activeChannelId}`);
        }
    }
    
    // Add channel click event listener
    setupChannelClickListeners();
    
    // Set up message sending form listener
    setupMessageForm();
    
    // Initialize file upload function
    setupFileUpload();
    
    // Initialize the emoticon selector
    initEmojiPicker();
    
    // Initialize socket.io events
    initSocketEvents();
    
    // Marked as initialized
    isChannelManagerInitialized = true;
}

// Initialize room expansion/collapse status
function initRoomExpandState() {
    const roomHeaders = document.querySelectorAll('.room-header');
    roomHeaders.forEach(header => {
        // The default expansion status is set to false
        header.setAttribute('data-expanded', 'false');
        
        // Get the corresponding channel list
        const channelsList = header.nextElementSibling;
        if (channelsList && channelsList.classList.contains('channels-sublist')) {
            // Check if there is an active channel that is a sub-channel for this room
            const hasActiveChannel = channelsList.querySelector('.channel-item.active');
            
            if (hasActiveChannel) {
                // If there is an active channel, expand this room
                channelsList.style.maxHeight = `${channelsList.scrollHeight}px`;
                channelsList.style.opacity = '1';
                header.setAttribute('data-expanded', 'true');
                
                // Rotate icon
                const icon = header.querySelector('svg.transform');
                if (icon) {
                    icon.classList.remove('-rotate-90');
                    icon.classList.add('rotate-0');
                }
            }
        }
    });
}

// Set up channel click event listener
function setupChannelClickListeners() {
    // Get all channel items
    const channelItems = document.querySelectorAll('.channel-item');
    
    channelItems.forEach(item => {
        // Check whether the event has been bound to avoid repeated binding
        if (!item.hasAttribute('data-event-attached')) {
            item.addEventListener('click', function(e) {
                // Check if this is a private chat user item, if so, let other code handle it
                if (this.hasAttribute('data-user-id')) {
                    console.log('This is a direct message user item, skipping channel processing');
                    return; // Return directly, without processing channel switching logic
                }
                
                // Prevent default behavior and events from bubbling
                e.preventDefault();
                e.stopPropagation();
                
                // Get the channel id
                const channelId = this.getAttribute('data-channel-id');
                if (!channelId) {
                    console.error('Cannot get channel ID, data-channel-id attribute does not exist');
                    return;
                }
                
                console.log('Channel item clicked, channel ID:', channelId);
                
                // Switch to this channel
                switchToChannel(parseInt(channelId, 10));
            });
            
            // Tag bound events
            item.setAttribute('data-event-attached', 'true');
        }
    });
    
    // Check again the expansion/collapse function of the chat room item
    const roomHeaders = document.querySelectorAll('.room-header');
    roomHeaders.forEach(header => {
        // Check whether the event has been bound to avoid repeated binding
        if (!header.hasAttribute('data-event-attached')) {
            header.addEventListener('click', function(e) {
                // Prevent events from propagating to channel items
                e.stopPropagation();
                
                const roomId = this.getAttribute('data-room-id');
                if (!roomId) return;
                
                // Switch the expanded/collapse status of the chat room
                toggleRoomChannels(this);
            });
            
            // Tag bound events
            header.setAttribute('data-event-attached', 'true');
        }
    });
}

// Switch the expansion/collapse status of the chat room channel
function toggleRoomChannels(roomHeader) {
    // Get the corresponding channel list
    const channelsList = roomHeader.nextElementSibling;
    if (!channelsList || !channelsList.classList.contains('channels-sublist')) {
        return;
    }
    
    // Get the expanded status
    const isExpanded = roomHeader.getAttribute('data-expanded') === 'true';
    
    // Toggle icon rotation
    const icon = roomHeader.querySelector('svg.transform');
    if (icon) {
        if (isExpanded) {
            icon.classList.add('-rotate-90');
            icon.classList.remove('rotate-0');
        } else {
            icon.classList.remove('-rotate-90');
            icon.classList.add('rotate-0');
        }
    }
    
    // Switch channel list display
    if (isExpanded) {
        // fold
        channelsList.style.maxHeight = '0';
        channelsList.style.opacity = '0';
        roomHeader.setAttribute('data-expanded', 'false');
    } else {
        // Expand
        channelsList.style.maxHeight = `${channelsList.scrollHeight}px`;
        channelsList.style.opacity = '1';
        roomHeader.setAttribute('data-expanded', 'true');
    }
}

// Switch to the specified channel
function switchToChannel(channelId) {
    if (!channelId || isNaN(channelId)) {
        console.error('Invalid channel ID:', channelId);
        return;
    }
    
    console.log(`Switching to channel: ${channelId}`);
    
    // Record the previous channel id for leaving
    const previousChannelId = activeChannelId;
    
    // Update active channel id
    activeChannelId = channelId;
    
    // Update ui activation status and title immediately without waiting for socket response
    updateChannelUIAndHeader(channelId);
    
    // 如果启用了加密，打印密钥信息以便调试
    if (typeof ChannelEncryption !== 'undefined' && 
        typeof ChannelEncryption.isChannelEncrypted === 'function' && 
        ChannelEncryption.isChannelEncrypted(channelId) &&
        typeof ChannelEncryption.printChannelKeyInfo === 'function') {
        
        console.log('正在调试频道加密密钥...');
        ChannelEncryption.printChannelKeyInfo(channelId);
    }
    
    // Clear the message area and display loading
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="flex justify-center items-center h-full">
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                    <p class="mt-2 text-gray-600 dark:text-gray-300">Loading messages...</p>
                </div>
            </div>
        `;
    }
    
    // Load the channel message immediately without waiting for socket.io to connect
    loadChannelMessages(channelId);
    
    // Handle socket.io room switching in the background
    if (socket.connected) {
        handleSocketRoomChange(previousChannelId, channelId);
    } else {
        console.log('Socket not connected, will join when connected');
        
        // Add a listener for when socket connects
        document.addEventListener('socketConnected', function socketConnectedHandler() {
            console.log('Socket connected, now handling room change');
            handleSocketRoomChange(previousChannelId, channelId);
            document.removeEventListener('socketConnected', socketConnectedHandler);
        });
    }
    
    // If there is a sidebar, it will be closed automatically on mobile devices
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (sidebar && window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        if (sidebarBackdrop) {
            sidebarBackdrop.classList.add('hidden');
        }
    }
}

// Update channel ui status and title
function updateChannelUIAndHeader(channelId) {
    // Update ui activation status
    const channelItems = document.querySelectorAll('.channel-item');
    let channelName = '';
    
    channelItems.forEach(item => {
        // Remove active status from all channels
        item.classList.remove('active', 'bg-white/10');
        
        // Add active status to selected channel
        if (parseInt(item.getAttribute('data-channel-id'), 10) === channelId) {
            item.classList.add('active');
            item.classList.add('bg-white/10');
            // Use data attributes to get channel name
            channelName = item.querySelector('.channel-name')?.textContent || 'Channel';
            console.log(`Activated channel: ${channelName}`);
        }
    });
    
    // Update channel header information now
    updateChannelHeader(channelId, channelName);
}

// Handle socket.io room switching
function handleSocketRoomChange(previousChannelId, channelId) {
    // If there is an active channel before, leave the socket.io room of that channel
    if (previousChannelId) {
        console.log(`Trying to leave channel Socket.IO room: channel_${previousChannelId}`);
        socket.emit('leave_channel', { channel_id: previousChannelId });
    }
    
    // Add to the new channel socket.io room
    console.log(`Trying to join channel Socket.IO room: channel_${channelId}`);
    socket.emit('join_channel', { channel_id: channelId });
}

// Update channel title and description
function updateChannelHeader(channelId, channelName) {
    // First try to find the channel item to get the complete information
    const channelItem = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
    if (!channelItem && !channelName) {
        console.warn('Cannot find channel information');
        return;
    }
    
    // If the channel name is not provided, try to get it from the dom
    if (!channelName && channelItem) {
        channelName = channelItem.querySelector('.channel-name')?.textContent || 'Select a channel';
    }
    
    console.log(`Updating channel title: ${channelName}`);
    
    // Setting up global active channel object
    window.activeChannel = {
        channel_id: channelId,
        channel_name: channelName,
        description: ''
    };
    
    // Force update the UI now -first try to clear possible old content
    const headerTitle = document.getElementById('channelTitle');
    if (headerTitle) {
        // Completely reset the title element
        while (headerTitle.firstChild) {
            headerTitle.removeChild(headerTitle.firstChild);
        }
        
        // Create a new text node and add
        const textNode = document.createTextNode(channelName);
        headerTitle.appendChild(textNode);
        
        // Ensure visibility of updated content
        headerTitle.style.visibility = 'visible';
        headerTitle.style.opacity = '1';
        
        // Add a brief highlight to show that the title has been updated
        headerTitle.classList.add('channel-title-updated');
        setTimeout(() => {
            headerTitle.classList.remove('channel-title-updated');
        }, 300);
        
        // Force the browser to recalculate the layout to ensure rendering is updated
        headerTitle.getBoundingClientRect();
    }
    
    // Get channel details from the server
    fetchChannelDetails(channelId);
}

// Get channel details
function fetchChannelDetails(channelId) {
    if (!channelId) return;
    
    console.log(`Fetching channel details for channel ID: ${channelId}`);
    
    // Api request to get channel details
    fetch(`/api/channel_details/${channelId}`)
        .then(response => {
            if (!response.ok) {
                console.error('Failed to fetch channel details:', response.status);
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (data && data.success) {
                updateChannelDescription(data.channel);
            } else {
                console.error('Error fetching channel details:', data?.message || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error fetching channel details:', error);
        });
    
    // At the same time, try to get the description from the existing dom element
    const channelItem = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
    if (channelItem) {
        const description = channelItem.getAttribute('data-description') || '';
        updateChannelDescription({description: description});
    } else {
        // If you cannot get it from the dom, set the default empty description
        updateChannelDescription({description: ''});
    }
}

// Update channel description ui
function updateChannelDescription(channel) {
    if (!channel) return;
    
    const description = channel.description || '';
    console.log(`Updating channel description: "${description}"`);
    
    // Update global active channel object
    if (window.activeChannel) {
        window.activeChannel.description = description;
    }
    
    // Update description is displayed in ui
    const descriptionElem = document.getElementById('channelDescription');
    if (descriptionElem) {
        const span = descriptionElem.querySelector('span');
        if (span) {
            if (description && description.trim() !== '') {
                span.textContent = description;
            } else {
                span.textContent = 'Add channel description';
            }
        } else {
            // If the span does not exist, clear the old content and create a new span
            while (descriptionElem.firstChild) {
                descriptionElem.removeChild(descriptionElem.firstChild);
            }
            
            const newSpan = document.createElement('span');
            newSpan.textContent = description && description.trim() !== '' ? description : 'Add channel description';
            descriptionElem.appendChild(newSpan);
        }
        
        // Update the hidden input field to prepare for editing modal boxes
        const channelIdInput = document.getElementById('channelIdInput');
        if (channelIdInput) {
            channelIdInput.value = window.activeChannel?.channel_id || '';
        }
        
        // If there is no description, the Add description button is displayed
        const addDescriptionBtn = document.getElementById('addDescriptionBtn');
        if (addDescriptionBtn) {
            if (description && description.trim() !== '') {
                addDescriptionBtn.classList.add('hidden');
            } else {
                addDescriptionBtn.classList.remove('hidden');
            }
        }
    }
    
    // Add or update view log button
    const headerActions = document.querySelector('.channel-header-actions');
    if (headerActions) {
        // Check if the log button already exists
        let logsButton = headerActions.querySelector('#viewLogsBtn');
        
        if (!logsButton) {
            // Create log button
            logsButton = document.createElement('button');
            logsButton.id = 'viewLogsBtn';
            logsButton.className = 'ml-2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700';
            logsButton.title = 'View Channel Logs';
            logsButton.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
            `;
            
            // Add to the header operation area
            headerActions.appendChild(logsButton);
        }
        
        // Update button event handling
        if (logsButton) {
        logsButton.onclick = function() {
                showChannelLogs(window.activeChannel?.channel_id);
        };
        }
    }
    
    // Notification dom has been updated
    document.dispatchEvent(new CustomEvent('channel_header_updated', {
        detail: { channelId: window.activeChannel?.channel_id, channelName: window.activeChannel?.channel_name }
    }));
}

// Open the Edit Description Modal Box
window.openEditDescriptionModal = function() {
    const modal = document.getElementById('editDescriptionModal');
    if (!modal) return;
    
    // Set the current description value
    const modalInput = document.getElementById('modalDescriptionInput');
    if (modalInput) {
        modalInput.value = window.activeChannel?.description || '';
    }
    
    // Set the channel id
    const channelIdInput = document.getElementById('channelIdInput');
    if (channelIdInput) {
        channelIdInput.value = window.activeChannel?.channel_id || '';
    }
    
    // Display modal box
    modal.classList.remove('opacity-0', 'invisible');
    setTimeout(() => {
        const content = modal.querySelector('.bg-white');
        if (content) {
            content.classList.remove('scale-95', 'opacity-0');
        }
    }, 10);
}

// Close the Edit Description Modal Box
window.closeEditDescriptionModal = function() {
    const modal = document.getElementById('editDescriptionModal');
    if (!modal) return;
    
    const content = modal.querySelector('.bg-white');
    if (content) {
        content.classList.add('scale-95', 'opacity-0');
    }
    
    setTimeout(() => {
        modal.classList.add('opacity-0', 'invisible');
    }, 200);
}

// Loading channel message history
function loadChannelMessages(channelId) {
    console.log(`Loading message history for channel ${channelId}`);
    
    // Check the validity of channel id
    if (!channelId || isNaN(channelId)) {
        console.error('Invalid channel ID:', channelId);
        return;
    }
    
    // If there are messages in the cache, use the cache directly
    if (messageCache[channelId]) {
        console.log(`Using cached messages, cache count: ${messageCache[channelId].length}`);
        renderMessages(messageCache[channelId]);
        return;
    }
    
    // Update ui display loading
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="flex justify-center items-center h-full">
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                    <p class="mt-2 text-gray-600 dark:text-gray-300">Loading messages...</p>
                </div>
            </div>
        `;
    }
    
    // Get message from the server
    const url = `/api/channel_messages/${channelId}`;
    console.log(`Sending API request: ${url}`);
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to get messages (${response.status})`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log(`Retrieved ${data.messages ? data.messages.length : 0} messages, total: ${data.count || 0}`);
                
                // Add message id to processed collection
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        processedMessageIds.add(msg.id);
                    });
                }
                
                // Cache messages
                messageCache[channelId] = data.messages || [];
                // Render the message
                renderMessages(data.messages || []);
            } else {
                console.error('Failed to get messages:', data.message);
                showToast('Failed to get messages: ' + data.message, 'error');
                
                // Display error ui
                if (messagesContainer) {
                    messagesContainer.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full">
                            <div class="text-center text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p class="mt-2">${data.message || 'Error loading messages'}</p>
                                <button 
                                    onclick="retryLoadMessages(${channelId})" 
                                    class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    `;
                }
            }
        })
        .catch(error => {
            console.error('Error getting messages:', error);
            showToast('Error getting messages: ' + error.message, 'error');
            
            // Display error ui
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-full">
                        <div class="text-center text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p class="mt-2">${error.message}</p>
                            <button 
                                onclick="retryLoadMessages(${channelId})" 
                                class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                `;
            }
        });
}

// Retry loading message
window.retryLoadMessages = function(channelId) {
    if (channelId) {
        loadChannelMessages(channelId);
    }
};

// Render messages
function renderMessages(messages) {
  const messagesContainer = document.getElementById('messagesContainer');
  if (!messagesContainer) {
    console.error('Messages container not found');
    return;
  }
  
  // Clear existing messages
  messagesContainer.innerHTML = '';
  
  // No messages to display
  if (!messages || messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="flex justify-center items-center h-full">
        <div class="text-center">
          <p class="text-gray-500 dark:text-gray-400">No messages yet</p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Start a conversation!</p>
        </div>
      </div>
    `;
    return;
  }
  
  // 如果频道启用了加密，尝试解密所有消息
  if (typeof isChannelEncryptionEnabled === 'function' && isChannelEncryptionEnabled(activeChannelId)) {
    // 先处理解密（异步），但渲染不等待解密完成
    const asyncDecrypt = async () => {
      for (let i = 0; i < messages.length; i++) {
        try {
          // 尝试解密，但不阻塞UI渲染
          const message = messages[i];
          
          // 检查消息是否需要解密
          const isEncrypted = message.encrypted || 
                             (message.content && typeof message.content === 'string' && 
                             message.content.includes('"encrypted":true'));
          
          if (isEncrypted && typeof ChannelEncryption !== 'undefined') {
            // 保存原始加密内容，用于可能的调试
            const originalContent = message.content;
            console.log('尝试解密消息:', message.id);
            
            // 尝试解密消息
            const decryptedContent = await ChannelEncryption.decryptMessage(activeChannelId, message.content);
            
            // 如果解密成功（内容不含错误信息）
            if (decryptedContent && 
                !decryptedContent.includes('无法解密') && 
                !decryptedContent.includes('解密失败')) {
              
              // 尝试解析JSON，如果是JSON格式则提取content字段
              let finalContent = decryptedContent;
              try {
                const jsonContent = JSON.parse(decryptedContent);
                if (jsonContent && typeof jsonContent.content !== 'undefined') {
                  finalContent = jsonContent.content;
                  console.log('成功从加密消息中提取content字段');
                }
              } catch (jsonError) {
                // 不是有效的JSON，使用整个解密结果
                console.log('解密后的内容不是JSON格式，直接使用', jsonError);
              }
              
              // 找到消息元素并更新内容
              const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
              if (messageElement) {
                const contentElement = messageElement.querySelector('.message-content');
                if (contentElement) {
                  // 保存原始加密内容用于调试
                  contentElement.setAttribute('data-original-content', originalContent);
                  contentElement.innerHTML = formatMessageContent(finalContent);
                  console.log('消息内容已更新:', message.id);
                }
                
                // 移除解密失败样式
                messageElement.classList.remove('decryption-failed');
                // 添加加密消息样式
                messageElement.classList.add('encrypted-message');
                
                // 更新加密状态指示器
                const encryptionIndicator = messageElement.querySelector('p > span[title*="无法解密"]');
                if (encryptionIndicator) {
                  encryptionIndicator.innerHTML = '<i class="fas fa-lock"></i>';
                  encryptionIndicator.className = 'ml-1 text-xs text-green-500 dark:text-green-400';
                  encryptionIndicator.title = '端到端加密消息';
                }
              } else {
                console.warn('找不到消息元素:', message.id);
              }
            } else {
              console.warn('解密消息失败:', message.id);
              // 标记消息元素为解密失败
              const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
              if (messageElement) {
                messageElement.classList.add('decryption-failed');
                
                // 添加解密失败指示器
                const indicator = messageElement.querySelector('p > span[title*="无法解密"]');
                if (!indicator) {
                  const senderElement = messageElement.querySelector('.sender-name');
                  if (senderElement) {
                    const failIndicator = document.createElement('span');
                    failIndicator.className = 'ml-1 text-xs text-red-500 dark:text-red-400';
                    failIndicator.title = '无法解密此消息';
                    failIndicator.innerHTML = '<i class="fas fa-lock-open"></i>';
                    senderElement.parentNode.appendChild(failIndicator);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('解密消息失败:', error);
        }
      }
    };
    
    // 执行异步解密，但不阻塞渲染
    asyncDecrypt().catch(error => {
      console.error('asyncDecrypt错误:', error);
    });
  }
  
  // Render all messages
  messages.forEach(message => {
    const messageElement = createMessageElement(message);
    messagesContainer.appendChild(messageElement);
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Create message elements
function createMessageElement(message) {
    // 消息处理相关变量
    const isSelf = message.user.id === window.currentUserId;
    const avatar = message.user.avatar_url || '';
    const username = message.user.username || 'Unknown User';
    let messageType = message.message_type || 'text';
    let isMentioned = false;

    // 处理加密消息状态
    let isEncrypted = false;
    let decryptionFailed = false;

    // 判断加密状态
    if (message.encrypted || message.original_encrypted) {
        isEncrypted = true;
    }

    // 判断是否解密失败（检查消息内容是否包含解密失败提示）
    if (isEncrypted && message.content && 
        (message.content.includes('无法解密此消息') || 
         message.content.includes('解密失败'))) {
        decryptionFailed = true;
    }

    // 检查是否提及了当前用户
    if (typeof window.currentUsername === 'string' && 
        typeof message.content === 'string' && 
        message.content.includes(`@${window.currentUsername}`)) {
        isMentioned = true;
    }
    
    // Process deleted messages
    if (message.is_deleted) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-item ${isSelf ? 'self' : ''} p-3 flex ${message.is_preview ? 'message-preview' : ''}`;
    messageDiv.setAttribute('data-message-id', message.id);
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 mr-3">
                <div class="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                    ${message.user.username[0].toUpperCase()}
                </div>
            </div>
            <div class="flex-1">
                <div class="flex items-center">
                    <span class="font-medium text-gray-500">${message.user.username}</span>
                    <span class="ml-2 text-xs text-gray-400">${formatMessageTime(message.created_at)}</span>
                </div>
                <div class="mt-1 text-gray-400 italic">[Message deleted]</div>
            </div>
        `;
        return messageDiv;
    }
    
    // Process preview messages
    if (message.is_preview) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-item ${isSelf ? 'self' : ''} p-3 flex ${message.is_preview ? 'message-preview' : ''}`;
        messageDiv.setAttribute('data-message-id', message.id);
        
        let previewContent = '';
        
        if (message.preview_image) {
            // Picture preview
            previewContent = `
                <div class="mt-1">
                    <div class="relative">
                        <img src="${message.preview_image}" class="max-w-xs rounded-lg border border-gray-200 dark:border-gray-700" alt="Uploading..." />
                        <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                            <div class="p-2 bg-white bg-opacity-80 rounded-md flex items-center">
                                <div class="animate-spin h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full mr-2"></div>
                                <span class="text-xs font-medium">Uploading...</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Normal file preview
            previewContent = `
                <div class="mt-1 flex items-center p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                    <div class="animate-spin h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full mr-2"></div>
                    <span class="text-sm">${message.content}</span>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 mr-3">
                <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    ${message.user.username[0].toUpperCase()}
                </div>
            </div>
            <div class="flex-1">
                <div class="flex items-center">
                    <span class="font-medium text-gray-900 dark:text-white">${message.user.username}</span>
                    <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">${formatMessageTime(message.created_at)}</span>
                </div>
                ${previewContent}
            </div>
        `;
        
        return messageDiv;
    }
    
    // System Message
    if (message.message_type === 'system') {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-item system p-2 text-center';
        messageDiv.setAttribute('data-message-id', message.id);
        messageDiv.innerHTML = `
            <div class="text-xs text-gray-500 dark:text-gray-400">
                ${formatMessageContent(message.content || '')}
                <span class="ml-1">(${formatMessageTime(message.created_at)})</span>
            </div>
        `;
        return messageDiv;
    }
    
    // Message bubble style using message.js
    const messageDiv = document.createElement('div');
    // Add basic styles
    let messageClasses = `flex items-start gap-2 mb-4 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors group animate-fade-in message-bubble`;
    
    // If the message mentions the current user, add a special style
    if (isMentioned) {
        messageClasses += ' message-mentioned-me';
    }
    
    // 如果是加密消息，添加加密消息样式
    if (isEncrypted) {
        messageClasses += ' encrypted-message';
    }
    
    // 如果解密失败，添加解密失败样式
    if (decryptionFailed) {
        messageClasses += ' decryption-failed';
    }
    
    messageDiv.className = messageClasses;
    messageDiv.setAttribute('data-message-id', message.id);
    
    // 设置消息数据属性，用于标记加密状态
    if (isEncrypted) {
        messageDiv.setAttribute('data-encrypted', 'true');
    }
    if (decryptionFailed) {
        messageDiv.setAttribute('data-decryption-failed', 'true');
    }
    
    // Get user's initial letter
    const userInitial = message.user.username[0].toUpperCase();
    
    // Building content based on message type
    let contentHtml = '';
    const messageContent = message.content || '';
    
    switch (message.message_type) {
        case 'text':
            // Normal text message
            contentHtml = `<p class="text-sm text-gray-800 dark:text-gray-200 break-words message-content">${formatMessageContent(messageContent)}</p>`;
            break;
            
        case 'image':
            // Extract picture url
            let imageUrl = messageContent;
            // If the content contains url and other text, try to separate
            if (messageContent.includes('http')) {
                const urlMatch = messageContent.match(/(https?:\/\/[^\s]+)/g);
                if (urlMatch && urlMatch.length > 0) {
                    imageUrl = urlMatch[0];
                    const textContent = messageContent.replace(imageUrl, '').trim();
                    if (textContent) {
                        contentHtml = `<p class="text-sm text-gray-800 dark:text-gray-200 break-words message-content">${formatMessageContent(textContent)}</p>`;
                    }
                }
            }
            
            // Picture message
            contentHtml += `
                <div class="mt-2">
                    <img src="${imageUrl}" class="max-w-sm rounded border border-gray-200 dark:border-gray-700" alt="Shared image" loading="lazy" />
                </div>
            `;
            break;
            
        case 'audio':
            // Extract audio url
            let audioUrl = messageContent;
            if (messageContent.includes('http')) {
                const urlMatch = messageContent.match(/(https?:\/\/[^\s]+)/g);
                if (urlMatch && urlMatch.length > 0) {
                    audioUrl = urlMatch[0];
                    const textContent = messageContent.replace(audioUrl, '').trim();
                    if (textContent) {
                        contentHtml = `<p class="text-sm text-gray-800 dark:text-gray-200 break-words message-content">${formatMessageContent(textContent)}</p>`;
                    }
                }
            }
            
            // Audio message
            contentHtml += `
                <div class="mt-2 inline-block bg-gray-100 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <div class="flex items-center">
                        <div class="text-2xl mr-3 text-blue-500">🎵</div>
                        <div>
                            <div class="text-sm font-medium">音频文件</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">Audio</div>
                    </div>
                    </div>
                    <audio controls src="${audioUrl}" class="w-full mt-2 h-8"></audio>
                </div>
            `;
            break;
            
        case 'video':
            // Extract video url
            let videoUrl = messageContent;
            if (messageContent.includes('http')) {
                const urlMatch = messageContent.match(/(https?:\/\/[^\s]+)/g);
                if (urlMatch && urlMatch.length > 0) {
                    videoUrl = urlMatch[0];
                    const textContent = messageContent.replace(videoUrl, '').trim();
                    if (textContent) {
                        contentHtml = `<p class="text-sm text-gray-800 dark:text-gray-200 break-words message-content">${formatMessageContent(textContent)}</p>`;
                    }
                }
            }
            
            // Video message
            contentHtml += `
                <div class="mt-2 inline-block">
                    <div class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                        <video src="${videoUrl}" class="max-w-sm" controls></video>
                    </div>
                </div>
            `;
            break;
            
        case 'file':
            // Extract file url
            let fileUrl = messageContent;
            let fileName = 'File';
            let fileSize = '';
            
            // Try to extract url from message content
            if (messageContent.includes('http')) {
                const urlMatch = messageContent.match(/(https?:\/\/[^\s]+)/g);
                if (urlMatch && urlMatch.length > 0) {
                    fileUrl = urlMatch[0];
                    // Extract filename from url
                    const urlParts = fileUrl.split('/');
                    fileName = urlParts[urlParts.length - 1];
                    
                    // Extract possible message text
                    const textContent = messageContent.replace(fileUrl, '').trim();
                    if (textContent) {
                        contentHtml = `<p class="text-sm text-gray-800 dark:text-gray-200 break-words message-content">${formatMessageContent(textContent)}</p>`;
                    }
                }
            }
            
            // If the message contains file information
            if (message.file_info) {
                fileName = message.file_info.name || fileName;
                if (message.file_info.size) {
                    fileSize = formatFileSize(message.file_info.size);
                }
                // If there is a url in file info, use it first
                if (message.file_info.url) {
                    fileUrl = message.file_info.url;
                }
            }
            
            // Normalized file url
            if (window.FilePreview && window.FilePreview.normalizeUrl) {
                fileUrl = window.FilePreview.normalizeUrl(fileUrl);
            } else if (fileUrl) {
                // Basic path processing logic
                const parts = fileUrl.split('/');
                const extractedFilename = parts[parts.length - 1]; 
                if (extractedFilename) {
                    // Use uploads routing format
                    fileUrl = `/uploads/${extractedFilename}`;
                }
            }
            
            // File Type Icons and Types
            let fileIcon = '📄';
            let fileType = 'Document';
            // Display name -Priority use description information
            let displayName = message.file_info?.description || 'File';
            
            if (fileName.endsWith('.pdf')) {
                fileIcon = '📕';
                fileType = 'PDF Document';
            } 
            else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
                fileIcon = '📝';
                fileType = 'Word Document';
            }
            else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
                fileIcon = '📊';
                fileType = 'Excel Spreadsheet';
            }
            else if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) {
                fileIcon = '🗜️';
                fileType = 'Compressed File';
            }
            else if (fileName.endsWith('.txt')) {
                fileIcon = '📝';
                fileType = 'Text File';
            }
            
            // File Message -Updated HTML, Add View and Download Buttons
            contentHtml += `
                <div class="mt-2 inline-flex items-center bg-gray-100 dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <span class="text-2xl mr-3">${fileIcon}</span>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">${displayName}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${fileName} - ${fileSize} - ${fileType}</div>
                        <div class="flex mt-1.5">
                            <a href="${fileUrl}" target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Original</a>
                            <span class="mx-2 text-gray-400">•</span>
                            <a href="${fileUrl}" download="${fileName}" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Download</a>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        default:
            // Default text message
            contentHtml = `<p class="text-sm text-gray-800 dark:text-gray-200 break-words message-content">${formatMessageContent(messageContent)}</p>`;
    }
    
    // 添加加密状态提示（如果需要）
    let encryptionStatusHtml = '';
    if (isEncrypted && !decryptionFailed) {
        encryptionStatusHtml = `
            <span class="ml-1 text-xs text-green-500 dark:text-green-400" title="端到端加密消息">
                <i class="fas fa-lock"></i>
            </span>
        `;
    } else if (decryptionFailed) {
        encryptionStatusHtml = `
            <span class="ml-1 text-xs text-red-500 dark:text-red-400" title="无法解密的消息">
                <i class="fas fa-lock-open"></i>
            </span>
        `;
    }
    
    // Build a complete message html
    messageDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-semibold shadow-sm flex-shrink-0">${userInitial}</div>
        <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  <strong class="sender-name">${message.user.username}</strong> · 
                  <span class="message-time">${formatMessageTime(message.created_at)}</span>
                  ${encryptionStatusHtml}
                </p>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 message-menu-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                    </button>
                    <button class="p-0.5 text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 message-star-btn" data-message-id="${message.id}" title="Pin Message">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </button>
                    <button class="p-0.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 message-reply-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </button>
                    <button class="p-0.5 text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 message-save-btn" data-message-id="${message.id}" title="Save to Favorites">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </button>
                            </div>
                                </div>
            ${contentHtml}
                            </div>
                        `;
    
    // Add a fixed message event
    setTimeout(() => {
        const starBtn = messageDiv.querySelector('.message-star-btn');
        if (starBtn) {
            starBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const messageId = this.getAttribute('data-message-id');
                if (messageId) {
                    pinMessage(messageId);
                }
            });
        }
        
        // Add a save message event
        const saveBtn = messageDiv.querySelector('.message-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const messageId = this.getAttribute('data-message-id');
                if (messageId) {
                    saveMessage(messageId);
                }
            });
        }
    }, 10);
    
    return messageDiv;
}

// Format message content, process links, etc.
function formatMessageContent(content) {
    if (!content) return '';
    
    // 确保content是字符串类型
    if (typeof content !== 'string') {
        console.warn('formatMessageContent received non-string content:', content);
        // 尝试转换为字符串
        content = String(content);
    }
    
    // Escape html special characters
    let formattedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Detect image URL pattern and convert to <img> tags -Process image first
    if (formattedContent.includes('/uploads/') && (
        formattedContent.includes('.png') || 
        formattedContent.includes('.jpg') || 
        formattedContent.includes('.jpeg') || 
        formattedContent.includes('.gif')
    )) {
        // If the whole content looks like a picture url, it is converted to picture tag
        return `<img src="${formattedContent}" alt="Uploaded Image" class="mt-2 max-w-xs rounded shadow-sm" style="max-height:300px;">`;
    }
    
    // Detect the picture of the static path and replace it with a new path
    if (formattedContent.includes('/static/uploads/') && (
        formattedContent.includes('.png') || 
        formattedContent.includes('.jpg') || 
        formattedContent.includes('.jpeg') || 
        formattedContent.includes('.gif')
    )) {
        // Extract file name
        const filename = formattedContent.split('/').pop();
        return `<img src="/uploads/${filename}" alt="Uploaded Image" class="mt-2 max-w-xs rounded shadow-sm" style="max-height:300px;">`;
    }
    
    // Highlight @可以
    const mentionRegex = /@(\w+)/g;
    formattedContent = formattedContent.replace(mentionRegex, function(match, username) {
        const currentUsername = window.currentUsername || document.querySelector('meta[name="current-username"]')?.getAttribute('content');
        const isCurrentUser = currentUsername && username.toLowerCase() === currentUsername.toLowerCase();
        
        // If the current user is mentioned, add additional highlights
        if (isCurrentUser) {
            // When rendering a message, we will add a message mentioned me class to the message containing this element.
            return `<span class="message-mention message-mention-me" data-username="${username}">@${username}</span>`;
        } else {
            return `<span class="message-mention" data-username="${username}">@${username}</span>`;
        }
    });
    
    // Convert url to link
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formattedContent = formattedContent.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" class="text-blue-500 hover:underline">${url}</a>`;
    });
    
    return formattedContent;
}

// Format message time
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Set up message sending form listener
function setupMessageForm() {
    // Get the necessary dom elements
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessageBtn');
    
    if (!messageForm || !messageInput) {
        console.error('Message form or input not found');
        return;
    }
    console.log('Initializing message form');
    
    // Form Submission Events
    messageForm.onsubmit = function(e) {
        e.preventDefault();
        
        // Get the message content
        const content = messageInput.value.trim();
        
        // If there is no content and no file is selected, no send
        const fileInput = document.getElementById('fileInput');
        const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
        
        if (!content && !hasFile) {
            console.log('No content to send');
            return;
        }
        
        // Check if there are active channels
        if (!activeChannelId) {
            showToast('Please select a channel first', 'error');
            return;
        }
        
        // Send a message
        sendMessage(content);
        
        // Reset the input box
        messageInput.value = '';
        messageInput.style.height = 'auto'; // Reset height
        messageInput.focus();
    };

}

// Send message to the server
async function sendMessage(channelId, messageContent, messageType = 'text') {
  if (!messageContent.trim()) return;

  // 检查频道是否启用了加密
  let encryptedContent = messageContent;
  let isEncrypted = false;
  
  try {
    // 检查消息类型是否需要加密（系统消息不加密）
    if (messageType !== 'system' && typeof ChannelEncryption !== 'undefined' && ChannelEncryption.isChannelEncrypted(channelId)) {
      // 加密消息内容
      encryptedContent = await ChannelEncryption.encryptMessage(channelId, messageContent);
      isEncrypted = true;
      console.log('消息已加密');
    }
    
    // 发送消息到服务器
    socket.emit('send_message', {
      channel_id: channelId,
      content: encryptedContent,
      type: messageType,
      encrypted: isEncrypted
    });
    
    // 清空消息输入框
    if (messageInputElement) {
      messageInputElement.value = '';
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    alert('发送消息失败，请重试。');
  }
}

// Initialize socket.io events
function initSocketEvents() {
    // Listen to message events
    socket.on('message', function(message) {
        console.log('Received message:', message);
        
        // Check if message is valid
        if (!message || !message.id) {
            console.error('Received invalid message:', message);
            return;
        }
        
        // Check if this message has been processed (by id)
        if (processedMessageIds.has(message.id) || 
            (message.local_id && processedMessageIds.has(message.local_id))) {
            console.log('Message already processed, skipping:', message.id);
            return;
        }
        
        // Check whether messages with the same id already exist in the cache
        const isDuplicate = messageCache[message.channel_id] && 
            messageCache[message.channel_id].some(m => m.id === message.id);
        
        if (isDuplicate) {
            console.log('Message already in cache, skipping:', message.id);
            return;
        }
        
        // Add message id to processed collection
        processedMessageIds.add(message.id);
        if (message.local_id) {
            processedMessageIds.add(message.local_id);
        }
        
        // If it is a message from the current channel, it is added to the message list
        if (message.channel_id === activeChannelId) {
            addMessageToList(message);
        }
        
        // Add to cache anyway
        if (!messageCache[message.channel_id]) {
            messageCache[message.channel_id] = [];
        }
        messageCache[message.channel_id].push(message);
        
        // Limit cache size
        if (messageCache[message.channel_id].length > 100) {
            messageCache[message.channel_id] = messageCache[message.channel_id].slice(-100);
        }
        
        // Limit the size of processed message id collection to prevent memory leaks
        if (processedMessageIds.size > 1000) {
            // Convert set to an array, delete the previous element, and recreate the set
            const idsArray = Array.from(processedMessageIds);
            processedMessageIds.clear();
            idsArray.slice(-500).forEach(id => processedMessageIds.add(id));
        }
    });
    
    // Listen to channel join events
    socket.on('channel_joined', function(data) {
        console.log('Joined channel:', data);
        
        // Cache messages
        messageCache[data.channel.id] = data.messages;
        
        // If it is the currently active channel, render the message
        if (activeChannelId === data.channel.id) {
            renderMessages(data.messages);
        }
    });
    
    // Listen to user joining channel events
    socket.on('user_joined_channel', function(data) {
        console.log('User joined channel:', data);
        
        // If it is the current channel, a notification will be displayed
        if (data.channel_id === activeChannelId) {
            showToast(`${data.user.username} joined the channel`, 'info');
        }
    });
    
    // Listen to user leaving channel events
    socket.on('user_left_channel', function(data) {
        console.log('User left channel:', data);
        
        // If it is the current channel, a notification will be displayed
        if (data.channel_id === activeChannelId) {
            showToast(`${data.username} left the channel`, 'info');
        }
    });
    
    // Listen to error events
    socket.on('error', function(error) {
        console.error('Socket.IO error:', error);
        showToast('Connection error: ' + error.message, 'error');
    });
    
    // 接收服务器发送的新消息
    socket.on('new_message', async function(data) {
      // 如果当前活动频道与消息频道匹配，显示新消息
      if (activeChannelId === data.channel_id) {
        // 检查消息是否加密
        if (data.encrypted && typeof ChannelEncryption !== 'undefined' && ChannelEncryption.isChannelEncrypted(data.channel_id)) {
          try {
            // 保存原始加密消息以便调试
            const originalContent = data.content;
            console.log('收到加密消息:', data);
            
            // 确保加密模块已初始化
            if (typeof ChannelEncryption.ensureInitialized === 'function') {
              await ChannelEncryption.ensureInitialized();
            }
            
            // 检查频道密钥是否存在
            if (ChannelEncryption.channelKeys && ChannelEncryption.channelKeys[activeChannelId]) {
              console.log('频道密钥存在，使用密钥:', {
                channelId: activeChannelId,
                hasKey: !!ChannelEncryption.channelKeys[activeChannelId].key,
                hasNonce: !!ChannelEncryption.channelKeys[activeChannelId].nonce
              });
            } else {
              console.error('频道密钥不存在，尝试请求密钥');
              
              // 修改此处，使用KDM同步机制拉取密钥
              if (typeof ChannelEncryption.pullKdm === 'function') {
                console.log('使用KDM同步机制拉取密钥');
                await ChannelEncryption.pullKdm(activeChannelId);
              } else if (typeof ChannelEncryption.requestChannelKey === 'function') {
                // 兼容旧版本
                ChannelEncryption.requestChannelKey(activeChannelId);
              }
            }
            
            // 解密消息
            let decryptedContent = null;
            try {
              decryptedContent = await ChannelEncryption.decryptMessage(activeChannelId, data.content);
            } catch (decryptError) {
              console.error('解密消息失败:', decryptError);
              
              // 添加处理解密失败的逻辑
              if (typeof ChannelEncryption.handleDecryptionFailure === 'function') {
                console.log('尝试通过KDM同步处理解密失败');
                const retrySuccess = await ChannelEncryption.handleDecryptionFailure(data);
                
                if (retrySuccess) {
                  // 如果成功获取了新密钥，重试解密
                  try {
                    console.log('使用新获取的密钥重试解密');
                    decryptedContent = await ChannelEncryption.decryptMessage(activeChannelId, data.content);
                  } catch (retryError) {
                    console.error('重试解密仍然失败:', retryError);
                  }
                }
              }
            }
            
            // 如果解密成功，使用解密后的内容
            if (decryptedContent && decryptedContent !== '解密失败' && !decryptedContent.includes('无法解密')) {
              data.content = decryptedContent;
              data.decrypted = true;
            } else {
              console.error('无法解密消息:', {
                channelId: data.channel_id,
                senderId: data.sender_id,
                messageId: data.id
              });
              
              // 显示解密失败提示
              data.content = '⚠️ 无法解密此消息。可能您没有正确的密钥，或者发送者使用了新的密钥。';
              data.decryption_failed = true;
            }
          } catch (e) {
            console.error('处理加密消息时出错:', e);
            data.content = '⚠️ 解密过程出错: ' + e.message;
            data.decryption_failed = true;
          }
        }
        
        const messageElement = createMessageElement(data);
        const messagesContainer = document.getElementById('messagesContainer');
        
        if (messagesContainer) {
          messagesContainer.appendChild(messageElement);
          // 滚动到底部
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // 如果是被提及的消息，高亮显示并播放通知
        if (data.content && data.content.includes(`@${currentUsername}`)) {
          messageElement.classList.add('mentioned-message');
          playNotificationSound();
          showDesktopNotification(data.user.username, `${data.user.username} 提及了你: ${data.content.substring(0, 50)}...`);
        }
        
        // 如果窗口未激活，增加未读消息计数
        incrementUnreadCount();
      } else {
        // 如果是其他频道的消息，只需增加该频道的未读计数
        updateChannelUnreadCount(data.channel_id);
      }
    });
}

// 高亮提及当前用户的消息
function highlightMentions() {
  // 获取当前用户名
  const currentUsername = window.currentUsername || document.querySelector('meta[name="current-username"]')?.getAttribute('content');
  if (!currentUsername) return;
  
  // 查找所有包含@提及的消息元素
  const mentionElements = document.querySelectorAll('.message-mention-me');
  if (mentionElements.length === 0) return;
  
  // 为每个包含提及的消息添加高亮样式
  mentionElements.forEach(element => {
    const messageContainer = element.closest('.message-bubble');
    if (messageContainer && !messageContainer.classList.contains('mentioned-highlight')) {
      messageContainer.classList.add('mentioned-highlight');
      
      // 添加一个短暂的动画效果
      messageContainer.classList.add('mentioned-animation');
      setTimeout(() => {
        messageContainer.classList.remove('mentioned-animation');
      }, 2000);
    }
  });
  
  console.log(`已高亮 ${mentionElements.length} 条提及当前用户的消息`);
}

// 滚动到最新消息
function scrollToBottom() {
  const messagesContainer = document.getElementById('messagesContainer');
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// 检查消息是否提及当前用户并发送通知
function notifyIfMentioned(message) {
  const currentUsername = window.currentUsername || document.querySelector('meta[name="current-username"]')?.getAttribute('content');
  if (!currentUsername || !message.content) return;
  
  // 检查消息内容是否包含@当前用户
  const mentionRegex = new RegExp(`@${currentUsername}\\b`, 'i');
  if (mentionRegex.test(message.content)) {
    // 创建通知
    const title = `${message.user.username} 提到了你`;
    const options = {
      body: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      icon: '/static/images/logo.png'
    };
    
    // 如果浏览器支持通知
    if ('Notification' in window) {
      // 检查通知权限
      if (Notification.permission === 'granted') {
        new Notification(title, options);
      } else if (Notification.permission !== 'denied') {
        // 请求通知权限
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, options);
          }
        });
      }
    }
    
    // 播放提示音（如果有）
    const mentionSound = document.getElementById('mentionSound');
    if (mentionSound) {
      mentionSound.play().catch(err => console.error('播放提示音失败:', err));
    }
    
    console.log(`用户 ${message.user.username} 在消息中提到了当前用户`);
  }
}

// Add message to list (similar to addMessageToList but with a different name)
function appendMessage(message) {
  const messagesContainer = document.getElementById('messagesContainer');
  if (!messagesContainer) return;
  
  const messageElement = createMessageElement(message);
  messagesContainer.appendChild(messageElement);
  
  // Scroll to the bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show notifications
function showToast(message, type = 'success') {
    // 防止无限递归：检查window.showToast不是当前函数本身
    if (typeof window.showToast === 'function' && window.showToast !== showToast) {
        window.showToast(message, type);
    } else {
        // 创建一个临时的toast通知元素
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 rounded-md shadow-lg p-4 
                          ${type === 'success' ? 'bg-green-500' : 
                            type === 'error' ? 'bg-red-500' : 
                            type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'} 
                          text-white transform transition-all duration-300`;
        toast.innerHTML = message;
        document.body.appendChild(toast);
        
        // 让通知显示3秒后消失
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
        
        // 记录到控制台
        console.log(`[${type}] ${message}`);
    }
}

// Loading channel message log
function loadChannelLogs(channelId, limit = 30, offset = 0, action = null) {
    console.log(`Loading message logs for channel ${channelId}`);
    
    // Build query parameters
    let url = `/api/channel_logs/${channelId}?limit=${limit}&offset=${offset}`;
    if (action) {
        url += `&action=${action}`;
    }
    
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load logs (${response.status})`);
            }
            return response.json();
        });
}

// Show channel activity log dialog box
function showChannelLogs(channelId) {
    // Create a log modal box
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'logsModal';
    
    const content = document.createElement('div');
    content.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col';
    
    // Modal box title and close button
    content.innerHTML = `
        <div class="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Channel Activity Log</h3>
            <button id="closeLogsModal" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        <div class="p-4 overflow-y-auto flex-1">
            <div class="flex space-x-2 mb-4">
                <button class="log-filter active px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-action="all">
                    All Activities
                </button>
                <button class="log-filter px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" data-action="send_message">
                    Message Records
                </button>
                <button class="log-filter px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" data-action="update_header">
                    Channel Updates
                </button>
                <button class="log-filter px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" data-action="user_joined_channel">
                    Member Changes
                </button>
            </div>
            <div id="logsContainer" class="space-y-3">
                <div class="text-center py-8">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p class="mt-2 text-gray-500 dark:text-gray-400">Loading...</p>
                </div>
            </div>
            <div id="loadMoreContainer" class="text-center mt-4 hidden">
                <button id="loadMoreLogs" class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-200 rounded-md">
                    Load More
                </button>
            </div>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close button event
    document.getElementById('closeLogsModal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Current log status
    const logsState = {
        channelId: channelId,
        offset: 0,
        limit: 30,
        action: null,
        hasMore: false,
        loading: false
    };
    
    // Loading log
    function loadLogs() {
        if (logsState.loading) return;
        
        logsState.loading = true;
        
        loadChannelLogs(logsState.channelId, logsState.limit, logsState.offset, logsState.action)
            .then(data => {
                const logsContainer = document.getElementById('logsContainer');
                
                // Empty the container on first load
                if (logsState.offset === 0) {
                    logsContainer.innerHTML = '';
                }
                
                // Create a log item
                if (data.logs.length === 0) {
                    if (logsState.offset === 0) {
                        logsContainer.innerHTML = `
                            <div class="text-center py-8">
                                <p class="text-gray-500 dark:text-gray-400">No records</p>
                            </div>
                        `;
                    }
                } else {
                    // Add log items
                    data.logs.forEach(log => {
                        const logItem = document.createElement('div');
                        logItem.className = 'p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
                        
                        // Format content according to operation type
                        let actionText = '';
                        switch (log.action) {
                            case 'send_message':
                                actionText = 'sent a message';
                                if (log.details && log.details.content_preview) {
                                    actionText += `: "${log.details.content_preview}"`;
                                }
                                break;
                            case 'update_header':
                                actionText = 'updated the channel title';
                                break;
                            case 'update_description':
                                actionText = 'updated the channel description';
                                break;
                            case 'user_joined_channel':
                                actionText = 'joined the channel';
                                break;
                            case 'user_left_channel':
                                actionText = 'left the channel';
                                break;
                            case 'invite_member':
                                actionText = 'invited a new member';
                                break;
                            case 'remove_member':
                                actionText = 'removed a member';
                                break;
                            case 'mute_member':
                                actionText = 'muted a member';
                                break;
                            case 'unmute_member':
                                actionText = 'unmuted a member';
                                break;
                            default:
                                actionText = log.action.replace(/_/g, ' ');
                        }
                        
                        // Format time
                        const time = new Date(log.action_time);
                        const formattedTime = `${time.getFullYear()}-${(time.getMonth()+1).toString().padStart(2, '0')}-${time.getDate().toString().padStart(2, '0')} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                        
                        logItem.innerHTML = `
                            <div class="flex">
                                <div class="flex-shrink-0 mr-3">
                                    <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                        ${log.user.username[0].toUpperCase()}
                                    </div>
                                </div>
                                <div class="flex-1">
                                    <div class="flex items-center">
                                        <span class="font-medium text-gray-900 dark:text-white">${log.user.username}</span>
                                        <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">${formattedTime}</span>
                                    </div>
                                    <div class="mt-1 text-gray-800 dark:text-gray-200">
                                        ${actionText}
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        logsContainer.appendChild(logItem);
                    });
                }
                
                // Update if there are more logs
                logsState.hasMore = data.total > (logsState.offset + data.count);
                document.getElementById('loadMoreContainer').classList.toggle('hidden', !logsState.hasMore);
                
                // Update offset
                logsState.offset += data.count;
                logsState.loading = false;
            })
            .catch(error => {
                logsState.loading = false;
                document.getElementById('logsContainer').innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-red-500">Loading failed: ${error.message}</p>
                    </div>
                `;
            });
    }
    
    // Load more buttons
    document.getElementById('loadMoreLogs').addEventListener('click', () => {
        loadLogs();
    });
    
    // Log filter
    document.querySelectorAll('.log-filter').forEach(button => {
        button.addEventListener('click', () => {
            // Update activation status
            document.querySelectorAll('.log-filter').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-100', 'text-blue-800', 'dark:bg-blue-900', 'dark:text-blue-200');
                btn.classList.add('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-gray-200');
            });
            
            button.classList.remove('bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-gray-200');
            button.classList.add('active', 'bg-blue-100', 'text-blue-800', 'dark:bg-blue-900', 'dark:text-blue-200');
            
            // Update filter conditions
            const action = button.getAttribute('data-action');
            logsState.action = action === 'all' ? null : action;
            logsState.offset = 0;
            
            // Reload the log
            loadLogs();
        });
    });
    
    // Initial loading
    loadLogs();
}

// Initialize file upload function
function setupFileUpload() {
    // Get the necessary dom elements
    const fileInput = document.getElementById('fileInput');
    const attachButton = document.getElementById('attachButton');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const filePreview = document.getElementById('filePreview');
    
    console.log('Initializing file upload functionality, element state:', {
        fileInput: !!fileInput,
        attachButton: !!attachButton,
        filePreviewContainer: !!filePreviewContainer,
        filePreview: !!filePreview
    });
    
    if (!fileInput || !attachButton) {
        console.error('文件上传元素不存在', {
            fileInput: !!fileInput,
            attachButton: !!attachButton
        });
        return;
    }
    
    // File button click event
    if (!attachButton.getAttribute('data-event-attached')) {
        console.log('Binding attachment button click event');
    attachButton.addEventListener('click', function(e) {
        e.preventDefault();
            e.stopPropagation(); // Prevent events from bubbles
            console.log('Attachment button clicked, preparing to open file selector');
        
            // Clear the value of the file input box to ensure that the same file can be selected repeatedly
        fileInput.value = '';
            // Trigger file selection box
        fileInput.click();
    });
    attachButton.setAttribute('data-event-attached', 'true');
    }
    
    // File selection change event
    if (!fileInput.getAttribute('data-event-attached')) {
        console.log('Binding file selection event');
        fileInput.addEventListener('change', function(e) {
            console.log('File selection changed', e);
            const file = this.files && this.files[0];
            if (!file) {
            console.log('No files selected');
            return;
        }
        
            console.log(`Selected file: ${file.name} (${formatFileSize(file.size)}), type: ${file.type}`);
            
            // Check file size limit (10MB)
            const MAX_FILE_SIZE = 10 * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE) {
                showToast(`文件过大，超过10MB限制。当前大小：${formatFileSize(file.size)}`, 'error');
                this.value = ''; // Clear Selection
                return;
            }
            
            try {
                // Render file preview
        renderFilePreview(file);
            } catch (err) {
                console.error('渲染文件预览时出错:', err);
                showToast('文件预览失败: ' + err.message, 'error');
            }
    });
    
    fileInput.setAttribute('data-event-attached', 'true');
    }
    
    // Render file preview
    function renderFilePreview(file) {
        // Show preview container
        filePreviewContainer.classList.remove('hidden');
        
        // Generate previews based on file type
        if (file.type.startsWith('image/')) {
            renderImagePreview(file);
        } else {
            renderGenericFilePreview(file);
        }
        
        // Adjust the preview position
        adjustFilePreviewPosition();
    }
    
    // Adjust the location of file preview
    function adjustFilePreviewPosition() {
        if (!filePreviewContainer) return;
        
        // Get the location information of the message form
        const messageForm = document.getElementById('messageForm');
        if (!messageForm) return;
        
        const formRect = messageForm.getBoundingClientRect();
        
        // Reset all previous location settings
        filePreviewContainer.style.bottom = '';
        filePreviewContainer.style.top = '';
        filePreviewContainer.style.left = '';
        filePreviewContainer.style.right = '';
        filePreviewContainer.style.marginBottom = '';
        filePreviewContainer.style.marginTop = '';
                filePreviewContainer.style.position = 'absolute';
        
        // Set directly above the input box
        filePreviewContainer.style.bottom = '100%';  // Set the bottom alignment top of the input box
        filePreviewContainer.style.left = '50%';     // Center horizontally
        filePreviewContainer.style.transform = 'translateX(-50%)'; // Correct the center offset
        filePreviewContainer.style.marginBottom = '10px'; // Keep a certain distance from the input box
        
        // Make sure the preview container does not exceed the top of the visual area
                const containerRect = filePreviewContainer.getBoundingClientRect();
                if (containerRect.top < 10) {
            // If the top is beyond the visible area, adjust the position below the form
                    filePreviewContainer.style.bottom = 'auto';
                    filePreviewContainer.style.top = '100%';
                    filePreviewContainer.style.marginBottom = '0';
                    filePreviewContainer.style.marginTop = '10px';
                }
        
        console.log('文件预览位置已调整');
    }
    
    // Export the function to a global scope for use elsewhere
    window.adjustFilePreviewPosition = adjustFilePreviewPosition;
    
    // Adjust file preview position when adding window size changes
    window.addEventListener('resize', function() {
        if (filePreviewContainer && !filePreviewContainer.classList.contains('hidden')) {
            adjustFilePreviewPosition();
        }
    });
    
    // Rendering image preview
    function renderImagePreview(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            filePreview.innerHTML = `
                <div class="relative max-w-xs">
                    <img src="${e.target.result}" class="h-32 rounded border border-gray-300 dark:border-gray-600 object-contain bg-gray-50 dark:bg-gray-700" />
                    <button id="removeFileBtn" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">×</button>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs">${file.name} (${formatFileSize(file.size)})</div>
                </div>
            `;
            addRemoveButtonListener();
        };
        reader.readAsDataURL(file);
    }
    
    // Rendering general file preview
    function renderGenericFilePreview(file) {
        // Get file type icon and description
        const {icon, type} = getFileTypeInfo(file);
        
        filePreview.innerHTML = `
            <div class="relative max-w-xs">
                <div class="flex items-center bg-gray-100 dark:bg-gray-700 p-3 rounded border border-gray-300 dark:border-gray-600">
                    <div class="text-2xl mr-3">${icon}</div>
                    <div>
                        <div class="text-sm font-medium truncate">${file.name}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${formatFileSize(file.size)} - ${type}</div>
                    </div>
                    <button id="removeFileBtn" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">×</button>
                </div>
            </div>
        `;
        addRemoveButtonListener();
    }
    
    // Get file type information
    function getFileTypeInfo(file) {
        let icon = '📄', type = '文件';
        
        if (file.type.includes('pdf')) {
            icon = '📕'; type = 'PDF文档';
        } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
            icon = '📝'; type = 'Word文档';
        } else if (file.type.includes('excel') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
            icon = '📊'; type = 'Excel表格';
        } else if (file.type.includes('zip') || file.type.includes('rar') || 
                   file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
            icon = '🗜️'; type = '压缩文件';
        } else if (file.type.includes('audio')) {
            icon = '🎵'; type = '音频文件';
        } else if (file.type.includes('video')) {
            icon = '🎬'; type = '视频文件';
        } else if (file.type.includes('text/')) {
            icon = '📝'; type = '文本文件';
        } else if (file.type.includes('presentation') || file.type.includes('powerpoint')) {
            icon = '📽️'; type = 'PowerPoint 演示文稿';
        }
        
        return {icon, type};
    }
    
    // Add event listening to remove file button
    function addRemoveButtonListener() {
        setTimeout(() => {
            const removeBtn = document.getElementById('removeFileBtn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Removing file');
                    
                    // Clear file selection and preview
                    fileInput.value = '';
                    filePreview.innerHTML = '';
                    filePreviewContainer.classList.add('hidden');
                });
            }
        }, 50);
    }
}

// Upload files to the server
function uploadFile(file, textContent) {
    if (!file || window.isUploadingFile) return;
    
    // Set Upload Status
    window.isUploadingFile = true;
    window.isSendingMessage = true;
    
    console.log(`Start uploading file: ${file.name}`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    if (activeChannelId) {
        formData.append('channel_id', activeChannelId);
    }
    if (textContent) {
        formData.append('description', textContent);
    }
    
    // Show Upload Indicator
    const indicator = document.createElement('div');
    indicator.id = 'uploadProgressIndicator';
    indicator.className = 'fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg p-4 rounded-lg z-50';
    indicator.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <div>
                <div class="text-sm font-medium">Uploading ${file.name}</div>
                <div class="text-xs text-gray-500">${formatFileSize(file.size)}</div>
            </div>
        </div>
    `;
    document.body.appendChild(indicator);
    
    // Send a request
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Upload response:', data);
        
        if (data.success) {
            // Build message content
            let messageContent = textContent || '';
            if (messageContent) messageContent += '\n\n';
            
            // Use normalized url
            let fileUrl = data.file.url;
            if (window.FilePreview && window.FilePreview.normalizeUrl) {
                fileUrl = window.FilePreview.normalizeUrl(fileUrl);
            }
            
            messageContent += fileUrl;
            
            // Determine the message type
            let messageType = 'file';
            if (file.type.startsWith('image/')) messageType = 'image';
            else if (file.type.includes('audio/')) messageType = 'audio';
            else if (file.type.includes('video/')) messageType = 'video';
            
            // Get file name and description from server return data
            const fileName = data.file.name || file.name;
            const fileDescription = data.file.description || data.file.original_name || fileName.split('.')[0];
            
            // Send a message
            socket.emit('message', {
                channel_id: activeChannelId,
                content: messageContent,
                message_type: messageType,
                file_info: {
                    name: fileName,
                    size: file.size,
                    type: file.type,
                    url: fileUrl,  // Use normalized url
                    description: fileDescription
                }
            });
            
            // Clear input and preview
            const messageInput = document.getElementById('messageInput');
            const filePreview = document.getElementById('filePreview');
            const filePreviewContainer = document.getElementById('filePreviewContainer');
            
            if (messageInput) messageInput.value = '';
            if (filePreview) filePreview.innerHTML = '';
            if (filePreviewContainer) filePreviewContainer.classList.add('hidden');
            if (fileInput) fileInput.value = '';
            
            // Show success prompt
            showToast('File uploaded successfully', 'success');
        } else {
            showToast(data.message || 'Failed to upload file', 'error');
        }
    })
    .catch(error => {
        console.error('Upload error:', error);
        showToast('Error uploading file: ' + error.message, 'error');
    })
    .finally(() => {
        // Clean up status and ui
        window.isUploadingFile = false;
        window.isSendingMessage = false;
        
        // Remove the upload indicator
        const indicator = document.getElementById('uploadProgressIndicator');
        if (indicator) indicator.remove();
    });
}

// Fixed message
function pinMessage(messageId) {
  // Verify message id
  if (!messageId) {
    console.error('Invalid message ID');
    return Promise.reject(new Error('Invalid message ID'));
  }
  
  const message = getMessageById(messageId);
  if (!message) {
    console.error(`Message with ID ${messageId} not found`);
    return Promise.reject(new Error('Message not found'));
  }
  
  console.log(`Pinning message: ${messageId}`);
  
  // Show notifications
  showToast('Pinning message...', 'info');
  
  // Send a fixed message to the server
  return fetch('/api/pin_message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message_id: messageId,
      channel_id: activeChannelId,
      message_content: message.content,
      sender_id: message.user_id,
      created_at: message.created_at
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to pin message (${response.status})`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      // Show success notification
      showToast('Message pinned successfully', 'success');
      
      // If the Fixed Message Panel is open, reload the Fixed Message
      if (document.getElementById('pinnedPanel').classList.contains('translate-x-0')) {
        updatePinnedMessagesList();
      }
      
      // Update message view status
      const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
      if (messageElement) {
        const pinButton = messageElement.querySelector('.pin-btn');
        if (pinButton) {
          pinButton.classList.add('text-blue-500');
          pinButton.title = 'Unpin message';
          
          // Update icons or content
          pinButton.innerHTML = '<img src="../static/images/pinned.png" class="w-4 h-4" alt="Pinned" />';
        }
      }
      
      return data;
    } else {
      showToast(data.message || 'Failed to pin message', 'error');
      return Promise.reject(new Error(data.message || 'Failed to pin message'));
    }
  })
  .catch(error => {
    console.error('Error pinning message:', error);
    showToast(`Error pinning message: ${error.message}`, 'error');
    return Promise.reject(error);
  });
}

// Process fixed messages
function handlePinButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const button = event.currentTarget;
  const messageElement = button.closest('.message');
  
  if (!messageElement) {
    console.error('Message element not found');
    return;
  }
  
  const messageId = messageElement.dataset.messageId;
  
  // Check if the message is fixed
  const isPinned = button.classList.contains('text-blue-500');
  
  // If not fixed, then the message is fixed
  if (!isPinned) {
    // Animation effect
    const originalColor = button.style.color;
    button.style.color = '#3b82f6'; // blue 500
    
    // Simulate fixed animation
    button.classList.add('animate-pin-message');
    
    // Fixed message
    pinMessage(messageId)
      .catch(error => {
        console.error('Failed to pin message:', error);
        
        // Restore original state
        button.style.color = originalColor;
        button.classList.remove('animate-pin-message');
      });
  } else {
    // If fixed, cancel the pin
    unpinMessage(messageId);
  }
}

// Reload the fixed message panel
function updatePinnedMessagesList() {
  if (typeof window.updatePinnedMessagesList === 'function') {
    window.updatePinnedMessagesList();
  }
}

// Unpinned message
function unpinMessage(messageId) {
  if (!messageId) {
    console.error('Invalid message ID');
    return;
  }
  
  // Show notifications
  showToast('Unpinning message...', 'info');
  
  fetch(`/api/unpin_message/${messageId}`, {
    method: 'DELETE'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to unpin message (${response.status})`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      // Show success notification
      showToast('Message unpinned successfully', 'success');
      
      // Reload the fixed message panel
      if (document.getElementById('pinnedPanel').classList.contains('translate-x-0')) {
        updatePinnedMessagesList();
      }
      
      // Update message view status
      const messageElement = document.querySelector(`.message[data-message-id="${messageId}"]`);
      if (messageElement) {
        const pinButton = messageElement.querySelector('.pin-btn');
        if (pinButton) {
          pinButton.classList.remove('text-blue-500');
          pinButton.title = 'Pin message';
          
          // Update icons or content
          pinButton.innerHTML = '<img src="../static/images/unpinned.png" class="w-4 h-4" alt="Pin" />';
        }
      }
    } else {
      showToast(data.message || 'Failed to unpin message', 'error');
    }
  })
  .catch(error => {
    console.error('Error unpinning message:', error);
    showToast(`Error unpinning message: ${error.message}`, 'error');
  });
}

// Save message to favorites
function saveMessage(messageId) {
    if (!messageId) {
        console.error('Invalid message ID');
        return;
    }
    
    console.log(`Saving message: ${messageId}`);
    
    // show loading indicator
    showToast('Saving message...', 'info');
    
    // Send request to server to save message
    fetch('/api/save_item', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            item_type: 'message',
            item_id: messageId,
            channel_id: activeChannelId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to save message (${response.status})`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast('Message saved to favorites', 'success');
            
            // add visual feedback -flash bookmark button
            const messageElement = document.querySelector(`.message-bubble[data-message-id="${messageId}"]`);
            if (messageElement) {
                const saveBtn = messageElement.querySelector('.message-save-btn');
                if (saveBtn) {
                    // add highlight animation
                    saveBtn.classList.remove('text-gray-400', 'hover:text-amber-500');
                    saveBtn.classList.add('text-amber-500');
                    
                    // restore original state after 2 seconds
                    setTimeout(() => {
                        saveBtn.classList.remove('text-amber-500');
                        saveBtn.classList.add('text-gray-400', 'hover:text-amber-500');
                    }, 2000);
                }
            }
            
            // Trigger custom event to notify saved items panel to update
            const event = new CustomEvent('itemSaved', { 
                detail: { 
                    success: true, 
                    messageId: messageId,
                    channelId: activeChannelId
                } 
            });
            document.dispatchEvent(event);
            
            // Automatically open saved items panel
            const savedPanel = document.getElementById('savedPanel');
            if (savedPanel) {
                // First make sure to remove any transform classes
                savedPanel.classList.remove('translate-x-full');
                
                // If saved panel is already open, refresh content immediately
                console.log('Saved panel is already open or being opened, refreshing content immediately');
                if (window.savedItemsManager && typeof window.savedItemsManager.refresh === 'function') {
                    window.savedItemsManager.refresh();
                } else {
                    // Fallback approach, use event delegation
                    const toggleSavedButton = document.getElementById('toggleSaved');
                    if (toggleSavedButton) {
                        console.log('Attempting to open saved panel by clicking toggleSaved button');
                        toggleSavedButton.click();
                    }
                }
            }
        } else {
            showToast(data.message || 'Failed to save message', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving message:', error);
        showToast(`Error saving message: ${error.message}`, 'error');
    });
}

// emo and pick functionality
function initEmojiPicker() {
  const emojiButton = document.getElementById('emojiButton');
  const emojiPicker = document.getElementById('emojiPicker');
  const messageInput = document.getElementById('messageInput');
  
  // define close emo and pick function in outer scope
  function closeEmojiPicker() {
    if (emojiPicker) {
      emojiPicker.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        emojiPicker.classList.add('hidden');
      }, 200);
    }
  }
  
  if (emojiButton && emojiPicker && messageInput) {
    console.log('Initializing emoji picker...');
    
    // Check if event listener has already been set
    if (!emojiButton.getAttribute('data-event-attached')) {
      emojiButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop event propagation
        emojiPicker.classList.toggle('hidden');
        console.log('Emoji button clicked, emoji picker status:', !emojiPicker.classList.contains('hidden') ? 'visible' : 'hidden');
        
        // If visible, 阿到底animation effect
        if (!emojiPicker.classList.contains('hidden')) {
          setTimeout(() => {
            emojiPicker.classList.remove('scale-95', 'opacity-0');
            emojiPicker.classList.add('scale-100', 'opacity-100');
          }, 10);
        } else {
          // add animation when hiding
          emojiPicker.classList.add('scale-95', 'opacity-0');
          setTimeout(() => {
            if (emojiPicker.classList.contains('scale-95')) { // confirm still in hiding animation
              emojiPicker.classList.add('hidden');
            }
          }, 200);
        }
      });
      
      // Mark that event listener has been attached
      emojiButton.setAttribute('data-event-attached', 'true');
    }
    
    // Add close button functionality
    const closeBtn = document.getElementById('closeEmojiPicker');
    if (closeBtn && !closeBtn.getAttribute('data-event-attached')) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop event propagation
        closeEmojiPicker();
      });
      closeBtn.setAttribute('data-event-attached', 'true');
    }
    
    // Add search button functionality
    const searchBtn = document.getElementById('searchEmojiBtn');
    if (searchBtn && !searchBtn.getAttribute('data-event-attached')) {
      searchBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop event propagation
        const searchContainer = document.getElementById('emojiSearchContainer');
        if (searchContainer) {
          searchContainer.classList.toggle('hidden');
          if (!searchContainer.classList.contains('hidden')) {
            const searchInput = searchContainer.querySelector('input');
            if (searchInput) searchInput.focus();
          }
        }
      });
      searchBtn.setAttribute('data-event-attached', 'true');
    }
    
    // Add category button functionality
    document.querySelectorAll('.emoji-category-btn').forEach(btn => {
      if (!btn.getAttribute('data-event-attached')) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Stop event propagation
          // Remove active state from all category buttons
          document.querySelectorAll('.emoji-category-btn').forEach(el => {
            el.classList.remove('text-blue-600', 'bg-blue-50', 'border-b-2', 'border-blue-600',
                            'dark:text-blue-400', 'dark:bg-blue-900/20', 'dark:border-blue-400');
            el.classList.add('text-gray-500', 'hover:text-gray-700', 'dark:text-gray-400', 'dark:hover:text-gray-200');
          });
          
          // Activate current clicked category button
          btn.classList.remove('text-gray-500', 'hover:text-gray-700', 'dark:text-gray-400', 'dark:hover:text-gray-200');
          btn.classList.add('text-blue-600', 'bg-blue-50', 'border-b-2', 'border-blue-600',
                          'dark:text-blue-400', 'dark:bg-blue-900/20', 'dark:border-blue-400');
        });
        btn.setAttribute('data-event-attached', 'true');
      }
    });
    
    // Close emo and pick when clicking outside
    if (!document.body.getAttribute('data-emoji-close-attached')) {
      document.addEventListener('click', (e) => {
        if (emojiPicker && !emojiPicker.classList.contains('hidden') && 
            !emojiPicker.contains(e.target) && e.target !== emojiButton) {
          closeEmojiPicker();
        }
      });
      document.body.setAttribute('data-emoji-close-attached', 'true');
    }
  } else {
    console.error('Emoji picker initialization failed: missing necessary elements', {
      emojiButton: !!emojiButton,
      emojiPicker: !!emojiPicker,
      messageInput: !!messageInput
    });
  }
}

// Initialize after document loading
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the channel manager
    initChannelManager();
    
    // Make sure the emoticon selector is initialized correctly and rebind all emoticon buttons after the document is loaded
    setTimeout(function() {
        console.log("Rebinding emoji button events...");
        // Add click events for all emoticon buttons
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            const messageInput = document.getElementById('messageInput');
            if (!messageInput) {
                console.error('Message input not found, cannot bind emoji buttons');
                return;
            }

            // Remove previous event listeners (if any)
            const emojiText = btn.textContent;
            btn.replaceWith(btn.cloneNode(true));
            
            // Retrieve button element (new element after cloning)
            document.querySelectorAll('.emoji-btn').forEach(newBtn => {
                if (newBtn.textContent === emojiText) {
                    newBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // Stop events from bubbles
                        console.log('Clicked emoji: ' + e.target.textContent);
                        
                        // Get emoji characters
                        const emoji = e.target.textContent;
                        
                        // Insert directly into the input box
                        try {
                            // Get the current cursor position
                            const cursorPos = messageInput.selectionStart;
                            // Insert emoji at cursor position
                            const value = messageInput.value;
                            messageInput.value = 
                                value.substring(0, messageInput.selectionStart) + 
                                emoji + 
                                value.substring(messageInput.selectionEnd);
                            
                            // Move the cursor behind the emoji
                            messageInput.selectionStart = cursorPos + emoji.length;
                            messageInput.selectionEnd = cursorPos + emoji.length;
                            messageInput.focus();
                            
                            // Trigger input event to adjust input box height
                            messageInput.dispatchEvent(new Event('input'));
                            
                            closeEmojiPicker(); // Close emoji picker after selection
                        } catch (error) {
                            console.error('Error inserting emoji:', error);
                        }
                    });
                }
            });
        });
    }, 500); // Give enough delay to ensure the dom is fully loaded
}); 

// 检查频道是否启用加密的辅助函数
function isChannelEncryptionEnabled(channelId) {
    if (!channelId) return false;
    
    // 检查ChannelEncryption模块是否存在
    if (typeof ChannelEncryption === 'undefined') {
        console.warn('ChannelEncryption模块未加载，无法启用加密');
        return false;
    }
    
    // 调用ChannelEncryption模块的isChannelEncrypted方法
    return ChannelEncryption.isChannelEncrypted(channelId);
}

// Process fixed messages
function handlePinMessage(messageId) {
  if (!activeChannelId) {
    showToast('Please select a channel first', 'warning');
    return;
  }
  
  // Check if the message has been fixed
  checkIfPinned(messageId)
    .then(isPinned => {
      if (isPinned) {
        // If fixed, cancel the pin
        unpinMessage(messageId);
      } else {
        // If not fixed, then the message is fixed
        pinMessage(messageId);
      }
    })
    .catch(error => {
      console.error('Error checking pin status:', error);
      showToast('Failed to check pin status', 'error');
    });
}

// Check if the message is fixed
function checkIfPinned(messageId) {
  return fetch(`/api/is_pinned?message_id=${messageId}&channel_id=${activeChannelId}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        return data.is_pinned;
      } else {
        throw new Error(data.message || 'Failed to check pin status');
      }
    });
}

// Update the fixed status of the message ui
function updatePinUI(messageId, isPinned) {
  const messageElement = document.querySelector(`.message-bubble[data-message-id="${messageId}"]`);
  if (!messageElement) return;
  
  const pinButton = messageElement.querySelector('.pin-message-btn');
  if (pinButton) {
    // Update button icon
    if (isPinned) {
      pinButton.innerHTML = '<img src="../static/images/pinned.png" class="w-4 h-4" alt="Pinned" />';
      pinButton.title = 'Unpin message';
    } else {
      pinButton.innerHTML = '<img src="../static/images/unpinned.png" class="w-4 h-4" alt="Pin" />';
      pinButton.title = 'Pin message';
    }
  }
  
  // Add or remove fixed marks
  const pinnedFlag = messageElement.querySelector('.pinned-flag');
  if (isPinned) {
    if (!pinnedFlag) {
      const flag = document.createElement('div');
      flag.className = 'pinned-flag absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1 py-0.5 rounded shadow-sm';
      flag.innerHTML = '<img src="../static/images/pinned.png" class="w-3 h-3 inline-block" alt="Pinned" />';
      messageElement.appendChild(flag);
    }
  } else {
    if (pinnedFlag) {
      pinnedFlag.remove();
    }
  }
}

// Loading pinned messages to panel
function loadPinnedMessages() {
  if (!activeChannelId) return;
  
  const pinnedPanel = document.getElementById('pinnedPanel');
  if (!pinnedPanel) return;
  
  const pinnedContent = pinnedPanel.querySelector('div.flex-1.overflow-y-auto > div');
  if (!pinnedContent) return;
  
  // Show load indicator
  pinnedContent.innerHTML = `
    <div class="flex justify-center items-center py-8">
      <div class="loader animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-2 text-gray-600 dark:text-gray-300">Loading pinned messages...</span>
    </div>
  `;
  
  // Make sure the file preview function is loading
  if (window.FilePreview) {
    console.log('FilePreview component is available for pinned messages');
  } else {
    console.warn('FilePreview component not found, using basic file previews for pinned messages');
  }
  
  fetch(`/api/pinned_messages?channel_id=${activeChannelId}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        if (data.messages && data.messages.length > 0) {
          // There is a fixed message
          const messagesHTML = data.messages.map(msg => createPinnedMessageHTML(msg)).join('');
          pinnedContent.innerHTML = `<div class="space-y-4">${messagesHTML}</div>`;
          
          // Add event listener
          addPinnedMessagesListeners();
          
          // Trigger custom events to notify image url normalized component processing
          document.dispatchEvent(new CustomEvent('pinnedMessagesLoaded', {
            detail: { channelId: activeChannelId }
          }));
          console.log('Triggered pinnedMessagesLoaded event');
          
          // Force load all pictures
          setTimeout(() => {
            console.log('Force loading all images after pinned messages are loaded');
            const images = pinnedContent.querySelectorAll('img');
            images.forEach((img, index) => {
              if (img.src) {
                console.log(`Force loading image #${index + 1} in pinned message: ${img.src}`);
                
                // Add load event listening
                img.onload = function() {
                  console.log(`Image #${index + 1} in pinned message loaded successfully`);
                };
                
                img.onerror = function() {
                  console.error(`Failed to load image #${index + 1} in pinned message:`, img.src);
                  
                  // Try preloading with image object
                  const preloadImg = new Image();
                  preloadImg.onload = function() {
                    console.log(`Preloaded image #${index + 1} in pinned message successfully, resetting src`);
                    img.src = img.src + (img.src.includes('?') ? '&reload=' : '?reload=') + Date.now();
                  };
                  preloadImg.src = img.src;
                };
                
                // Force reload
                img.src = img.src + (img.src.includes('?') ? '&reload=' : '?reload=') + Date.now();
              }
            });
            
            // If there is a global forced loading function, call it
            if (window.forceLoadAllImages && typeof window.forceLoadAllImages === 'function') {
              setTimeout(() => {
                window.forceLoadAllImages();
              }, 200);
            }
          }, 100);
        } else {
          // No fixed message
          pinnedContent.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-300">
              <img src="../static/images/unpinned.png" class="w-10 h-10 mx-auto mb-4 opacity-70 dark:opacity-90" />
              <p class="font-medium">No pinned messages yet</p>
              <p class="text-sm mt-2 text-gray-400 dark:text-gray-500">
                Important pinned messages will be displayed here for easy reference.
              </p>
            </div>
          `;
        }
      } else {
        pinnedContent.innerHTML = `
          <div class="text-center text-red-500 py-8">
            <p>Failed to load pinned messages: ${data.message || 'Unknown error'}</p>
            <button class="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded" onclick="loadPinnedMessages()">
              Retry
            </button>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error loading pinned messages:', error);
      pinnedContent.innerHTML = `
        <div class="text-center text-red-500 py-8">
          <p>Failed to load pinned messages: ${error.message || 'Network error'}</p>
          <button class="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded" onclick="loadPinnedMessages()">
            Retry
          </button>
        </div>
      `;
    });
}

// Create a fixed message html
function createPinnedMessageHTML(message) {
  // Format date
  const date = new Date(message.timestamp);
  const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  
  // Check if there are file attachments
  const hasFileAttachment = message.file_url && message.file_url.trim() !== '';
  if (hasFileAttachment) {
    console.log('Pinned message has file attachment:', message.file_url);
  }
  
  // Check if the file is an image
  let fileAttachmentHTML = '';
  if (hasFileAttachment) {
    // Normalized file url
    let fileUrl = message.file_url;
    if (window.FilePreview && window.FilePreview.normalizeUrl) {
      fileUrl = window.FilePreview.normalizeUrl(fileUrl);
    } else {
      // Basic processing
      const parts = fileUrl.split('/');
      const filename = parts[parts.length - 1];
      // Use uploads routing
      fileUrl = `/uploads/${filename}`;
    }
    
    // Add timestamp to prevent cache
    fileUrl = fileUrl + (fileUrl.includes('?') ? '&t=' : '?t=') + Date.now();
    
    const filename = message.file_name || extractFilenameFromUrl(message.file_url);
    const fileExtension = filename.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
    
    // Create different html for pictures and non-pictures
    if (isImage) {
      // Generate unique id for image elements
      const imgId = 'pinned_img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      
      // Create a placeholder html first
      fileAttachmentHTML = `
        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div class="image-container relative">
            <div class="w-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 p-4 rounded-lg" style="min-height: 150px;" id="${imgId}_placeholder">
              <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading image...</p>
              </div>
            </div>
            <img id="${imgId}" src="" alt="${filename}" 
              class="max-w-xs rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hidden" />
          </div>
          <div class="flex mt-2 space-x-2">
            <a href="${fileUrl}" target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Original</a>
            <span class="text-gray-400">•</span>
            <a href="${fileUrl}" download="${filename}" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Download</a>
          </div>
        </div>
      `;
      
      // Add a global function to load this specific image now
      window['loadPinnedImage_' + imgId] = function() {
        const img = document.getElementById(imgId);
        const placeholder = document.getElementById(imgId + '_placeholder');
        
        if (!img || !placeholder) {
          console.error('Cannot find image element or placeholder:', imgId);
          return;
        }
        
        // Use fetch to get pictures
        console.log('Starting to fetch pinned message image:', fileUrl);
        
        // Request images using fetch API
        fetch(fileUrl, {
          method: 'GET',
          cache: 'no-store', // Disable cache completely
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Image loading failed: ' + response.status);
          }
          return response.blob();
        })
        .then(blob => {
          // Create a blob URL
          const objectURL = URL.createObjectURL(blob);
          
          // Set the picture src and display it
          img.onload = function() {
            console.log('Pinned message image loaded successfully:', fileUrl);
            img.classList.remove('hidden');
            placeholder.classList.add('hidden');
          };
          
          img.onerror = function() {
            console.error('Failed to load pinned message image:', fileUrl);
            placeholder.innerHTML = `
              <div class="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="mt-2 text-sm text-red-500">Image loading failed</p>
                <button class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600" onclick="window.loadPinnedImage_${imgId}()">Retry</button>
              </div>
            `;
          };
          
          img.src = objectURL;
        })
        .catch(error => {
          console.error('Error getting image:', error);
          placeholder.innerHTML = `
            <div class="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="mt-2 text-sm text-red-500">${error.message || 'Loading failed'}</p>
              <button class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600" onclick="window.loadPinnedImage_${imgId}()">Retry</button>
            </div>
          `;
        });
      };
      
      // Loading the image after a short delay
      setTimeout(() => {
        if (typeof window['loadPinnedImage_' + imgId] === 'function') {
          window['loadPinnedImage_' + imgId]();
        }
      }, 100);
    } else {
      // Use basic display of non-image files
      const fileIcon = getFileIconByExtension(filename);
      fileAttachmentHTML = `
        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-3 flex items-start">
            <div class="text-2xl mr-3">${fileIcon}</div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">${filename}</div>
              <div class="flex mt-1">
                <a href="${fileUrl}" target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Original</a>
                <span class="mx-2 text-gray-400">•</span>
                <a href="${fileUrl}" download="${filename}" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Download</a>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }
  
  return `
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm animate-bounce-in" data-message-id="${message.message_id}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold mr-2">
            ${message.username ? message.username[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div class="font-medium text-gray-800 dark:text-white">${message.username || 'Unknown user'}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${formattedDate}</div>
          </div>
        </div>
        <div>
          <button class="unpin-btn p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="Unpin message">
            <img src="../static/images/pinned.png" class="w-4 h-4" alt="Unpin" />
          </button>
          <button class="goto-message-btn p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ml-1" title="Go to message">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
      <div class="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap break-words">${formatMessageContent(message.content)}</div>
      ${fileAttachmentHTML}
    </div>
  `;
}

// Add a fixed message event listener
function addPinnedMessagesListeners() {
  // Cancel pin button
  document.querySelectorAll('.unpin-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const messageElement = this.closest('[data-message-id]');
      if (messageElement) {
        const messageId = messageElement.dataset.messageId;
        // Add fade animation
        messageElement.classList.add('animate-fade-out');
        // Wait for the animation to be completed and cancel the pinning
        setTimeout(() => {
          unpinMessage(messageId);
        }, 300);
      }
    });
  });
  
  // Jump to message button
  document.querySelectorAll('.goto-message-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const messageElement = this.closest('[data-message-id]');
      if (messageElement) {
        const messageId = messageElement.dataset.messageId;
        scrollToMessage(messageId);
      }
    });
  });
}

// Create file attachment html
function createFileAttachmentHTML(message) {
  // Make sure file preview is available
  if (!window.FilePreview) {
    console.warn('FilePreview component not found, using basic file preview');
    return basicFileAttachmentHTML(message);
  }
  
  try {
    // Normalize file urls to ensure path consistency
    let fileUrl = message.file_url;
    if (window.FilePreview.normalizeUrl) {
      fileUrl = window.FilePreview.normalizeUrl(fileUrl);
      console.log('Normalized file URL in message attachment:', fileUrl);
    }
    
    // Prepare file data
    const fileData = {
      url: fileUrl,
      name: message.file_name || extractFilenameFromUrl(message.file_url),
      size: message.file_size || 0,
      type: message.file_type || guessFileTypeFromUrl(message.file_url),
      uploadDate: message.timestamp,
      description: message.file_description || message.file_info?.description || message.file_name || extractFilenameFromUrl(message.file_url).split('.')[0]
    };
    
    // Detect whether the file is an image -judged by URL or type
    const fileExtension = fileData.name.split('.').pop().toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension) || 
                    (fileData.type && fileData.type.startsWith('image/'));
    
    // If it is an image, set the previewable property
    if (isImage && fileData.type && !fileData.type.startsWith('image/')) {
      fileData.type = 'image/' + fileExtension;
    }
    
    console.log('Creating file preview for:', fileData);
    
    // Create a preview using the file preview component
    return `
      <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        ${window.FilePreview.create(fileData, true)}
      </div>
    `;
  } catch (error) {
    console.error('Error creating file preview:', error);
    return basicFileAttachmentHTML(message);
  }
}

// Basic file attachment HTML (fallback)
function basicFileAttachmentHTML(message) {
  const filename = message.file_name || extractFilenameFromUrl(message.file_url);
  const fileIcon = getFileIconByExtension(filename);
  const description = message.file_description || message.file_info?.description || filename.split('.')[0];
  
  // Normalized file url
  let fileUrl = message.file_url;
  if (window.FilePreview && window.FilePreview.normalizeUrl) {
    fileUrl = window.FilePreview.normalizeUrl(fileUrl);
    console.log('Normalized file URL in basic attachment:', fileUrl);
  } else if (fileUrl) {
    // Basic path processing logic if FilePreview is not available
    // Extract file name
    const parts = fileUrl.split('/');
    const extractedFilename = parts[parts.length - 1]; 
    // Use relative path format
    fileUrl = `../static/uploads/${extractedFilename}`;
    console.log('Using basic processing to generate relative path:', fileUrl);
  }
  
  return `
    <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div class="bg-gray-50 dark:bg-gray-700/50 rounded p-3 flex items-start">
        <div class="text-2xl mr-3">${fileIcon}</div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">${description}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 truncate">${filename}</div>
          <div class="flex mt-1">
            <a href="${fileUrl}" target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">View</a>
            <span class="mx-2 text-gray-400">•</span>
            <a href="${fileUrl}" download="${filename}" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Download</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Extract filename from url
function extractFilenameFromUrl(url) {
  if (!url) return 'Unknown file';
  const parts = url.split('/');
  return parts[parts.length - 1];
}

// Infer file type from url
function guessFileTypeFromUrl(url) {
  if (!url) return '';
  
  const extension = url.split('.').pop().toLowerCase();
  const mimeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'gz': 'application/gzip',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogv': 'video/ogg'
  };
  
  return mimeMap[extension] || 'application/octet-stream';
}

// Get icons based on file extension
function getFileIconByExtension(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  
  const icons = {
    'pdf': '📕',
    'doc': '📝', 'docx': '📝',
    'xls': '📊', 'xlsx': '📊',
    'ppt': '📽️', 'pptx': '📽️',
    'txt': '📄',
    'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️', 'gz': '🗜️',
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
    'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵',
    'mp4': '🎬', 'webm': '🎬', 'ogv': '🎬', 'mov': '🎬', 'avi': '🎬',
    'html': '🌐', 'css': '🌐', 'js': '🌐',
    'exe': '⚙️',
    'default': '📄'
  };
  
  return icons[extension] || icons['default'];
}

/**
 * Get CSRF token
 */
function getCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }
    
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
}

// Get all channel items
function getAllChannelItems() {
    return document.querySelectorAll('.channel-item');
}

// Get channel by ID
function getChannelById(channelId) {
    return document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
}

// Get and set the default channel name to the title
function setDefaultChannelNameToTitle() {
    const defaultChannel = document.querySelector('.channel-item.default-channel');
    if (defaultChannel) {
        const channelName = defaultChannel.querySelector('.channel-name').textContent;
        const titleElement = document.querySelector('.channel-title h3');
        if (titleElement) {
            titleElement.textContent = channelName;
        }
    }
}

// Update unread message count for a channel
function updateUnreadCount(channelId) {
  // 此处简单实现，仅在当前未查看该频道时才更新未读消息数
  if (typeof activeChannelId !== 'undefined' && activeChannelId !== channelId) {
    // 查找频道元素
    const channelElement = getChannelById(channelId);
    if (!channelElement) return;
    
    // 查找或创建未读指示器
    let unreadBadge = channelElement.querySelector('.unread-badge');
    if (!unreadBadge) {
      unreadBadge = document.createElement('span');
      unreadBadge.className = 'unread-badge ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center';
      unreadBadge.setAttribute('data-count', '0');
      channelElement.appendChild(unreadBadge);
    }
    
    // 更新未读消息数
    const currentCount = parseInt(unreadBadge.getAttribute('data-count') || '0');
    const newCount = currentCount + 1;
    unreadBadge.setAttribute('data-count', newCount.toString());
    unreadBadge.textContent = newCount > 99 ? '99+' : newCount.toString();
    unreadBadge.classList.remove('hidden');
    
    // 如果有侧边栏，高亮频道
    try {
      channelElement.classList.add('has-unread');
    } catch (e) {
      console.error('无法更新频道未读状态:', e);
    }
  }
}

// 当切换频道时清除未读消息数
function clearUnreadCount(channelId) {
    const channel = document.querySelector(`.channel-item[data-channel-id="${channelId}"]`);
    if (channel) {
        const badge = channel.querySelector('.unread-badge');
        if (badge) {
            badge.style.display = 'none';
            badge.textContent = '0';
            badge.classList.remove('has-unread');
        }
    }
}

// 增加全局未读消息计数
function incrementUnreadCount() {
    // 如果窗口未激活，增加未读计数
    if (!document.hasFocus()) {
        // 更新全局未读消息计数
        let unreadCount = parseInt(localStorage.getItem('unreadMessages') || '0');
        unreadCount++;
        localStorage.setItem('unreadMessages', unreadCount.toString());
        
        // 更新标题中的未读计数
        updateTitleWithUnreadCount(unreadCount);
        
        // 播放通知声音
        playNotificationSound();
    }
}

// 在标题中更新未读消息计数
function updateTitleWithUnreadCount(count) {
    const originalTitle = document.title.replace(/^\(\d+\)\s+/, '');
    if (count > 0) {
        document.title = `(${count}) ${originalTitle}`;
    } else {
        document.title = originalTitle;
    }
}

// 播放通知声音
function playNotificationSound() {
    const notificationSound = document.getElementById('notificationSound');
    if (notificationSound) {
        notificationSound.volume = 0.5; // 设置音量为50%
        notificationSound.play().catch(error => {
            console.warn('播放通知声音失败:', error);
        });
    }
}

// 处理固定消息
window.handlePinMessage = function(messageId) {
  if (!activeChannelId) {
    showToast('Please select a channel first', 'warning');
    return;
  }
  
  // Check if the message has been fixed
  checkIfPinned(messageId)
    .then(isPinned => {
      if (isPinned) {
        // If fixed, cancel the pin
        unpinMessage(messageId);
      } else {
        // If not fixed, then the message is fixed
        pinMessage(messageId);
      }
    })
    .catch(error => {
      console.error('Error checking pin status:', error);
      showToast('Failed to check pin status', 'error');
    });
}

// 添加频道密钥同步功能
window.syncChannelKey = function() {
  if (!activeChannelId) {
    showToast('请先选择一个频道', 'warning');
    return;
  }

  if (typeof ChannelEncryption === 'undefined') {
    showToast('加密模块未加载，无法同步密钥', 'error');
    return;
  }
  
  // 确保ChannelEncryption已初始化
  if (typeof ChannelEncryption.ensureInitialized === 'function') {
    ChannelEncryption.ensureInitialized();
  }

  // 创建模态框
  const modalHtml = `
    <div id="keySyncModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-medium text-gray-900 dark:text-white">同步频道密钥</h3>
          <button onclick="document.getElementById('keySyncModal').remove()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="mb-5">
          <p class="text-gray-600 dark:text-gray-400 mb-3">选择操作类型：</p>
          <div class="flex space-x-3 mb-4">
            <button id="exportKeyBtn" class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              导出密钥
            </button>
            <button id="importKeyBtn" class="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
              导入密钥
            </button>
          </div>
        </div>
        
        <div id="exportKeySection" class="hidden mb-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">复制下面的密钥字符串发送给其他用户:</p>
          <div class="relative">
            <textarea id="exportedKeyText" readonly class="w-full h-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="加载中..."></textarea>
            <button id="copyKeyBtn" class="absolute right-2 top-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
              复制
            </button>
          </div>
        </div>
        
        <div id="importKeySection" class="hidden mb-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">粘贴密钥字符串:</p>
          <textarea id="importKeyText" class="w-full h-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="粘贴密钥字符串..."></textarea>
          <button id="confirmImportBtn" class="mt-3 w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
            确认导入
          </button>
        </div>
      </div>
    </div>
  `;

  // 添加模态框到文档
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = modalHtml;
  document.body.appendChild(tempDiv.firstElementChild);

  // 处理按钮点击事件
  document.getElementById('exportKeyBtn').addEventListener('click', async function() {
    document.getElementById('exportKeySection').classList.remove('hidden');
    document.getElementById('importKeySection').classList.add('hidden');
    
    try {
      // 导出密钥
      const keyString = await ChannelEncryption.forceSyncKeys(activeChannelId);
      if (keyString) {
        document.getElementById('exportedKeyText').value = keyString;
      } else {
        document.getElementById('exportedKeyText').value = '获取密钥失败，请检查控制台日志';
        showToast('获取密钥失败', 'error');
      }
    } catch (error) {
      console.error('导出密钥时出错:', error);
      document.getElementById('exportedKeyText').value = `导出失败: ${error.message}`;
      showToast('导出密钥失败: ' + error.message, 'error');
    }
  });

  document.getElementById('importKeyBtn').addEventListener('click', function() {
    document.getElementById('importKeySection').classList.remove('hidden');
    document.getElementById('exportKeySection').classList.add('hidden');
  });

  document.getElementById('copyKeyBtn').addEventListener('click', function() {
    const textarea = document.getElementById('exportedKeyText');
    textarea.select();
    document.execCommand('copy');
    this.textContent = '已复制!';
    setTimeout(() => { this.textContent = '复制'; }, 2000);
  });

  document.getElementById('confirmImportBtn').addEventListener('click', async function() {
    const keyString = document.getElementById('importKeyText').value.trim();
    if (!keyString) {
      showToast('请输入密钥字符串', 'warning');
      return;
    }
    
    try {
      // 导入密钥
      const success = await ChannelEncryption.forceSyncKeys(activeChannelId, keyString);
      if (success) {
        showToast('密钥导入成功', 'success');
        document.getElementById('keySyncModal').remove();
      } else {
        showToast('密钥导入失败', 'error');
      }
    } catch (error) {
      console.error('导入密钥时出错:', error);
      showToast('导入密钥失败: ' + error.message, 'error');
    }
  });
}

// 在页面加载完成后添加同步密钥按钮
document.addEventListener('DOMContentLoaded', function() {
  // 检查加密模块是否可用
  setTimeout(function() {
    if (typeof ChannelEncryption !== 'undefined') {
      // 查找或创建工具栏
      let toolbar = document.querySelector('.channel-header-actions');
      if (!toolbar) {
        const header = document.querySelector('.channel-header');
        if (header) {
          toolbar = document.createElement('div');
          toolbar.className = 'channel-header-actions flex items-center';
          header.appendChild(toolbar);
        }
      }
      
      if (toolbar) {
        // 添加同步密钥按钮
        const syncButton = document.createElement('button');
        syncButton.id = 'syncKeyButton';
        syncButton.className = 'ml-2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700';
        syncButton.title = '同步频道密钥';
        syncButton.innerHTML = `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
          </svg>
        `;
        syncButton.onclick = window.syncChannelKey;
        
        toolbar.appendChild(syncButton);
      }
    }
  }, 1000);
});