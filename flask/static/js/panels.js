// 侧边面板和下拉菜单功能
function initPanels() {
  const mentionsPanel = document.getElementById("mentionsPanel");
  const savedPanel = document.getElementById("savedPanel");
  const pinnedPanel = document.getElementById("pinnedPanel");
  const allUsersModal = document.getElementById("allUsersModal");
  const helpDropdown = document.getElementById('helpDropdown');
  const helpButton = document.getElementById('helpButton');
  const onlineUsersDropdown = document.getElementById('onlineUsersDropdown');
  const toggleOnlineUsers = document.getElementById('toggleOnlineUsers');
  const emojiPicker = document.getElementById("emojiPicker");
  const channelDescription = document.getElementById('channelDescription');
  const editDescriptionModal = document.getElementById('editDescriptionModal');
  
  // 全局点击处理，用于关闭打开的面板和弹窗
  document.addEventListener('click', function(e) {
    // 帮助下拉菜单
    if (helpDropdown && helpButton && !helpButton.contains(e.target) && !helpDropdown.contains(e.target)) {
      helpDropdown.classList.remove('opacity-100', 'visible');
      helpDropdown.classList.add('opacity-0', 'invisible');
    }
    
    // 在线用户下拉菜单
    if (onlineUsersDropdown && toggleOnlineUsers && !toggleOnlineUsers.contains(e.target) && !onlineUsersDropdown.contains(e.target)) {
      onlineUsersDropdown.classList.remove('opacity-100', 'visible');
      onlineUsersDropdown.classList.add('opacity-0', 'invisible');
    }
    
    // 表情选择器
    if (emojiPicker && !emojiPicker.contains(e.target) && e.target.id !== "emojiButton") {
      closeEmojiPicker();
    }
    
    // 处理侧边面板关闭 - 点击消息区域或其他空白区域时关闭
    const mainContent = document.querySelector('.flex-1.overflow-y-auto.bg-gray-100');
    const toggleMentionsBtn = document.getElementById("toggleMentions");
    const toggleSavedBtn = document.getElementById("toggleSaved");
    const togglePinnedBtn = document.getElementById("togglePinned");
    
    // 确保点击的不是面板本身或相关按钮
    if (mainContent && mainContent.contains(e.target) && 
        (!toggleMentionsBtn || !toggleMentionsBtn.contains(e.target)) &&
        (!toggleSavedBtn || !toggleSavedBtn.contains(e.target)) &&
        (!togglePinnedBtn || !togglePinnedBtn.contains(e.target))) {
      
      // 检查是否有面板处于打开状态
      if (pinnedPanel && !pinnedPanel.classList.contains("translate-x-full")) {
        window.closePanel("pinnedPanel");
      }
      
      if (mentionsPanel && !mentionsPanel.classList.contains("translate-x-full")) {
        window.closePanel("mentionsPanel");
      }
      
      if (savedPanel && !savedPanel.classList.contains("translate-x-full")) {
        window.closePanel("savedPanel");
      }
    }
    
    // 关闭角色选项下拉菜单
    if (roleOptionsVisible) {
      hideRoleOptions();
    }
  });
  
  // 切换提及面板
  document.getElementById("toggleMentions")?.addEventListener("click", (e) => {
    e.stopPropagation();
    
    // 检查是否有其他面板已经打开
    const hasPinnedOpen = pinnedPanel && !pinnedPanel.classList.contains("translate-x-full");
    const hasSavedOpen = savedPanel && !savedPanel.classList.contains("translate-x-full");
    
    // 如果有其他面板打开，先隐藏它但不执行动画
    if (hasPinnedOpen) {
      pinnedPanel.style.transition = "none";
      pinnedPanel.classList.add("translate-x-full");
      // 强制重绘
      void pinnedPanel.offsetWidth;
      pinnedPanel.style.transition = "";
    }
    
    if (hasSavedOpen) {
      savedPanel.style.transition = "none";
      savedPanel.classList.add("translate-x-full");
      // 强制重绘
      void savedPanel.offsetWidth;
      savedPanel.style.transition = "";
    }
    
    // 打开当前面板
    window.openPanel("mentionsPanel");
  });
  
  // 切换保存面板
  document.getElementById("toggleSaved")?.addEventListener("click", (e) => {
    e.stopPropagation();
    
    // 检查是否有其他面板已经打开
    const hasPinnedOpen = pinnedPanel && !pinnedPanel.classList.contains("translate-x-full");
    const hasMentionsOpen = mentionsPanel && !mentionsPanel.classList.contains("translate-x-full");
    
    // 如果有其他面板打开，先隐藏它但不执行动画
    if (hasPinnedOpen) {
      pinnedPanel.style.transition = "none";
      pinnedPanel.classList.add("translate-x-full");
      // 强制重绘
      void pinnedPanel.offsetWidth;
      pinnedPanel.style.transition = "";
    }
    
    if (hasMentionsOpen) {
      mentionsPanel.style.transition = "none";
      mentionsPanel.classList.add("translate-x-full");
      // 强制重绘
      void mentionsPanel.offsetWidth;
      mentionsPanel.style.transition = "";
    }
    
    // 打开当前面板
    window.openPanel("savedPanel");
  });
  
  // 切换置顶面板
  document.getElementById("togglePinned")?.addEventListener("click", (e) => {
    e.stopPropagation();
    
    // 检查是否有其他面板已经打开
    const hasSavedOpen = savedPanel && !savedPanel.classList.contains("translate-x-full");
    const hasMentionsOpen = mentionsPanel && !mentionsPanel.classList.contains("translate-x-full");
    
    // 如果有其他面板打开，先隐藏它但不执行动画
    if (hasSavedOpen) {
      savedPanel.style.transition = "none";
      savedPanel.classList.add("translate-x-full");
      // 强制重绘
      void savedPanel.offsetWidth;
      savedPanel.style.transition = "";
    }
    
    if (hasMentionsOpen) {
      mentionsPanel.style.transition = "none";
      mentionsPanel.classList.add("translate-x-full");
      // 强制重绘
      void mentionsPanel.offsetWidth;
      mentionsPanel.style.transition = "";
    }
    
    // 打开当前面板
    window.openPanel("pinnedPanel");
  });
  
  // 切换在线用户下拉菜单
  document.getElementById('toggleOnlineUsers')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('onlineUsersDropdown');
    if (dropdown.classList.contains('opacity-0')) {
      dropdown.classList.remove('opacity-0', 'invisible');
      dropdown.classList.add('opacity-100', 'visible');
    } else {
      dropdown.classList.remove('opacity-100', 'visible');
      dropdown.classList.add('opacity-0', 'invisible');
    }
  });
  
  // 帮助按钮点击事件
  document.getElementById("helpButton")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const helpDropdown = document.getElementById('helpDropdown');
    if (helpDropdown.classList.contains('opacity-0')) {
      helpDropdown.classList.remove('opacity-0', 'invisible');
      helpDropdown.classList.add('opacity-100', 'visible');
    } else {
      helpDropdown.classList.remove('opacity-100', 'visible');
      helpDropdown.classList.add('opacity-0', 'invisible');
    }
  });
  
  // 打开和关闭所有用户弹窗
  document.getElementById("viewAllUsersBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    allUsersModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden"); // 防止背景滚动
  });
  
  // 点击弹窗背景关闭弹窗
  allUsersModal?.addEventListener("click", (e) => {
    if (e.target === allUsersModal) {
      window.closeAllUsersModal();
    }
  });
  
  // 增加复制链接功能
  const copyLinkBtn = document.querySelector('.px-4.py-2.bg-blue-600.text-white');
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      const linkInput = document.querySelector('input[readonly]');
      linkInput.select();
      document.execCommand('copy');
      
      // 显示复制成功的提示
      const originalText = copyLinkBtn.textContent;
      copyLinkBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyLinkBtn.textContent = originalText;
      }, 2000);
    });
  }
  
  // 频道描述编辑功能
  if (channelDescription && editDescriptionModal) {
    // 点击描述文本打开模态框
    channelDescription.addEventListener('click', () => {
      // 获取当前描述文本
      const currentText = channelDescription.querySelector('span').textContent;
      // 设置输入框的值为当前文本
      const modalDescriptionInput = document.getElementById('modalDescriptionInput');
      modalDescriptionInput.value = currentText === 'Add a channel description' ? '' : currentText;
      
      // 显示模态框
      editDescriptionModal.classList.remove('invisible', 'opacity-0');
      document.body.classList.add('overflow-hidden');
      
      // 触发内容动画
      const modalContent = editDescriptionModal.querySelector('.bg-white');
      if (modalContent) {
        requestAnimationFrame(() => {
          modalContent.classList.remove('scale-95', 'opacity-0');
        });
      }
      
      // 聚焦输入框
      setTimeout(() => {
        modalDescriptionInput.focus();
      }, 100);
    });
  }
  
  // 添加全局监听器，用于检测和清理模态框背景
  initModalCleanupHandlers();
}

