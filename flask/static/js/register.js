/**
 * JavaScript for the registration page
 */

// Initialize all functionality when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Theme initialization
  initThemeManager();
  
  // Water ripple effect
  initWaterEffects();
  
  // Page transition animations
  setupPageTransitions();
  
  // Form handling
  setupRegistrationForm();
  
  // Password strength detection
  initPasswordStrengthMeter();
  
  // Button enhancements
  enhanceButtons();
  
  // Form input enhancements
  enhanceFormInputs();
});

// Initialize registration form
function setupRegistrationForm() {
  const registerForm = document.getElementById('registerForm');
  const inputs = document.querySelectorAll('input[required]');
  
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get form inputs
      const firstName = this.querySelector('input[name="firstName"]');
      const lastName = this.querySelector('input[name="lastName"]');
      const email = this.querySelector('input[type="email"]');
      const username = this.querySelector('input[name="username"]');
      const password = this.querySelector('input[name="password"]');
      const confirmPassword = this.querySelector('input[name="confirmPassword"]');
      const agreeTerms = this.querySelector('input[name="agreeTerms"]');
      
      // Clear all existing error messages
      const existingErrors = document.querySelectorAll('.input-error');
      existingErrors.forEach(error => error.remove());
      
      // Clear all input error states
      inputs.forEach(input => {
        input.classList.remove('input-invalid');
      });
      
      // Perform validation
      let isValid = true;
      
      if (firstName && !validateInput(firstName)) isValid = false;
      if (lastName && !validateInput(lastName)) isValid = false;
      if (!validateInput(email)) isValid = false;
      if (username && !validateInput(username)) isValid = false;
      if (!validateInput(password)) isValid = false;
      if (!validateInput(confirmPassword)) isValid = false;
      
      // Check password matching
      if (password.value !== confirmPassword.value) {
        const error = document.createElement('div');
        error.classList.add('input-error');
        error.textContent = 'Passwords do not match';
        confirmPassword.parentElement.appendChild(error);
        confirmPassword.classList.add('input-invalid');
        isValid = false;
      }
      
      // Check terms and conditions
      if (agreeTerms && !agreeTerms.checked) {
        const error = document.createElement('div');
        error.classList.add('input-error');
        error.textContent = 'You must agree to the terms and conditions';
        agreeTerms.parentElement.appendChild(error);
        isValid = false;
      }
      
      if (isValid) {
        // Show loading animation
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<div class="spinner"></div>';
        submitBtn.disabled = true;
        
        // Simulate API call
        simulateRegistration({
          firstName: firstName ? firstName.value : '',
          lastName: lastName ? lastName.value : '',
          email: email.value,
          username: username ? username.value : email.value,
          password: password.value,
          confirmPassword: confirmPassword.value
        })
          .then(response => {
            // Store user data in sessionStorage
            sessionStorage.setItem('user', JSON.stringify({
              username: response.user.username || response.user.email,
              isLoggedIn: true,
              loginTime: new Date().toISOString()
            }));
            
            // Show success message
            showRegistrationSuccess();
            
            // Redirect to home page after 3 seconds
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 3000);
          })
          .catch(error => {
            // Show error message and add shake animation
            submitBtn.innerHTML = 'Create Account';
            submitBtn.disabled = false;
            
            const errorMessage = document.createElement('div');
            errorMessage.classList.add('error-message');
            errorMessage.textContent = error.message;
            
            // Remove any existing error messages
            const existingError = document.querySelector('.error-message');
            if (existingError) existingError.remove();
            
            registerForm.appendChild(errorMessage);
            registerForm.classList.add('shake-animation');
            
            setTimeout(() => {
              registerForm.classList.remove('shake-animation');
            }, 500);
          });
      }
    });
  }
}

// Show registration success message
function showRegistrationSuccess() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;
  
  // Create success message
  const successMessage = document.createElement('div');
  successMessage.className = 'text-center p-8 fade-in-up';
  successMessage.innerHTML = `
    <div class="success-icon mx-auto mb-6">
      <svg class="checkmark animate" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" width="70" height="70">
        <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
        <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
      </svg>
    </div>
    <h3 class="text-xl font-medium text-green-600 dark:text-green-400 mb-4">Registration Successful!</h3>
    <p class="text-gray-600 dark:text-gray-400 mb-6">
      Your account has been created successfully.<br>
      You will be redirected to the application in a few seconds.
    </p>
  `;
  
  // Replace form with success message
  registerForm.parentNode.replaceChild(successMessage, registerForm);
}

