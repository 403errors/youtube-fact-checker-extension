// HybridOfficial.js - Optimized Hybrid Official/Unofficial Approach
// Combines YouTube Data API with Innertube fallback for maximum reliability
// Conditional logging for production performance

import { Constants } from '../../utils/Constants.js';

export class HybridOfficial {
  constructor() {
    this.name = 'HybridOfficial';
    this.successRate = 0.95;
    this.rateLimiter = new RateLimiter();
    this.authToken = null;
    this.apiKey = null;
    this.setupAuth();
  }

  async extract(videoId) {
    if (Constants.DEBUG.ENABLED) {
      console.log(`🌟 Starting Hybrid Official extraction for video: ${videoId}`);
    }
    
    try {
      // Method 1: Try Official YouTube Data API (if authenticated)
      if (this.canUseOfficialAPI()) {
        try {
          if (Constants.DEBUG.ENABLED) {
            console.log('🔑 Attempting official YouTube Data API...');
          }
          
          const officialResult = await this.extractViaOfficial(videoId);
          if (this.isValidTranscript(officialResult)) {
            if (Constants.DEBUG.ENABLED) {
              console.log(`✅ SUCCESS via Official API, length: ${officialResult.length}`);
            }
            return officialResult;
          }
        } catch (error) {
          if (Constants.DEBUG.ENABLED) {
            console.log('⚠️ Official API failed, trying fallback:', error.message);
          }
        }
      }

      // Method 2: Fallback to Innertube API
      if (this.rateLimiter.canMakeRequest()) {
        try {
          if (Constants.DEBUG.ENABLED) {
            console.log('🔄 Fallback to Innertube API...');
          }
          
          const innertubeResult = await this.extractViaInnertube(videoId);
          this.rateLimiter.recordRequest();
          
          if (this.isValidTranscript(innertubeResult)) {
            if (Constants.DEBUG.ENABLED) {
              console.log(`✅ SUCCESS via Innertube fallback, length: ${innertubeResult.length}`);
            }
            return innertubeResult;
          }
        } catch (error) {
          if (Constants.DEBUG.ENABLED) {
            console.error('❌ Innertube API also failed:', error);
          }
          throw new Error(`All extraction methods failed: ${error.message}`);
        }
      } else {
        throw new Error('Rate limit exceeded, please try again later');
      }

      throw new Error('No valid transcript found with any method');

    } catch (error) {
      if (Constants.DEBUG.ENABLED) {
        console.error(`❌ Hybrid Official extraction failed: ${error.message}`);
      }
      throw error;
    }
  }

  async setupAuth() {
    // Try to extract API key from current page
    try {
      this.apiKey = await this.extractAPIKeyFromPage();
      if (this.apiKey && Constants.DEBUG.ENABLED) {
        console.log('🔑 API key extracted from page');
      }
    } catch (error) {
      // Silent failure for API key extraction
    }

    // Try to get OAuth token (if extension has permissions)
    if (typeof chrome !== 'undefined' && chrome.identity) {
      try {
        chrome.identity.getAuthToken({ 
          interactive: false 
        }, (token) => {
          if (chrome.runtime.lastError) {
            // Silent failure for OAuth
          } else if (token) {
            this.authToken = token;
            if (Constants.DEBUG.ENABLED) {
              console.log('🔐 OAuth token obtained for official API');
            }
          }
        });
      } catch (error) {
        // Silent failure for OAuth setup
      }
    }
  }

  canUseOfficialAPI() {
    return (this.authToken || this.apiKey) && this.rateLimiter.canMakeRequest();
  }

  async extractViaOfficial(videoId) {
    const headers = {};
    let apiUrl;

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      apiUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`;
    } else if (this.apiKey) {
      apiUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${this.apiKey}`;
    } else {
      throw new Error('No authentication method available');
    }

    // Get captions list
    const listResponse = await fetch(apiUrl, { headers });
    
    if (!listResponse.ok) {
      throw new Error(`Official API error: ${listResponse.status} - ${listResponse.statusText}`);
    }
    
    const captionsData = await listResponse.json();
    if (!captionsData.items || captionsData.items.length === 0) {
      throw new Error('No captions available via official API');
    }
    
    // Find best caption track
    const targetCaption = this.selectBestCaptionTrack(captionsData.items);
    
    // Download caption content
    const downloadUrl = this.authToken 
      ? `https://www.googleapis.com/youtube/v3/captions/${targetCaption.id}?tfmt=srv3`
      : `https://www.googleapis.com/youtube/v3/captions/${targetCaption.id}?tfmt=srv3&key=${this.apiKey}`;
    
    const downloadResponse = await fetch(downloadUrl, { headers });
    
    if (!downloadResponse.ok) {
      throw new Error(`Caption download failed: ${downloadResponse.status}`);
    }
    
