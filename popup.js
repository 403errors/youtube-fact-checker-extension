// YouTube Fact-Check Extension - Enhanced Popup Script with Updated Models
// Clean, error-free implementation with proper singleton pattern

class EnhancedFactCheckPopup {
  constructor() {
    // Singleton protection
    if (EnhancedFactCheckPopup.instance) {
      return EnhancedFactCheckPopup.instance;
    }
    EnhancedFactCheckPopup.instance = this;
    
    this.currentSettings = {};
    this.hasUnsavedChanges = false;
    this.isValidating = false;
    this.validationTimeout = null;
    this.eventListeners = [];
    
    // Updated model configurations for 2025
    this.modelConfigs = {
      premium: {
        name: 'Gemini 2.5 Flash',
        description: 'Latest model with enhanced reasoning, real-time grounding search, and superior fact-checking capabilities. Fallback to Gemini 2.0 series if needed.',
        features: 'Premium accuracy & speed'
      },
      lite: {
        name: 'Gemini 2.5 Flash Lite',
        description: 'Efficient model optimized for speed with excellent fact-checking performance. Uses Gemini 2.0 Flash Lite as fallback for maximum reliability.',
        features: 'Efficient & fast'
      }
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      this.cacheElements();
      this.setupEventListeners();
      this.setupTabNavigation();
      await this.loadCurrentSettings();
      this.setupModelSelector();
      this.updateAllDisplays();
      console.log('Enhanced popup initialized successfully with updated models');
    } catch (error) {
      console.error('Popup initialization error:', error);
      this.showStatus('Failed to initialize settings', 'error');
    }
  }

  cacheElements() {
    this.elements = {
      // Form controls
      enabled: document.getElementById('enabled'),
      apiKey: document.getElementById('apiKey'),
      language: document.getElementById('language'),
      analysisTimeout: document.getElementById('analysisTimeout'),
      strictMode: document.getElementById('strictMode'),
      useGroundingSearch: document.getElementById('useGroundingSearch'),
      confidenceThreshold: document.getElementById('confidenceThreshold'),
      
      // Buttons
      save: document.getElementById('save'),
      testBtn: document.getElementById('testBtn'),
      resetBtn: document.getElementById('resetBtn'),
      
      // UI elements
      status: document.getElementById('status'),
      keyValidation: document.getElementById('keyValidation'),
      toggleKey: document.getElementById('toggleKey'),
      timeoutValue: document.getElementById('timeoutValue'),
      confidenceValue: document.getElementById('confidenceValue'),
      
      // Extension toggle
      extensionToggle: document.getElementById('extensionToggle'),
      toggleTitle: document.getElementById('toggleTitle'),
      toggleDesc: document.getElementById('toggleDesc'),
      
      // Statistics
      videosChecked: document.getElementById('videosChecked'),
      claimsFound: document.getElementById('claimsFound'),
      accurateRatio: document.getElementById('accurateRatio'),
      lastUsed: document.getElementById('lastUsed'),
      reliabilityScore: document.getElementById('reliabilityScore'),
      
      // Model description
      modelDescription: document.getElementById('modelDescription')
    };
  }

