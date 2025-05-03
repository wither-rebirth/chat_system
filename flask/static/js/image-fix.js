/**
 * Image Fix
 * Script to fix image loading issues in pinned messages and saved posts
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Image fix script loaded');
  
  // Initialize 
  setupImageFix();
  
  // Make global function available
  window.fixImages = fixAllImages;
  window.fixImage = fixImage;
  
  // Add helper function to global scope
  window.FilePreview = window.FilePreview || {};
  window.FilePreview.fixImageUrl = function(url) {
    return extractAndFormatImageUrl(url);
  };
  
  // 在页面加载后立即执行修复，并持续检查
  setTimeout(fixAllImages, 500);
  setTimeout(fixPinnedAndSavedImages, 1000);
  
  // 每秒检查一次
  setInterval(fixPinnedAndSavedImages, 2000);
});

/**
 * Main setup function for image fixes
 */
function setupImageFix() {
  // Attach event listeners for panel toggles
  attachPanelListeners();
  
  // Set up MutationObserver to catch dynamically added content
  setupImageObserver();
  
  // Register direct access helper
  registerDirectAccessHelper();
}

/**
 * Process and format image URL
 * @param {string} url - Original image URL
 * @returns {string} - Correctly formatted URL
 */
function extractAndFormatImageUrl(url) {
  if (!url) return '';
  
  console.log('Processing image URL:', url);
  
  // If already absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Extract filename
  let filename = '';
  
  // Handle different URL patterns
  if (url.includes('/uploads/')) {
    filename = url.split('/uploads/').pop().split('?')[0];
  } else if (url.includes('Screenshot_')) {
    const parts = url.split('/');
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes('Screenshot_')) {
        filename = parts[i].split('?')[0];
        break;
      }
    }
  } else if (url.includes('static/uploads/')) {
    filename = url.split('static/uploads/').pop().split('?')[0];
  }
  
  if (!filename) {
    console.warn('Could not extract filename from:', url);
    return url;
  }
  
  // Make sure there's no extra path
  filename = filename.split('/').pop();
  
  // Return direct URL to file
  return `/uploads/${filename}`;
}

/**
 * Fix a specific image element
 * @param {HTMLImageElement} img - Image element to fix
 */
function fixImage(img) {
  if (!img || !img.src) return;
  
  const originalSrc = img.src;
  console.log('Fixing image:', originalSrc);
  
  // Get correct URL 
  const correctUrl = extractAndFormatImageUrl(originalSrc);
  
  if (correctUrl === originalSrc) {
    // If URL looks the same, add cache buster
    img.src = originalSrc + (originalSrc.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    return;
  }
  
  console.log('Corrected URL:', correctUrl);
  
  // Set new source with cache buster
  img.src = correctUrl + '?t=' + new Date().getTime();
  
  // Set error handler as fallback
  img.onerror = function() {
    console.error('Failed to load with corrected URL, trying alternate paths');
    tryImagePaths(img, originalSrc);
  };
}

/**
 * Try multiple paths for an image
 * @param {HTMLImageElement} img - Image element to fix
 * @param {string} originalSrc - Original image source
 */
function tryImagePaths(img, originalSrc) {
  // Extract just the filename
  const parts = originalSrc.split('/');
  let filename = '';
  
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].includes('Screenshot_') || parts[i].includes('.png') || parts[i].includes('.jpg')) {
      filename = parts[i].split('?')[0];
      break;
    }
  }
  
  if (!filename) {
    console.error('Could not extract filename for alternate paths');
    return;
  }
  
  // 更新路径顺序，优先使用/uploads/路由
  const paths = [
    `/uploads/${filename}`,
    `/static/uploads/${filename}`,
    `../static/uploads/${filename}`,
    originalSrc
  ];
  
  console.log('Trying alternate paths:', paths);
  
  // Try each path
  let pathIndex = 0;
  
  function tryNextPath() {
    if (pathIndex >= paths.length) {
      console.error('All image paths failed');
      return;
    }
    
    const path = paths[pathIndex];
    console.log(`Trying path ${pathIndex + 1}/${paths.length}: ${path}`);
    
    const testImg = new Image();
    testImg.onload = function() {
      console.log('Path worked:', path);
      img.src = path + '?t=' + new Date().getTime();
    };
    testImg.onerror = function() {
      console.log('Path failed:', path);
      pathIndex++;
      tryNextPath();
    };
    testImg.src = path;
  }
  
  tryNextPath();
}

/**
 * Register helper function to work with direct access
 */
function registerDirectAccessHelper() {
  // Create global helper
  window.fixBrokenImageUrl = function(url) {
    return extractAndFormatImageUrl(url);
  };
  
  // Patch existing FilePreview component if available
  if (window.FilePreview) {
    const originalNormalizeFileUrl = window.FilePreview.normalizeUrl;
    window.FilePreview.normalizeUrl = function(url) {
      const fixedUrl = extractAndFormatImageUrl(url);
      console.log('Fixed URL through FilePreview:', fixedUrl);
      return fixedUrl;
    };
  }
  
  // Monkey patch Image constructor
  const originalImage = window.Image;
  window.Image = function() {
    const img = new originalImage();
    const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
    
    Object.defineProperty(img, 'src', {
      set: function(url) {
        if (url && typeof url === 'string' && (url.includes('Screenshot_') || url.includes('/uploads/') || url.includes('static/uploads'))) {
          const fixedUrl = extractAndFormatImageUrl(url);
          console.log('Auto-fixing image URL:', url, '->', fixedUrl);
          originalSrcSetter.call(this, fixedUrl);
        } else {
          originalSrcSetter.call(this, url);
        }
      }
    });
    
    return img;
  };
  window.Image.prototype = originalImage.prototype;
}

