// Settings validation, storage, and management
export class SettingsManager {
  constructor() {
    this.defaults = {
      enabled: true,
      apiKey: '',
      language: 'en',
      usePremiumModel: true,
      useGroundingSearch: true,
      analysisTimeout: 45,
      cacheResults: true,
      maxCacheAge: 48,
      strictMode: true,
      confidenceThreshold: 70,
      stats: {
        videosChecked: 0,
        claimsFound: 0,
        accurateClaims: 0,
        lastUsed: null,
        installDate: Date.now()
      }
    };
  }

  async handleInstallation(details) {
    try {
      if (details.reason === 'install') {
        await chrome.storage.sync.set(this.defaults);
        console.log('Extension installed with default settings');
      } else if (details.reason === 'update') {
        await this.migrate();
      }
    } catch (error) {
      console.error('Installation error:', error);
    }
  }

  async migrate() {
    try {
      const settings = await chrome.storage.sync.get();
      let needsUpdate = false;
      
      for (const [key, defaultValue] of Object.entries(this.defaults)) {
        if (settings[key] === undefined) {
          settings[key] = defaultValue;
          needsUpdate = true;
        }
      }
      
      if (!settings.stats) {
        settings.stats = this.defaults.stats;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await chrome.storage.sync.set(settings);
        console.log('Settings migrated successfully');
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  async initializeDefaults() {
    try {
      const settings = await chrome.storage.sync.get();
      if (Object.keys(settings).length === 0) {
        await this.handleInstallation({ reason: 'install' });
      }
    } catch (error) {
      console.error('Failed to initialize defaults:', error);
    }
  }

  async getAll() {
    try {
      return await chrome.storage.sync.get();
    } catch (error) {
      console.error('Failed to get settings:', error);
      return this.defaults;
    }
  }

  async get(keys) {
    try {
      return await chrome.storage.sync.get(keys);
    } catch (error) {
      console.error('Failed to get specific settings:', error);
      return {};
    }
  }

  async save(newSettings) {
    try {
      const validatedSettings = this.validate(newSettings);
      const currentSettings = await this.getAll();
      const mergedSettings = { ...currentSettings, ...validatedSettings };
      
      await chrome.storage.sync.set(mergedSettings);
      return mergedSettings;
    } catch (error) {
      console.error('Save settings error:', error);
      throw error;
    }
  }

  async update(updates) {
    try {
      const currentSettings = await this.getAll();
      const mergedSettings = { ...currentSettings, ...updates };
      await chrome.storage.sync.set(mergedSettings);
      return mergedSettings;
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  }

  async reset() {
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      await chrome.storage.sync.set(this.defaults);
    } catch (error) {
      console.error('Reset settings error:', error);
      throw error;
    }
  }

  validate(settings) {
    const validated = {
      enabled: Boolean(settings.enabled),
      apiKey: String(settings.apiKey || '').trim(),
      language: String(settings.language || 'en'),
      usePremiumModel: Boolean(settings.usePremiumModel),
      useGroundingSearch: Boolean(settings.useGroundingSearch !== false),
      analysisTimeout: Math.max(30, Math.min(120, parseInt(settings.analysisTimeout) || 45)),
      cacheResults: settings.cacheResults !== false,
      maxCacheAge: Math.max(1, Math.min(168, parseInt(settings.maxCacheAge) || 48)),
      strictMode: Boolean(settings.strictMode !== false),
      confidenceThreshold: Math.max(50, Math.min(95, parseInt(settings.confidenceThreshold) || 70))
    };

    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];
    if (!validLanguages.includes(validated.language)) {
      validated.language = 'en';
    }

    return validated;
  }
}