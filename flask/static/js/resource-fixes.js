/**
 * Resource Management Modal Enhancement Script
 * Provides better UI experience and fixes existing issues
 */

// Add custom CSS styles to optimize the interface
(function() {
  // Add styles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Beautify scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.03);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.15);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.25);
    }
    
    /* Resource preview related styles */
    .resource-preview-image img {
      max-height: 140px;
      max-width: 100%;
      object-fit: contain;
      margin: 0 auto;
      display: block;
      border-radius: 4px;
    }
    
    .resource-preview-document,
    .resource-preview-code,
    .resource-preview-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    
    .resource-preview-document .filename,
    .resource-preview-code .filename {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
      max-width: 200px;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    
    .dark .resource-preview-document .filename,
    .dark .resource-preview-code .filename {
      color: #e5e7eb;
    }
    
    .resource-preview-document .file-ext,
    .resource-preview-code .file-ext {
      font-size: 0.75rem;
      color: #6b7280;
    }
    
    .dark .resource-preview-document .file-ext,
    .dark .resource-preview-code .file-ext {
      color: #9ca3af;
    }
    
    /* File upload area */
    .file-upload-area {
      transition: all 0.2s ease;
    }
    
    .file-upload-area:hover, .file-upload-area:focus {
      border-color: #3b82f6;
      background-color: rgba(59, 130, 246, 0.05);
    }
    
    /* Resource modal styles */
    #resourceManagementModal .bg-white,
    #resourceFormModal .bg-white {
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }
    
    #resourceFormModal .flex-grow.overflow-y-auto {
      flex: 1 1 auto;
    }
    
    #resourceManagementModal .border-t {
      flex-shrink: 0;
    }
    
    /* Modal animations */
    .modal-container {
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    
    .modal-container.hidden {
      transform: scale(0.95);
      opacity: 0;
    }
    
    /* File card styles */
    .file-card {
      transition: all 0.2s ease;
    }
    
    .file-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
  `;
  document.head.appendChild(styleElement);
})();

/**
 * Initialize resource management interface fixes
 */
function initResourceUIFixes() {
  console.log('[Resource Management] Initializing resource management UI');
  
  // Set modal sizes
  setupModalSizing();
  
  // Listen for window size changes
  window.addEventListener('resize', adjustModalSizes);
  
  // Add global click event listener for closing all dropdown menus
  document.addEventListener('click', closeAllDropdownMenus);
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize resource form submission
  initResourceFormSubmit();
  
  // Initialize drag and drop upload
  initDragDropUpload();
  
  // Setup URL auto-fill functionality
  setupAutoFillUrl();
  
  console.log('[Resource Management] Resource management UI initialization completed');
}

/**
 * Set modal sizes
 */
function setupModalSizing() {
  console.log('[Resource Management] Setting modal size');
  // Adjust modal size after page loads
  setTimeout(adjustModalSizes, 100);
}

/**
 * Adjust modal sizes
 */
function adjustModalSizes() {
  const resourceManagementModal = document.getElementById('resourceManagementModal');
  const resourceFormModal = document.getElementById('resourceFormModal');
  
  if (resourceManagementModal) {
    const modalContent = resourceManagementModal.querySelector('.bg-white, .dark\\:bg-gray-800');
    if (modalContent) {
      // Set maximum height to 80% of viewport height
      const maxHeight = window.innerHeight * 0.8;
      modalContent.style.maxHeight = `${maxHeight}px`;
    }
  }
  
  if (resourceFormModal) {
    const modalContent = resourceFormModal.querySelector('.bg-white, .dark\\:bg-gray-800');
    if (modalContent) {
      // Set maximum height to 80% of viewport height
      const maxHeight = window.innerHeight * 0.8;
      modalContent.style.maxHeight = `${maxHeight}px`;
    }
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  console.log('[Resource Management] Setting up event listeners');
  
  // Bind close button events
  const resourceManagementCloseBtn = document.querySelector('#resourceManagementModal button[onclick="closeResourceManagementModal()"]');
  if (resourceManagementCloseBtn) {
    resourceManagementCloseBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeResourceManagementModal();
    });
  }
  
  const resourceFormCloseBtn = document.querySelector('#resourceFormModal button[onclick="closeResourceFormModal()"]');
  if (resourceFormCloseBtn) {
    resourceFormCloseBtn.addEventListener('click', function(e) {
      e.preventDefault();
      closeResourceFormModal();
    });
  }
  
  // Ensure clicking outside the modal can close the modal
  document.addEventListener('click', function(event) {
    // Close all dropdown menus unless clicking on menu button
    if (!event.target.closest('.dropdown-button')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
    
    // Resource management modal
    const resourceManagementModal = document.getElementById('resourceManagementModal');
    if (resourceManagementModal && !resourceManagementModal.classList.contains('invisible')) {
      const modalContent = resourceManagementModal.querySelector('.bg-white, .dark\\:bg-gray-800');
      if (modalContent && !modalContent.contains(event.target) && event.target === resourceManagementModal) {
        closeResourceManagementModal();
      }
    }
    
    // Resource form modal
    const resourceFormModal = document.getElementById('resourceFormModal');
    if (resourceFormModal && !resourceFormModal.classList.contains('hidden')) {
      const modalContent = resourceFormModal.querySelector('.bg-white, .dark\\:bg-gray-800');
      if (modalContent && !modalContent.contains(event.target) && event.target === resourceFormModal) {
        closeResourceFormModal();
      }
    }
  });
}

/**
 * Close all dropdown menus
 */
function closeAllDropdownMenus(e) {
  // Skip button click events, let button handle its own click events
  if (e && e.target && e.target.closest('.dropdown button')) {
    return;
  }
  
  // Hide all dropdown menus
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.classList.add('hidden');
  });
}

/**
 * Handle resource form submission
 */
function handleResourceFormSubmit(e) {
  e.preventDefault();
  
  console.log('[Resource Management] Processing resource form submission');
  
  // Get form data
  const resourceId = document.getElementById('resourceId')?.value;
  const resourceName = document.getElementById('resourceName')?.value;
  const resourceUrl = document.getElementById('resourceUrl')?.value;
  const resourceDesc = document.getElementById('resourceDescription')?.value || '';
  
  // Get selected resource type
  let resourceType = 'link'; // Default type
  const selectedTypeElement = document.querySelector('.resource-type-option div.border-blue-500, .resource-type-option.selected');
  if (selectedTypeElement) {
    const parentOption = selectedTypeElement.closest('.resource-type-option');
    if (parentOption) {
      resourceType = parentOption.dataset.type || 'link';
    }
  }
  
  console.log('Form data:', {
    resourceId,
    resourceName,
    resourceUrl,
    resourceDesc,
    resourceType
  });
  
  // Validate data
  if (!resourceName) {
    showToast('Please enter a resource name', 'error');
    document.getElementById('resourceName')?.focus();
    return;
  }
  
  if (!resourceUrl) {
    showToast('Please enter a resource URL', 'error');
    document.getElementById('resourceUrl')?.focus();
    return;
  }
  
  // Disable form button, show loading state
  const submitBtn = document.getElementById('saveResourceBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('cursor-not-allowed', 'opacity-75');
    submitBtn.innerHTML = '<div class="inline-block animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>Saving...';
  }
  
  // Prepare resource data
  const resourceData = {
    name: resourceName,
    url: resourceUrl,
    description: resourceDesc,
    resource_type: resourceType,
    custom_properties: {}
  };
  
  // Get custom properties
  const customProperties = document.getElementById('customProperties');
  if (customProperties) {
    const propertyRows = customProperties.querySelectorAll('.custom-property-row');
    
    propertyRows.forEach(row => {
      const keyInput = row.querySelector('input[placeholder="Property Name"]');
      const valueInput = row.querySelector('input[placeholder="Value"]');
      
      if (keyInput && valueInput && keyInput.value.trim()) {
        resourceData.custom_properties[keyInput.value.trim()] = valueInput.value.trim();
      }
    });
  }
  
  // Determine whether it's adding a new resource or updating an existing one
  const isUpdate = resourceId && resourceId.trim() !== '';
  
  // API URL
  let url = '/api/resources';
  let method = 'POST';
  
  if (isUpdate) {
    url = `/api/resources/${resourceId}`;
    method = 'PUT';
  }
  
  console.log(`[Resource Management] ${isUpdate ? 'Updating' : 'Adding'} resource: ${resourceName}`, resourceData);
  
  // Get CSRF token
  const csrfToken = getCSRFToken();
  if (!csrfToken) {
    console.error('CSRF token not found');
    showToast('Security token missing. Please refresh the page.', 'error');
    return;
  }
  
  // Send request
  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken
    },
    body: JSON.stringify(resourceData)
  })
  .then(response => {
    console.log('Server response:', response.status);
    if (!response.ok) {
      return response.json().then(errorData => {
        throw new Error(errorData.message || `Server error: ${response.status}`);
      });
    }
    return response.json();
  })
  .then(data => {
    console.log('API response data:', data);
    if (data.success) {
      showToast(isUpdate ? 'Resource updated' : 'Resource added', 'success');
      closeResourceFormModal();
      
      // Refresh resource list directly without opening resource management modal
      showSampleResources();
    } else {
      showToast(`${isUpdate ? 'Update' : 'Add'} failed: ${data.message || 'Unknown error'}`, 'error');
      // Restore submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('cursor-not-allowed', 'opacity-75');
        submitBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Save Resource
        `;
      }
    }
  })
  .catch(error => {
    console.error('[Resource Management] Error saving resource:', error);
    showToast('Save failed: ' + error.message, 'error');
    
    // Restore submit button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('cursor-not-allowed', 'opacity-75');
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Save Resource
      `;
    }
  });
}

/**
 * Prevent default behavior
 */
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Highlight drag and drop area
 */
function highlight() {
  this.classList.add('border-blue-500', 'bg-blue-50');
  this.classList.add('dark:bg-blue-900/20');
}

/**
 * Unhighlight drag and drop area
 */
function unhighlight() {
  this.classList.remove('border-blue-500', 'bg-blue-50');
  this.classList.remove('dark:bg-blue-900/20');
}

/**
 * Handle file drag and drop
 */
function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

/**
 * Handle uploaded files
 * This function will be called by event handlers in HTML
 */
function handleFiles(files) {
  console.log('[资源上传] 处理上传的文件，数量:', files.length);
  
  // Convert FileList to array
  const filesArray = Array.from(files);
  
  // Show upload progress indicator
  showUploadProgress(filesArray);
  
  // Upload files directly to server
  uploadFilesToServer(filesArray);
  
  // Add uploaded files to resource list (for UI preview)
  addUploadedFilesToList(filesArray);
}

/**
 * Upload files to server
 */
function uploadFilesToServer(files) {
  files.forEach((file, index) => {
    // Create FormData object
    const formData = new FormData();
    formData.append('file', file);
    
    // Use fetch API to upload files
    fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'X-CSRFToken': getCSRFToken()
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('网络错误');
      }
      return response.json();
    })
    .then(data => {
      console.log('[资源上传] 上传成功:', data);
      // Update progress bar to 100%
      updateUploadProgressToComplete(index);
      // Can handle server returned data here
    })
    .catch(error => {
      console.error('[资源上传] 上传失败:', error);
      // Show error message
      showUploadError(index, error.message);
    });
  });
}

/**
 * Update upload progress to complete
 */
function updateUploadProgressToComplete(index) {
  const progressList = document.getElementById('uploadProgressList');
  if (!progressList) return;
  
  const progressItems = progressList.querySelectorAll('.flex.items-center.gap-2');
  if (index < progressItems.length) {
    const progressBar = progressItems[index].querySelector('.progress-bar');
    const progressPercent = progressItems[index].querySelector('.progress-percent');
    
    if (progressBar && progressPercent) {
      progressBar.style.width = '100%';
      progressPercent.textContent = '100%';
      
      // Update status text
      const statusText = document.getElementById('uploadStatus');
      if (statusText) {
        const completedFiles = document.querySelectorAll('.progress-bar[style*="width: 100%"]').length;
        const totalFiles = progressItems.length;
        statusText.textContent = `${completedFiles} of ${totalFiles} files uploaded`;
      }
    }
  }
}

/**
 * Show upload error
 */
function showUploadError(index, errorMessage) {
  const progressList = document.getElementById('uploadProgressList');
  if (!progressList) return;
  
  const progressItems = progressList.querySelectorAll('.flex.items-center.gap-2');
  if (index < progressItems.length) {
    const progressBar = progressItems[index].querySelector('.progress-bar');
    const progressPercent = progressItems[index].querySelector('.progress-percent');
    
    if (progressBar && progressPercent) {
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = '#ef4444'; // Red
      progressPercent.textContent = 'Error';
      progressPercent.classList.add('text-red-500');
      
      // Show error message
      showToast(errorMessage, 'error');
    }
  }
}

/**
 * Show upload progress indicator
 */
function showUploadProgress(files) {
  const progressContainer = document.getElementById('uploadProgressContainer');
  const progressList = document.getElementById('uploadProgressList');
  const statusText = document.getElementById('uploadStatus');
  
  if (!progressContainer || !progressList || !statusText) return;
  
  // Clear list
  progressList.innerHTML = '';
  
  // Update status text
  statusText.textContent = `0 of ${files.length} files uploaded`;
  
  // Show container
  progressContainer.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
  
  // Add progress item
  files.forEach((file, index) => {
    const progressItem = document.createElement('div');
    progressItem.className = 'flex items-center gap-2';
    
    // Get file icon
    const fileIconClass = getFileIconClass(file.type);
    
    // Build HTML
    progressItem.innerHTML = `
      <div class="w-8 h-8 ${fileIconClass} rounded-lg flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex justify-between items-center">
          <p class="text-xs font-medium text-gray-800 dark:text-white truncate">${file.name}</p>
          <span class="text-xs text-gray-500 dark:text-gray-400 ml-2 progress-percent">0%</span>
        </div>
        <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
          <div class="progress-bar h-full bg-blue-500 rounded-full w-0 transition-all duration-300 ease-out"></div>
        </div>
      </div>
    `;
    
    // Add to list
    progressList.appendChild(progressItem);
    
    // Simulate upload progress
    simulateFileUpload(progressItem, index, files.length);
  });
  
  // Close button event
  const closeBtn = document.getElementById('closeUploadProgress');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      progressContainer.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
    });
  }
}

/**
 * Simulate file upload progress
 */
function simulateFileUpload(progressItem, index, totalFiles) {
  const progressBar = progressItem.querySelector('.progress-bar');
  const progressPercent = progressItem.querySelector('.progress-percent');
  
  if (!progressBar || !progressPercent) return;
  
  // Set initial progress to 0%
  progressBar.style.width = '0%';
  progressPercent.textContent = '0%';
  
  // Set to uploading
  progressBar.classList.add('uploading');
  
  // Use real upload API instead of simulating progress
  // Here we don't use simulating progress, real upload is handled in uploadFilesToServer function
}

/**
 * Get file icon class
 */
function getFileIconClass(mimeType) {
  if (!mimeType) return 'bg-gray-100 dark:bg-gray-700 text-gray-500';
  
  const type = mimeType.split('/')[0];
  
  switch (type) {
    case 'image':
      return 'bg-green-100 dark:bg-green-900/20 text-green-500';
    case 'video':
      return 'bg-red-100 dark:bg-red-900/20 text-red-500';
    case 'audio':
      return 'bg-purple-100 dark:bg-purple-900/20 text-purple-500';
    case 'application':
      if (mimeType.includes('pdf')) {
        return 'bg-red-100 dark:bg-red-900/20 text-red-500';
      } else if (mimeType.includes('word') || mimeType.includes('doc')) {
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-500';
      } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
        return 'bg-green-100 dark:bg-green-900/20 text-green-500';
      }
      return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-500';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-500';
  }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Add uploaded files to resource list
 */
function addUploadedFilesToList(files) {
  const resourceList = document.querySelector('#resourceManagementModal .grid-cols-2');
  if (!resourceList) return;
  
  files.forEach(file => {
    // Create resource card
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow file-card';
    
    // Get file icon
    const fileIcon = getFileIcon(file.type);
    
    // Build card HTML
    card.innerHTML = `
      <div class="p-4">
        <div class="flex items-center gap-3">
          ${fileIcon}
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-gray-900 dark:text-white text-sm truncate">${file.name}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">${formatFileSize(file.size)}</p>
          </div>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
      <div class="bg-gray-50 dark:bg-gray-700/50 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-1">
            <div class="w-4 h-4 rounded-full bg-${colorClass}-500"></div>
            <span class="text-xs text-gray-500 dark:text-gray-400">Just now</span>
          </div>
          <button class="text-xs text-blue-600 dark:text-blue-400 hover:underline">View</button>
        </div>
      </div>
    `;
    
    // Add to list
    resourceList.appendChild(card);
  });
}

/**
 * Get corresponding icon based on file type
 */
function getFileIcon(mimeType) {
  let icon = '';
  
  if (mimeType.startsWith('image/')) {
    icon = `
      <div class="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    `;
  } else if (mimeType.startsWith('video/')) {
    icon = `
      <div class="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
    `;
  } else if (mimeType === 'application/pdf') {
    icon = `
      <div class="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    `;
  } else {
    icon = `
      <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    `;
  }
  
  return icon;
}