/**
 * Fix all images on the page
 */
function fixAllImages() {
  console.log('Fixing all images on page');
  document.querySelectorAll('img').forEach(img => fixImage(img));
}

/**
 * Fix images in a specific container
 * @param {HTMLElement} container - Container element with images
 */
function fixImagesInContainer(container) {
  if (!container) return;
  
  console.log('Fixing images in container:', container.id || 'unnamed container');
  container.querySelectorAll('img').forEach(img => fixImage(img));
}

/**
 * Attach listeners to panels that contain images
 */
function attachPanelListeners() {
  // Pin button
  const pinButton = document.getElementById('togglePinned');
  if (pinButton) {
    pinButton.addEventListener('click', function() {
      console.log('Pin button clicked');
      setTimeout(() => {
        const pinnedPanel = document.getElementById('pinnedPanel');
        if (pinnedPanel && !pinnedPanel.classList.contains('translate-x-full')) {
          fixImagesInContainer(pinnedPanel);
        }
      }, 300);
    });
  }
  
  // Saved button
  const savedButton = document.getElementById('toggleSaved');
  if (savedButton) {
    savedButton.addEventListener('click', function() {
      console.log('Saved button clicked');
      setTimeout(() => {
        const savedPanel = document.getElementById('savedPanel');
        if (savedPanel && !savedPanel.classList.contains('translate-x-full')) {
          fixImagesInContainer(savedPanel);
        }
      }, 300);
    });
  }
  
  // Listen for custom events
  document.addEventListener('pinnedMessagesLoaded', function() {
    console.log('Pinned messages loaded event detected');
    const pinnedPanel = document.getElementById('pinnedPanel');
    if (pinnedPanel) {
      fixImagesInContainer(pinnedPanel);
    }
  });
  
  document.addEventListener('savedItemsLoaded', function() {
    console.log('Saved items loaded event detected');
    const savedPanel = document.getElementById('savedPanel');
    if (savedPanel) {
      fixImagesInContainer(savedPanel);
    }
  });
}

/**
 * Set up observer for dynamically added content
 */
function setupImageObserver() {
  // Create MutationObserver to watch for dynamically added images
  const observer = new MutationObserver(function(mutations) {
    let shouldFixImages = false;
    
    mutations.forEach(function(mutation) {
      // Check if added nodes contain images
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'IMG') {
              shouldFixImages = true;
              break;
            } else if (node.querySelector('img')) {
              shouldFixImages = true;
              break;
            }
          }
        }
      }
    });
    
    // Fix images if needed
    if (shouldFixImages) {
      setTimeout(fixAllImages, 100);
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true, 
    subtree: true
  });
}

/**
 * 专门针对Pin Messages和Saved Messages中的图片进行修复
 */
function fixPinnedAndSavedImages() {
  console.log('Checking for pinned and saved images to fix...');
  
  // 修复Pinned Messages面板中的图片
  const pinnedPanel = document.getElementById('pinnedPanel');
  if (pinnedPanel && !pinnedPanel.classList.contains('translate-x-full')) {
    console.log('Fixing pinned panel images');
    const pinnedImages = pinnedPanel.querySelectorAll('img');
    pinnedImages.forEach(img => {
      const originalSrc = img.src;
      
      // 如果是上传的图片，修正路径
      if (originalSrc.includes('Screenshot_') || 
          originalSrc.includes('uploads/') || 
          originalSrc.includes('static/uploads')) {
            
        // 从URL中提取文件名
        const parts = originalSrc.split('/');
        let filename = '';
        
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].includes('Screenshot_') || parts[i].includes('.png') || parts[i].includes('.jpg')) {
            filename = parts[i].split('?')[0];
            break;
          }
        }
        
        if (filename) {
          const newSrc = `/uploads/${filename}?t=${new Date().getTime()}`;
          console.log(`Fixing pinned image: ${originalSrc} -> ${newSrc}`);
          img.src = newSrc;
        }
      }
    });
  }
  
  // 修复Saved Messages面板中的图片
  const savedPanel = document.getElementById('savedPanel');
  if (savedPanel && !savedPanel.classList.contains('translate-x-full')) {
    console.log('Fixing saved panel images');
    const savedImages = savedPanel.querySelectorAll('img');
    savedImages.forEach(img => {
      const originalSrc = img.src;
      
      // 如果是上传的图片，修正路径
      if (originalSrc.includes('Screenshot_') || 
          originalSrc.includes('uploads/') || 
          originalSrc.includes('static/uploads')) {
            
        // 从URL中提取文件名
        const parts = originalSrc.split('/');
        let filename = '';
        
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].includes('Screenshot_') || parts[i].includes('.png') || parts[i].includes('.jpg')) {
            filename = parts[i].split('?')[0];
            break;
          }
        }
        
        if (filename) {
          const newSrc = `/uploads/${filename}?t=${new Date().getTime()}`;
          console.log(`Fixing saved image: ${originalSrc} -> ${newSrc}`);
          img.src = newSrc;
        }
      }
    });
  }
} 