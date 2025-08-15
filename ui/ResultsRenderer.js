// Enhanced ResultsRenderer.js - Now shows transcript processing information
// Displays processing stats and enhanced analysis details

export class ResultsRenderer {
  constructor() {
    this.expandedCards = new Set();
    this.injectStyles(); // Add custom styles for better appearance
  }

  injectStyles() {
    // Check if styles already injected
    if (document.getElementById('fact-check-results-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'fact-check-results-styles';
    styles.textContent = `
      /* Fact-Check Results Enhanced Styling */
      .fact-check-sidebar {
        width: 440px !important; /* Increased by 10% from ~400px */
      }

      /* Light Mode Styles */
      .cache-notice {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 1px solid #0ea5e9;
        color: #0369a1;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
        font-weight: 500;
      }

      .results-summary {
        background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .summary-title {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .summary-stats {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }

      .stat {
        background: #f1f5f9;
        color: #475569;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        border: 1px solid #e2e8f0;
      }

      .fact-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        margin-bottom: 16px;
        overflow: hidden;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
      }

      .fact-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transform: translateY(-1px);
      }

      .card-header {
        padding: 16px 20px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        border-bottom: 1px solid #f1f5f9;
      }

      .card-header:hover {
        background: #f8fafc;
      }

      .status-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }

      .status-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 14px;
      }

      .confidence-score {
        background: #f1f5f9;
        color: #475569;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: help;
        border: 1px solid #e2e8f0;
      }

      .expand-icon {
        color: #64748b;
        font-size: 12px;
        transition: transform 0.2s ease;
        margin-left: 12px;
      }

      .card-content {
        padding: 20px;
        background: #fefefe;
      }

      .claim-section, .reasoning-section {
        margin-bottom: 16px;
      }

      .claim-label, .reasoning-label {
        font-size: 14px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 8px;
      }

      .claim-text {
        font-size: 15px;
        line-height: 1.6;
        color: #1f2937;
        font-style: italic;
        background: #f9fafb;
        padding: 12px;
        border-left: 3px solid #6b7280;
        border-radius: 6px;
      }

      .reasoning-text {
        font-size: 14px;
        line-height: 1.6;
        color: #374151;
      }

      .card-sources {
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        padding: 20px;
      }

      .sources-label {
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 16px;
      }

      .source-item {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #e2e8f0;
        transition: none; /* Remove transitions */
      }

      .source-item:last-child {
        border-bottom: none;
      }

      /* Remove hover effects for sources in light mode */
      .source-item:hover {
        background: transparent;
        transform: none;
      }

      .source-type {
        font-weight: 500;
        color: #64748b;
        font-size: 13px;
        min-width: 140px;
      }

      .source-value {
        color: #374151;
        font-size: 13px;
        text-align: right;
        flex: 1;
        margin-left: 12px;
      }

      .reliability-info {
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }

      .reliability-score {
        font-weight: 600;
        color: #059669;
        cursor: help;
      }

      /* Status Colors */
      .status-true .status-badge { color: #059669; }
      .status-mostly-true .status-badge { color: #0891b2; }
      .status-partly-true .status-badge { color: #d97706; }
      .status-false .status-badge { color: #dc2626; }
      .status-misleading .status-badge { color: #ea580c; }
      .status-unverifiable .status-badge { color: #6b7280; }

      .status-true { border-left: 4px solid #059669; }
      .status-mostly-true { border-left: 4px solid #0891b2; }
      .status-partly-true { border-left: 4px solid #d97706; }
      .status-false { border-left: 4px solid #dc2626; }
      .status-misleading { border-left: 4px solid #ea580c; }
      .status-unverifiable { border-left: 4px solid #6b7280; }

      /* No Results Styling */
      .no-results {
        text-align: center;
        padding: 40px 20px;
        color: #6b7280;
        background: #f9fafb;
        border-radius: 12px;
        border: 1px solid #e5e7eb;
      }

      .no-results-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.7;
      }

      .no-results h4 {
        color: #374151;
        margin-bottom: 8px;
        font-size: 18px;
      }

      .no-results p {
        line-height: 1.6;
        max-width: 300px;
        margin: 0 auto;
      }

      /* Error Styling */
      .error-container {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 12px;
        padding: 24px;
        text-align: center;
      }

      .error-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .error-content h4 {
        color: #dc2626;
        margin-bottom: 12px;
        font-size: 18px;
      }

      .error-content p {
        color: #7f1d1d;
        line-height: 1.6;
        margin-bottom: 16px;
      }

      .retry-btn {
        background: #dc2626;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .retry-btn:hover {
        background: #b91c1c;
      }

      /* Dark Mode Styles - Both system preference AND manual dark mode */
      @media (prefers-color-scheme: dark),
      .dark-mode,
      [data-dark-mode="true"],
      html[data-theme="dark"],
      body.dark-mode,
      .yt-spec-base-background[dark] {
        .cache-notice {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
          border: 1px solid #0ea5e9 !important;
          color: #38bdf8 !important;
        }

        .results-summary {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
          border: 1px solid #475569 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
        }

        .summary-title {
          color: #f1f5f9 !important;
        }

        .stat {
          background: #475569 !important;
          color: #e2e8f0 !important;
          border: 1px solid #64748b !important;
        }

        .fact-card {
          background: #1e293b !important;
          border: 1px solid #475569 !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
        }

        .fact-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
          border-color: #64748b !important;
        }

        .card-header {
          border-bottom: 1px solid #475569 !important;
          background: #1e293b !important;
        }

        .card-header:hover {
          background: #334155 !important;
        }

        .confidence-score {
          background: #475569 !important;
          color: #e2e8f0 !important;
          border: 1px solid #64748b !important;
        }

        .confidence-score:hover {
          background: #64748b !important;
          color: #f1f5f9 !important;
        }

        .expand-icon {
          color: #94a3b8 !important;
        }

        .card-content {
          background: #334155 !important;
        }

        .claim-label, .reasoning-label {
          color: #f1f5f9 !important;
        }

        .claim-text {
          color: #f1f5f9 !important;
          background: #1e293b !important;
          border-left: 3px solid #64748b !important;
        }

        .reasoning-text {
          color: #e2e8f0 !important;
        }

        .card-sources {
          background: #334155 !important;
          border-top: 1px solid #475569 !important;
        }

        .sources-label {
          color: #f1f5f9 !important;
          border-bottom: 2px solid #475569 !important;
          padding-bottom: 8px !important;
          margin-bottom: 16px !important;
        }

        .source-item {
          border-bottom: 1px solid #475569 !important;
          padding: 12px 0 !important;
        }

        .source-item:last-child {
          border-bottom: none !important;
        }

        /* Remove hover effects for sources in dark mode */
        .source-item:hover {
          background: transparent !important;
          border-radius: 0 !important;
          margin: 0 !important;
          padding: 12px 0 !important;
        }

        .source-type {
          color: #cbd5e1 !important;
          font-weight: 600 !important;
        }

        .source-value {
          color: #f1f5f9 !important;
        }

        .reliability-info {
          background: #1e293b !important;
          border: 1px solid #475569 !important;
        }

        .reliability-label {
          color: #cbd5e1 !important;
          font-weight: 600 !important;
        }

        .reliability-score {
          color: #34d399 !important;
          font-weight: 700 !important;
        }

        .reliability-score:hover {
          color: #10b981 !important;
        }

        /* Enhanced Dark Mode Status Colors */
        .status-true .status-badge { color: #34d399 !important; }
        .status-mostly-true .status-badge { color: #22d3ee !important; }
        .status-partly-true .status-badge { color: #fbbf24 !important; }
        .status-false .status-badge { color: #f87171 !important; }
        .status-misleading .status-badge { color: #fb923c !important; }
        .status-unverifiable .status-badge { color: #94a3b8 !important; }

        /* Dark mode status border colors */
        .status-true { border-left: 4px solid #34d399 !important; }
        .status-mostly-true { border-left: 4px solid #22d3ee !important; }
        .status-partly-true { border-left: 4px solid #fbbf24 !important; }
        .status-false { border-left: 4px solid #f87171 !important; }
        .status-misleading { border-left: 4px solid #fb923c !important; }
        .status-unverifiable { border-left: 4px solid #94a3b8 !important; }

        /* Dark Mode No Results */
        .no-results {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
          border: 1px solid #475569 !important;
          color: #cbd5e1 !important;
        }

        .no-results-icon {
          opacity: 0.8 !important;
          filter: brightness(1.2) !important;
        }

        .no-results h4 {
          color: #f1f5f9 !important;
        }

        .no-results p {
          color: #cbd5e1 !important;
        }

        /* Dark Mode Error */
        .error-container {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
          border: 1px solid #ef4444 !important;
        }

        .error-icon {
          filter: brightness(1.1) !important;
        }

        .error-content h4 {
          color: #fca5a5 !important;
        }

        .error-content p {
          color: #e2e8f0 !important;
        }

        .retry-btn {
          background: #ef4444 !important;
          color: #ffffff !important;
          border: 1px solid #dc2626 !important;
        }

        .retry-btn:hover {
          background: #dc2626 !important;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3) !important;
        }

        /* Dark mode scrollbar styling */
        .card-sources::-webkit-scrollbar {
          width: 6px !important;
        }

        .card-sources::-webkit-scrollbar-track {
          background: #1e293b !important;
        }

        .card-sources::-webkit-scrollbar-thumb {
          background: #64748b !important;
          border-radius: 3px !important;
        }

        .card-sources::-webkit-scrollbar-thumb:hover {
          background: #94a3b8 !important;
        }
      }

      /* Smooth transitions for all interactive elements */
      .fact-card, .card-header, .confidence-score, .retry-btn {
        transition: all 0.2s ease;
      }
    `;
    
    document.head.appendChild(styles);
  }

  render(results, cached = false, processedData = null) {
    return this.renderEnhanced(results, cached, processedData);
  }

  renderEnhanced(results, cached = false, processedData = null) {
    if (!results || results.length === 0) {
      return this.renderNoResults();
    }

    const cacheNotice = cached ? 
      '<div class="cache-notice">📋 Cached results (click refresh for new analysis)</div>' : '';
    
    const totalClaims = results.length;
    const accurateClaims = results.filter(r => ['True', 'Mostly True'].includes(r.status)).length;
    const avgConfidence = Math.round(results.reduce((sum, r) => sum + r.confidence, 0) / results.length);

    const resultsHTML = results.map((result, index) => this.renderCleanFactCheckCard(result, index)).join('');

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

  renderProcessingInfo(processedData, results) {
    if (!processedData) {
      return '<div class="processing-info fallback">⚠️ Standard processing used</div>';
    }

    const isEnhanced = !processedData.metadata.fallbackUsed;
    const reductionPercentage = processedData.metadata.reductionPercentage || 0;
    const segmentsCount = processedData.segments.length;
    const preIdentifiedClaims = processedData.factualClaims.length;
    const primarySubject = processedData.metadata.primarySubject || 'General';

    // Determine processing quality
    let processingQuality = 'good';
    let qualityIcon = '✅';
    let qualityText = 'Enhanced Processing';

    if (!isEnhanced) {
      processingQuality = 'fallback';
      qualityIcon = '⚠️';
      qualityText = 'Standard Processing';
    } else if (reductionPercentage > 40 && segmentsCount > 3) {
      processingQuality = 'excellent';
      qualityIcon = '🚀';
      qualityText = 'Excellent Processing';
    }

    // Check if results used enhanced features
    const enhancedResults = results.filter(r => r.preIdentified || r.segmentBased || r.enhancedProcessing).length;
    const enhancedPercentage = results.length > 0 ? Math.round((enhancedResults / results.length) * 100) : 0;

    return `
      <div class="processing-info ${processingQuality}">
        <div class="processing-header">
          <span class="processing-icon">${qualityIcon}</span>
          <span class="processing-title">${qualityText}</span>
          <button class="processing-toggle" onclick="this.parentElement.parentElement.querySelector('.processing-details').style.display = this.parentElement.parentElement.querySelector('.processing-details').style.display === 'none' ? 'block' : 'none'; this.textContent = this.textContent === '▼' ? '▲' : '▼';">▼</button>
        </div>
        <div class="processing-details" style="display: none;">
          <div class="processing-grid">
            <div class="processing-stat">
              <span class="stat-label">Text Optimization:</span>
              <span class="stat-value">${reductionPercentage}% reduction</span>
            </div>
            <div class="processing-stat">
              <span class="stat-label">Content Segments:</span>
              <span class="stat-value">${segmentsCount} identified</span>
            </div>
            <div class="processing-stat">
              <span class="stat-label">Pre-identified Claims:</span>
              <span class="stat-value">${preIdentifiedClaims} found</span>
            </div>
            <div class="processing-stat">
              <span class="stat-label">Primary Subject:</span>
              <span class="stat-value">${primarySubject}</span>
            </div>
            <div class="processing-stat">
              <span class="stat-label">Enhanced Analysis:</span>
              <span class="stat-value">${enhancedPercentage}% of claims</span>
            </div>
            <div class="processing-stat">
              <span class="stat-label">Original Length:</span>
              <span class="stat-value">${this.formatLength(processedData.metadata.originalLength)}</span>
            </div>
          </div>
          ${this.renderSegmentSummary(processedData.segments)}
        </div>
      </div>
    `;
  }

  renderSegmentSummary(segments) {
    if (!segments || segments.length === 0) return '';

    const factualSegments = segments.filter(s => s.type === 'factual').length;
    const highPrioritySegments = segments.filter(s => s.priority === 'high').length;
    
    const topSegments = segments
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
        if (priorityDiff !== 0) return priorityDiff;
        return (b.claimDensity || 5) - (a.claimDensity || 5);
      })
      .slice(0, 3);

    const segmentsList = topSegments.map(segment => `
      <div class="segment-item">
        <span class="segment-topic">${this.escapeHtml(segment.topic)}</span>
        <span class="segment-meta">
          <span class="segment-priority ${segment.priority}">${segment.priority}</span>
          <span class="segment-density">${segment.claimDensity}/10</span>
        </span>
      </div>
    `).join('');

    return `
      <div class="segments-summary">
        <div class="segments-header">
          <span class="segments-title">📋 Content Segments</span>
          <span class="segments-stats">${factualSegments} factual, ${highPrioritySegments} high-priority</span>
        </div>
        <div class="segments-list">
          ${segmentsList}
        </div>
      </div>
    `;
  }

  renderCleanFactCheckCard(result, index) {
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
            <span class="confidence-score" title="Confidence Level: How certain the AI is about this verification based on available evidence. Higher percentages indicate stronger evidence and more reliable sources.">${result.confidence}%</span>
          </div>
          <div class="header-right">
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
            
            <div class="reliability-info">
              <span class="reliability-label">Reliability Score:</span>
              <span class="reliability-score" title="Overall Reliability: Combines confidence level, evidence quality, source credibility, and explanation depth. Scores 80+ indicate highly reliable verification, 60-79 good reliability, below 60 suggests caution needed.">${result.reliabilityScore || 'N/A'}/100</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderEnhancedMetadata(result) {
    const metadata = [];
    
    if (result.preIdentified) {
      metadata.push(`
        <div class="source-item enhanced-feature">
          <span class="source-type">🎯 Pre-identified:</span>
          <span class="source-value">Found during transcript processing</span>
        </div>
      `);
    }
    
    if (result.segmentBased) {
      metadata.push(`
        <div class="source-item enhanced-feature">
          <span class="source-type">📋 Segment-based:</span>
          <span class="source-value">Analyzed from focused content segment</span>
        </div>
      `);
    }
    
    if (result.enhancedProcessing) {
      metadata.push(`
        <div class="source-item enhanced-feature">
          <span class="source-type">🚀 Enhanced Processing:</span>
          <span class="source-value">Used cleaned and optimized transcript</span>
        </div>
      `);
    }
    
    if (result.transcriptProcessed && result.reductionPercentage) {
      metadata.push(`
        <div class="source-item processing-info">
          <span class="source-type">📝 Text Optimization:</span>
          <span class="source-value">${result.reductionPercentage}% reduction applied</span>
        </div>
      `);
    }
    
    if (result.analysisType && result.analysisType !== 'standard') {
      metadata.push(`
        <div class="source-item processing-info">
          <span class="source-type">⚙️ Analysis Type:</span>
          <span class="source-value">${this.formatAnalysisType(result.analysisType)}</span>
        </div>
      `);
    }
    
    return metadata.join('');
  }

  getProcessingBadges(result) {
    const badges = [];
    
    if (result.preIdentified) {
      badges.push('<span class="processing-badge pre-identified" title="Pre-identified during transcript processing">🎯</span>');
    }
    
    if (result.segmentBased) {
      badges.push('<span class="processing-badge segment-based" title="Analyzed from focused content segment">📋</span>');
    }
    
    if (result.enhancedProcessing) {
      badges.push('<span class="processing-badge enhanced" title="Used enhanced transcript processing">🚀</span>');
    }
    
    if (result.groundingUsed) {
      badges.push('<span class="processing-badge grounding" title="Real-time search verification">🌐</span>');
    }
    
    return badges.length > 0 ? `<div class="processing-badges">${badges.join('')}</div>` : '';
  }

  formatAnalysisType(analysisType) {
    const typeMap = {
      'pre-identified-claims': '🎯 Pre-identified Claims',
      'segment-analysis': '📋 Segment Analysis',
      'full-transcript': '📄 Full Transcript',
      'fallback': '⚠️ Fallback Processing',
      'standard': '📝 Standard Analysis'
    };
    return typeMap[analysisType] || analysisType;
  }

  formatLength(length) {
    if (length > 1000) {
      return `${(length / 1000).toFixed(1)}k chars`;
    }
    return `${length} chars`;
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
      <button class="retry-btn" id="fact-check-retry-btn">
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

    // Setup retry button functionality
    const retryBtn = document.getElementById('fact-check-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Call the refresh analysis method through the global fact checker instance
        if (window.factCheckerManager?.factChecker?.refreshAnalysis) {
          window.factCheckerManager.factChecker.refreshAnalysis();
        } else {
          console.error('Fact checker instance not available for retry');
          // Fallback: reload the page
          location.reload();
        }
      });
    }
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
    // Handle multiple evidence types separated by pipes
    if (evidenceType && evidenceType.includes('|')) {
      const types = evidenceType.split('|').map(type => type.trim());
      const formattedTypes = types.map(type => {
        const typeMap = {
          'real_time_search': 'Real-time Search',
          'official_record': 'Official Record',
          'scientific_study': 'Scientific Study',
          'government_data': 'Government Data',
          'news_report': 'News Report',
          'company_filing': 'Company Filing',
          'statistical_agency': 'Statistical Agency',
          'other': 'Other Sources',
          'general': 'General Sources'
        };
        return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      });
      
      // Use the first/primary type with an appropriate icon
      const primaryType = types[0];
      const iconMap = {
        'real_time_search': '🌐',
        'official_record': '📋',
        'scientific_study': '🔬',
        'government_data': '🏛️',
        'news_report': '📰',
        'company_filing': '📊',
        'statistical_agency': '📈',
        'other': '📄',
        'general': '📄'
      };
      
      const icon = iconMap[primaryType] || '📄';
      return `${icon} ${formattedTypes.join(' & ')}`;
    }
    
    // Handle single evidence type
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
    
    return typeMap[evidenceType] || '📄 ' + (evidenceType || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup() {
    this.expandedCards.clear();
  }
}