// 辅助函数：清理所有背景遮罩
function cleanupBackdrops() {
  try {
    // 查找所有背景遮罩并移除
    const allBackdrops = document.querySelectorAll('.fixed.inset-0.bg-black, .fixed.inset-0.bg-black\\\/60, .bg-black\\/60');
    allBackdrops.forEach(backdrop => {
      if (backdrop.id === 'resourceModalBackdrop' || backdrop.id === 'channelModalBackdrop') {
        try {
          document.body.removeChild(backdrop);
        } catch (e) {
          backdrop.style.display = 'none';
        }
      }
    });
    
    // 清理带有z-40类的遮罩
    const backdropZ40 = document.querySelectorAll('.fixed.inset-0.z-40');
    backdropZ40.forEach(backdrop => {
      if (backdrop.id === 'resourceModalBackdrop' || backdrop.id === 'channelModalBackdrop') {
        try {
          document.body.removeChild(backdrop);
        } catch (e) {
          backdrop.style.display = 'none';
        }
      }
    });
    
    // 移除body上的溢出隐藏类，防止页面无法滚动
    if (!document.querySelector('#resourceManagementModal:not(.invisible), #channelManagementModal:not(.invisible)')) {
      document.body.classList.remove('overflow-hidden');
    }
  } catch (e) {
    console.error('清理背景时出错:', e);
  }
}

// 初始化模态框背景清理处理器
function initModalCleanupHandlers() {
  console.log('初始化模态框背景清理处理器');
  
  // 页面加载时检查并清理可能存在的背景
  setTimeout(cleanupBackdrops, 1000);
  
  // 添加全局ESC键关闭事件处理
  document.addEventListener('keydown', function globalEscHandler(e) {
    if (e.key === 'Escape') {
      // 检查是否有可见的资源或频道管理模态框
      const resourceModal = document.getElementById('resourceManagementModal');
      const channelModal = document.getElementById('channelManagementModal');
      
      if (resourceModal && !resourceModal.classList.contains('invisible')) {
        closeResourceManagementModal();
      } else if (channelModal && !channelModal.classList.contains('invisible')) {
        closeChannelManagementModal();
      } else {
        // 尝试清理任何可能的背景
        cleanupBackdrops();
      }
    }
  });
}

// 确保在文档加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 初始化UI元素
  initPanels();
  
  // 初始化频道点击事件
  initChannelSelection();
  
  // 初始化其他UI功能
  // ...其他初始化代码
  
  // 初始化通道展开自动维护功能
  initChannelExpandFix();
});

// 初始化频道选择
function initChannelSelection() {
  // 获取所有频道项
  const channelItems = document.querySelectorAll('.channel-item');
  
  channelItems.forEach(item => {
    // 跳过已经有data-user-id属性的项（这些是私聊用户项）
    if (item.hasAttribute('data-user-id')) {
      return;
    }
    
    item.addEventListener('click', function() {
      // 移除其他项目的active类
      channelItems.forEach(i => {
        // 同样跳过私聊用户项
        if (!i.hasAttribute('data-user-id')) {
          i.classList.remove('active', 'bg-white/10');
        }
      });
      
      // 添加active类到当前点击的频道
      this.classList.add('active');
      
      // 获取频道信息
      const channelId = this.dataset.channelId;
      
      // 获取频道名称元素，并检查它是否存在
      const nameElement = this.querySelector('span:last-child');
      let channelName = "Channel";
      
      // 安全地获取频道名称
      if (nameElement) {
        channelName = nameElement.textContent.trim();
      } else {
        console.warn("无法找到频道名称元素");
      }
      
      // 更新主区域的频道名称
      const headerTitle = document.querySelector('h1.font-semibold.text-lg');
      if (headerTitle) {
        headerTitle.textContent = channelName;
      }
      
      // 这里可以添加加载频道消息的逻辑
      // loadChannelMessages(channelId);
    });
  });
  
  // 默认选中第一个频道
  const firstChannel = document.querySelector('.channel-item:not([data-user-id])');
  if (firstChannel) {
    firstChannel.classList.add('active');
    
    // 获取并设置默认频道的名称到标题
    const nameElement = firstChannel.querySelector('span:last-child');
    let channelName = "Channel";
    
    if (nameElement) {
      channelName = nameElement.textContent.trim();
      const headerTitle = document.querySelector('h1.font-semibold.text-lg');
      if (headerTitle) {
        headerTitle.textContent = channelName;
      }
    } else {
      console.warn("无法找到默认频道的名称元素");
    }
  }
}

// 关闭表情选择器
function closeEmojiPicker() {
  const emojiPicker = document.getElementById("emojiPicker");
  if (emojiPicker) {
    emojiPicker.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
      emojiPicker.classList.add("hidden");
    }, 200);
  }
}

// 频道菜单相关
document.addEventListener('DOMContentLoaded', function() {
  const channelMenuBtn = document.getElementById('channelMenuBtn');
  const channelMenuDropdown = document.getElementById('channelMenuDropdown');
  let isChannelMenuOpen = false;

  // 切换频道菜单
  channelMenuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    isChannelMenuOpen = !isChannelMenuOpen;
    
    // 更新aria-expanded属性以增强可访问性
    channelMenuBtn.setAttribute('aria-expanded', isChannelMenuOpen);
    
    if (isChannelMenuOpen) {
      // 显示菜单并调整位置
      const btnRect = channelMenuBtn.getBoundingClientRect();
      channelMenuDropdown.style.top = (btnRect.bottom + window.scrollY) + 'px';
      channelMenuDropdown.style.left = (btnRect.left + window.scrollX - (channelMenuDropdown.offsetWidth / 2) + (btnRect.width / 2)) + 'px';
      
      // 使用新的动画类，而不是直接设置transform属性
      channelMenuBtn.classList.remove('channelMenuBtn-rotate-up');
      channelMenuBtn.classList.add('channelMenuBtn-rotate-down');
      
      requestAnimationFrame(() => {
        channelMenuDropdown.classList.add('visible');
      });
    } else {
      // 隐藏菜单
      channelMenuDropdown.classList.remove('visible');
      
      // 使用新的动画类，而不是直接设置transform属性
      channelMenuBtn.classList.remove('channelMenuBtn-rotate-down');
      channelMenuBtn.classList.add('channelMenuBtn-rotate-up');
    }
  });

  // 点击其他地方关闭菜单
  document.addEventListener('click', function(e) {
    if (!channelMenuDropdown.contains(e.target) && !channelMenuBtn.contains(e.target)) {
      if (isChannelMenuOpen) {
        isChannelMenuOpen = false;
        channelMenuDropdown.classList.remove('visible');
        
        // 更新aria-expanded属性
        channelMenuBtn.setAttribute('aria-expanded', false);
        
        // 使用新的动画类，而不是直接设置transform属性
        channelMenuBtn.classList.remove('channelMenuBtn-rotate-down');
        channelMenuBtn.classList.add('channelMenuBtn-rotate-up');
      }
    }
  });

  // 监听窗口滚动和调整大小事件，更新菜单位置
  function updateMenuPosition() {
    if (isChannelMenuOpen) {
      const btnRect = channelMenuBtn.getBoundingClientRect();
      channelMenuDropdown.style.top = (btnRect.bottom + window.scrollY) + 'px';
      channelMenuDropdown.style.left = (btnRect.left + window.scrollX - (channelMenuDropdown.offsetWidth / 2) + (btnRect.width / 2)) + 'px';
    }
  }

  window.addEventListener('scroll', updateMenuPosition);
  window.addEventListener('resize', updateMenuPosition);

  // 资源管理
  const resourceManagementBtn = channelMenuDropdown.querySelector('button:nth-child(1)');
  resourceManagementBtn.addEventListener('click', function() {
    // 关闭频道菜单
    isChannelMenuOpen = false;
    channelMenuDropdown.classList.remove('visible');
    
    // 更新aria-expanded属性
    channelMenuBtn.setAttribute('aria-expanded', false);
    
    // 使用新的动画类，而不是直接设置transform属性
    channelMenuBtn.classList.remove('channelMenuBtn-rotate-down');
    channelMenuBtn.classList.add('channelMenuBtn-rotate-up');
    
    // 打开资源管理模态框
    openResourceManagementModal();
  });

  // 邀请成员
  const inviteMembersBtn = channelMenuDropdown.querySelector('button:nth-child(2)');
  inviteMembersBtn.addEventListener('click', function() {
    // 关闭频道菜单
    isChannelMenuOpen = false;
    channelMenuDropdown.classList.remove('visible');
    
    // 更新aria-expanded属性
    channelMenuBtn.setAttribute('aria-expanded', false);
    
    // 使用新的动画类，而不是直接设置transform属性
    channelMenuBtn.classList.remove('channelMenuBtn-rotate-down');
    channelMenuBtn.classList.add('channelMenuBtn-rotate-up');
    
    const modal = document.getElementById('inviteMembersModal');
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });

  // 设置标题
  const setHeaderBtn = channelMenuDropdown.querySelector('button:nth-child(3)');
  setHeaderBtn.addEventListener('click', function() {
    // 关闭频道菜单
    isChannelMenuOpen = false;
    channelMenuDropdown.classList.remove('visible');
    
    // 更新aria-expanded属性
    channelMenuBtn.setAttribute('aria-expanded', false);
    
    // 使用新的动画类，而不是直接设置transform属性
    channelMenuBtn.classList.remove('channelMenuBtn-rotate-down');
    channelMenuBtn.classList.add('channelMenuBtn-rotate-up');
    
    const modal = document.getElementById('setHeaderModal');
    const channelNameInput = document.getElementById('channelNameInput');
    const currentChannelName = document.querySelector('h1.font-semibold.text-lg').textContent;
    
    channelNameInput.value = currentChannelName;
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // 聚焦输入框
    setTimeout(() => {
      channelNameInput.focus();
    }, 100);
  });

  // 频道管理
  const channelManagementBtn = channelMenuDropdown.querySelector('button:nth-child(4)');
  channelManagementBtn.addEventListener('click', function() {
    // 关闭频道菜单
    isChannelMenuOpen = false;
    channelMenuDropdown.classList.remove('visible');
    
    // 更新aria-expanded属性
    channelMenuBtn.setAttribute('aria-expanded', false);
    
    // 使用新的动画类，而不是直接设置transform属性
    channelMenuBtn.classList.remove('channelMenuBtn-rotate-down');
    channelMenuBtn.classList.add('channelMenuBtn-rotate-up');
    
    // 打开频道管理模态框
    openChannelManagementModal();
  });
});

