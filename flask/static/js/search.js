// Search functionality related code
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchClearHint = document.getElementById('searchClearHint');
  let ranges = []; // Store highlight ranges
  
  if (searchInput) {
    // Modify search box expand and collapse logic
    searchInput.addEventListener('focus', function() {
      this.classList.add('shadow-md');
      this.parentElement.classList.add('search-active');
      this.classList.add('w-56'); // Expand search box
      this.classList.remove('w-32');
      
      // Show clear button if there's text
      if (this.value.trim() !== '') {
        searchClearHint.classList.remove('hidden');
      }
      
      // Show clear hint if there are already search results
      if (ranges.length > 0) {
        searchClearHint.classList.remove('hidden');
      }
    });
    
    searchInput.addEventListener('blur', function() {
      if (this.value.trim() === '') {
        this.classList.remove('shadow-md');
        this.parentElement.classList.remove('search-active');
        this.classList.add('w-32'); // Collapse search box
        this.classList.remove('w-56');
      }
      
      // Brief delay to hide clear hint, giving time to click the clear button
      setTimeout(() => {
        searchClearHint.classList.add('hidden');
      }, 150);
    });
    
    // Listen for input changes, show clear button when there's content
    searchInput.addEventListener('input', function() {
      if (this.value.trim() !== '') {
        searchClearHint.classList.remove('hidden');
      } else {
        // Hide clear button if there are no highlighted elements
        if (ranges.length === 0) {
          searchClearHint.classList.add('hidden');
        }
      }
    });
    
    // Add click event for clear button
    searchClearHint.addEventListener('click', function() {
      // Clear search box
      searchInput.value = '';
      // Clear highlights with elegant fade out effect
      clearSearchHighlightsWithAnimation();
      // Hide clear hint
      searchClearHint.classList.add('hidden');
      // Focus back to search box
      searchInput.focus();
    });
    
    // Add ESC key to clear search and Enter key to search
    searchInput.addEventListener('keydown', function(e) {
      // Handle ESC key
      if (e.key === 'Escape') {
        // Clear search box
        this.value = '';
        // Clear highlights with elegant fade out effect
        clearSearchHighlightsWithAnimation();
        // Hide clear hint
        searchClearHint.classList.add('hidden');
        // Remove focus effect
        this.classList.remove('shadow-md');
        this.parentElement.classList.remove('search-active');
        return;
      }
      
      // Handle Enter key search
      if (e.key === 'Enter') {
        const searchTerm = this.value.trim();
        if (searchTerm !== '') {
          // Execute search
          console.log('Search term:', searchTerm);
          
          // Clear previous highlights first, using elegant fade out effect
          clearSearchHighlightsWithAnimation(function() {
            // Add new highlights and get search results
            const searchResults = findAndHighlightText(searchTerm);
            
            // Show clear button if there are search results
            if (searchResults > 0) {
              searchClearHint.classList.remove('hidden');
              
              // Smooth scroll to first result
              setTimeout(() => {
                const firstHighlight = document.querySelector('.js-search-highlighted');
                if (firstHighlight) {
                  firstHighlight.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                  });
                  
                  // Add slight flicker effect to guide user attention to the first result
                  firstHighlight.classList.add('first-highlight');
                  setTimeout(() => {
                    firstHighlight.classList.remove('first-highlight');
                  }, 2000);
                }
              }, 100);
            }
          });
        }
      }
    });
  }
  
  // Clear search highlights with animation
  function clearSearchHighlightsWithAnimation(callback) {
    // Get all highlighted elements
    const highlightedElements = document.querySelectorAll('.js-search-highlighted');
    
    // If no highlighted elements, return directly
    if (highlightedElements.length === 0) {
      if (callback) callback();
      return;
    }
    
    // Remove special first highlight state
    document.querySelectorAll('.first-highlight').forEach(el => {
      el.classList.remove('first-highlight');
    });
    
    // Add fade out animation
    document.body.classList.add('search-clearing');
    
    // Clear actual elements after animation ends
    setTimeout(() => {
      // Remove all CSS highlight markers
      highlightedElements.forEach(el => {
        el.classList.remove('js-search-highlighted');
      });
      
      // Remove animation classes
      document.body.classList.remove('search-clearing');
      document.body.classList.remove('search-active-mode');
      
      // Clear ranges array
      ranges = [];
      
      // Execute callback
      if (callback) callback();
    }, 300);
  }
  
  // Find and highlight text
  function findAndHighlightText(searchText) {
    // Ensure text is not empty
    if (!searchText) return 0;
    
    // Get all message containers
    const messageContainers = document.querySelectorAll('.message-content');
    let matchCount = 0;
    let delayIncrement = 0;
    
    // Iterate through all message containers
    messageContainers.forEach(container => {
      // Create an iterator containing all text nodes in the container
      const textWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        { 
          acceptNode: function(node) {
            // Only include non-empty text nodes, exclude text in script and style tags
            if (node.parentNode.tagName === 'SCRIPT' || 
                node.parentNode.tagName === 'STYLE' ||
                node.textContent.trim() === '') {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      // Iterate through all text nodes
      let textNode;
      while (textNode = textWalker.nextNode()) {
        const nodeText = textNode.textContent;
        
        // Find search term in text (case insensitive)
        let startIndex = nodeText.toLowerCase().indexOf(searchText.toLowerCase());
        
        // Whether this text node contains a match
        let nodeHasMatch = false;
        
        while (startIndex > -1) {
          matchCount++;
          nodeHasMatch = true;
          
          // Get parent element containing the match
          let parentElement = textNode.parentNode;
          
          // Don't process already highlighted elements
          if (!parentElement.classList.contains('js-search-highlighted')) {
            // Add delay for each match to create sequential animation effect
            delayIncrement += 25;
            setTimeout(() => {
              parentElement.classList.add('js-search-highlighted');
            }, delayIncrement);
          }
          
          // Save match information
          ranges.push({
            node: textNode,
            startIndex: startIndex,
            endIndex: startIndex + searchText.length
          });
          
          // Find next match
          startIndex = nodeText.toLowerCase().indexOf(
            searchText.toLowerCase(), 
            startIndex + 1
          );
        }
      }
    });
    
    // Apply CSS highlighting
    document.body.classList.add('search-active-mode');
    
    return matchCount;
  }
}

// Initialize search functionality after page loads
document.addEventListener('DOMContentLoaded', function() {
  initSearch();
}); 