/**
 * Channel System - Supporting infinite levels of subgroup threads
 */

// 频道数据结构
let channelData = {
  publicChannels: [
    {
      id: 'internal',
      name: 'Internal',
      type: 'public',
      active: true,
      children: [
        {
          id: 'internal-annoucements',
          name: 'Announcements',
          type: 'public',
          active: false,
          children: []
        },
        {
          id: 'internal-technical',
          name: 'Technical',
          type: 'public',
          active: false,
          children: [
            {
              id: 'internal-technical-frontend', 
              name: 'Frontend',
              type: 'public',
              active: false,
              children: []
            },
            {
              id: 'internal-technical-backend',
              name: 'Backend',
              type: 'public',
              active: false,
              children: []
            }
          ]
        }
      ]
    },
    {
      id: 'general',
      name: 'general',
      type: 'public',
      active: false,
      children: []
    },
    {
      id: 'random',
      name: 'random',
      type: 'public',
      active: false,
      children: []
    }
  ],
  privateChannels: [
    {
      id: 'security',
      name: 'security',
      type: 'private',
      active: false,
      children: []
    },
    {
      id: 'admins',
      name: 'admins',
      type: 'private',
      active: false,
      children: []
    }
  ],
  directMessages: [
    {
      id: 'dm-root',
      name: 'root',
      type: 'dm',
      status: 'away',
      active: false
    },
    {
      id: 'dm-channelexport',
      name: 'channelexport',
      type: 'dm',
      status: 'offline',
      active: false
    },
    {
      id: 'dm-withers',
      name: 'withers (you)',
      type: 'dm',
      status: 'online',
      active: true
    }
  ]
};

// 当前活动频道
let activeChannelId = 'internal';

// 初始化频道树
function initChannels() {
  // 渲染公共频道
  renderChannelGroup('publicChannels', document.getElementById('publicChannelsGroup'));
  
  // 渲染私有频道
  renderChannelGroup('privateChannels', document.getElementById('privateChannelsGroup'));
  
  // 渲染私信
  renderDMs();
  
  // 初始化频道组展开/折叠功能
  initChannelGroupsToggle();
  
  // 初始化创建新频道按钮
  initCreateChannelButtons();
}