/**
 * Show toast message
 */
function showToast(message, type = 'info') {
  console.log(`显示提示: ${message} (${type})`);
  
  // Check if toast container already exists
  let toastContainer = document.getElementById('toast-container');
  
  if (!toastContainer) {
    // Create toast container
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(toastContainer);
  }
  
  // Create new toast
  const toast = document.createElement('div');
  let bgColor = 'bg-gray-800';
  let borderColor = 'border-l-blue-500';
  
  if (type === 'error') {
    bgColor = 'bg-red-500';
    borderColor = 'border-l-red-700';
  } else if (type === 'success') {
    bgColor = 'bg-green-500';
    borderColor = 'border-l-green-700';
  } else if (type === 'warning') {
    bgColor = 'bg-yellow-500';
    borderColor = 'border-l-yellow-700';
  }
  
  toast.className = `${bgColor} border-l-4 ${borderColor} text-white px-4 py-3 rounded-r-lg shadow-lg transform translate-y-2 opacity-0 transition-all duration-300`;
  toast.innerHTML = `
    <div class="flex items-center">
      <div class="flex-shrink-0">
        ${type === 'error' ? `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        ` : type === 'success' ? `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        ` : `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        `}
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium">${message}</p>
      </div>
    </div>
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);
  
  // Set auto-dismiss
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

/**
 * Open resource management modal
 */
window.openResourceManagementModal = function() {
  // Show resource management modal
  const modal = document.getElementById('resourceManagementModal');
  if (modal) {
    modal.classList.remove('hidden');
    
    // Load resource list
    showSampleResources();
  }
};

/**
 * Format date
 */
function formatDate(dateString) {
  if (!dateString) return 'Unknown date';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('Date formatting error:', e);
    return 'Unknown date';
  }
}

/**
 * Detect resource type 
 */
function detectResourceType(url) {
  if (!url) return 'file';
  
  url = url.toLowerCase();
  
  // Check if it's an image
  if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    return 'image';
  }
  
  // Check if it's a video
  if (url.match(/\.(mp4|webm|mkv|avi|mov)$/i)) {
    return 'video';
  }
  
  // Check if it's a document
  if (url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) {
    return 'document';
  }
  
  // Check if it's a code file
  if (url.match(/\.(js|py|java|cpp|c|html|css|php|rb|json|xml)$/i)) {
    return 'code';
  }
  
  // Check if it's an audio file
  if (url.match(/\.(mp3|wav|ogg|flac)$/i)) {
    return 'audio';
  }
  
  // Check if it's an external link
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'link';
  }
  
  // Default to file
  return 'file';
}

/**
 * Add initial resource UI fixes
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize resource UI fixes
  initResourceUIFixes();
  
  // Initialize resource form submission
  setTimeout(function() {
    initResourceFormSubmit();
    
    // Initialize resource type selection
    initResourceTypeSelection();
    
    // Check if need to add style fixes
    if (!document.getElementById('resource-fixes-style')) {
      addResourceFixesStyles();
    }
  }, 300);
});

/**
 * Add resource UI fixes custom styles
 */
function addResourceFixesStyles() {
  const styleElement = document.createElement('style');
  styleElement.id = 'resource-fixes-style';
  styleElement.textContent = `
    /* Improve resource form button styles */
    #saveResourceBtn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 120px;
      font-weight: 500;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    
    #saveResourceBtn:hover:not(:disabled) {
      background-color: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px rgba(0,0,0,0.12);
    }
    
    #saveResourceBtn:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    #saveResourceBtn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    /* Resource type selection styles improvement */
    .resource-type-option div.border-blue-500,
    .resource-type-option.selected div {
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(styleElement);
}

