/**
 * Saved Items Manager
 * For managing saved messages and files
 */

// Currently loaded saved items
let savedItems = [];
let currentPage = 0;
let itemsPerPage = 20;
let totalItems = 0;
let currentType = 'all';
let currentChannelId = null;
let searchQuery = '';

// Initialize saved items manager
function initSavedItemsManager() {
    console.log('Initializing saved items manager');
    
    // Add necessary CSS animation styles
    addAnimationStyles();
    
    // Optimize search and filter area
    enhanceSearchArea();
    
    // Set up search input events
    const searchInput = document.getElementById('savedItemSearch');
    if (searchInput) {
        // Clear previous event listeners
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        
        newSearchInput.addEventListener('input', function(e) {
            searchQuery = e.target.value.trim();
            
            // Add clear button display logic
            const clearBtn = document.querySelector('.search-clear-btn');
            if (clearBtn) {
                if (searchQuery.length > 0) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }
            }
            
            // Add input delay to avoid frequent requests
            if (window.searchTimeout) {
                clearTimeout(window.searchTimeout);
            }
            
            window.searchTimeout = setTimeout(() => {
                loadSavedItems(true);
            }, 300);
        });
    }
    
    // Set up type filter events
    const typeFilter = document.getElementById('savedItemTypeFilter');
    if (typeFilter) {
        // Clear previous event listeners
        const newTypeFilter = typeFilter.cloneNode(true);
        typeFilter.parentNode.replaceChild(newTypeFilter, typeFilter);
        
        newTypeFilter.addEventListener('change', function(e) {
            currentType = e.target.value;
            loadSavedItems(true);
            
            // Update filter style
            updateFilterStyle(e.target);
        });
        
        // Initialize filter style
        updateFilterStyle(newTypeFilter);
    }
    
    // Set up clear button events
    const clearBtn = document.getElementById('clearSavedItems');
    if (clearBtn) {
        // Clear previous event listeners
        const newClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        
        newClearBtn.addEventListener('click', function(e) {
            // Use a more attractive confirmation dialog
            showConfirmDialog(
                'Are you sure you want to clear all saved items?', 
                'This action cannot be undone. You will permanently lose all saved content.',
                'Clear All',
                clearAllSavedItems
            );
        });
    }
    
    // Set up application-level event listener to capture save events
    setupGlobalSaveEventListener();
    
    // Load initial data
    loadSavedItems();
    
    // Add panel open event listener
    document.addEventListener('savedPanelOpened', function() {
        loadSavedItems(true);
    });
    
    // Ensure saved panel shows the latest content when toggled
    document.addEventListener('click', function(e) {
        // Check if the saved panel toggle button was clicked
        if (e.target.closest('#toggleSaved') || e.target.id === 'toggleSaved') {
            console.log('Detected saved panel opening');
            setTimeout(() => {
                loadSavedItems(true);
            }, 100);
        }
    });
    
    console.log('Saved items manager initialization complete');
}

// Set up global save event listener to respond to new saves immediately
function setupGlobalSaveEventListener() {
    document.addEventListener('click', function(e) {
        // Check if a save button was clicked
        const saveBtn = e.target.closest('.message-save-btn');
        if (saveBtn) {
            // Get message ID
            const messageId = saveBtn.getAttribute('data-message-id');
            if (messageId) {
                console.log('Save event captured, message ID:', messageId);
                
                // Listen for save operation completion
                const savedPanelContainer = document.getElementById('savedItemsContainer');
                if (savedPanelContainer) {
                    // Refresh saved items list after successful save
                    setTimeout(() => {
                        loadSavedItems(true);
                    }, 500);
                }
            }
        }
    });
    
    // Add custom event listener for handling saved item updates
    document.addEventListener('itemSaved', function(e) {
        console.log('Received itemSaved event:', e.detail);
        if (e.detail && e.detail.success) {
            loadSavedItems(true);
        }
    });
}

// Ensure preview functionality loads all necessary libraries
function ensurePreviewsWork() {
    // Check if file preview libraries are already loaded
    if (!window.hasPreviewLibraries) {
        // Check if FilePreview component is available
        if (window.FilePreview) {
            window.hasPreviewLibraries = true;
            console.log('File preview libraries initialized');
        } else {
            console.warn('FilePreview component not found, file previews may not work correctly');
        }
    }
}

// Manually update saved items panel
function refreshSavedItems() {
    loadSavedItems(true);
}

// Expose public methods
window.savedItemsManager = {
    refresh: refreshSavedItems,
    init: initSavedItemsManager
};