// Initialize password strength meter
function initPasswordStrengthMeter() {
  const passwordInput = document.querySelector('input[name="password"]');
  const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
  
  if (passwordInput) {
    // Create password strength indicator
    const strengthMeter = document.createElement('div');
    strengthMeter.className = 'password-strength-meter mt-2';
    strengthMeter.innerHTML = '<div class="strength-value"></div>';
    
    const strengthText = document.createElement('div');
    strengthText.className = 'strength-text text-xs mt-1';
    
    // Add after password input
    passwordInput.parentElement.appendChild(strengthMeter);
    passwordInput.parentElement.appendChild(strengthText);
    
    // Monitor password input
    passwordInput.addEventListener('input', function() {
      updatePasswordStrength(this.value, strengthMeter, strengthText);
    });
  }
  
  // Password match validation
  if (passwordInput && confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', function() {
      checkPasswordMatch(passwordInput.value, this.value, this);
    });
  }
}

// Update password strength indicator
function updatePasswordStrength(password, meterElement, textElement) {
  const passwordInput = document.querySelector('input[name="password"]');
  let strength = 0;
  let feedbackText = '';
  
  // More comprehensive password strength detection
  if (password.length > 0) {
    strength++;
    feedbackText = 'Weak';
  }
  
  if (password.length >= 8) {
    strength++;
    feedbackText = 'Fair';
  }
  
  if (password.match(/[A-Z]/) && password.match(/[a-z]/)) {
    strength++;
    feedbackText = 'Good';
  }
  
  if (password.match(/[0-9]/)) {
    strength++;
    feedbackText = 'Strong';
  }
  
  // Check for special characters
  if (password.match(/[^A-Za-z0-9]/)) {
    strength++;
    feedbackText = 'Very Strong';
  }
  
  // Update strength indicator
  meterElement.className = `password-strength-meter strength-${strength}`;
  textElement.className = `strength-text text-xs mt-1 strength-${strength}`;
  textElement.textContent = feedbackText;
  
  // Provide detailed password requirements feedback
  let requirements = [];
  if (password.length < 8) requirements.push('at least 8 characters');
  if (!password.match(/[A-Z]/)) requirements.push('at least 1 uppercase letter');
  if (!password.match(/[a-z]/)) requirements.push('at least 1 lowercase letter');
  if (!password.match(/[0-9]/)) requirements.push('at least 1 number');
  if (!password.match(/[^A-Za-z0-9]/)) requirements.push('at least 1 special character');
  
  // If there are unmet requirements, show them below the strength indicator
  if (requirements.length > 0) {
    let requirementsElement = passwordInput.parentElement.querySelector('.password-requirements');
    if (!requirementsElement) {
      requirementsElement = document.createElement('div');
      requirementsElement.className = 'password-requirements text-xs mt-1 text-gray-600';
      passwordInput.parentElement.appendChild(requirementsElement);
    }
    requirementsElement.innerHTML = 'Password requires: ' + requirements.join(', ');
  } else {
    const requirementsElement = passwordInput.parentElement.querySelector('.password-requirements');
    if (requirementsElement) requirementsElement.remove();
  }
  
  return strength;
}

// Check password match
function checkPasswordMatch(password, confirmPassword, confirmInput) {
  // Remove previous errors
  const existingError = confirmInput.parentElement.querySelector('.input-error');
  if (existingError) {
    existingError.remove();
  }
  
  // Check if matching
  if (confirmPassword && password !== confirmPassword) {
    const error = document.createElement('div');
    error.classList.add('input-error');
    error.textContent = 'Passwords do not match';
    confirmInput.parentElement.appendChild(error);
    confirmInput.classList.add('input-invalid');
    return false;
  } else {
    confirmInput.classList.remove('input-invalid');
    return true;
  }
} 