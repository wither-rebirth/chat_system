/**
 * UI Fix Script
 * Used to fix functionality issues with top buttons and sidebar interactions
 */

// Enable debug output
const DEBUG = false;

// Debug log function
function debug(message, data) {
  if (DEBUG) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  debug('UI fix script loaded');
  
  // Force trigger JS refresh to solve initial rendering issues
  setTimeout(function() {
    // Force redraw all channel expansion states
    forceSidebarUpdate();
    // Analyze and fix issues
    analyzeRoomsAndChannels();
  }, 100);
  
  // Fix online users button functionality
  const toggleOnlineUsers = document.getElementById('toggleOnlineUsers');
  const onlineUsersDropdown = document.getElementById('onlineUsersDropdown');
  
  if (toggleOnlineUsers && onlineUsersDropdown) {
    debug('Register online users button events');
    toggleOnlineUsers.addEventListener('click', function(e) {
      e.stopPropagation();
      if (onlineUsersDropdown.classList.contains('opacity-0') || onlineUsersDropdown.classList.contains('invisible')) {
        // Open dropdown menu
        onlineUsersDropdown.classList.remove('opacity-0', 'invisible');
        onlineUsersDropdown.classList.add('opacity-100', 'visible');
      } else {
        // Close dropdown menu
        onlineUsersDropdown.classList.remove('opacity-100', 'visible');
        onlineUsersDropdown.classList.add('opacity-0', 'invisible');
      }
    });
  } else {
    debug('Cannot find online users button or dropdown menu', { toggleOnlineUsers, onlineUsersDropdown });
  }
  
  // Fix pinned messages button functionality
  const togglePinned = document.getElementById('togglePinned');
  const pinnedPanel = document.getElementById('pinnedPanel');
  const closePinnedPanel = document.getElementById('closePinnedPanel');
  
  if (togglePinned && pinnedPanel) {
    debug('Register pinned messages button events');
    togglePinned.addEventListener('click', function(e) {
      e.stopPropagation();
      if (pinnedPanel.classList.contains('translate-x-full')) {
        // Open pinned messages panel
        pinnedPanel.classList.remove('translate-x-full');
      } else {
        // Close pinned messages panel
        pinnedPanel.classList.add('translate-x-full');
      }
    });
  } else {
    debug('Cannot find pinned messages button or panel', { togglePinned, pinnedPanel });
  }
  
  // Add functionality to close pinned messages panel button
  if (closePinnedPanel && pinnedPanel) {
    debug('Register close pinned messages panel button event');
    closePinnedPanel.addEventListener('click', function() {
      // Close pinned messages panel
      pinnedPanel.classList.add('translate-x-full');
    });
  }
  
  // Fix help button functionality
  const helpButton = document.getElementById('helpButton');
  const helpDropdown = document.getElementById('helpDropdown');
  
  if (helpButton && helpDropdown) {
    debug('Register help button events');
    helpButton.addEventListener('click', function(e) {
      e.stopPropagation();
      if (helpDropdown.classList.contains('opacity-0') || helpDropdown.classList.contains('invisible')) {
        // Open help dropdown menu
        helpDropdown.classList.remove('opacity-0', 'invisible');
        helpDropdown.classList.add('opacity-100', 'visible');
      } else {
        // Close help dropdown menu
        helpDropdown.classList.remove('opacity-100', 'visible');
        helpDropdown.classList.add('opacity-0', 'invisible');
      }
    });
  } else {
    debug('Cannot find help button or dropdown menu', { helpButton, helpDropdown });
  }
  
  // Close all dropdown menus and panels when clicking other areas of the document
  document.addEventListener('click', function(e) {
    // Close online users dropdown menu
    if (onlineUsersDropdown && toggleOnlineUsers && !toggleOnlineUsers.contains(e.target) && !onlineUsersDropdown.contains(e.target)) {
      onlineUsersDropdown.classList.remove('opacity-100', 'visible');
      onlineUsersDropdown.classList.add('opacity-0', 'invisible');
    }
    
    // Close help dropdown menu
    if (helpDropdown && helpButton && !helpButton.contains(e.target) && !helpDropdown.contains(e.target)) {
      helpDropdown.classList.remove('opacity-100', 'visible');
      helpDropdown.classList.add('opacity-0', 'invisible');
    }

    // Close pinned messages panel (when clicking outside the panel)
    if (pinnedPanel && togglePinned && !togglePinned.contains(e.target) && !pinnedPanel.contains(e.target)) {
      pinnedPanel.classList.add('translate-x-full');
    }
  });
  
  // Generic panel close function
  window.closePanel = function(panelId) {
    debug(`Closing panel: ${panelId}`);
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.add('translate-x-full');
    } else {
      debug(`Panel doesn't exist: ${panelId}`);
    }
  };

  // Initialize sidebar interactions
  initSidebarInteractions();
  
  // Handle events for add new group and channel buttons
  setupAddButtons();

  // Initialize sidebar and top search functionality
  initSidebarSearch();
  initTopbarSearch();
});

