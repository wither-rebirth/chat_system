/**
 * File Previewer Component
 * For previewing files in saved posts and pinned messages
 */

// File type definitions with icons and display properties
const fileTypes = {
  // Images
  'image/jpeg': { icon: 'image', color: 'emerald', previewable: true, displayName: 'JPEG Image' },
  'image/png': { icon: 'image', color: 'emerald', previewable: true, displayName: 'PNG Image' },
  'image/gif': { icon: 'gif', color: 'emerald', previewable: true, displayName: 'GIF Image' },
  'image/svg+xml': { icon: 'image', color: 'emerald', previewable: true, displayName: 'SVG Image' },
  'image/webp': { icon: 'image', color: 'emerald', previewable: true, displayName: 'WebP Image' },
  
  // Documents
  'application/pdf': { icon: 'document-text', color: 'red', previewable: false, displayName: 'PDF Document' },
  'application/msword': { icon: 'document-text', color: 'blue', previewable: false, displayName: 'Word Document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'document-text', color: 'blue', previewable: false, displayName: 'Word Document' },
  'application/vnd.ms-excel': { icon: 'table', color: 'green', previewable: false, displayName: 'Excel Spreadsheet' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'table', color: 'green', previewable: false, displayName: 'Excel Spreadsheet' },
  'application/vnd.ms-powerpoint': { icon: 'presentation-chart', color: 'orange', previewable: false, displayName: 'PowerPoint Presentation' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: 'presentation-chart', color: 'orange', previewable: false, displayName: 'PowerPoint Presentation' },
  
  // Text
  'text/plain': { icon: 'document', color: 'gray', previewable: false, displayName: 'Text Document' },
  'text/html': { icon: 'code', color: 'purple', previewable: false, displayName: 'HTML Document' },
  'text/css': { icon: 'code', color: 'blue', previewable: false, displayName: 'CSS File' },
  'text/javascript': { icon: 'code', color: 'yellow', previewable: false, displayName: 'JavaScript File' },
  'application/json': { icon: 'code', color: 'yellow', previewable: false, displayName: 'JSON File' },
  'application/xml': { icon: 'code', color: 'indigo', previewable: false, displayName: 'XML File' },
  
  // Archives
  'application/zip': { icon: 'archive', color: 'amber', previewable: false, displayName: 'ZIP Archive' },
  'application/x-rar-compressed': { icon: 'archive', color: 'amber', previewable: false, displayName: 'RAR Archive' },
  'application/x-7z-compressed': { icon: 'archive', color: 'amber', previewable: false, displayName: '7Z Archive' },
  'application/gzip': { icon: 'archive', color: 'amber', previewable: false, displayName: 'GZIP Archive' },
  
  // Audio
  'audio/mpeg': { icon: 'music-note', color: 'pink', previewable: false, displayName: 'MP3 Audio' },
  'audio/wav': { icon: 'music-note', color: 'pink', previewable: false, displayName: 'WAV Audio' },
  'audio/ogg': { icon: 'music-note', color: 'pink', previewable: false, displayName: 'OGG Audio' },
  
  // Video
  'video/mp4': { icon: 'film', color: 'violet', previewable: false, displayName: 'MP4 Video' },
  'video/webm': { icon: 'film', color: 'violet', previewable: false, displayName: 'WebM Video' },
  'video/ogg': { icon: 'film', color: 'violet', previewable: false, displayName: 'OGG Video' },
  
  // Default
  'default': { icon: 'document', color: 'gray', previewable: false, displayName: 'Unknown File' }
};

// Helper function to get file information based on mime type
function getFileTypeInfo(mimeType) {
  return fileTypes[mimeType] || fileTypes['default'];
}

// Helper function to get file type based on extension
function getFileTypeFromFilename(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  
  const mimeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'gz': 'application/gzip',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogv': 'video/ogg'
  };
  
  const mimeType = mimeMap[extension] || 'application/octet-stream';
  return getFileTypeInfo(mimeType);
}

