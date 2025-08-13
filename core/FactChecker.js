// Core FactChecker class - Main controller for the fact-checking functionality
// Handles coordination between all modules

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
    
    // Initialize modules
    this.transcriptExtractor = new TranscriptExtractor();
    this.buttonManager = new ButtonManager();
    this.sidebarManager = new SidebarManager();
    this.resultsRenderer = new ResultsRenderer();
    this.cache = new Cache();
  }

  async init() {
    try {
      await this.loadSettings();
      
      if (this.isEnabled) {
        // Initialize UI managers
        this.buttonManager.init({
          onToggle: () => this.toggleFactCheck(),
          onRefresh: () => this.refreshAnalysis()
        });

        this.sidebarManager.init({
          onClose: () => this.hideSidebar(),
          onRefresh: () => this.refreshAnalysis()
        });
      }
    } catch (error) {
      console.error('Failed to initialize FactChecker:', error);
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
      this.isEnabled = true;
    }
  }

  handleSettingsUpdate(settings) {
    this.settings = { ...this.settings, ...settings };
    this.isEnabled = settings.enabled !== false;
    
    if (!this.isEnabled) {
      this.cleanup();
    } else if (this.isWatchPage()) {
      this.buttonManager.tryInject();
    }
  }

  handleExtensionToggle(enabled) {
    this.isEnabled = enabled;
    this.settings.enabled = enabled;
    
    if (!enabled) {
      this.cleanup();
    } else if (this.isWatchPage()) {
      this.buttonManager.tryInject();
    }
  }

  handleUrlChange(url) {
    const videoId = this.getVideoId();
    
    if (!this.isWatchPage()) {
      this.cleanup();
      return;
    }
    
    if (videoId !== this.currentVideoId) {
      this.currentVideoId = videoId;
      this.factCheckResults = null;
      this.reset();
      
      if (this.isEnabled) {
        this.buttonManager.tryInject();
      }
    }
  }

  checkCurrentPage() {
    if (this.isWatchPage()) {
      this.currentVideoId = this.getVideoId();
      if (this.isEnabled) {
        this.buttonManager.tryInject();
      }
    }
  }

  isWatchPage() {
    return location.pathname === '/watch' && location.search.includes('v=');
  }

  getVideoId() {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('v');
  }

  reset() {
    this.factCheckResults = null;
    this.buttonManager.reset();
    this.sidebarManager.hide();
  }

  async toggleFactCheck() {
    if (this.sidebarManager.isVisible()) {
      this.sidebarManager.hide();
    } else {
      await this.showFactCheck();
    }
  }

  async showFactCheck() {
    if (!this.settings.apiKey?.trim()) {
      this.showError('Please configure your API key in the extension settings first.');
      return;
    }

    this.sidebarManager.show();
    
    if (!this.factCheckResults) {
      await this.performFactCheck();
    } else {
      this.displayResults(this.factCheckResults);
    }
  }

  async refreshAnalysis() {
    this.factCheckResults = null;
    this.cache.clearTranscript(this.currentVideoId);
    
    this.sidebarManager.showLoading('Re-analyzing content...');
    await this.performFactCheck();
  }

  async performFactCheck() {
    this.isLoading = true;
    this.buttonManager.setLoading(true);
    
    try {
      console.log('Starting fact-check analysis for video:', this.currentVideoId);
      
      // Extract transcript using the transcript extractor
      const transcript = await this.transcriptExtractor.extract(this.currentVideoId);
      
      if (!transcript) {
        throw new Error('Could not retrieve video transcript. This video may not have captions available or they may be restricted.');
      }

      if (transcript.length < Constants.MIN_TRANSCRIPT_LENGTH) {
        throw new Error('Video transcript is too short for reliable analysis.');
      }

      // Send to background script for analysis
      const response = await chrome.runtime.sendMessage({
        type: 'FACT_CHECK_REQUEST',
        data: { transcript }
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Analysis failed');
      }
      
      this.factCheckResults = response.result;
      this.displayResults(response.result, response.cached);
      
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
  }

  showError(message) {
    const content = this.resultsRenderer.renderError(message, () => this.refreshAnalysis());
    this.sidebarManager.setContent(content);
  }

  hideSidebar() {
    this.sidebarManager.hide();
  }

  cleanup() {
    this.reset();
    this.buttonManager.cleanup();
    this.sidebarManager.cleanup();
    this.cache.clear();
  }

  // Debug utilities
  getDebugInfo() {
    return {
      isEnabled: this.isEnabled,
      currentVideoId: this.currentVideoId,
      hasResults: !!this.factCheckResults,
      isLoading: this.isLoading,
      buttonInjected: this.buttonManager.isInjected(),
      sidebarVisible: this.sidebarManager.isVisible(),
      cacheSize: this.cache.size(),
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