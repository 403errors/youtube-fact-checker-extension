// DirectAPI.js - Direct API calls to YouTube transcript endpoints
// Makes direct requests to YouTube's transcript API endpoints

export class DirectAPI {
  constructor() {
    this.name = 'DirectAPI';
  }

  async extract(videoId) {
    console.log('🌐 Direct API extraction with modern headers');
    
    if (!videoId) {
      throw new Error('No video ID provided');
    }

    // Modern API endpoints to try
    const apiEndpoints = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3&xorb=2&xobt=3`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US&fmt=json3&xorb=2`,
      // Legacy fallbacks
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
      `https://video.google.com/timedtext?lang=en&v=${videoId}&fmt=json3`
    ];

    for (const url of apiEndpoints) {
      try {
        console.log(`🌐 Trying API endpoint: ${url.substring(0, 60)}...`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'X-YouTube-Client-Name': '1',
            'X-YouTube-Client-Version': '2.20241201.00.00'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.text();
          if (data && data.trim().length > 50) {
            const transcript = this.parseTranscriptData(data);
            if (transcript && transcript.length >= 50) {
              console.log(`✅ Success with direct API, length: ${transcript.length}`);
              return transcript;
            }
          }
        }
      } catch (error) {
        console.log(`❌ API endpoint failed: ${error.message}`);
      }
    }
    
    throw new Error('All direct API endpoints failed');
  }

  parseTranscriptData(data) {
    try {
      console.log('📋 Parsing direct API transcript data');
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