// Format file size for display
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file icon HTML based on file type
function getFileIconHTML(fileTypeInfo) {
  // Icons mapping for different file types
  const iconMap = {
    'document': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>`,
    'document-text': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
    'image': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`,
    'table': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>`,
    'presentation-chart': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>`,
    'code': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>`,
    'archive': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>`,
    'music-note': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>`,
    'film': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1z" /></svg>`,
    'gif': `<svg xmlns="http://www.w3.org/2000/svg" class="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 18h10M5 16V8h14v1M5 12h14" /></svg>`
  };
  
  const icon = iconMap[fileTypeInfo.icon] || iconMap['document'];
  const colorClass = `text-${fileTypeInfo.color}-500`;
  
  return `<div class="w-10 h-10 ${colorClass}">${icon}</div>`;
}

// 规范化URL路径 - 使用新的/uploads路由
function normalizeFileUrl(url) {
  if (!url) return '';
  
  // 添加调试日志
  console.log('规范化URL (原始):', url);
  
  let normalizedUrl = '';
  
  // 如果是绝对URL (http或https开头)，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('绝对URL，保持不变');
    return url;
  }
  
  // 提取文件名
  let filename = url;
  
  // 处理各种路径格式
  if (url.includes('/')) {
    const parts = url.split('/');
    filename = parts[parts.length - 1]; // 获取URL中的文件名部分
  }
  
  // 如果URL已经是正确格式，不做修改
  if (url.startsWith('/uploads/')) {
    console.log('URL已经是正确格式，保持不变');
    return url;
  }
  
  // 检查老格式的URL，如果是static/uploads开头的，转换为新格式
  if (url.startsWith('../static/uploads/') || url.startsWith('/static/uploads/')) {
    normalizedUrl = `/uploads/${filename}`;
    console.log('转换为新的uploads路由格式:', normalizedUrl);
    return normalizedUrl;
  }
  
  // 构造正确格式的URL - 使用新的/uploads路由确保在任何页面都能正确解析
  normalizedUrl = `/uploads/${filename}`;
  console.log('规范化URL (结果):', normalizedUrl);
  
  return normalizedUrl;
}

// Create file preview component
function createFilePreview(fileData, enableDownload = true) {
  const { 
    url, 
    name, 
    size = 0, 
    type = null, 
    extension = null,
    uploadDate = null
  } = fileData;
  
  // 规范化文件URL
  const normalizedUrl = normalizeFileUrl(url);
  
  console.log('创建文件预览:', {
    原始URL: url,
    规范化URL: normalizedUrl,
    文件名: name,
    文件类型: type
  });
  
  // Determine file type info
  let fileTypeInfo;
  if (type) {
    fileTypeInfo = getFileTypeInfo(type);
  } else if (name) {
    fileTypeInfo = getFileTypeFromFilename(name);
  } else {
    fileTypeInfo = fileTypes['default'];
  }
  
  // Determine if we can show image preview
  const isImage = fileTypeInfo.previewable && /^image\//i.test(type || '');
  console.log('是否为可预览图片:', isImage, '文件类型信息:', fileTypeInfo);
  
  const fileName = name || 'Unnamed file';
  const formattedSize = size ? formatFileSize(size) : '';
  const formattedDate = uploadDate ? new Date(uploadDate).toLocaleString() : '';
  
  // Create the preview HTML
  let previewHTML = `
    <div class="file-preview bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-shadow">
      <div class="flex items-start">
        <div class="flex-shrink-0">
  `;
  
  // Add thumbnail or icon
  if (isImage && normalizedUrl) {
    console.log('生成图片缩略图:', normalizedUrl);
    previewHTML += createImageThumbnail(normalizedUrl, fileName);
  } else {
    console.log('使用图标替代预览');
    previewHTML += `
      <div class="w-14 h-14 bg-${fileTypeInfo.color}-100 dark:bg-${fileTypeInfo.color}-900/30 rounded-md border border-${fileTypeInfo.color}-200 dark:border-${fileTypeInfo.color}-800/50 flex items-center justify-center">
        ${getFileIconHTML(fileTypeInfo)}
      </div>
    `;
  }
  
  // Add file details
  previewHTML += `
        </div>
        <div class="ml-3 flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]" title="${fileName}">
              ${fileName}
            </p>
            <div class="flex space-x-1">
  `;
  
  // Add download button if enabled
  if (enableDownload && normalizedUrl) {
    previewHTML += `
      <a href="${normalizedUrl}" download="${fileName}" class="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Download">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    `;
  }
  
  // Add view button for all files (opens in new tab)
  if (normalizedUrl) {
    previewHTML += `
      <a href="${normalizedUrl}" target="_blank" class="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Open">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    `;
  }
  
  // Close buttons div
  previewHTML += `
            </div>
          </div>
  `;
  
  // Add file type and size info
  previewHTML += `
          <div class="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-${fileTypeInfo.color}-100 dark:bg-${fileTypeInfo.color}-900/30 text-${fileTypeInfo.color}-800 dark:text-${fileTypeInfo.color}-300">
              ${fileTypeInfo.displayName}
            </span>
            ${formattedSize ? `<span class="ml-2">${formattedSize}</span>` : ''}
          </div>
  `;
  
  // Add upload date if available
  if (formattedDate) {
    previewHTML += `
          <div class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Uploaded ${formattedDate}
          </div>
    `;
  }
  
  // Close containers
  previewHTML += `
        </div>
      </div>
    </div>
  `;
  
  return previewHTML;
}