// 邀请成员相关功能
window.copyInviteLink = function() {
  const linkInput = document.querySelector('#inviteMembersModal input[readonly]');
  linkInput.select();
  document.execCommand('copy');
  
  // 显示复制成功的提示
  const copyBtn = document.querySelector('#inviteMembersModal button');
  const originalText = copyBtn.textContent;
  copyBtn.textContent = 'Copied!';
  setTimeout(() => {
    copyBtn.textContent = originalText;
  }, 2000);
};

// API错误日志和处理函数
function logApiError(api, error, details = {}) {
  console.error(`API Error [${api}]:`, error, details);
  
  // 可以在这里添加错误上报逻辑
  // 例如，向服务器发送错误信息以便记录
  
  // 返回用户友好的错误消息
  return error?.message || 'An error occurred, please try again later';
}

// 搜索用户功能
function searchUsers(query) {
  console.log('Using local mock data for search, query:', query);

  // Clear old search results
  const resultsContainer = document.querySelector('#inviteMembersModal .divide-y');
  if (!resultsContainer) {
    console.error('Results container element not found!');
    return;
  }
  
  resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Searching...</div>';
  
  // Use mock data, skip API call
  setTimeout(() => {
    // Mock user data
    const mockUsers = [
      {
        user_id: 1,
        username: 'admin',
        email: 'admin@example.com',
        avatar_url: null,
        is_online: true
      },
      {
        user_id: 2,
        username: 'user1',
        email: 'user1@example.com',
        avatar_url: null,
        is_online: false
      },
      {
        user_id: 3,
        username: 'test_user',
        email: 'test@example.com',
        avatar_url: null,
        is_online: true
      },
      {
        user_id: 4,
        username: 'jane_doe',
        email: 'jane@example.com',
        avatar_url: null,
        is_online: true
      },
      {
        user_id: 5,
        username: 'john_smith',
        email: 'john@example.com',
        avatar_url: null,
        is_online: false
      }
    ];
    
    // Filter users based on query
    const filteredUsers = mockUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) || 
      user.email.toLowerCase().includes(query.toLowerCase())
    );
    
    console.log('Mock search results:', filteredUsers);
    
    // Render search results
    renderSearchResults(filteredUsers);
    
    // Update count
    const countElement = document.getElementById('searchResultCount');
    if (countElement) {
      countElement.textContent = filteredUsers.length;
    }
  }, 500); // Add 500ms delay to simulate network request
}