/**
 * Initialize resource type selection
 */
function initResourceTypeSelection() {
  console.log('[Resource Management] Initializing resource type selection');
  
  const typeOptions = document.querySelectorAll('.resource-type-option');
  
  // Select default type as link
  let hasSelected = false;
  typeOptions.forEach(option => {
    const optionDiv = option.querySelector('div');
    
    // Remove old event listeners
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);
    
    // Check if should select this option
    if (newOption.dataset.type === 'link' && !hasSelected) {
      // Default select link type
      newOption.querySelector('div').classList.add('border-blue-500');
      hasSelected = true;
    }
    
    // Add new click event listener
    newOption.addEventListener('click', function() {
      console.log('[Resource Management] Resource type selected:', this.dataset.type);
      
      // Remove all selected states
      typeOptions.forEach(opt => {
        const div = opt.querySelector('div');
        if (div) {
          div.classList.remove('border-blue-500');
        }
      });
      
      // Give current selected item selected state
      const currentDiv = this.querySelector('div');
      if (currentDiv) {
        currentDiv.classList.add('border-blue-500');
      }
      
      // Add a hidden input field to store type value
      let hiddenInput = document.getElementById('resourceType');
      if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'resourceType';
        hiddenInput.name = 'resource_type';
        document.getElementById('resourceForm').appendChild(hiddenInput);
      }
      
      // Set type value
      hiddenInput.value = this.dataset.type || 'link';
      
      // Notify user selected type
      showToast(`Selected type: ${this.dataset.type || 'link'}`, 'info');
      
      // Add animation effect
      const div = this.querySelector('div');
      if (div) {
        div.classList.add('animate-pulse');
        setTimeout(() => {
          div.classList.remove('animate-pulse');
        }, 500);
      }
    });
  });
}

