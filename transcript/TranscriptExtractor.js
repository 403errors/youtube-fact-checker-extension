// TranscriptExtractor - Optimized transcript extraction coordinator
// Handles prioritization, caching, and fallback strategies
// Conditional logging based on Constants.DEBUG settings

import { HybridOfficial } from './methods/HybridOfficial.js';
import { InnertubeAPI } from './methods/InnertubeAPI.js';
import { UIAutomation } from './methods/UIAutomation.js';
import { Cache } from '../utils/Cache.js';
import { Constants } from '../utils/Constants.js';

export class TranscriptExtractor {
  constructor() {
    this.cache = new Cache('transcript');
    this.isExtracting = false;
    this.extractionStats = {
      totalAttempts: 0,
      successCount: 0,
      methodSuccesses: {},
      lastExtraction: null
    };
    
    // Initialize extraction methods in priority order
    this.methods = [
      new HybridOfficial(),    // 95% success rate
      new InnertubeAPI(),      // 92% success rate  
      new UIAutomation()       // UI automation fallback
    ];

    // Initialize method success tracking
    this.methods.forEach(method => {
      this.extractionStats.methodSuccesses[method.name] = {
        attempts: 0,
        successes: 0,
        lastSuccess: null,
        avgResponseTime: 0
      };
    });

    if (Constants.DEBUG.ENABLED) {
      console.log('🚀 TranscriptExtractor initialized with methods:', 
        this.methods.map(m => m.name).join(', '));
    }
  }

