// Cache.js - Optimized in-memory caching utility
// Provides caching functionality with size limits and expiration
// Removed excessive logging for production performance

export class Cache {
  constructor(prefix = 'cache', maxSize = 5, expiryHours = 24) {
    this.prefix = prefix;
    this.maxSize = maxSize;
    this.expiryMs = expiryHours * 60 * 60 * 1000;
    this.data = new Map();
    this.debug = false; // Set to true only for debugging
  }

  // Generate cache key with prefix
  getKey(key) {
    return `${this.prefix}_${key}`;
  }

  // Set value in cache
  set(key, value) {
    const cacheKey = this.getKey(key);
    const entry = {
      value,
      timestamp: Date.now(),
      expires: Date.now() + this.expiryMs
    };

    // Remove expired entries first
    this.cleanExpired();

    // If at max size, remove oldest entry
    if (this.data.size >= this.maxSize) {
      const oldestKey = this.data.keys().next().value;
      this.data.delete(oldestKey);
    }

    this.data.set(cacheKey, entry);
    
    if (this.debug) {
      console.log(`Cache: Set ${cacheKey}, cache size: ${this.data.size}`);
    }
  }

  // Get value from cache
  get(key) {
    const cacheKey = this.getKey(key);
    const entry = this.data.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.data.delete(cacheKey);
      return null;
    }

    return entry.value;
  }

  // Check if key exists and is valid
  has(key) {
    const cacheKey = this.getKey(key);
    const entry = this.data.get(cacheKey);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.data.delete(cacheKey);
      return false;
    }

    return true;
  }

  // Delete specific key
  delete(key) {
    const cacheKey = this.getKey(key);
    return this.data.delete(cacheKey);
  }

  // Clear all cache
  clear() {
    this.data.clear();
  }

  // Remove expired entries
  cleanExpired() {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.data.entries()) {
      if (now > entry.expires) {
        this.data.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  // Get cache size
  size() {
    this.cleanExpired(); // Clean first
    return this.data.size;
  }

  // Get all keys (without prefix)
  keys() {
    this.cleanExpired();
    return Array.from(this.data.keys()).map(key => 
      key.startsWith(this.prefix + '_') ? key.substring(this.prefix.length + 1) : key
    );
  }

  // Get all values
  values() {
    this.cleanExpired();
    return Array.from(this.data.values()).map(entry => entry.value);
  }

  // Get cache statistics
  getStats() {
    this.cleanExpired();
    
    const entries = Array.from(this.data.values());
    const now = Date.now();
    
    return {
      size: this.data.size,
      maxSize: this.maxSize,
      prefix: this.prefix,
      expiryHours: this.expiryMs / (60 * 60 * 1000),
      oldestEntry: entries.length > 0 ? 
        Math.min(...entries.map(e => e.timestamp)) : null,
      newestEntry: entries.length > 0 ? 
        Math.max(...entries.map(e => e.timestamp)) : null,
      entriesExpiringSoon: entries.filter(e => 
        e.expires - now < 60 * 60 * 1000 // Expiring in 1 hour
      ).length
    };
  }

  // Get entry info for specific key
  getEntryInfo(key) {
    const cacheKey = this.getKey(key);
    const entry = this.data.get(cacheKey);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    return {
      key: key,
      timestamp: entry.timestamp,
      expires: entry.expires,
      age: now - entry.timestamp,
      timeToExpiry: entry.expires - now,
      isExpired: now > entry.expires,
      size: this.estimateSize(entry.value)
    };
  }

  // Estimate size of cached value
  estimateSize(value) {
    if (typeof value === 'string') {
      return value.length;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value).length;
    }
    return 1; // Fallback for other types
  }

  // Set custom expiry for specific entry
  setWithCustomExpiry(key, value, expiryMs) {
    const cacheKey = this.getKey(key);
    const entry = {
      value,
      timestamp: Date.now(),
      expires: Date.now() + expiryMs
    };

    this.cleanExpired();

    if (this.data.size >= this.maxSize) {
      const oldestKey = this.data.keys().next().value;
      this.data.delete(oldestKey);
    }

    this.data.set(cacheKey, entry);
  }

  // Touch entry to refresh its expiry
  touch(key) {
    const cacheKey = this.getKey(key);
    const entry = this.data.get(cacheKey);
    
    if (entry && Date.now() <= entry.expires) {
      entry.expires = Date.now() + this.expiryMs;
      return true;
    }
    
    return false;
  }

  // Clear cache for specific video (transcript-specific utility)
  clearTranscript(videoId) {
    if (videoId) {
      const keys = this.keys().filter(key => key.includes(videoId));
      keys.forEach(key => this.delete(key));
      
      if (this.debug && keys.length > 0) {
        console.log(`Cache: Cleared ${keys.length} entries for video: ${videoId}`);
      }
    } else {
      this.clear();
      
      if (this.debug) {
        console.log('Cache: Cleared all entries');
      }
    }
  }

  // Enable/disable debug logging
  setDebug(enabled) {
    this.debug = Boolean(enabled);
  }

  // Debug: List all entries with details (only when debug enabled)
  debugList() {
    if (!this.debug) return;
    
    this.cleanExpired();
    console.log(`Cache Debug - Prefix: ${this.prefix}, Size: ${this.data.size}/${this.maxSize}`);
    
    for (const [key, entry] of this.data.entries()) {
      const now = Date.now();
      const cleanKey = key.startsWith(this.prefix + '_') ? 
        key.substring(this.prefix.length + 1) : key;
      
      console.log(`  ${cleanKey}:`, {
        age: `${Math.round((now - entry.timestamp) / 1000)}s`,
        expires: `${Math.round((entry.expires - now) / 1000)}s`,
        size: this.estimateSize(entry.value)
      });
    }
  }
}