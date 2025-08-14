// ButtonManager.js - Fixed button injection with robust retry and 2025 selectors
// Enhanced container detection and persistent retry mechanism

export class ButtonManager {
  constructor() {
    this.injected = false;
    this.button = null;
    this.callbacks = {};
    this.retryTimer = null;
    this.retryCount = 0;
    this.maxRetries = 15; // Reduced but more persistent
    this.retryDelay = 1000; // Longer delay for better success
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;
  }

  tryInject() {
    // Clear any existing retry timer
    this.clearRetryTimer();
    
    // Reset state
    this.retryCount = 0;
    
    // Remove any existing button first to prevent duplicates
    this.removeExistingButton();
    
    // Try immediate injection
    if (this.injectButton()) {
      return;
    }
    
    // Start persistent retry with better timing
    this.startRetryTimer();
  }

  removeExistingButton() {
    const existingButton = document.querySelector('#fact-check-button');
    if (existingButton) {
      existingButton.remove();
      this.injected = false;
      this.button = null;
    }
  }

  startRetryTimer() {
    this.retryTimer = setInterval(() => {
      this.retryCount++;
      
      // Stop if already injected
      if (this.injected && document.querySelector('#fact-check-button')) {
        this.clearRetryTimer();
        return;
      }
      
      // Stop if max retries reached
      if (this.retryCount >= this.maxRetries) {
        this.clearRetryTimer();
        console.log(`❌ Button injection failed after ${this.maxRetries} attempts`);
        return;
      }
      
      // Stop if not on watch page
      if (!this.isWatchPage()) {
        this.clearRetryTimer();
        return;
      }
      
      console.log(`🔄 Injection attempt ${this.retryCount}/${this.maxRetries}`);
      
      // Try injection with increasing delays for YouTube to load
      if (this.injectButton()) {
        this.clearRetryTimer();
      }
    }, Math.min(1000 + (this.retryCount * 200), 3000)); // Progressive delay up to 3s
  }