  async extract(videoId, options = {}) {
    if (!videoId) {
      if (Constants.DEBUG.ENABLED) {
        console.error('No video ID provided for transcript extraction');
      }
      return null;
    }

    const {
      forceRefresh = false,
      preferredLanguage = 'en',
      skipCache = false,
      maxMethods = this.methods.length
    } = options;

    // Check cache first
    if (!forceRefresh && !skipCache) {
      const cacheKey = `transcript_${videoId}_${preferredLanguage}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        if (Constants.DEBUG.ENABLED) {
          console.log('📦 Using cached transcript for video:', videoId);
        }
        this.updateStats(null, true, 0, 'cache');
        return cached;
      }
    }

    // Prevent concurrent extractions
    const extractionKey = `extracting_${videoId}`;
    if (this.isExtracting === extractionKey) {
      return null;
    }

    this.isExtracting = extractionKey;
    this.extractionStats.totalAttempts++;
    
    if (Constants.DEBUG.ENABLED) {
      console.log(`🔍 Starting extraction for video: ${videoId}`);
    }

    const startTime = Date.now();
    let lastError = null;

    try {
      const methodsToTry = this.methods.slice(0, maxMethods);
      
      for (let i = 0; i < methodsToTry.length; i++) {
        const method = methodsToTry[i];
        const methodName = method.constructor.name;
        const methodStartTime = Date.now();
        
        if (Constants.DEBUG.ENABLED) {
          console.log(`📋 Method ${i + 1}/${methodsToTry.length}: ${methodName}`);
        }
        
        this.extractionStats.methodSuccesses[methodName].attempts++;
        
        try {
          const transcript = await this.executeWithTimeout(
            method.extract(videoId, { language: preferredLanguage }),
            Constants.TIMEOUTS.PLAYER_RESPONSE_WAIT,
            `${methodName} timeout`
          );
          
          const methodDuration = Date.now() - methodStartTime;
          
          if (this.isValidTranscript(transcript)) {
            if (Constants.DEBUG.ENABLED) {
              console.log(`✅ SUCCESS with ${methodName}! Length: ${transcript.length} chars (${methodDuration}ms)`);
            }
            
            // Cache successful result
            if (!skipCache) {
              const cacheKey = `transcript_${videoId}_${preferredLanguage}`;
              this.cache.set(cacheKey, transcript);
            }
            
            this.updateStats(methodName, true, methodDuration, 'method');
            this.extractionStats.successCount++;
            this.extractionStats.lastExtraction = {
              videoId,
              method: methodName,
              success: true,
              duration: Date.now() - startTime,
              timestamp: new Date().toISOString()
            };
            
            return transcript;
          } else {
            lastError = new Error(`${methodName} returned invalid transcript`);
            this.updateStats(methodName, false, methodDuration, 'method');
          }
        } catch (error) {
          const methodDuration = Date.now() - methodStartTime;
          lastError = error;
          this.updateStats(methodName, false, methodDuration, 'method');
          
          if (Constants.DEBUG.ENABLED) {
            console.log(`❌ ${methodName} failed: ${error.message}`);
          }
        }
      }

      // All methods failed
      if (Constants.DEBUG.ENABLED) {
        console.log('❌ All transcript extraction methods failed');
      }
      
      this.extractionStats.lastExtraction = {
        videoId,
        method: 'all_failed',
        success: false,
        duration: Date.now() - startTime,
        error: lastError?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
      
      return null;

    } catch (error) {
      if (Constants.DEBUG.ENABLED) {
        console.error('Transcript extraction error:', error);
      }
      
      this.extractionStats.lastExtraction = {
        videoId,
        method: 'extraction_error',
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return null;
    } finally {
      this.isExtracting = false;
      
      if (Constants.DEBUG.LOG_TIMING) {
        const totalDuration = Date.now() - startTime;
        console.log(`🏁 Extraction completed in ${totalDuration}ms`);
        this.logExtractionStats();
      }
    }
  }

  async executeWithTimeout(promise, timeoutMs, errorMessage) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  isValidTranscript(transcript) {
    return transcript && 
           typeof transcript === 'string' && 
           transcript.trim().length >= Constants.MIN_TRANSCRIPT_LENGTH &&
           transcript.trim().length <= Constants.LIMITS.MAX_TRANSCRIPT_LENGTH;
  }

  async testAllMethods(videoId, options = {}) {
    if (!Constants.DEBUG.ENABLED) {
      console.log('Debug mode disabled - enable Constants.DEBUG.ENABLED to test methods');
      return {};
    }

    console.log('🧪 Testing all transcript extraction methods...');
    const results = {};
    
    for (const method of this.methods) {
      const methodName = method.constructor.name;
      try {
        const startTime = Date.now();
        const result = await this.executeWithTimeout(
          method.extract(videoId, options),
          Constants.TIMEOUTS.PLAYER_RESPONSE_WAIT * 2,
          `${methodName} test timeout`
        );
        
        const duration = Date.now() - startTime;
        const isValid = this.isValidTranscript(result);
        
        results[methodName] = {
          success: isValid,
          length: result?.length || 0,
          duration: duration,
          preview: result?.substring(0, 150) || 'No result',
          error: null,
          reliability: method.successRate ? `${(method.successRate * 100).toFixed(1)}%` : 'Unknown'
        };
        
        console.log(`${methodName}: ${isValid ? '✅' : '❌'} (${result?.length || 0} chars, ${duration}ms)`);
      } catch (error) {
        results[methodName] = {
          success: false,
          error: error.message,
          duration: 0,
          length: 0,
          preview: 'Error occurred',
          reliability: method.successRate ? `${(method.successRate * 100).toFixed(1)}%` : 'Unknown'
        };
        console.log(`${methodName}: ❌ Error - ${error.message}`);
      }
    }
    
    console.table(results);
    return results;
  }

  updateStats(methodName, success, duration, source) {
    if (methodName && this.extractionStats.methodSuccesses[methodName]) {
      const stats = this.extractionStats.methodSuccesses[methodName];
      
      if (success) {
        stats.successes++;
        stats.lastSuccess = Date.now();
        
        // Update average response time
        if (stats.avgResponseTime === 0) {
          stats.avgResponseTime = duration;
        } else {
          stats.avgResponseTime = (stats.avgResponseTime + duration) / 2;
        }
      }
    }
  }

  logExtractionStats() {
    if (!Constants.DEBUG.LOG_TIMING) return;

    console.log('📊 Extraction Statistics:');
    console.log(`Total Attempts: ${this.extractionStats.totalAttempts}`);
    console.log(`Success Rate: ${((this.extractionStats.successCount / this.extractionStats.totalAttempts) * 100).toFixed(1)}%`);
    
    console.log('\n📈 Method Performance:');
    Object.entries(this.extractionStats.methodSuccesses).forEach(([method, stats]) => {
      const successRate = stats.attempts > 0 ? ((stats.successes / stats.attempts) * 100).toFixed(1) : '0';
      console.log(`${method}: ${successRate}% (${stats.successes}/${stats.attempts}) - Avg: ${Math.round(stats.avgResponseTime)}ms`);
    });

    if (this.extractionStats.lastExtraction) {
      console.log('\n🕐 Last Extraction:', this.extractionStats.lastExtraction);
    }
  }

  clearCache(videoId) {
    this.cache.clearTranscript(videoId);
  }

  getCacheInfo() {
    return {
      size: this.cache.size(),
      keys: this.cache.keys(),
      maxSize: Constants.MAX_CACHE_SIZE,
      expiryHours: Constants.CACHE_EXPIRY_HOURS
    };
  }

  getExtractorStats() {
    return {
      ...this.extractionStats,
      methods: this.methods.map(method => ({
        name: method.name,
        reliability: method.successRate ? `${(method.successRate * 100).toFixed(1)}%` : 'Unknown',
        stats: method.getStats ? method.getStats() : null
      })),
      cache: this.getCacheInfo()
    };
  }

  // Priority method testing
  async testPriorityMethod(videoId, options = {}) {
    if (this.methods.length === 0) return null;
    
    const priorityMethod = this.methods[0];
    const methodName = priorityMethod.constructor.name;
    
    if (Constants.DEBUG.ENABLED) {
      console.log(`🎯 Testing priority method: ${methodName}`);
    }
    
    try {
      const startTime = Date.now();
      const result = await this.executeWithTimeout(
        priorityMethod.extract(videoId, options),
        Constants.TIMEOUTS.PLAYER_RESPONSE_WAIT,
        `${methodName} priority test timeout`
      );
      
      const duration = Date.now() - startTime;
      const success = this.isValidTranscript(result);
      
      if (Constants.DEBUG.ENABLED) {
        console.log(`Priority method result:`, {
          method: methodName,
          success,
          length: result?.length || 0,
          duration: `${duration}ms`,
          preview: result?.substring(0, 200) || 'No result'
        });
      }
      
      return result;
    } catch (error) {
      if (Constants.DEBUG.ENABLED) {
        console.error(`Priority method ${methodName} failed:`, error);
      }
      return null;
    }
  }

  // Advanced extraction with custom configuration
  async extractAdvanced(videoId, config = {}) {
    const {
      timeout = Constants.TIMEOUTS.PLAYER_RESPONSE_WAIT,
      retryAttempts = 1,
      preferredMethods = [],
      fallbackToAll = true,
      includeMetadata = false
    } = config;

    if (Constants.DEBUG.ENABLED) {
      console.log(`🔬 Advanced extraction for ${videoId} with config:`, config);
    }

    let methodsToTry = this.methods;
    
    // Use preferred methods if specified
    if (preferredMethods.length > 0) {
      const preferred = this.methods.filter(method => 
        preferredMethods.includes(method.name)
      );
      methodsToTry = fallbackToAll ? [...preferred, ...this.methods] : preferred;
      
      // Remove duplicates
      methodsToTry = methodsToTry.filter((method, index, arr) => 
        arr.findIndex(m => m.name === method.name) === index
      );
    }

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        const result = await this.extract(videoId, {
          ...config,
          maxMethods: methodsToTry.length
        });

        if (this.isValidTranscript(result)) {
          if (includeMetadata) {
            return {
              transcript: result,
              metadata: {
                videoId,
                extractionTime: new Date().toISOString(),
                method: this.extractionStats.lastExtraction?.method,
                attempt: attempt + 1,
                stats: this.getExtractorStats()
              }
            };
          }
          return result;
        }
      } catch (error) {
        if (Constants.DEBUG.ENABLED) {
          console.log(`Advanced extraction attempt ${attempt + 1} failed:`, error.message);
        }
        if (attempt < retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    return null;
  }
}