/**
 * Setup add button event handlers
 */
function setupAddButtons() {
  debug('Setting up add button events');
  
  // Find all add buttons in groups
  const addButtons = document.querySelectorAll('.channel-group > div:first-child button');
  
  addButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Get parent group information
      const groupDiv = this.closest('.channel-group');
      const groupId = groupDiv.id;
      const groupTitle = groupDiv.querySelector('.channel-group-title').textContent.trim();
      
      debug(`Clicked add button: ${groupId} (${groupTitle})`);
      
      // Show create new group dialog
      showCreateDialog(groupId, groupTitle);
    });
  });
}

/**
 * Show create new group dialog
 */
function showCreateDialog(groupId, groupTitle) {
  // Remove existing dialog if present
  const existingDialog = document.getElementById('createDialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  // Determine the creation type
  let type = 'room';
  let title = 'Create New Chat Room';
  
  if (groupId === 'publicChannelsGroup') {
    type = 'public_room';
    title = 'Create New Public Chat Room';
  } else if (groupId === 'privateChannelsGroup') {
    type = 'private_room';
    title = 'Create New Project Chat Room';
  } else if (groupId === 'directMessagesGroup') {
    type = 'direct_message';
    title = 'Create New Conversation';
  }
  
  // Create dialog HTML
  const dialogHTML = `
    <div id="createDialog" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">${title}</h3>
        
        <form id="createForm" class="space-y-4">
          <input type="hidden" name="type" value="${type}">
          <input type="hidden" name="group_id" value="${groupId}">
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input type="text" name="name" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <textarea name="description" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" rows="2"></textarea>
          </div>
          
          <div id="createChannelFields" class="hidden space-y-4">
            <div class="flex items-center">
              <input type="checkbox" id="createDefaultChannel" name="create_default_channel" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" checked>
              <label for="createDefaultChannel" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">Create default channel (general)</label>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" id="cancelCreate" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Cancel
            </button>
            <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Create
            </button>
          </div>
        </form>
        
        <div id="createStatus" class="mt-4 hidden">
          <p class="text-sm text-center text-gray-500 dark:text-gray-400" id="statusMessage"></p>
        </div>
      </div>
    </div>
  `;
  
  // Add dialog to document
  document.body.insertAdjacentHTML('beforeend', dialogHTML);
  
  // Get dialog elements
  const dialog = document.getElementById('createDialog');
  const form = document.getElementById('createForm');
  const cancelButton = document.getElementById('cancelCreate');
  
  // If creating a room, show create default channel option
  if (type === 'public_room' || type === 'private_room') {
    document.getElementById('createChannelFields').classList.remove('hidden');
  }
  
  // Cancel button event
  cancelButton.addEventListener('click', function() {
    dialog.remove();
  });
  
  // Form submit event
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Disable form elements
    const formElements = form.elements;
    for (let i = 0; i < formElements.length; i++) {
      formElements[i].disabled = true;
    }
    
    // Show loading status
    const statusDiv = document.getElementById('createStatus');
    const statusMessage = document.getElementById('statusMessage');
    statusDiv.classList.remove('hidden');
    statusMessage.textContent = 'Creating...';
    
    // Build data to send
    const data = {
      type: form.querySelector('[name="type"]').value,
      name: form.querySelector('[name="name"]').value,
      description: form.querySelector('[name="description"]').value || '',
    };
    
    // Handle checkbox elements
    const checkboxElement = form.querySelector('[name="create_default_channel"]');
    if (checkboxElement) {
      data.create_default_channel = checkboxElement.checked;
    }
    
    debug('Preparing to send data:', data);
    
    // Send AJAX request to backend
    fetch('/api/create_group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken() // Get CSRF token
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      debug('Received response:', response.status);
      if (!response.ok) {
        throw new Error('Network error: ' + response.status);
      }
      return response.json();
    })
    .then(result => {
      debug('Creation result:', result);
      
      if (result.success) {
        // Close dialog immediately
        dialog.remove();
        
        // If room was successfully created, add to current page
        if (result.room) {
          addRoomToUI(result.room, groupId);
        }
        
        // Show a brief success message
        showToast('Created successfully!');
      } else {
        // Enable form elements
        for (let i = 0; i < formElements.length; i++) {
          formElements[i].disabled = false;
        }
        statusMessage.textContent = result.message || 'Creation failed, please try again.';
      }
    })
    .catch(error => {
      debug('Creation error:', error);
      statusMessage.textContent = 'An error occurred, please try again.';
      
      // Enable form elements
      for (let i = 0; i < formElements.length; i++) {
        formElements[i].disabled = false;
      }
    });
  });
}

/**
 * Show a brief toast message
 */
