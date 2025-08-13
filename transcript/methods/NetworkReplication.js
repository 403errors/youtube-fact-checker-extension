// NetworkReplication.js - Authentication-aware network replication method
// This is the most reliable method from the original code

export class NetworkReplication {
  constructor() {
    this.name = 'NetworkReplication';
  }

  async extract(videoId) {
    console.log('🌐 Starting Authentication-Aware Network Replication...');
    
    try {
      const authData = this.extractAuthenticationData(videoId);
      if (!authData) {
        throw new Error('Could not extract authentication data from page');
      }
      
      console.log('✅ Authentication data extracted successfully');
      
      const transcript = await this.makeAuthenticatedTranscriptRequest(authData);
      
      if (transcript && transcript.length >= 50) {
        console.log(`✅ Network replication successful, length: ${transcript.length}`);
        return transcript;
      }
      
      throw new Error('Network replication returned empty or invalid transcript');
      
    } catch (error) {
      console.log('❌ Network replication failed:', error.message);
      throw error;
    }
  }

  extractAuthenticationData(videoId) {
    try {
      const cookies = {};
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          cookies[name] = value;
        }
      });

      const requiredCookies = ['SAPISID', 'APISID', 'SSID', 'HSID', 'SID'];
      const missingCookies = requiredCookies.filter(name => !cookies[name]);
      
      if (missingCookies.length > 0) {
        console.log('❌ Missing required cookies:', missingCookies);
        return null;
      }

      const visitorData = this.extractVisitorData();
      const clientVersion = this.extractClientVersion();
      
      const timestamp = Math.floor(Date.now() / 1000);
      const sapisidHash = this.generateSapisidHash(cookies.SAPISID, timestamp);
      
      return {
        cookies,
        visitorData,
        clientVersion,
        timestamp,
        sapisidHash,
        videoId
      };
      
    } catch (error) {
      console.error('Error extracting authentication data:', error);
      return null;
    }
  }

  extractVisitorData() {
    try {
      const methods = [
        () => window.ytInitialData?.responseContext?.visitorData,
        () => window.ytInitialPlayerResponse?.responseContext?.visitorData,
        () => {
          const scripts = document.querySelectorAll('script');
          for (const script of scripts) {
            const text = script.textContent || '';
            const match = text.match(/"visitorData":"([^"]+)"/);
            if (match) return match[1];
          }
          return null;
        }
      ];
      
      for (const method of methods) {
        const result = method();
        if (result) {
          console.log('✅ Visitor data found');
          return result;
        }
      }
      
      console.log('⚠️ Visitor data not found, using fallback');
      return 'CgtRVUpTLXFjWnNUOA%3D%3D';
      
    } catch (error) {
      console.error('Error extracting visitor data:', error);
      return 'CgtRVUpTLXFjWnNUOA%3D%3D';
    }
  }

  extractClientVersion() {
    try {
      const version = window.ytInitialData?.responseContext?.serviceTrackingParams
        ?.find(p => p.service === 'CSI')?.params
        ?.find(p => p.key === 'cver')?.value;
      
      if (version) {
        console.log('✅ Client version found:', version);
        return version;
      }
      
      console.log('⚠️ Client version not found, using fallback');
      return '2.20250731.09.00';
      
    } catch (error) {
      console.error('Error extracting client version:', error);
      return '2.20250731.09.00';
    }
  }

  generateSapisidHash(sapisid, timestamp) {
    try {
      const origin = 'https://www.youtube.com';
      const stringToHash = `${timestamp} ${sapisid} ${origin}`;
      
      let hash = 0;
      for (let i = 0; i < stringToHash.length; i++) {
        const char = stringToHash.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      const hashHex = Math.abs(hash).toString(16).toUpperCase();
      return `${timestamp}_${hashHex}`;
      
    } catch (error) {
      console.error('Error generating SAPISID hash:', error);
      return `${timestamp}_FALLBACK`;
    }
  }

  async makeAuthenticatedTranscriptRequest(authData) {
    const url = 'https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false';
    
    const headers = {
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Authorization': `SAPISIDHASH ${authData.sapisidHash}`,
      'Content-Type': 'application/json',
      'Origin': 'https://www.youtube.com',
      'Referer': `https://www.youtube.com/watch?v=${authData.videoId}`,
      'X-Goog-AuthUser': '0',
      'X-Goog-Visitor-Id': authData.visitorData,
      'X-Origin': 'https://www.youtube.com',
      'X-YouTube-Bootstrap-Logged-In': 'true',
      'X-YouTube-Client-Name': '1',
      'X-YouTube-Client-Version': authData.clientVersion
    };

    const body = {
      context: {
        client: {
          hl: 'en-US',
          gl: 'US',
          visitorData: authData.visitorData,
          userAgent: navigator.userAgent,
          clientName: 'WEB',
          clientVersion: authData.clientVersion,
          osName: navigator.platform.includes('Mac') ? 'Macintosh' : 
                  navigator.platform.includes('Win') ? 'Windows' : 'Linux',
          platform: 'DESKTOP',
          originalUrl: window.location.href,
          mainAppWebInfo: {
            graftUrl: window.location.href,
            webDisplayMode: 'WEB_DISPLAY_MODE_BROWSER',
            isWebNativeShareAvailable: !!navigator.share
          }
        },
        user: {
          lockedSafetyMode: false
        },
        request: {
          useSsl: true,
          internalExperimentFlags: [],
          consistencyTokenJars: []
        }
      },
      params: this.generateTranscriptParams(authData.videoId),
      languageCode: 'en-US',
      externalVideoId: authData.videoId
    };

    console.log('🔄 Making authenticated transcript request...');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseTranscriptResponse(data);

    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }

  generateTranscriptParams(videoId) {
    try {
      const params = {
        videoId: videoId,
        languageCode: 'en'
      };
      
      const paramsString = JSON.stringify(params);
      return btoa(paramsString);
      
    } catch (error) {
      console.error('Error generating transcript params:', error);
      return 'CgtmcFFGNFJtWUF4ZxISQ2dBU0JXVnVMVlVUR2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDAAOAFAAQ%3D%3D';
    }
  }

  parseTranscriptResponse(data) {
    try {
      console.log('📋 Parsing authenticated transcript response...');
      
      const actions = data?.actions;
      if (!actions || !Array.isArray(actions)) {
        throw new Error('No actions found in response');
      }

      const transcriptAction = actions.find(action => 
        action?.updateEngagementPanelAction?.content?.transcriptSearchPanelRenderer ||
        action?.updateEngagementPanelAction?.content?.transcriptRenderer
      );

      if (!transcriptAction) {
        throw new Error('No transcript action found');
      }

      const renderer = transcriptAction.updateEngagementPanelAction.content.transcriptSearchPanelRenderer ||
                      transcriptAction.updateEngagementPanelAction.content.transcriptRenderer;

      const segments = renderer?.body?.transcriptSegmentListRenderer?.initialSegments ||
                      renderer?.content?.transcriptSegmentListRenderer?.initialSegments ||
                      [];

      if (!segments || segments.length === 0) {
        throw new Error('No transcript segments found');
      }

      console.log(`✅ Found ${segments.length} transcript segments`);

      const transcriptParts = [];
      for (const segment of segments) {
        const text = segment?.transcriptSegmentRenderer?.snippet?.runs?.[0]?.text;
        if (text && text.trim()) {
          transcriptParts.push(text.trim());
        }
      }

      const fullTranscript = transcriptParts.join(' ').replace(/\s+/g, ' ').trim();
      
      console.log(`✅ Assembled transcript, length: ${fullTranscript.length}`);
      return fullTranscript.length >= 50 ? fullTranscript : null;

    } catch (error) {
      console.error('Error parsing transcript response:', error);
      return null;
    }
  }
}