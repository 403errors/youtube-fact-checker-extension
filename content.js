// YouTube Fact-Check Extension - Main Content Script Entry Point
// Simplified and modularized for better maintainability

import { FactChecker } from './core/FactChecker.js';
import { StylesManager } from './ui/StylesManager.js';
import { URLObserver } from './utils/URLObserver.js';

class ContentScriptManager {
  constructor() {
    this.factChecker = null;
    this.stylesManager = null;
    this.urlObserver = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      console.log('🚀 Initializing YouTube Fact-Check Extension...');
      
      // Initialize core managers
      this.stylesManager = new StylesManager();
      this.factChecker = new FactChecker();
      this.urlObserver = new URLObserver();

      // Setup styles first
      this.stylesManager.inject();

      // Initialize fact checker
      await this.factChecker.init();

      // Setup URL observation
      this.urlObserver.init((url) => {
        this.factChecker.handleUrlChange(url);
      });

      // Setup global message listeners
      this.setupMessageListeners();

      // Check current page
      this.factChecker.checkCurrentPage();

      this.isInitialized = true;
      console.log('✅ YouTube Fact-Check Extension initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize fact-checker:', error);
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    });
  }

  cleanup() {
    console.log('🧹 Cleaning up YouTube Fact-Check Extension...');
    
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
  }
}

// Initialize the content script manager
function initializeFactChecker() {
  if (window.factCheckerManager) {
    window.factCheckerManager.cleanup();
  }
  
  window.factCheckerManager = new ContentScriptManager();
  window.factCheckerManager.init();
}

// Safe initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFactChecker);
} else {
  initializeFactChecker();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.factCheckerManager) {
    window.factCheckerManager.cleanup();
  }
});

// Debug utilities
window.debugFactChecker = () => {
  if (window.factCheckerManager?.factChecker) {
    return window.factCheckerManager.factChecker.getDebugInfo();
  }
  return null;
};

window.testTranscript = async () => {
  if (window.factCheckerManager?.factChecker) {
    return await window.factCheckerManager.factChecker.testTranscriptExtraction();
  }
  return null;
};

console.log('🚀 YouTube Fact-Check Extension content script loaded!');