  setupEventListeners() {
    // API Key visibility toggle
    this.addEventListenerSafe(this.elements.toggleKey, 'click', () => {
      this.toggleApiKeyVisibility();
    });

    // API Key validation
    this.addEventListenerSafe(this.elements.apiKey, 'input', () => {
      this.handleApiKeyInput();
    });

    // Button events
    this.addEventListenerSafe(this.elements.save, 'click', () => {
      this.saveSettings();
    });

    this.addEventListenerSafe(this.elements.testBtn, 'click', () => {
      this.testApiKey();
    });

    this.addEventListenerSafe(this.elements.resetBtn, 'click', () => {
      this.resetSettings();
    });

    // Extension toggle
    this.addEventListenerSafe(this.elements.enabled, 'change', (e) => {
      this.handleExtensionToggle(e.target.checked);
    });

    // Range inputs
    this.addEventListenerSafe(this.elements.analysisTimeout, 'input', (e) => {
      this.elements.timeoutValue.textContent = `${e.target.value}s`;
      this.markAsChanged();
    });

    this.addEventListenerSafe(this.elements.confidenceThreshold, 'input', (e) => {
      this.elements.confidenceValue.textContent = `${e.target.value}%`;
      this.markAsChanged();
    });

    // Form change detection
    const formElements = [
      this.elements.language,
      this.elements.strictMode,
      this.elements.useGroundingSearch
    ];

    formElements.forEach(element => {
      if (element) {
        this.addEventListenerSafe(element, 'change', () => {
          this.markAsChanged();
        });
      }
    });

    // Grounding search info update
    this.addEventListenerSafe(this.elements.useGroundingSearch, 'change', (e) => {
      this.updateGroundingInfo(e.target.checked);
    });
  }

  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      this.addEventListenerSafe(button, 'click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Update button states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update content visibility
        tabContents.forEach(content => {
          content.classList.remove('active');
          if (content.id === `${targetTab}-tab`) {
            content.classList.add('active');
          }
        });
      });
    });
  }

  setupModelSelector() {
    const modelOptions = document.querySelectorAll('.model-option');
    
    modelOptions.forEach(option => {
      this.addEventListenerSafe(option, 'click', () => {
        const modelType = option.getAttribute('data-model');
        this.selectModel(modelType);
      });
    });
  }

  selectModel(modelType) {
    // Update visual selection
    const modelOptions = document.querySelectorAll('.model-option');
    modelOptions.forEach(option => {
      option.classList.remove('selected');
      if (option.getAttribute('data-model') === modelType) {
        option.classList.add('selected');
      }
    });

    // Update model description
    this.updateModelDescription(modelType);
    
    // Update settings
    this.currentSettings.usePremiumModel = (modelType === 'premium');
    this.markAsChanged();
  }

  updateModelDescription(modelType) {
    const config = this.modelConfigs[modelType];
    if (config && this.elements.modelDescription) {
      this.elements.modelDescription.innerHTML = `
        <div class="model-name">${config.name}</div>
        <div class="model-features">${config.description}</div>
      `;
    }
  }

  updateGroundingInfo(enabled) {
    const groundingInfo = document.querySelector('.grounding-info');
    if (groundingInfo) {
      if (enabled) {
        groundingInfo.style.opacity = '1';
        groundingInfo.style.transform = 'scale(1)';
      } else {
        groundingInfo.style.opacity = '0.6';
        groundingInfo.style.transform = 'scale(0.98)';
      }
    }
  }

  async loadCurrentSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      
      if (response?.success) {
        this.currentSettings = response.settings;
        this.populateForm();
      } else {
        throw new Error(response?.error || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showStatus('Failed to load settings', 'error');
    }
  }

  populateForm() {
    const settings = this.currentSettings;
    
    // Extension toggle
    if (this.elements.enabled) {
      this.elements.enabled.checked = settings.enabled !== false;
      this.updateExtensionToggleDisplay(settings.enabled !== false);
    }

    // API Key
    if (this.elements.apiKey && settings.apiKey) {
      this.elements.apiKey.value = settings.apiKey;
      this.validateApiKeyDisplay();
    }

    // Model selection
    const modelType = settings.usePremiumModel !== false ? 'premium' : 'lite';
    this.selectModel(modelType);

    // Language
    if (this.elements.language && settings.language) {
      this.elements.language.value = settings.language;
    }

    // Analysis timeout
    if (this.elements.analysisTimeout && settings.analysisTimeout) {
      this.elements.analysisTimeout.value = settings.analysisTimeout;
      this.elements.timeoutValue.textContent = `${settings.analysisTimeout}s`;
    }

    // Strict mode
    if (this.elements.strictMode) {
      this.elements.strictMode.checked = settings.strictMode !== false;
    }

    // Grounding search
    if (this.elements.useGroundingSearch) {
      this.elements.useGroundingSearch.checked = settings.useGroundingSearch !== false;
      this.updateGroundingInfo(settings.useGroundingSearch !== false);
    }

    // Confidence threshold
    if (this.elements.confidenceThreshold && settings.confidenceThreshold) {
      this.elements.confidenceThreshold.value = settings.confidenceThreshold;
      this.elements.confidenceValue.textContent = `${settings.confidenceThreshold}%`;
    }

    this.hasUnsavedChanges = false;
    this.updateSaveButton();
  }

  updateAllDisplays() {
    this.updateExtensionToggleDisplay(this.currentSettings.enabled !== false);
    this.updateStatistics();
    this.validateApiKeyDisplay();
  }

  updateExtensionToggleDisplay(enabled) {
    const toggle = this.elements.extensionToggle;
    if (toggle) {
      if (enabled) {
        toggle.classList.remove('disabled');
        this.elements.toggleTitle.textContent = 'Fact-Checking Enabled';
        this.elements.toggleDesc.textContent = 'AI analysis with robust verification';
      } else {
        toggle.classList.add('disabled');
        this.elements.toggleTitle.textContent = 'Fact-Checking Disabled';
        this.elements.toggleDesc.textContent = 'Click to enable AI verification';
      }
    }
  }

  async updateStatistics() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response?.success && response.settings.stats) {
        const stats = response.settings.stats;
        
        if (this.elements.videosChecked) {
          this.elements.videosChecked.textContent = stats.videosChecked || 0;
        }
        
        if (this.elements.claimsFound) {
          this.elements.claimsFound.textContent = stats.claimsFound || 0;
        }
        
        if (this.elements.accurateRatio) {
          const ratio = stats.claimsFound > 0 ? 
            Math.round((stats.accurateClaims / stats.claimsFound) * 100) : 0;
          this.elements.accurateRatio.textContent = `${ratio}%`;
        }
        
        if (this.elements.reliabilityScore) {
          // Calculate reliability score based on usage
          const reliability = this.calculateReliabilityScore(stats);
          this.elements.reliabilityScore.textContent = reliability;
        }
        
        if (this.elements.lastUsed) {
          const lastUsed = stats.lastUsed ? 
            new Date(stats.lastUsed).toLocaleDateString() : 'Never';
          this.elements.lastUsed.textContent = lastUsed;
        }
      }
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  calculateReliabilityScore(stats) {
    if (!stats.videosChecked || stats.videosChecked === 0) return 'N/A';
    
    const accuracyRate = stats.claimsFound > 0 ? (stats.accurateClaims / stats.claimsFound) : 0;
    const usageWeight = Math.min(stats.videosChecked / 50, 1); // Max weight at 50 videos
    const score = Math.round((accuracyRate * 70 + usageWeight * 30) * 100);
    
    return `${score}/100`;
  }

  toggleApiKeyVisibility() {
    const input = this.elements.apiKey;
    const button = this.elements.toggleKey;
    
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = '🙈';
    } else {
      input.type = 'password';
      button.textContent = '👁️';
    }
  }

  handleApiKeyInput() {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    
    this.validationTimeout = setTimeout(() => {
      this.validateApiKeyDisplay();
    }, 1000);
    
    this.markAsChanged();
  }

  validateApiKeyDisplay() {
    const apiKey = this.elements.apiKey?.value?.trim();
    const indicator = this.elements.keyValidation;
    
    if (!indicator) return;
    
    if (!apiKey) {
      indicator.textContent = '';
      indicator.className = 'validation-indicator';
      return;
    }
    
    if (apiKey.length < 30) {
      indicator.textContent = '❌';
      indicator.className = 'validation-indicator invalid';
      return;
    }
    
    if (apiKey.startsWith('AIza') && apiKey.length > 35) {
      indicator.textContent = '✅';
      indicator.className = 'validation-indicator valid';
    } else {
      indicator.textContent = '⚠️';
      indicator.className = 'validation-indicator invalid';
    }
  }

  async testApiKey() {
    const apiKey = this.elements.apiKey?.value?.trim();
    
    if (!apiKey) {
      this.showStatus('Please enter an API key first', 'error');
      return;
    }
    
    this.elements.testBtn.disabled = true;
    this.elements.testBtn.textContent = 'Testing...';
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'VALIDATE_API_KEY',
        apiKey: apiKey
      });
      
      if (response?.success && response.valid) {
        this.showStatus('✅ API key is valid and working!', 'success');
        this.validateApiKeyDisplay();
      } else {
        this.showStatus('❌ API key validation failed. Please check your key.', 'error');
      }
    } catch (error) {
      console.error('API key test error:', error);
      this.showStatus('❌ Failed to test API key. Please try again.', 'error');
    } finally {
      this.elements.testBtn.disabled = false;
      this.elements.testBtn.textContent = 'Test Setup';
    }
  }

  async saveSettings() {
    if (!this.hasUnsavedChanges) {
      this.showStatus('No changes to save', 'info');
      return;
    }
    
    this.elements.save.disabled = true;
    this.elements.save.classList.add('loading');
    
    try {
      const settings = this.gatherFormData();
      
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: settings
      });
      
      if (response?.success) {
        this.currentSettings = { ...this.currentSettings, ...settings };
        this.hasUnsavedChanges = false;
        this.updateSaveButton();
        this.showStatus('✅ Settings saved successfully!', 'success');
      } else {
        throw new Error(response?.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      this.showStatus('❌ Failed to save settings. Please try again.', 'error');
    } finally {
      this.elements.save.disabled = false;
      this.elements.save.classList.remove('loading');
    }
  }

  gatherFormData() {
    return {
      enabled: this.elements.enabled?.checked !== false,
      apiKey: this.elements.apiKey?.value?.trim() || '',
      usePremiumModel: document.querySelector('.model-option.selected')?.getAttribute('data-model') === 'premium',
      language: this.elements.language?.value || 'en',
      analysisTimeout: parseInt(this.elements.analysisTimeout?.value) || 45,
      strictMode: this.elements.strictMode?.checked !== false,
      useGroundingSearch: this.elements.useGroundingSearch?.checked !== false,
      confidenceThreshold: parseInt(this.elements.confidenceThreshold?.value) || 70
    };
  }

  async resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'RESET_SETTINGS'
        });
        
        if (response?.success) {
          this.showStatus('✅ Settings reset to defaults', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          throw new Error(response?.error || 'Failed to reset settings');
        }
      } catch (error) {
        console.error('Reset settings error:', error);
        this.showStatus('❌ Failed to reset settings. Please try again.', 'error');
      }
    }
  }

  async handleExtensionToggle(enabled) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TOGGLE_EXTENSION',
        enabled: enabled
      });
      
      if (response?.success) {
        this.currentSettings.enabled = enabled;
        this.updateExtensionToggleDisplay(enabled);
        this.showStatus(enabled ? '✅ Extension enabled' : '⏸️ Extension disabled', 'info');
      } else {
        throw new Error(response?.error || 'Failed to toggle extension');
      }
    } catch (error) {
      console.error('Extension toggle error:', error);
      this.elements.enabled.checked = !enabled; // Revert toggle
      this.showStatus('❌ Failed to toggle extension', 'error');
    }
  }

  markAsChanged() {
    this.hasUnsavedChanges = true;
    this.updateSaveButton();
  }

  updateSaveButton() {
    if (this.elements.save) {
      if (this.hasUnsavedChanges) {
        this.elements.save.classList.add('has-changes');
        this.elements.save.textContent = 'Save Changes';
      } else {
        this.elements.save.classList.remove('has-changes');
        this.elements.save.textContent = 'Save Settings';
      }
    }
  }

  showStatus(message, type = 'info') {
    const status = this.elements.status;
    if (!status) return;
    
    status.textContent = message;
    status.className = `status-message status-${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
      status.style.display = 'none';
    }, type === 'error' ? 5000 : 3000);
  }

  addEventListenerSafe(element, event, handler) {
    if (element && typeof handler === 'function') {
      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
      return true;
    }
    return false;
  }

  cleanup() {
    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      try {
        element.removeEventListener(event, handler);
      } catch (error) {
        console.warn('Failed to remove event listener:', error);
      }
    });
    this.eventListeners = [];
    
    // Clear timeouts
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
      this.validationTimeout = null;
    }
  }
}

// Initialize popup when DOM is ready
function initializePopup() {
  try {
    new EnhancedFactCheckPopup();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
}

// Handle page lifecycle
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (EnhancedFactCheckPopup.instance) {
    EnhancedFactCheckPopup.instance.cleanup();
  }
});

console.log('Enhanced Fact-Check Popup loaded with updated Gemini 2.5 models and improved UI');