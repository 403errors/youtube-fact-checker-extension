// TranscriptExtractor - Coordinates all transcript extraction methods
// Handles prioritization, caching, and fallback strategies

import { NetworkReplication } from './methods/NetworkReplication.js';
import { PlayerResponse } from './methods/PlayerResponse.js';
import { PageScripts } from './methods/PageScripts.js';
import { VideoTracks } from './methods/VideoTracks.js';
import { DirectAPI } from './methods/DirectAPI.js';
import { UIAutomation } from './methods/UIAutomation.js';
import { Cache } from '../utils/Cache.js';
import { Constants } from '../utils/Constants.js';

export class TranscriptExtractor {
  constructor() {
    this.cache = new Cache('transcript');
    this.isExtracting = false;
    
    // Initialize extraction methods in priority order
    this.methods = [
      new NetworkReplication(),
      new UIAutomation(),
      new PlayerResponse(),
      new PageScripts(),
      new VideoTracks(),
      new DirectAPI()
    ];
  }

  async extract(videoId) {
    if (!videoId) {
      console.error('No video ID provided for transcript extraction');
      return null;
    }

    // Check cache first
    const cacheKey = `transcript_${videoId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Using cached transcript for video:', videoId);
      return cached;
    }

    // Prevent concurrent extractions
    if (this.isExtracting) {
      console.log('Transcript extraction already in progress');
      return null;
    }

    this.isExtracting = true;
    console.log('🔍 Starting transcript extraction for video:', videoId);

    try {
      // Try each method in priority order
      for (let i = 0; i < this.methods.length; i++) {
        const method = this.methods[i];
        const methodName = method.constructor.name;
        
        console.log(`📋 Method ${i + 1}/${this.methods.length}: ${methodName}`);
        
        try {
          const transcript = await method.extract(videoId);
          
          if (this.isValidTranscript(transcript)) {
            console.log(`✅ SUCCESS with ${methodName}, length: ${transcript.length}`);
            this.cache.set(cacheKey, transcript);
            return transcript;
          } else {
            console.log(`❌ ${methodName} returned invalid transcript`);
          }
        } catch (error) {
          console.log(`❌ ${methodName} failed:`, error.message);
        }
      }

      console.log('❌ All transcript extraction methods failed');
      return null;

    } catch (error) {
      console.error('Transcript extraction error:', error);
      return null;
    } finally {
      this.isExtracting = false;
    }
  }

  isValidTranscript(transcript) {
    return transcript && 
           typeof transcript === 'string' && 
           transcript.trim().length >= Constants.MIN_TRANSCRIPT_LENGTH;
  }

  async testAllMethods(videoId) {
    console.log('🧪 Testing all transcript extraction methods...');
    const results = {};
    
    for (const method of this.methods) {
      const methodName = method.constructor.name;
      try {
        console.log(`Testing ${methodName}...`);
        const startTime = Date.now();
        const result = await method.extract(videoId);
        const duration = Date.now() - startTime;
        
        results[methodName] = {
          success: this.isValidTranscript(result),
          length: result?.length || 0,
          duration: duration,
          preview: result?.substring(0, 100) || 'No result'
        };
        
        console.log(`${methodName}: ${result ? '✅' : '❌'} (${result?.length || 0} chars, ${duration}ms)`);
      } catch (error) {
        results[methodName] = {
          success: false,
          error: error.message,
          duration: 0
        };
        console.log(`${methodName}: ❌ Error - ${error.message}`);
      }
    }
    
    console.table(results);
    return results;
  }

  clearCache(videoId) {
    const cacheKey = `transcript_${videoId}`;
    this.cache.delete(cacheKey);
  }

  getCacheInfo() {
    return {
      size: this.cache.size(),
      keys: this.cache.keys()
    };
  }

  // Priority method testing (for the most reliable method)
  async testPriorityMethod(videoId) {
    if (this.methods.length === 0) return null;
    
    const priorityMethod = this.methods[0];
    const methodName = priorityMethod.constructor.name;
    
    console.log(`🎯 Testing priority method: ${methodName}`);
    
    try {
      const result = await priorityMethod.extract(videoId);
      const success = this.isValidTranscript(result);
      
      console.log(`Priority method result:`, {
        success,
        length: result?.length || 0,
        preview: result?.substring(0, 200) || 'No result'
      });
      
      return result;
    } catch (error) {
      console.error(`Priority method ${methodName} failed:`, error);
      return null;
    }
  }
}