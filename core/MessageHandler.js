// Message routing and handling - Fixed to support forceRefresh
import { SettingsManager } from '../utils/SettingsManager.js';
import { APIService } from './APIService.js';
import { FactCheckEngine } from './FactCheckEngine.js';
import { StatsManager } from '../utils/StatsManager.js';

export class MessageHandler {
  constructor() {
    this.settingsManager = new SettingsManager();
    this.apiService = new APIService();
    this.factCheckEngine = new FactCheckEngine();
    this.statsManager = new StatsManager();
  }

  async handle(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_SETTINGS':
          await this.handleGetSettings(sendResponse);
          break;
        case 'SAVE_SETTINGS':
          await this.handleSaveSettings(message.settings, sendResponse);
          break;
        case 'FACT_CHECK_REQUEST':
          await this.handleFactCheckRequest(message.data, sender, sendResponse);
          break;
        case 'VALIDATE_API_KEY':
          await this.handleApiKeyValidation(message.apiKey, sendResponse);
          break;
        case 'TOGGLE_EXTENSION':
          await this.handleToggleExtension(message.enabled, sendResponse);
          break;
        case 'GET_EXTENSION_STATE':
          await this.handleGetExtensionState(sendResponse);
          break;
        case 'RESET_SETTINGS':
          await this.handleResetSettings(sendResponse);
          break;
        case 'CLEAR_CACHE':
          await this.handleClearCache(message.videoId, sendResponse);
          break;
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetSettings(sendResponse) {
    try {
      const settings = await this.settingsManager.getAll();
      sendResponse({ success: true, settings });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSaveSettings(newSettings, sendResponse) {
    try {
      const settings = await this.settingsManager.save(newSettings);
      await this.notifyTabsOfSettingsUpdate(newSettings);
      sendResponse({ success: true, settings });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleFactCheckRequest(data, sender, sendResponse) {
    try {
      // Check for force refresh flag
      const forceRefresh = data.forceRefresh === true;
      
      if (forceRefresh) {
        console.log('🔄 Force refresh requested - bypassing cache');
        
        // Clear cache for this specific request
        if (data.videoId) {
          this.factCheckEngine.clearCache(data.videoId);
        }
      }
      
      // Pass force refresh flag to engine
      const result = await this.factCheckEngine.process(data, sender, forceRefresh);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleApiKeyValidation(apiKey, sendResponse) {
    try {
      const isValid = await this.apiService.validateKey(apiKey);
      sendResponse({ success: true, valid: isValid });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleToggleExtension(enabled, sendResponse) {
    try {
      await this.settingsManager.update({ enabled: Boolean(enabled) });
      await this.notifyTabsOfExtensionToggle(enabled);
      sendResponse({ success: true, enabled: Boolean(enabled) });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetExtensionState(sendResponse) {
    try {
      const { enabled } = await this.settingsManager.get(['enabled']);
      sendResponse({ success: true, enabled: Boolean(enabled) });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleResetSettings(sendResponse) {
    try {
      await this.settingsManager.reset();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleClearCache(videoId, sendResponse) {
    try {
      if (videoId) {
        this.factCheckEngine.clearCache(videoId);
        console.log('🗑️ Cleared cache for video:', videoId);
      } else {
        this.factCheckEngine.clearAllCache();
        console.log('🗑️ Cleared all cache');
      }
      sendResponse({ success: true });
    } catch (error) {
      console.error('Cache clear error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async notifyTabsOfSettingsUpdate(settings) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/watch*' });
      const notifications = tabs.map(tab => 
        chrome.tabs.sendMessage(tab.id, { 
          type: 'SETTINGS_UPDATED', 
          settings: settings 
        }).catch(() => {})
      );
      await Promise.allSettled(notifications);
    } catch (error) {
      console.error('Failed to notify tabs:', error);
    }
  }

  async notifyTabsOfExtensionToggle(enabled) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/watch*' });
      const notifications = tabs.map(tab => 
        chrome.tabs.sendMessage(tab.id, { 
          type: 'EXTENSION_TOGGLED', 
          enabled: enabled 
        }).catch(() => {})
      );
      await Promise.allSettled(notifications);
    } catch (error) {
      console.error('Failed to notify tabs of toggle:', error);
    }
  }
}