document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme settings first for better performance
  initThemeSettings();
  
  // Initialize modules
  initThemeToggle();
  initSearch();
  initPanels();
  
  // Channel list expand/collapse functionality
  initChannelGroups();
  
  // Load channel system components
  loadScript('/static/js/components/channels.js', function() {
    // Initialize channel system
    if (window.ChannelSystem && typeof window.ChannelSystem.init === 'function') {
      window.ChannelSystem.init();
    }
  });
  
  // Initialize online users manager
  if (typeof window.onlineUsersManager === 'undefined') {
    if (typeof OnlineUsersManager !== 'undefined') {
      window.onlineUsersManager = new OnlineUsersManager();
    } else {
      // If OnlineUsersManager class is undefined, try loading the script
      loadScript('/static/js/online-users-manager.js', function() {
        if (typeof OnlineUsersManager !== 'undefined') {
          window.onlineUsersManager = new OnlineUsersManager();
        }
      });
    }
  }
  
  initMessageInput();
  initWelcomeBanner();
});

// Dynamically load JavaScript files
function loadScript(src, callback) {
  const script = document.createElement('script');
  script.src = src;
  script.onload = callback;
  script.onerror = function() {
    console.error('Failed to load script:', src);
  };
  document.head.appendChild(script);
}

// 优化的主题切换功能
function initThemeToggle() {
  const toggleDark = document.getElementById('toggleDark');
  if (toggleDark) {
    // 添加优化类以减少重绘
    toggleDark.classList.add('theme-optimized');
    
    toggleDark.addEventListener('click', function(e) {
      // 防抖处理
      if (toggleDark.dataset.switching === 'true') return;
      toggleDark.dataset.switching = 'true';
      
      // 添加按钮按压动画
      toggleDark.classList.add('theme-button-active');
      setTimeout(() => {
        toggleDark.classList.remove('theme-button-active');
      }, 150);
      
      // 使用高效的主题切换
      performThemeSwitch();
      
      // 重置防抖标志
      setTimeout(() => {
        toggleDark.dataset.switching = 'false';
      }, 250);
    });
  }
}

// 高性能主题切换实现
function performThemeSwitch() {
  const htmlElement = document.documentElement;
  const isDarkMode = htmlElement.classList.contains('dark');
  
  // 添加切换状态类来触发平滑过渡
  document.body.classList.add('theme-switching');
  
  // 使用requestAnimationFrame确保流畅动画
  requestAnimationFrame(() => {
    // 切换主题类
    htmlElement.classList.toggle('dark');
    
    // 保存用户偏好
    const newTheme = htmlElement.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    
    // 更新CSS变量（如果需要）
    updateThemeVariables(newTheme);
    
    // 触发自定义事件
    const themeChangeEvent = new CustomEvent('themechange', {
      detail: { theme: newTheme, previousTheme: isDarkMode ? 'dark' : 'light' }
    });
    document.dispatchEvent(themeChangeEvent);
    
    // 移除切换状态类
    setTimeout(() => {
      document.body.classList.remove('theme-switching');
    }, 200);
  });
}

// 更新主题相关CSS变量
function updateThemeVariables(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.style.setProperty('--theme-overlay-color', 'rgba(0, 0, 0, 0.1)');
  } else {
    root.style.setProperty('--theme-overlay-color', 'rgba(255, 255, 255, 0.1)');
  }
}

// 初始化主题设置
function initThemeSettings() {
  // Check locally stored theme preference
  const savedTheme = localStorage.getItem('theme');
  
  // Apply saved theme or default theme
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    updateThemeVariables('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
    updateThemeVariables('light');
  } else if (savedTheme === null) {
    // If no saved preference, check system preference
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      document.documentElement.classList.add('dark');
      updateThemeVariables('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      updateThemeVariables('light');
      localStorage.setItem('theme', 'light');
    }
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    // Only follow system theme if user hasn't explicitly set a preference
    const currentSavedTheme = localStorage.getItem('theme');
    if (currentSavedTheme === null) {
      if (e.matches) {
        document.documentElement.classList.add('dark');
        updateThemeVariables('dark');
      } else {
        document.documentElement.classList.remove('dark');
        updateThemeVariables('light');
      }
    }
  });
}