// Create a thumbnail preview for image files
function createImageThumbnail(fileUrl, fileName) {
  // 确保URL已规范化
  const normalizedUrl = normalizeFileUrl(fileUrl);
  
  console.log('创建图片缩略图预览:', normalizedUrl);
  
  // 生成唯一ID用于引用该图片元素
  const imgId = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  
  // 使用setTimeout确保元素添加到DOM后再处理图片
  setTimeout(() => {
    const imgElement = document.getElementById(imgId);
    if (imgElement) {
      console.log('强制加载图片:', normalizedUrl);
      
      // 确保图片会加载
      imgElement.onload = function() {
        console.log('图片已成功加载:', normalizedUrl);
      };
      
      imgElement.onerror = function() {
        console.error('图片加载失败:', normalizedUrl);
        // 尝试另一种图片加载方式
        const tempImg = new Image();
        tempImg.onload = function() {
          console.log('使用Image()方法成功加载图片:', normalizedUrl);
          imgElement.src = normalizedUrl;
        };
        tempImg.onerror = function() {
          console.error('使用Image()方法加载图片仍然失败:', normalizedUrl);
        };
        tempImg.src = normalizedUrl;
      };
      
      // 强制重新加载图片
      imgElement.src = normalizedUrl + '?t=' + new Date().getTime();
    }
  }, 100);
  
  return `
    <div class="relative group overflow-hidden rounded-md">
      <img id="${imgId}" src="${normalizedUrl}" alt="${fileName}" class="w-full h-24 object-cover rounded-md border border-gray-200 dark:border-gray-700 shadow-sm" />
      <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <button onclick="if(window.FilePreview) window.FilePreview.openImage('${normalizedUrl}', '${fileName}'); else console.error('FilePreview not available!');" class="p-1.5 bg-white rounded-full shadow-sm text-gray-700 hover:text-blue-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
      </div>
    </div>
  `;
}

