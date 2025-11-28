#!/usr/bin/env python3
"""
Static Site Generator for adb-turbo
Generates a static version of the site for GitHub Pages deployment
"""

import json
import os
import shutil
import time
import requests
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8765"
BUILD_DIR = "build"
TIMEOUT = 30


def wait_for_server(url: str, timeout: int = TIMEOUT) -> bool:
    """Wait for the Flask server to be ready"""
    print(f"Waiting for server at {url}...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print("✓ Server is ready!")
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(1)
    
    print("✗ Server failed to start within timeout")
    return False


def create_build_directory():
    """Create and prepare the build directory"""
    build_path = Path(BUILD_DIR)
    
    # Remove existing build directory
    if build_path.exists():
        print(f"Removing existing {BUILD_DIR} directory...")
        shutil.rmtree(build_path)
    
    # Create fresh build directory
    print(f"Creating {BUILD_DIR} directory...")
    build_path.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    (build_path / "api").mkdir(exist_ok=True)
    (build_path / "css").mkdir(exist_ok=True)
    (build_path / "js").mkdir(exist_ok=True)


def copy_static_files():
    """Copy static files to build directory"""
    print("Copying static files...")
    
    static_path = Path("static")
    build_path = Path(BUILD_DIR)
    
    # Copy CSS
    if (static_path / "css").exists():
        shutil.copytree(static_path / "css", build_path / "css", dirs_exist_ok=True)
        print("  ✓ CSS files copied")
    
    # Copy JS
    if (static_path / "js").exists():
        shutil.copytree(static_path / "js", build_path / "js", dirs_exist_ok=True)
        print("  ✓ JS files copied")
    
    # Copy any other static assets
    for item in static_path.iterdir():
        if item.is_file():
            shutil.copy2(item, build_path / item.name)
            print(f"  ✓ {item.name} copied")


def fetch_and_save(endpoint: str, filename: str = None) -> dict:
    """Fetch data from API endpoint and save to file"""
    if filename is None:
        filename = endpoint.replace("/api/", "").replace("/", "_") + ".json"
    
    url = f"{BASE_URL}{endpoint}"
    output_path = Path(BUILD_DIR) / "api" / filename
    
    try:
        print(f"Fetching {endpoint}...")
        response = requests.get(url, timeout=10)
        data = response.json()
        
        # Save to file
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"  ✓ Saved to {output_path}")
        return data
    
    except Exception as e:
        print(f"  ✗ Failed to fetch {endpoint}: {e}")
        # Create a default error response
        error_data = {
            "success": False,
            "error": f"Failed to fetch data: {str(e)}",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
        }
        with open(output_path, 'w') as f:
            json.dump(error_data, f, indent=2)
        return error_data


def capture_main_page():
    """Capture the main index page"""
    print("Capturing main page...")
    
    try:
        response = requests.get(BASE_URL, timeout=10)
        html_content = response.text
        
        # Save to build directory
        output_path = Path(BUILD_DIR) / "index.html"
        with open(output_path, 'w') as f:
            f.write(html_content)
        
        print(f"  ✓ Main page saved to {output_path}")
        return True
    
    except Exception as e:
        print(f"  ✗ Failed to capture main page: {e}")
        return False


def create_demo_mode_script():
    """Create the demo mode JavaScript"""
    print("Creating demo mode script...")
    
    demo_script = """/**
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
"""
    
    output_path = Path(BUILD_DIR) / "js" / "demo-mode.js"
    with open(output_path, 'w') as f:
        f.write(demo_script)
    
    print(f"  ✓ Demo mode script saved to {output_path}")


def inject_demo_mode():
    """Inject demo mode script into HTML"""
    print("Injecting demo mode into HTML...")
    
    index_path = Path(BUILD_DIR) / "index.html"
    
    try:
        with open(index_path, 'r') as f:
            html_content = f.read()
        
        # Fix static file paths for GitHub Pages
        # Change /static/css/style.css to ./css/style.css (relative path)
        html_content = html_content.replace(
            'href="/static/css/style.css"',
            'href="./css/style.css"'
        )
        
        # Change /static/js/app.js to ./js/app.js (relative path)
        html_content = html_content.replace(
            'src="/static/js/app.js"',
            'src="./js/app.js"'
        )
        
        # Inject demo mode script before closing head tag
        html_content = html_content.replace(
            '</head>',
            '    <script src="./js/demo-mode.js"></script>\n</head>'
        )
        
        # Update title to indicate demo
        html_content = html_content.replace(
            '<title>adb-turbo',
            '<title>adb-turbo (Demo)'
        )
        
        # Update meta description
        html_content = html_content.replace(
            '<meta name="description" content="A friendly web-based tool for Android performance optimization via ADB. 43 commands across 13 categories.">',
            '<meta name="description" content="Demo: A friendly web-based tool for Android performance optimization via ADB. 43 commands across 13 categories. Run locally for full functionality.">'
        )
        
        with open(index_path, 'w') as f:
            f.write(html_content)
        
        print("  ✓ Demo mode injected successfully")
        print("  ✓ Static file paths fixed for GitHub Pages")
        return True
    
    except Exception as e:
        print(f"  ✗ Failed to inject demo mode: {e}")
        return False


def create_404_page():
    """Create a 404 page"""
    print("Creating 404 page...")
    
    index_path = Path(BUILD_DIR) / "index.html"
    page_404_path = Path(BUILD_DIR) / "404.html"
    
    try:
        shutil.copy2(index_path, page_404_path)
        print(f"  ✓ 404 page created at {page_404_path}")
        return True
    except Exception as e:
        print(f"  ✗ Failed to create 404 page: {e}")
        return False


def create_nojekyll():
    """Create .nojekyll file to disable Jekyll processing"""
    print("Creating .nojekyll file...")
    
    nojekyll_path = Path(BUILD_DIR) / ".nojekyll"
    nojekyll_path.touch()
    
    print(f"  ✓ .nojekyll file created")


def main():
    """Main build process"""
    print("=" * 60)
    print("adb-turbo Static Site Generator")
    print("=" * 60)
    print()
    
    # Check if server is running
    if not wait_for_server(BASE_URL):
        print("\n❌ Build failed: Server is not running")
        print("Please start the Flask server before running this script:")
        print("  uv run python app.py")
        return 1
    
    print()
    
    # Create build directory
    create_build_directory()
    print()
    
    # Copy static files
    copy_static_files()
    print()
    
    # Capture main page
    capture_main_page()
    print()
    
    # Fetch API endpoints
    print("Fetching API endpoints...")
    fetch_and_save("/api/check-adb", "check-adb.json")
    fetch_and_save("/api/devices", "devices.json")
    fetch_and_save("/api/categories", "categories.json")
    print()
    
    # Create demo mode script
    create_demo_mode_script()
    print()
    
    # Inject demo mode into HTML
    inject_demo_mode()
    print()
    
    # Create 404 page
    create_404_page()
    print()
    
    # Create .nojekyll file
    create_nojekyll()
    print()
    
    print("=" * 60)
    print("✅ Build completed successfully!")
    print(f"📦 Static site generated in '{BUILD_DIR}' directory")
    print("=" * 60)
    
    return 0


if __name__ == "__main__":
    exit(main())