// Add click event for individual channel group header
function attachChannelGroupClickHandler(header) {
  if (!header || header.hasAttribute('data-initialized')) return;
  
  header.setAttribute('data-initialized', 'true');
  
  header.addEventListener('click', function(e) {
    // If clicking on SVG or its child elements, stop propagation
    if (e.target.tagName === 'svg' || e.target.tagName === 'path') {
      e.stopPropagation();
    }
    
    // Get child channel list element
    const sublist = this.nextElementSibling;
    if (!sublist || !sublist.classList.contains('channels-sublist')) {
      return; // Ensure it's a valid sublist
    }
    
    // Get arrow icon
    const arrow = this.querySelector('svg.transform');
    
    // Check if currently expanded
    const isExpanded = this.getAttribute('data-expanded') === 'true';
    
    if (!isExpanded) {
      // Expand sublist
      sublist.style.display = 'block';
      
      // Ensure DOM is updated before setting height
      setTimeout(() => {
        // Calculate actual height of sublist
        const height = Array.from(sublist.children).reduce((total, el) => total + el.offsetHeight + 2, 0);
        sublist.style.maxHeight = `${height}px`;
        sublist.style.opacity = '1';
      }, 10);
      
      // Rotate arrow
      if (arrow) {
        arrow.classList.remove('-rotate-90');
      }
      
      // Update state
      this.setAttribute('data-expanded', 'true');
    } else {
      // Collapse sublist
      sublist.style.maxHeight = '0';
      sublist.style.opacity = '0';
      
      // Delay hiding until animation completes
      setTimeout(() => {
        sublist.style.display = 'none';
      }, 300);
      
      // Rotate arrow
      if (arrow) {
        arrow.classList.add('-rotate-90');
      }
      
      // Update state
      this.setAttribute('data-expanded', 'false');
    }
  });
}

function initChannelGroups() {
  // Add click events for all existing chat room headers
  document.querySelectorAll('.room-header').forEach(header => {
    attachChannelGroupClickHandler(header);
  });
  
  // Monitor DOM changes to handle newly added channels
  if (window.MutationObserver) {
    const sidebarObserver = new MutationObserver(function(mutations) {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              // Check if added node is a channel group header
              if (node.classList && node.classList.contains('room-header')) {
                attachChannelGroupClickHandler(node);
              }
              
              // Also check for channel group headers inside the added node
              const headers = node.querySelectorAll ? node.querySelectorAll('.room-header') : [];
              headers.forEach(header => {
                attachChannelGroupClickHandler(header);
              });
            }
          });
        }
      });
    });
    
    // Monitor sidebar changes
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      sidebarObserver.observe(sidebar, { 
        childList: true, 
        subtree: true 
      });
    }
  }
  
  // Automatically expand chat room containing active channel
  const activeChannel = document.querySelector('.channel-item.active');
  if (activeChannel) {
    // Find parent chat room header
    const parentSublist = activeChannel.closest('.channels-sublist');
    const parentHeader = parentSublist?.previousElementSibling;
    
    if (parentHeader && parentSublist && parentHeader.classList.contains('room-header')) {
      // Expand chat room containing active channel
      parentSublist.style.display = 'block';
      
      // Calculate actual height of sublist
      const height = Array.from(parentSublist.children).reduce((total, el) => total + el.offsetHeight + 2, 0);
      parentSublist.style.maxHeight = `${height}px`;
      parentSublist.style.opacity = '1';
      
      // Update arrow and state
      const arrow = parentHeader.querySelector('svg.transform');
      if (arrow) {
        arrow.classList.remove('-rotate-90');
      }
      parentHeader.setAttribute('data-expanded', 'true');
    }
  } else {
    // Default to expanding first chat room
    const firstHeader = document.querySelector('.room-header');
    if (firstHeader) {
      firstHeader.click();
    }
  }
}

// Global function to rebind events when new channels are added
window.rebindChannelEvents = function() {
  document.querySelectorAll('.room-header:not([data-initialized])').forEach(header => {
    attachChannelGroupClickHandler(header);
  });
  
  // Recalculate heights
  recalculateExpandedChannels();
};

