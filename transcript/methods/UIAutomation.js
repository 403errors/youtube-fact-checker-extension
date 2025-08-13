// UIAutomation.js - Hidden UI automation for transcript extraction
// Automates clicking YouTube's transcript button (hidden from user)

export class UIAutomation {
  constructor() {
    this.name = 'UIAutomation';
  }

  async extract(videoId) {
    console.log('🎯 Starting Hidden UI Automation transcript extraction...');
    
    try {
      // Save current state
      const originalScrollPosition = window.scrollY;
      const originalDocumentStyle = document.documentElement.style.cssText;
      
      // Hide actions from user
      this.freezePageForHiddenActions();
      
      // Step 1: Find and click "Show more" button
      const expandSuccess = await this.findAndClickShowMoreButtonHidden();
      if (!expandSuccess) {
        console.log('❌ Could not find or click "Show more" button');
        this.restorePageFromHiddenActions(originalScrollPosition, originalDocumentStyle);
        throw new Error('Could not expand description');
      }
      
      console.log('✅ Successfully expanded description (hidden)');
      
      // Step 2: Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Find and click transcript button
      const transcriptSuccess = await this.findAndClickTranscriptButtonHidden();
      if (!transcriptSuccess) {
        console.log('❌ Could not find or click transcript button');
        this.restorePageFromHiddenActions(originalScrollPosition, originalDocumentStyle);
        throw new Error('Could not open transcript panel');
      }
      
      console.log('✅ Successfully clicked transcript button (hidden)');
      
      // Step 4: Wait for transcript panel to load
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 5: Extract transcript from panel
      const transcript = await this.extractTranscriptFromOpenPanel();
      
      // Step 6: Restore page state
      this.restorePageFromHiddenActions(originalScrollPosition, originalDocumentStyle);
      
      if (transcript && transcript.length >= 50) {
        console.log(`✅ Successfully extracted transcript via UI automation, length: ${transcript.length}`);
        return transcript;
      } else {
        throw new Error('Transcript panel was empty or too short');
      }
      
    } catch (error) {
      console.error('❌ UI automation failed:', error);
      this.restorePageFromHiddenActions();
      throw error;
    }
  }