/**
 * Initialize resource type for edit
 */
function initResourceTypeForEdit(resourceType) {
  // Delay execution, ensure DOM updated
  setTimeout(() => {
    // Clear all selected states
    document.querySelectorAll('.resource-type-option').forEach(option => {
      const optionDiv = option.querySelector('div');
      optionDiv.classList.remove('border-blue-500', 'dark:border-blue-500', 'ring-2', 'ring-blue-200', 'dark:ring-blue-900/30');
    });
    
    // Select corresponding option based on resource type
    let typeToSelect = resourceType || 'link';
    // If no matching type, default to other
    const validTypes = ['link', 'document', 'image', 'other'];
    if (!validTypes.includes(typeToSelect)) {
      typeToSelect = 'other';
    }
    
    // Find corresponding option and set selected state
    const typeOption = document.querySelector(`.resource-type-option[data-type="${typeToSelect}"]`);
    if (typeOption) {
      const optionDiv = typeOption.querySelector('div');
      optionDiv.classList.add('border-blue-500', 'dark:border-blue-500', 'ring-2', 'ring-blue-200', 'dark:ring-blue-900/30');
      
      // Set hidden field
      let resourceTypeInput = document.getElementById('resourceType');
      if (!resourceTypeInput) {
        resourceTypeInput = document.createElement('input');
        resourceTypeInput.type = 'hidden';
        resourceTypeInput.id = 'resourceType';
        document.getElementById('resourceForm').appendChild(resourceTypeInput);
      }
      resourceTypeInput.value = typeToSelect;
    }
  }, 100);
}

