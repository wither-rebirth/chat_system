// 固定消息管理器
// 用于处理固定消息的显示和交互

// 解析固定消息数据
function parsePinnedMessage(messageData) {
  let messageContent = '';
  
  // 解析为对象
  const parsedMessage = JSON.parse(messageData);
  
  if (parsedMessage.file_url) {
    const fileData = {
      url: parsedMessage.file_url,
      name: parsedMessage.file_name || parsedMessage.file_url.split('/').pop(),
      size: parsedMessage.file_size || 0,
      type: parsedMessage.file_type || '',
      uploadDate: parsedMessage.timestamp
    };
    
    // 使用FilePreview组件
    if (window.FilePreview && window.FilePreview.create) {
      try {
        const filePreviewHtml = window.FilePreview.create(fileData);
        messageContent += `
          <div class="mt-3 file-attachment">
            ${filePreviewHtml}
          </div>
        `;
      } catch (error) {
        console.error('Error rendering file preview in pinned message:', error);
        messageContent += `
          <div class="mt-3 file-attachment">
            <a href="${parsedMessage.file_url}" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" download="${parsedMessage.file_name || ''}">
              <div class="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ${parsedMessage.file_name || parsedMessage.file_url.split('/').pop() || '文件下载'}
              </div>
            </a>
          </div>
        `;
      }
    } else {
      // 如果FilePreview组件不可用，则使用简单显示
      messageContent += `
        <div class="mt-3 file-attachment">
          <a href="${parsedMessage.file_url}" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" download="${parsedMessage.file_name || ''}">
            <div class="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ${parsedMessage.file_name || parsedMessage.file_url.split('/').pop() || '文件下载'}
            </div>
          </a>
        </div>
      `;
    }
  }
  
  // 处理文本内容
  if (parsedMessage.content) {
    messageContent += `
      <div class="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap break-words">
        ${parsedMessage.content}
      </div>
    `;
  }
  
  return messageContent;
}

// 加载固定消息
function loadPinnedMessages(channelId) {
  if (!channelId) {
    console.error('需要提供频道ID');
    return;
  }
  
  const pinnedMessagesPanel = document.getElementById('pinnedMessagesPanel');
  const pinnedContent = document.getElementById('pinnedMessagesContent');
  
  if (!pinnedMessagesPanel || !pinnedContent) {
    console.error('找不到固定消息面板元素');
    return;
  }
  
  // 显示加载状态
  pinnedContent.innerHTML = `
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  `;
  
  // 获取固定消息
  fetch(`/api/pinned_messages?channel_id=${channelId}`)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        if (data.messages && data.messages.length > 0) {
          // 有固定消息
          const messagesHTML = data.messages.map(msg => createPinnedMessageHTML(msg)).join('');
          pinnedContent.innerHTML = `<div class="space-y-4">${messagesHTML}</div>`;
          
          // 添加事件监听器
          addPinnedMessagesListeners();
        } else {
          // 没有固定消息
          pinnedContent.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-300 py-12">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p class="font-medium">暂无固定消息</p>
              <p class="text-sm mt-2 text-gray-400 dark:text-gray-500">
                重要的固定消息将显示在这里以方便参考。
              </p>
            </div>
          `;
        }
      } else {
        pinnedContent.innerHTML = `
          <div class="text-center text-red-500 py-8">
            <p>加载固定消息失败: ${data.message || '未知错误'}</p>
            <button class="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded" onclick="loadPinnedMessages('${channelId}')">
              重试
            </button>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('加载固定消息错误:', error);
      pinnedContent.innerHTML = `
        <div class="text-center text-red-500 py-8">
          <p>加载固定消息失败: ${error.message || '网络错误'}</p>
          <button class="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded" onclick="loadPinnedMessages('${channelId}')">
            重试
          </button>
        </div>
      `;
    });
}

// 创建固定消息HTML
function createPinnedMessageHTML(message) {
  // 格式化日期
  const date = new Date(message.timestamp);
  const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  
  // 创建消息内容
  let messageContent = '';
  
  // 处理文件附件
  if (message.file_url) {
    try {
      if (typeof parsePinnedMessage === 'function') {
        // 使用新的解析函数处理消息内容 
        messageContent = parsePinnedMessage(JSON.stringify(message));
      } else {
        // 兼容处理
        messageContent = basicPinnedMessageContent(message);
      }
    } catch (error) {
      console.error('处理固定消息内容出错:', error);
      messageContent = basicPinnedMessageContent(message);
    }
  } 
  // 处理普通文本消息
  else if (message.content) {
    messageContent = `
      <div class="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap break-words">
        ${message.content}
      </div>
    `;
  }
  
  return `
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm animate-bounce-in" data-message-id="${message.message_id}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold mr-2">
            ${message.username ? message.username[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div class="font-medium text-gray-800 dark:text-white">${message.username || '未知用户'}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${formattedDate}</div>
          </div>
        </div>
        <div>
          <button class="unpin-btn p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors" title="取消固定">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <button class="goto-message-btn p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ml-1" title="跳转到消息">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
      ${messageContent}
    </div>
  `;
}