// Enhance search area with better UI
function enhanceSearchArea() {
    const searchContainer = document.getElementById('savedItemSearch')?.parentElement;
    if (!searchContainer) return;
    
    // Add clear button to search input
    if (!document.querySelector('.search-clear-btn')) {
        const clearBtn = document.createElement('button');
        clearBtn.className = 'search-clear-btn absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hidden';
        clearBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        `;
        clearBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('savedItemSearch');
            if (searchInput) {
                searchInput.value = '';
                searchQuery = '';
                this.classList.add('hidden');
                searchInput.focus();
                loadSavedItems(true);
            }
        });
        searchContainer.appendChild(clearBtn);
    }
    
    // Add tooltip to search input
    const searchTooltip = document.createElement('div');
    searchTooltip.className = 'absolute -bottom-8 left-0 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 transition-opacity duration-200 pointer-events-none';
    searchTooltip.innerText = 'Search by content, filename, or notes';
    searchContainer.appendChild(searchTooltip);
    
    // Add hover event to show tooltip
    const searchInput = document.getElementById('savedItemSearch');
    if (searchInput) {
        searchInput.addEventListener('mouseenter', function() {
            searchTooltip.classList.remove('opacity-0');
            searchTooltip.classList.add('opacity-100');
        });
        searchInput.addEventListener('mouseleave', function() {
            searchTooltip.classList.remove('opacity-100');
            searchTooltip.classList.add('opacity-0');
        });
    }
    
    // Enhance filter tags
    const quickFilterTags = document.querySelectorAll('.flex.flex-wrap.gap-1\\.5.mt-2 button');
    quickFilterTags.forEach(tag => {
        // Replace any existing click event
        const newTag = tag.cloneNode(true);
        tag.parentNode.replaceChild(newTag, tag);
        
        // Add new click event
        newTag.addEventListener('click', function() {
            const tagText = this.innerText.trim().toLowerCase();
            
            // Unselect all tags
            document.querySelectorAll('.flex.flex-wrap.gap-1\\.5.mt-2 button').forEach(btn => {
                btn.classList.remove('bg-amber-50', 'dark:bg-amber-900/30', 'text-amber-700', 'dark:text-amber-300');
                btn.classList.add('bg-white', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300', 'border', 'border-gray-200', 'dark:border-gray-600');
            });
            
            // Select this tag
            this.classList.remove('bg-white', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300', 'border', 'border-gray-200', 'dark:border-gray-600');
            this.classList.add('bg-amber-50', 'dark:bg-amber-900/30', 'text-amber-700', 'dark:text-amber-300');
            
            // Filter based on tag
            if (tagText.includes('recent')) {
                // Reset type filter but sort by recent
                document.getElementById('savedItemTypeFilter').value = 'all';
                currentType = 'all';
                searchQuery = '';
                document.getElementById('savedItemSearch').value = '';
                loadSavedItems(true);
            } else if (tagText.includes('note')) {
                searchQuery = 'note:';
                document.getElementById('savedItemSearch').value = searchQuery;
                loadSavedItems(true);
            } else if (tagText.includes('doc')) {
                document.getElementById('savedItemTypeFilter').value = 'file';
                currentType = 'file';
                searchQuery = 'type:document';
                document.getElementById('savedItemSearch').value = searchQuery;
                loadSavedItems(true);
            } else if (tagText.includes('image')) {
                document.getElementById('savedItemTypeFilter').value = 'file';
                currentType = 'file';
                searchQuery = 'type:image';
                document.getElementById('savedItemSearch').value = searchQuery;
                loadSavedItems(true);
            }
        });
    });
}

// Show confirmation dialog
function showConfirmDialog(title, message, confirmText, confirmCallback) {
    // Remove any existing dialog
    const existingDialog = document.getElementById('confirmDialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // Create dialog container
    const dialogContainer = document.createElement('div');
    dialogContainer.id = 'confirmDialog';
    dialogContainer.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-fade-in';
    
    // Create dialog content
    dialogContainer.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 animate-scale-in transform transition-all">
            <div class="p-6">
                <div class="flex items-center mb-4">
                    <div class="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white ml-3">${title}</h3>
                </div>
                
                <p class="text-gray-600 dark:text-gray-300 mb-6">${message}</p>
                
                <div class="flex justify-end gap-3">
                    <button id="cancelBtn" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded transition-colors">
                        Cancel
                    </button>
                    <button id="confirmBtn" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
                        ${confirmText}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add dialog to body
    document.body.appendChild(dialogContainer);
    
    // Add event listeners
    document.getElementById('cancelBtn').addEventListener('click', closeDialog);
    document.getElementById('confirmBtn').addEventListener('click', function() {
        closeDialog();
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
    });
    
    // Close dialog when clicking outside
    dialogContainer.addEventListener('click', function(e) {
        if (e.target === dialogContainer) {
            closeDialog();
        }
    });
    
    // Close dialog function
    function closeDialog() {
        const dialog = document.getElementById('confirmDialog');
        if (dialog) {
            dialog.querySelector('div[class*="animate-scale-in"]').classList.remove('animate-scale-in');
            dialog.querySelector('div[class*="animate-scale-in"]').classList.add('animate-scale-out');
            
            setTimeout(() => {
                dialog.classList.remove('animate-fade-in');
                dialog.classList.add('animate-fade-out');
                setTimeout(() => {
                    dialog.remove();
                }, 200);
            }, 100);
        }
    }
}

// Show help tip for saved items
function showHelpTip() {
    // Create a small tooltip to explain how to use saved items
    const tipContainer = document.createElement('div');
    tipContainer.className = 'fixed bottom-5 right-5 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg shadow-lg border border-amber-200 dark:border-amber-900 max-w-xs z-50 animate-bounce-in';
    
    tipContainer.innerHTML = `
        <div class="flex items-start">
            <div class="text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div>
                <h4 class="font-medium text-amber-800 dark:text-amber-300 mb-1">Saved Items Tip</h4>
                <p class="text-sm text-amber-700 dark:text-amber-200">Click the bookmark icon next to any message or file to save it for later reference.</p>
            </div>
            <button class="ml-2 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    `;
    
    document.body.appendChild(tipContainer);
    
    // Add close button functionality
    tipContainer.querySelector('button').addEventListener('click', function() {
        tipContainer.classList.remove('animate-bounce-in');
        tipContainer.classList.add('animate-scale-out');
        
        setTimeout(() => {
            tipContainer.remove();
        }, 300);
        
        // Store preference not to show again
        localStorage.setItem('hideSavedItemsTip', 'true');
    });
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
        if (document.body.contains(tipContainer)) {
            tipContainer.classList.remove('animate-bounce-in');
            tipContainer.classList.add('animate-scale-out');
            
            setTimeout(() => {
                if (document.body.contains(tipContainer)) {
                    tipContainer.remove();
                }
            }, 300);
        }
    }, 8000);
}