// 渲染频道组
function renderChannelGroup(groupKey, container) {
  if (!container) return;
  
  // 清空容器内容
  const channelList = container.querySelector('.channel-list');
  if (!channelList) return;
  
  // 清空现有内容
  channelList.innerHTML = '';
  
  // 递归生成频道树
  channelData[groupKey].forEach(channel => {
    const channelItem = createChannelElement(channel, 0);
    channelList.appendChild(channelItem);
  });
  
  // 添加浏览频道按钮
  const browseButton = document.createElement('button');
  browseButton.className = 'w-full text-left py-1.5 px-2.5 text-white/70 hover:text-white transition-colors flex items-center mt-2 hover:bg-white/5 rounded-md group';
  browseButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <span class="text-sm">Browse More Channels</span>
  `;
  channelList.appendChild(browseButton);
  
  // 确保渲染完成后重新绑定事件
  setTimeout(() => {
    if (window.rebindChannelEvents) {
      window.rebindChannelEvents();
    }
  }, 0);
}

// 防抖动函数，用于减少重复计算
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// GPU加速的动画处理函数
function animateWithRaf(element, startProps, endProps, duration, easing = t => t) {
  return new Promise(resolve => {
    const startTime = performance.now();
    
    // 预渲染优化
    element.style.willChange = Object.keys(endProps).join(', ');
    
    // 缓存开始状态，避免强制重排
    const initialState = {};
    Object.keys(startProps).forEach(key => {
      initialState[key] = window.getComputedStyle(element)[key];
      element.style[key] = startProps[key];
    });
    
    // 强制重排一次
    void element.offsetHeight;
    
    // 请求动画帧
    function animate(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      
      // 应用样式
      Object.keys(endProps).forEach(key => {
        // 处理数值型属性
        if (key === 'height' || key === 'opacity') {
          const start = parseFloat(startProps[key]);
          const end = parseFloat(endProps[key]);
          const current = start + (end - start) * easedProgress;
          element.style[key] = `${current}${key === 'opacity' ? '' : 'px'}`;
        } else {
          element.style[key] = endProps[key];
        }
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画完成
        element.style.willChange = 'auto';
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

// 缓动函数 - 平滑开始和结束
const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
const easeInOutQuint = t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

// 优化的递归创建频道元素
function createChannelElement(channel, level) {
  const wrapper = document.createElement('div');
  wrapper.dataset.channelId = channel.id;
  wrapper.className = 'channel-item';
  
  // 创建频道按钮
  const button = document.createElement('button');
  button.className = `w-full text-left py-1 px-3 ${channel.active ? 'bg-white/10' : 'hover:bg-white/10'} rounded mt-1 transition-colors flex items-center group`;
  const paddingLeft = level * 12 + 12;
  button.style.paddingLeft = `${paddingLeft}px`; // 根据层级增加缩进
  button.style.setProperty('--padding-left', `${paddingLeft}px`); // 设置CSS变量
  button.setAttribute('data-channel-id', channel.id);
  
  // 频道图标和名称
  let icon = '';
  if (channel.type === 'private') {
    icon = `
      <span class="text-white/60 mr-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </span>
    `;
  } else {
    icon = `<span class="text-white/80 mr-1.5">#</span>`;
  }
  
  // 如果有子频道，则添加展开/折叠图标
  let expandIcon = '';
  if (channel.children && channel.children.length > 0) {
    // 检查是否需要默认展开
    const isExpanded = channel.isExpanded || channel.children.some(c => c.active);
    
    // 创建可点击的展开图标
    expandIcon = document.createElement('div');
    expandIcon.className = 'expand-icon-wrapper cursor-pointer flex items-center justify-center mr-2';
    expandIcon.style.minWidth = '20px';
    expandIcon.style.height = '20px';
    expandIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="expand-icon h-5 w-5 text-white/90 transform ${isExpanded ? 'rotate-90' : 'rotate-0'}" 
           viewBox="0 0 20 20" fill="currentColor"
           style="transition: transform 0.2s ease-in-out; ${isExpanded ? 'transform: rotate(90deg);' : ''}">
        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
      </svg>
    `;
    
    // 展开按钮点击事件处理 - 单独绑定到展开图标
    expandIcon.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log("Clicked on expand icon area");
      
      // 直接获取当前按钮的父元素wrapper，然后找到对应的子频道容器
      const parentWrapper = this.closest('.channel-item');
      if (!parentWrapper) {
        console.log("Subchannel container not found");
        return;
      }
      
      // 查找直接子元素中的children-container
      const childrenContainer = parentWrapper.querySelector(':scope > .children-container');
      if (!childrenContainer) {
        console.log("Subchannels expanded");
        return;
      }
      
      // 获取展开图标
      const expandSvgIcon = this.querySelector('.expand-icon');
      if (!expandSvgIcon) {
        console.log("Expand icon not found");
        return;
      }
      
      // 切换展开状态
      toggleExpandState(childrenContainer, expandSvgIcon);
    });
  }
  
  // 设置频道名称和图标
  button.innerHTML = `
    ${icon}
    <span class="text-white/80 overflow-hidden text-ellipsis">${channel.name}</span>
    <span class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center" style="margin-left: auto; padding-left: 8px;">
      <button class="create-subchannel mr-1 p-0.5 text-white/60 hover:text-white" title="Create Subchannel">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
      <button class="channel-menu p-0.5 text-white/60 hover:text-white" title="More Options">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </button>
    </span>
  `;
  
  // 如果有展开图标，添加到按钮前面
  if (expandIcon) {
    button.insertBefore(expandIcon, button.firstChild);
  }
  
  wrapper.appendChild(button);
  
  // 如果有子频道，递归添加
  if (channel.children && channel.children.length > 0) {
    // 检查是否需要默认展开
    const isExpanded = channel.isExpanded || channel.children.some(c => c.active);
    
    const childrenContainer = document.createElement('div');
    childrenContainer.id = `channel-children-${channel.id}`; // 添加唯一ID
    childrenContainer.className = 'children-container';
    
    if (isExpanded) {
      // 展开状态的初始样式
      childrenContainer.classList.add('expanded');
      childrenContainer.style.display = 'block';
    } else {
      // 折叠状态的初始样式
      childrenContainer.style.display = 'none';
    }
    
    // 添加子频道元素
    channel.children.forEach(childChannel => {
      const childElement = createChannelElement(childChannel, level + 1);
      childrenContainer.appendChild(childElement);
    });
    
    wrapper.appendChild(childrenContainer);
    
    // 为创建子频道按钮添加事件
    const createSubchannelBtn = button.querySelector('.create-subchannel');
    if (createSubchannelBtn) {
      createSubchannelBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault(); // 防止事件冒泡
        console.log('Clicked on function button');
        showCreateChannelModal(channel.id);
      });
    }
  }
  
  // 添加点击事件 - 检测点击区域
  button.addEventListener('click', function(e) {
    // 获取点击位置相对于按钮的x坐标
    const clickX = e.clientX - button.getBoundingClientRect().left;
    
    console.log('Clicked on channel name area');
    
    // 检查点击元素是否是展开图标或其子元素
    const isExpandIcon = e.target.closest('.expand-icon-wrapper') || 
                         e.target.classList.contains('expand-icon') || 
                         (e.target.tagName === 'path' && e.target.closest('.expand-icon'));
    
    // 如果有子频道并且点击了展开图标区域
    if (channel.children && channel.children.length > 0 && isExpandIcon) {
      console.log('Clicked on expand icon area');
      e.stopPropagation();
      e.preventDefault();
      
      // 直接从当前按钮的父元素查找子频道容器
      const parentWrapper = button.closest('.channel-item');
      if (!parentWrapper) {
        console.log("Channel button not found");
        return;
      }
      
      // 查找直接子元素中的children-container
      const childrenContainer = parentWrapper.querySelector(':scope > .children-container');
      if (!childrenContainer) {
        console.log("Subchannels expanded");
        return;
      }
      
      // 获取展开图标
      const expandIcon = button.querySelector('.expand-icon');
      if (!expandIcon) {
        console.log("Expand icon not found");
        return;
      }
      
      // 切换展开/折叠状态
      toggleExpandState(childrenContainer, expandIcon);
      return;
    }
    
    // 检查其他功能按钮
    if (e.target.closest('.create-subchannel') || e.target.closest('.channel-menu')) {
      console.log('Clicked on function button');
      return; // 不做任何处理，让按钮自己处理事件
    }
    
    // 点击的是频道名称区域，切换活动频道
    console.log('Clicked on channel name area');
    setActiveChannel(channel.id);
  });
  
  return wrapper;
}

// 简化版的展开/折叠切换函数 - 彻底修复版
function toggleExpandState(container, icon) {
  if (!container) {
    console.log("Subchannel container not found");
    return;
  }
  
  if (!icon) {
    console.log("Expand icon not found");
    return;
  }
  
  // 检查当前状态
  const isExpanded = container.classList.contains('expanded');
  console.log("Toggling expand state:", isExpanded ? "collapse" : "expand");
  
  try {
    // 根据当前状态执行相反操作
    if (isExpanded) {
      // 从展开切换到折叠
      container.classList.remove('expanded');
      icon.style.transform = 'rotate(0deg)';
      icon.classList.remove('rotate-90');
      icon.classList.add('rotate-0');
      
      // 先做样式变化，再隐藏元素（避免抖动）
      setTimeout(() => {
        container.style.display = 'none';
      }, 10);
      
      console.log("Collapse operation completed");
    } else {
      // 从折叠切换到展开
      container.classList.add('expanded');
      container.style.display = 'block';
      
      // 确保渲染完成后再做旋转动画
      setTimeout(() => {
        icon.style.transform = 'rotate(90deg)';
        icon.classList.remove('rotate-0');
        icon.classList.add('rotate-90');
      }, 10);
      
      console.log("Expand operation completed");
    }
    
    // 确保重新计算高度
    if (typeof recalculateExpandedChannels === 'function') {
      setTimeout(recalculateExpandedChannels, 100);
    }
  } catch (err) {
    console.error("展开/折叠操作出错:", err);
  }
}

// 渲染私信列表
function renderDMs() {
  const container = document.getElementById('directMessagesGroup');
  if (!container) return;
  
  const dmList = container.querySelector('.channel-list');
  if (!dmList) return;
  
  // 清空现有内容
  dmList.innerHTML = '';
  
  // 生成私信列表
  channelData.directMessages.forEach(dm => {
    const dmItem = document.createElement('button');
    dmItem.className = `w-full text-left py-1 px-3 ${dm.active ? 'bg-white/15 hover:bg-white/20' : 'hover:bg-white/10'} rounded mt-1 transition-colors flex items-center group`;
    
    // 状态图标
    let statusColor = 'bg-gray-400';
    if (dm.status === 'online') statusColor = 'bg-green-400';
    else if (dm.status === 'away') statusColor = 'bg-yellow-400';
    
    dmItem.innerHTML = `
      <div class="relative mr-2 flex-shrink-0">
        <div class="w-4 h-4 rounded-full ${dm.name === 'root' ? 'bg-red-500' : dm.name === 'channelexport' ? 'bg-purple-500' : 'bg-green-500'} flex items-center justify-center text-[8px] font-bold shadow-sm">
          ${dm.name.charAt(0).toUpperCase()}
        </div>
        <div class="absolute -bottom-0.5 -right-0.5 w-2 h-2 ${statusColor} border border-blue-700 rounded-full"></div>
      </div>
      <span class="text-white/80">${dm.name}</span>
    `;
    
    // 添加点击事件
    dmItem.addEventListener('click', function() {
      setActiveChannel(dm.id);
    });
    
    dmList.appendChild(dmItem);
  });
  
  // 添加"添加队友"按钮
  const addButton = document.createElement('button');
  addButton.className = 'w-full text-left py-1.5 px-2.5 text-white/70 hover:text-white transition-colors flex items-center mt-2 hover:bg-white/5 rounded-md group';
  addButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
    <span class="text-sm">Add New Teammate</span>
  `;
  dmList.appendChild(addButton);
}