// 渲染搜索结果
function renderSearchResults(users) {
  console.log('Rendering search results:', users);
  const resultsContainer = document.querySelector('#inviteMembersModal .divide-y');
  if (!resultsContainer) {
    console.error('Results container element not found!');
    return;
  }

  if (users.length === 0) {
    resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">No matching users found</div>';
    return;
  }

  resultsContainer.innerHTML = users.map(user => `
    <div class="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold overflow-hidden">
            ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.username}" class="w-full h-full object-cover">` : user.username.charAt(0)}
          </div>
          <div>
            <div class="font-medium text-gray-900 dark:text-white">${user.username}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">${user.email || ''}</div>
          </div>
        </div>
        <button onclick="inviteUser('${user.username}', event)" class="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm">
          Invite
        </button>
      </div>
    </div>
  `).join('');
}

// 邀请用户
window.inviteUser = function(username, event) {
  // 确保有事件对象
  event = event || window.event;
  
  // 获取当前活跃的聊天室ID
  let activeRoomId = null;
  
  // 尝试从活跃频道获取房间ID
  const activeChannel = document.querySelector('.channel-item.active');
  if (activeChannel) {
    const channelId = activeChannel.dataset.channelId;
    // 根据频道ID找到相应的房间
    const roomHeaders = document.querySelectorAll('.room-header');
    for (const header of roomHeaders) {
      const sublist = header.nextElementSibling;
      if (sublist && sublist.querySelector(`[data-channel-id="${channelId}"]`)) {
        activeRoomId = header.dataset.roomId;
        break;
      }
    }
  }
  
  // 如果找不到活跃的房间，使用第一个可见的房间
  if (!activeRoomId) {
    const firstRoom = document.querySelector('.room-header');
    if (firstRoom) {
      activeRoomId = firstRoom.dataset.roomId;
    } else {
      showToast('找不到可用的聊天室');
      return;
    }
  }
  
  // 显示加载状态
  const inviteBtn = event.target;
  const originalText = inviteBtn.textContent;
  inviteBtn.textContent = '邀请中...';
  inviteBtn.disabled = true;
  
  console.log('邀请用户:', username, '到房间:', activeRoomId);
  
  // 模拟网络延迟
  setTimeout(() => {
    // 模拟成功
    showToast(`成功邀请 ${username} 加入聊天室`);
      
    // 关闭模态框
    closeInviteMembersModal();
  }, 500);
}

// 初始化搜索功能
function initInviteSearch() {
  console.log('初始化邀请搜索功能');
  
  // 查找搜索输入框
  const searchInput = document.getElementById('memberSearchInput');
  
  if (!searchInput) {
    console.error('找不到搜索输入框元素! ID: memberSearchInput');
    
    // 尝试用CSS选择器找到搜索输入框
    const alternativeInput = document.querySelector('#inviteMembersModal input[type="text"]');
    
    if (!alternativeInput) {
      console.error('通过选择器也找不到搜索输入框!');
      
      // 显示错误消息给用户
      const resultsContainer = document.querySelector('#inviteMembersModal .divide-y');
      if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="p-4 text-center text-red-500">搜索功能初始化失败，请刷新页面</div>';
      }
      return;
    }
    
    console.log('通过CSS选择器找到了搜索输入框');
    
    // 确保输入框有ID以便后续使用
    alternativeInput.id = 'memberSearchInput';
    
    // 将搜索监听器设置给找到的输入框
    setupSearchListener(alternativeInput);
    return;
  }
  
  // 将搜索监听器设置给ID为memberSearchInput的输入框
  setupSearchListener(searchInput);
  
  // 初始清空搜索结果
  const resultsContainer = document.querySelector('#inviteMembersModal .divide-y');
  if (resultsContainer) {
    resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">输入至少2个字符进行搜索</div>';
  }
  
  // 重置计数
  const countElement = document.getElementById('searchResultCount');
  if (countElement) {
    countElement.textContent = '0';
  }
}

// 设置搜索监听器
function setupSearchListener(inputElement) {
  let debounceTimer;
  inputElement.addEventListener('input', (e) => {
    console.log('Input content changed:', e.target.value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = e.target.value.trim();
      console.log('Processing search query:', query);
      if (query.length >= 2) {
        // Use search API
        searchUsers(query);
      } else {
        const resultsContainer = document.querySelector('#inviteMembersModal .divide-y');
        if (resultsContainer) {
          resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">Enter at least 2 characters to search</div>';
        }
        // Reset count
        const countElement = document.getElementById('searchResultCount');
        if (countElement) {
          countElement.textContent = '0';
        }
      }
    }, 300);
  });
}

// 使用测试API搜索用户
function testSearchUsers(query) {
  console.log('使用本地模拟数据测试搜索，查询:', query);

  // 清空旧的搜索结果
  const resultsContainer = document.querySelector('#inviteMembersModal .divide-y');
  if (!resultsContainer) {
    console.error('找不到结果容器元素!');
    return;
  }
  
  resultsContainer.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">搜索中...</div>';
  
  // 使用模拟数据，跳过API调用
  setTimeout(() => {
    // 模拟用户数据
    const mockUsers = [
      {
        user_id: 1,
        username: 'admin',
        email: 'admin@example.com',
        avatar_url: null,
        is_online: true
      },
      {
        user_id: 2,
        username: 'user1',
        email: 'user1@example.com',
        avatar_url: null,
        is_online: false
      },
      {
        user_id: 3,
        username: 'test_user',
        email: 'test@example.com',
        avatar_url: null,
        is_online: true
      },
      {
        user_id: 4,
        username: 'jane_doe',
        email: 'jane@example.com',
        avatar_url: null,
        is_online: true
      },
      {
        user_id: 5,
        username: 'john_smith',
        email: 'john@example.com',
        avatar_url: null,
        is_online: false
      }
    ];
    
    // 根据查询词过滤用户
    const filteredUsers = mockUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) || 
      user.email.toLowerCase().includes(query.toLowerCase())
    );
    
    console.log('模拟搜索结果:', filteredUsers);
    
    // 渲染搜索结果
    renderSearchResults(filteredUsers);
    
    // 更新计数
    const countElement = document.getElementById('searchResultCount');
    if (countElement) {
      countElement.textContent = filteredUsers.length;
    }
  }, 500); // 添加500ms延迟模拟网络请求
}

window.openInviteMembersModal = function() {
  console.log('Opening invite members modal');
  const modal = document.getElementById('inviteMembersModal');
  if (!modal) {
    console.error('Invite modal element not found!');
    return;
  }
  
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  
  console.log('Modal displayed, preparing to initialize search');
  // Initialize search functionality
  setTimeout(() => {
    initInviteSearch();
  }, 100);
  
  // Trigger a default search to show all users
  setTimeout(() => {
    console.log('Automatically triggering a default search');
    searchUsers('');  // Empty query will show all users
  }, 300);
};

window.closeInviteMembersModal = function() {
  const modal = document.getElementById('inviteMembersModal');
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
};

// 设置标题相关功能
window.closeSetHeaderModal = function() {
  const modal = document.getElementById('setHeaderModal');
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
};

window.openSetHeaderModal = function() {
  const modal = document.getElementById('setHeaderModal');
  const channelNameInput = document.getElementById('channelNameInput');
  
  // 获取当前频道名称
  const currentChannelName = document.querySelector('h1.font-semibold.text-lg').textContent.trim();
  channelNameInput.value = currentChannelName;
  
  // 显示模态框
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  
  // 聚焦输入框
  setTimeout(() => {
    channelNameInput.focus();
  }, 100);
};

window.saveChannelHeader = function() {
  const channelNameInput = document.getElementById('channelNameInput');
  const newChannelName = channelNameInput.value.trim();
  
  if (!newChannelName) {
    alert('Please enter a channel name');
    return;
  }
  
  // 获取当前激活的频道ID
  const activeChannel = document.querySelector('.channel-item.active');
  if (!activeChannel) {
    alert('No active channel selected');
    closeSetHeaderModal();
    return;
  }
  
  const channelId = activeChannel.dataset.channelId;
  console.log("Active channel ID:", channelId);
  console.log("New channel name:", newChannelName);
  
  // 准备发送到后端的数据
  const data = {
    channel_id: channelId,
    channel_name: newChannelName
  };
  
  // 发送API请求更新频道头部
  fetch('/api/update_channel_header', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      console.log("Channel header updated successfully:", data);
      
      // 更新UI中的频道名称
      document.querySelector('h1.font-semibold.text-lg').textContent = newChannelName;
      
      // 更新侧边栏中的频道名称
      if (activeChannel) {
        const channelNameElement = activeChannel.querySelector('span:last-child');
        if (channelNameElement) {
          channelNameElement.textContent = newChannelName;
        }
      }
      
      // 重新计算并应用所有展开的聊天室的子列表高度
      if (typeof recalculateExpandedChannels === 'function') {
        setTimeout(recalculateExpandedChannels, 50);
      }
      
      // 显示成功消息
      showToast('Channel header updated successfully');
    } else {
      alert(data.message || 'Failed to update channel header');
    }
  })
  .catch(error => {
    console.error('Error updating channel header:', error);
    alert('An error occurred while updating the channel header');
  })
  .finally(() => {
    closeSetHeaderModal();
  });
};

// 辅助函数：显示通知消息
function showToast(message) {
  // 检查是否已存在toast
  let toast = document.getElementById('toast-notification');
  
  if (!toast) {
    // 创建新的toast元素
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg transform transition-all duration-300 opacity-0 translate-y-4 z-50';
    document.body.appendChild(toast);
  }
  
  // 设置消息并显示toast
  toast.textContent = message;
  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-y-4');
  }, 10);
  
  // 3秒后隐藏toast
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// 打开资源管理模态框
window.openResourceManagementModal = function() {
  // 先清理可能遗留的背景，但仅限于特定ID的背景
  try {
    const oldBackdrop = document.getElementById('resourceModalBackdrop');
    if (oldBackdrop) {
      document.body.removeChild(oldBackdrop);
    }
  } catch (e) {
    console.log('清理旧背景时出错', e);
  }
  
  const modal = document.getElementById('resourceManagementModal');
  const modalBackdrop = document.createElement('div');
  const modalContent = modal.querySelector('.bg-white');
  
  // 添加背景变暗遮罩
  modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-0 z-40 transition-opacity duration-300';
  modalBackdrop.id = 'resourceModalBackdrop'; // 添加ID便于查找
  document.body.appendChild(modalBackdrop);
  
  // 显示模态框和背景
  modal.classList.remove('invisible', 'opacity-0');
  document.body.classList.add('overflow-hidden');
  
  // 触发内容动画和背景变暗动画
  setTimeout(() => {
    modalBackdrop.classList.add('bg-opacity-50');
    modalContent.classList.remove('scale-95', 'opacity-0');
  }, 10);
  
  // 存储遮罩引用以便关闭时使用
  modal.backdrop = modalBackdrop;
  
  // 渲染资源列表
  renderResources();
  
  // 添加拖放上传支持
  initDragDropUpload();
  
  // 点击背景关闭模态框
  modalBackdrop.addEventListener('click', function(e) {
    if (e.target === modalBackdrop) {
      closeResourceManagementModal();
    }
  });
};

// 关闭资源管理模态框
window.closeResourceManagementModal = function() {
  const modal = document.getElementById('resourceManagementModal');
  if (!modal) return;
  
  const modalContent = modal.querySelector('.bg-white');
  let modalBackdrop = modal.backdrop;
  
  // 查找背景遮罩（仅限于特定ID的背景）
  if (!modalBackdrop) {
    modalBackdrop = document.getElementById('resourceModalBackdrop');
  }
  
  // 添加动画
  if (modalContent) {
    modalContent.classList.add('scale-95', 'opacity-0');
  }
  modal.classList.add('opacity-0');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('bg-opacity-50');
    modalBackdrop.classList.add('bg-opacity-0');
  }
  
  // 等待动画完成后隐藏模态框
  setTimeout(() => {
    modal.classList.add('invisible');
    document.body.classList.remove('overflow-hidden');
    
    // 移除背景遮罩（仅限于特定ID的背景）
    if (modalBackdrop) {
      try {
        document.body.removeChild(modalBackdrop);
      } catch (e) {
        console.log('背景遮罩移除失败', e);
        // 如果直接移除失败，尝试使用display:none隐藏
        modalBackdrop.style.display = 'none';
      }
      modal.backdrop = null;
    }
  }, 300);
};

// ESC键关闭模态框
function closeModalOnEsc(e) {
  if (e.key === 'Escape') {
    closeResourceManagementModal();
    closeChannelManagementModal();
  }
}

// 初始化拖放上传
function initDragDropUpload() {
  const dropZone = document.querySelector('.border-dashed');
  const fileInput = document.getElementById('resourceFileInput');
  
  if (!dropZone || !fileInput) return;
  
  // 显示拖放动画效果
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // 高亮拖放区域
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropZone.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
  }
  
  function unhighlight() {
    dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
  }
  
  // 处理文件拖放
  dropZone.addEventListener('drop', handleDrop, false);
  
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }
  
  // 处理文件选择
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', function() {
    handleFiles(this.files);
  });
  
  function handleFiles(files) {
    // 这里实现文件处理逻辑
    if (files.length > 0) {
      // 显示成功上传提示
      showToast(`成功上传 ${files.length} 个文件`);
      
      // 模拟处理文件并添加为资源
      Array.from(files).forEach(file => {
        const newResource = {
          id: Date.now() + Math.random().toString(36).substr(2, 5),
          name: file.name,
          url: URL.createObjectURL(file),
          properties: {
            type: file.type,
            size: formatFileSize(file.size),
            lastModified: new Date(file.lastModified).toLocaleDateString()
          }
        };
        
        resources.push(newResource);
      });
      
      // 重新渲染资源列表
      renderResources();
    }
  }
  
  // 格式化文件大小
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 打开频道管理模态框
window.openChannelManagementModal = function() {
  // 先清理可能遗留的背景，但仅限于特定ID的背景
  try {
    const oldBackdrop = document.getElementById('channelModalBackdrop');
    if (oldBackdrop) {
      document.body.removeChild(oldBackdrop);
    }
  } catch (e) {
    console.log('清理旧背景时出错', e);
  }
  
  const modal = document.getElementById('channelManagementModal');
  if (!modal) return;
  
  const modalBackdrop = document.createElement('div');
  const modalContent = modal.querySelector('.bg-white');
  
  // 添加背景变暗遮罩
  modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-0 z-40 transition-opacity duration-300';
  modalBackdrop.id = 'channelModalBackdrop'; // 添加ID便于查找
  document.body.appendChild(modalBackdrop);
  
  // 显示模态框和背景
  modal.classList.remove('invisible', 'opacity-0');
  document.body.classList.add('overflow-hidden');
  
  // 触发内容动画和背景变暗动画
  setTimeout(() => {
    modalBackdrop.classList.add('bg-opacity-50');
    if (modalContent) {
      modalContent.classList.remove('scale-95', 'opacity-0');
    }
  }, 10);
  
  // 存储遮罩引用以便关闭时使用
  modal.backdrop = modalBackdrop;
  
  // 加载频道成员
  loadChannelMembers();
  
  // 聚焦搜索框
  const searchInput = modal.querySelector('input[type="text"]');
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 100);
  }
  
  // 点击背景关闭模态框
  modalBackdrop.addEventListener('click', function(e) {
    if (e.target === modalBackdrop) {
      closeChannelManagementModal();
    }
  });
};

// 关闭频道管理模态框
window.closeChannelManagementModal = function() {
  const modal = document.getElementById('channelManagementModal');
  if (!modal) return;
  
  const modalContent = modal.querySelector('.bg-white');
  let modalBackdrop = modal.backdrop;
  
  // 查找背景遮罩（仅限于特定ID的背景）
  if (!modalBackdrop) {
    modalBackdrop = document.getElementById('channelModalBackdrop');
  }
  
  // 添加动画
  if (modalContent) {
    modalContent.classList.add('scale-95', 'opacity-0');
  }
  modal.classList.add('opacity-0');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('bg-opacity-50');
    modalBackdrop.classList.add('bg-opacity-0');
  }
  
  // 等待动画完成后隐藏模态框
  setTimeout(() => {
    modal.classList.add('invisible');
    document.body.classList.remove('overflow-hidden');
    
    // 移除背景遮罩（仅限于特定ID的背景）
    if (modalBackdrop) {
      try {
        document.body.removeChild(modalBackdrop);
      } catch (e) {
        console.log('背景遮罩移除失败', e);
        // 如果直接移除失败，尝试使用display:none隐藏
        modalBackdrop.style.display = 'none';
      }
      modal.backdrop = null;
    }
    
    // 隐藏任何可能的下拉菜单
    hideDropdown();
  }, 300);
};

// 频道管理相关功能
let currentMember = null;
let memberActionsDropdown = null;
let searchDebounceTimer = null;

// 初始化频道管理功能
function initChannelManagement() {
  memberActionsDropdown = document.getElementById('memberActionsDropdown');
  
  // 初始化搜索和筛选
  initMemberSearch();
  
  // 初始化点击事件监听
  document.addEventListener('click', handleOutsideClick);
  
  // 初始化按键事件监听
  document.addEventListener('keydown', handleKeyPress);
}

// 当打开频道管理模态框时加载成员
window.openChannelManagementModal = function() {
  // 先清理可能遗留的背景，但仅限于特定ID的背景
  try {
    const oldBackdrop = document.getElementById('channelModalBackdrop');
    if (oldBackdrop) {
      document.body.removeChild(oldBackdrop);
    }
  } catch (e) {
    console.log('清理旧背景时出错', e);
  }
  
  const modal = document.getElementById('channelManagementModal');
  if (!modal) return;
  
  const modalBackdrop = document.createElement('div');
  const modalContent = modal.querySelector('.bg-white');
  
  // 添加背景变暗遮罩
  modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-0 z-40 transition-opacity duration-300';
  modalBackdrop.id = 'channelModalBackdrop'; // 添加ID便于查找
  document.body.appendChild(modalBackdrop);
  
  // 显示模态框和背景
  modal.classList.remove('invisible', 'opacity-0');
  document.body.classList.add('overflow-hidden');
  
  // 触发内容动画和背景变暗动画
  setTimeout(() => {
    modalBackdrop.classList.add('bg-opacity-50');
    if (modalContent) {
      modalContent.classList.remove('scale-95', 'opacity-0');
    }
  }, 10);
  
  // 存储遮罩引用以便关闭时使用
  modal.backdrop = modalBackdrop;
  
  // 加载频道成员
  loadChannelMembers();
  
  // 聚焦搜索框
  const searchInput = modal.querySelector('input[type="text"]');
  if (searchInput) {
    setTimeout(() => searchInput.focus(), 100);
  }
  
  // 点击背景关闭模态框
  modalBackdrop.addEventListener('click', function(e) {
    if (e.target === modalBackdrop) {
      closeChannelManagementModal();
    }
  });
};

// 加载频道成员
function loadChannelMembers() {
  console.log('加载频道成员');
  
  // 获取当前活跃的频道
  const activeChannel = document.querySelector('.channel-item.active');
  if (!activeChannel) {
    console.error('找不到活跃的频道');
    return;
  }
  
  const channelId = activeChannel.dataset.channelId;
  if (!channelId) {
    console.error('活跃频道没有ID');
    return;
  }
  
  console.log('加载频道ID:', channelId, '的成员');
  
  // 显示加载状态
  const memberList = document.querySelector('#channelManagementModal .flex-1.overflow-y-auto');
  if (memberList) {
    memberList.innerHTML = `
      <div class="flex items-center justify-center h-full">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    `;
  }
  
  // 调用后端API获取成员列表
  fetch(`/api/channel_members/${channelId}`)
    .then(response => {
      console.log('获取频道成员响应状态:', response.status);
      if (!response.ok) {
        throw new Error(`服务器返回状态码: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('获取频道成员响应数据:', data);
      if (data.success) {
        renderChannelMembers(data.members, channelId);
      } else {
        // 显示错误消息
        if (memberList) {
          memberList.innerHTML = `
            <div class="p-4 text-center text-red-500">
              ${data.message || '无法加载频道成员'}
            </div>
          `;
        }
      }
    })
    .catch(error => {
      console.error('获取频道成员错误:', error);
      // 使用模拟数据
      renderMockChannelMembers(channelId);
    });
}