function showToast(message, type = 'success') {
  // Create Toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 bg-${type}-500 text-white py-2 px-4 rounded shadow-lg z-50 transform transition-transform duration-300`;
  toast.textContent = message;
  
  // Add to document
  document.body.appendChild(toast);
  
  // Animation display
  setTimeout(() => {
    toast.classList.add('translate-y-2');
  }, 10);
  
  // Remove after 0.8 seconds
  setTimeout(() => {
    toast.classList.add('opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 800);
}

/**
 * Get CSRF token
 */
function getCSRFToken() {
  const tokenElement = document.querySelector('meta[name="csrf-token"]');
  return tokenElement ? tokenElement.getAttribute('content') : '';
}

/**
 * Add new room to UI
 */
function addRoomToUI(room, groupId) {
  debug('Adding room to UI:', { room, groupId });
  
  // Find target group's channel list
  const channelList = document.querySelector(`#${groupId} .channel-list`);
  if (!channelList) {
    debug('Channel list not found:', groupId);
    return;
  }
  
  // Create room's HTML
  const roomHTML = `
    <div class="room-item mb-2">
      <div data-room-id="${room.room_id}" data-expanded="false" class="room-header flex items-center justify-between py-1 px-2 text-white/80 hover:text-white hover:bg-white/5 rounded cursor-pointer">
        <div class="flex items-center space-x-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white/70" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" clip-rule="evenodd" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          <span class="text-sm font-medium">${room.room_name}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white/60 transform transition-transform duration-200 -rotate-90" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </div>
      
      <div class="channels-sublist ml-3 mt-1 space-y-0.5 transition-all duration-200 ease-in-out overflow-hidden" style="max-height: 0; opacity: 0; display: none;">
        ${room.channels ? room.channels.map(channel => `
          <div data-channel-id="${channel.channel_id}" class="channel-item flex items-center px-2 py-1 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-md cursor-pointer">
            <span class="mr-1.5 text-white/50">#</span>
            <span>${channel.channel_name}</span>
          </div>
        `).join('') : ''}
      </div>
    </div>
  `;
  
  // Add to channel list
  channelList.insertAdjacentHTML('beforeend', roomHTML);
  
  // Ensure group and channel list are visible
  const groupElement = document.getElementById(groupId);
  if (groupElement) {
    groupElement.setAttribute('data-state', 'expanded');
    channelList.style.display = 'block';
  }
  
  // Add events to newly added room
  const newRoomHeader = channelList.querySelector(`.room-item:last-child .room-header[data-room-id="${room.room_id}"]`);
  if (newRoomHeader) {
    const arrow = newRoomHeader.querySelector('svg:last-child');
    const channelsList = newRoomHeader.nextElementSibling;
    
    // Set initial state as collapsed
    newRoomHeader.dataset.expanded = 'false';
    arrow.style.transform = 'rotate(-90deg)';
    channelsList.style.maxHeight = '0';
    channelsList.style.opacity = '0';
    channelsList.style.display = 'none';
    
    newRoomHeader.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.dataset.expanded === 'true') {
        this.dataset.expanded = 'false';
        arrow.style.transform = 'rotate(-90deg)';
        channelsList.style.maxHeight = '0';
        channelsList.style.opacity = '0';
        setTimeout(() => {
          channelsList.style.display = 'none';
        }, 200);
      } else {
        this.dataset.expanded = 'true';
        arrow.style.transform = 'rotate(0deg)';
        channelsList.style.display = 'block';
        requestAnimationFrame(() => {
          channelsList.style.maxHeight = channelsList.scrollHeight + 'px';
          channelsList.style.opacity = '1';
        });
      }
    });
  }
}

/**
 * Force update sidebar expand/collapse state
 */
function forceSidebarUpdate() {
  debug('Force update sidebar expand/collapse state');
  
  // Set all channel groups to expanded state
  document.querySelectorAll('.channel-group').forEach(group => {
    group.setAttribute('data-state', 'expanded');
    const channelList = group.querySelector('.channel-list');
    if (channelList) {
      channelList.style.display = 'block';
      channelList.style.maxHeight = 'none';
      channelList.style.opacity = '1';
    }
  });
  
  // Set all rooms to expanded state
  document.querySelectorAll('.room-header').forEach(header => {
    header.setAttribute('data-expanded', 'true');
    const roomItem = header.closest('.room-item');
    if (roomItem) {
      const channelsList = roomItem.querySelector('.channels-sublist');
      if (channelsList) {
        channelsList.style.display = 'block';
      }
    }
  });
  
  // Ensure arrow directions are correct
  document.querySelectorAll('.room-header svg:last-child').forEach(arrow => {
    arrow.style.transform = 'rotate(0deg)';
  });
  
  document.querySelectorAll('.channel-group > div:first-child svg').forEach(arrow => {
    arrow.style.transform = 'rotate(90deg)';
  });
}

/**
 * Analyze room and channel data in the page
 */