function addCustomPropertyRow(key = '', value = '') {
  const customPropertiesContainer = document.getElementById('customProperties');
  
  // If container has prompt text, clear
  if (customPropertiesContainer.querySelector('p')) {
    customPropertiesContainer.innerHTML = '';
  }
  
  const row = document.createElement('div');
  row.className = 'custom-property-row flex gap-3 items-start';
  
  row.innerHTML = `
    <div class="flex-1">
      <input type="text" name="property_key[]" placeholder="Property Name" value="${escapeHtml(key)}" class="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 outline-none">
    </div>
    <div class="flex-1">
      <input type="text" name="property_value[]" placeholder="Value" value="${escapeHtml(value)}" class="w-full p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 outline-none">
    </div>
    <button type="button" onclick="removeCustomPropertyRow(this)" class="flex-shrink-0 text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  `;
  
  customPropertiesContainer.appendChild(row);
}

/**
 * Show resource list data (for refreshing view)
 */
function showSampleResources() {
  // Reload resource list
  fetch('/api/resources')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const resourcesContainer = document.getElementById('resourcesList');
        if (resourcesContainer) {
          resourcesContainer.innerHTML = '';
          
          if (data.resources.length === 0) {
            resourcesContainer.innerHTML = `
              <div class="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No resources found</h3>
                <p class="mt-1 text-gray-500 dark:text-gray-400">Get started by creating a resource.</p>
                <div class="mt-6">
                  <button type="button" onclick="openAddResourceModal()" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Resource
                  </button>
                </div>
              </div>
            `;
          } else {
            // Create resource card
            data.resources.forEach(resource => {
              resourcesContainer.appendChild(createResourceCard(resource));
            });
          }
        }
      } else {
        showToast('Failed to load resources: ' + (data.message || 'Unknown error'), 'error');
      }
    })
    .catch(error => {
      console.error('Error fetching resources:', error);
      showToast('Failed to load resources. Please try again later.', 'error');
    });
}