// 在文档加载完成后初始化
document.addEventListener('DOMContentLoaded', initSavedItemsManager); 

// 确保脚本正确加载和初始化
(function() {
    console.log('Saved items manager script loading...');
    
    // 检查DOM是否已加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeManager);
    } else {
        // 如果DOM已加载，立即初始化
        initializeManager();
    }
    
    // 在页面完全加载后再次检查初始化
    window.addEventListener('load', function() {
        console.log('Page fully loaded, ensuring saved manager is initialized');
        if (!window.savedItemsManagerInitialized) {
            initializeManager();
        }
    });
    
    function initializeManager() {
        if (window.savedItemsManagerInitialized) {
            console.log('Saved manager already initialized, skipping duplicate initialization');
            return;
        }
        
        console.log('Initializing saved items manager...');
        // 初始化保存项目管理器
        initSavedItemsManager();
        // 标记为已初始化
        window.savedItemsManagerInitialized = true;
    }
})(); 

// Load saved items from the server
function loadSavedItems(reset = false) {
    // Reset pagination if requested
    if (reset) {
        currentPage = 0;
    }
    
    // Get the container
    const savedItemsContainer = document.getElementById('savedItemsContainer');
    if (!savedItemsContainer) {
        console.error('Could not find saved items container');
        return;
    }
    
    // Show loading state
    if (reset) {
        savedItemsContainer.innerHTML = `
            <div class="flex justify-center items-center py-12">
                <div class="loader animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                <span class="ml-2 text-gray-600 dark:text-gray-300">Loading saved items...</span>
            </div>
        `;
    } else {
        // Add loading indicator at the bottom when loading more
        const loadingMore = document.createElement('div');
        loadingMore.className = 'loading-more flex justify-center items-center py-4';
        loadingMore.innerHTML = `
            <div class="loader animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
            <span class="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading more...</span>
        `;
        savedItemsContainer.appendChild(loadingMore);
    }
    
    // Build query parameters
    let params = new URLSearchParams();
    params.append('offset', currentPage * itemsPerPage);
    params.append('limit', itemsPerPage);
    
    if (currentType && currentType !== 'all') {
        params.append('type', currentType);
    }
    
    if (currentChannelId) {
        params.append('channel_id', currentChannelId);
    }
    
    if (searchQuery) {
        params.append('search', searchQuery);
    }
    
    // Fetch saved items from the server
    fetch(`/api/saved_items?${params.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load saved items');
            }
            return response.json();
        })
        .then(data => {
            // Update global state
            totalItems = data.total || 0;
            
            if (reset) {
                // Reset the saved items array if this is a fresh load
                savedItems = data.saved_items || [];
            } else {
                // Append to existing items
                savedItems = [...savedItems, ...(data.saved_items || [])];
                
                // Remove loading more indicator
                const loadingMore = savedItemsContainer.querySelector('.loading-more');
                if (loadingMore) {
                    loadingMore.remove();
                }
            }
            
            // Create HTML from saved items
            displaySavedItems(savedItems, reset);
            
            // Update load more button visibility
            updateLoadMoreButton();
        })
        .catch(error => {
            console.error('Error loading saved items:', error);
            savedItemsContainer.innerHTML = `
                <div class="text-center p-8 text-red-500 dark:text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="font-medium">Error loading saved items</p>
                    <p class="text-sm mt-2 text-gray-600 dark:text-gray-400">${error.message}</p>
                </div>
            `;
        });
}

// Display saved items in the container
function displaySavedItems(items, reset = false) {
    const container = document.getElementById('savedItemsContainer');
    if (!container) return;
    
    // Ensure file preview functionality is available
    ensurePreviewsWork();
    
    // Clear container if reset is true
    if (reset) {
        container.innerHTML = '';
    }
    
    // Show empty state if no items
    if (items.length === 0 && reset) {
        container.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-300 py-8">
                <img src="../static/images/书签.png" class="w-16 h-16 mx-auto mb-4 opacity-70 dark:opacity-90" />
                <p class="font-medium">No saved items</p>
                <p class="text-sm mt-2 text-gray-400 dark:text-gray-500">
                    You can save important messages and files for later reference.
                </p>
                <div class="mt-4 text-center">
                    <button class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm transition-colors">
                        Save your first item
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Create content for each saved item
    items.forEach((item, index) => {
        // Skip items that are already displayed
        if (!reset && index < (currentPage * itemsPerPage)) {
            return;
        }
        
        const itemElement = createSavedItemElement(item);
        container.appendChild(itemElement);
    });
    
    // Add load more button if needed
    if (items.length < totalItems) {
        const loadMoreBtn = document.createElement('div');
        loadMoreBtn.className = 'load-more-container flex justify-center py-4';
        loadMoreBtn.innerHTML = `
            <button class="load-more-btn px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Load More
            </button>
        `;
        
        // Add load more button event
        loadMoreBtn.querySelector('.load-more-btn').addEventListener('click', function() {
            currentPage++;
            loadSavedItems(false);
            this.closest('.load-more-container').remove();
        });
        
        container.appendChild(loadMoreBtn);
    }
    
    // 触发自定义事件，通知图片URL规范化组件处理
    console.log('Saved messages displayed, triggering savedItemsLoaded event');
    document.dispatchEvent(new CustomEvent('savedItemsLoaded'));
    
    // 延迟100ms后再次处理，确保异步加载的内容也被处理
    setTimeout(() => {
        if (window.FilePreview && window.FilePreview.normalizeUrl) {
            const savedPanel = document.getElementById('savedPanel');
            if (savedPanel) {
                console.log('Delayed processing of image URLs in saved messages panel');
                // 如果存在processImagesInElement函数，使用它处理
                if (typeof processImagesInElement === 'function') {
                    processImagesInElement(savedPanel);
                } else if (window.FilePreview.normalizeUrl) {
                    // 否则手动处理
                    const images = savedPanel.querySelectorAll('img');
                    images.forEach(img => {
                        if (img.src) {
                            const originalSrc = img.src;
                            const normalizedSrc = window.FilePreview.normalizeUrl(originalSrc);
                            if (originalSrc !== normalizedSrc) {
                                console.log(`规范化保存消息中的图片URL: ${originalSrc} -> ${normalizedSrc}`);
                                img.src = normalizedSrc;
                            }
                        }
                    });
                }
                
                // 再次尝试强制加载所有图片
                setTimeout(() => {
                    console.log('Force loading all images in saved messages panel');
                    const images = savedPanel.querySelectorAll('img');
                    images.forEach((img, index) => {
                        if (img.src) {
                            console.log(`强制加载保存消息面板中的图片 #${index + 1}: ${img.src}`);
                            
                            // 添加加载/错误处理
                            img.onload = function() {
                                console.log(`保存消息面板中的图片 #${index + 1} 成功加载`);
                            };
                            
                            img.onerror = function() {
                                console.error(`保存消息面板中的图片 #${index + 1} 加载失败:`, img.src);
                                // 尝试使用Image对象预加载
                                const preloadImg = new Image();
                                preloadImg.onload = function() {
                                    console.log(`预加载保存消息面板中的图片 #${index + 1} 成功，重新设置src`);
                                    setTimeout(() => {
                                        img.src = img.src + (img.src.includes('?') ? '&force=' : '?force=') + Date.now();
                                    }, 100);
                                };
                                preloadImg.src = img.src;
                            };
                            
                            // 强制重新加载
                            img.src = img.src + (img.src.includes('?') ? '&force=' : '?force=') + Date.now();
                        }
                    });
                }, 200);
                
                // 如果存在全局强制加载函数，也调用它
                if (window.forceLoadAllImages && typeof window.forceLoadAllImages === 'function') {
                    setTimeout(() => {
                        console.log('Using global function to force load all images');
                        window.forceLoadAllImages();
                    }, 500);
                }
            }
        }
    }, 100);
}

