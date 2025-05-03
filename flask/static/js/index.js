/**
 * JavaScript for the index/home page
 */

// Initialize all features when the page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Customer support functionality
  initHelpSupport();
  
  // Create raindrops effect
  const rainCanvas = document.getElementById('rainCanvas');
  if (rainCanvas) {
    createRaindrops(rainCanvas);
    
    // Click screen to create ripples
    rainCanvas.addEventListener('click', function(e) {
      createWaterRipple(e.clientX, e.clientY, rainCanvas);
    });
  }
  
  // Check login status
  checkLoginStatus();
});

// Initialize customer support functionality
function initHelpSupport() {
  const helpButton = document.getElementById('helpButton');
  const helpModal = document.getElementById('helpModal');
  const closeHelpModal = document.getElementById('closeHelpModal');
  const helpModalOverlay = document.getElementById('helpModalOverlay');
  const helpQuickBtns = document.querySelectorAll('.help-quick-btn');
  const helpMessageInput = document.getElementById('helpMessageInput');
  const sendHelpMessage = document.getElementById('sendHelpMessage');
  
  // Open support modal
  if (helpButton && helpModal) {
    helpButton.addEventListener('click', function(e) {
      helpModal.classList.remove('hidden');
      // Button ripple effect
      createRipple(e, this);
    });
  }
  
  // Close support modal
  if (closeHelpModal && helpModal) {
    closeHelpModal.addEventListener('click', function() {
      helpModal.classList.add('hidden');
    });
  }
  
  // Click background to close modal
  if (helpModalOverlay && helpModal) {
    helpModalOverlay.addEventListener('click', function() {
      helpModal.classList.add('hidden');
    });
  }
  
  // Quick reply buttons
  if (helpQuickBtns && helpQuickBtns.length > 0) {
    helpQuickBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const responseContainer = document.createElement('div');
        responseContainer.classList.add('bg-white', 'bg-opacity-10', 'rounded-lg', 'p-4', 'mb-4');
        
        const question = document.createElement('p');
        question.classList.add('text-sm', 'text-right', 'mb-2', 'text-blue-300');
        question.textContent = this.textContent;
        
        const answer = document.createElement('p');
        answer.classList.add('text-sm', 'mt-4');
        
        switch(this.textContent) {
          case 'Account Issues':
            answer.textContent = "If you're experiencing account-related issues, please verify your registered email address or try resetting your password. For more detailed information, please refer to the Account Issues section in our Help Center.";
            break;
          case 'Features':
            answer.textContent = "Internal Chat provides end-to-end encrypted messaging, team collaboration tools, and resource management capabilities. You can create channels, share files, and conduct video conferences. For more detailed feature information, please visit our Features page.";
            break;
          case 'Contact Us':
            answer.textContent = "You can contact us via email at support@internalchat.com, or call our customer service hotline during working hours at 400-123-4567. Our working hours are Monday to Friday from 9:00 to 18:00.";
            break;
          default:
            answer.textContent = "Thank you for your inquiry. Our customer service team will respond to your question as soon as possible.";
        }
        
        responseContainer.appendChild(question);
        responseContainer.appendChild(answer);
        
        // Insert reply before the input box
        const parentElement = document.querySelector('#helpMessageInput').parentElement.parentElement;
        parentElement.insertBefore(responseContainer, parentElement.lastElementChild);
      });
    });
  }
  
  // Send message
  if (sendHelpMessage && helpMessageInput) {
    sendHelpMessage.addEventListener('click', sendHelp);
    helpMessageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendHelp();
      }
    });
  }
}

// Send help message
function sendHelp() {
  const helpMessageInput = document.getElementById('helpMessageInput');
  if (!helpMessageInput) return;
  
  const message = helpMessageInput.value.trim();
  if (message) {
    const responseContainer = document.createElement('div');
    responseContainer.classList.add('bg-white', 'bg-opacity-10', 'rounded-lg', 'p-4', 'mb-4');
    
    const question = document.createElement('p');
    question.classList.add('text-sm', 'text-right', 'mb-2', 'text-blue-300');
    question.textContent = message;
    
    const answer = document.createElement('p');
    answer.classList.add('text-sm', 'mt-4');
    answer.textContent = "Thank you for your inquiry. Our customer service team will respond to your question as soon as possible.";
    
    responseContainer.appendChild(question);
    responseContainer.appendChild(answer);
    
    // Insert reply before the input box
    const parentElement = helpMessageInput.parentElement.parentElement;
    parentElement.insertBefore(responseContainer, parentElement.lastElementChild);
    
    // Clear input box
    helpMessageInput.value = '';
  }
}