/**
 * Create resource card
 */
function createResourceCard(resource) {
  const card = document.createElement('div');
  card.className = 'resource-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200';
  
  // Ensure resource.id is integer
  const resourceId = parseInt(resource.resource_id || resource.id, 10);
  
  // Set data attributes
  card.dataset.id = resourceId;
  
  // Get resource type icon
  const typeIcon = getResourceTypeIcon(resource);
  
  card.innerHTML = `
    <div class="p-4">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex items-center mb-1">
            ${typeIcon}
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
            <button onclick="editResource(${resourceId})" class="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Edit resource">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button onclick="deleteResource(${resourceId})" class="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Delete resource">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
      <button onclick="toggleResourceDetails(${resourceId})" class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center transition-colors">
        <span>Details</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 transform transition-transform resource-details-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div class="resource-details hidden mt-2 text-sm space-y-1.5">
        <div class="flex items-start">
          <span class="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Description:</span>
          <span class="text-gray-700 dark:text-gray-300 flex-1">${resource.description || 'No description'}</span>
        </div>
        <div class="flex items-start">
          <span class="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Type:</span>
          <span class="text-gray-700 dark:text-gray-300 flex-1">${resource.type || resource.resource_type || 'Not specified'}</span>
        </div>
        <div class="flex items-start">
          <span class="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Created:</span>
          <span class="text-gray-700 dark:text-gray-300 flex-1">${formatDate(resource.created_at)}</span>
        </div>
        <div class="flex items-start">
          <span class="text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">Created by:</span>
          <span class="text-gray-700 dark:text-gray-300 flex-1">${resource.created_by || 'Unknown'}</span>
        </div>
      </div>
    </div>
  `;
  
  return card;
}

/**
 * Get resource type icon
 */
function getResourceTypeIcon(resource) {
  const resourceType = resource.type || detectResourceType(resource.url);
  
  let icon = '';
  
  switch (resourceType) {
    case 'document':
      icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>`;
      break;
    case 'image':
      icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>`;
      break;
    case 'video':
      icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>`;
      break;
    case 'link':
      icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>`;
      break;
    default:
      icon = `<div class="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>`;
  }
  
  return icon;
}

/**
 * Format URL display
 */
function formatUrl(url) {
  if (!url) return '';
  
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    }
    return url;
  } catch (e) {
    return url;
  }
}

/**
 * Toggle resource details display
 */