// Update load more button visibility
function updateLoadMoreButton() {
    const container = document.getElementById('savedItemsContainer');
    if (!container) return;
    
    // Check if we have a load more button
    const loadMoreBtn = container.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        // Hide button if we've loaded all items
        if (savedItems.length >= totalItems) {
            loadMoreBtn.closest('.load-more-container').remove();
        }
    }
}

// Create HTML element for a saved item
function createSavedItemElement(item) {
    const itemElement = document.createElement('div');
    itemElement.className = 'saved-item bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-3 animate-fade-in';
    itemElement.setAttribute('data-save-id', item.save_id);
    
    // Format date
    const savedDate = new Date(item.saved_at);
    const formattedDate = savedDate.toLocaleDateString() + ' ' + savedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Build the header with metadata
    let headerHTML = `
        <div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <span class="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 p-1.5 rounded-lg inline-block">
                        ${item.item_type === 'message' ? 
                            '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>' :
                            '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>'
                        }
                    </span>
                </div>
                <div class="ml-2 text-sm">
                    <div class="font-medium text-gray-800 dark:text-white flex items-center">
                        ${item.item_type === 'message' ? 'Saved Message' : 'Saved File'}
                        <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            From <span class="text-blue-600 dark:text-blue-400">${item.channel_name || 'Unknown Channel'}</span>
                        </span>
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                        Saved ${formattedDate}
                    </div>
                </div>
            </div>
            <div class="flex items-center">
                <button class="edit-notes-btn p-1.5 text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors" title="Add Notes">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button class="delete-saved-btn p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ml-1" title="Remove from Saved">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    // Content section varies by item type
    let contentHTML = '';
    
    if (item.item_type === 'message') {
        // For messages, display the content
        contentHTML = `
            <div class="p-4">
                <div class="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                    ${formatMessageContent(item.item_content || 'No content')}
                </div>
                ${item.notes ? `
                    <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes:</div>
                        <div class="bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-sm text-gray-700 dark:text-gray-300">
                            ${formatMessageContent(item.notes)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    } else if (item.item_type === 'file') {
        // For files, use the FilePreview component
        const fileData = {
            url: item.file_url,
            name: item.item_content, // original filename
            size: item.file_size || 0,
            type: item.item_subtype,
            uploadDate: item.creation_time
        };
        
        // 规范化文件URL
        let fileUrl = item.file_url;
        if (window.FilePreview && window.FilePreview.normalizeUrl) {
            fileUrl = window.FilePreview.normalizeUrl(fileUrl);
            console.log('Normalized file URL in saved items:', fileUrl);
        } else {
            // 基本处理
            const parts = fileUrl.split('/');
            const filename = parts[parts.length - 1];
            // 使用uploads路由
            fileUrl = `/uploads/${filename}`;
        }
        
        // 添加时间戳防止缓存
        fileUrl = fileUrl + (fileUrl.includes('?') ? '&t=' : '?t=') + Date.now();
        
        // 检测文件是否为图片
        const filename = fileData.name;
        const fileExtension = filename.split('.').pop().toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
        
        // 如果是图片，但类型未设置为图片，则修正类型
        if (isImage && (!fileData.type || !fileData.type.startsWith('image/'))) {
            fileData.type = 'image/' + fileExtension;
        }
        
        console.log('Creating file preview in saved items:', fileData, 'Is image:', isImage);
        
        // 根据文件类型生成不同的HTML
        if (isImage) {
            // 生成唯一ID用于图片元素
            const imgId = 'saved_img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            
            contentHTML = `
                <div class="p-4">
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
                    <div class="mt-3 flex flex-wrap gap-2">
                        <a href="${fileUrl}" download="${filename}" class="main-download-btn w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg shadow flex items-center justify-center font-medium" data-file-url="${fileUrl}" data-file-name="${filename}" id="${imgId}_main_download">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Image
                        </a>
                        <a href="${fileUrl}" target="_blank" class="inline-flex items-center px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 text-sm rounded shadow-sm transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Original
                        </a>
                    </div>
                    
                    ${item.notes ? `
                        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes:</div>
                            <div class="bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-sm text-gray-700 dark:text-gray-300">
                                ${formatMessageContent(item.notes)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // 立即添加一个全局函数用于加载这个特定的图片
            window['loadSavedImage_' + imgId] = function() {
                const img = document.getElementById(imgId);
                const placeholder = document.getElementById(imgId + '_placeholder');
                
                if (!img || !placeholder) {
                    console.error('找不到图片元素或占位符:', imgId);
                    return;
                }
                
                // 使用fetch API获取图片
                console.log('开始获取保存的图片:', fileUrl);
                
                fetch(fileUrl, {
                    method: 'GET',
                    cache: 'no-store', // 完全禁用缓存
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('图片加载失败: ' + response.status);
                    }
                    return response.blob();
                })
                .then(blob => {
                    // 创建一个blob URL
                    const objectURL = URL.createObjectURL(blob);
                    
                    // 设置图片src并显示它
                    img.onload = function() {
                        console.log('保存的图片加载成功:', fileUrl);
                        img.classList.remove('hidden');
                        placeholder.classList.add('hidden');
                    };
                    
                    img.onerror = function() {
                        console.error('保存的图片加载失败:', fileUrl);
                        placeholder.innerHTML = `
                            <div class="text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p class="mt-2 text-sm text-red-500">Image failed to load</p>
                                <button class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600" onclick="window.loadSavedImage_${imgId}()">Retry</button>
                            </div>
                        `;
                    };
                    
                    img.src = objectURL;
                    
                    // 设置下载按钮的事件处理
                    const downloadBtn = document.getElementById(`${imgId}_main_download`);
                    if (downloadBtn) {
                        downloadBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            
                            // 显示下载状态
                            const originalText = this.innerHTML;
                            this.innerHTML = `
                                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Downloading...
                            `;
                            
                            try {
                                // 创建下载链接
                                const a = document.createElement('a');
                                a.href = objectURL;
                                a.download = filename;
                                document.body.appendChild(a);
                                a.click();
                                
                                // 清理
                                setTimeout(() => {
                                    document.body.removeChild(a);
                                    // 恢复按钮状态
                                    this.innerHTML = originalText;
                                    // 显示成功消息
                                    showToast('File downloaded successfully!', 'success');
                                }, 500);
                            } catch (error) {
                                console.error('图片下载出错:', error);
                                // 恢复按钮状态
                                this.innerHTML = originalText;
                                // 显示错误消息
                                showToast('Download failed: ' + error.message, 'error');
                            }
                        });
                    }
                })
                .catch(error => {
                    console.error('获取图片时出错:', error);
                    placeholder.innerHTML = `
                        <div class="text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p class="mt-2 text-sm text-red-500">Image failed to load</p>
                            <button class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600" onclick="window.loadSavedImage_${imgId}()">Retry</button>
                        </div>
                    `;
                });
            };
            
            // 在短延迟后加载图片
            setTimeout(() => {
                if (typeof window['loadSavedImage_' + imgId] === 'function') {
                    window['loadSavedImage_' + imgId]();
                }
            }, 100);
        } else {
            // 非图片文件使用增强的文件显示界面
            // 生成唯一ID用于文件元素
            const fileId = 'saved_file_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            
            // 获取合适的文件图标
            const fileIcon = getFileIconByExtension(fileExtension);
            
            contentHTML = `
                <div class="p-4">
                    <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div class="flex items-center">
                            <div class="text-2xl mr-3">${fileIcon}</div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-gray-900 dark:text-gray-100 truncate">${filename}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    ${item.file_size ? formatFileSize(item.file_size) : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-3 flex flex-wrap gap-2">
                            <a href="${fileUrl}" download="${filename}" class="download-btn inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded shadow-sm transition-colors" data-file-url="${fileUrl}" data-file-name="${filename}" id="${fileId}_download">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download File
                            </a>
                            <a href="${fileUrl}" target="_blank" class="inline-flex items-center px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 text-sm rounded shadow-sm transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Open in New Window
                            </a>
                        </div>
                    </div>
                    
                    ${item.notes ? `
                        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes:</div>
                            <div class="bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-sm text-gray-700 dark:text-gray-300">
                                ${formatMessageContent(item.notes)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // 添加一个函数用于处理文件下载
            window['handleFileDownload_' + fileId] = function() {
                const downloadBtn = document.getElementById(`${fileId}_download`);
                if (!downloadBtn) return;
                
                downloadBtn.addEventListener('click', function(e) {
                    // 如果是普通点击而且href属性有效，让浏览器默认处理
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey && downloadBtn.href) {
                        return true;
                    }
                    
                    e.preventDefault();
                    
                    const fileUrl = this.getAttribute('data-file-url');
                    const fileName = this.getAttribute('data-file-name');
                    
                    // 显示下载状态
                    const originalText = this.innerHTML;
                    this.innerHTML = `
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Downloading...
                    `;
                    
                    // 使用fetch API手动下载文件
                    fetch(fileUrl, {
                        method: 'GET',
                        cache: 'no-store',
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        }
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('File download failed: ' + response.status);
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        // 创建下载链接
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        
                        // 清理
                        setTimeout(() => {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(downloadUrl);
                            
                            // 恢复按钮状态
                            this.innerHTML = originalText;
                            
                            // 显示成功消息
                            showToast('File downloaded successfully!', 'success');
                        }, 100);
                    })
                    .catch(error => {
                        console.error('文件下载出错:', error);
                        
                        // 恢复按钮状态
                        this.innerHTML = originalText;
                        
                        // 显示错误消息
                        showToast('Download failed: ' + error.message, 'error');
                    });
                });
            };
            
            // 设置一个短延迟后，为下载按钮添加事件监听器
            setTimeout(() => {
                if (typeof window['handleFileDownload_' + fileId] === 'function') {
                    window['handleFileDownload_' + fileId]();
                }
            }, 100);
        }
    }
    
    // Combine header and content
    itemElement.innerHTML = headerHTML + contentHTML;
    
    // Add event listeners
    setupSavedItemEventListeners(itemElement, item);
    
    return itemElement;
}

// Format message content with links and formatting
function formatMessageContent(content) {
    if (!content) return '';
    
    // Escape HTML
    let formattedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 检测图片URL模式并转换为<img>标签 - 先处理图片
    if (formattedContent.includes('/uploads/') && (
        formattedContent.includes('.png') || 
        formattedContent.includes('.jpg') || 
        formattedContent.includes('.jpeg') || 
        formattedContent.includes('.gif')
    )) {
        // 如果整个内容看起来像是一个图片URL，则转换为图片标签
        return `<img src="${formattedContent}" alt="Uploaded Image" class="mt-2 max-w-xs rounded shadow-sm" style="max-height:300px;">`;
    }
    
    // 检测静态路径的图片并替换为新路径
    if (formattedContent.includes('/static/uploads/') && (
        formattedContent.includes('.png') || 
        formattedContent.includes('.jpg') || 
        formattedContent.includes('.jpeg') || 
        formattedContent.includes('.gif')
    )) {
        // 提取文件名
        const filename = formattedContent.split('/').pop();
        return `<img src="/uploads/${filename}" alt="Uploaded Image" class="mt-2 max-w-xs rounded shadow-sm" style="max-height:300px;">`;
    }
    
    // Convert URLs to clickable links
    formattedContent = formattedContent.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>'
    );
    
    // Convert @mentions
    formattedContent = formattedContent.replace(
        /@(\w+)/g,
        '<span class="text-blue-600 dark:text-blue-400 font-medium">@$1</span>'
    );
    
    return formattedContent;
}

// Set up event listeners for saved item elements
function setupSavedItemEventListeners(element, item) {
    // Delete button
    const deleteBtn = element.querySelector('.delete-saved-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            deleteSavedItem(item.save_id, element);
        });
    }
    
    // Edit notes button
    const editNotesBtn = element.querySelector('.edit-notes-btn');
    if (editNotesBtn) {
        editNotesBtn.addEventListener('click', function() {
            openNotesEditor(item, element);
        });
    }
}

// Delete a saved item
function deleteSavedItem(saveId, element) {
    // Confirm deletion
    if (!confirm('Are you sure you want to remove this item from your saved items?')) {
        return;
    }
    
    // Start animation
    element.classList.add('opacity-50');
    
    // Send delete request
    fetch(`/api/saved_items/${saveId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete saved item');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Add exit animation
            element.classList.add('animate-slide-out');
            
            // Remove element after animation
            setTimeout(() => {
                element.remove();
                
                // If no items left, refresh to show empty state
                const container = document.getElementById('savedItemsContainer');
                if (container && !container.querySelector('.saved-item')) {
                    loadSavedItems(true);
                }
            }, 300);
        } else {
            throw new Error(data.message || 'Failed to delete');
        }
    })
    .catch(error => {
        console.error('Error deleting saved item:', error);
        element.classList.remove('opacity-50');
        alert('Error: ' + error.message);
    });
}

// Open notes editor for a saved item
function openNotesEditor(item, element) {
    // Create modal if it doesn't exist
    let notesModal = document.getElementById('savedItemNotesModal');
    if (!notesModal) {
        notesModal = document.createElement('div');
        notesModal.id = 'savedItemNotesModal';
        notesModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        notesModal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-xl overflow-hidden animate-scale-in">
                <div class="bg-amber-50 dark:bg-amber-900/30 p-4 border-b border-amber-100 dark:border-amber-900/50">
                    <h3 class="text-lg font-semibold text-amber-800 dark:text-amber-300">Add Notes</h3>
                    <p class="text-sm text-amber-700 dark:text-amber-200 mt-1">Add your notes about this saved item</p>
                </div>
                <div class="p-4">
                    <textarea id="itemNotesInput" placeholder="Type your notes here..." class="w-full h-32 border border-gray-300 dark:border-gray-600 rounded-md p-3 text-gray-800 dark:text-gray-200 dark:bg-gray-700 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-colors resize-none"></textarea>
                    <div class="text-right text-xs text-gray-500 dark:text-gray-400 mt-1" id="notesCharCount">0/500</div>
                </div>
                <div class="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <button class="notes-cancel-btn px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors text-sm">Cancel</button>
                    <button class="notes-save-btn px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors text-sm">Save Notes</button>
                </div>
            </div>
        `;
        document.body.appendChild(notesModal);
        
        // Add cancel button event
        notesModal.querySelector('.notes-cancel-btn').addEventListener('click', function() {
            notesModal.classList.add('animate-fade-out');
            setTimeout(() => {
                notesModal.remove();
            }, 200);
        });
        
        // Character count update
        const textarea = notesModal.querySelector('#itemNotesInput');
        const charCount = notesModal.querySelector('#notesCharCount');
        textarea.addEventListener('input', function() {
            charCount.textContent = `${this.value.length}/500`;
            // Prevent typing if limit reached
            if (this.value.length > 500) {
                this.value = this.value.substring(0, 500);
                charCount.textContent = '500/500';
            }
        });
    }
    
    // Set current notes
    const textarea = notesModal.querySelector('#itemNotesInput');
    textarea.value = item.notes || '';
    
    // Update character count
    const charCount = notesModal.querySelector('#notesCharCount');
    charCount.textContent = `${textarea.value.length}/500`;
    
    // Set save handler
    const saveBtn = notesModal.querySelector('.notes-save-btn');
    const originalSaveHandler = saveBtn._notesHandler;
    if (originalSaveHandler) {
        saveBtn.removeEventListener('click', originalSaveHandler);
    }
    
    // New save handler
    const saveHandler = function() {
        const notes = textarea.value.trim();
        
        // Save button state
        saveBtn.disabled = true;
        saveBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
        `;
        
        // Send update request
        fetch(`/api/saved_items/${item.save_id}/notes`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update notes');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update the item and element with new notes
                item.notes = notes;
                
                // If element is provided, update it directly
                if (element) {
                    const notesSection = element.querySelector('.mt-3.pt-3.border-t');
                    if (notes) {
                        if (notesSection) {
                            // Update existing notes section
                            const notesContent = notesSection.querySelector('.bg-amber-50');
                            notesContent.innerHTML = formatMessageContent(notes);
                        } else {
                            // Create new notes section
                            const contentDiv = element.querySelector('.p-4');
                            const notesDiv = document.createElement('div');
                            notesDiv.className = 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-700';
                            notesDiv.innerHTML = `
                                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes:</div>
                                <div class="bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-sm text-gray-700 dark:text-gray-300">
                                    ${formatMessageContent(notes)}
                                </div>
                            `;
                            contentDiv.appendChild(notesDiv);
                        }
                    } else if (notesSection) {
                        // Remove notes section if notes were cleared
                        notesSection.remove();
                    }
                }
                
                // Close modal
                notesModal.classList.add('animate-fade-out');
                setTimeout(() => {
                    notesModal.remove();
                }, 200);
            } else {
                throw new Error(data.message || 'Failed to update notes');
            }
        })
        .catch(error => {
            console.error('Error updating notes:', error);
            alert('Error: ' + error.message);
            
            // Reset button state
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Notes';
        });
    };
    
    // Set new handler
    saveBtn._notesHandler = saveHandler;
    saveBtn.addEventListener('click', saveHandler);
    
    // Show modal
    document.body.appendChild(notesModal);
    textarea.focus();
}