function analyzeRoomsAndChannels() {
  debug('Begin analyzing room and channel data');
  
  // Look for project discussion room (ID=3)
  const projectRoom = document.querySelector('.room-header[data-room-id="3"]');
  if (projectRoom) {
    debug('Found project chat room', projectRoom);
    const roomItem = projectRoom.closest('.room-item');
    if (roomItem) {
      const channelsList = roomItem.querySelector('.channels-sublist');
      if (channelsList) {
        const channels = channelsList.querySelectorAll('.channel-item');
        debug(`Project chat room has ${channels.length} channels`, {
          channels: Array.from(channels).map(el => ({
            id: el.getAttribute('data-channel-id'),
            name: el.textContent.trim()
          }))
        });
      } else {
        debug('Project chat room channel list not found', { roomItem });
      }
    }
  } else {
    debug('Project chat room (ID=3) not found');
    
    // List all rooms
    const allRooms = document.querySelectorAll('.room-header');
    debug(`Found ${allRooms.length} rooms`, {
      rooms: Array.from(allRooms).map(el => ({
        id: el.getAttribute('data-room-id'),
        name: el.textContent.trim()
      }))
    });
  }
  
  // Group analysis
  const privateChannelGroup = document.getElementById('privateChannelsGroup');
  const projectChannelGroup = document.getElementById('projectChannelsGroup');
  
  const targetGroup = privateChannelGroup || projectChannelGroup;
  
  if (targetGroup) {
    debug('Found project group', targetGroup);
    const channelLists = targetGroup.querySelectorAll('.channels-sublist');
    debug(`Project group has ${channelLists.length} channel lists`);
  } else {
    debug('Project group (privateChannelsGroup/projectChannelsGroup) not found');
  }
}

/**
 * Initialize sidebar interactions
 */
function initSidebarInteractions() {
  debug('Initialize sidebar interactions');
  
  // Channel group expand/collapse
  document.querySelectorAll('.channel-group > div:first-child').forEach(header => {
    const arrow = header.querySelector('svg');
    const group = header.closest('.channel-group');
    const list = group.querySelector('.channel-list');
    
    // Set initial state
    if (group.dataset.state === 'expanded') {
      arrow.style.transform = 'rotate(90deg)';
      list.style.display = 'block';
    } else {
      arrow.style.transform = 'rotate(0deg)';
      list.style.display = 'none';
    }
    
    header.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (group.dataset.state === 'expanded') {
        group.dataset.state = 'collapsed';
        arrow.style.transform = 'rotate(0deg)';
        list.style.display = 'none';
      } else {
        group.dataset.state = 'expanded';
        arrow.style.transform = 'rotate(90deg)';
        list.style.display = 'block';
      }
    });
  });

  // Room expand/collapse
  document.querySelectorAll('.room-header').forEach(header => {
    const arrow = header.querySelector('svg:last-child');
    const channelsList = header.nextElementSibling;
    
    // Set initial state
    if (header.dataset.expanded === 'true') {
      arrow.style.transform = 'rotate(0deg)';
      if (channelsList) {
        channelsList.style.maxHeight = channelsList.scrollHeight + 'px';
        channelsList.style.opacity = '1';
        channelsList.style.display = 'block';
      }
    } else {
      arrow.style.transform = 'rotate(-90deg)';
      if (channelsList) {
        channelsList.style.maxHeight = '0';
        channelsList.style.opacity = '0';
        channelsList.style.display = 'none';
      }
    }
    
    header.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (header.dataset.expanded === 'true') {
        header.dataset.expanded = 'false';
        arrow.style.transform = 'rotate(-90deg)';
        if (channelsList) {
          channelsList.style.maxHeight = '0';
          channelsList.style.opacity = '0';
          setTimeout(() => {
            channelsList.style.display = 'none';
          }, 200);
        }
      } else {
        header.dataset.expanded = 'true';
        arrow.style.transform = 'rotate(0deg)';
        if (channelsList) {
          channelsList.style.display = 'block';
          // Use requestAnimationFrame to ensure display:block takes effect before setting maxHeight
          requestAnimationFrame(() => {
            channelsList.style.maxHeight = channelsList.scrollHeight + 'px';
            channelsList.style.opacity = '1';
          });
        }
      }
    });
  });
  
  debug('Sidebar interaction initialization completed');
}

// Open edit description modal
window.openEditDescriptionModal = function() {
  const modal = document.getElementById('editDescriptionModal');
  if (!modal) return;
  
  // Show modal
  modal.classList.remove('invisible', 'opacity-0');
  
  // Set modal content animation
  setTimeout(() => {
    const content = modal.querySelector('div');
    if (content) {
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    }
  }, 10);
  
  // Focus on textarea
  setTimeout(() => {
    const textarea = document.getElementById('modalDescriptionInput');
    if (textarea) {
      textarea.focus();
    }
  }, 300);
}

