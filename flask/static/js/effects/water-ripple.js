/**
 * Water Ripple Effect JavaScript
 * Handles water ripple, surface wave and text wobble effect interactions
 */

// Initialize water ripple effect after document is loaded
document.addEventListener('DOMContentLoaded', initWaterRippleEffect);

/**
 * Initialize water ripple effect
 */
function initWaterRippleEffect() {
  const waterPanel = document.getElementById('waterPanel');
  const brandingText = document.getElementById('brandingText');
  const waterSurface = document.querySelector('.water-surface');
  
  if (waterPanel) {
    // Add click event listener to water panel
    waterPanel.addEventListener('click', function(e) {
      createWaterRipple(e, waterPanel, waterSurface, brandingText);
    });
  }
}

/**
 * Create water ripple effect
 * @param {Event} e - Click event
 * @param {HTMLElement} panel - Water panel element
 * @param {HTMLElement} surface - Water surface element
 * @param {HTMLElement} text - Text element
 */
function createWaterRipple(e, panel, surface, text) {
  // Create water ripple element
  const ripple = document.createElement('div');
  ripple.classList.add('water-ripple');
  
  // Set ripple starting position
  const rect = panel.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  
  // Add to panel
  panel.appendChild(ripple);
  
  // Set global water surface effect
  if (surface) {
    surface.style.setProperty('--x', (x / rect.width * 100) + '%');
    surface.style.setProperty('--y', (y / rect.height * 100) + '%');
    surface.classList.add('active');
    
    setTimeout(() => {
      surface.classList.remove('active');
    }, 1500);
  }
  
  // Text wobble effect
  if (text) {
    text.classList.add('text-wave');
    
    setTimeout(() => {
      text.classList.remove('text-wave');
    }, 1000);
  }
  
  // Remove old water ripple
  setTimeout(() => {
    if (ripple && ripple.parentNode === panel) {
      panel.removeChild(ripple);
    }
  }, 2000);
} 