// 设置活动频道
function setActiveChannel(channelId) {
  // 递归函数，在频道树中查找并设置活动状态
  function updateChannelStatus(channels) {
    for (let i = 0; i < channels.length; i++) {
      if (channels[i].id === channelId) {
        channels[i].active = true;
        return true;
      } else if (channels[i].children && channels[i].children.length > 0) {
        channels[i].active = updateChannelStatus(channels[i].children);
        if (channels[i].active) return true;
      } else {
        channels[i].active = false;
      }
    }
    return false;
  }
  
  // 重置所有频道状态
  channelData.publicChannels.forEach(c => c.active = false);
  channelData.privateChannels.forEach(c => c.active = false);
  channelData.directMessages.forEach(c => c.active = false);
  
  // 查找并设置活动频道
  if (!updateChannelStatus(channelData.publicChannels)) {
    if (!updateChannelStatus(channelData.privateChannels)) {
      // 如果在频道中没找到，检查私信
      for (let i = 0; i < channelData.directMessages.length; i++) {
        if (channelData.directMessages[i].id === channelId) {
          channelData.directMessages[i].active = true;
          break;
        }
      }
    }
  }
  
  // 更新UI
  renderChannelGroup('publicChannels', document.getElementById('publicChannelsGroup'));
  renderChannelGroup('privateChannels', document.getElementById('privateChannelsGroup'));
  renderDMs();
  
  // 更新活动频道ID
  activeChannelId = channelId;
  
  // 这里可以添加加载频道内容的代码
  console.log(`Switched to channel: ${channelId}`);
}

