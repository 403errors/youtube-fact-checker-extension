// ButtonManager.js - Handles fact-check button injection and management
// Includes container detection, button state management, and click handling

export class ButtonManager {
  constructor() {
    this.injected = false;
    this.injectionAttempts = 0;
    this.maxInjectionAttempts = 30;
    this.injectionInterval = null;
    this.button = null;
    this.callbacks = {};
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;
  }

  tryInject() {
    if (this.injected) return;
    
    this.injectionAttempts = 0;
    
    if (this.injectButton()) {
      return;
    }
    
    // Try with interval if initial injection fails
    this.injectionInterval = setInterval(() => {
      this.injectionAttempts++;
      
      if (this.injected) {
        clearInterval(this.injectionInterval);
        this.injectionInterval = null;
        return;
      }
      
      if (this.injectionAttempts >= this.maxInjectionAttempts) {
        console.log('Max injection attempts reached');
        clearInterval(this.injectionInterval);
        this.injectionInterval = null;
        return;
      }
      
      if (!this.isWatchPage()) {
        clearInterval(this.injectionInterval);
        this.injectionInterval = null;
        return;
      }
      
      this.injectButton();
    }, 200);
  }

  injectButton() {
    if (this.injected) return true;
    
    const container = this.findButtonContainer();
    if (!container) return false;
    
    const button = this.createButton();
    
    try {
      this.insertButton(container, button);
      this.button = button;
      this.injected = true;
      console.log('Fact-check button injected successfully');
      return true;
    } catch (error) {
      console.error('Button injection failed:', error);
      return false;
    }
  }

  findButtonContainer() {
    const strategies = [
      // Strategy 1: Modern YouTube layout
      () => {
        const topRow = document.querySelector('#top-row.style-scope.ytd-watch-metadata');
        if (topRow) {
          const actions = topRow.querySelector('#actions.style-scope.ytd-watch-metadata');
          if (actions) {
            return actions.querySelector('#top-level-buttons-computed') || actions;
          }
        }
        return null;
      },
      
      // Strategy 2: Look for like button container
      () => {
        const likeButton = document.querySelector('like-button-view-model button[aria-label*="like"]') ||
                          document.querySelector('ytd-toggle-button-renderer[target-id="watch-like"]') ||
                          document.querySelector('#segmented-like-button');
        return likeButton?.closest('#top-level-buttons-computed') || likeButton?.parentElement?.parentElement;
      },
      
      // Strategy 3: Actions container
      () => {
        const actions = document.querySelector('#actions.style-scope.ytd-watch-metadata #top-level-buttons-computed');
        return actions;
      },
      
      // Strategy 4: Menu renderer fallback
      () => {
        return document.querySelector('ytd-menu-renderer#menu .top-level-buttons');
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        const container = strategies[i]();
        if (container && this.isValidContainer(container)) {
          console.log(`Found button container using strategy ${i + 1}`);
          return container;
        }
      } catch (error) {
        console.log(`Strategy ${i + 1} failed:`, error);
        continue;
      }
    }

    console.log('No suitable container found');
    return null;
  }

  isValidContainer(container) {
    return container && 
           container.offsetParent !== null && 
           container.getBoundingClientRect().width > 0 &&
           container.getBoundingClientRect().height > 0;
  }

  createButton() {
    const button = document.createElement('button');
    button.id = 'fact-check-button';
    button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m fact-check-btn';
    button.setAttribute('aria-label', 'AI Fact-Check Analysis');
    button.setAttribute('title', 'AI Fact-Check with Real-time Verification');
    
    button.innerHTML = `
      <div class="yt-spec-button-shape-next__button-text-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px;">
          <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
        </svg>
        <span>Fact-Check</span>
      </div>
    `;
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.callbacks.onToggle) {
        this.callbacks.onToggle();
      }
    });
    
    return button;
  }

  insertButton(container, button) {
    try {
      const likeButton = container.querySelector('like-button-view-model') ||
                        container.querySelector('#segmented-like-button') ||
                        container.querySelector('ytd-toggle-button-renderer[target-id="watch-like"]');
      
      if (likeButton) {
        const insertTarget = likeButton.closest('ytd-toggle-button-renderer') || 
                            likeButton.closest('button-view-model') || 
                            likeButton;
        
        insertTarget.parentNode.insertBefore(button, insertTarget);
        console.log('Inserted before like button');
      } else {
        const firstChild = container.firstElementChild;
        if (firstChild) {
          container.insertBefore(button, firstChild);
          console.log('Inserted as first child');
        } else {
          container.appendChild(button);
          console.log('Appended to container');
        }
      }
    } catch (error) {
      console.error('Insertion error:', error);
      container.appendChild(button);
    }
  }

  setActive(active) {
    if (!this.button) return;
    
    if (active) {
      this.button.classList.add('active');
    } else {
      this.button.classList.remove('active');
    }
  }

  setLoading(loading) {
    if (!this.button) return;
    
    if (loading) {
      this.button.classList.add('loading');
      this.button.disabled = true;
    } else {
      this.button.classList.remove('loading');
      this.button.disabled = false;
    }
  }

  reset() {
    this.injected = false;
    this.injectionAttempts = 0;
    
    if (this.injectionInterval) {
      clearInterval(this.injectionInterval);
      this.injectionInterval = null;
    }
    
    const existingButton = document.querySelector('#fact-check-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    this.button = null;
  }

  cleanup() {
    this.reset();
    this.callbacks = {};
  }

  isWatchPage() {
    return location.pathname === '/watch' && location.search.includes('v=');
  }

  // Public methods for external access
  isInjected() {
    return this.injected;
  }

  getButton() {
    return this.button;
  }
}