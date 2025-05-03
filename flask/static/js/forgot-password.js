/**
 * JavaScript for the forgot password page
 */

// Initialize all features when page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Theme initialization
  initThemeManager();
  
  // Water ripple effects
  initWaterEffects();
  
  // Page transition animations
  setupPageTransitions();
  
  // Button enhancements
  enhanceButtons();
  
  // Form input enhancements
  enhanceFormInputs();
  
  // Initialize password reset form
  initPasswordResetForm();
});

// Initialize password reset form
function initPasswordResetForm() {
  const resetBtn = document.getElementById('resetBtn');
  const emailInput = document.getElementById('email');
  const requestResetForm = document.getElementById('requestResetForm');
  const successMessage = document.getElementById('successMessage');
  const resendLink = document.getElementById('resendLink');
  
  if (resetBtn && emailInput && requestResetForm) {
    resetBtn.addEventListener('click', function() {
      // Clear existing error messages
      const existingError = requestResetForm.querySelector('.input-error');
      if (existingError) existingError.remove();
      
      // Validate email
      if (!validateInput(emailInput)) {
        return;
      }
      
      // Show loading state
      resetBtn.innerHTML = '<div class="spinner"></div>';
      resetBtn.disabled = true;
      
      // Simulate password reset request
      simulatePasswordReset(emailInput.value)
        .then(response => {
          // Show success message
          requestResetForm.classList.add('hidden');
          if (successMessage) {
            successMessage.classList.remove('hidden');
            
            // Add success animation
            const checkmark = document.querySelector('.checkmark');
            if (checkmark) {
              checkmark.classList.add('animate');
            }
          }
        })
        .catch(error => {
          // Restore button state
          resetBtn.innerHTML = 'Send Reset Link';
          resetBtn.disabled = false;
          
          // Show error message
          const errorMessage = document.createElement('div');
          errorMessage.classList.add('input-error');
          errorMessage.textContent = error.message;
          
          // Remove existing error messages
          const existingError = requestResetForm.querySelector('.input-error');
          if (existingError) existingError.remove();
          
          // Add new error message
          emailInput.parentElement.appendChild(errorMessage);
          emailInput.classList.add('input-invalid');
          
          // Add shake animation
          requestResetForm.classList.add('shake-animation');
          setTimeout(() => {
            requestResetForm.classList.remove('shake-animation');
          }, 500);
        });
    });
    
    // Resend link
    if (resendLink && successMessage) {
      resendLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Switch back to form view
        successMessage.classList.add('hidden');
        requestResetForm.classList.remove('hidden');
        
        // Restore button state
        resetBtn.innerHTML = 'Send Reset Link';
        resetBtn.disabled = false;
      });
    }
  }
} 