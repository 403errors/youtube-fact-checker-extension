// Advanced caching system with expiry management
export class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100;
    this.cacheExpiryTime = 1 * 60 * 60 * 1000; // 1 hour
  }

  generateKey(transcript, settings, contentType) {
    const content = transcript.substring(0, 1000) + 
                   settings.language + 
                   contentType + 
                   (settings.usePremiumModel ? 'premium' : 'lite') + 
                   (settings.strictMode ? 'strict' : 'normal') +
                   (settings.useGroundingSearch ? 'grounding' : 'nogrounding');
    
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fact_check_${Math.abs(hash)}_${contentType}_${settings.useGroundingSearch ? 'grounded' : 'knowledge'}`;
  }

  get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiryTime) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  set(key, data) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, { 
      data, 
      timestamp: Date.now(),
      contentType: data[0]?.contentType || 'general'
    });
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheExpiryTime) {
        this.cache.delete(key);
      }
    }
  }

  startCleanupTimer() {
    setInterval(() => this.cleanupExpired(), this.cacheExpiryTime);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      expiryTime: this.cacheExpiryTime
    };
  }
}