// 初始化频道组展开/折叠功能
function initChannelGroupsToggle() {
  document.querySelectorAll('.channel-group > div:first-child').forEach(header => {
    header.addEventListener('click', function() {
      const parent = this.parentElement;
      const channelList = parent.querySelector('.channel-list');
      
      if (!channelList) return;
      
      // 防止频繁点击
      if (channelList.dataset.animating === 'true') {
        return;
      }
      
      // 标记动画进行中
      channelList.dataset.animating = 'true';
      
      // 预先计算，减少布局抖动
      const scrollHeight = channelList.scrollHeight;
      
      if (parent.dataset.state === 'collapsed') {
        // 展开频道组 - 使用优化的动画函数
        // 1. 先更新状态
        parent.dataset.state = 'expanded';
        
        // 2. 设置初始状态
        channelList.style.height = '0';
        channelList.style.opacity = '0';
        channelList.style.display = 'block';
        channelList.style.overflow = 'hidden';
        channelList.style.maxHeight = '1000px';
        
        // 3. 使用 RAF 和缓动函数执行动画
        requestAnimationFrame(() => {
          // 应用3D变换和GPU加速
          channelList.style.transform = 'translate3d(0,0,0)';
          
          // 执行高度和透明度动画
          animateWithRaf(channelList,
            { height: '0px', opacity: '0' },
            { height: `${scrollHeight}px`, opacity: '1' },
            200, // 更快的动画时间
            easeOutQuint // 更丝滑的缓动函数
          ).then(() => {
            // 动画完成，优化渲染
            if (parent.dataset.state === 'expanded' && channelList.parentNode) {
              channelList.style.height = 'auto';
              channelList.style.overflow = 'visible';
              channelList.dataset.animating = 'false';
            }
          });
          
          // 旋转箭头 - 独立动画避免阻塞
          const svg = header.querySelector('svg');
          if (svg) {
            svg.classList.add('rotate-90');
            svg.style.transition = 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)';
            svg.style.transform = 'rotate(90deg)';
          }
        });
      } else {
        // 折叠频道组 - 使用优化的动画函数
        // 1. 锁定当前高度
        channelList.style.height = `${scrollHeight}px`;
        channelList.style.overflow = 'hidden';
        
        // 2. 使用 RAF 和缓动函数执行动画
        requestAnimationFrame(() => {
          // 更新状态
          parent.dataset.state = 'collapsed';
          
          // 应用3D变换和GPU加速
          channelList.style.transform = 'translate3d(0,0,0)';
          
          // 执行高度和透明度动画
          animateWithRaf(channelList,
            { height: `${scrollHeight}px`, opacity: '1' },
            { height: '0px', opacity: '0' },
            200, // 更快的动画时间
            easeInOutQuint // 更丝滑的缓动函数
          ).then(() => {
            // 动画完成，优化渲染
            if (parent.dataset.state === 'collapsed' && channelList.parentNode) {
              channelList.style.display = 'none';
              channelList.style.maxHeight = '0';
              channelList.dataset.animating = 'false';
            }
          });
          
          // 旋转箭头 - 独立动画避免阻塞
          const svg = header.querySelector('svg');
          if (svg) {
            svg.classList.remove('rotate-90');
            svg.style.transition = 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)';
            svg.style.transform = 'rotate(0deg)';
          }
        });
      }
    });
  });
}

