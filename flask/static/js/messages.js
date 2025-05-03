// 格式化文件大小显示
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

// 消息历史记录管理
const messageHistory = {
  history: [],
  currentIndex: -1,
  maxSize: 50,
  
  // 添加消息到历史记录
  add(message) {
    // 避免空消息或重复消息
    if (!message || (this.history.length > 0 && this.history[0] === message)) {
      return;
    }
    
    // 添加到历史记录开头
    this.history.unshift(message);
    
    // 限制历史记录大小
    if (this.history.length > this.maxSize) {
      this.history.pop();
    }
    
    // 重置当前索引
    this.currentIndex = -1;
  },
  
  // 获取上一条历史记录
  getPrevious() {
    if (this.history.length === 0) return '';
    
    this.currentIndex = Math.min(this.currentIndex + 1, this.history.length - 1);
    return this.history[this.currentIndex];
  },
  
  // 获取下一条历史记录
  getNext() {
    if (this.history.length === 0 || this.currentIndex <= 0) {
      this.currentIndex = -1;
      return '';
    }
    
    this.currentIndex--;
    return this.history[this.currentIndex];
  }
};

// 添加消息到历史记录
function addToMessageHistory(message) {
  messageHistory.add(message);
}

// 消息输入和发送功能
function initMessageInput() {
  const messageInput = document.getElementById('messageInput');
  const filePreviewContainer = document.getElementById('filePreviewContainer');
  const filePreview = document.getElementById('filePreview');
  const fileInput = document.getElementById('fileInput');
  const emojiPicker = document.getElementById('emojiPicker');
  let selectedFile = null;
  
  // 初始化表情选择器
  initEmojiPicker();
  
  // 使输入框可以根据内容自动调整高度
  if (messageInput) {
    messageInput.addEventListener('input', function() {
      // 重置高度避免滚动条出现
      this.style.height = 'auto';
      // 设置新高度
      const newHeight = Math.min(this.scrollHeight, 32 * parseFloat(getComputedStyle(document.body).fontSize));
      this.style.height = newHeight + 'px';
    });
    
    // 添加上下键浏览历史记录功能
    messageInput.addEventListener('keydown', function(e) {
      // 处理上下键
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // 仅当输入框为空或已经在开始/结束位置时才查看历史
        const isAtStart = this.selectionStart === 0;
        const isAtEnd = this.selectionEnd === this.value.length;
        
        if ((e.key === 'ArrowUp' && (this.value === '' || isAtStart)) || 
            (e.key === 'ArrowDown' && (this.value === '' || isAtEnd))) {
          e.preventDefault();
          
          // 获取历史记录
          const historyMessage = e.key === 'ArrowUp' ? 
            messageHistory.getPrevious() : 
            messageHistory.getNext();
          
          // 设置输入值
          this.value = historyMessage;
          
          // 将光标移到末尾
          setTimeout(() => {
            this.selectionStart = this.selectionEnd = this.value.length;
          }, 0);
          
          // 触发input事件以调整高度
          this.dispatchEvent(new Event('input'));
        }
      }
    });
  }
  
  // 发送消息
  document.getElementById("sendButton")?.addEventListener("click", sendMessage);
  messageInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    // 检查当前是否有有效的频道ID
    if (!activeChannelId) {
      showToast('Please select a channel first', 'warning');
      return;
    }
    
    // 如果文本为空且没有选择文件，则不发送
    if (!content && !selectedFile) {
      return;
    }
    
    // 如果有选择文件，则上传文件
    if (selectedFile) {
      uploadFile(selectedFile, content);
      resetFileInput();
      messageInput.value = '';
      return;
    }
    
    // 添加到历史记录
    addToMessageHistory(content);
    
    // 处理消息加密
    (async function() {
      let messageContent = content;
      let isEncrypted = false;
      
      // 检查频道是否启用了加密
      if (typeof ChannelEncryption !== 'undefined') {
        // 如果频道启用了加密，或者没有明确禁用加密（默认所有频道都加密）
        if (ChannelEncryption.isChannelEncrypted && 
            (ChannelEncryption.isChannelEncrypted(activeChannelId) || 
            !ChannelEncryption.isChannelExplicitlyDisabled || 
            !ChannelEncryption.isChannelExplicitlyDisabled(activeChannelId))) {
          try {
            // 确保加密器初始化
            await ChannelEncryption.ensureInitialized();
            
            // 如果频道没有密钥，生成一个
            if (!ChannelEncryption.channelKeys[activeChannelId]) {
              await ChannelEncryption.generateChannelKey(activeChannelId);
              // 添加到已启用加密的频道集合
              if (!ChannelEncryption.isChannelEncrypted(activeChannelId)) {
                ChannelEncryption.enabledChannels.add(activeChannelId.toString());
                ChannelEncryption.saveEnabledChannels();
              }
            }
            
            // 对消息进行加密
            console.log('频道已启用加密或未明确禁用加密，正在加密消息...');
            messageContent = await ChannelEncryption.encryptMessage(activeChannelId, content);
            isEncrypted = true;
            console.log('消息已加密');
          } catch (error) {
            console.error('加密消息失败:', error);
            showToast('消息加密失败，将以明文方式发送', 'warning');
            // 如果加密失败，继续以明文发送
            messageContent = content;
          }
        }
      }
      
      // 准备消息数据
      const messageData = {
        channel_id: activeChannelId,
        content: messageContent,
        message_type: 'text', // 默认为文本消息
        encrypted: isEncrypted  // 标记消息是否加密
      };
      
      console.log('Sending message:', messageData);
      
      // 发送Socket.IO消息
      socket.emit('send_message', messageData, function(response) {
        console.log('Server confirmed message delivery:', response);
        
        // 检查消息中是否包含@提及
        const mentionMatches = content.match(/@(\w+)/g);
        console.log('Detected mentions:', mentionMatches);
        
        // 无论是否有提及，都创建一个临时消息对象
        let sentMessageId = response && response.message_id ? response.message_id : Date.now().toString();
        
        // 创建临时消息对象，以便提及管理器处理
        const sentMessage = {
          id: sentMessageId,
          message_id: sentMessageId, // 兼容两种格式
          channel_id: activeChannelId,
          content: content,  // 使用原始内容，而不是加密后的内容
          user: {
            id: currentUserId,
            username: currentUsername
          },
          original_encrypted: isEncrypted  // 标记原始消息是否加密
        };
        
        console.log('Created message object:', sentMessage);
        
        // 直接调用checkForMentions函数处理提及
        if (typeof window.checkForMentions === 'function') {
          window.checkForMentions(sentMessage);
        }
        
        // 派发多种消息发送事件，确保能被捕获
        const eventTypes = ['messageSent', 'messageCreated', 'newMessage'];
        eventTypes.forEach(eventType => {
          console.log(`Triggering ${eventType} event`);
          document.dispatchEvent(new CustomEvent(eventType, {
            detail: {
              message: sentMessage,
              mentions: mentionMatches
            }
          }));
        });
      });
      
      // 清空输入框
      messageInput.value = '';
      messageInput.style.height = 'auto';
    })();
  }
  
  // 调整文件预览的位置
  function adjustFilePreviewPosition() {
    if (!filePreviewContainer) return;
    
    // 获取messageForm的位置信息
    const messageForm = document.getElementById('messageForm');
    if (!messageForm) return;
    
    const formRect = messageForm.getBoundingClientRect();
    
    // 重置之前的所有位置设置
    filePreviewContainer.style.bottom = '';
    filePreviewContainer.style.top = '';
    filePreviewContainer.style.left = '';
    filePreviewContainer.style.right = '';
    filePreviewContainer.style.marginBottom = '';
    filePreviewContainer.style.marginTop = '';
    filePreviewContainer.style.position = 'absolute';
    
    // 设置在输入框正上方
    filePreviewContainer.style.bottom = '100%';  // 设置底部对齐输入框顶部
    filePreviewContainer.style.left = '50%';     // 水平居中
    filePreviewContainer.style.transform = 'translateX(-50%)'; // 修正居中偏移
    filePreviewContainer.style.marginBottom = '10px'; // 与输入框保持一定距离
    
    // 确保预览容器不会超出可视区域顶部
    const containerRect = filePreviewContainer.getBoundingClientRect();
    if (containerRect.top < 10) {
      // 如果顶部超出可视区域，调整位置到form下方
      filePreviewContainer.style.bottom = 'auto';
      filePreviewContainer.style.top = '100%';
      filePreviewContainer.style.marginBottom = '0';
      filePreviewContainer.style.marginTop = '10px';
    }
    
    console.log('File preview position adjusted');
  }
  
  // 将函数导出到全局作用域
  window.adjustFilePreviewPosition = adjustFilePreviewPosition;
  
  // 添加窗口大小变化时调整文件预览位置
  window.addEventListener('resize', function() {
    if (filePreviewContainer && !filePreviewContainer.classList.contains('hidden')) {
      adjustFilePreviewPosition();
    }
  });
}

