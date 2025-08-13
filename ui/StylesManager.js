// StylesManager.js - Handles CSS injection and style management
// Manages all styling for the fact-check extension

export class StylesManager {
  constructor() {
    this.styleElement = null;
    this.styleId = 'enhanced-fact-check-styles';
  }

  inject() {
    if (document.querySelector(`#${this.styleId}`)) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = this.styleId;
    style.textContent = this.getStyles();
    
    document.head.appendChild(style);
    this.styleElement = style;
    
    console.log('Fact-check styles injected');
  }

  remove() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    
    // Also remove by ID as fallback
    const existingStyle = document.querySelector(`#${this.styleId}`);
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  getStyles() {
    return `
      /* Import improved fonts */
      @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');

      /* Enhanced YouTube Button Integration */
      .fact-check-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 36px !important;
        min-height: 36px !important;
        padding: 0 16px !important;
        margin: 0 8px 0 0 !important;
        background: transparent !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 18px !important;
        color: var(--yt-spec-text-primary) !important;
        font-family: "Quicksand", "Roboto", "Arial", sans-serif !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        position: relative !important;
        overflow: hidden !important;
        white-space: nowrap !important;
      }

      .fact-check-btn:hover {
        background: rgba(102, 126, 234, 0.1) !important;
        border-color: rgba(102, 126, 234, 0.3) !important;
        transform: translateY(-1px) !important;
      }

      .fact-check-btn.active {
        background: rgba(16, 185, 129, 0.1) !important;
        border-color: rgba(16, 185, 129, 0.3) !important;
        color: #10b981 !important;
      }

      .fact-check-btn.loading {
        pointer-events: none !important;
        opacity: 0.7 !important;
      }

      .fact-check-btn.loading .yt-spec-button-shape-next__button-text-content {
        opacity: 0 !important;
      }

      .fact-check-btn.loading:after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: factCheckSpin 1s linear infinite;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }

      @keyframes factCheckSpin {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
      }

      /* Enhanced Sidebar */
      .fact-check-sidebar {
        position: fixed !important;
        top: 0 !important;
        right: -400px !important;
        width: 400px !important;
        height: 100vh !important;
        background: #ffffff !important;
        border-left: 1px solid #e5e7eb !important;
        box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1) !important;
        z-index: 999999 !important;
        transition: right 0.3s ease !important;
        overflow: hidden !important;
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }

      .fact-check-sidebar.sidebar-visible {
        right: 0 !important;
      }

      .sidebar-header {
        padding: 20px !important;
        background: #f8fafc !important;
        border-bottom: 1px solid #e5e7eb !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }

      .sidebar-header h3 {
        margin: 0 !important;
        font-family: 'Quicksand', sans-serif !important;
        font-size: 18px !important;
        font-weight: 700 !important;
        color: #374151 !important;
      }

      .header-controls {
        display: flex !important;
        gap: 8px !important;
      }

      .control-btn, .close-btn {
        background: transparent !important;
        border: 1px solid #d1d5db !important;
        border-radius: 8px !important;
        width: 32px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        font-size: 16px !important;
        color: #6b7280 !important;
        transition: all 0.2s ease !important;
      }

      .control-btn:hover, .close-btn:hover {
        background: #f3f4f6 !important;
        border-color: #9ca3af !important;
        color: #374151 !important;
      }

      .sidebar-content {
        height: calc(100vh - 81px) !important;
        overflow-y: auto !important;
        padding: 0 !important;
      }

      /* Results Summary */
      .results-summary {
        padding: 20px !important;
        background: #f8fafc !important;
        border-bottom: 1px solid #e5e7eb !important;
      }

      .summary-title {
        font-family: 'Quicksand', sans-serif !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        margin-bottom: 12px !important;
      }

      .summary-stats {
        display: flex !important;
        gap: 12px !important;
        justify-content: center !important;
        flex-wrap: wrap !important;
      }

      .stat {
        padding: 8px 12px !important;
        background: white !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 16px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
        font-family: 'Outfit', sans-serif !important;
      }

      /* Enhanced Card Layout */
      .results-cards {
        padding: 0 !important;
      }

      .fact-card {
        margin: 16px 20px !important;
        background: white !important;
        border-radius: 16px !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
        border: 1px solid #e5e7eb !important;
        transition: all 0.3s ease !important;
        overflow: hidden !important;
        position: relative !important;
      }

      .fact-card:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
        transform: translateY(-2px) !important;
      }

      .fact-card.expanded {
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
      }

      .fact-card::before {
        content: '';
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        width: 4px !important;
        background: #e5e7eb !important;
        transition: background-color 0.2s ease !important;
      }

      /* Status colors */
      .fact-card.status-true::before { background: #10b981 !important; }
      .fact-card.status-mostly-true::before { background: #10b981 !important; }
      .fact-card.status-partly-true::before { background: #f59e0b !important; }
      .fact-card.status-false::before { background: #ef4444 !important; }
      .fact-card.status-misleading::before { background: #f97316 !important; }
      .fact-card.status-unverifiable::before { background: #6b7280 !important; }

      .card-header {
        padding: 16px 20px !important;
        cursor: pointer !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-bottom: 1px solid #f3f4f6 !important;
        background: #fafbfc !important;
        transition: background-color 0.2s ease !important;
      }

      .card-header:hover {
        background: #f1f5f9 !important;
      }

      .status-info {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }

      .status-badge {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 6px 12px !important;
        border-radius: 20px !important;
        background: rgba(102, 126, 234, 0.1) !important;
        font-family: 'Quicksand', sans-serif !important;
        font-weight: 600 !important;
        font-size: 13px !important;
      }

      .confidence-score {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        padding: 4px 10px !important;
        border-radius: 12px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        font-family: 'Outfit', sans-serif !important;
      }

      .timestamp-info {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        color: #6b7280 !important;
        font-size: 12px !important;
        font-family: 'Outfit', sans-serif !important;
      }

      .expand-icon {
        transition: transform 0.3s ease !important;
        font-size: 12px !important;
        color: #9ca3af !important;
      }

      .card-content {
        padding: 20px !important;
      }

      .claim-section, .reasoning-section {
        margin-bottom: 16px !important;
      }

      .claim-label, .reasoning-label {
        font-family: 'Quicksand', sans-serif !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        margin-bottom: 8px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
      }

      .claim-text {
        font-family: 'Outfit', sans-serif !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        color: #1f2937 !important;
        line-height: 1.6 !important;
        font-style: italic !important;
        background: #f8fafc !important;
        padding: 12px 16px !important;
        border-radius: 12px !important;
        border-left: 4px solid #667eea !important;
      }

      .reasoning-text {
        font-family: 'Outfit', sans-serif !important;
        font-size: 14px !important;
        font-weight: 400 !important;
        color: #4b5563 !important;
        line-height: 1.6 !important;
      }

      .card-sources {
        border-top: 1px solid #e5e7eb !important;
        background: #f9fafb !important;
        animation: slideDown 0.3s ease !important;
      }

      @keyframes slideDown {
        from { opacity: 0; max-height: 0; }
        to { opacity: 1; max-height: 500px; }
      }

      .sources-content {
        padding: 20px !important;
      }

      .sources-label {
        font-family: 'Quicksand', sans-serif !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        margin-bottom: 16px !important;
      }

      .source-item {
        display: flex !important;
        justify-content: space-between !important;
        margin-bottom: 12px !important;
        padding: 8px 0 !important;
        border-bottom: 1px solid #f3f4f6 !important;
      }

      .source-type {
        font-family: 'Quicksand', sans-serif !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #6b7280 !important;
        text-transform: uppercase !important;
        width: 120px !important;
        flex-shrink: 0 !important;
      }

      .source-value {
        font-family: 'Outfit', sans-serif !important;
        font-size: 13px !important;
        color: #374151 !important;
        text-align: right !important;
        line-height: 1.4 !important;
      }

      /* Error and loading states */
      .error-container, .no-results, .loading {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        padding: 40px 20px !important;
        text-align: center !important;
        font-family: 'Outfit', sans-serif !important;
      }

      .error-icon, .no-results-icon {
        font-size: 48px !important;
        margin-bottom: 16px !important;
      }

      .loading-spinner {
        width: 40px !important;
        height: 40px !important;
        border: 3px solid #f3f4f6 !important;
        border-top: 3px solid #667eea !important;
        border-radius: 50% !important;
        animation: spin 1s linear infinite !important;
        margin-bottom: 16px !important;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .retry-btn {
        background: #667eea !important;
        color: white !important;
        border: none !important;
        padding: 10px 20px !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        font-weight: 500 !important;
        font-family: 'Quicksand', sans-serif !important;
        transition: background 0.2s ease !important;
      }

      .retry-btn:hover {
        background: #5a67d8 !important;
      }

      /* Cache notice */
      .cache-notice {
        padding: 12px 20px !important;
        background: #fef3c7 !important;
        border-bottom: 1px solid #f59e0b !important;
        color: #92400e !important;
        font-size: 13px !important;
        text-align: center !important;
        font-weight: 500 !important;
        font-family: 'Outfit', sans-serif !important;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .fact-check-btn {
          border-color: rgba(255, 255, 255, 0.2) !important;
          color: #f1f1f1 !important;
        }
        
        .fact-check-sidebar {
          background: #1f2937 !important;
          border-color: #374151 !important;
        }

        .sidebar-header {
          background: #111827 !important;
          border-color: #374151 !important;
        }

        .sidebar-header h3 {
          color: #f9fafb !important;
        }

        .fact-card {
          background: #1f2937 !important;
          border-color: #374151 !important;
        }

        .card-header {
          background: #111827 !important;
          border-color: #374151 !important;
        }

        .claim-text {
          background: #111827 !important;
          color: #e5e7eb !important;
        }

        .reasoning-text, .source-value {
          color: #d1d5db !important;
        }
      }
    `;
  }

  updateTheme(isDark) {
    // Can be used to dynamically update theme
    if (!this.styleElement) return;
    
    // Add theme-specific overrides if needed
    const themeOverrides = isDark ? this.getDarkThemeOverrides() : this.getLightThemeOverrides();
    
    // You could append theme-specific styles here
    console.log(`Theme updated to: ${isDark ? 'dark' : 'light'}`);
  }

  getDarkThemeOverrides() {
    return `
      /* Additional dark theme overrides */
    `;
  }

  getLightThemeOverrides() {
    return `
      /* Additional light theme overrides */
    `;
  }
}