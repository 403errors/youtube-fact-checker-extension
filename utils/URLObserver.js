// URLObserver.js - Observes URL changes for YouTube navigation
// Handles YouTube's SPA navigation and triggers callbacks on URL changes

export class URLObserver {
  constructor() {
    this.currentUrl = location.href;
    this.callback = null;
    this.observer = null;
    this.isObserving = false;
  }

  init(callback) {
    this.callback = callback;
    this.setupObserver();
    this.isObserving = true;
    
    console.log('URL observer initialized');
  }

  setupObserver() {
    // Method 1: MutationObserver for DOM changes
    this.observer = new MutationObserver(() => {
      this.checkUrlChange();
    });
    
    this.observer.observe(document, { 
      childList: true, 
      subtree: true 
    });

    // Method 2: YouTube's navigation event
    window.addEventListener('yt-navigate-finish', () => {
      setTimeout(() => this.checkUrlChange(), 500);
    });

    // Method 3: History API changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      setTimeout(() => this.checkUrlChange(), 100);
    }.bind(this);
    
    history.replaceState = function() {
      originalReplaceState.apply(history, arguments);
      setTimeout(() => this.checkUrlChange(), 100);
    }.bind(this);

    // Method 4: Popstate event
    window.addEventListener('popstate', () => {
      setTimeout(() => this.checkUrlChange(), 100);
    });

    // Method 5: Hashchange event
    window.addEventListener('hashchange', () => {
      setTimeout(() => this.checkUrlChange(), 100);
    });

    // Method 6: Focus event (when returning to tab)
    window.addEventListener('focus', () => {
      setTimeout(() => this.checkUrlChange(), 200);
    });
  }

  checkUrlChange() {
    const newUrl = location.href;
    
    if (newUrl !== this.currentUrl) {
      const oldUrl = this.currentUrl;
      this.currentUrl = newUrl;
      
      console.log(`URL changed: ${oldUrl} -> ${newUrl}`);
      
      if (this.callback) {
        try {
          this.callback(newUrl, oldUrl);
        } catch (error) {
          console.error('URL change callback error:', error);
        }
      }
    }
  }

  // Get current video ID from URL
  getCurrentVideoId() {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('v');
  }

  // Check if current page is a watch page
  isWatchPage() {
    return location.pathname === '/watch' && location.search.includes('v=');
  }

  // Check if current page is YouTube homepage
  isHomePage() {
    return location.pathname === '/' || location.pathname === '/feed/trending';
  }

  // Check if current page is a channel page
  isChannelPage() {
    return location.pathname.startsWith('/channel/') || 
           location.pathname.startsWith('/c/') || 
           location.pathname.startsWith('/@');
  }

  // Check if current page is search results
  isSearchPage() {
    return location.pathname === '/results';
  }

  // Get page type
  getPageType() {
    if (this.isWatchPage()) return 'watch';
    if (this.isHomePage()) return 'home';
    if (this.isChannelPage()) return 'channel';
    if (this.isSearchPage()) return 'search';
    return 'other';
  }

  // Force check URL change (useful for debugging)
  forceCheck() {
    this.checkUrlChange();
  }

  // Update callback function
  setCallback(callback) {
    this.callback = callback;
  }

  // Get current URL
  getCurrentUrl() {
    return this.currentUrl;
  }

  // Get URL parameters
  getUrlParams() {
    return new URLSearchParams(location.search);
  }

  // Check if URL has specific parameter
  hasParam(paramName) {
    return this.getUrlParams().has(paramName);
  }

  // Get specific URL parameter
  getParam(paramName) {
    return this.getUrlParams().get(paramName);
  }

  // Wait for navigation to complete
  async waitForNavigation(timeout = 5000) {
    return new Promise((resolve) => {
      let resolved = false;
      const startUrl = this.currentUrl;
      
      const checkComplete = () => {
        // Check if URL changed and page is loaded
        if (this.currentUrl !== startUrl && document.readyState === 'complete') {
          if (!resolved) {
            resolved = true;
            resolve(true);
          }
        }
      };
      
      // Set up temporary listener
      const tempCallback = this.callback;
      this.callback = () => {
        if (tempCallback) tempCallback();
        setTimeout(checkComplete, 100);
      };
      
      // Timeout fallback
      setTimeout(() => {
        this.callback = tempCallback;
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }, timeout);
      
      // Check immediately
      checkComplete();
    });
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.callback = null;
    this.isObserving = false;
    
    console.log('URL observer cleaned up');
  }

  // Debug information
  getDebugInfo() {
    return {
      isObserving: this.isObserving,
      currentUrl: this.currentUrl,
      pageType: this.getPageType(),
      videoId: this.getCurrentVideoId(),
      hasCallback: !!this.callback,
      urlParams: Object.fromEntries(this.getUrlParams())
    };
  }
}