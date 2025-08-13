// ResultsRenderer.js - Handles rendering of fact-check results
// Creates HTML for results display and manages interactive elements

export class ResultsRenderer {
  constructor() {
    this.expandedCards = new Set();
  }

  render(results, cached = false) {
    if (!results || results.length === 0) {
      return this.renderNoResults();
    }

    const cacheNotice = cached ? 
      '<div class="cache-notice">📋 Cached results (click refresh for new analysis)</div>' : '';
    
    const totalClaims = results.length;
    const accurateClaims = results.filter(r => ['True', 'Mostly True'].includes(r.status)).length;
    const avgConfidence = Math.round(results.reduce((sum, r) => sum + r.confidence, 0) / results.length);

    const resultsHTML = results.map((result, index) => this.renderFactCheckCard(result, index)).join('');

    return `
      ${cacheNotice}
      <div class="results-summary">
        <div class="summary-title">📊 Analysis Results</div>
        <div class="summary-stats">
          <span class="stat">${totalClaims} Claims</span>
          <span class="stat" style="color: #10b981;">${accurateClaims} Accurate</span>
          <span class="stat">Avg: ${avgConfidence}% Confidence</span>
        </div>
      </div>
      <div class="results-cards">
        ${resultsHTML}
      </div>
    `;
  }

  renderFactCheckCard(result, index) {
    const statusClass = this.getStatusClass(result.status);
    const statusIcon = this.getStatusIcon(result.status);
    const cardId = `fact-card-${index}`;
    
    return `
      <div class="fact-card ${statusClass}" id="${cardId}" data-card-index="${index}">
        <div class="card-header" onclick="window.factCheckerManager?.factChecker?.resultsRenderer?.toggleCard(${index})">
          <div class="status-info">
            <span class="status-badge">
              <span class="status-icon">${statusIcon}</span>
              <span class="status-text">${result.status}</span>
            </span>
            <span class="confidence-score">${result.confidence}%</span>
          </div>
          <div class="timestamp-info">
            <span class="timestamp">${result.timestamp || 'Unknown time'}</span>
            <span class="expand-icon">▼</span>
          </div>
        </div>
        
        <div class="card-content">
          <div class="claim-section">
            <h4 class="claim-label">Fact Claimed:</h4>
            <p class="claim-text">"${this.escapeHtml(result.claim)}"</p>
          </div>
          
          <div class="reasoning-section">
            <h4 class="reasoning-label">Analysis:</h4>
            <p class="reasoning-text">${this.escapeHtml(result.reasoning || result.explanation)}</p>
          </div>
        </div>
        
        <div class="card-sources" id="sources-${index}" style="display: none;">
          <div class="sources-content">
            <h4 class="sources-label">📚 Sources & Evidence</h4>
            
            <div class="source-item">
              <span class="source-type">Evidence Type:</span>
              <span class="source-value">${this.formatEvidenceType(result.evidenceType)}</span>
            </div>
            
            <div class="source-item">
              <span class="source-type">Verification Method:</span>
              <span class="source-value">${this.escapeHtml(result.verificationMethod)}</span>
            </div>
            
            <div class="source-item">
              <span class="source-type">Sources:</span>
              <span class="source-value">${this.escapeHtml(result.sources)}</span>
            </div>
            
            ${result.context ? `
            <div class="source-item">
              <span class="source-type">Context:</span>
              <span class="source-value">${this.escapeHtml(result.context)}</span>
            </div>
            ` : ''}
            
            <div class="source-item">
              <span class="source-type">Last Verified:</span>
              <span class="source-value">${this.escapeHtml(result.lastVerified)}</span>
            </div>
            
            ${result.groundingUsed ? `
            <div class="source-item grounding-used">
              <span class="source-type">🌐 Real-time Search:</span>
              <span class="source-value">Used for verification</span>
            </div>
            ` : ''}
            
            <div class="reliability-info">
              <span class="reliability-label">Reliability Score:</span>
              <span class="reliability-score">${result.reliabilityScore || 'N/A'}/100</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderNoResults() {
    return `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <h4>No Verifiable Claims Found</h4>
        <p>This video may contain primarily opinion-based content or the analysis didn't find specific factual claims that meet the confidence threshold.</p>
      </div>
    `;
  }

  renderError(message, onRetry = null) {
    const retryButton = onRetry ? `
      <button class="retry-btn" onclick="(${onRetry.toString()})()">
        Retry Analysis
      </button>
    ` : '';

    return `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <h4>Analysis Error</h4>
          <p>${this.escapeHtml(message)}</p>
          ${retryButton}
        </div>
      </div>
    `;
  }

  setupInteractivity() {
    // Setup card click handlers after content is rendered
    const cards = document.querySelectorAll('.fact-card');
    cards.forEach(card => {
      const cardIndex = parseInt(card.getAttribute('data-card-index'));
      const header = card.querySelector('.card-header');
      
      if (header) {
        // Remove existing listeners and add new ones
        header.replaceWith(header.cloneNode(true));
        const newHeader = card.querySelector('.card-header');
        newHeader.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleCard(cardIndex);
        });
      }
    });
  }

  toggleCard(cardIndex) {
    const card = document.getElementById(`fact-card-${cardIndex}`);
    const sources = document.getElementById(`sources-${cardIndex}`);
    const expandIcon = card?.querySelector('.expand-icon');
    
    if (!card || !sources || !expandIcon) return;
    
    const isExpanded = this.expandedCards.has(cardIndex);
    
    if (isExpanded) {
      // Collapse
      sources.style.display = 'none';
      expandIcon.style.transform = 'rotate(0deg)';
      expandIcon.textContent = '▼';
      card.classList.remove('expanded');
      this.expandedCards.delete(cardIndex);
    } else {
      // Expand
      sources.style.display = 'block';
      expandIcon.style.transform = 'rotate(180deg)';
      expandIcon.textContent = '▲';
      card.classList.add('expanded');
      this.expandedCards.add(cardIndex);
    }
  }

  formatEvidenceType(evidenceType) {
    const typeMap = {
      'real_time_search': '🌐 Real-time Search',
      'official_record': '📋 Official Record',
      'scientific_study': '🔬 Scientific Study',
      'government_data': '🏛️ Government Data',
      'news_report': '📰 News Report',
      'company_filing': '📊 Company Filing',
      'statistical_agency': '📈 Statistical Agency',
      'other': '📄 Other Sources',
      'general': '📄 General Sources'
    };
    return typeMap[evidenceType] || '📄 ' + evidenceType;
  }

  getStatusClass(status) {
    const statusMap = {
      'True': 'status-true',
      'Mostly True': 'status-mostly-true',
      'Partly True': 'status-partly-true',
      'False': 'status-false',
      'Misleading': 'status-misleading',
      'Unverifiable': 'status-unverifiable'
    };
    return statusMap[status] || 'status-unknown';
  }

  getStatusIcon(status) {
    const iconMap = {
      'True': '✅',
      'Mostly True': '✅',
      'Partly True': '⚠️',
      'False': '❌',
      'Misleading': '⚠️',
      'Unverifiable': '❓'
    };
    return iconMap[status] || '❓';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup() {
    this.expandedCards.clear();
  }
}