// YouTube Fact-Check Extension - Fixed Content Script Entry Point
// Robust initialization with proper timing and error recovery

class ContentScriptManager {
  constructor() {
    this.factChecker = null;
    this.stylesManager = null;
    this.urlObserver = null;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async init() {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  async _performInitialization() {
    try {
      console.log('🚀 Initializing YouTube Fact-Check Extension...');
      
      // Wait for YouTube to be ready
      await this.waitForYouTubeReady();
      
      // Import modules with error handling
      const modules = await this.importModules();
      
      // Initialize managers in correct order
      await this.initializeManagers(modules);
      
      // Setup coordination
      this.setupEventHandlers();
      
      // Check current page
      this.checkCurrentPage();

      this.isInitialized = true;
      console.log('✅ Extension initialized successfully');
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      await this.handleInitializationError(error);
    }
  }

  async waitForYouTubeReady() {
    // Wait for basic YouTube structure
    await this.waitForElement('ytd-app', 5000);
    
    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async importModules() {
    const baseUrl = chrome.runtime.getURL('');
    
    try {
      const [
        { FactChecker },
        { StylesManager },
        { URLObserver }
      ] = await Promise.all([
        import(chrome.runtime.getURL('core/FactChecker.js')),
        import(chrome.runtime.getURL('ui/StylesManager.js')),
        import(chrome.runtime.getURL('utils/URLObserver.js'))
      ]);

      return { FactChecker, StylesManager, URLObserver };
    } catch (error) {
      throw new Error(`Module import failed: ${error.message}`);
    }
  }

  async initializeManagers({ FactChecker, StylesManager, URLObserver }) {
    // Initialize styles first
    this.stylesManager = new StylesManager();
    this.stylesManager.inject();

    // Initialize core fact checker
    this.factChecker = new FactChecker();
    await this.factChecker.init();

    // Initialize URL observer last
    this.urlObserver = new URLObserver();
    this.urlObserver.init((url, oldUrl) => {
      this.handleUrlChange(url, oldUrl);
    });
  }

  setupEventHandlers() {
    // Message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });

    // Window events
    window.addEventListener('beforeunload', () => this.cleanup());
    
    // YouTube-specific events
    window.addEventListener('yt-navigate-finish', () => {
      setTimeout(() => this.handleYouTubeNavigation(), 500);
    });
  }

  handleUrlChange(url, oldUrl) {
    console.log(`🔄 URL changed: ${oldUrl} -> ${url}`);
    
    if (this.factChecker) {
      this.factChecker.handleUrlChange(url);
    }
  }

  handleYouTubeNavigation() {
    if (this.factChecker && this.isWatchPage()) {
      this.factChecker.checkCurrentPage();
    }
  }

  handleMessage(message, sender, sendResponse) {
    if (!this.factChecker) return;

    switch (message.type) {
      case 'SETTINGS_UPDATED':
        this.factChecker.handleSettingsUpdate(message.settings);
        break;
      case 'EXTENSION_TOGGLED':
        this.factChecker.handleExtensionToggle(message.enabled);
        break;
      case 'TOGGLE_FACT_CHECK':
        this.factChecker.toggleFactCheck();
        break;
    }
  }

  checkCurrentPage() {
    if (this.factChecker && this.isWatchPage()) {
      this.factChecker.checkCurrentPage();
    }
  }

  isWatchPage() {
    return location.pathname === '/watch' && location.search.includes('v=');
  }

  async handleInitializationError(error) {
    this.retryCount++;
    
    if (this.retryCount < this.maxRetries) {
      console.log(`🔄 Retrying initialization (${this.retryCount}/${this.maxRetries})...`);
      
      // Reset state
      this.initializationPromise = null;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
      
      // Retry
      return this.init();
    } else {
      console.error('❌ Max retries reached. Extension failed to initialize.');
    }
  }

  async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }

  cleanup() {
    console.log('🧹 Cleaning up extension...');
    
    if (this.factChecker) {
      this.factChecker.cleanup();
      this.factChecker = null;
    }

    if (this.urlObserver) {
      this.urlObserver.cleanup();
      this.urlObserver = null;
    }

    if (this.stylesManager) {
      this.stylesManager.remove();
      this.stylesManager = null;
    }

    this.isInitialized = false;
    this.initializationPromise = null;
  }

  // Debug utilities
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      retryCount: this.retryCount,
      currentUrl: location.href,
      isWatchPage: this.isWatchPage(),
      factChecker: this.factChecker?.getDebugInfo() || null
    };
  }
}

// Safe initialization function
async function initializeFactChecker() {
  if (window.factCheckerManager) {
    window.factCheckerManager.cleanup();
  }
  
  window.factCheckerManager = new ContentScriptManager();
  await window.factCheckerManager.init();
}

// Initialize based on document state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFactChecker);
} else {
  // Small delay for YouTube's dynamic loading
  setTimeout(initializeFactChecker, 500);
}

// Global debug access
window.debugFactChecker = () => window.factCheckerManager?.getDebugInfo();
window.testTranscript = async () => window.factCheckerManager?.factChecker?.testTranscriptExtraction();

console.log('🚀 YouTube Fact-Check Extension content script loaded!');