// 基础固定消息内容（兼容处理）
function basicPinnedMessageContent(message) {
  if (message.file_url) {
    // 判断是否是图片
    const isImage = message.file_type && message.file_type.startsWith('image/');
    
    if (isImage) {
      return `
        <div class="mt-2 mb-2">
          <div class="relative group">
            <img src="${message.file_url}" alt="${message.file_name || '图片'}" class="max-h-60 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md" />
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button onclick="window.FilePreview && window.FilePreview.openImage('${message.file_url}', '${message.file_name || '图片'}')" class="p-2 bg-white rounded-full shadow-md text-gray-700 hover:text-blue-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">${message.file_name || '图片'}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">${message.content || ''}</div>
        </div>
      `;
    } else {
      return `
        <div class="mt-2 mb-2">
          <div class="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div class="text-3xl mr-3">📄</div>
            <div class="flex-grow">
              <div class="text-sm font-medium text-gray-900 dark:text-gray-200">${message.file_name || message.file_url.split('/').pop() || '文件'}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">${message.content || ''}</div>
            </div>
            <a href="${message.file_url}" download="${message.file_name || ''}" class="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        </div>
      `;
    }
  } else if (message.content) {
    return `
      <div class="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap break-words">
        ${message.content}
      </div>
    `;
  }
  
  return '';
}

// 添加固定消息事件监听器
function addPinnedMessagesListeners() {
  // 获取所有固定消息
  const pinnedMessages = document.querySelectorAll('#pinnedMessagesContent [data-message-id]');
  
  pinnedMessages.forEach(messageElement => {
    const messageId = messageElement.dataset.messageId;
    
    // 添加取消固定按钮事件
    const unpinBtn = messageElement.querySelector('.unpin-btn');
    if (unpinBtn) {
      unpinBtn.addEventListener('click', () => {
        // 添加淡出动画效果
        messageElement.classList.add('animate-fade-out');
        
        // 延迟执行取消固定操作
        setTimeout(() => {
          // 调用取消固定API
          if (typeof unpinMessage === 'function') {
            unpinMessage(messageId);
          } else if (window.unpinMessage) {
            window.unpinMessage(messageId);
          } else {
            console.error('unpinMessage函数不可用');
          }
        }, 300);
      });
    }
    
    // 添加跳转到消息按钮事件
    const gotoBtn = messageElement.querySelector('.goto-message-btn');
    if (gotoBtn) {
      gotoBtn.addEventListener('click', () => {
        // 关闭固定消息面板
        const pinnedMessagesPanel = document.getElementById('pinnedMessagesPanel');
        if (pinnedMessagesPanel) {
          pinnedMessagesPanel.classList.add('hidden');
        }
        
        // 跳转到消息位置
        scrollToMessage(messageId);
      });
    }
  });
}

// 滚动到消息位置
function scrollToMessage(messageId) {
  if (!messageId) return;
  
  // 查找消息元素
  const messageElement = document.querySelector(`.message-bubble[data-message-id="${messageId}"]`);
  if (messageElement) {
    // 滚动到消息位置
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 高亮显示消息
    messageElement.classList.add('highlight-message');
    setTimeout(() => {
      messageElement.classList.remove('highlight-message');
    }, 2000);
  } else {
    console.log('Message not in current view, may need to load history first');
  }
}

// 添加必要的CSS样式
function addPinnedMessagesStyles() {
  if (!document.getElementById('pinned-messages-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'pinned-messages-styles';
    styleEl.textContent = `
      @keyframes bounceIn {
        0% { transform: scale(0.9); opacity: 0; }
        70% { transform: scale(1.05); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      
      @keyframes fadeOut {
        0% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
      
      .animate-bounce-in {
        animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
      
      .animate-fade-out {
        animation: fadeOut 0.3s ease-out forwards;
      }
      
      .highlight-message {
        animation: highlight 2s ease-out;
      }
      
      @keyframes highlight {
        0% { background-color: rgba(59, 130, 246, 0.2); }
        100% { background-color: transparent; }
      }
    `;
    document.head.appendChild(styleEl);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 添加样式
  addPinnedMessagesStyles();
  
  // 注册固定消息按钮点击事件
  const togglePinnedBtn = document.getElementById('togglePinned');
  if (togglePinnedBtn) {
    togglePinnedBtn.addEventListener('click', function() {
      const pinnedMessagesPanel = document.getElementById('pinnedMessagesPanel');
      if (!pinnedMessagesPanel) return;
      
      const isHidden = pinnedMessagesPanel.classList.contains('hidden');
      
      if (isHidden) {
        // 显示面板
        pinnedMessagesPanel.classList.remove('hidden');
        // 加载固定消息
        if (window.activeChannelId) {
          loadPinnedMessages(window.activeChannelId);
        } else {
          console.warn('未找到活跃频道ID');
        }
      } else {
        // 隐藏面板
        pinnedMessagesPanel.classList.add('hidden');
      }
    });
    console.log('Pinned message button click event registered');
  } else {
    console.warn('未找到固定消息按钮');
  }
  
  // 暴露必要的函数到全局
  window.loadPinnedMessages = loadPinnedMessages;
  window.parsePinnedMessage = parsePinnedMessage;
}); 