window.toggleResourceDetails = function(resourceId) {
  // Ensure resourceId is integer
  resourceId = parseInt(resourceId, 10);
  
  console.log('Toggle resource details display, ID:', resourceId);
  
  const resourceCard = document.querySelector(`.resource-card[data-id="${resourceId}"]`);
  if (!resourceCard) {
    console.error('Resource card not found, ID:', resourceId);
    return;
  }
  
  const detailsSection = resourceCard.querySelector('.resource-details');
  const icon = resourceCard.querySelector('.resource-details-icon');
  
  if (!detailsSection || !icon) {
    console.error('Details section or icon not found');
    return;
  }
  
  if (detailsSection.classList.contains('hidden')) {
    // Show details
    detailsSection.classList.remove('hidden');
    icon.classList.add('rotate-180');
    console.log('Show resource details');
  } else {
    // Hide details
    detailsSection.classList.add('hidden');
    icon.classList.remove('rotate-180');
    console.log('Hide resource details');
  }
}

/**
 * Open resource URL
 */
window.openResourceUrl = function(url) {
  window.open(url, '_blank');
}

/**
 * Edit resource
 */
window.editResource = function(resourceId) {
  // Ensure resourceId is integer
  resourceId = parseInt(resourceId, 10);
  
  // Validate resourceId
  if (isNaN(resourceId) || resourceId <= 0) {
    console.error('Invalid resource ID:', resourceId);
    showToast('Invalid resource ID', 'error');
    return;
  }

  console.log('Preparing to edit resource, ID:', resourceId);
  
  // Get resource data
  fetch(`/api/resources/${resourceId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Got resource data:', data);
      
      if (data.success && data.resource) {
        // Open edit modal
        openResourceFormModal('edit', data.resource);
      } else {
        console.error('Loading resource failed:', data.message || 'Unknown error');
        showToast('Loading resource failed: ' + (data.message || 'Unknown error'), 'error');
      }
    })
    .catch(error => {
      console.error('Error loading resource:', error);
      showToast('Loading resource failed, please try again later', 'error');
    });
}

/**
 * Delete resource
 */
window.deleteResource = function(resourceId) {
  // Ensure resourceId is integer
  resourceId = parseInt(resourceId, 10);
  
  // Validate resourceId
  if (isNaN(resourceId) || resourceId <= 0) {
    console.error('Invalid resource ID:', resourceId);
    showToast('Invalid resource ID', 'error');
    return;
  }

  console.log('Deleting resource, ID:', resourceId);
  
  // Confirm dialog
  if (confirm('Are you sure you want to delete this resource?')) {
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
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.success) {
        showToast('Resource deleted successfully', 'success');
        
        // Remove resource card from DOM
        const resourceCard = document.querySelector(`.resource-card[data-id="${resourceId}"]`);
        if (resourceCard) {
          resourceCard.remove();
        }
        
        // Reload resource list
        showSampleResources();
      } else {
        console.error('Deleting resource failed:', data.message || 'Unknown error');
        showToast('Deleting resource failed: ' + (data.message || 'Unknown error'), 'error');
      }
    })
    .catch(error => {
      console.error('Error deleting resource:', error);
      showToast('Deleting resource failed, please try again later', 'error');
    });
  }
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

/**
 * Open resource form modal
 */
function openResourceFormModal(mode = 'add', resource = null) {
  const modal = document.getElementById('resourceFormModal');
  if (!modal) {
    console.error('Resource form modal not found');
    return;
  }
  
  console.log('Opening resource form modal', mode, resource);
  
  // Set modal title
  const titleElement = document.getElementById('resourceFormTitle');
  if (titleElement) {
    titleElement.innerHTML = mode === 'edit' ? `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Edit Resource
    ` : `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Add Resource
    `;
  }
  
  // Reset form
  const form = document.getElementById('resourceForm');
  if (!form) {
    console.error('Resource form not found');
    return;
  }
  form.reset();
  
  // Set resource ID
  const resourceIdField = document.getElementById('resourceId');
  if (resourceIdField) {
    resourceIdField.value = '';
    
    if (mode === 'edit' && resource) {
      // Ensure using resource_id field as ID
      const id = resource.resource_id || resource.id;
      if (id) {
        resourceIdField.value = id;
        console.log('Set resource ID:', id);
      }
    }
  }
  
  if (mode === 'edit' && resource) {
    console.log('Editing resource:', resource);
    
    // Set resource name
    const nameField = document.getElementById('resourceName');
    if (nameField) {
      nameField.value = resource.name || '';
    }
    
    // Set resource URL
    const urlField = document.getElementById('resourceUrl');
    if (urlField) {
      urlField.value = resource.url || '';
    }
    
    // Set resource description
    const descriptionField = document.getElementById('resourceDescription');
    if (descriptionField) {
      descriptionField.value = resource.description || '';
    }
    
    // Set resource type
    const resourceType = resource.resource_type || resource.type;
    console.log('Set resource type:', resourceType);
    initResourceTypeForEdit(resourceType);
    
    // Set custom properties
    const customPropertiesContainer = document.getElementById('customProperties');
    if (customPropertiesContainer) {
      customPropertiesContainer.innerHTML = '';
      
      if (resource.custom_properties && Object.keys(resource.custom_properties).length > 0) {
        Object.entries(resource.custom_properties).forEach(([key, value]) => {
          addCustomPropertyRow(key, value);
        });
      } else {
        customPropertiesContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 italic">No custom properties</p>';
      }
    }
  } else {
    // Default add an empty custom property row
    const customPropertiesContainer = document.getElementById('customProperties');
    if (customPropertiesContainer) {
      customPropertiesContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 italic">No custom properties</p>';
    }
    
    // Initialize as link type
    initResourceTypeForEdit('link');
  }
  
  // Show modal
  modal.classList.remove('hidden');
}

/**
 * Close resource form modal
 */
function closeResourceFormModal() {
  const modal = document.getElementById('resourceFormModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * HTML escape function to prevent XSS attacks
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Remove custom property row
 */
function removeCustomPropertyRow(button) {
  const row = button.closest('.custom-property-row');
  const container = row.parentElement;
  
  row.remove();
  
  // If no remaining rows, show prompt text
  if (container.children.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 italic">No custom properties</p>';
  }
}

/**
 * Close resource management modal
 */
window.closeResourceManagementModal = function() {
  const modal = document.getElementById('resourceManagementModal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

/**
 * Open add resource modal
 */
window.openAddResourceModal = function() {
  // Open modal in add mode
  openResourceFormModal('add');
};

/**
 * Add custom property
 */
window.addCustomProperty = function() {
  addCustomPropertyRow('', '');
};

/**
 * Initialize resource form submission
 */
function initResourceFormSubmit() {
  console.log('[Resource Management] Initializing resource form submit handler');
  
  // Add save button click event
  const saveBtn = document.getElementById('saveResourceBtn');
  if (saveBtn) {
    console.log('[Resource Management] Adding click handler to Save Resource button');
    
    // Remove old event listeners (if any)
    saveBtn.removeEventListener('click', handleResourceFormSubmit);
    
    // Add new click event, trigger form submission
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('[Resource Management] Save button clicked');
      handleResourceFormSubmit(e);
    });
  } else {
    console.error('[Resource Management] Cannot find Save Resource button');
  }
  
  // Add submit event to form
  const form = document.getElementById('resourceForm');
  if (form) {
    console.log('[Resource Management] Adding submit handler to resource form');
    
    // Remove old event listeners (if any)
    form.removeEventListener('submit', handleResourceFormSubmit);
    
    // Add new submit event
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('[Resource Management] Form submitted');
      handleResourceFormSubmit(e);
    });
  } else {
    console.error('[Resource Management] Cannot find resource form');
  }
}

/**
 * Setup URL auto-fill functionality
 * This automatically fills URL information when pasted into the URL field
 */
function setupAutoFillUrl() {
  const urlInput = document.getElementById('resourceUrl');
  const nameInput = document.getElementById('resourceName');
  
  if (urlInput && nameInput) {
    urlInput.addEventListener('paste', function(e) {
      // Wait for the paste to complete
      setTimeout(function() {
        const url = urlInput.value.trim();
        if (url && (!nameInput.value || nameInput.value.trim() === '')) {
          // Try to extract a name from the URL
          try {
            const parsedUrl = new URL(url);
            const pathParts = parsedUrl.pathname.split('/').filter(part => part);
            
            if (pathParts.length > 0) {
              // Last path segment might be a good name
              let suggestedName = pathParts[pathParts.length - 1];
              
              // Remove file extension if present
              suggestedName = suggestedName.replace(/\.[^/.]+$/, "");
              
              // Replace hyphens and underscores with spaces
              suggestedName = suggestedName.replace(/[-_]/g, " ");
              
              // Capitalize first letter of each word
              suggestedName = suggestedName.replace(/\b\w/g, l => l.toUpperCase());
              
              if (suggestedName) {
                nameInput.value = suggestedName;
                nameInput.classList.add('border-green-400');
                setTimeout(() => {
                  nameInput.classList.remove('border-green-400');
                }, 2000);
              }
            } else {
              // Use hostname as name if no path
              nameInput.value = parsedUrl.hostname.replace('www.', '');
            }
          } catch (error) {
            console.warn('Could not parse URL for name suggestion', error);
          }
        }
        
        // Also try to detect resource type
        const resourceType = detectResourceType(url);
        if (resourceType) {
          // Select the appropriate resource type
          document.querySelectorAll('.resource-type-option').forEach(option => {
            if (option.dataset.type === resourceType) {
              // Simulate click on this option
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              option.dispatchEvent(clickEvent);
            }
          });
        }
      }, 100);
    });
  }
}