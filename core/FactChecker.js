// FactChecker.js - Fixed coordination and state management
// Proper initialization sequence and navigation handling

import { TranscriptExtractor } from '../transcript/TranscriptExtractor.js';
import { ButtonManager } from '../ui/ButtonManager.js';
import { SidebarManager } from '../ui/SidebarManager.js';
import { ResultsRenderer } from '../ui/ResultsRenderer.js';
import { Cache } from '../utils/Cache.js';
import { Constants } from '../utils/Constants.js';

export class FactChecker {
  constructor() {
    this.isEnabled = true;
    this.currentVideoId = null;
    this.factCheckResults = null;
    this.isLoading = false;
    this.settings = {};
    this.initializationComplete = false;
    
    // Initialize modules
    this.transcriptExtractor = new TranscriptExtractor();
    this.buttonManager = new ButtonManager();
    this.sidebarManager = new SidebarManager();
    this.resultsRenderer = new ResultsRenderer();
    this.cache = new Cache();
    
    // Navigation tracking
    this.lastUrl = location.href;
    this.navigationTimer = null;
  }

  async init() {
    try {
      console.log('🔧 Initializing FactChecker...');
      
      // Load settings first
      await this.loadSettings();
      
      if (this.isEnabled) {
        // Initialize UI managers with callbacks
        this.buttonManager.init({
          onToggle: () => this.toggleFactCheck(),
          onRefresh: () => this.refreshAnalysis()
        });

        this.sidebarManager.init({
          onClose: () => this.hideSidebar(),
          onRefresh: () => this.refreshAnalysis()
        });
        
        // Set current video ID if on watch page
        this.updateCurrentVideoId();
      }
      
      this.initializationComplete = true;
      console.log('✅ FactChecker initialized');
      
    } catch (error) {
      console.error('❌ FactChecker initialization failed:', error);
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response?.success) {
        this.settings = response.settings;
        this.isEnabled = response.settings.enabled !== false;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults
      this.isEnabled = true;
      this.settings = {};
    }
  }

  handleSettingsUpdate(settings) {
    const wasEnabled = this.isEnabled;
    
    this.settings = { ...this.settings, ...settings };
    this.isEnabled = settings.enabled !== false;
    
    // Handle enable/disable state change
    if (wasEnabled !== this.isEnabled) {
      if (this.isEnabled && this.isWatchPage()) {
        // Extension was enabled - inject button
        setTimeout(() => this.buttonManager.tryInject(), 100);
      } else if (!this.isEnabled) {
        // Extension was disabled - cleanup
        this.cleanup(false); // Don't reset settings
      }
    }
  }

  handleExtensionToggle(enabled) {
    this.handleSettingsUpdate({ enabled });
  }

  handleUrlChange(url) {
    const oldUrl = this.lastUrl;
    this.lastUrl = url;
    
    // Clear any pending navigation timer
    if (this.navigationTimer) {
      clearTimeout(this.navigationTimer);
    }
    
    // Schedule navigation handling with delay
    this.navigationTimer = setTimeout(() => {
      this.processNavigation(url, oldUrl);
    }, 300);
  }

  processNavigation(url, oldUrl) {
    const videoId = this.getVideoId();
    const wasWatchPage = oldUrl.includes('/watch');
    const isWatchPage = this.isWatchPage();
    
    console.log(`🔄 Navigation: ${wasWatchPage ? 'watch' : 'other'} -> ${isWatchPage ? 'watch' : 'other'}`);
    
    // Handle leaving watch page
    if (wasWatchPage && !isWatchPage) {
      this.cleanup(false);
      return;
    }
    
    // Handle entering watch page or video change
    if (isWatchPage) {
      if (videoId !== this.currentVideoId) {
        this.currentVideoId = videoId;
        this.factCheckResults = null;
        this.reset();
        
        if (this.isEnabled && this.initializationComplete) {
          // Small delay to ensure DOM is ready
          setTimeout(() => this.buttonManager.tryInject(), 500);
        }
      }
    }
  }

  updateCurrentVideoId() {
    const videoId = this.getVideoId();
    if (videoId !== this.currentVideoId) {
      this.currentVideoId = videoId;
      this.factCheckResults = null;
    }
  }

  checkCurrentPage() {
    if (!this.initializationComplete || !this.isEnabled) {
      return;
    }
    
    if (this.isWatchPage()) {
      this.updateCurrentVideoId();
      
      // Try to inject button if not already present
      if (!this.buttonManager.isInjected()) {
        this.buttonManager.tryInject();
      }
    }
  }

  async toggleFactCheck() {
    if (this.sidebarManager.isVisible()) {
      this.sidebarManager.hide();
    } else {
      await this.showFactCheck();
    }
  }