// Close edit description modal
window.closeEditDescriptionModal = function() {
  const modal = document.getElementById('editDescriptionModal');
  if (!modal) return;
  
  // Set content animation
  const content = modal.querySelector('div');
  if (content) {
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
  }
  
  // Hide modal
  setTimeout(() => {
    modal.classList.add('invisible', 'opacity-0');
  }, 200);
}

// Save channel description
window.saveChannelDescription = function() {
  const channelId = document.getElementById('channelIdInput').value;
  const description = document.getElementById('modalDescriptionInput').value;
  
  if (!channelId) {
    console.log('No channel selected, cannot save description');
    showToast('Please select a channel first', 'warning');
    return;
  }
  
  console.log('Saving channel description', { channelId, description });
  
  // Send request to server
  fetch('/api/update_channel_description', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    },
    body: JSON.stringify({
      channel_id: channelId,
      description: description
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log('Save result', result);
    
    if (result.success) {
      // Update UI display
      const descElem = document.getElementById('channelDescription');
      if (descElem) {
        const span = descElem.querySelector('span');
        if (span) {
          if (description && description.trim() !== '') {
            span.textContent = description;
          } else {
            span.textContent = 'Add channel description';
          }
        }
      }
      
      // Update active_channel object description (if exists)
      if (window.activeChannel) {
        window.activeChannel.description = description;
      }
      
      // Close modal
      closeEditDescriptionModal();
      
      // Show success message
      showToast('Description updated successfully');
    } else {
      showToast(result.message || 'Failed to update description', 'error');
    }
  })
  .catch(error => {
    console.error('Save error', error);
    showToast('An error occurred while saving the description', 'error');
  });
}

// Open resource management modal
window.openResourceManagementModal = function() {
  const modal = document.getElementById('resourceManagementModal');
  if (!modal) return;
  
  // Show modal
  modal.classList.remove('invisible', 'opacity-0');
  
  // Set modal content animation
  setTimeout(() => {
    const content = modal.querySelector('div');
    if (content) {
      content.classList.remove('scale-95', 'opacity-0');
      content.classList.add('scale-100', 'opacity-100');
    }
  }, 10);
  
  // Initialize file upload
  initFileUpload();
  
  // Initialize search and sort
  initSearchAndSort();
  
  // Load resource list
  loadResources();
}

// Close resource management modal
window.closeResourceManagementModal = function() {
  const modal = document.getElementById('resourceManagementModal');
  if (!modal) return;
  
  // Set content animation
  const content = modal.querySelector('div');
  if (content) {
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
  }
  
  // Hide modal
  setTimeout(() => {
    modal.classList.add('invisible', 'opacity-0');
  }, 200);
}

// Load resource list
function loadResources() {
  debug('Loading resources');
  
  // Show loading state
  const resourceGrid = document.querySelector('#resourceManagementModal .grid');
  if (resourceGrid) {
    resourceGrid.innerHTML = `
      <div class="col-span-full flex items-center justify-center py-10">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        <span class="ml-3 text-gray-500 dark:text-gray-400">Loading resources...</span>
      </div>
    `;
  }
  
  // Get query parameters
  const searchInput = document.querySelector('#resourceManagementModal input[type="text"]');
  const typeSelect = document.querySelector('#resourceManagementModal select:first-of-type');
  const sortSelect = document.querySelector('#resourceManagementModal select:last-of-type');
  
  let url = '/api/resources?';
  
  if (searchInput && searchInput.value) {
    url += `search=${encodeURIComponent(searchInput.value)}&`;
  }
  
  if (typeSelect && typeSelect.value !== 'all') {
    url += `type=${encodeURIComponent(typeSelect.value)}&`;
  }
  
  if (sortSelect && sortSelect.value) {
    const [sortBy, sortOrder] = sortSelect.value.split('_');
    if (sortBy && sortOrder) {
      url += `sort_by=${encodeURIComponent(sortBy)}&sort_order=${encodeURIComponent(sortOrder)}&`;
    }
  }
  
  // Debug URL
  debug('Resource loading URL', url);
  
  // Send API request
  fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok: ' + response.status);
    }
    return response.json();
  })
  .then(data => {
    debug('Resources loaded successfully', data);
    
    if (data.success) {
      renderResources(data.resources);
    } else {
      showToast(data.message || 'Failed to load resources');
      renderResources([]);
    }
  })
  .catch(error => {
    debug('Failed to load resources', error);
    showToast('Failed to load resources');
    renderResources([]);
  });
}

// Render resource list
function renderResources(resources) {
  const resourceGrid = document.querySelector('#resourceManagementModal .grid');
  if (!resourceGrid) return;
  
  // Clear existing content
  resourceGrid.innerHTML = '';
  
  if (resources.length === 0) {
    // Show empty state
    resourceGrid.innerHTML = `
      <div class="col-span-full text-center py-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p class="mt-2 text-gray-500 dark:text-gray-400">No resources found</p>
        <button onclick="openAddResourceModal()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
          Add Your First Resource
        </button>
      </div>
    `;
    return;
  }
  
  // Add resource cards
  resources.forEach(resource => {
    const resourceCard = createResourceCard(resource);
    resourceGrid.appendChild(resourceCard);
  });
}

