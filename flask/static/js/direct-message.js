/**
 * Direct Message Functionality
 * Implements interaction logic for direct message popups
 */

// Store open chat windows
const activeChats = new Map();

// Store all users
let allUsers = [];

// Cache for real-time messages
const messageCache = {};

// Initialize direct message functionality
function initDirectMessages() {
  // Create DM trigger button
  createDMTrigger();
  
  // Initialize Socket.IO event listeners
  initDMSocketEvents();
  
  // Load all users
  loadAllUsers();
  
  // Check URL parameters, if there's a dm parameter, automatically open that chat
  checkURLForDM();
}

// Create direct message trigger button
function createDMTrigger() {
  const triggerButton = document.createElement('div');
  triggerButton.className = 'dm-trigger';
  triggerButton.innerHTML = '<i class="fas fa-comment-dots"></i>';
  triggerButton.title = 'Direct Message';
  
  // Create user list panel
  const usersPanel = document.createElement('div');
  usersPanel.className = 'dm-users-panel';
  usersPanel.innerHTML = `
    <div class="dm-users-header">Online Users</div>
    <div class="dm-users-list"></div>
  `;
  
  document.body.appendChild(triggerButton);
  document.body.appendChild(usersPanel);
  
  // Click trigger button to show user list
  triggerButton.addEventListener('click', () => {
    usersPanel.classList.toggle('active');
    
    // If user list is open, update online users
    if (usersPanel.classList.contains('active')) {
      loadAllUsers();
    }
  });
  
  // Click elsewhere on the page to close user list
  document.addEventListener('click', (e) => {
    if (!triggerButton.contains(e.target) && !usersPanel.contains(e.target)) {
      usersPanel.classList.remove('active');
    }
  });
}

// Load all users
function loadAllUsers() {
  fetch('/api/users')
    .then(response => response.json())
    .then(data => {
      allUsers = data.users;
      renderUsersList(allUsers);
    })
    .catch(error => {
      console.error('Failed to get user list:', error);
      // Use mock data for testing
      const mockUsers = [
        { user_id: 1, username: 'admin', is_active: true, avatar_url: null },
        { user_id: 2, username: 'alice', is_active: true, avatar_url: null },
        { user_id: 3, username: 'bob', is_active: false, avatar_url: null },
        { user_id: 4, username: 'charlie', is_active: true, avatar_url: null },
        { user_id: 5, username: 'user1', is_active: true, avatar_url: null },
        { user_id: 6, username: 'user2', is_active: false, avatar_url: null },
        { user_id: 7, username: 'user3', is_active: true, avatar_url: null }
      ];
      allUsers = mockUsers;
      renderUsersList(mockUsers);
    });
}

// Render user list
function renderUsersList(users) {
  const usersListElement = document.querySelector('.dm-users-list');
  usersListElement.innerHTML = '';
  
  // Filter out current user
  const filteredUsers = users.filter(user => user.user_id !== currentUser.id);
  
  if (filteredUsers.length === 0) {
    usersListElement.innerHTML = '<div class="p-4 text-center text-gray-500">No users available</div>';
    return;
  }
  
  // Sort by online status
  filteredUsers.sort((a, b) => {
    if (a.is_active === b.is_active) {
      return a.username.localeCompare(b.username);
    }
    return a.is_active ? -1 : 1;
  });
  
  filteredUsers.forEach(user => {
    const userItem = document.createElement('div');
    userItem.className = 'dm-user-item';
    userItem.dataset.userId = user.user_id;
    
    // Get avatar or first letter
    const avatarContent = user.avatar_url 
      ? `<img src="${user.avatar_url}" alt="${user.username}">`
      : user.username.charAt(0);
    
    // Get user status
    const statusClass = user.is_active ? 'online' : 'offline';
    const statusText = user.is_active ? 'Online' : 'Offline';
    
    userItem.innerHTML = `
      <div class="dm-user-avatar">${avatarContent}</div>
      <div class="dm-user-info">
        <div class="dm-user-name">${user.username}</div>
        <div class="dm-user-status ${statusClass}">${statusText}</div>
      </div>
    `;
    
    userItem.addEventListener('click', () => {
      openChatWindow(user);
      document.querySelector('.dm-users-panel').classList.remove('active');
    });
    
    usersListElement.appendChild(userItem);
  });
}

