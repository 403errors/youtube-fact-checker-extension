// PlayerResponse.js - Extract from ytInitialPlayerResponse
// This method gets transcript data from YouTube's player response object

export class PlayerResponse {
  constructor() {
    this.name = 'PlayerResponse';
  }

  async extract(videoId) {
    console.log('🎬 Extracting from ytInitialPlayerResponse...');
    
    try {
      const playerResponse = await this.waitForPlayerResponse();
      if (!playerResponse) {
        throw new Error('No ytInitialPlayerResponse found');
      }

      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!captions || captions.length === 0) {
        throw new Error('No caption tracks found in player response');
      }

      console.log(`📋 Found ${captions.length} caption tracks in player response`);
      
      const sortedCaptions = this.sortCaptionsByPreference(captions);
      
      for (const track of sortedCaptions) {
        if (track.baseUrl) {
          console.log(`🎯 Trying caption track: ${track.name?.simpleText || track.languageCode}`);
          try {
            const transcript = await this.fetchCaptionFile(track.baseUrl);
            if (transcript && transcript.length >= 50) {
              console.log(`✅ Success with player response method, length: ${transcript.length}`);
              return transcript;
            }
          } catch (error) {
            console.log(`❌ Failed to fetch track: ${error.message}`);
          }
        }
      }
      
      throw new Error('No usable caption tracks found');
      
    } catch (error) {
      console.log('❌ PlayerResponse method failed:', error.message);
      throw error;
    }
  }

  async waitForPlayerResponse(maxWait = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.captions) {
        return window.ytInitialPlayerResponse;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('⏰ Timeout waiting for ytInitialPlayerResponse');
    return null;
  }

  sortCaptionsByPreference(captions) {
    return captions.sort((a, b) => {
      const scoreA = this.calculateCaptionScore(a);
      const scoreB = this.calculateCaptionScore(b);
      return scoreB - scoreA;
    });
  }

  calculateCaptionScore(caption) {
    let score = 1;
    
    // Language preference (English gets highest score)
    if (caption.languageCode?.startsWith('en')) score += 4;
    if (caption.vssId?.includes('.en')) score += 3;
    if (caption.name?.simpleText?.toLowerCase().includes('english')) score += 3;
    
    // Non-auto generated preference
    if (!caption.vssId?.includes('.auto')) score += 2;
    if (!caption.name?.simpleText?.toLowerCase().includes('auto')) score += 2;
    
    // Manual/human captions preference
    if (caption.kind === 'captions') score += 1;
    
    return score;
  }

  async fetchCaptionFile(url) {
    try {
      console.log(`🌐 Fetching caption file: ${url.substring(0, 80)}...`);
      
      const enhancedUrl = url.includes('fmt=') ? url : `${url}&fmt=json3`;
      
      const response = await fetch(enhancedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/xml, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'X-YouTube-Client-Name': '1',
          'X-YouTube-Client-Version': '2.20241201.00.00'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.text();
      return this.parseTranscriptData(data);
      
    } catch (error) {
      console.log(`❌ Failed to fetch caption file: ${error.message}`);
      throw error;
    }
  }

  parseTranscriptData(data) {
    try {
      console.log('📋 Parsing transcript data');
      console.log('Data preview:', data.substring(0, 200));
      
      // Try JSON3 format first (modern YouTube format)
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        try {
          const jsonData = JSON.parse(data);
          
          // Handle JSON3 events format
          if (jsonData.events) {
            const transcript = jsonData.events
              .filter(event => event.segs)
              .map(event => event.segs.map(seg => seg.utf8).join(' '))
              .join(' ')
              .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width chars
              .replace(/\s+/g, ' ')
              .trim();
            
            if (transcript.length > 50) {
              console.log(`✅ Parsed JSON3 format, length: ${transcript.length}`);
              return transcript;
            }
          }
          
          // Handle array format
          if (Array.isArray(jsonData)) {
            const transcript = jsonData
              .map(item => item.text || item.utf8 || '')
              .filter(text => text.trim())
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (transcript.length > 50) {
              console.log(`✅ Parsed JSON array format, length: ${transcript.length}`);
              return transcript;
            }
          }
        } catch (jsonError) {
          console.log('❌ JSON parsing failed, trying XML');
        }
      }
      
      // Try XML format (legacy)
      if (data.trim().startsWith('<')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          console.log('❌ XML parser error');
          return null;
        }
        
        const textElements = xmlDoc.querySelectorAll('text');
        if (textElements.length > 0) {
          const transcript = Array.from(textElements)
            .map(element => element.textContent || '')
            .filter(text => text.trim())
            .join(' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\[Music\]/gi, '')
            .replace(/\[Applause\]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (transcript.length > 50) {
            console.log(`✅ Parsed XML format, length: ${transcript.length}`);
            return transcript;
          }
        }
      }
      
      // Try plain text format
      if (data.trim().length > 50 && !data.includes('<') && !data.includes('{')) {
        const cleanText = data
          .replace(/\[Music\]/gi, '')
          .replace(/\[Applause\]/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanText.length > 50) {
          console.log(`✅ Parsed plain text format, length: ${cleanText.length}`);
          return cleanText;
        }
      }
      
      console.log('❌ Could not parse transcript data');
      return null;
      
    } catch (error) {
      console.error('❌ Transcript parsing error:', error);
      return null;
    }
  }
}