// 渲染频道成员
function renderChannelMembers(members, channelId) {
  console.log('渲染频道成员:', members);
  
  if (!members || members.length === 0) {
    console.log('没有频道成员数据');
    renderMockChannelMembers(channelId);
    return;
  }
  
  // 分离在线和离线成员
  const onlineMembers = members.filter(member => member.is_online);
  const offlineMembers = members.filter(member => !member.is_online);
  
  // 创建HTML
  let html = `
    <div class="space-y-2">
      <!-- 在线成员 -->
      <div class="mb-4">
        <h3 class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Online Members (${onlineMembers.length})</h3>
        <div class="space-y-2">
  `;
  
  // 添加在线成员
  onlineMembers.forEach(member => {
    // 确定头像背景颜色
    const avatarBgColors = ['bg-green-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-orange-500'];
    const avatarColor = avatarBgColors[Math.floor(Math.random() * avatarBgColors.length)];
    
    // 确定角色标签
    let roleBadge = '';
    if (member.role === 'owner') {
      roleBadge = `<span class="px-1.5 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">Owner</span>`;
    } else if (member.role === 'admin') {
      roleBadge = `<span class="px-1.5 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">Admin</span>`;
    } else if (member.role === 'moderator') {
      roleBadge = `<span class="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">Mod</span>`;
    }
    
    // 确定用户是否为当前用户
    const isCurrentUser = member.user_id === currentUser?.id;
    if (isCurrentUser) {
      roleBadge += ` <span class="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">You</span>`;
    }
    
    // 创建成员项HTML
    html += `
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between group hover:shadow-sm transition-shadow"
           data-username="${member.username}" data-user-id="${member.user_id}">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-10 h-10 rounded-lg ${avatarColor} text-white flex items-center justify-center font-semibold">
              ${member.avatar_url ? 
                `<img src="${member.avatar_url}" alt="${member.username}" class="w-full h-full object-cover rounded-lg">` : 
                member.username.charAt(0)}
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 dark:text-white">${member.username}</span>
              ${roleBadge}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Active now</div>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          ${isCurrentUser || member.role === 'owner' ? 
            `<button class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" disabled title="Cannot manage ${isCurrentUser ? 'yourself' : 'owner'}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>` :
            `<button onclick="showMemberActions('${member.username}', ${member.user_id}, ${channelId}, event)" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>`
          }
        </div>
      </div>
    `;
  });
  
  // 添加离线成员部分
  html += `
        </div>
      </div>
      
      <!-- 离线成员 -->
      <div>
        <h3 class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Offline Members (${offlineMembers.length})</h3>
        <div class="space-y-2">
  `;
  
  // 添加离线成员
  offlineMembers.forEach(member => {
    // 确定头像背景颜色
    const avatarBgColors = ['bg-green-500', 'bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-orange-500'];
    const avatarColor = avatarBgColors[Math.floor(Math.random() * avatarBgColors.length)];
    
    // 确定角色标签
    let roleBadge = '';
    if (member.role === 'owner') {
      roleBadge = `<span class="px-1.5 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">Owner</span>`;
    } else if (member.role === 'admin') {
      roleBadge = `<span class="px-1.5 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">Admin</span>`;
    } else if (member.role === 'moderator') {
      roleBadge = `<span class="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">Mod</span>`;
    }
    
    // 确定用户是否为当前用户
    const isCurrentUser = member.user_id === currentUser?.id;
    if (isCurrentUser) {
      roleBadge += ` <span class="px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">You</span>`;
    }
    
    // 创建离线时间描述
    let lastActivity = 'Last seen recently';
    if (member.last_activity) {
      try {
        const date = new Date(member.last_activity);
        const now = new Date();
        const diffHours = Math.round((now - date) / (1000 * 60 * 60));
        
        if (diffHours < 1) {
          lastActivity = 'Last seen recently';
        } else if (diffHours < 24) {
          lastActivity = `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
          const diffDays = Math.round(diffHours / 24);
          lastActivity = `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        }
      } catch (e) {
        console.error('解析日期错误:', e);
      }
    }
    
    // 创建成员项HTML
    html += `
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between group hover:shadow-sm transition-shadow"
           data-username="${member.username}" data-user-id="${member.user_id}">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-10 h-10 rounded-lg ${avatarColor} text-white flex items-center justify-center font-semibold">
              ${member.avatar_url ? 
                `<img src="${member.avatar_url}" alt="${member.username}" class="w-full h-full object-cover rounded-lg">` : 
                member.username.charAt(0)}
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 dark:text-white">${member.username}</span>
              ${roleBadge}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">${lastActivity}</div>
          </div>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          ${isCurrentUser || member.role === 'owner' ? 
            `<button class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" disabled title="Cannot manage ${isCurrentUser ? 'yourself' : 'owner'}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>` :
            `<button onclick="showMemberActions('${member.username}', ${member.user_id}, ${channelId}, event)" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>`
          }
        </div>
      </div>
    `;
  });
  
  // 完成HTML
  html += `
        </div>
      </div>
    </div>
  `;
  
  // 将HTML插入到模态框
  const memberList = document.querySelector('#channelManagementModal .flex-1.overflow-y-auto');
  if (memberList) {
    memberList.innerHTML = html;
  }
  
  // 更新成员计数
  const totalCounter = document.querySelector('#channelManagementModal .border-t div:first-child');
  if (totalCounter) {
    totalCounter.textContent = `${members.length} total members`;
  }
}