// Create resource card
function createResourceCard(resource) {
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow';
  
  // Select icon based on resource type
  let icon = '';
  switch (resource.type) {
    case 'document':
      icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>`;
      break;
    case 'folder':
      icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>`;
      break;
    case 'link':
      icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>`;
      break;
    default:
      icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>`;
  }
  
  card.innerHTML = `
    <div class="flex items-start justify-between">
      <div class="flex items-start gap-3">
        <div class="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          ${icon}
        </div>
        <div class="min-w-0">
          <h3 class="font-medium text-gray-900 dark:text-white truncate" title="${resource.name}">${resource.name}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2" title="${resource.description}">${resource.description || 'No description'}</p>
          <div class="flex items-center gap-2 mt-2">
            <a href="${resource.url}" target="_blank" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              ${resource.url}
            </a>
          </div>
        </div>
      </div>
      <button onclick="showResourceActions(${resource.id})" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
    </div>
    <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center">
        <div class="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-semibold">
          ${resource.created_by.charAt(0).toUpperCase()}
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-1.5">${resource.created_by}</span>
      </div>
      <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(resource.created_at)}</span>
    </div>
  `;
  
  return card;
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Show resource actions menu
window.showResourceActions = function(resourceId) {
  debug('Show resource actions menu', resourceId);
  
  // Remove existing actions menu
  closeActionsMenu();
  
  // Create actions menu
  const actionsMenu = document.createElement('div');
  actionsMenu.id = 'resourceActionsMenu';
  actionsMenu.className = 'fixed bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50';
  actionsMenu.setAttribute('data-resource-id', resourceId);
  
  actionsMenu.innerHTML = `
    <button onclick="editResource(${resourceId})" class="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
      Edit
    </button>
    <button onclick="deleteResource(${resourceId})" class="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Delete
    </button>
  `;
  
  // Add menu to document
  document.body.appendChild(actionsMenu);
  
  // Save triggering button
  const button = event.currentTarget || event.target.closest('button');
  const rect = button.getBoundingClientRect();
  
  // Position menu
  actionsMenu.style.top = `${rect.bottom + 5}px`;
  actionsMenu.style.left = `${rect.left}px`;
  
  // Ensure menu doesn't exceed window right boundary
  const menuRect = actionsMenu.getBoundingClientRect();
  if (menuRect.right > window.innerWidth) {
    actionsMenu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
  }
  
  // Prevent event propagation, avoid immediate close
  event.stopPropagation();
  
  // Close menu when clicking outside document
  setTimeout(() => {
    document.addEventListener('click', closeActionsMenu);
  }, 100);
}

// Close resource actions menu
function closeActionsMenu(e) {
  const actionsMenu = document.getElementById('resourceActionsMenu');
  if (!actionsMenu) return;
  
  // If no event or clicked not menu itself, close menu
  if (!e || !actionsMenu.contains(e.target)) {
    actionsMenu.remove();
    document.removeEventListener('click', closeActionsMenu);
  }
}

// Edit resource
window.editResource = function(resourceId) {
  debug('Edit resource', resourceId);
  closeActionsMenu();
  
  // Show loading message
  showToast('Loading resource...');
  
  // Get resource data
  fetch(`/api/resources/${resourceId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCSRFToken()
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      openResourceFormModal('edit', data.resource);
    } else {
      showToast(data.message || 'Failed to load resource');
    }
  })
  .catch(error => {
    debug('Failed to get resource data', error);
    showToast('Failed to load resource');
  });
}

// Delete resource
window.deleteResource = function(resourceId) {
  debug('Delete resource', resourceId);
  closeActionsMenu();
  
  if (confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
    // Show loading message
    showToast('Deleting resource...');
    
    // Send delete request
    fetch(`/api/resources/${resourceId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        showToast(data.message || 'Resource deleted successfully');
        loadResources();
      } else {
        showToast(data.message || 'Failed to delete resource');
      }
    })
    .catch(error => {
      debug('Failed to delete resource', error);
      showToast('Failed to delete resource');
    });
  }
}

// Open add resource modal
// Open add resource modal
function openUIAddResourceModal() {
  // Call function from resource management JS
  if (typeof openAddResourceModal === 'function') {
    openAddResourceModal();
  }
}