// 初始化创建频道按钮
function initCreateChannelButtons() {
  document.querySelectorAll('.channel-group .text-white\\/60.hover\\:text-white').forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      const groupId = this.closest('.channel-group').getAttribute('id');
      let parentId = null;
      
      if (groupId === 'publicChannelsGroup') {
        parentId = 'public';
      } else if (groupId === 'privateChannelsGroup') {
        parentId = 'private';
      }
      
      showCreateChannelModal(parentId);
    });
  });
}

// 显示创建频道模态框
function showCreateChannelModal(parentId) {
  // 创建模态框元素
  let modal = document.getElementById('createChannelModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'createChannelModal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 opacity-0 transition-opacity duration-300';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-md transform scale-95 transition-transform duration-300">
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-800 dark:text-white">Create New Channel</h3>
        </div>
        <div class="p-4">
          <form id="createChannelForm">
            <input type="hidden" id="parentChannelId" value="">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="channelName">
                Channel Name
              </label>
              <input type="text" id="channelName" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" placeholder="e.g.: marketing">
            </div>
            <div class="mb-4" id="channelTypeWrapper">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Channel Type
              </label>
              <div class="flex space-x-4">
                <label class="inline-flex items-center">
                  <input type="radio" name="channelType" value="public" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" checked>
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Public</span>
                </label>
                <label class="inline-flex items-center">
                  <input type="radio" name="channelType" value="private" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                  <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Private</span>
                </label>
              </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
              <button type="button" id="cancelCreateChannel" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:outline-none">
                Cancel
              </button>
              <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors focus:outline-none">
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加事件监听器
    document.getElementById('cancelCreateChannel').addEventListener('click', function() {
      closeCreateChannelModal();
    });
    
    document.getElementById('createChannelForm').addEventListener('submit', function(e) {
      e.preventDefault();
      createNewChannel();
    });
  }
  
  // 设置父频道ID
  document.getElementById('parentChannelId').value = parentId;
  
  // 根据父频道类型设置选项
  const channelTypeWrapper = document.getElementById('channelTypeWrapper');
  if (parentId === 'public') {
    channelTypeWrapper.style.display = 'block';
    document.querySelector('input[name="channelType"][value="public"]').checked = true;
  } else if (parentId === 'private') {
    channelTypeWrapper.style.display = 'block';
    document.querySelector('input[name="channelType"][value="private"]').checked = true;
  } else {
    // 子频道继承父频道类型
    channelTypeWrapper.style.display = 'none';
  }
  
  // 显示模态框
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    modal.querySelector('div').style.transform = 'scale(1)';
  });
  
  // 聚焦输入框
  document.getElementById('channelName').focus();
}

// 关闭创建频道模态框
function closeCreateChannelModal() {
  const modal = document.getElementById('createChannelModal');
  if (modal) {
    modal.style.opacity = '0';
    modal.querySelector('div').style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      document.getElementById('channelName').value = '';
      document.getElementById('parentChannelId').value = '';
    }, 300);
  }
}

