// VideoTracks.js - Extract from HTML5 video text tracks
// Uses the video element's built-in text tracks for transcript extraction

export class VideoTracks {
  constructor() {
    this.name = 'VideoTracks';
  }

  async extract(videoId) {
    console.log('🎥 Enhanced video text tracks extraction...');
    
    try {
      const video = document.querySelector('video');
      if (!video) {
        throw new Error('No video element found');
      }

      console.log(`📺 Video found, checking ${video.textTracks.length} text tracks`);
      
      // Force enable all tracks and wait for loading
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (track.kind === 'captions' || track.kind === 'subtitles') {
          track.mode = 'showing';
        }
      }
      
      // Wait for cues to load
      await this.waitForTextTrackCues(video, 8000);
      
      // Extract from tracks with highest priority
      const sortedTracks = Array.from(video.textTracks)
        .filter(track => track.kind === 'captions' || track.kind === 'subtitles')
        .sort((a, b) => {
          const scoreA = this.calculateTrackScore(a);
          const scoreB = this.calculateTrackScore(b);
          return scoreB - scoreA;
        });
      
      for (const track of sortedTracks) {
        if (track.cues && track.cues.length > 0) {
          console.log(`📝 Extracting from track with ${track.cues.length} cues`);
          
          try {
            const transcript = this.extractCuesText(track.cues);
            track.mode = 'disabled'; // Clean up
            
            if (transcript && transcript.length >= 50) {
              console.log(`✅ Successfully extracted from text track, length: ${transcript.length}`);
              return transcript;
            }
          } catch (error) {
            console.log(`❌ Error extracting from track:`, error);
          }
        }
      }
      
      throw new Error('No usable text tracks found');
      
    } catch (error) {
      console.log('❌ VideoTracks method failed:', error.message);
      throw error;
    }
  }

  async waitForTextTrackCues(video, maxWaitTime = 8000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      let foundCues = false;
      
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if ((track.kind === 'captions' || track.kind === 'subtitles') && track.cues && track.cues.length > 0) {
          foundCues = true;
          break;
        }
      }
      
      if (foundCues) {
        console.log('✅ Text track cues loaded');
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('⏰ Text track cues loading timed out');
    return false;
  }

  calculateTrackScore(track) {
    let score = 1;
    
    if (track.language?.startsWith('en')) score += 3;
    if (track.label?.toLowerCase().includes('english')) score += 2;
    if (track.kind === 'captions') score += 2;
    if (!track.label?.toLowerCase().includes('auto')) score += 1;
    
    return score;
  }

  extractCuesText(cues) {
    const cueTexts = [];
    
    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      if (cue.text && cue.text.trim()) {
        // Clean up cue text
        const cleanText = cue.text
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanText) {
          cueTexts.push(cleanText);
        }
      }
    }
    
    return cueTexts
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}