// Open resource form modal
function openResourceFormModal(mode, resource = null) {
  const modal = document.getElementById('resourceFormModal');
  if (!modal) return;
  
  // Set modal title
  const title = document.getElementById('resourceFormTitle');
  if (title) {
    title.textContent = mode === 'add' ? 'Add Resource' : 'Edit Resource';
  }
  
  // Set form data
  const form = document.getElementById('resourceForm');
  if (form) {
    // Reset form
    form.reset();
    
    // If editing mode, fill form data
    if (mode === 'edit' && resource) {
      document.getElementById('resourceId').value = resource.id;
      document.getElementById('resourceName').value = resource.name;
      document.getElementById('resourceUrl').value = resource.url;
      
      // Clear custom properties
      const customPropertiesContainer = document.getElementById('customProperties');
      if (customPropertiesContainer) {
        customPropertiesContainer.innerHTML = '';
      }
      
      // If there are custom properties, add to form
      if (resource.custom_properties) {
        for (const [key, value] of Object.entries(resource.custom_properties)) {
          addCustomProperty(key, value);
        }
      }
    }
    
    // Register form submit event
    form.onsubmit = function(e) {
      e.preventDefault();
      
      const formData = {
        name: document.getElementById('resourceName').value,
        url: document.getElementById('resourceUrl').value,
        custom_properties: {}
      };
      
      // Get custom properties
      const propertyRows = document.querySelectorAll('#customProperties .property-row');
      propertyRows.forEach(row => {
        const key = row.querySelector('input[name="property_key"]').value;
        const value = row.querySelector('input[name="property_value"]').value;
        
        if (key && value) {
          formData.custom_properties[key] = value;
        }
      });
      
      debug('Resource data submission', formData);
      
      // Disable form elements
      const formElements = form.elements;
      for (let i = 0; i < formElements.length; i++) {
        formElements[i].disabled = true;
      }
      
      // Show loading message
      showToast('Saving resource...');
      
      let url = '/api/resources';
      let method = 'POST';
      
      if (mode === 'edit') {
        const resourceId = document.getElementById('resourceId').value;
        url = `/api/resources/${resourceId}`;
        method = 'PUT';
      }
      
      // Send save request
      fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(formData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // Enable form elements
        for (let i = 0; i < formElements.length; i++) {
          formElements[i].disabled = false;
        }
        
        if (data.success) {
          showToast(data.message || 'Resource saved successfully');
          closeResourceFormModal();
          loadResources();
        } else {
          showToast(data.message || 'Failed to save resource');
        }
      })
      .catch(error => {
        debug('Failed to save resource', error);
        showToast('Failed to save resource');
        
        // Enable form elements
        for (let i = 0; i < formElements.length; i++) {
          formElements[i].disabled = false;
        }
      });
    };
  }
  
  // Show modal
  modal.classList.remove('hidden');
}