// 渲染模拟频道成员数据（API调用失败时使用）
function renderMockChannelMembers(channelId) {
  console.log('渲染模拟频道成员数据');
  
  const mockMembers = [
    {
      user_id: currentUser?.id || 1,
      username: currentUser?.username || 'withers',
      email: 'withers@example.com',
      avatar_url: null,
      is_online: true,
      last_activity: null,
      role: 'owner'
    },
    {
      user_id: 2,
      username: 'root',
      email: 'root@example.com',
      avatar_url: null,
      is_online: true,
      last_activity: null,
      role: 'admin'
    },
    {
      user_id: 3,
      username: 'channelexport',
      email: 'export@example.com',
      avatar_url: null,
      is_online: false,
      last_activity: '2023-10-20T19:30:00',
      role: 'member'
    },
    {
      user_id: 4,
      username: 'bob.developer',
      email: 'bob@example.com',
      avatar_url: null,
      is_online: false,
      last_activity: '2023-10-19T14:45:00',
      role: 'member'
    },
    {
      user_id: 5,
      username: 'alice.designer',
      email: 'alice@example.com',
      avatar_url: null,
      is_online: false,
      last_activity: '2023-10-18T09:15:00',
      role: 'member'
    }
  ];
  
  renderChannelMembers(mockMembers, channelId);
}

// 显示成员操作下拉菜单 - 更新为携带用户ID和频道ID
window.showMemberActions = function(username, userId, channelId, event) {
  // 阻止冒泡，防止立即关闭菜单
  event.stopPropagation();
  
  // 保存当前操作的成员信息
  currentMember = {
    username,
    userId,
    channelId
  };
  
  // 获取成员操作下拉菜单元素
  const dropdown = document.getElementById('memberActionsDropdown');
  
  if (dropdown) {
    // 计算位置：在触发按钮的右侧
    const rect = event.target.closest('button').getBoundingClientRect();
    dropdown.style.top = `${rect.top}px`;
    dropdown.style.left = `${rect.right + 5}px`; // 右侧加一点间距
    
    // 显示下拉菜单
    dropdown.classList.remove('hidden');
    
    // 添加动画
    setTimeout(() => {
      dropdown.classList.remove('opacity-0', 'translate-y-1');
    }, 10);
    
    memberActionsVisible = true;
  }
};

// 关闭成员操作下拉菜单
function closeMemberActionsDropdown() {
  const dropdown = document.getElementById('memberActionsDropdown');
  
  if (dropdown) {
    // 添加隐藏动画
    dropdown.classList.add('opacity-0', 'translate-y-1');
    
    // 延迟后完全隐藏
    setTimeout(() => {
      dropdown.classList.add('hidden');
    }, 200);
    
    memberActionsVisible = false;
  }
}

// 处理外部点击
function handleOutsideClick(event) {
  // 处理下拉菜单
  const memberActionsDropdown = document.getElementById('memberActionsDropdown');
  if (memberActionsDropdown && !memberActionsDropdown.contains(event.target)) {
    hideDropdown();
  }
}

// 处理按键事件
function handleKeyPress(event) {
  // ESC键关闭模态框
  if (event.key === 'Escape') {
    closeChannelManagementModal();
  }
}

// 隐藏下拉菜单
function hideDropdown() {
  const memberActionsDropdown = document.getElementById('memberActionsDropdown');
  if (!memberActionsDropdown) return;
  
  // 使用直接样式操作代替类切换，减少延迟
  memberActionsDropdown.style.opacity = '0';
  memberActionsDropdown.style.transform = 'translateY(4px)';
  
  // 缩短动画时间以提高响应速度
  setTimeout(() => {
    memberActionsDropdown.classList.add('hidden');
    currentMember = null;
  }, 150);
}

// 初始化成员搜索功能
function initMemberSearch() {
  const searchInput = document.querySelector('#channelManagementModal input[type="text"]');
  const filterSelect = document.querySelector('#channelManagementModal select');
  
  if (!searchInput || !filterSelect) return;
  
  // 搜索处理
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      const query = e.target.value.toLowerCase();
      const filter = filterSelect.value;
      filterMembers(query, filter);
    }, 150); // 减少延迟提高响应性
  });
  
  // 筛选处理
  filterSelect.addEventListener('change', () => {
    const query = searchInput.value.toLowerCase();
    const filter = filterSelect.value;
    filterMembers(query, filter);
  });
}

// 筛选成员
function filterMembers(query, filter) {
  const memberItems = document.querySelectorAll('#channelManagementModal .group');
  let visibleCount = 0;
  let onlineCount = 0;
  
  memberItems.forEach(item => {
    const name = item.querySelector('.font-medium').textContent.toLowerCase();
    const status = item.querySelector('.text-gray-500').textContent.toLowerCase();
    
    // 检查是否匹配搜索条件
    let show = name.includes(query);
    
    // 检查是否匹配筛选条件
    if (filter !== 'all') {
      if (filter === 'online' && !status.includes('active')) show = false;
      if (filter === 'offline' && !status.includes('last seen')) show = false;
      if (filter === 'muted' && !status.includes('muted')) show = false;
    }
    
    // 应用过渡动画
    if (show) {
      item.classList.remove('hidden');
      requestAnimationFrame(() => {
        item.classList.remove('opacity-0', 'scale-95');
        item.classList.add('opacity-100', 'scale-100');
      });
      visibleCount++;
      if (status.includes('active')) onlineCount++;
    } else {
      item.classList.add('opacity-0', 'scale-95');
      setTimeout(() => {
        item.classList.add('hidden');
      }, 200);
    }
  });
  
  // 更新计数
  updateMemberCount(onlineCount, visibleCount);
}

// 更新成员计数
function updateMemberCount(onlineCount = null, totalCount = null) {
  if (onlineCount === null) {
    onlineCount = document.querySelectorAll('#channelManagementModal .group:not(.hidden) .bg-green-500').length;
  }
  if (totalCount === null) {
    totalCount = document.querySelectorAll('#channelManagementModal .group:not(.hidden)').length;
  }
  
  // 更新在线成员计数
  const onlineTitle = document.querySelector('#channelManagementModal h3:first-of-type');
  if (onlineTitle) {
    onlineTitle.textContent = `Online Members (${onlineCount})`;
  }
  
  // 更新离线成员计数
  const offlineTitle = document.querySelector('#channelManagementModal h3:last-of-type');
  if (offlineTitle) {
    offlineTitle.textContent = `Offline Members (${totalCount - onlineCount})`;
  }
  
  // 更新总计数
  const totalCounter = document.querySelector('#channelManagementModal .border-t div:first-child');
  if (totalCounter) {
    totalCounter.textContent = `${totalCount} total members`;
  }
}