// Add necessary animation styles
function addAnimationStyles() {
    if (!document.getElementById('saved-items-animations')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'saved-items-animations';
        styleElement.textContent = `
             @keyframes fadeIn {
                 from { opacity: 0; transform: translateY(10px); }
                 to { opacity: 1; transform: translateY(0); }
             }
             
             @keyframes fadeOut {
                 from { opacity: 1; transform: translateY(0); }
                 to { opacity: 0; transform: translateY(10px); }
             }
             
             @keyframes slideOut {
                 from { opacity: 1; transform: translateX(0); }
                 to { opacity: 0; transform: translateX(-100%); }
             }
             
             .animate-fade-in {
                 animation: fadeIn 0.3s ease-out forwards;
             }
             
             .animate-fade-out {
                 animation: fadeOut 0.2s ease-in forwards;
             }
             
             .animate-slide-out {
                 animation: slideOut 0.3s ease-in-out forwards;
             }
         `;
        document.head.appendChild(styleElement);
    }
}

// 添加一个简单的通知提示函数
function showToast(message, type = 'info') {
    // 如果已有toast，先移除
    const existingToast = document.getElementById('savedItemsToast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建新的toast
    const toast = document.createElement('div');
    toast.id = 'savedItemsToast';
    
    // 根据类型设置不同的颜色
    let bgColor = 'bg-blue-500';
    let icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    
    if (type === 'success') {
        bgColor = 'bg-green-500';
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
    } else if (type === 'error') {
        bgColor = 'bg-red-500';
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else if (type === 'warning') {
        bgColor = 'bg-yellow-500';
        icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }
    
    // 设置样式和内容
    toast.className = `fixed bottom-5 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center animate-bounce-in`;
    toast.innerHTML = `
        <div class="mr-2">${icon}</div>
        <div>${message}</div>
    `;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 2.5秒后自动移除
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.classList.remove('animate-bounce-in');
            toast.classList.add('animate-fade-out');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    toast.remove();
                }
            }, 300);
        }
    }, 2500);
}