// 表情选择器功能
function initEmojiPicker() {
  const emojiButton = document.getElementById('emojiButton');
  const emojiPicker = document.getElementById('emojiPicker');
  const messageInput = document.getElementById('messageInput');
  
  // 定义关闭表情选择器函数在外部作用域
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
    
    // 检查是否已设置事件监听器
    if (!emojiButton.getAttribute('data-event-attached')) {
      emojiButton.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        emojiPicker.classList.toggle('hidden');
        console.log('Emoji button clicked, emoji picker state:', !emojiPicker.classList.contains('hidden') ? 'visible' : 'hidden');
        
        // 如果显示，添加动画效果
        if (!emojiPicker.classList.contains('hidden')) {
          setTimeout(() => {
            emojiPicker.classList.remove('scale-95', 'opacity-0');
            emojiPicker.classList.add('scale-100', 'opacity-100');
          }, 10);
        } else {
          // 隐藏时添加动画
          emojiPicker.classList.add('scale-95', 'opacity-0');
          setTimeout(() => {
            if (emojiPicker.classList.contains('scale-95')) { // 确认仍处于隐藏动画中
              emojiPicker.classList.add('hidden');
            }
          }, 200);
        }
      });
      emojiButton.setAttribute('data-event-attached', 'true');
    }
    
    // 添加关闭按钮功能
    const closeBtn = document.getElementById('closeEmojiPicker');
    if (closeBtn && !closeBtn.getAttribute('data-event-attached')) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        closeEmojiPicker();
      });
      closeBtn.setAttribute('data-event-attached', 'true');
    }
    
    // 添加搜索按钮功能
    const searchBtn = document.getElementById('searchEmojiBtn');
    if (searchBtn && !searchBtn.getAttribute('data-event-attached')) {
      searchBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
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
    
    // 添加分类按钮功能
    document.querySelectorAll('.emoji-category-btn').forEach(btn => {
      if (!btn.getAttribute('data-event-attached')) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // 阻止事件冒泡
          // 移除所有分类按钮的激活状态
          document.querySelectorAll('.emoji-category-btn').forEach(el => {
            el.classList.remove('text-blue-600', 'bg-blue-50', 'border-b-2', 'border-blue-600',
                            'dark:text-blue-400', 'dark:bg-blue-900/20', 'dark:border-blue-400');
            el.classList.add('text-gray-500', 'hover:text-gray-700', 'dark:text-gray-400', 'dark:hover:text-gray-200');
          });
          
          // 激活当前点击的分类按钮
          btn.classList.remove('text-gray-500', 'hover:text-gray-700', 'dark:text-gray-400', 'dark:hover:text-gray-200');
          btn.classList.add('text-blue-600', 'bg-blue-50', 'border-b-2', 'border-blue-600',
                          'dark:text-blue-400', 'dark:bg-blue-900/20', 'dark:border-blue-400');
        });
        btn.setAttribute('data-event-attached', 'true');
      }
    });
    
    // 点击外部关闭表情选择器
    if (!document.body.getAttribute('data-emoji-close-attached')) {
      document.addEventListener('click', (e) => {
        if (emojiPicker && !emojiPicker.classList.contains('hidden') && 
            !emojiPicker.contains(e.target) && e.target !== emojiButton) {
          closeEmojiPicker();
        }
      });
      document.body.setAttribute('data-emoji-close-attached', 'true');
    }
    
    // 为所有表情按钮添加点击事件
    document.querySelectorAll('.emoji-btn').forEach(btn => {
      if (!btn.getAttribute('data-event-attached')) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // 阻止事件冒泡
          e.preventDefault(); // 防止表单提交
          
          const emoji = e.target.textContent;
          console.log('Clicked emoji, preparing to insert:', emoji);
          
          // 获取消息输入框
          const messageInput = document.getElementById('messageInput');
          if (!messageInput) {
            console.error('Unable to find message input box');
            return;
          }
          
          // 将表情插入到光标位置
          const cursorPos = messageInput.selectionStart;
          const value = messageInput.value;
          messageInput.value = 
            value.substring(0, cursorPos) + 
            emoji + 
            value.substring(messageInput.selectionEnd);
          
          // 将光标移动到表情后面
          const newPosition = cursorPos + emoji.length;
          messageInput.selectionStart = newPosition;
          messageInput.selectionEnd = newPosition;
          messageInput.focus();
          
          // 触发input事件以调整输入框高度
          messageInput.dispatchEvent(new Event('input'));
          
          // 关闭表情选择器
          closeEmojiPicker();
          
          console.log('Emoji inserted into input box, new content:', messageInput.value);
        });
        btn.setAttribute('data-event-attached', 'true');
      }
    });
  } else {
    console.error('Emoji picker initialization failed: missing necessary elements', {
      emojiButton: !!emojiButton,
      emojiPicker: !!emojiPicker,
      messageInput: !!messageInput
    });
  }
}

// 在文档加载完成后初始化表情选择器
document.addEventListener('DOMContentLoaded', function() {
  // 初始化消息输入功能
  initMessageInput();
  
  // 初始化表情选择器
  initEmojiPicker();
  
  // 设置动态观察DOM，确保在界面变化时重新绑定事件
  const observer = new MutationObserver(function(mutations) {
    // 检查表情选择器是否在DOM中但没有绑定事件
    const emojiButtons = document.querySelectorAll('.emoji-btn:not([data-event-attached])');
    if (emojiButtons.length > 0) {
      console.log('Detected unbound emoji button, reinitializing emoji picker');
      initEmojiPicker();
    }
  });
  
  // 观察整个文档的变化
  observer.observe(document.body, { childList: true, subtree: true });
}); 