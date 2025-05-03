/**
 * End-to-End Encryption (E2EE) Settings Module
 */

// Initialize the E2EE settings when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化E2EE设置...');
    
    // 检查加密状态并自动进行设置
    setTimeout(() => {
        initializeE2EE();
    }, 1000); // 延迟1秒，确保其他组件已加载
});

/**
 * 初始化E2EE系统
 */
async function initializeE2EE() {
    try {
        // 确保加密管理器已初始化
        if (typeof cryptoManager === 'undefined') {
            console.error('加密管理器未找到');
            return;
        }
        
        // 检查TweetNaCl库是否存在
        if (typeof nacl === 'undefined') {
            console.warn('TweetNaCl库未加载，尝试等待加载完成...');
            
            // 等待最多10秒钟，检查TweetNaCl是否加载完成
            let attempts = 0;
            const maxAttempts = 20; // 20次尝试，每次500ms
            
            while (typeof nacl === 'undefined' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
                console.log(`等待TweetNaCl库加载 (${attempts}/${maxAttempts})...`);
            }
            
            // 如果仍然未加载，则显示错误
            if (typeof nacl === 'undefined') {
                console.error('TweetNaCl库未能加载，E2EE功能不可用');
                return;
            }
        }
        
        // 等待加密管理器初始化完成
        await cryptoManager.ensureInitialized();
        
        // 如果没有密钥对，自动生成
        if (!cryptoManager.hasKeyPair()) {
            console.log('自动生成新的加密密钥对...');
            await cryptoManager.generateKeyPair();
            await cryptoManager.uploadPublicKey();
            console.log('自动设置加密完成');
        }
    } catch (error) {
        console.error('初始化E2EE失败:', error);
    }
}

/**
 * 显示E2EE状态信息
 */
function updateE2EEStatus() {
    const statusElement = document.getElementById('e2ee-status-text');
    if (!statusElement) return;
    
    if (typeof cryptoManager !== 'undefined' && cryptoManager.hasKeyPair()) {
        statusElement.innerHTML = '端对端加密已启用';
        statusElement.className = 'text-success';
        
        // 显示公钥
        const publicKeyDisplay = document.getElementById('public-key-display');
        if (publicKeyDisplay) {
            publicKeyDisplay.textContent = cryptoManager.getPublicKey();
        }
        
        // 显示生成时间
        const storedKeyData = localStorage.getItem('e2ee_keypair');
        if (storedKeyData) {
            try {
                const keyData = JSON.parse(storedKeyData);
                const keyUpdatedTime = document.getElementById('key-updated-time');
                if (keyUpdatedTime && keyData.updatedAt) {
                    const date = new Date(keyData.updatedAt);
                    keyUpdatedTime.textContent = date.toLocaleString();
                }
            } catch (e) {
                console.error('无法解析密钥数据:', e);
            }
        }
    } else {
        statusElement.innerHTML = '端对端加密未启用';
        statusElement.className = 'text-danger';
    }
} 