    const captionXml = await downloadResponse.text();
    return this.parseOfficialFormat(captionXml);
  }

  async extractViaInnertube(videoId) {
    if (Constants.DEBUG.ENABLED) {
      console.log('🔧 Using Innertube API with Android client impersonation...');
    }
    
    // Step 1: Get API key from YouTube page
    const apiKey = await this.extractAPIKeyFromPage();
    if (!apiKey) {
      throw new Error('Could not extract INNERTUBE_API_KEY');
    }
    
    // Step 2: Call Innertube API with Android client context
    const playerResponse = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 13)',
        ...Constants.DEFAULT_HEADERS
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
            androidSdkVersion: 33,
            osName: 'Android',
            osVersion: '13'
          }
        },
        videoId: videoId
      })
    });
    
    if (!playerResponse.ok) {
      throw new Error(`Innertube API error: ${playerResponse.status}`);
    }
    
    const playerData = await playerResponse.json();
    
    // Step 3: Extract caption track URL
    const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) {
      throw new Error('No captions found via Innertube API');
    }
    
    // Priority: manual transcripts over auto-generated, English preferred
    const targetTrack = this.selectBestInnertubeTrack(tracks);
    
    // Step 4: Fetch complete transcript data
    const transcriptUrl = targetTrack.baseUrl.replace(/&fmt=\w+$/, '') + '&fmt=json3';
    
    const transcriptResponse = await fetch(transcriptUrl, {
      headers: Constants.DEFAULT_HEADERS
    });
    
    if (!transcriptResponse.ok) {
      throw new Error(`Transcript fetch failed: ${transcriptResponse.status}`);
    }
    
    const transcriptData = await transcriptResponse.json();
    
    // Step 5: Parse and format transcript
    return this.parseInnertubeFormat(transcriptData);
  }

  async extractAPIKeyFromPage() {
    try {
      // Try to get from current page HTML
      const htmlContent = document.documentElement.innerHTML;
      const apiKeyMatch = htmlContent.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      
      if (apiKeyMatch && apiKeyMatch[1]) {
        return apiKeyMatch[1];
      }

      // Fallback: Try to fetch YouTube page if not already on it
      const videoUrl = `https://www.youtube.com/watch?v=${Math.random().toString(36).substring(7)}`;
      const response = await fetch(videoUrl);
      const html = await response.text();
      const fallbackMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
      
      return fallbackMatch ? fallbackMatch[1] : null;
    } catch (error) {
      if (Constants.DEBUG.ENABLED) {
        console.error('Error extracting API key:', error);
      }
      return null;
    }
  }

  selectBestCaptionTrack(tracks) {
    // Priority: manual transcripts over auto-generated, English preferred
    let bestTrack = tracks.find(t => 
      t.snippet.language === Constants.LANGUAGE_CODES.ENGLISH && 
      t.snippet.trackKind !== 'ASR'
    );
    
    if (!bestTrack) {
      bestTrack = tracks.find(t => t.snippet.language === Constants.LANGUAGE_CODES.ENGLISH);
    }
    
    if (!bestTrack) {
      bestTrack = tracks.find(t => t.snippet.trackKind !== 'ASR');
    }
    
    return bestTrack || tracks[0];
  }

  selectBestInnertubeTrack(tracks) {
    // Priority: manual transcripts over auto-generated, English preferred
    let bestTrack = tracks.find(t => 
      t.languageCode === Constants.LANGUAGE_CODES.ENGLISH && 
      t.kind !== 'asr'
    );
    
    if (!bestTrack) {
      bestTrack = tracks.find(t => t.languageCode === Constants.LANGUAGE_CODES.ENGLISH);
    }
    
    if (!bestTrack) {
      bestTrack = tracks.find(t => t.kind !== 'asr');
    }
    
    return bestTrack || tracks[0];
  }

  parseOfficialFormat(xmlContent) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML parsing failed');
      }
      
      const texts = xmlDoc.querySelectorAll('text');
      
      const transcriptParts = Array.from(texts)
        .map(text => {
          const content = text.textContent?.trim() || '';
          return content
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        })
        .filter(text => text && text.length > 0);
      
      const fullTranscript = transcriptParts
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (Constants.DEBUG.ENABLED) {
        console.log(`📄 Parsed official format: ${transcriptParts.length} segments, ${fullTranscript.length} chars`);
      }
      
      return fullTranscript;
    } catch (error) {
      if (Constants.DEBUG.ENABLED) {
        console.error('Error parsing official format:', error);
      }
      throw new Error('Failed to parse official transcript format');
    }
  }

  parseInnertubeFormat(transcriptData) {
    try {
      const events = transcriptData.events || [];
      
      const transcriptParts = events
        .filter(event => event.segs && event.segs.length > 0)
        .map(event => {
          const text = event.segs
            .map(seg => seg.utf8 || '')
            .join('')
            .trim();
          
          return text
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        })
        .filter(text => text && text.length > 0);
      
      const fullTranscript = transcriptParts
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (Constants.DEBUG.ENABLED) {
        console.log(`📄 Parsed Innertube format: ${transcriptParts.length} segments, ${fullTranscript.length} chars`);
      }
      
      return fullTranscript;
    } catch (error) {
      if (Constants.DEBUG.ENABLED) {
        console.error('Error parsing Innertube format:', error);
      }
      throw new Error('Failed to parse Innertube transcript format');
    }
  }

  isValidTranscript(transcript) {
    return transcript && 
           typeof transcript === 'string' && 
           transcript.trim().length >= Constants.MIN_TRANSCRIPT_LENGTH;
  }

  // Get method statistics (for debugging)
  getStats() {
    return {
      name: this.name,
      successRate: this.successRate,
      rateLimitInfo: {
        canMakeRequest: this.rateLimiter.canMakeRequest(),
        remaining: this.rateLimiter.getRemainingRequests(),
        resetTime: this.rateLimiter.getResetTime()
      },
      authStatus: {
        hasApiKey: !!this.apiKey,
        hasAuthToken: !!this.authToken,
        canUseOfficial: this.canUseOfficialAPI()
      }
    };
  }
}

// Rate limiting utility class - optimized with reduced logging
class RateLimiter {
  constructor(maxRequests = 50, windowMs = 60000) {
    this.requests = [];
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }
  
  recordRequest() {
    this.requests.push(Date.now());
  }
  
  getRemainingRequests() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - this.requests.length);
  }
  
  getResetTime() {
    if (this.requests.length === 0) return 0;
    const oldest = Math.min(...this.requests);
    return Math.max(0, oldest + this.windowMs - Date.now());
  }
}