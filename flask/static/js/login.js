/**
 * JavaScript for the login page
 */

// Initialize all features when page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Theme initialization
  initThemeManager();
  
  // Water ripple effects
  initWaterEffects();
  
  // Page transition animations
  setupPageTransitions();
  
  // Form handling
  setupLoginForm();
  
  // Button enhancements
  enhanceButtons();
  
  // Form input enhancements
  enhanceFormInputs();
  
  // Check if returning user
  checkReturnUser();
});

// Initialize login form
function setupLoginForm() {
  const loginForm = document.getElementById('loginForm');
  const inputs = document.querySelectorAll('input[required]');
  
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form inputs
      const emailInput = this.querySelector('input[type="text"]');
      const passwordInput = this.querySelector('input[type="password"]');
      
      // Clear all existing error messages
      const existingErrors = document.querySelectorAll('.input-error');
      existingErrors.forEach(error => error.remove());
      
      // Clear error state from all input fields
      inputs.forEach(input => {
        input.classList.remove('input-invalid');
      });
      
      // Perform validation
      let isValid = true;
      
      if (!validateInput(emailInput)) isValid = false;
      if (!validateInput(passwordInput)) isValid = false;
      
      if (isValid) {
        // Show loading animation
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<div class="spinner"></div>';
        submitBtn.disabled = true;
        
        // Simulate API call
        simulateAuth(emailInput.value, passwordInput.value)
          .then(response => {
            // Store user data in sessionStorage
            sessionStorage.setItem('user', JSON.stringify({
              username: emailInput.value,
              isLoggedIn: true,
              loginTime: new Date().toISOString()
            }));
            
            // Animate transition to main app
            document.body.classList.add('fade-out');
            
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 500);
          })
          .catch(error => {
            // Show error message and add shake animation
            submitBtn.innerHTML = 'Sign In';
            submitBtn.disabled = false;
            
            const errorMessage = document.createElement('div');
            errorMessage.classList.add('error-message');
            errorMessage.textContent = error.message;
            
            // Remove any existing error messages
            const existingError = document.querySelector('.error-message');
            if (existingError) existingError.remove();
            
            loginForm.appendChild(errorMessage);
            loginForm.classList.add('shake-animation');
            
            setTimeout(() => {
              loginForm.classList.remove('shake-animation');
            }, 500);
          });
      }
    });
  }
}

// Check returning user
function checkReturnUser() {
  // Get last login info from localStorage
  const lastLogin = localStorage.getItem('lastLogin');
  
  if (lastLogin) {
    try {
      const loginData = JSON.parse(lastLogin);
      const now = new Date();
      const loginDate = new Date(loginData.time);
      
      // If last login was within 30 days
      if ((now - loginDate) < (30 * 24 * 60 * 60 * 1000)) {
        const emailInput = document.querySelector('input[type="text"]');
        if (emailInput && !emailInput.value) {
          emailInput.value = loginData.username;
          
          // Add welcome back message
          const welcomeMessage = document.createElement('div');
          welcomeMessage.className = 'p-3 bg-blue-50 text-blue-700 rounded-md mb-4 text-sm dark:bg-blue-900 dark:text-blue-100 fade-in-up';
          welcomeMessage.innerHTML = `
            <div class="flex items-center">
              <span class="text-xl mr-2">👋</span>
              <span>Welcome back, ${loginData.username}! Your last login was on ${new Date(loginData.time).toLocaleDateString()}.</span>
            </div>
          `;
          
          const form = document.getElementById('loginForm');
          if (form) {
            form.parentNode.insertBefore(welcomeMessage, form);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing last login data', e);
    }
  }
} 