  freezePageForHiddenActions() {
    // Create overlay to hide visual changes
    const overlay = document.createElement('div');
    overlay.id = 'fact-check-hidden-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.1) !important;
      z-index: 999998 !important;
      pointer-events: none !important;
      opacity: 0 !important;
      transition: none !important;
    `;
    document.body.appendChild(overlay);
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    console.log('🔒 Page frozen for hidden transcript extraction');
  }

  restorePageFromHiddenActions(originalScrollPosition, originalDocumentStyle) {
    // Remove overlay
    const overlay = document.getElementById('fact-check-hidden-overlay');
    if (overlay) {
      overlay.remove();
    }
    
    // Restore scrolling
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    // Restore original styles
    if (originalDocumentStyle !== undefined) {
      document.documentElement.style.cssText = originalDocumentStyle;
    }
    
    // Restore scroll position
    if (originalScrollPosition !== undefined) {
      window.scrollTo(0, originalScrollPosition);
    }
    
    console.log('🔓 Page restored from hidden actions');
  }

  async findAndClickShowMoreButtonHidden() {
    console.log('🔍 Looking for "Show more" button (HIDDEN MODE)...');
    
    const expandSelectors = [
      '#expand',
      'tp-yt-paper-button#expand',
      '[id="expand"]',
      'button#expand',
      '#description button[aria-label*="more" i]',
      '#description button[aria-label*="expand" i]',
      '#description tp-yt-paper-button',
      'ytd-text-inline-expander #expand',
      '.ytd-text-inline-expander #expand'
    ];
    
    for (const selector of expandSelectors) {
      try {
        const button = document.querySelector(selector);
        
        if (button && this.isElementVisible(button)) {
          console.log(`📝 Found "Show more" button: ${selector}`);
          
          const buttonText = button.textContent?.toLowerCase() || '';
          if (buttonText.includes('show more') || buttonText.includes('more') || button.id === 'expand') {
            console.log('✅ Confirmed show more button');
            
            button.scrollIntoView({ behavior: 'instant', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 200));
            
            button.click();
            console.log('✅ Clicked show more button (hidden)');
            return true;
          }
        }
      } catch (error) {
        console.log(`❌ Error with selector ${selector}:`, error);
      }
    }
    
    console.log('❌ Could not find "Show more" button');
    return false;
  }

  async findAndClickTranscriptButtonHidden() {
    console.log('🔍 Looking for transcript button (HIDDEN MODE)...');
    
    const transcriptSelectors = [
      '#primary-button ytd-button-renderer yt-button-shape button',
      '#primary-button button',
      'ytd-button-renderer button[aria-label*="transcript" i]',
      'button[aria-label*="Show transcript" i]',
      'button[aria-label*="transcript" i]',
      '[role="button"][aria-label*="transcript" i]',
      '#description button[aria-label*="transcript" i]',
      '.ytd-text-inline-expander button[aria-label*="transcript" i]',
      'ytd-button-renderer yt-button-shape button',
      'yt-button-shape button[aria-label*="transcript" i]'
    ];
    
    for (const selector of transcriptSelectors) {
      try {
        const button = document.querySelector(selector);
        
        if (button && this.isElementVisible(button)) {
          console.log(`📜 Found transcript button: ${selector}`);
          
          const buttonText = button.textContent?.toLowerCase() || '';
          const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
          
          if (buttonText.includes('transcript') || 
              ariaLabel.includes('transcript') || 
              buttonText.includes('show transcript') ||
              ariaLabel.includes('show transcript')) {
            
            console.log('✅ Confirmed transcript button');
            
            button.scrollIntoView({ behavior: 'instant', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 200));
            
            button.click();
            console.log('✅ Clicked transcript button (hidden)');
            return true;
          }
        }
      } catch (error) {
        console.log(`❌ Error with transcript selector ${selector}:`, error);
      }
    }
    
    // Fallback: Look for any button that might be transcript
    console.log('🔄 Fallback: Looking for transcript button...');
    const allButtons = document.querySelectorAll('button, [role="button"]');
    
    for (const button of allButtons) {
      const text = button.textContent?.toLowerCase() || '';
      const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';
      
      if ((text.includes('transcript') || ariaLabel.includes('transcript')) && this.isElementVisible(button)) {
        console.log('📜 Found transcript button via fallback');
        
        button.scrollIntoView({ behavior: 'instant', block: 'center' });
        await new Promise(resolve => setTimeout(resolve, 200));
        button.click();
        console.log('✅ Clicked transcript button fallback');
        return true;
      }
    }
    
    console.log('❌ Could not find transcript button');
    return false;
  }

  async extractTranscriptFromOpenPanel() {
    console.log('📝 Extracting transcript from opened panel...');
    
    // Wait for panel to load
    await this.waitForTranscriptPanelToLoad();
    
    const segmentSelectors = [
      'ytd-transcript-segment-renderer',
      '.ytd-transcript-segment-renderer',
      '[class*="transcript-segment"]',
      '.transcript-segment',
      '.segment'
    ];
    
    let segments = [];
    
    for (const selector of segmentSelectors) {
      segments = document.querySelectorAll(selector);
      if (segments.length > 0) {
        console.log(`📋 Found ${segments.length} segments with selector: ${selector}`);
        break;
      }
    }
    
    if (segments.length === 0) {
      console.log('❌ No transcript segments found in panel');
      return null;
    }
    
    const transcriptParts = [];
    
    for (const segment of segments) {
      try {
        const textSelectors = [
          '.segment-text',
          '[class*="text"]',
          'yt-formatted-string',
          '.ytd-transcript-segment-renderer [dir]',
          '.cue-group-start-offset',
          '.cue'
        ];
        
        let text = '';
        for (const textSelector of textSelectors) {
          const textElement = segment.querySelector(textSelector);
          if (textElement) {
            text = textElement.textContent?.trim() || '';
            if (text) break;
          }
        }
        
        // Fallback: get text directly
        if (!text) {
          text = segment.textContent?.trim() || '';
          text = text.replace(/^\d+:\d+\s*/, '').trim();
        }
        
        if (text && text.length > 2) {
          transcriptParts.push(text);
        }
      } catch (error) {
        console.log('❌ Error processing segment:', error);
      }
    }
    
    if (transcriptParts.length === 0) {
      console.log('❌ No text content found in segments');
      return null;
    }
    
    const fullTranscript = transcriptParts
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`✅ Assembled transcript from ${transcriptParts.length} segments, total length: ${fullTranscript.length}`);
    
    return fullTranscript.length >= 50 ? fullTranscript : null;
  }

  async waitForTranscriptPanelToLoad(maxWait = 8000) {
    console.log('⏳ Waiting for transcript panel to load...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const segments = document.querySelectorAll(
        'ytd-transcript-segment-renderer, .ytd-transcript-segment-renderer, [class*="transcript-segment"]'
      );
      
      if (segments.length > 0) {
        console.log(`✅ Transcript panel loaded with ${segments.length} segments`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('⏰ Timeout waiting for transcript panel');
    return false;
  }

  isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }
}