// Recalculate and apply heights for all expanded chat room sublists
function recalculateExpandedChannels() {
  document.querySelectorAll('.room-header[data-expanded="true"]').forEach(header => {
    const sublist = header.nextElementSibling;
    if (sublist && sublist.classList.contains('channels-sublist')) {
      // Ensure it's in display state
      sublist.style.display = 'block';
      
      // Recalculate height
      const height = Array.from(sublist.children).reduce((total, el) => total + el.offsetHeight + 2, 0);
      sublist.style.maxHeight = `${height}px`;
      sublist.style.opacity = '1';
    }
  });
}

// Initialize welcome banner
function initWelcomeBanner() {
  const closeWelcomeBanner = document.getElementById('closeWelcomeBanner');
  const welcomeBanner = document.getElementById('welcomeBanner');
  
  if (closeWelcomeBanner && welcomeBanner) {
    closeWelcomeBanner.addEventListener('click', function() {
      welcomeBanner.classList.add('hidden');
      // Save closed state to localStorage
      localStorage.setItem('welcomeBannerClosed', 'true');
    });
    
    // If user has previously closed welcome banner, hide it
    if (localStorage.getItem('welcomeBannerClosed') === 'true') {
      welcomeBanner.classList.add('hidden');
    }
  }
}

// Globally available utility functions
window.closePanel = function(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.add('leaving');
    panel.classList.remove('entering');
    
    // Add translate-x-full class after animation ends
    setTimeout(() => {
      panel.classList.add('translate-x-full');
      panel.classList.remove('leaving');
    }, 400); // Animation duration
  }
};

window.openPanel = function(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.remove('translate-x-full');
    panel.classList.add('entering');
    
    // Remove entering class after animation ends
    setTimeout(() => {
      panel.classList.remove('entering');
    }, 400); // Animation duration
  }
};

window.closeAllUsersModal = function() {
  const allUsersModal = document.getElementById('allUsersModal');
  allUsersModal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
};

window.closeDescriptionModal = function() {
  const editDescriptionModal = document.getElementById('editDescriptionModal');
  editDescriptionModal.classList.add('invisible');
  document.body.classList.remove('overflow-hidden');
};

// Close Set Header modal
window.closeEditHeaderModal = function() {
  const editHeaderModal = document.getElementById('editHeaderModal');
  editHeaderModal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
};

// Open Set Header modal
window.openEditHeaderModal = function() {
  const editHeaderModal = document.getElementById('editHeaderModal');
  const headerInput = document.getElementById('headerInput');
  const headerCharCount = document.getElementById('headerCharCount');
  
  // Get current header content
  const currentHeader = document.getElementById('channelHeader');
  if (currentHeader) {
    headerInput.value = currentHeader.textContent || '';
    headerCharCount.textContent = headerInput.value.length + '/128';
  } else {
    headerInput.value = '';
    headerCharCount.textContent = '0/128';
  }
  
  // Show modal
  editHeaderModal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  
  // Focus input
  setTimeout(() => {
    headerInput.focus();
  }, 100);
};

// Save channel header
window.saveHeader = function() {
  const headerInput = document.getElementById('headerInput');
  const headerText = headerInput.value.trim();
  
  // Validation logic if needed
  if (headerText.length > 128) {
    // Show error message
    alert('Header content cannot exceed 128 characters');
    return;
  }
  
  // Save logic
  const channelHeader = document.getElementById('channelHeader');
  if (channelHeader) {
    channelHeader.textContent = headerText;
  } else {
    // If element doesn't exist, create a new one
    const channelNameContainer = document.querySelector('.channelNameContainer');
    if (channelNameContainer) {
      const newHeader = document.createElement('span');
      newHeader.id = 'channelHeader';
      newHeader.textContent = headerText;
      newHeader.className = 'ml-2 text-sm text-gray-600 dark:text-gray-400 font-normal';
      channelNameContainer.appendChild(newHeader);
    }
  }
  
  // Show success message
  showToast('Channel header has been updated', 'success');
  
  // Close modal
  closeEditHeaderModal();
};

// Show toast message
window.showToast = function(message, type = 'info') {
  // Remove old toast
  const oldToast = document.querySelector('.toast-notification');
  if (oldToast) {
    oldToast.remove();
  }
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = 'toast-notification ' + (type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300');
  
  // Set icon
  let icon = '';
  if (type === 'success') {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>`;
  } else {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`;
  }
  
  toast.innerHTML = `
    <div class="flex items-center">
      ${icon}
      <span>${message}</span>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(toast);
  
  // Show animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto close
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}; 