// 创建新频道
function createNewChannel() {
  const channelName = document.getElementById('channelName').value.trim();
  const parentId = document.getElementById('parentChannelId').value;
  
  if (!channelName) return;
  
  // 生成唯一ID
  const channelId = `channel-${Date.now()}`;
  
  // 创建新频道对象
  const newChannel = {
    id: channelId,
    name: channelName,
    active: false,
    children: []
  };
  
  let targetParent = null;
  
  // 确定频道类型
  if (parentId === 'public' || parentId === 'private') {
    const channelType = document.querySelector('input[name="channelType"]:checked').value;
    newChannel.type = channelType;
    
    // 将频道添加到对应的分组
    if (channelType === 'public') {
      channelData.publicChannels.push(newChannel);
    } else {
      channelData.privateChannels.push(newChannel);
    }
  } else {
    // 查找父频道，添加到子频道列表
    const findParentAndAddChild = (channels) => {
      for (let i = 0; i < channels.length; i++) {
        if (channels[i].id === parentId) {
          // 继承父频道类型
          newChannel.type = channels[i].type;
          channels[i].children.push(newChannel);
          targetParent = channels[i];
          return true;
        } else if (channels[i].children && channels[i].children.length > 0) {
          if (findParentAndAddChild(channels[i].children)) {
            return true;
          }
        }
      }
      return false;
    };
    
    if (!findParentAndAddChild(channelData.publicChannels)) {
      findParentAndAddChild(channelData.privateChannels);
    }
  }
  
  // 更新UI
  renderChannelGroup('publicChannels', document.getElementById('publicChannelsGroup'));
  renderChannelGroup('privateChannels', document.getElementById('privateChannelsGroup'));
  
  // 关闭模态框
  closeCreateChannelModal();
  
  // 重新绑定频道点击事件（确保立即执行）
  if (window.rebindChannelEvents) {
    window.rebindChannelEvents();
  }
  
  // 确保父级频道处于展开状态
  if (parentId && parentId !== 'public' && parentId !== 'private') {
    setTimeout(() => {
      expandParentChannel(parentId);
    }, 50);
  }
  
  // 重新计算展开的通道高度
  setTimeout(() => {
    if (typeof recalculateExpandedChannels === 'function') {
      recalculateExpandedChannels();
    }
    
    // 再次重新计算（防止第一次计算不准确）
    setTimeout(() => {
      if (typeof recalculateExpandedChannels === 'function') {
        recalculateExpandedChannels();
      }
      
      // 切换到新创建的频道
      setActiveChannel(channelId);
    }, 300);
  }, 100);
}

// 辅助函数：确保父频道展开
function expandParentChannel(parentId) {
  if (!parentId || parentId === 'public' || parentId === 'private') return;
  
  console.log("Expanding subchannel container");
  
  // 找到父级频道元素
  const parentElement = document.querySelector(`div[data-channel-id="${parentId}"]`);
  if (!parentElement) {
    console.log("未找到父频道元素:", parentId);
    return;
  }
  
  // 找到子频道容器 - 使用直接子元素选择器
  const childrenContainer = parentElement.querySelector(':scope > .children-container');
  if (!childrenContainer) {
    console.log("未找到子频道容器");
    return;
  }
  
  // 如果已经展开，不需要操作
  if (childrenContainer.classList.contains('expanded')) {
    console.log("子频道已展开");
    return;
  }
  
  // 找到展开图标 - 先找按钮，再找图标
  const button = parentElement.querySelector('button[data-channel-id]');
  if (!button) {
    console.log("未找到频道按钮");
    return;
  }
  
  const expandIcon = button.querySelector('.expand-icon');
  if (!expandIcon) {
    console.log("未找到展开图标");
    return;
  }
  
  console.log("展开子频道容器");
  
  // 直接展开，不通过切换函数
  childrenContainer.classList.add('expanded');
  childrenContainer.style.display = 'block';
  expandIcon.style.transform = 'rotate(90deg)';
  expandIcon.classList.remove('rotate-0');
  expandIcon.classList.add('rotate-90');
  
  // 延迟重新计算高度
  if (typeof recalculateExpandedChannels === 'function') {
    setTimeout(recalculateExpandedChannels, 50);
  }
}

// 导出模块
window.ChannelSystem = {
  init: initChannels,
  getActiveChannelId: () => activeChannelId,
  getChannelData: () => JSON.parse(JSON.stringify(channelData))
}; 