// 显示提示消息
function showToast(message) {
  // 创建提示元素
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm shadow-lg transform translate-y-2 opacity-0 transition-all duration-300';
  toast.textContent = message;
  
  // 添加到页面
  document.body.appendChild(toast);
  
  // 触发动画
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });
  
  // 自动移除
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 显示确认对话框
function showConfirmDialog(title, message, onConfirm) {
  // 创建对话框元素
  const dialog = document.createElement('div');
  dialog.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] opacity-0 transition-opacity duration-300';
  dialog.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg p-4 w-80 transform scale-95 opacity-0 transition-all duration-300">
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">${title}</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${message}</p>
      <div class="flex justify-end gap-2">
        <button class="cancel-btn px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">Cancel</button>
        <button class="confirm-btn px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors">Confirm</button>
      </div>
    </div>
  `;
  
  // 添加到页面
  document.body.appendChild(dialog);
  
  // 触发动画
  requestAnimationFrame(() => {
    dialog.classList.remove('opacity-0');
    const content = dialog.querySelector('div');
    content.classList.remove('scale-95', 'opacity-0');
  });
  
  // 绑定事件
  dialog.querySelector('.cancel-btn').addEventListener('click', () => closeDialog());
  dialog.querySelector('.confirm-btn').addEventListener('click', () => {
    onConfirm();
    closeDialog();
  });
  
  // 关闭对话框
  function closeDialog() {
    dialog.classList.add('opacity-0');
    const content = dialog.querySelector('div');
    content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => dialog.remove(), 300);
  }
}

// 关闭频道描述编辑模态框
window.closeEditDescriptionModal = function() {
  const modal = document.getElementById('editDescriptionModal');
  if (!modal) return;
  
  // 添加动画
  const modalContent = modal.querySelector('.bg-white');
  if (modalContent) {
    modalContent.classList.add('scale-95', 'opacity-0');
  }
  modal.classList.add('opacity-0');
  
  // 等待动画完成后隐藏模态框
  setTimeout(() => {
    modal.classList.add('invisible');
    document.body.classList.remove('overflow-hidden');
  }, 200);
};

// 保存频道描述
window.saveChannelDescription = function() {
  const descriptionInput = document.getElementById('modalDescriptionInput');
  const description = descriptionInput.value.trim();
  
  if (!description) {
    alert('Please enter a description');
    return;
  }
  
  // 更新描述文本
  const descriptionSpan = document.querySelector('#channelDescription span');
  descriptionSpan.textContent = description;
  
  // 关闭模态框
  closeEditDescriptionModal();
};

// 初始化
document.addEventListener('DOMContentLoaded', initChannelManagement);

// 打开面板
window.openPanel = function(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  
  // 移除所有其他面板的过渡效果
  document.querySelectorAll('.side-panel').forEach(p => {
    if (p.id !== panelId) {
      p.style.transition = 'none';
      p.classList.add('translate-x-full');
      void p.offsetWidth; // 强制重绘
      p.style.transition = '';
    }
  });
  
  // 添加动画类
  requestAnimationFrame(() => {
    panel.classList.remove('translate-x-full');
    panel.classList.add('translate-x-0', 'shadow-2xl');
  });
};

// 关闭面板
window.closePanel = function(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  
  // 添加动画类
  panel.classList.add('translate-x-full');
  panel.classList.remove('translate-x-0', 'shadow-2xl');
};

// 渲染资源列表
window.renderResources = function() {
  const resourcesList = document.querySelector('#resourceManagementModal .grid');
  if (!resourcesList || !window.resources || !window.resources.length) {
    resourcesList.innerHTML = `
      <div class="col-span-1 p-8 text-center">
        <div class="text-gray-400 dark:text-gray-500 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-gray-500 dark:text-gray-400">No resources found. Add your first resource to get started.</p>
        <button onclick="openAddResourceModal()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Add Resource
        </button>
      </div>
    `;
    return;
  }

  resourcesList.innerHTML = window.resources.map(resource => `
    <div class="resource-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200" data-id="${resource.id}">
      <div class="p-4">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center mb-1">
              ${getResourceTypeIcon(resource)}
              <h3 class="text-base font-semibold text-gray-900 dark:text-white ml-2 truncate">${resource.name}</h3>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate" title="${resource.url}">
              ${formatUrl(resource.url)}
            </p>
          </div>
          <div class="flex-shrink-0 ml-4">
            <div class="flex space-x-1">
              <button onclick="openResourceUrl('${resource.url}')" class="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Open resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button onclick="editResource('${resource.id}')" class="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Edit resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onclick="deleteResource('${resource.id}')" class="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Delete resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
        <button onclick="toggleResourceDetails('${resource.id}')" class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center transition-colors">
          <span>Details</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 transform transition-transform resource-details-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="resource-details hidden mt-2 text-sm space-y-1.5">
          ${renderResourceProperties(resource)}
          <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div class="flex flex-wrap gap-1.5 mt-1">
              ${renderResourceTags(resource)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  // 添加波纹动画效果
  addRippleEffect();
};

// 获取资源类型图标
function getResourceTypeIcon(resource) {
  const url = resource.url.toLowerCase();
  let icon = '';
  
  if (url.match(/\.(pdf)$/i)) {
    icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>`;
  } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>`;
  } else if (url.match(/\.(mp4|avi|mov|wmv|flv|mkv)$/i)) {
    icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </div>`;
  } else if (url.match(/\.(doc|docx|txt|rtf|odt)$/i)) {
    icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>`;
  } else if (url.match(/\.(xls|xlsx|csv)$/i)) {
    icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>`;
  } else if (url.match(/^https?:\/\/(www\.)?(github|gitlab)\.com/i)) {
    icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    </div>`;
  } else if (url.match(/^https?:\/\/(www\.)?(youtube|vimeo)\.com/i)) {
    icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>`;
  } else {
    icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    </div>`;
  }
  
  return icon;
}

// 渲染资源属性
function renderResourceProperties(resource) {
  if (!resource.properties || Object.keys(resource.properties).length === 0) {
    return `<p class="text-gray-500 dark:text-gray-400 italic">No additional properties</p>`;
  }
  
  return Object.entries(resource.properties).map(([key, value]) => `
    <div class="flex items-start">
      <span class="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">${key}:</span>
      <span class="text-gray-700 dark:text-gray-300 flex-1">${value}</span>
    </div>
  `).join('');
}

// 渲染资源标签
function renderResourceTags(resource) {
  const tags = [];
  
  // 根据URL类型添加标签
  const url = resource.url.toLowerCase();
  
  if (url.match(/\.(pdf)$/i)) {
    tags.push('PDF');
  } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    tags.push('Image');
  } else if (url.match(/\.(mp4|avi|mov|wmv|flv|mkv)$/i)) {
    tags.push('Video');
  } else if (url.match(/\.(doc|docx|txt|rtf|odt)$/i)) {
    tags.push('Document');
  } else if (url.match(/\.(xls|xlsx|csv)$/i)) {
    tags.push('Spreadsheet');
  } else if (url.match(/^https?:\/\/(www\.)?(github|gitlab)\.com/i)) {
    tags.push('Code');
  } else if (url.match(/^https?:\/\/(www\.)?(youtube|vimeo)\.com/i)) {
    tags.push('Video');
  } else {
    tags.push('Link');
  }
  
  // 增加一些模拟标签
  if (resource.name.toLowerCase().includes('design')) {
    tags.push('Design');
  }
  if (resource.name.toLowerCase().includes('doc')) {
    tags.push('Documentation');
  }
  
  return tags.map(tag => `
    <span class="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">${tag}</span>
  `).join('');
}

// 格式化URL显示
function formatUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
  } catch (e) {
    return url;
  }
}

// 切换资源详情显示
window.toggleResourceDetails = function(resourceId) {
  const resourceCard = document.querySelector(`.resource-card[data-id="${resourceId}"]`);
  if (!resourceCard) return;
  
  const detailsSection = resourceCard.querySelector('.resource-details');
  const icon = resourceCard.querySelector('.resource-details-icon');
  
  if (detailsSection.classList.contains('hidden')) {
    // 显示详情
    detailsSection.classList.remove('hidden');
    detailsSection.style.maxHeight = '0px';
    detailsSection.style.opacity = '0';
    
    // 触发过渡动画
    setTimeout(() => {
      detailsSection.style.maxHeight = detailsSection.scrollHeight + 'px';
      detailsSection.style.opacity = '1';
      icon.classList.add('rotate-180');
    }, 10);
  } else {
    // 隐藏详情
    detailsSection.style.maxHeight = '0px';
    detailsSection.style.opacity = '0';
    icon.classList.remove('rotate-180');
    
    // 等待过渡完成后彻底隐藏
    setTimeout(() => {
      detailsSection.classList.add('hidden');
    }, 300);
  }
};

// 添加波纹效果
function addRippleEffect() {
  const buttons = document.querySelectorAll('#resourceManagementModal button');
  
  buttons.forEach(button => {
    if (button.getAttribute('data-ripple') === 'true') return;
    
    button.setAttribute('data-ripple', 'true');
    button.addEventListener('click', createRipple);
  });
  
  function createRipple(event) {
    // 完全禁用ripple效果，不执行任何操作
    console.log('Ripple effect disabled - panels.js');
    return;
    
    // 以下代码不会执行
    const button = event.currentTarget;
    
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    const rect = button.getBoundingClientRect();
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');
    
    const ripple = button.querySelector('.ripple');
    if (ripple) {
      ripple.remove();
    }
    
    button.appendChild(circle);
  }
}

// 打开资源URL
window.openResourceUrl = function(url) {
  window.open(url, '_blank');
};

// 全局资源数组
window.resources = window.resources || [
  {
    id: '1',
    name: '项目文档',
    url: 'https://docs.google.com/document/d/1a2b3c4d5e6f',
    properties: {
      类型: '文档',
      创建人: 'root',
      创建时间: '2023-11-15'
    }
  },
  {
    id: '2',
    name: '设计资源',
    url: 'https://www.figma.com/file/abc123',
    properties: {
      类型: '设计',
      创建人: 'designer',
      创建时间: '2023-11-18'
    }
  }
];

// 显示通知提示
window.showToast = function(message, type = 'success') {
  // 移除现有通知
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 创建新通知
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  
  // 根据通知类型设置图标
  let icon = '';
  if (type === 'success') {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>`;
  } else if (type === 'error') {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>`;
  } else if (type === 'info') {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`;
  }
  
  toast.innerHTML = `
    ${icon}
    <div>${message}</div>
    <button class="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;
  
  document.body.appendChild(toast);
  
  // 绑定关闭按钮事件
  const closeBtn = toast.querySelector('button');
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });
  
  // 显示通知
  setTimeout(() => toast.classList.add('show'), 10);
  
  // 自动关闭
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
};

// 打开添加资源模态框
window.openAddResourceModal = function() {
  const modal = document.getElementById('resourceFormModal');
  if (!modal) return;
  
  // 重置表单
  document.getElementById('resourceFormTitle').textContent = '添加资源';
  document.getElementById('resourceId').value = '';
  document.getElementById('resourceName').value = '';
  document.getElementById('resourceUrl').value = '';
  document.getElementById('customProperties').innerHTML = '';
  
  // 显示模态框
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  
  // 聚焦名称输入框
  setTimeout(() => document.getElementById('resourceName').focus(), 100);
  
  // 绑定表单提交事件
  const form = document.getElementById('resourceForm');
  form.onsubmit = handleResourceFormSubmit;
};

