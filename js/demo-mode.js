/**
 * Demo Mode for GitHub Pages
 * This script intercepts API calls and provides mock data
 */

(function() {
  console.log('🎭 Demo mode enabled for GitHub Pages');
  
  // Store original fetch
  const originalFetch = window.fetch;
  
  // Override fetch to load from static JSON files
  window.fetch = async function(url, options) {
    // Check if it's an API call
    if (typeof url === 'string' && url.includes('/api/')) {
      const endpoint = url.replace(window.location.origin, '').split('?')[0];
      
      console.log('🎭 Intercepting API call:', endpoint);
      
      // Convert API endpoint to static JSON file path (relative)
      // /api/check-adb -> ./api/check-adb.json
      const jsonPath = '.' + endpoint + '.json';
      
      try {
        const response = await originalFetch(jsonPath);
        if (response.ok) {
          return response;
        }
      } catch (e) {
        console.error('Failed to load mock data:', e);
      }
      
      // Default response for unknown endpoints
      return new Response(JSON.stringify({
        success: false,
        error: 'Demo mode: This endpoint is not available',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For non-API calls, use original fetch
    return originalFetch(url, options);
  };
  
  // Add demo banner
  window.addEventListener('DOMContentLoaded', function() {
    const banner = document.createElement('div');
    banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 20px; text-align: center; z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
    banner.innerHTML = '🎭 <strong>Demo Mode</strong> - This is a preview version. To use with real devices, <a href="https://github.com/kibotu/adb-turbo" style="color: #fff; text-decoration: underline; font-weight: 600;">run locally</a>.';
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Adjust body padding to account for banner
    document.body.style.paddingTop = '48px';
  });
})();
