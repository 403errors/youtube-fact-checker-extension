// YouTube Fact-Check Extension - Main Background Service Orchestrator
import { APIService } from './APIService.js';
import { FactCheckEngine } from './FactCheckEngine.js';
import { MessageHandler } from './MessageHandler.js';
import { SettingsManager } from '../utils/SettingsManager.js';
import { CacheManager } from '../utils/CacheManager.js';
import { StatsManager } from '../utils/StatsManager.js';

class BackgroundService {
  constructor() {
    this.apiService = new APIService();
    this.factCheckEngine = new FactCheckEngine();
    this.messageHandler = new MessageHandler();
    this.settingsManager = new SettingsManager();
    this.cacheManager = new CacheManager();
    this.statsManager = new StatsManager();
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.settingsManager.initializeDefaults();
    this.cacheManager.startCleanupTimer();
  }

  setupEventListeners() {
    chrome.runtime.onInstalled.addListener((details) => {
      this.settingsManager.handleInstallation(details);
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.messageHandler.handle(message, sender, sendResponse);
      return true;
    });

    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });

    chrome.runtime.onStartup.addListener(() => {
      this.cacheManager.cleanupExpired();
    });
  }

  async handleActionClick(tab) {
    try {
      if (tab.url?.includes('youtube.com/watch')) {
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FACT_CHECK' });
      } else {
        chrome.action.openPopup();
      }
    } catch (error) {
      console.log('Could not communicate with content script:', error);
    }
  }
}

// Initialize service
const backgroundService = new BackgroundService();

// Service worker lifecycle
self.addEventListener('activate', () => {
  console.log('🔧 Fact-Check extension activated');
});

chrome.runtime.onConnect.addListener(() => {
  // Keep connection alive
});

console.log('🔧 YouTube Fact-Check Extension loaded');