  async showFactCheck() {
    // Validate prerequisites
    if (!this.settings.apiKey?.trim()) {
      this.showError('Please configure your API key in the extension settings first.');
      return;
    }

    if (!this.currentVideoId) {
      this.showError('No video detected. Please make sure you\'re on a YouTube video page.');
      return;
    }

    // Show sidebar
    this.sidebarManager.show();
    
    // Check if we have cached results for this video
    if (this.factCheckResults) {
      // Show cached results with cache indicator
      console.log('📋 Showing cached results for video:', this.currentVideoId);
      this.displayResults(this.factCheckResults, true); // Pass true for cached
    } else {
      // No cache - perform fresh analysis
      console.log('🔍 No cached results - performing fresh analysis');
      await this.performFactCheck();
    }
  }

  async refreshAnalysis() {
    if (!this.currentVideoId) return;
    
    console.log('🔄 FORCE REFRESH: Clearing all cache and starting fresh analysis...');
    
    // Completely reset state
    this.factCheckResults = null;
    this.isLoading = false;
    
    // Clear transcript cache
    this.cache.clearTranscript(this.currentVideoId);
    
    // Clear any cached fact-check results in background
    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_CACHE',
        videoId: this.currentVideoId
      });
    } catch (error) {
      console.log('Could not clear background cache:', error);
    }
    
    // Force the button to reset state
    this.buttonManager.setLoading(false);
    this.buttonManager.setActive(false);
    
    // Small delay to ensure state is reset
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Show loading and perform completely fresh analysis
    this.sidebarManager.showLoading('Performing fresh analysis...');
    
    // Force fresh analysis by bypassing any cached results
    await this.performFactCheck(true); // Pass true to force refresh
  }

  async performFactCheck(forceRefresh = false) {
    this.isLoading = true;
    this.buttonManager.setLoading(true);
    
    try {
      console.log(`🔍 Starting ${forceRefresh ? 'FORCED FRESH' : 'fact-check'} analysis for video:`, this.currentVideoId);
      
      // Extract transcript with force refresh if needed
      const transcript = await this.transcriptExtractor.extract(this.currentVideoId, {
        forceRefresh: forceRefresh,
        skipCache: forceRefresh
      });
      
      if (!transcript) {
        throw new Error('Could not retrieve video transcript. This video may not have captions available or they may be restricted.');
      }

      if (transcript.length < Constants.MIN_TRANSCRIPT_LENGTH) {
        throw new Error('Video transcript is too short for reliable analysis.');
      }

      // Send to background for analysis with force refresh flag
      const response = await chrome.runtime.sendMessage({
        type: 'FACT_CHECK_REQUEST',
        data: { 
          transcript,
          forceRefresh: forceRefresh,
          videoId: this.currentVideoId
        }
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Analysis failed');
      }
      
      this.factCheckResults = response.result;
      this.displayResults(response.result, false); // Always show as fresh when we just analyzed
      
    } catch (error) {
      console.error('Fact-check error:', error);
      this.showError(error.message);
    } finally {
      this.isLoading = false;
      this.buttonManager.setLoading(false);
    }
  }

  displayResults(results, cached = false) {
    const content = this.resultsRenderer.render(results, cached);
    this.sidebarManager.setContent(content);
    this.resultsRenderer.setupInteractivity();
    this.buttonManager.setActive(true);
  }

  showError(message) {
    const content = this.resultsRenderer.renderError(message, () => this.refreshAnalysis());
    this.sidebarManager.setContent(content);
    this.buttonManager.setActive(false);
  }

  hideSidebar() {
    this.sidebarManager.hide();
    this.buttonManager.setActive(false);
  }

  reset() {
    this.factCheckResults = null;
    this.buttonManager.reset();
    this.sidebarManager.hide();
    this.isLoading = false;
  }

  cleanup(resetSettings = true) {
    this.reset();
    this.buttonManager.cleanup();
    this.sidebarManager.cleanup();
    
    if (resetSettings) {
      this.currentVideoId = null;
      this.initializationComplete = false;
    }
    
    if (this.navigationTimer) {
      clearTimeout(this.navigationTimer);
      this.navigationTimer = null;
    }
  }

  // Utility methods
  isWatchPage() {
    return location.pathname === '/watch' && location.search.includes('v=');
  }

  getVideoId() {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('v');
  }

  // Debug utilities
  getDebugInfo() {
    return {
      isEnabled: this.isEnabled,
      currentVideoId: this.currentVideoId,
      hasResults: !!this.factCheckResults,
      isLoading: this.isLoading,
      initializationComplete: this.initializationComplete,
      buttonInjected: this.buttonManager.isInjected(),
      sidebarVisible: this.sidebarManager.isVisible(),
      isWatchPage: this.isWatchPage(),
      settings: this.settings
    };
  }

  async testTranscriptExtraction() {
    if (!this.currentVideoId) {
      console.log('No video ID available');
      return null;
    }

    console.log('Testing transcript extraction for video:', this.currentVideoId);
    return await this.transcriptExtractor.extract(this.currentVideoId);
  }
}