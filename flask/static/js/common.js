/**
 * Common JavaScript Library
 * Contains functionality and utility functions shared by all pages
 */

// 简化的主题管理器 - 与app.js协调工作
const ThemeManager = {
  // 获取当前主题
  getCurrentTheme: function() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  },
  
  // 检查是否为暗黑模式
  isDarkMode: function() {
    return document.documentElement.classList.contains('dark');
  },
  
  // 监听主题变化事件
  onThemeChange: function(callback) {
    if (typeof callback === 'function') {
      document.addEventListener('themechange', callback);
    }
  },
  
  // 移除主题变化监听器
  offThemeChange: function(callback) {
    if (typeof callback === 'function') {
      document.removeEventListener('themechange', callback);
    }
  }
};

// Animation effects
const Animations = {
  // Initialize animations
  init: function() {
    this.setupHoverEffects();
    this.setupPageTransitions();
  },
  
  // Setup hover effects
  setupHoverEffects: function() {
    const hoverElements = document.querySelectorAll('.hover-rise');
    
    hoverElements.forEach(element => {
      element.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
      });
      
      element.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
      });
    });
  },
  
  // Setup page transitions
  setupPageTransitions: function() {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.classList.add('page-loaded');
    });
    
    // Add smooth transitions for links
    const internalLinks = document.querySelectorAll('a[href^="./"], a[href^="/"], a[href^="index"], a[href^="login"], a[href^="register"]');
    
    internalLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        // Exclude links with specific classes
        if (this.classList.contains('no-transition') || this.target === '_blank') {
          return;
        }
        
        const href = this.getAttribute('href');
        
        e.preventDefault();
        document.body.classList.add('page-exit');
        
        setTimeout(() => {
          window.location.href = href;
        }, 300);
      });
    });
  },
  
  // Button ripple effect
  createRipple: function(e, button) {
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
};

// Form handling
const FormHandler = {
  // Initialize form functionality
  init: function() {
    this.setupFormInputs();
    this.setupFormValidation();
  },
  
  // Setup form input enhancements
  setupFormInputs: function() {
    // Add focus effects for inputs with form-control class
    const formInputs = document.querySelectorAll('.form-control');
    
    formInputs.forEach(input => {
      // Setup input label animations
      const inputContainer = input.closest('.input-container');
      if (inputContainer) {
        const label = inputContainer.querySelector('label');
        
        if (label) {
          // Initial check if already has value
          if (input.value.trim() !== '') {
            label.classList.add('label-float');
          }
          
          // Listen for focus and blur events
          input.addEventListener('focus', function() {
            label.classList.add('label-float');
          });
          
          input.addEventListener('blur', function() {
            if (this.value.trim() === '') {
              label.classList.remove('label-float');
            }
          });
        }
      }
    });
  },
  
  // Setup form validation
  setupFormValidation: function() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
      
      inputs.forEach(input => {
        input.addEventListener('blur', function() {
          this.classList.toggle('input-invalid', !this.validity.valid && this.value.trim() !== '');
          
          // Show or hide error message
          const errorElement = this.parentElement.querySelector('.error-message');
          if (errorElement) {
            if (!this.validity.valid && this.value.trim() !== '') {
              let errorMessage = 'Please enter a valid value';
              
              if (this.validity.valueMissing) {
                errorMessage = 'This field is required';
              } else if (this.validity.typeMismatch) {
                if (this.type === 'email') {
                  errorMessage = 'Please enter a valid email address';
                } else if (this.type === 'url') {
                  errorMessage = 'Please enter a valid URL';
                }
              } else if (this.validity.tooShort) {
                errorMessage = `Please enter at least ${this.minLength} characters`;
              } else if (this.validity.tooLong) {
                errorMessage = `Please enter no more than ${this.maxLength} characters`;
              } else if (this.validity.patternMismatch) {
                errorMessage = 'Please match the requested format';
              }
              
              errorElement.textContent = errorMessage;
              errorElement.classList.remove('hidden');
            } else {
              errorElement.classList.add('hidden');
            }
          }
        });
      });
    });
  },
  
  // Validate form
  validateForm: function(form) {
    if (!form) return false;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
      if (input.hasAttribute('required') && input.value.trim() === '') {
        input.classList.add('input-invalid');
        isValid = false;
        
        // Show error message
        const errorElement = input.parentElement.querySelector('.error-message');
        if (errorElement) {
          errorElement.textContent = 'This field is required';
          errorElement.classList.remove('hidden');
        }
      } else if (input.type === 'email' && input.value.trim() !== '') {
        // Simple email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(input.value)) {
          input.classList.add('input-invalid');
          isValid = false;
          
          // Show error message
          const errorElement = input.parentElement.querySelector('.error-message');
          if (errorElement) {
            errorElement.textContent = 'Please enter a valid email address';
            errorElement.classList.remove('hidden');
          }
        }
      }
    });
    
    return isValid;
  }
};

// User session management
const SessionManager = {
  // Save user session
  saveSession: function(userData) {
    try {
      sessionStorage.setItem('user', JSON.stringify({
        ...userData,
        isLoggedIn: true,
        loginTime: new Date().toISOString()
      }));
      
      // Also save to localStorage to remember user
      localStorage.setItem('lastLogin', JSON.stringify({
        username: userData.username,
        time: new Date().toISOString()
      }));
      
      return true;
    } catch (e) {
      console.error('Error saving session:', e);
      return false;
    }
  },
  
  // Get user session
  getSession: function() {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return null;
  },
  
  // Clear session
  clearSession: function() {
    sessionStorage.removeItem('user');
  },
  
  // Check if user is logged in
  isLoggedIn: function() {
    const session = this.getSession();
    return session && session.isLoggedIn === true;
  },
  
  // Get last login info
  getLastLogin: function() {
    const lastLogin = localStorage.getItem('lastLogin');
    if (lastLogin) {
      try {
        return JSON.parse(lastLogin);
      } catch (e) {
        console.error('Error parsing last login data:', e);
      }
    }
    return null;
  }
};

// Initialize common functionality when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme
  ThemeManager.init();
  
  // Initialize animations
  Animations.init();
  
  // Initialize forms
  FormHandler.init();
}); 