// Open chat window
function openChatWindow(user) {
  // If chat window for this user is already open, just activate it
  if (activeChats.has(user.user_id)) {
    const chatWindow = activeChats.get(user.user_id);
    
    // If window is minimized, restore it
    if (chatWindow.classList.contains('minimized')) {
      toggleMinimizeChatWindow(chatWindow);
    }
    
    // Focus the input field
    const inputElement = chatWindow.querySelector('.dm-input');
    if (inputElement) {
      inputElement.focus();
    }
    
    return;
  }
  
  // Create new chat window
  const chatWindow = document.createElement('div');
  chatWindow.className = 'dm-container';
  chatWindow.dataset.userId = user.user_id;
  
  // Get avatar or first letter
  const avatarContent = user.avatar_url 
    ? `<img src="${user.avatar_url}" alt="${user.username}">`
    : user.username.charAt(0);
  
  // Get user status
  const statusClass = user.is_active ? 'online' : 'offline';
  const statusText = user.is_active ? 'Online' : 'Offline';
  
  chatWindow.innerHTML = `
    <div class="dm-header">
      <div class="dm-header-left">
        <div class="dm-avatar">${avatarContent}</div>
        <div>
          <div class="dm-header-title">${user.username}</div>
          <div class="dm-header-status ${statusClass}">${statusText}</div>
        </div>
      </div>
      <div class="dm-header-actions">
        <button class="dm-header-button minimize-btn" title="Minimize">
          <i class="fas fa-minus"></i>
        </button>
        <button class="dm-header-button close-btn" title="Close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <div class="dm-body"></div>
    <div class="dm-footer">
      <div class="dm-input-container">
        <input type="text" class="dm-input" placeholder="Enter message...">
        <button class="dm-send-button">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(chatWindow);
  
  // Activate window
  setTimeout(() => {
    chatWindow.classList.add('active');
  }, 10);
  
  // Save chat window reference
  activeChats.set(user.user_id, chatWindow);
  
  // Focus input field
  const inputElement = chatWindow.querySelector('.dm-input');
  inputElement.focus();
  
  // Bind events
  bindChatWindowEvents(chatWindow, user);
  
  // Load message history
  loadDirectMessages(user.user_id);
}

// Bind chat window events
function bindChatWindowEvents(chatWindow, user) {
  // Close button
  const closeBtn = chatWindow.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => {
    closeChatWindow(chatWindow);
  });
  
  // Minimize button
  const minimizeBtn = chatWindow.querySelector('.minimize-btn');
  minimizeBtn.addEventListener('click', () => {
    toggleMinimizeChatWindow(chatWindow);
  });
  
  // Click header to minimize/restore
  const header = chatWindow.querySelector('.dm-header');
  header.addEventListener('click', (e) => {
    // Make sure not clicking on header buttons
    if (!e.target.closest('.dm-header-button')) {
      if (chatWindow.classList.contains('minimized')) {
        toggleMinimizeChatWindow(chatWindow);
      }
    }
  });
  
  // Send message
  const sendButton = chatWindow.querySelector('.dm-send-button');
  const inputElement = chatWindow.querySelector('.dm-input');
  
  const sendMessage = () => {
    const content = inputElement.value.trim();
    if (content) {
      // Send private message
      const message = {
        recipient_id: user.user_id,
        content: content,
        message_type: 'text'
      };
      
      sendDirectMessage(message);
      
      // Clear input field
      inputElement.value = '';
    }
  };
  
  sendButton.addEventListener('click', sendMessage);
  
  // Enter to send
  inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// Close chat window
function closeChatWindow(chatWindow) {
  // Get user ID
  const userId = parseInt(chatWindow.dataset.userId);
  
  // Animation
  chatWindow.classList.remove('active');
  
  // Delayed removal of DOM element
  setTimeout(() => {
    document.body.removeChild(chatWindow);
  }, 200);
  
  // Remove reference
  activeChats.delete(userId);
}

// Minimize/restore chat window
function toggleMinimizeChatWindow(chatWindow) {
  chatWindow.classList.toggle('minimized');
  
  // If restoring window, focus input field
  if (!chatWindow.classList.contains('minimized')) {
    const inputElement = chatWindow.querySelector('.dm-input');
    if (inputElement) {
      inputElement.focus();
    }
  }
}

// Load direct message history
function loadDirectMessages(recipientId) {
  fetch(`/api/direct_messages/${recipientId}`)
    .then(response => response.json())
    .then(data => {
      // Cache messages
      messageCache[recipientId] = data.messages;
      
      // Render messages
      renderMessages(recipientId, data.messages);
    })
    .catch(error => {
      console.error('Failed to get direct messages:', error);
      
      // Use mock data for testing
      const currentTime = new Date().toISOString();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60000).toISOString();
      
      const mockMessages = [
        {
          dm_id: 1,
          sender_id: currentUser.id,
          recipient_id: recipientId,
          content: 'Hello, this is a test message',
          created_at: tenMinutesAgo
        },
        {
          dm_id: 2,
          sender_id: recipientId,
          recipient_id: currentUser.id,
          content: 'Hi! Nice to receive your message',
          created_at: currentTime
        }
      ];
      
      // Cache messages
      messageCache[recipientId] = mockMessages;
      
      // Render messages
      renderMessages(recipientId, mockMessages);
    });
}

// Render messages
function renderMessages(recipientId, messages) {
  const chatWindow = activeChats.get(recipientId);
  if (!chatWindow) return;
  
  const messageBody = chatWindow.querySelector('.dm-body');
  messageBody.innerHTML = '';
  
  if (messages.length === 0) {
    messageBody.innerHTML = '<div class="text-center p-4 text-gray-500">No message history</div>';
    return;
  }
  
  // Render messages
  messages.forEach(message => {
    const isOutgoing = message.sender_id === currentUser.id;
    const messageElement = createMessageElement(message, isOutgoing);
    messageBody.appendChild(messageElement);
  });
  
  // Scroll to bottom
  messageBody.scrollTop = messageBody.scrollHeight;
}

// Create message element
function createMessageElement(message, isOutgoing) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `dm-message ${isOutgoing ? 'outgoing' : 'incoming'}`;
  messageDiv.dataset.messageId = message.dm_id;
  
  // Get user
  const user = isOutgoing ? currentUser : allUsers.find(u => u.user_id === message.sender_id);
  
  // Get avatar or first letter
  const avatarContent = user && user.avatar_url 
    ? `<img src="${user.avatar_url}" alt="${user.username}">`
    : (user ? user.username.charAt(0) : '?');
  
  // Format time
  const messageTime = formatMessageTime(message.created_at);
  
  messageDiv.innerHTML = `
    <div class="dm-message-avatar">${avatarContent}</div>
    <div>
      <div class="dm-message-content">${escapeHTML(message.content)}</div>
      <div class="dm-message-time">${messageTime}</div>
    </div>
  `;
  
  return messageDiv;
}

// Send direct message
function sendDirectMessage(message) {
  const recipientId = message.recipient_id;
  
  // Add temporary message to UI
  addTempMessage(recipientId, message.content);
  
  // Send to server
  fetch('/api/direct_messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  })
    .then(response => response.json())
    .then(data => {
      console.log('Direct message sent successfully:', data);
      // Update message list
      if (!messageCache[recipientId]) {
        messageCache[recipientId] = [];
      }
      messageCache[recipientId].push(data.message);
    })
    .catch(error => {
      console.error('Failed to send direct message:', error);
      showErrorToast('Message sending failed, please try again');
    });
}

// Add temporary message to UI
function addTempMessage(recipientId, content) {
  const chatWindow = activeChats.get(parseInt(recipientId));
  if (!chatWindow) return;
  
  const messageBody = chatWindow.querySelector('.dm-body');
  
  // Create temporary message
  const tempMessage = {
    dm_id: 'temp_' + Date.now(),
    sender_id: currentUser.id,
    recipient_id: recipientId,
    content: content,
    created_at: new Date().toISOString()
  };
  
  const messageElement = createMessageElement(tempMessage, true);
  messageBody.appendChild(messageElement);
  
  // Scroll to bottom
  messageBody.scrollTop = messageBody.scrollHeight;
}

// Initialize Socket.IO events
function initDMSocketEvents() {
  if (!socket) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  // Receive direct messages
  socket.on('direct_message', data => {
    console.log('Received direct message:', data);
    
    const senderId = data.sender.id;
    const message = data.message;
    
    // Update cache
    if (!messageCache[senderId]) {
      messageCache[senderId] = [];
    }
    messageCache[senderId].push(message);
    
    // If chat window exists, add message
    if (activeChats.has(senderId)) {
      const chatWindow = activeChats.get(senderId);
      const messageBody = chatWindow.querySelector('.dm-body');
      
      const messageElement = createMessageElement(message, false);
      messageBody.appendChild(messageElement);
      
      // Scroll to bottom
      messageBody.scrollTop = messageBody.scrollHeight;
    } else {
      // Otherwise, show notification and create new window
      showNotification('New Direct Message', `${data.sender.username}: ${message.content}`, () => {
        // When notification is clicked, open chat window
        const user = allUsers.find(u => u.user_id === senderId);
        if (user) {
          openChatWindow(user);
        } else {
          // If user not in cache, reload user list
          loadAllUsers().then(() => {
            const updatedUser = allUsers.find(u => u.user_id === senderId);
            if (updatedUser) {
              openChatWindow(updatedUser);
            }
          });
        }
      });
    }
  });
  
  // User status change
  socket.on('user_status_change', data => {
    const userId = data.user_id;
    const isActive = data.is_active;
    
    // Update user list
    const userIndex = allUsers.findIndex(u => u.user_id === userId);
    if (userIndex !== -1) {
      allUsers[userIndex].is_active = isActive;
      
      // If user list panel is being displayed, update it
      if (document.querySelector('.dm-users-panel.active')) {
        renderUsersList(allUsers);
      }
    }
    
    // Update chat window status
    if (activeChats.has(userId)) {
      const chatWindow = activeChats.get(userId);
      const statusElement = chatWindow.querySelector('.dm-header-status');
      
      if (statusElement) {
        const statusClass = isActive ? 'online' : 'offline';
        const statusText = isActive ? 'Online' : 'Offline';
        
        statusElement.className = `dm-header-status ${statusClass}`;
        statusElement.textContent = statusText;
      }
    }
  });
}

// Check URL parameters, automatically open direct message
function checkURLForDM() {
  const urlParams = new URLSearchParams(window.location.search);
  const dmUserId = urlParams.get('dm');
  
  if (dmUserId) {
    // Delayed loading, ensure user data is loaded
    setTimeout(() => {
      const userId = parseInt(dmUserId);
      const user = allUsers.find(u => u.user_id === userId);
      
      if (user) {
        openChatWindow(user);
      }
    }, 1000);
  }
}

// Utility function: Format message time
function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  
  // Today's messages only show time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Yesterday's messages show "Yesterday"
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // This year's messages show month/day and time
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' }) + ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Other cases show full date
  return date.toLocaleDateString() + ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Utility function: HTML escape
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Utility function: Show notification
function showNotification(title, body, onClick) {
  // Check notification permission
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: '/static/images/logo.png'
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onClick) onClick();
    };
  } else if (Notification.permission !== 'denied') {
    // Request permission
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showNotification(title, body, onClick);
      }
    });
  }
}

// Utility function: Show error toast
function showErrorToast(message) {
  // Implement a simple error toast
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #ef4444;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `;
  
  document.body.appendChild(toast);
  
  // Automatically disappear after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    toast.style.transition = 'all 0.3s ease-out';
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Initialize when page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check if global socket and currentUser variables exist
  if (typeof socket !== 'undefined' && typeof currentUser !== 'undefined') {
    initDirectMessages();
  } else {
    // Delayed initialization, wait for variables to be defined
    const checkInterval = setInterval(() => {
      if (typeof socket !== 'undefined' && typeof currentUser !== 'undefined') {
        clearInterval(checkInterval);
        initDirectMessages();
      }
    }, 500);
    
    // Set timeout to prevent infinite checking
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error('Failed to initialize direct message functionality: socket or currentUser not defined');
    }, 10000);
  }
}); 