// 获取文件图标
function getFileIconByExtension(extension) {
    if (!extension) return '📄';
    
    extension = extension.toLowerCase();
    
    // 图片文件
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
        return '🖼️';
    }
    
    // 文档文件
    if (['doc', 'docx', 'txt', 'rtf', 'odt', 'pages'].includes(extension)) {
        return '📝';
    }
    
    // PDF文件
    if (extension === 'pdf') {
        return '📕';
    }
    
    // 电子表格
    if (['xls', 'xlsx', 'csv', 'numbers', 'ods'].includes(extension)) {
        return '📊';
    }
    
    // 演示文稿
    if (['ppt', 'pptx', 'key', 'odp'].includes(extension)) {
        return '📊';
    }
    
    // 音频文件
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(extension)) {
        return '🔊';
    }
    
    // 视频文件
    if (['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'].includes(extension)) {
        return '🎬';
    }
    
    // 压缩文件
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
        return '🗜️';
    }
    
    // 代码文件
    if (['html', 'css', 'js', 'py', 'java', 'php', 'rb', 'c', 'cpp', 'h', 'cs', 'swift'].includes(extension)) {
        return '📜';
    }
    
    // 默认图标
    return '📄';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    
    bytes = Number(bytes);
    
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// 下载保存的项目
function downloadSavedItem(button) {
    const fileUrl = button.getAttribute('data-file-url');
    const fileName = button.getAttribute('data-file-name');
    
    // 检查URL是否有效
    if (!fileUrl) {
        showToast('No file download link found', 'error');
        return;
    }
    
    // 显示下载状态
    const originalHtml = button.innerHTML;
    button.innerHTML = `
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;
    button.disabled = true;
    
    // 使用fetch API获取文件
    fetch(fileUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('File download failed: ' + response.status);
        }
        return response.blob();
    })
    .then(blob => {
        // 创建一个临时链接来下载文件
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // 清理
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // 恢复按钮状态
        button.innerHTML = originalHtml;
        button.disabled = false;
        
        // 显示成功通知
        showToast('File downloaded successfully!', 'success');
    })
    .catch(error => {
        console.error('Error downloading file:', error);
        
        // 恢复按钮状态
        button.innerHTML = originalHtml;
        button.disabled = false;
        
        // 显示错误通知
        showToast('Download failed: ' + error.message, 'error');
    });
}

// Update filter style based on selection
function updateFilterStyle(filterElement) {
    if (!filterElement) return;
    
    const selectedValue = filterElement.value;
    
    // Add visual indicator for selected filter
    filterElement.classList.add('border-amber-400', 'dark:border-amber-500');
    
    // Add a subtle background color
    if (selectedValue !== 'all') {
        filterElement.classList.add('bg-amber-50', 'dark:bg-amber-900/20');
        filterElement.classList.remove('bg-white', 'dark:bg-gray-700');
    } else {
        filterElement.classList.remove('bg-amber-50', 'dark:bg-amber-900/20');
        filterElement.classList.add('bg-white', 'dark:bg-gray-700');
    }
    
    // Update dropdown arrow color
    const icon = filterElement.parentElement.querySelector('svg');
    if (icon) {
        if (selectedValue !== 'all') {
            icon.classList.add('text-amber-500');
            icon.classList.remove('text-gray-400');
        } else {
            icon.classList.remove('text-amber-500');
            icon.classList.add('text-gray-400');
        }
    }
}