// Open fullsize image preview
function openImagePreview(imageUrl, imageName) {
  // 规范化URL
  const normalizedUrl = normalizeFileUrl(imageUrl);
  
  // Create modal if it doesn't exist
  let previewModal = document.getElementById('imagePreviewModal');
  if (!previewModal) {
    previewModal = document.createElement('div');
    previewModal.id = 'imagePreviewModal';
    previewModal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 hidden';
    previewModal.innerHTML = `
      <div class="max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden flex flex-col animate-scale-in">
        <div class="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white image-preview-title">Image Preview</h3>
          <div class="flex space-x-2">
            <a href="#" class="download-link p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Download Image">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <button class="close-preview p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Close">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div class="overflow-auto flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
          <img src="" alt="" class="preview-image max-w-full max-h-[calc(90vh-80px)] object-contain" />
        </div>
      </div>
    `;
    document.body.appendChild(previewModal);
    
    // Add event listeners
    previewModal.querySelector('.close-preview').addEventListener('click', () => {
      previewModal.classList.add('animate-scale-out');
      setTimeout(() => {
        previewModal.classList.add('hidden');
        previewModal.classList.remove('animate-scale-out');
      }, 200);
    });
    
    // Close on background click
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) {
        previewModal.classList.add('animate-scale-out');
        setTimeout(() => {
          previewModal.classList.add('hidden');
          previewModal.classList.remove('animate-scale-out');
        }, 200);
      }
    });
  }
  
  // Update modal content
  const imageElement = previewModal.querySelector('.preview-image');
  const titleElement = previewModal.querySelector('.image-preview-title');
  const downloadLink = previewModal.querySelector('.download-link');
  
  imageElement.src = normalizedUrl;
  imageElement.alt = imageName || 'Image Preview';
  titleElement.textContent = imageName || 'Image Preview';
  downloadLink.href = normalizedUrl;
  downloadLink.setAttribute('download', imageName || 'image');
  
  // Show modal
  previewModal.classList.remove('hidden');
}

// Add necessary animation styles for the preview
function addFilePreviewAnimations() {
  if (!document.getElementById('file-preview-animations')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'file-preview-animations';
    styleElement.textContent = `
      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes scaleOut {
        from { transform: scale(1); opacity: 1; }
        to { transform: scale(0.95); opacity: 0; }
      }
      
      .animate-scale-in {
        animation: scaleIn 0.2s ease-out forwards;
      }
      
      .animate-scale-out {
        animation: scaleOut 0.2s ease-in forwards;
      }
    `;
    document.head.appendChild(styleElement);
  }
}