// 编辑资源
window.editResource = function(resourceId) {
  const resource = window.resources.find(r => r.id === resourceId);
  if (!resource) return;
  
  const modal = document.getElementById('resourceFormModal');
  if (!modal) return;
  
  // 填充表单
  document.getElementById('resourceFormTitle').textContent = '编辑资源';
  document.getElementById('resourceId').value = resource.id;
  document.getElementById('resourceName').value = resource.name;
  document.getElementById('resourceUrl').value = resource.url;
  
  // 填充自定义属性
  const propertiesContainer = document.getElementById('customProperties');
  propertiesContainer.innerHTML = '';
  
  if (resource.properties) {
    Object.entries(resource.properties).forEach(([key, value]) => {
      addCustomPropertyToForm(key, value);
    });
  }
  
  // 显示模态框
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  
  // 聚焦名称输入框
  setTimeout(() => document.getElementById('resourceName').focus(), 100);
  
  // 绑定表单提交事件
  const form = document.getElementById('resourceForm');
  form.onsubmit = handleResourceFormSubmit;
};

// 关闭资源表单模态框
window.closeResourceFormModal = function() {
  const modal = document.getElementById('resourceFormModal');
  if (!modal) return;
  
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
};

// 添加自定义属性
window.addCustomProperty = function(key = '', value = '') {
  addCustomPropertyToForm(key, value);
};

// 添加自定义属性到表单
function addCustomPropertyToForm(key = '', value = '') {
  const container = document.getElementById('customProperties');
  const propertyId = Date.now();
  const propertyHtml = `
    <div class="flex gap-2 items-start" data-property-id="${propertyId}">
      <input type="text" placeholder="属性名" value="${key}" class="flex-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
      <input type="text" placeholder="属性值" value="${value}" class="flex-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
      <button type="button" onclick="removeCustomProperty(${propertyId})" class="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', propertyHtml);
}

// 移除自定义属性
window.removeCustomProperty = function(propertyId) {
  const property = document.querySelector(`[data-property-id="${propertyId}"]`);
  if (property) {
    property.remove();
  }
};

// 处理资源表单提交
function handleResourceFormSubmit(e) {
  e.preventDefault();
  
  const resourceId = document.getElementById('resourceId').value;
  const name = document.getElementById('resourceName').value.trim();
  const url = document.getElementById('resourceUrl').value.trim();
  
  if (!name) {
    showToast('请输入资源名称', 'error');
    return;
  }
  
  if (!url) {
    showToast('请输入资源URL', 'error');
    return;
  }
  
  // 收集自定义属性
  const properties = {};
  const propertyElements = document.querySelectorAll('#customProperties > div');
  
  propertyElements.forEach(element => {
    const inputs = element.querySelectorAll('input');
    const key = inputs[0].value.trim();
    const value = inputs[1].value.trim();
    
    if (key && value) {
      properties[key] = value;
    }
  });
  
  if (resourceId) {
    // 更新现有资源
    const index = window.resources.findIndex(r => r.id === resourceId);
    if (index !== -1) {
      window.resources[index] = {
        ...window.resources[index],
        name,
        url,
        properties
      };
      
      showToast('资源已更新', 'success');
    }
  } else {
    // 添加新资源
    const newResource = {
      id: Date.now().toString(),
      name,
      url,
      properties
    };
    
    window.resources.push(newResource);
    showToast('资源已添加', 'success');
  }
  
  // 关闭模态框
  closeResourceFormModal();
  
  // 重新渲染资源列表
  renderResources();
}

// 删除资源
window.deleteResource = function(resourceId) {
  const resource = window.resources.find(r => r.id === resourceId);
  if (!resource) return;
  
  if (confirm(`确定要删除资源 "${resource.name}" 吗？`)) {
    const index = window.resources.findIndex(r => r.id === resourceId);
    if (index !== -1) {
      window.resources.splice(index, 1);
      renderResources();
      showToast('资源已删除', 'info');
    }
  }
};

// 添加通道展开自动维护功能
function initChannelExpandFix() {
  // 在页面加载后重新计算一次
  setTimeout(recalculateExpandedChannels, 500);
  
  // 在窗口大小改变时重新计算
  window.addEventListener('resize', function() {
    recalculateExpandedChannels();
  });
  
  // 监听DOM变化，当内容变化时重新计算
  if (window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      const shouldRecalculate = mutations.some(mutation => {
        // 只有当变化影响到频道列表时才重新计算
        return mutation.target.classList && 
               (mutation.target.classList.contains('channel-item') || 
                mutation.target.closest('.channels-sublist'));
      });
      
      if (shouldRecalculate) {
        recalculateExpandedChannels();
      }
    });
    
    // 监视整个侧边栏的变化
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      observer.observe(sidebar, { 
        childList: true, 
        subtree: true, 
        attributes: true,
        characterData: true
      });
    }
  }
}

// 在DOM加载完成后初始化修复功能
document.addEventListener('DOMContentLoaded', function() {
  // 其他初始化...
  
  // 初始化通道展开自动维护功能
  initChannelExpandFix();
});

// 静音成员函数
window.muteMember = function() {
  if (!currentMember) return;
  
  const { username, userId, channelId } = currentMember;
  const loadingToast = showToast(`正在静音用户 ${username}...`, 'loading');
  
  // 隐藏成员操作菜单
  closeMemberActionsDropdown();
  
  // 调用API静音成员
  fetch('/api/mute_channel_member', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel_id: channelId,
      user_id: userId,
      mute_status: true
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // 静音成功
    hideToast(loadingToast);
    showToast(`已静音用户 ${username}`, 'success');
    
    // 重新加载频道成员列表以显示更新
    loadChannelMembers();
  })
  .catch(error => {
    console.error('静音成员错误:', error);
    hideToast(loadingToast);
    showToast(`静音用户失败: ${error.message}`, 'error');
  });
};

// 踢出成员函数
window.kickMember = function() {
  if (!currentMember) return;
  
  const { username, userId, channelId } = currentMember;
  
  // 显示确认对话框
  showConfirmDialog(
    '踢出成员', 
    `您确定要将 ${username} 踢出此频道吗？`,
    function() {
      const loadingToast = showToast(`正在移除用户 ${username}...`, 'loading');
      
      // 隐藏成员操作菜单
      closeMemberActionsDropdown();
      
      // 调用API移除成员
      fetch('/api/remove_channel_member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel_id: channelId,
          user_id: userId
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // 移除成功
        hideToast(loadingToast);
        showToast(`已将用户 ${username} 踢出频道`, 'success');
        
        // 重新加载频道成员列表以显示更新
        loadChannelMembers();
      })
      .catch(error => {
        console.error('踢出成员错误:', error);
        hideToast(loadingToast);
        showToast(`踢出用户失败: ${error.message}`, 'error');
      });
    }
  );
};

// 修改角色相关变量和函数
let roleOptionsVisible = false;
let roleOptionsPosition = { top: 0, left: 0 };

window.showRoleOptions = function(event) {
  event.stopPropagation();
  
  const memberActionsDropdown = document.getElementById('memberActionsDropdown');
  const roleOptionsDropdown = document.getElementById('roleOptionsDropdown');
  
  if (roleOptionsDropdown) {
    // 获取位置
    const rect = memberActionsDropdown.getBoundingClientRect();
    
    // 隐藏成员操作菜单
    memberActionsDropdown.classList.add('hidden', 'opacity-0');
    
    // 定位和显示角色选项菜单
    roleOptionsDropdown.style.top = `${rect.top}px`;
    roleOptionsDropdown.style.left = `${rect.left}px`;
    roleOptionsDropdown.classList.remove('hidden');
    
    // 添加动画效果
    setTimeout(() => {
      roleOptionsDropdown.classList.remove('opacity-0', 'translate-y-1');
    }, 10);
    
    roleOptionsVisible = true;
    
    // 阻止冒泡，避免立即关闭
    event.stopPropagation();
  }
};

window.hideRoleOptions = function() {
  const roleOptionsDropdown = document.getElementById('roleOptionsDropdown');
  
  if (roleOptionsDropdown) {
    // 添加隐藏动画
    roleOptionsDropdown.classList.add('opacity-0', 'translate-y-1');
    
    // 延迟后完全隐藏
    setTimeout(() => {
      roleOptionsDropdown.classList.add('hidden');
    }, 200);
    
    roleOptionsVisible = false;
  }
};

window.changeRole = function(role) {
  if (!currentMember) return;
  
  const { username, userId, channelId } = currentMember;
  const loadingToast = showToast(`Changing ${username}'s role to ${role}...`, 'loading');
  
  // 隐藏角色菜单
  hideRoleOptions();
  
  // 调用API修改角色
  fetch('/api/channel_member_role', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel_id: channelId,
      user_id: userId,
      role: role
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // 更新成功
    hideToast(loadingToast);
    showToast(`Changed ${username}'s role to ${role}`, 'success');
    
    // 重新加载频道成员列表以显示更新
    loadChannelMembers();
  })
  .catch(error => {
    console.error('更改角色错误:', error);
    hideToast(loadingToast);
    showToast(`Failed to change ${username}'s role: ${error.message}`, 'error');
  });
};

// 修改事件监听，关闭所有下拉菜单
document.addEventListener('click', function(event) {
  // ... existing code ...
  
  // 关闭角色选项下拉菜单
  if (roleOptionsVisible) {
    hideRoleOptions();
  }
});

// 打开添加资源模态框
// Open add resource modal
function openPanelAddResourceModal() {
  // 调用资源管理JS中的函数
  // Call function from resource management JS
  if (typeof openAddResourceModal === 'function') {
    openAddResourceModal();
  }
}
  