// Close resource form modal
window.closeResourceFormModal = function() {
  const modal = document.getElementById('resourceFormModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Add custom property field
window.addCustomProperty = function(key = '', value = '') {
  const customPropertiesContainer = document.getElementById('customProperties');
  if (!customPropertiesContainer) return;
  
  const propertyRow = document.createElement('div');
  propertyRow.className = 'property-row flex items-center gap-2';
  
  propertyRow.innerHTML = `
    <input type="text" name="property_key" placeholder="Key" value="${key}" class="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 outline-none text-sm" />
    <input type="text" name="property_value" placeholder="Value" value="${value}" class="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 outline-none text-sm" />
    <button type="button" onclick="removeCustomProperty(this)" class="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;
  
  customPropertiesContainer.appendChild(propertyRow);
}

// Remove custom property field
window.removeCustomProperty = function(button) {
  const propertyRow = button.closest('.property-row');
  if (propertyRow) {
    propertyRow.remove();
  }
}

// Initialize resource form file upload functionality
function initFileUpload() {
  const resourceFileInput = document.getElementById('resourceFileInput');
  const uploadArea = document.querySelector('#resourceManagementModal .border-dashed');
  
  if (!resourceFileInput || !uploadArea) return;
  
  // Click upload area to trigger file selection
  uploadArea.addEventListener('click', () => {
    resourceFileInput.click();
  });
  
  // Handle drag and drop functionality
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
  });
  
  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
  });
  
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  });
  
  // When file is selected immediately upload
  resourceFileInput.addEventListener('change', () => {
    if (resourceFileInput.files.length > 0) {
      handleFileUpload(resourceFileInput.files);
    }
  });
}

// Handle file upload
function handleFileUpload(files) {
  console.log('[UI] Handling uploaded files:', files);
  
  // Show upload status
  showUploadStatus(files);
  
  // Create FormData for each file and upload
  Array.from(files).forEach(file => {
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'X-CSRFToken': getCSRFToken()
      }
    })
    .then(response => response.json())
    .then(data => {
      console.log('[UI] File upload successful:', data);
      
      if (data.success) {
        // Show success notification
        showToast('File uploaded successfully', 'success');
        
        // Add file to resource list
        addResourceToList(data.file);
        
        // If resource form is open, automatically fill form fields
        const resourceForm = document.getElementById('resourceForm');
        if (resourceForm && !resourceForm.classList.contains('hidden')) {
          // Set URL field
          const urlInput = document.getElementById('resourceUrl');
          if (urlInput) {
            urlInput.value = data.file.url;
          }
          
          // Set name field
          const nameInput = document.getElementById('resourceName');
          if (nameInput && !nameInput.value) {
            nameInput.value = data.file.name;
          }
          
          // Set description field - use original file name as description
          const descriptionInput = document.getElementById('resourceDescription');
          if (descriptionInput && !descriptionInput.value) {
            console.log('Setting resource description to:', data.file.description || data.file.original_name);
            descriptionInput.value = data.file.description || data.file.original_name || data.file.name.split('.')[0];
          }
          
          // Automatically set type to file
          const fileTypeOption = document.querySelector('.resource-type-option[data-type="file"]');
          if (fileTypeOption) {
            // Trigger click event to select file type
            fileTypeOption.click();
          }
        }
      } else {
        // Show error message
        showToast(data.message || 'Upload failed', 'error');
      }
    })
    .catch(error => {
      console.error('[UI] File upload error:', error);
      showToast('An error occurred while uploading file', 'error');
    });
  });
}

// Initialize search and sort functionality
function initSearchAndSort() {
  const searchInput = document.querySelector('#resourceManagementModal input[type="text"]');
  const typeSelect = document.querySelector('#resourceManagementModal select:first-of-type');
  const sortSelect = document.querySelector('#resourceManagementModal select:last-of-type');
  
  if (searchInput) {
    // Debounce search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadResources();
      }, 500);
    });
    
    // Search immediately when Enter key is pressed
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        loadResources();
      }
    });
  }
  
  if (typeSelect) {
    typeSelect.addEventListener('change', loadResources);
  }
  
  if (sortSelect) {
    sortSelect.addEventListener('change', loadResources);
  }
}

// Initialize sidebar search functionality (search users and channels)
function initSidebarSearch() {
  const sidebarSearchInput = document.querySelector('.sidebar-search input');
  if (!sidebarSearchInput) return;
  
  // Add class name to sidebar search box for easier CSS style differentiation
  sidebarSearchInput.classList.add('sidebar-search-input');
  
  // Add search event listener
  sidebarSearchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Search users and channels
    searchUsersAndChannels(searchTerm);
  });
  
  // Trigger search when pressing Enter key
  sidebarSearchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      const searchTerm = e.target.value.toLowerCase().trim();
      searchUsersAndChannels(searchTerm);
    }
  });
}

// Search users and channels
function searchUsersAndChannels(searchTerm) {
  // Get all channel items
  const channelItems = document.querySelectorAll('.channel-item');
  // Get all direct message user items
  const directMessageItems = document.querySelectorAll('[data-user-id]');
  
  // If search term is empty, show all items
  if (searchTerm === '') {
    channelItems.forEach(item => {
      item.style.display = '';
    });
    directMessageItems.forEach(item => {
      item.style.display = '';
    });
    
    // Restore room expansion state
    document.querySelectorAll('.room-header').forEach(header => {
      const wasExpanded = header.getAttribute('data-was-expanded');
      if (wasExpanded === 'true') {
        const channelsList = header.nextElementSibling;
        if (channelsList && channelsList.classList.contains('channels-sublist')) {
          channelsList.style.maxHeight = `${channelsList.scrollHeight}px`;
          channelsList.style.opacity = '1';
          header.setAttribute('data-expanded', 'true');
        }
      }
    });
    
    return;
  }
  
  // Save expansion state before searching
  document.querySelectorAll('.room-header').forEach(header => {
    const isExpanded = header.getAttribute('data-expanded') === 'true';
    header.setAttribute('data-was-expanded', isExpanded.toString());
    
    // Expand all rooms for searching
    const channelsList = header.nextElementSibling;
    if (channelsList && channelsList.classList.contains('channels-sublist')) {
      channelsList.style.maxHeight = `${channelsList.scrollHeight}px`;
      channelsList.style.opacity = '1';
      header.setAttribute('data-expanded', 'true');
    }
  });
  
  // Filter channels
  let hasVisibleChannels = false;
  channelItems.forEach(item => {
    const channelName = item.textContent.toLowerCase();
    if (channelName.includes(searchTerm)) {
      item.style.display = '';
      hasVisibleChannels = true;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Filter users
  let hasVisibleUsers = false;
  directMessageItems.forEach(item => {
    const username = item.textContent.toLowerCase();
    if (username.includes(searchTerm)) {
      item.style.display = '';
      hasVisibleUsers = true;
    } else {
      item.style.display = 'none';
    }
  });
  
  // If no matching results, show no results message
  // TODO: Can add a no results UI prompt
}

// Initialize top search box
function initTopbarSearch() {
  const topbarSearchInput = document.getElementById('searchInput');
  if (!topbarSearchInput) return;
  
  // Add class name for easier CSS style differentiation
  topbarSearchInput.parentElement.classList.add('topbar-search');
} 