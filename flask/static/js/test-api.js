/**
 * Resource API test script
 * For testing connection with backend API
 */

// Using IIFE to avoid global namespace pollution
(function() {
  // Test get resources list
  async function testGetResources() {
    try {
      const response = await fetch('/api/resources');
      if (!response.ok) {
        throw new Error(`Failed to get resource list: ${response.status}`);
      }
      const data = await response.json();
      console.log('🟢 Resource list retrieved successfully:', data);
      return data;
    } catch (error) {
      console.error('🔴 Failed to get resource list:', error);
      return null;
    }
  }
  
  // Test add resource
  async function testAddResource() {
    try {
      // Create test resource data
      const testResource = {
        name: `Test Resource ${new Date().toLocaleTimeString()}`,
        url: 'https://example.com/test.pdf',
        type: 'document',
        properties: {
          'testProperty': 'testValue',
          'createdAt': new Date().toISOString()
        }
      };
      
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(testResource)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add resource: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🟢 Resource added successfully:', data);
      return data;
    } catch (error) {
      console.error('🔴 Failed to add resource:', error);
      return null;
    }
  }
  
  // Test update resource
  async function testUpdateResource(resourceId) {
    if (!resourceId) {
      console.error('🔴 Failed to update resource: No resource ID provided');
      return null;
    }
    
    try {
      // Create update data
      const updateData = {
        name: `Updated Resource ${new Date().toLocaleTimeString()}`,
        url: 'https://example.com/updated.pdf',
        type: 'document',
        properties: {
          'updatedAt': new Date().toISOString()
        }
      };
      
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update resource: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🟢 Resource updated successfully:', data);
      return data;
    } catch (error) {
      console.error('🔴 Failed to update resource:', error);
      return null;
    }
  }
  
  // Test delete resource
  async function testDeleteResource(resourceId) {
    if (!resourceId) {
      console.error('🔴 Failed to delete resource: No resource ID provided');
      return null;
    }
    
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRFToken': getCsrfToken()
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete resource: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🟢 Resource deleted successfully:', data);
      return data;
    } catch (error) {
      console.error('🔴 Failed to delete resource:', error);
      return null;
    }
  }
  
  // Get CSRF token
  function getCsrfToken() {
    const metaElement = document.querySelector('meta[name="csrf-token"]');
    if (metaElement) {
      return metaElement.getAttribute('content');
    }
    return '';
  }
  
  // Run tests
  async function runTests() {
    console.log('📝 Starting API resource tests...');
    
    // 1. Get resource list
    const resourcesResult = await testGetResources();
    
    if (!resourcesResult) {
      console.log('❌ Test terminated: Unable to get resource list');
      return;
    }
    
    // 2. Add resource
    const addResult = await testAddResource();
    
    if (!addResult || !addResult.resource || !addResult.resource.resource_id) {
      console.log('❌ Test terminated: Unable to add resource');
      return;
    }
    
    const newResourceId = addResult.resource.resource_id;
    console.log(`✅ Resource created successfully, ID: ${newResourceId}`);
    
    // 3. Update resource
    await testUpdateResource(newResourceId);
    
    // 4. Delete resource
    await testDeleteResource(newResourceId);
    
    console.log('🏁 Resource API tests completed!');
  }
  
  // Run tests after page is fully loaded
  window.addEventListener('load', function() {
    // Don't run tests automatically, run manually from console
    console.log('🛠️ Resource API tests ready! To run tests, call window.testResourceAPI() in console');
    window.testResourceAPI = runTests;
  });
})(); 