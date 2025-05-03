/**
 * Page Transition Effects
 * Handles smooth transition animations between pages
 */

// Initialize page transition effects after document is loaded
document.addEventListener('DOMContentLoaded', initPageTransitions);

/**
 * Initialize page transitions
 */
function initPageTransitions() {
  initLinkTransitions();
  checkIncomingTransition();
}

/**
 * Initialize link transitions
 */
function initLinkTransitions() {
  // Login page to registration page transition - only works for link clicks, not form submissions
  const createAccountLink = document.getElementById('createAccountLink');
  if (createAccountLink) {
    createAccountLink.addEventListener('click', function(e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      
      transitionToPage(href, 'slide-out-left', 'fromLogin');
    });
  }
  
  // Login page to forgot password page transition
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      
      transitionToPage(href, 'slide-out-right', 'fromLogin');
    });
  }
  
  // Registration page to login page transition
  const backToLoginLink = document.getElementById('backToLoginLink');
  if (backToLoginLink) {
    backToLoginLink.addEventListener('click', function(e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      
      transitionToPage(href, 'slide-out-right', 'fromRegister');
    });
  }
  
  // Forgot password page back links
  const backToLoginLinks = document.querySelectorAll('#backToLoginLink, #backToLoginButton');
  if (backToLoginLinks.length) {
    backToLoginLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        
        transitionToPage(href, 'slide-out-right', 'fromForgotPassword');
      });
    });
  }
  
  // Forgot password page to registration page transition
  const createAccountButton = document.getElementById('createAccountButton');
  if (createAccountButton) {
    createAccountButton.addEventListener('click', function(e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      
      transitionToPage(href, 'slide-out-left', 'fromForgotPassword');
    });
  }
}

/**
 * Check if coming from another page, apply appropriate entrance animation
 */
function checkIncomingTransition() {
  const transitionType = sessionStorage.getItem('pageTransition');
  if (transitionType) {
    // Clear storage
    sessionStorage.removeItem('pageTransition');
    
    // Mark as page transition
    document.body.classList.add('page-transition');
    
    // Add different entrance animations based on source
    if (transitionType === 'fromLogin') {
      if (window.location.href.includes('forgot-password')) {
        document.body.classList.add('slide-in-right');
      } else if (window.location.href.includes('register')) {
        document.body.classList.add('slide-in-right');
      }
    } else if (transitionType === 'fromRegister') {
      document.body.classList.add('slide-in-left');
    } else if (transitionType === 'fromForgotPassword') {
      if (window.location.href.includes('login')) {
        document.body.classList.add('slide-in-left');
      } else if (window.location.href.includes('register')) {
        document.body.classList.add('slide-in-right');
      }
    }
    
    // Remove classes after animation completes
    setTimeout(() => {
      document.body.classList.remove('page-transition', 'slide-in-right', 'slide-in-left');
    }, 500);
  }
}

/**
 * Transition to new page
 * @param {string} href - Target page URL
 * @param {string} animationClass - Exit animation class name
 * @param {string} transitionType - Transition type identifier
 */
function transitionToPage(href, animationClass, transitionType) {
  // Mark as page transition
  document.body.classList.add('page-transition');
  
  // Add exit animation
  document.body.classList.add(animationClass);
  
  // Store direction information so target page knows animation direction
  sessionStorage.setItem('pageTransition', transitionType);
  
  // Navigate after animation completes
  setTimeout(() => {
    window.location.href = href;
  }, 500);
} 