// 强制加载所有图片
function forceLoadAllImages() {
  console.log('开始强制加载所有图片...');
  
  // 处理所有图片
  document.querySelectorAll('img').forEach((img, index) => {
    if (!img.src) return;
    
    const originalSrc = img.src;
    console.log(`强制加载图片 #${index + 1}: ${originalSrc}`);
    
    // 添加加载事件处理
    img.onload = function() {
      console.log(`图片 #${index + 1} 成功加载`);
    };
    
    img.onerror = function() {
      console.error(`图片 #${index + 1} 加载失败:`, originalSrc);
      
      // 预加载尝试
      const preloadImage = new Image();
      preloadImage.onload = function() {
        console.log(`预加载图片 #${index + 1} 成功，重新设置src`);
        img.src = originalSrc + '?t=' + new Date().getTime();
      };
      preloadImage.src = originalSrc;
    };
    
    // 强制重新加载图片
    const cacheBuster = '?reload=' + new Date().getTime();
    img.src = originalSrc.includes('?') ? originalSrc.split('?')[0] + cacheBuster : originalSrc + cacheBuster;
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  addFilePreviewAnimations();
  
  // Add debugging for file preview
  console.log('Initializing FilePreview component...');
  
  // Expose the functions globally
  window.FilePreview = {
    create: createFilePreview,
    openImage: openImagePreview,
    getTypeInfo: getFileTypeFromFilename,
    formatSize: formatFileSize,
    normalizeUrl: normalizeFileUrl,  // 明确地暴露URL规范化函数
    processImages: processImagesInElement,  // 暴露处理图片函数
    forceLoadImages: forceLoadAllImages  // 暴露强制加载图片函数
  };
  
  // 同时将processImagesInElement函数暴露到全局作用域
  window.processImagesInElement = processImagesInElement;
  window.forceLoadAllImages = forceLoadAllImages;
  
  console.log('File preview component initialized and exposed globally as window.FilePreview');
  console.log('URL normalizer available as window.FilePreview.normalizeUrl');
  console.log('Image processor available as window.FilePreview.processImages or window.processImagesInElement');
  
  // 立即运行URL规范化
  if (window.FilePreview) {
    console.log('FilePreview is available, normalizing URLs immediately');
    normalizeAllFileUrls();
    
    // 监听固定消息面板和保存消息面板的打开事件
    document.addEventListener('click', function(e) {
      // 获取事件目标
      const target = e.target;
      
      // 检查是否点击了打开固定消息面板的按钮
      if (target.id === 'togglePinned' || target.closest('#togglePinned')) {
        console.log('检测到固定消息按钮点击');
        setTimeout(function() {
          const pinnedPanel = document.getElementById('pinnedPanel');
          if (pinnedPanel && !pinnedPanel.classList.contains('translate-x-full')) {
            console.log('固定消息面板已打开，处理其中的图片URL');
            processImagesInElement(pinnedPanel);
            
            // 延迟500ms后强制加载所有图片
            setTimeout(() => {
              console.log('固定消息面板打开后强制加载所有图片');
              document.querySelectorAll('#pinnedPanel img').forEach(img => {
                const src = img.src;
                img.src = src + (src.includes('?') ? '&t=' : '?t=') + new Date().getTime();
              });
            }, 500);
          }
        }, 300); // 等待面板动画完成
      }
      
      // 检查是否点击了打开保存消息面板的按钮
      if (target.id === 'toggleSaved' || target.closest('#toggleSaved')) {
        console.log('检测到保存消息按钮点击');
        setTimeout(function() {
          const savedPanel = document.getElementById('savedPanel');
          if (savedPanel && !savedPanel.classList.contains('translate-x-full')) {
            console.log('保存消息面板已打开，处理其中的图片URL');
            processImagesInElement(savedPanel);
            
            // 延迟500ms后强制加载所有图片
            setTimeout(() => {
              console.log('保存消息面板打开后强制加载所有图片');
              document.querySelectorAll('#savedPanel img').forEach(img => {
                const src = img.src;
                img.src = src + (src.includes('?') ? '&t=' : '?t=') + new Date().getTime();
              });
            }, 500);
          }
        }, 300); // 等待面板动画完成
      }
    });
    
    // 监听自定义事件，例如加载固定消息后
    document.addEventListener('pinnedMessagesLoaded', function(e) {
      console.log('检测到固定消息加载事件，处理其中的图片URL');
      const pinnedPanel = document.getElementById('pinnedPanel');
      if (pinnedPanel) {
        processImagesInElement(pinnedPanel);
        
        // 延迟500ms后强制加载所有图片
        setTimeout(() => {
          console.log('固定消息加载事件后强制加载所有图片');
          document.querySelectorAll('#pinnedPanel img').forEach(img => {
            const src = img.src;
            img.src = src + (src.includes('?') ? '&t=' : '?t=') + new Date().getTime();
          });
        }, 500);
      }
    });
    
    // 监听保存消息加载事件
    document.addEventListener('savedItemsLoaded', function(e) {
      console.log('检测到保存消息加载事件，处理其中的图片URL');
      const savedPanel = document.getElementById('savedPanel');
      if (savedPanel) {
        processImagesInElement(savedPanel);
        
        // 延迟500ms后强制加载所有图片
        setTimeout(() => {
          console.log('保存消息加载事件后强制加载所有图片');
          document.querySelectorAll('#savedPanel img').forEach(img => {
            const src = img.src;
            img.src = src + (src.includes('?') ? '&t=' : '?t=') + new Date().getTime();
          });
        }, 500);
      }
    });
    
    // 页面加载完成后延迟强制加载所有图片
    setTimeout(forceLoadAllImages, 1000);
  }
});

// 规范化页面上所有图片和文件链接的URL
function normalizeAllFileUrls() {
  console.log('开始规范化页面上的所有文件URL...');
  
  // 处理固定消息和保存的消息面板中的图片
  const pinnedPanel = document.getElementById('pinnedPanel');
  const savedPanel = document.getElementById('savedPanel');
  
  // 如果找到了这些面板，单独处理其中的图片
  if (pinnedPanel) {
    console.log('处理固定消息面板中的图片');
    processImagesInElement(pinnedPanel);
  }
  
  if (savedPanel) {
    console.log('处理保存的消息面板中的图片');
    processImagesInElement(savedPanel);
  }
  
  // 处理所有可能需要规范化的图片
  document.querySelectorAll('img').forEach(img => {
    if (img.src && (
        img.src.includes('uploads/') || 
        img.src.includes('static/uploads') ||
        img.src.includes('/static/uploads') ||
        img.src.includes('Screenshot_') ||
        img.src.includes('file') || 
        img.src.includes('message_')
    )) {
      const originalSrc = img.src;
      const normalizedSrc = normalizeFileUrl(originalSrc);
      if (originalSrc !== normalizedSrc) {
        console.log(`规范化图片URL: ${originalSrc} -> ${normalizedSrc}`);
        img.src = normalizedSrc;
      }
    }
  });
  
  // 规范化所有文件下载链接
  document.querySelectorAll('a[download], a[href*="uploads/"], a[href*="static/uploads"], a[href*="/static/uploads"], a[href*="Screenshot_"], a[href*="file"], a[href*="message_"]').forEach(link => {
    if (link.href) {
      const originalHref = link.href;
      const normalizedHref = normalizeFileUrl(originalHref);
      if (originalHref !== normalizedHref) {
        console.log(`规范化下载链接: ${originalHref} -> ${normalizedHref}`);
        link.href = normalizedHref;
      }
    }
  });
  
  console.log('URL规范化完成');
  
  // 设置MutationObserver监听DOM变化，规范化新添加的元素URL
  setupUrlNormalizationObserver();
}

// 处理特定元素内的所有图片
function processImagesInElement(element) {
  if (!element) return;
  
  const images = element.querySelectorAll('img');
  console.log(`找到 ${images.length} 张图片需要处理`);
  
  images.forEach((img, index) => {
    const originalSrc = img.src;
    console.log(`处理图片 #${index + 1}: ${originalSrc}`);
    
    // 确保图片有src属性
    if (!originalSrc) {
      console.warn(`图片 #${index + 1} 没有src属性`);
      return;
    }
    
    const normalizedSrc = normalizeFileUrl(originalSrc);
    
    // 添加加载事件处理
    img.onload = function() {
      console.log(`图片 #${index + 1} 成功加载:`, normalizedSrc);
    };
    
    img.onerror = function() {
      console.error(`图片 #${index + 1} 加载失败:`, normalizedSrc);
      
      // 尝试另一种图片加载方式
      const tempImg = new Image();
      tempImg.onload = function() {
        console.log(`使用Image()方法成功加载图片 #${index + 1}:`, normalizedSrc);
        img.src = normalizedSrc + '?t=' + new Date().getTime();
      };
      tempImg.onerror = function() {
        console.error(`使用Image()方法加载图片 #${index + 1} 仍然失败:`, normalizedSrc);
      };
      tempImg.src = normalizedSrc;
    };
    
    if (originalSrc !== normalizedSrc) {
      console.log(`规范化图片URL: ${originalSrc} -> ${normalizedSrc}`);
      // 添加时间戳参数避免缓存
      img.src = normalizedSrc + '?t=' + new Date().getTime();
    } else {
      // 强制重新加载图片
      img.src = originalSrc + '?t=' + new Date().getTime();
    }
  });
}

// 设置MutationObserver监听DOM变化
function setupUrlNormalizationObserver() {
  // 如果已经设置过观察器，则不再重复设置
  if (window.urlNormalizationObserver) {
    return;
  }
  
  // 创建MutationObserver实例
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // 处理新增的节点
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(function(node) {
          // 检查是否是元素节点
          if (node.nodeType === 1) {
            // 首先检查是否是固定消息或保存的消息面板
            if (node.id === 'pinnedPanel' || node.id === 'savedPanel' || 
                node.classList.contains('pinned-message') || node.classList.contains('saved-item')) {
              console.log('检测到固定/保存消息面板或项目添加，单独处理其中图片:', node);
              processImagesInElement(node);
            }
            
            // 规范化新添加元素中的图片URL
            const images = node.querySelectorAll('img');
            images.forEach(img => {
              if (img.src && (
                  img.src.includes('uploads/') || 
                  img.src.includes('static/uploads') ||
                  img.src.includes('/static/uploads') ||
                  img.src.includes('Screenshot_') ||
                  img.src.includes('file') ||
                  img.src.includes('message_')
              )) {
                const originalSrc = img.src;
                const normalizedSrc = normalizeFileUrl(originalSrc);
                
                // 添加加载事件处理
                img.onload = function() {
                  console.log('MutationObserver: 图片成功加载:', normalizedSrc);
                };
                
                img.onerror = function() {
                  console.error('MutationObserver: 图片加载失败:', normalizedSrc);
                  
                  // 尝试另一种图片加载方式
                  const tempImg = new Image();
                  tempImg.onload = function() {
                    console.log('MutationObserver: 使用Image()方法成功加载图片:', normalizedSrc);
                    img.src = normalizedSrc + '?t=' + new Date().getTime();
                  };
                  tempImg.onerror = function() {
                    console.error('MutationObserver: 使用Image()方法加载图片仍然失败:', normalizedSrc);
                  };
                  tempImg.src = normalizedSrc;
                };
                
                if (originalSrc !== normalizedSrc) {
                  console.log(`MutationObserver: 规范化图片URL: ${originalSrc} -> ${normalizedSrc}`);
                  // 添加时间戳参数避免缓存
                  img.src = normalizedSrc + '?t=' + new Date().getTime();
                } else {
                  // 强制重新加载图片
                  img.src = originalSrc + '?t=' + new Date().getTime();
                }
              }
            });
            
            // 规范化新添加元素中的链接URL
            const links = node.querySelectorAll('a[download], a[href*="uploads/"], a[href*="static/uploads"], a[href*="/static/uploads"], a[href*="Screenshot_"], a[href*="file"], a[href*="message_"]');
            links.forEach(link => {
              if (link.href) {
                const originalHref = link.href;
                const normalizedHref = normalizeFileUrl(originalHref);
                if (originalHref !== normalizedHref) {
                  console.log(`MutationObserver: 规范化链接URL: ${originalHref} -> ${normalizedHref}`);
                  link.href = normalizedHref;
                }
              }
            });
            
            // 检查节点本身是否是需要规范化的元素
            if (node.nodeName === 'IMG' && node.src && (
                node.src.includes('uploads/') || 
                node.src.includes('static/uploads') ||
                node.src.includes('/static/uploads') ||
                node.src.includes('Screenshot_') ||
                node.src.includes('file') ||
                node.src.includes('message_')
            )) {
              const originalSrc = node.src;
              const normalizedSrc = normalizeFileUrl(node.src);
              if (originalSrc !== normalizedSrc) {
                console.log(`MutationObserver: 规范化节点图片URL: ${originalSrc} -> ${normalizedSrc}`);
                node.src = normalizedSrc;
              }
            }
            
            if (node.nodeName === 'A' && node.href && (
                node.href.includes('uploads/') || 
                node.href.includes('static/uploads') ||
                node.href.includes('/static/uploads') ||
                node.href.includes('Screenshot_') || 
                node.href.includes('file') ||
                node.href.includes('message_') ||
                node.hasAttribute('download')
            )) {
              const originalHref = node.href;
              const normalizedHref = normalizeFileUrl(node.href);
              if (originalHref !== normalizedHref) {
                console.log(`MutationObserver: 规范化节点链接URL: ${originalHref} -> ${normalizedHref}`);
                node.href = normalizedHref;
              }
            }
          }
        });
      }
    });
  });
  
  // 配置观察选项
  const config = { 
    childList: true, // 观察子节点变化
    subtree: true    // 观察所有后代节点
  };
  
  // 开始观察
  observer.observe(document.body, config);
  
  // 保存观察器引用
  window.urlNormalizationObserver = observer;
  
  console.log('URL规范化观察器已设置');
} 