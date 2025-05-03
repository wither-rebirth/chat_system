/**
 * Online Users Manager
 * Manages and displays online user information
 */

class OnlineUsersManager {
  constructor() {
    // Initialize online user related elements
    this.onlineUsersButton = document.getElementById('toggleOnlineUsers');
    this.onlineUsersCountDisplay = this.onlineUsersButton ? this.onlineUsersButton.querySelector('span') : null;
    this.onlineUsersDropdown = document.getElementById('onlineUsersDropdown');
    this.onlineUsersContainer = this.onlineUsersDropdown ? this.onlineUsersDropdown.querySelector('.max-h-60') : null;
    this.onlineUsersTitleElement = this.onlineUsersDropdown ? this.onlineUsersDropdown.querySelector('h3') : null;
    
    // Initialize online user data
    this.onlineUsers = {};
    this.onlineCount = 0;
    
    // Get current user ID
    this.currentUserId = window.currentUserId || (this.onlineUsersButton ? 
      parseInt(this.onlineUsersButton.getAttribute('data-user-id')) : 0);
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the manager
   */
  init() {
    // Set up event listeners
    this.setupEventListeners();
    
    // Get initial online user data
    this.fetchOnlineUsers();
    
    console.log('Online users manager initialized');
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for Socket.IO events - user online
    if (typeof socket !== 'undefined') {
      socket.on('user_online', (data) => {
        console.log('User online:', data);
        this.updateOnlineCount(data.online_count);
        this.addOnlineUser(data.user_id, data.username);
      });
      
      // Listen for Socket.IO events - user offline
      socket.on('user_offline', (data) => {
        console.log('User offline:', data);
        this.updateOnlineCount(data.online_count);
        this.removeOnlineUser(data.user_id);
      });
    }
    
    // Toggle dropdown when online users button is clicked
    if (this.onlineUsersButton) {
      this.onlineUsersButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        this.toggleDropdown();
      });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      if (this.onlineUsersDropdown && 
          !this.onlineUsersDropdown.contains(event.target) &&
          !this.onlineUsersButton.contains(event.target)) {
        this.closeDropdown();
      }
    });
  }
  
  /**
   * Toggle dropdown display/hide
   */
  toggleDropdown() {
    if (!this.onlineUsersDropdown) return;
    
    console.log('Toggling dropdown');
    
    if (this.onlineUsersDropdown.classList.contains('hidden')) {
      this.openDropdown();
    } else {
      this.closeDropdown();
    }
  }
  
  /**
   * Open dropdown
   */
  openDropdown() {
    if (!this.onlineUsersDropdown) return;
    
    console.log('Opening dropdown');
    this.onlineUsersDropdown.classList.remove('hidden');
    
    // Refresh latest data
    this.fetchOnlineUsers();
  }
  
  /**
   * Close dropdown
   */
  closeDropdown() {
    if (!this.onlineUsersDropdown) return;
    
    console.log('Closing dropdown');
    this.onlineUsersDropdown.classList.add('hidden');
  }
  
  /**
   * Get online user data
   */
  fetchOnlineUsers() {
    fetch('/api/online_users')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.onlineUsers = {};
          data.users.forEach(user => {
            this.onlineUsers[user.user_id] = user;
          });
          this.updateOnlineCount(data.online_count);
          this.renderOnlineUsers();
        }
      })
      .catch(error => {
        console.error('Failed to fetch online users:', error);
        // Test data if API is not implemented yet
        this.simulateOnlineUsers();
      });
  }
  
  /**
   * Simulate online user data (for development testing only)
   */
  simulateOnlineUsers() {
    // Current user
    this.onlineUsers = {
      // Current user
      [this.currentUserId]: {
        user_id: this.currentUserId,
        username: window.currentUsername || 'withers', 
        avatar: null,
        is_active: true
      },
      // root user
      2: {
        user_id: 2,
        username: 'root',
        avatar: null,
        is_active: true
      }
    };
    this.updateOnlineCount(Object.keys(this.onlineUsers).length);
    this.renderOnlineUsers();
  }
  
  /**
   * Update online user count
   */
  updateOnlineCount(count) {
    this.onlineCount = count;
    
    // Update displayed count
    if (this.onlineUsersCountDisplay) {
      this.onlineUsersCountDisplay.textContent = count;
    }
    
    // Update dropdown title
    if (this.onlineUsersTitleElement) {
      this.onlineUsersTitleElement.textContent = `Online Members (${count})`;
    }
  }
  
  /**
   * Add online user
   */
  addOnlineUser(userId, username) {
    userId = parseInt(userId);
    if (!this.onlineUsers[userId]) {
      this.onlineUsers[userId] = {
        user_id: userId,
        username: username,
        avatar: null,
        is_active: true
      };
      this.renderOnlineUsers();
    }
  }
  
  /**
   * Remove online user
   */
  removeOnlineUser(userId) {
    userId = parseInt(userId);
    if (this.onlineUsers[userId]) {
      delete this.onlineUsers[userId];
      this.renderOnlineUsers();
    }
  }
  
  /**
   * Render online user list
   */
  renderOnlineUsers() {
    if (!this.onlineUsersContainer) return;
    
    // Clear existing user list
    this.onlineUsersContainer.innerHTML = '';
    
    // Convert online users to array
    const usersArray = Object.values(this.onlineUsers);
    
    // If no online users
    if (usersArray.length === 0) {
      this.onlineUsersContainer.innerHTML = `
        <div class="p-4 text-center text-gray-500 dark:text-gray-400">
          No users online at the moment.
        </div>
      `;
      return;
    }
    
    // Add current user first
    const currentUser = usersArray.find(user => parseInt(user.user_id) === this.currentUserId);
    if (currentUser) {
      const userElement = this.createUserElement(currentUser, true);
      this.onlineUsersContainer.appendChild(userElement);
    }
    
    // Add other online users
    usersArray
      .filter(user => parseInt(user.user_id) !== this.currentUserId)
      .forEach(user => {
        const userElement = this.createUserElement(user, false);
        this.onlineUsersContainer.appendChild(userElement);
      });
  }
  
  /**
   * Create user element
   * @param {Object} user - User object
   * @param {boolean} isCurrentUser - Whether this is the current user
   * @returns {HTMLElement} - User element
   */
  createUserElement(user, isCurrentUser) {
    const userElement = document.createElement('div');
    userElement.className = 'flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
    userElement.setAttribute('data-user-id', user.user_id);
    
    // User avatar background color
    const bgColors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500', 'bg-pink-500'];
    const bgColor = bgColors[user.user_id % bgColors.length];
    
    // Get username first letter
    const firstLetter = user.username ? user.username.charAt(0).toUpperCase() : '?';
    
    // Online status indicator
    const statusIndicator = isCurrentUser ? 'bg-green-500' : 'bg-green-500';
    
    // Special tags like admin, you
    let specialTag = '';
    if (isCurrentUser) {
      specialTag = '<span class="ml-1.5 px-1.5 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">You</span>';
    } else if (user.username === 'root') {
      specialTag = '<span class="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">Admin</span>';
    }
    
    userElement.innerHTML = `
      <div class="flex items-center">
        <div class="relative flex-shrink-0">
          <div class="w-9 h-9 rounded-full ${bgColor} flex items-center justify-center text-white font-semibold shadow-sm">
            ${user.avatar ? `<img src="${user.avatar}" alt="${user.username}" class="w-full h-full rounded-full object-cover">` : firstLetter}
          </div>
          <div class="absolute bottom-0 right-0 w-2.5 h-2.5 ${statusIndicator} border-2 border-white dark:border-gray-800 rounded-full"></div>
        </div>
        <div class="ml-3 flex-1">
          <div class="flex items-center">
            <p class="font-medium text-gray-800 dark:text-white text-sm">${user.username}</p>
            ${specialTag}
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Active now</p>
        </div>
      </div>
      <button class="text-${isCurrentUser ? 'gray-300 dark:text-gray-600 cursor-not-allowed' : 'blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'} px-2 py-1 text-xs rounded transition-colors" ${isCurrentUser ? 'disabled' : ''}>
        Message
      </button>
    `;
    
    // Add message button click event
    if (!isCurrentUser) {
      const messageButton = userElement.querySelector('button');
      messageButton.addEventListener('click', () => {
        console.log(`Send message to ${user.username}`);
        // Implement private messaging functionality here
        alert(`About to send message to ${user.username}`);
      });
    }
    
    return userElement;
  }
}

// Initialize the online users manager
document.addEventListener('DOMContentLoaded', () => {
  window.onlineUsersManager = new OnlineUsersManager();
}); 