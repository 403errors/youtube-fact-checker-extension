// Model configurations, content patterns, and verification rules
export class ModelConfig {
  constructor() {
    this.models = {
      default: 'gemini-2.5-flash-lite',
      premium: 'gemini-2.5-flash',
      grounding: 'gemini-2.5-flash-lite',
      fallbacks: [
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash'
      ]
    };

    this.contentPatterns = {
      news: {
        keywords: ['breaking news', 'reuters', 'ap news', 'cnn', 'bbc', 'fox news', 'msnbc', 'news report', 'journalist', 'correspondent', 'press conference'],
        indicators: ['today', 'yesterday', 'this week', 'recently reported', 'according to sources']
      },
      documentary: {
        keywords: ['documentary', 'investigation', 'research shows', 'study reveals', 'scientists', 'researchers', 'academic', 'peer reviewed'],
        indicators: ['historical', 'evidence suggests', 'data indicates', 'findings show']
      },
      political: {
        keywords: ['election', 'government', 'policy', 'politician', 'congress', 'senate', 'president', 'minister', 'legislation'],
        indicators: ['according to polls', 'voting record', 'bill passed', 'official statement']
      },
      health: {
        keywords: ['health', 'medical', 'doctor', 'hospital', 'disease', 'treatment', 'vaccine', 'medication', 'symptoms'],
        indicators: ['medical study', 'clinical trial', 'fda approved', 'health experts']
      },
      science: {
        keywords: ['scientific', 'research', 'experiment', 'study', 'data', 'analysis', 'discovery', 'breakthrough'],
        indicators: ['published in', 'peer reviewed', 'journal', 'research paper']
      },
      business: {
        keywords: ['company', 'business', 'market', 'stocks', 'earnings', 'revenue', 'ceo', 'corporation'],
        indicators: ['quarterly report', 'financial statement', 'stock price', 'market cap']
      },
      technology: {
        keywords: ['technology', 'tech', 'software', 'hardware', 'ai', 'algorithm', 'computer', 'digital'],
        indicators: ['new release', 'update', 'beta version', 'specs', 'performance']
      },
      opinion: {
        keywords: ['opinion', 'commentary', 'editorial', 'analysis', 'perspective', 'viewpoint', 'think', 'believe'],
        indicators: ['in my opinion', 'i think', 'i believe', 'personally', 'my take']
      }
    };

    this.contentTypeRules = {
      news: `NEWS CONTENT VERIFICATION RULES:
- Verify against current news agencies (Reuters, AP, BBC, CNN, etc.)
- Check official government statements and press releases  
- Cross-reference with multiple news sources
- Validate dates, locations, casualty figures, quotes
- Check election results, poll numbers, political statements
- Verify economic data and market information`,

      documentary: `DOCUMENTARY VERIFICATION RULES:
- Verify historical facts with academic and authoritative sources
- Check scientific claims against peer-reviewed research
- Validate statistics with original research papers
- Cross-reference with encyclopedias and databases
- Verify expert credentials and institutional affiliations
- Check archival accuracy and timeline consistency`,

      political: `POLITICAL VERIFICATION RULES:
- Verify voting records and legislative history
- Check policy statements against official documents
- Validate campaign promises and political statements
- Cross-reference with government databases
- Check election results and polling accuracy
- Verify biographical information about political figures`,

      health: `HEALTH VERIFICATION RULES:
- Verify medical claims with peer-reviewed studies
- Check drug information with FDA/medical authority records
- Validate statistics with CDC, WHO, health agency data
- Cross-reference with medical journals and research
- Verify doctor credentials and institutional affiliations
- Check clinical trial results and methodology`,

      science: `SCIENCE VERIFICATION RULES:
- Verify with peer-reviewed scientific journals
- Check experimental results and methodology
- Validate statistical claims and data interpretation
- Cross-reference with scientific institutions
- Verify researcher credentials and affiliations
- Check scientific consensus on topics`,

      business: `BUSINESS VERIFICATION RULES:
- Verify financial data with SEC filings and reports
- Check market data with financial databases
- Validate merger and acquisition information
- Cross-reference with business news and records
- Verify executive information and company structure
- Check stock prices, market caps, financial metrics`,

      technology: `TECHNOLOGY VERIFICATION RULES:
- Verify technical specifications with official documentation
- Check product release dates and features
- Validate performance claims and benchmarks
- Cross-reference with tech publications and reviews
- Verify company information and statements
- Check patent information and innovations`,

      general: `GENERAL VERIFICATION RULES:
- Apply universal verification standards
- Focus on most verifiable claims
- Use appropriate sources based on claim type
- Maintain consistent methodology
- Prioritize factual accuracy over quantity`
    };
  }

  getDefault() {
    return this.models.default;
  }

  getPremium() {
    return this.models.premium;
  }

  getGrounding() {
    return this.models.grounding;
  }

  getFallbacks() {
    return this.models.fallbacks;
  }

  selectModel(settings) {
    if (settings.useGroundingSearch) {
      return this.models.grounding;
    }
    return settings.usePremiumModel ? this.models.premium : this.models.default;
  }

  supportsGrounding(model) {
    // Only 1.5 series models support grounding search
    return model.includes('1.5-flash') || model.includes('1.5-pro');
  }

  getContentPatterns() {
    return this.contentPatterns;
  }

  getContentTypeRules(contentType) {
    return this.contentTypeRules[contentType] || this.contentTypeRules.general;
  }

  getModelInfo(modelName) {
    const info = {
      'gemini-2.5-flash': {
        name: 'Gemini 2.5 Flash',
        description: 'Latest premium model with enhanced reasoning and superior fact-checking capabilities',
        features: ['Advanced reasoning', 'High accuracy', 'Fast processing'],
        supportsGrounding: false
      },
      'gemini-2.5-flash-lite': {
        name: 'Gemini 2.5 Flash Lite',
        description: 'Efficient model optimized for speed with excellent fact-checking performance',
        features: ['Optimized speed', 'Good accuracy', 'Resource efficient'],
        supportsGrounding: false
      },
      'gemini-2.0-flash': {
        name: 'Gemini 2.0 Flash',
        description: 'Reliable fallback model with proven performance',
        features: ['Proven reliability', 'Good performance', 'Stable results'],
        supportsGrounding: false
      },
      'gemini-2.0-flash-lite': {
        name: 'Gemini 2.0 Flash Lite',
        description: 'Lightweight fallback option for basic fact-checking',
        features: ['Lightweight', 'Basic accuracy', 'Fast response'],
        supportsGrounding: false
      }
    };

    return info[modelName] || {
      name: modelName,
      description: 'Unknown model',
      features: [],
      supportsGrounding: false
    };
  }
}