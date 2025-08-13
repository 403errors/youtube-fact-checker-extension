// PageScripts.js - Extract transcript from page script tags
// Analyzes JavaScript embedded in the page for caption track data

export class PageScripts {
  constructor() {
    this.name = 'PageScripts';
  }

  async extract(videoId) {
    console.log('📜 Enhanced page scripts analysis...');
    
    try {
      const scripts = Array.from(document.querySelectorAll('script'));
      let bestTranscript = null;
      let bestScore = 0;

      for (const script of scripts) {
        const text = script.textContent || '';
        
        // Enhanced patterns for caption tracks
        const patterns = [
          /"captionTracks":\s*\[([^\]]+)\]/g,
          /captionTracks:\s*\[([^\]]+)\]/g,
          /"playerCaptionsTracklistRenderer":\s*{[^}]*"captionTracks":\s*\[([^\]]+)\]/g,
          /"captions":\s*{[^}]*"playerCaptionsTracklistRenderer":\s*{[^}]*"captionTracks":\s*\[([^\]]+)\]/g
        ];

        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(text)) !== null) {
            try {
              console.log('📋 Found caption track pattern, parsing...');
              const captionsArray = JSON.parse('[' + match[1] + ']');
              
              for (const caption of captionsArray) {
                if (caption.baseUrl) {
                  console.log(`🌐 Found caption: ${caption.name?.simpleText || caption.languageCode || 'Unknown'}`);
                  
                  const score = this.calculateCaptionScore(caption);
                  
                  if (score > bestScore) {
                    console.log(`⭐ Attempting caption with score ${score}`);
                    
                    try {
                      const transcript = await this.fetchCaptionFile(caption.baseUrl);
                      if (transcript && transcript.length >= 50) {
                        bestTranscript = transcript;
                        bestScore = score;
                        console.log(`✅ Successfully extracted, length: ${transcript.length}`);
                        
                        // If perfect score, return immediately
                        if (score >= 8) {
                          return transcript;
                        }
                      }
                    } catch (fetchError) {
                      console.log(`❌ Failed to fetch: ${fetchError.message}`);
                    }
                  }
                }
              }
            } catch (parseError) {
              console.log('❌ Failed to parse caption tracks:', parseError.message);
            }
          }
        }
      }

      if (bestTranscript) {
        console.log(`✅ PageScripts method successful, length: ${bestTranscript.length}`);
        return bestTranscript;
      }

      throw new Error('No caption tracks found in page scripts');
      
    } catch (error) {
      console.log('❌ PageScripts method failed:', error.message);
      throw error;
    }
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
      
      // Try JSON3 format first
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        try {
          const jsonData = JSON.parse(data);
          
          if (jsonData.events) {
            const transcript = jsonData.events
              .filter(event => event.segs)
              .map(event => event.segs.map(seg => seg.utf8).join(' '))
              .join(' ')
              .replace(/[\u200B-\u200D\uFEFF]/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (transcript.length > 50) {
              return transcript;
            }
          }
          
          if (Array.isArray(jsonData)) {
            const transcript = jsonData
              .map(item => item.text || item.utf8 || '')
              .filter(text => text.trim())
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (transcript.length > 50) {
              return transcript;
            }
          }
        } catch (jsonError) {
          console.log('JSON parsing failed, trying XML');
        }
      }
      
      // Try XML format
      if (data.trim().startsWith('<')) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, 'text/xml');
        
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
            return transcript;
          }
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('Transcript parsing error:', error);
      return null;
    }
  }
}