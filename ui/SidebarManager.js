// SidebarManager.js - Handles sidebar creation, display, and management
// Manages sidebar state, content updates, and user interactions

export class SidebarManager {
  constructor() {
    this.sidebar = null;
    this.visible = false;
    this.callbacks = {};
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;
  }

  show() {
    this.remove(); // Remove existing sidebar if any
    this.createSidebar();
    this.visible = true;
    
    // Animate in
    requestAnimationFrame(() => {
      if (this.sidebar) {
        this.sidebar.classList.add('sidebar-visible');
      }
    });
  }

  hide() {
    if (!this.sidebar) return;
    
    this.sidebar.classList.remove('sidebar-visible');
    setTimeout(() => {
      this.remove();
    }, 300);
    
    this.visible = false;
  }

  createSidebar() {
    const sidebar = document.createElement('div');
    sidebar.id = 'fact-check-sidebar';
    sidebar.className = 'fact-check-sidebar';
    
    sidebar.innerHTML = this.getSidebarHTML();
    document.body.appendChild(sidebar);
    
    this.sidebar = sidebar;
    this.setupEventListeners();
  }

  getSidebarHTML() {
    return `
      <div class="sidebar-header">
        <h3>🔍 AI Fact-Check</h3>
        <div class="header-controls">
          <button id="refresh-analysis" class="control-btn" title="Refresh analysis">⟳</button>
          <button id="close-sidebar" class="close-btn">×</button>
        </div>
      </div>
      <div id="sidebar-content" class="sidebar-content">
        <div class="loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Analyzing content...</div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    if (!this.sidebar) return;

    const closeBtn = this.sidebar.querySelector('#close-sidebar');
    const refreshBtn = this.sidebar.querySelector('#refresh-analysis');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.callbacks.onClose) {
          this.callbacks.onClose();
        }
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (this.callbacks.onRefresh) {
          this.callbacks.onRefresh();
        }
      });
    }
  }

  setContent(htmlContent) {
    const contentElement = this.sidebar?.querySelector('#sidebar-content');
    if (contentElement) {
      contentElement.innerHTML = htmlContent;
    }
  }

  showLoading(message = 'Analyzing content...') {
    this.setContent(`
      <div class="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
      </div>
    `);
  }

  remove() {
    if (this.sidebar) {
      this.sidebar.remove();
      this.sidebar = null;
    }
    this.visible = false;
  }

  cleanup() {
    this.remove();
    this.callbacks = {};
  }

  // Public getters
  isVisible() {
    return this.visible;
  }

  getSidebar() {
    return this.sidebar;
  }

  getContentElement() {
    return this.sidebar?.querySelector('#sidebar-content');
  }

  // Utility method
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}