  clearRetryTimer() {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  injectButton() {
    if (this.injected) return true;
    
    const container = this.findButtonContainer();
    if (!container) return false;
    
    try {
      const button = this.createButton();
      this.insertButton(container, button);
      
      this.button = button;
      this.injected = true;
      this.clearRetryTimer();
      
      console.log('✅ Fact-check button injected successfully');
      return true;
    } catch (error) {
      console.error('Button injection failed:', error);
      return false;
    }
  }

  findButtonContainer() {
    // More comprehensive and robust container detection
    const strategies = [
      // Strategy 1: Most reliable - top level buttons
      () => {
        const topLevel = document.querySelector('#top-level-buttons-computed');
        if (topLevel && this.isValidContainer(topLevel)) {
          return topLevel;
        }
        return null;
      },
      
      // Strategy 2: Look within actions container
      () => {
        const actions = document.querySelector('#actions.style-scope.ytd-watch-metadata');
        if (actions) {
          const computed = actions.querySelector('#top-level-buttons-computed');
          if (computed && this.isValidContainer(computed)) {
            return computed;
          }
        }
        return null;
      },
      
      // Strategy 3: Find via like button's parent container
      () => {
        const selectors = [
          'like-button-view-model',
          '#segmented-like-button',
          'ytd-toggle-button-renderer[target-id="watch-like"]',
          'button[aria-label*="like" i]'
        ];
        
        for (const selector of selectors) {
          const likeButton = document.querySelector(selector);
          if (likeButton) {
            // Try to find the container holding all buttons
            let container = likeButton.closest('#top-level-buttons-computed');
            if (container && this.isValidContainer(container)) {
              return container;
            }
            
            // Fallback: use parent containers
            container = likeButton.parentElement?.parentElement;
            if (container && this.isValidContainer(container)) {
              return container;
            }
          }
        }
        return null;
      },
      
      // Strategy 4: Menu renderer approach
      () => {
        const menu = document.querySelector('ytd-menu-renderer#menu');
        if (menu) {
          const buttons = menu.querySelector('#top-level-buttons-computed') || 
                         menu.querySelector('.top-level-buttons');
          if (buttons && this.isValidContainer(buttons)) {
            return buttons;
          }
        }
        return null;
      },
      
      // Strategy 5: Broader search for any buttons container
      () => {
        const containers = document.querySelectorAll('[id*="buttons"], [class*="buttons"], [class*="actions"]');
        for (const container of containers) {
          if (container.id.includes('top-level') || 
              container.className.includes('top-level') ||
              container.querySelector('like-button-view-model, #segmented-like-button')) {
            if (this.isValidContainer(container)) {
              return container;
            }
          }
        }
        return null;
      },
      
      // Strategy 6: Wait for YouTube to fully load and try again
      () => {
        // Check if YouTube is still loading
        const ytdApp = document.querySelector('ytd-app');
        const watchFlexy = document.querySelector('ytd-watch-flexy');
        
        if (ytdApp && watchFlexy && document.readyState === 'complete') {
          // Try a more aggressive search
          const allContainers = document.querySelectorAll('div, span');
          for (const container of allContainers) {
            if (container.children.length >= 2 && 
                container.querySelector('like-button-view-model, #segmented-like-button') &&
                this.isValidContainer(container)) {
              return container;
            }
          }
        }
        return null;
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        const container = strategies[i]();
        if (container) {
          console.log(`📍 Found container using strategy ${i + 1}:`, container);
          return container;
        }
      } catch (error) {
        console.log(`Strategy ${i + 1} failed:`, error);
        continue;
      }
    }

    console.log('❌ No suitable container found with any strategy');
    return null;
  }

  isValidContainer(container) {
    if (!container) return false;
    
    // More thorough validation
    try {
      // Check if element exists and is connected to DOM
      if (!container.isConnected) return false;
      
      // Check if element is visible
      const rect = container.getBoundingClientRect();
      const isVisible = container.offsetParent !== null && 
                       rect.width > 0 && 
                       rect.height > 0 &&
                       !container.hidden &&
                       getComputedStyle(container).display !== 'none' &&
                       getComputedStyle(container).visibility !== 'hidden';
      
      if (!isVisible) return false;
      
      // Check if already has our button
      if (container.querySelector('#fact-check-button')) return false;
      
      // Check if it's the right type of container (should have other buttons)
      const hasOtherButtons = container.children.length > 0;
      
      return hasOtherButtons;
    } catch (error) {
      return false;
    }
  }

  createButton() {
    const button = document.createElement('button');
    button.id = 'fact-check-button';
    button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m';
    button.setAttribute('aria-label', 'AI Fact-Check Analysis');
    button.setAttribute('title', 'AI Fact-Check with Real-time Verification');
    
    // Lock all dimensions with !important to prevent ANY changes
    button.style.cssText = `
      margin-left: 8px !important;
      margin-right: 8px !important;
      height: 36px !important;
      min-height: 36px !important;
      max-height: 36px !important;
      width: auto !important;
      min-width: fit-content !important;
      max-width: none !important;
      box-sizing: border-box !important;
      padding: 0 16px !important;
      border: none !important;
      outline: none !important;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease !important;
      position: relative !important;
      overflow: hidden !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      vertical-align: top !important;
      flex-shrink: 0 !important;
      line-height: 36px !important;
    `;
    
    button.innerHTML = `
      <div class="yt-spec-button-shape-next__button-text-content" style="
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 36px !important;
        min-height: 36px !important;
        max-height: 36px !important;
        position: relative !important;
        z-index: 2 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      ">
        <svg class="fact-check-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="
          margin-right: 6px !important;
          transition: transform 0.3s ease, opacity 0.3s ease !important;
          flex-shrink: 0 !important;
          width: 18px !important;
          height: 18px !important;
          display: inline-block !important;
          vertical-align: middle !important;
        ">
          <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
        </svg>
        <span class="fact-check-text" style="
          transition: opacity 0.3s ease !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: inline-block !important;
          vertical-align: middle !important;
        ">Fact-Check</span>
        
        <!-- Loading animation overlay -->
        <div class="fact-check-loading" style="
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          display: none !important;
          width: 20px !important;
          height: 20px !important;
          z-index: 3 !important;
        ">
          <div style="
            width: 20px !important;
            height: 20px !important;
            border: 2px solid currentColor !important;
            border-radius: 50% !important;
            border-top-color: transparent !important;
            animation: fact-check-spin 1s linear infinite !important;
            box-sizing: border-box !important;
          "></div>
        </div>
      </div>
    `;
    
    // Add keyframe animation
    this.addSpinAnimation();
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.callbacks.onToggle) {
        this.callbacks.onToggle();
      }
    });
    
    return button;
  }

  addSpinAnimation() {
    // Check if animation already exists
    if (document.querySelector('#fact-check-spin-animation')) return;
    
    const style = document.createElement('style');
    style.id = 'fact-check-spin-animation';
    style.textContent = `
      @keyframes fact-check-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Ensure button never changes dimensions */
      #fact-check-button {
        height: 36px !important;
        min-height: 36px !important;
        max-height: 36px !important;
        box-sizing: border-box !important;
      }
      
      #fact-check-button * {
        box-sizing: border-box !important;
      }
      
      #fact-check-button.loading .fact-check-icon {
        transform: scale(0.8) !important;
        opacity: 0 !important;
      }
      
      #fact-check-button.active {
        background-color: var(--yt-spec-button-chip-background-hover, rgba(0,0,0,0.1)) !important;
        color: var(--yt-spec-text-primary, inherit) !important;
      }
      
      #fact-check-button:hover:not(:disabled) {
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
      }
      
      #fact-check-button:disabled {
        cursor: not-allowed !important;
        opacity: 0.8 !important;
      }
      
      /* Override any YouTube styles that might affect height */
      #fact-check-button.yt-spec-button-shape-next {
        height: 36px !important;
        min-height: 36px !important;
        max-height: 36px !important;
      }
      
      #fact-check-button .yt-spec-button-shape-next__button-text-content {
        height: 36px !important;
        min-height: 36px !important;
        max-height: 36px !important;
      }
    `;
    document.head.appendChild(style);
  }

  insertButton(container, button) {
    try {
      // Try to insert near like button for better positioning
      const likeButton = container.querySelector('like-button-view-model') ||
                        container.querySelector('#segmented-like-button') ||
                        container.querySelector('ytd-toggle-button-renderer[target-id="watch-like"]');
      
      if (likeButton) {
        // Insert after like button
        const nextSibling = likeButton.nextElementSibling;
        if (nextSibling) {
          container.insertBefore(button, nextSibling);
        } else {
          likeButton.parentNode.appendChild(button);
        }
      } else {
        // Insert as first child if no like button found
        if (container.firstElementChild) {
          container.insertBefore(button, container.firstElementChild);
        } else {
          container.appendChild(button);
        }
      }
    } catch (error) {
      // Fallback: just append to container
      container.appendChild(button);
    }
  }

  // State management methods
  setActive(active) {
    if (!this.button) return;
    this.button.classList.toggle('active', active);
  }

  setLoading(loading) {
    if (!this.button) return;
    
    const loadingElement = this.button.querySelector('.fact-check-loading');
    const icon = this.button.querySelector('.fact-check-icon');
    const text = this.button.querySelector('.fact-check-text');
    
    if (loading) {
      this.button.classList.add('loading');
      this.button.disabled = true;
      
      if (loadingElement) loadingElement.style.display = 'block';
      if (icon) icon.style.opacity = '0';
      if (text) text.style.opacity = '0.7';
    } else {
      this.button.classList.remove('loading');
      this.button.disabled = false;
      
      if (loadingElement) loadingElement.style.display = 'none';
      if (icon) icon.style.opacity = '1';
      if (text) text.style.opacity = '1';
    }
  }

  reset() {
    this.injected = false;
    this.retryCount = 0;
    this.clearRetryTimer();
    
    // Remove existing button
    const existingButton = document.querySelector('#fact-check-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    // Remove animation styles
    const animationStyle = document.querySelector('#fact-check-spin-animation');
    if (animationStyle) {
      animationStyle.remove();
    }
    
    this.button = null;
  }

  cleanup() {
    this.reset();
    this.callbacks = {};
  }

  // Utility methods
  isWatchPage() {
    return location.pathname === '/watch' && location.search.includes('v=');
  }

  isInjected() {
    return this.injected && document.querySelector('#fact-check-button');
  }

  getButton() {
    return this.button;
  }

  // Debug info
  getDebugInfo() {
    return {
      injected: this.injected,
      retryCount: this.retryCount,
      retryTimerActive: !!this.retryTimer,
      buttonExists: !!document.querySelector('#fact-check-button'),
      containerFound: !!this.findButtonContainer(),
      isWatchPage: this.isWatchPage()
    };
  }
}