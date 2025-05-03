/**
 * UI Effects and Interactions
 * Contains button effects, form validations and other common UI interactions
 */

// Initialize UI effects when document is loaded
document.addEventListener('DOMContentLoaded', initUIEffects);

/**
 * Initialize UI effects
 */
function initUIEffects() {
  initButtonEffects();
  initFormValidation();
  initParallaxEffect();
  checkReturnUser();
}

/**
 * Initialize button effects
 */
function initButtonEffects() {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    // Click ripple effect
    button.addEventListener('click', function(e) {
      if (!this.classList.contains('no-ripple')) {
        createRipple(e, this);
      }
    });
    
    // Hover glow effect
    button.addEventListener('mouseenter', function() {
      if (this.querySelector('.button-glow')) return;
      
      const glow = document.createElement('div');
      glow.classList.add('button-glow');
      this.appendChild(glow);
      
      setTimeout(() => {
        if (glow && glow.parentNode === this) {
          this.removeChild(glow);
        }
      }, 1000);
    });
  });
}

/**
 * Initialize form validation
 */
function initFormValidation() {
  const inputs = document.querySelectorAll('input[required]');
  
  // Add input focus effects and validation
  inputs.forEach(input => {
    // Focus effect
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('input-focused');
    });
    
    input.addEventListener('blur', function() {
      this.parentElement.classList.remove('input-focused');
      // Validate on submit, not on blur
    });
    
    // Real-time feedback as content changes
    input.addEventListener('keyup', function() {
      if (this.value.length > 0) {
        this.classList.add('has-content');
      } else {
        this.classList.remove('has-content');
      }
    });
  });
}

/**
 * Validate a single input field
 * @param {HTMLElement} input - Input element
 * @returns {boolean} - Whether validation passed
 */
function validateInput(input) {
  const value = input.value.trim();
  const errorElement = input.parentElement.querySelector('.input-error');
  
  // Remove existing error messages
  if (errorElement) {
    errorElement.remove();
  }
  
  // Required field check
  if (!value) {
    const error = document.createElement('div');
    error.classList.add('input-error');
    error.textContent = 'This field is required';
    input.parentElement.appendChild(error);
    input.classList.add('input-invalid');
    return false;
  }
  
  // Email format validation
  if (input.type === 'email' || (input.type === 'text' && input.value.includes('@'))) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      const error = document.createElement('div');
      error.classList.add('input-error');
      error.textContent = 'Please enter a valid email address';
      input.parentElement.appendChild(error);
      input.classList.add('input-invalid');
      return false;
    }
  }
  
  input.classList.remove('input-invalid');
  return true;
}

/**
 * Create button click ripple effect
 * @param {Event} e - Click event
 * @param {HTMLElement} button - Button element
 */
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
  
  button.appendChild(circle);
  
  setTimeout(() => {
    if (circle && circle.parentNode === button) {
      button.removeChild(circle);
    }
  }, 600);
}

/**
 * Check if returning user and show welcome message
 */
function checkReturnUser() {
  const lastVisit = localStorage.getItem('lastVisit');
  
  if (lastVisit) {
    const timeSinceLastVisit = new Date().getTime() - new Date(lastVisit).getTime();
    const daysSinceLastVisit = Math.floor(timeSinceLastVisit / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastVisit < 30) {
      // Create welcome back message
      const welcomeBack = document.createElement('div');
      welcomeBack.classList.add('welcome-back');
      welcomeBack.innerHTML = `
        <div class="welcome-back-content">
          <div class="welcome-icon">👋</div>
          <div class="welcome-text">Welcome back! It's been ${daysSinceLastVisit} day${daysSinceLastVisit !== 1 ? 's' : ''} since your last visit.</div>
          <button class="close-welcome">&times;</button>
        </div>
      `;
      
      document.body.appendChild(welcomeBack);
      
      // Add animation to make it appear
      setTimeout(() => {
        welcomeBack.classList.add('show');
        
        // Set up close button
        const closeBtn = welcomeBack.querySelector('.close-welcome');
        if (closeBtn) {
          closeBtn.addEventListener('click', function() {
            welcomeBack.classList.remove('show');
            setTimeout(() => {
              welcomeBack.remove();
            }, 300);
          });
        }
        
        // Auto close after 5 seconds
        setTimeout(() => {
          if (document.body.contains(welcomeBack)) {
            welcomeBack.classList.remove('show');
            setTimeout(() => {
              if (document.body.contains(welcomeBack)) {
                welcomeBack.remove();
              }
            }, 300);
          }
        }, 5000);
      }, 1000);
    }
  }
  
  // Update last visit timestamp
  localStorage.setItem('lastVisit', new Date().toISOString());
}

/**
 * Initialize parallax effect
 */
function initParallaxEffect() {
  const decorativeElements = document.querySelectorAll('.float-animation');
  
  if (decorativeElements.length > 0) {
    document.addEventListener('mousemove', function(e) {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      
      decorativeElements.forEach((element, index) => {
        const depth = 0.05 + (index * 0.01);
        const moveX = (x * depth * 100) - (depth * 50);
        const moveY = (y * depth * 100) - (depth * 50);
        
        element.style.transform = `translate(${moveX}px, ${moveY}px) translateY(${element.dataset.floatOffset || '0'}px)`;
      });
    });
  }
}

/**
 * Simulate authentication API call
 * @param {string} email - Email address
 * @param {string} password - Password
 * @returns {Promise} - Promise object
 */
function simulateAuth(email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // For demo purposes, accepts any non-empty values
      if (email && password) {
        resolve({ success: true });
      } else {
        reject({ message: 'Invalid credentials. Please try again.' });
      }
    }, 1500);
  });
}

/**
 * Simulate password reset API call
 * @param {string} email - Email address
 * @returns {Promise} - Promise object
 */
function simulatePasswordReset(email) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate success scenario
      if (email && email.includes('@')) {
        resolve({ success: true });
      } else {
        reject({ message: 'Could not send reset link. Please try again later.' });
      }
    }, 1500);
  });
} 