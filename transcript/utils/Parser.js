// Parser.js - Utility functions for parsing transcript data
// Handles different transcript formats (JSON3, XML, plain text)

export class Parser {
  static parseTranscriptData(data) {
    try {
      console.log('📋 Parsing transcript data');
      console.log('Data preview:', data.substring(0, 200));
      
      // Try JSON3 format first (modern YouTube format)
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        const jsonResult = this.parseJSON3Format(data);
        if (jsonResult) return jsonResult;
      }
      
      // Try XML format (legacy)
      if (data.trim().startsWith('<')) {
        const xmlResult = this.parseXMLFormat(data);
        if (xmlResult) return xmlResult;
      }
      
      // Try plain text format
      const textResult = this.parsePlainTextFormat(data);
      if (textResult) return textResult;
      
      console.log('❌ Could not parse transcript data');
      return null;
      
    } catch (error) {
      console.error('❌ Transcript parsing error:', error);
      return null;
    }
  }

  static parseJSON3Format(data) {
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
      
      return null;
    } catch (jsonError) {
      console.log('❌ JSON parsing failed');
      return null;
    }
  }

  static parseXMLFormat(data) {
    try {
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
      
      return null;
    } catch (xmlError) {
      console.log('❌ XML parsing failed');
      return null;
    }
  }

  static parsePlainTextFormat(data) {
    try {
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
      
      return null;
    } catch (textError) {
      console.log('❌ Plain text parsing failed');
      return null;
    }
  }

  static cleanTranscriptText(text) {
    if (!text) return '';
    
    return text
      // Remove common transcript artifacts
      .replace(/\[Music\]/gi, '')
      .replace(/\[Applause\]/gi, '')
      .replace(/\[Laughter\]/gi, '')
      .replace(/\[Inaudible\]/gi, '')
      .replace(/\[Sound\]/gi, '')
      // Remove HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  static detectFormat(data) {
    if (!data || typeof data !== 'string') {
      return 'unknown';
    }
    
    const trimmed = data.trim();
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    
    if (trimmed.startsWith('<')) {
      return 'xml';
    }
    
    return 'text';
  }

  static isValidTranscript(transcript) {
    return transcript && 
           typeof transcript === 'string' && 
           transcript.trim().length >= 50;
  }
}