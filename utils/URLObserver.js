// URLObserver.js - Fixed URL change detection for YouTube navigation
// Robust detection with proper timing and coordination

export class URLObserver {
  constructor() {
    this.currentUrl = location.href;
    this.callback = null;
    this.observer = null;
    this.isObserving = false;
    this.navigationTimeout = null;
    this.lastUrlChangeTime = 0;
    this.debounceDelay = 300; // Prevent rapid fire events
  }

  init(callback) {
    this.callback = callback;
    this.setupObserver();
    this.isObserving = true;
    console.log('🔍 URL observer initialized');
  }

  setupObserver() {
    // Method 1: YouTube's navigation event (most reliable)
    window.addEventListener('yt-navigate-finish', this.handleYouTubeNavigation.bind(this));
    
    // Method 2: History API monitoring
    this.interceptHistoryMethods();
    
    // Method 3: URL polling as fallback
    this.startUrlPolling();
    
    // Method 4: Focus event for tab switching
    window.addEventListener('focus', this.handleFocusEvent.bind(this));
    
    // Method 5: Popstate for back/forward
    window.addEventListener('popstate', this.handlePopState.bind(this));
  }

  handleYouTubeNavigation() {
    // YouTube's native navigation event
    this.scheduleUrlCheck(500); // Give YouTube time to update
  }

  interceptHistoryMethods() {
    const self = this;
    
    // Store original methods
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    
    // Override pushState
    history.pushState = function(...args) {
      originalPushState(...args);
      self.scheduleUrlCheck(100);
    };
    
    // Override replaceState
    history.replaceState = function(...args) {
      originalReplaceState(...args);
      self.scheduleUrlCheck(100);
    };
  }

  startUrlPolling() {
    // Lightweight polling every 1 second as ultimate fallback
    setInterval(() => {
      if (this.isObserving) {
        this.checkUrlChange();
      }
    }, 1000);
  }

  handleFocusEvent() {
    // Check URL when returning to tab
    this.scheduleUrlCheck(200);
  }

  handlePopState() {
    // Handle back/forward navigation
    this.scheduleUrlCheck(100);
  }

  scheduleUrlCheck(delay = 100) {
    // Clear any pending check
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
    }
    
    // Schedule new check
    this.navigationTimeout = setTimeout(() => {
      this.checkUrlChange();
      this.navigationTimeout = null;
    }, delay);
  }

  checkUrlChange() {
    const newUrl = location.href;
    const now = Date.now();
    
    // Debounce rapid changes
    if (now - this.lastUrlChangeTime < this.debounceDelay) {
      return;
    }
    
    if (newUrl !== this.currentUrl) {
      const oldUrl = this.currentUrl;
      this.currentUrl = newUrl;
      this.lastUrlChangeTime = now;
      
      console.log(`🔄 URL changed: ${this.getPageType(oldUrl)} -> ${this.getPageType(newUrl)}`);
      
      if (this.callback) {
        try {
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            this.callback(newUrl, oldUrl);
          }, 50);
        } catch (error) {
          console.error('URL change callback error:', error);
        }
      }
    }
  }

  // Utility methods
  getCurrentVideoId() {
    const match = location.search.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }

  isWatchPage() {
    return location.pathname === '/watch' && this.getCurrentVideoId() !== null;
  }

  getPageType(url = location.href) {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    if (pathname === '/watch' && urlObj.search.includes('v=')) return 'watch';
    if (pathname === '/' || pathname === '/feed/trending') return 'home';
    if (pathname.startsWith('/channel/') || pathname.startsWith('/c/') || pathname.startsWith('/@')) return 'channel';
    if (pathname === '/results') return 'search';
    return 'other';
  }

  // Force immediate check (useful for debugging)
  forceCheck() {
    this.checkUrlChange();
  }

  // Update callback
  setCallback(callback) {
    this.callback = callback;
  }

  // Get current state
  getCurrentUrl() {
    return this.currentUrl;
  }

  cleanup() {
    this.isObserving = false;
    this.callback = null;
    
    if (this.navigationTimeout) {
      clearTimeout(this.navigationTimeout);
      this.navigationTimeout = null;
    }
    
    console.log('🧹 URL observer cleaned up');
  }

  // Debug info
  getDebugInfo() {
    return {
      isObserving: this.isObserving,
      currentUrl: this.currentUrl,
      pageType: this.getPageType(),
      videoId: this.getCurrentVideoId(),
      hasCallback: !!this.callback,
      lastChangeTime: this.lastUrlChangeTime
    };
  }
}