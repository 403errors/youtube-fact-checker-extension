// FactChecker.js - Enhanced with Transcript Pre-Processing Pipeline
// Now includes intelligent transcript processing before fact-checking

import { TranscriptExtractor } from '../transcript/TranscriptExtractor.js';
import { TranscriptProcessor } from '../transcript/TranscriptProcessor.js';
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
    this.processedTranscriptData = null; // Store processed transcript data
    this.isLoading = false;
    this.settings = {};
    this.initializationComplete = false;
    
    // Initialize modules
    this.transcriptExtractor = new TranscriptExtractor();
    this.transcriptProcessor = new TranscriptProcessor(); // New processor
    this.buttonManager = new ButtonManager();
    this.sidebarManager = new SidebarManager();
    this.resultsRenderer = new ResultsRenderer();
    this.cache = new Cache();
    
    // Navigation tracking
    this.lastUrl = location.href;
    this.navigationTimer = null;
    
    // Processing statistics
    this.processingStats = {
      totalAnalyses: 0,
      enhancedProcessingUsed: 0,
      fallbackUsed: 0,
      averageProcessingTime: 0
    };
  }

  async init() {
    try {
      console.log('🔧 Initializing Enhanced FactChecker...');
      
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
      console.log('✅ Enhanced FactChecker initialized with transcript processing');
      
    } catch (error) {
      console.error('❌ Enhanced FactChecker initialization failed:', error);
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
        this.processedTranscriptData = null; // Clear processed data
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
      this.processedTranscriptData = null;
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
    if (this.factCheckResults && this.processedTranscriptData) {
      // Show cached results with cache indicator and processing info
      console.log('📋 Showing cached results for video:', this.currentVideoId);
      this.displayResults(this.factCheckResults, true, this.processedTranscriptData); // Pass processed data
    } else {
      // No cache - perform fresh analysis with enhanced processing
      console.log('🔍 No cached results - performing enhanced analysis with transcript processing');
      await this.performEnhancedFactCheck();
    }
  }

  async refreshAnalysis() {
    if (!this.currentVideoId) return;
    
    console.log('🔄 FORCE REFRESH: Clearing all cache and starting fresh enhanced analysis...');
    
    // Completely reset state
    this.factCheckResults = null;
    this.processedTranscriptData = null;
    this.isLoading = false;
    
    // Clear transcript cache
    this.cache.clearTranscript(this.currentVideoId);
    
    // Clear transcript processing cache
    this.transcriptProcessor.clearCache();
    
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
    
    // Show loading and perform completely fresh enhanced analysis
    this.sidebarManager.showLoading('Performing fresh enhanced analysis...');
    
    // Force fresh analysis by bypassing any cached results
    await this.performEnhancedFactCheck(true); // Pass true to force refresh
  }

  async performEnhancedFactCheck(forceRefresh = false) {
    this.isLoading = true;
    this.buttonManager.setLoading(true);
    
    const processingStartTime = Date.now();
    
    try {
      console.log(`🚀 Starting ${forceRefresh ? 'FORCED FRESH' : 'enhanced'} fact-check analysis for video:`, this.currentVideoId);
      
      // Step 1: Extract raw transcript
      this.sidebarManager.showLoading('Extracting video transcript...');
      
      const rawTranscript = await this.transcriptExtractor.extract(this.currentVideoId, {
        forceRefresh: forceRefresh,
        skipCache: forceRefresh
      });
      
      if (!rawTranscript) {
        throw new Error('Could not retrieve video transcript. This video may not have captions available or they may be restricted.');
      }

      if (rawTranscript.length < Constants.MIN_TRANSCRIPT_LENGTH) {
        throw new Error('Video transcript is too short for reliable analysis.');
      }

      console.log(`📝 Raw transcript extracted: ${rawTranscript.length} characters`);

      // Step 2: Process transcript with AI
      this.sidebarManager.showLoading('Processing and cleaning transcript...');
      
      try {
        this.processedTranscriptData = await this.transcriptProcessor.process(
          rawTranscript,
          this.currentVideoId,
          this.settings,
          {
            forceRefresh: forceRefresh,
            maxLength: 8000,
            aggressiveCleaning: this.settings.strictMode || false
          }
        );
        
        console.log('✅ Transcript processing completed:');
        console.log(`📊 Length reduction: ${this.processedTranscriptData.metadata.originalLength} → ${this.processedTranscriptData.metadata.processedLength} chars (${this.processedTranscriptData.metadata.reductionPercentage}% reduction)`);
        console.log(`🎯 Segments identified: ${this.processedTranscriptData.segments.length}`);
        console.log(`🔍 Pre-identified claims: ${this.processedTranscriptData.factualClaims.length}`);
        console.log(`📋 Primary subject: ${this.processedTranscriptData.metadata.primarySubject}`);
        
        this.processingStats.enhancedProcessingUsed++;
        
      } catch (processingError) {
        console.warn('⚠️ Transcript processing failed, using raw transcript:', processingError);
        
        // Create fallback processed data structure
        this.processedTranscriptData = {
          processedTranscript: rawTranscript,
          segments: [{
            id: 1,
            type: 'discussion',
            topic: 'General Content',
            content: rawTranscript,
            priority: 'medium',
            claimDensity: 5,
            keywords: []
          }],
          factualClaims: [],
          metadata: {
            originalLength: rawTranscript.length,
            processedLength: rawTranscript.length,
            reductionPercentage: 0,
            topicsCount: 1,
            factualSegments: 1,
            primarySubject: 'General Discussion',
            fallbackUsed: true,
            videoId: this.currentVideoId
          }
        };
        
        this.processingStats.fallbackUsed++;
      }

      // Step 3: Enhanced fact-checking analysis with context validation
      this.sidebarManager.showLoading('Analyzing claims with AI fact-checker...');

      const response = await this.sendMessageWithRetry({
        type: 'ENHANCED_FACT_CHECK_REQUEST',
        data: { 
          transcript: rawTranscript, // Still send raw for fallback compatibility
          processedData: this.processedTranscriptData, // Send processed data
          forceRefresh: forceRefresh,
          videoId: this.currentVideoId
        }
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Enhanced analysis failed');
      }
      
      this.factCheckResults = response.result;
      
      const totalProcessingTime = Date.now() - processingStartTime;
      this.updateProcessingStats(totalProcessingTime);
      
      console.log(`✅ Enhanced fact-check completed in ${totalProcessingTime}ms`);
      
      this.displayResults(response.result, false, this.processedTranscriptData); // Show as fresh with processing info
      
    } catch (error) {
      console.error('Enhanced fact-check error:', error);
      
      // Handle extension context invalidation specifically
      if (error.message.includes('Extension context invalidated') || 
          error.message.includes('context invalidated') ||
          error.message.includes('Could not establish connection')) {
        this.handleContextInvalidation();
      } else {
        this.showError(error.message);
      }
    } finally {
      this.isLoading = false;
      this.buttonManager.setLoading(false);
    }
  }

  /**
   * Send message with retry logic for context invalidation
   */
  async sendMessageWithRetry(message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          throw new Error('Extension context invalidated');
        }

        const response = await chrome.runtime.sendMessage(message);
        return response;
        
      } catch (error) {
        console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        if (error.message.includes('Extension context invalidated') || 
            error.message.includes('context invalidated') ||
            error.message.includes('Could not establish connection')) {
          
          if (attempt < maxRetries) {
            console.log(`🔄 Extension context invalidated, waiting before retry ${attempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          } else {
            throw new Error('Extension context invalidated. Please refresh the page to continue using the fact-checker.');
          }
        } else {
          // Other errors, don't retry
          throw error;
        }
      }
    }
  }

  /**
   * Handle extension context invalidation
   */
  handleContextInvalidation() {
    console.warn('🔄 Extension context invalidated - extension was likely reloaded');
    
    const errorMessage = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 24px; margin-bottom: 12px;">🔄</div>
        <h4>Extension Reloaded</h4>
        <p>The fact-check extension was updated or reloaded.</p>
        <p><strong>Please refresh this page to continue using the fact-checker.</strong></p>
        <button onclick="location.reload()" style="
          background: #0ea5e9; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 6px; 
          font-weight: 500; 
          cursor: pointer;
          margin-top: 12px;
        ">
          Refresh Page
        </button>
      </div>
    `;
    
    this.sidebarManager.setContent(errorMessage);
    this.buttonManager.setActive(false);
  }

  displayResults(results, cached = false, processedData = null) {
    const content = this.resultsRenderer.renderEnhanced(results, cached, processedData);
    this.sidebarManager.setContent(content);
    this.resultsRenderer.setupInteractivity();
    this.buttonManager.setActive(true);
  }

  showError(message) {
    const content = this.resultsRenderer.renderError(message, true); // Pass true to show retry button
    this.sidebarManager.setContent(content);
    this.resultsRenderer.setupInteractivity(); // Setup retry button listener
    this.buttonManager.setActive(false);
  }

  hideSidebar() {
    this.sidebarManager.hide();
    this.buttonManager.setActive(false);
  }

  reset() {
    this.factCheckResults = null;
    this.processedTranscriptData = null;
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

  // Enhanced statistics tracking
  updateProcessingStats(processingTime) {
    this.processingStats.totalAnalyses++;
    
    if (this.processingStats.totalAnalyses === 1) {
      this.processingStats.averageProcessingTime = processingTime;
    } else {
      this.processingStats.averageProcessingTime = 
        (this.processingStats.averageProcessingTime + processingTime) / 2;
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

  // Enhanced debug utilities
  getDebugInfo() {
    return {
      isEnabled: this.isEnabled,
      currentVideoId: this.currentVideoId,
      hasResults: !!this.factCheckResults,
      hasProcessedData: !!this.processedTranscriptData,
      isLoading: this.isLoading,
      initializationComplete: this.initializationComplete,
      buttonInjected: this.buttonManager.isInjected(),
      sidebarVisible: this.sidebarManager.isVisible(),
      isWatchPage: this.isWatchPage(),
      settings: this.settings,
      processingStats: this.processingStats,
      transcriptProcessorStats: this.transcriptProcessor.getStats(),
      lastProcessedData: this.processedTranscriptData ? {
        originalLength: this.processedTranscriptData.metadata.originalLength,
        processedLength: this.processedTranscriptData.metadata.processedLength,
        reductionPercentage: this.processedTranscriptData.metadata.reductionPercentage,
        segmentsCount: this.processedTranscriptData.segments.length,
        claimsCount: this.processedTranscriptData.factualClaims.length,
        primarySubject: this.processedTranscriptData.metadata.primarySubject
      } : null
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

  async testTranscriptProcessing() {
    if (!this.currentVideoId) {
      console.log('No video ID available');
      return null;
    }

    console.log('Testing enhanced transcript processing for video:', this.currentVideoId);
    
    try {
      // Extract raw transcript
      const rawTranscript = await this.transcriptExtractor.extract(this.currentVideoId);
      if (!rawTranscript) {
        console.log('❌ No transcript available');
        return null;
      }

      console.log(`📝 Raw transcript: ${rawTranscript.length} characters`);
      
      // Process transcript
      const processedData = await this.transcriptProcessor.process(
        rawTranscript,
        this.currentVideoId,
        this.settings,
        { forceRefresh: true }
      );
      
      console.log('✅ Processing completed:');
      console.table({
        'Original Length': processedData.metadata.originalLength,
        'Processed Length': processedData.metadata.processedLength,
        'Reduction %': processedData.metadata.reductionPercentage + '%',
        'Segments': processedData.segments.length,
        'Claims Found': processedData.factualClaims.length,
        'Primary Subject': processedData.metadata.primarySubject
      });
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Testing failed:', error);
      return null;
    }
  }

  // Method to get processing statistics
  getProcessingStats() {
    return {
      ...this.processingStats,
      enhancedProcessingRate: this.processingStats.totalAnalyses > 0 ? 
        (this.processingStats.enhancedProcessingUsed / this.processingStats.totalAnalyses * 100).toFixed(1) + '%' : '0%',
      fallbackRate: this.processingStats.totalAnalyses > 0 ? 
        (this.processingStats.fallbackUsed / this.processingStats.totalAnalyses * 100).toFixed(1) + '%' : '0%'
    };
  }
}