// Create raindrops effect
function createRaindrops(container) {
  const raindropsCount = Math.floor(window.innerWidth / 15); // Adjust raindrop count based on screen width
  
  for (let i = 0; i < raindropsCount; i++) {
    const raindrop = document.createElement('div');
    raindrop.classList.add('rain-drop');
    
    // Randomly set raindrop parameters
    const size = Math.random() * 3 + 1; // Raindrop size: 1-4px
    const posX = Math.random() * 100; // Horizontal position: 0-100%
    const duration = Math.random() * 2 + 1; // Fall speed: 1-3 seconds
    const delay = Math.random() * 5; // Appearance delay: 0-5 seconds
    
    raindrop.style.left = `${posX}%`;
    raindrop.style.width = `${size}px`;
    raindrop.style.height = `${size * (Math.random() * 10 + 20)}px`; // Length is 20-30 times the width
    raindrop.style.animationDuration = `${duration}s`;
    raindrop.style.animationDelay = `${delay}s`;
    
    container.appendChild(raindrop);
  }
}

// Create water ripple effect
function createWaterRipple(x, y, container) {
  const ripple = document.createElement('div');
  ripple.classList.add('water-ripple');
  
  // Set ripple size and position
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.animation = 'ripple-effect 2.5s cubic-bezier(0.23, 1, 0.32, 1)';
  
  container.appendChild(ripple);
  
  // Remove element after ripple animation is complete
  setTimeout(() => {
    if (ripple && ripple.parentNode === container) {
      container.removeChild(ripple);
    }
  }, 2500);
}

// Button ripple effect
function createRipple(e, button) {
  const rect = button.getBoundingClientRect();
  
  const circle = document.createElement('span');
  circle.classList.add('ripple-effect');
  
  const diameter = Math.max(rect.width, rect.height);
  const radius = diameter / 2;
  
  const x = e.clientX - rect.left - radius;
  const y = e.clientY - rect.top - radius;
  
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${x}px`;
  circle.style.top = `${y}px`;
  circle.style.position = 'absolute';
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  circle.style.transform = 'scale(0)';
  circle.style.animation = 'ripple 0.6s linear';
  circle.style.pointerEvents = 'none';
  
  button.appendChild(circle);
  
  setTimeout(() => {
    if (circle && circle.parentNode === button) {
      button.removeChild(circle);
    }
  }, 600);
}

// Check user login status
function checkLoginStatus() {
  const userData = sessionStorage.getItem('user');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      if (user.isLoggedIn) {
        // User is logged in, show welcome back message or auto-redirect
        createWelcomeBack(user.username);
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
}

// Create welcome back notification
function createWelcomeBack(username) {
  const welcomeBack = document.createElement('div');
  welcomeBack.classList.add('glass-card', 'fixed', 'top-6', 'right-6', 'p-4', 'z-50', 'fade-in-up');
  welcomeBack.innerHTML = `
    <div class="flex items-center">
      <div class="text-xl mr-3">👋</div>
      <div>
        <p class="font-medium">Welcome back, ${username}!</p>
        <div class="flex mt-2 space-x-2">
          <button id="goToApp" class="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">Continue to app</button>
          <button id="dismissWelcome" class="text-sm bg-transparent hover:bg-blue-800 px-3 py-1 rounded">Dismiss</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(welcomeBack);
  
  // Set up button events
  const goToAppBtn = document.getElementById('goToApp');
  const dismissBtn = document.getElementById('dismissWelcome');
  
  if (goToAppBtn) {
    goToAppBtn.addEventListener('click', function() {
      window.location.href = './index.html'; // Redirect to main app page
    });
  }
  
  if (dismissBtn) {
    dismissBtn.addEventListener('click', function() {
      welcomeBack.classList.add('opacity-0');
      welcomeBack.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (document.body.contains(welcomeBack)) {
          document.body.removeChild(welcomeBack);
        }
      }, 500);
    });
  }
} 