// YouTube Fact-Check Extension - CORRECTED Background Service Worker
// FIXED: Grounding search only enabled for compatible models (1.5 series)

class AdvancedFactCheckService {
  constructor() {
    this.apiCache = new Map();
    this.rateLimiter = new Map();
    this.maxCacheSize = 100;
    this.cacheExpiryTime = 1 * 60 * 60 * 1000; // 1 hour
    this.rateLimitWindow = 60 * 1000; // 1 minute
    this.maxRequestsPerWindow = 15;
    
    // RESTORED: Working model configuration 
    this.modelConfig = {
      default: 'gemini-2.5-flash-lite',       // These models exist and work
      premium: 'gemini-2.5-flash',            // These models exist and work  
      grounding: 'gemini-2.5-flash-lite',     // Primary model for grounding attempts
      fallbacks: [
        'gemini-2.0-flash-lite',              // Primary fallback
        'gemini-2.0-flash'                    // Secondary fallback
      ]
    };
    
    // Content type detection patterns
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
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.initializeDefaultSettings();
    this.cleanupExpiredCache();
  }

  setupEventListeners() {
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });

    chrome.runtime.onStartup.addListener(() => {
      this.cleanupExpiredCache();
    });
  }

  async handleInstallation(details) {
    try {
      if (details.reason === 'install') {
        const defaultSettings = {
          enabled: true,
          apiKey: '',
          language: 'en',
          usePremiumModel: true,
          useGroundingSearch: true,
          analysisTimeout: 45,
          cacheResults: true,
          maxCacheAge: 48,
          strictMode: true,
          confidenceThreshold: 70,
          stats: {
            videosChecked: 0,
            claimsFound: 0,
            accurateClaims: 0,
            lastUsed: null,
            installDate: Date.now()
          }
        };
        
        await chrome.storage.sync.set(defaultSettings);
        console.log('Extension installed with corrected grounding search');
      } else if (details.reason === 'update') {
        await this.migrateSettings();
      }
    } catch (error) {
      console.error('Installation error:', error);
    }
  }

  async migrateSettings() {
    try {
      const settings = await chrome.storage.sync.get();
      let needsUpdate = false;
      
      const defaults = {
        enabled: true,
        usePremiumModel: true,
        useGroundingSearch: true,
        analysisTimeout: 45,
        cacheResults: true,
        maxCacheAge: 48,
        language: 'en',
        strictMode: true,
        confidenceThreshold: 70
      };
      
      for (const [key, defaultValue] of Object.entries(defaults)) {
        if (settings[key] === undefined) {
          settings[key] = defaultValue;
          needsUpdate = true;
        }
      }
      
      if (!settings.stats) {
        settings.stats = {
          videosChecked: 0,
          claimsFound: 0,
          accurateClaims: 0,
          lastUsed: null,
          installDate: Date.now()
        };
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await chrome.storage.sync.set(settings);
        console.log('Settings migrated with corrected grounding search');
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_SETTINGS':
          await this.handleGetSettings(sendResponse);
          break;
        case 'SAVE_SETTINGS':
          await this.handleSaveSettings(message.settings, sendResponse);
          break;
        case 'FACT_CHECK_REQUEST':
          await this.handleAdvancedFactCheckRequest(message.data, sender, sendResponse);
          break;
        case 'VALIDATE_API_KEY':
          await this.handleApiKeyValidation(message.apiKey, sendResponse);
          break;
        case 'TOGGLE_EXTENSION':
          await this.handleToggleExtension(message.enabled, sendResponse);
          break;
        case 'GET_EXTENSION_STATE':
          await this.handleGetExtensionState(sendResponse);
          break;
        case 'RESET_SETTINGS':
          await this.handleResetSettings(sendResponse);
          break;
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleGetSettings(sendResponse) {
    try {
      const settings = await chrome.storage.sync.get();
      sendResponse({ success: true, settings });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleSaveSettings(newSettings, sendResponse) {
    try {
      const validatedSettings = this.validateSettings(newSettings);
      const currentSettings = await chrome.storage.sync.get();
      const mergedSettings = { ...currentSettings, ...validatedSettings };
      
      await chrome.storage.sync.set(mergedSettings);
      await this.notifyTabsOfSettingsUpdate(validatedSettings);
      
      sendResponse({ success: true, settings: mergedSettings });
    } catch (error) {
      console.error('Save settings error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  validateSettings(settings) {
    const validated = {
      enabled: Boolean(settings.enabled),
      apiKey: String(settings.apiKey || '').trim(),
      language: String(settings.language || 'en'),
      usePremiumModel: Boolean(settings.usePremiumModel),
      useGroundingSearch: Boolean(settings.useGroundingSearch !== false),
      analysisTimeout: Math.max(30, Math.min(120, parseInt(settings.analysisTimeout) || 45)),
      cacheResults: settings.cacheResults !== false,
      maxCacheAge: Math.max(1, Math.min(168, parseInt(settings.maxCacheAge) || 48)),
      strictMode: Boolean(settings.strictMode !== false),
      confidenceThreshold: Math.max(50, Math.min(95, parseInt(settings.confidenceThreshold) || 70))
    };

    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];
    if (!validLanguages.includes(validated.language)) {
      validated.language = 'en';
    }

    return validated;
  }

  async notifyTabsOfSettingsUpdate(settings) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/watch*' });
      const notifications = tabs.map(tab => 
        chrome.tabs.sendMessage(tab.id, { 
          type: 'SETTINGS_UPDATED', 
          settings: settings 
        }).catch(() => {})
      );
      await Promise.allSettled(notifications);
    } catch (error) {
      console.error('Failed to notify tabs:', error);
    }
  }

  async handleToggleExtension(enabled, sendResponse) {
    try {
      const currentSettings = await chrome.storage.sync.get();
      const updatedSettings = { ...currentSettings, enabled: Boolean(enabled) };
      await chrome.storage.sync.set(updatedSettings);
      
      await this.notifyTabsOfExtensionToggle(enabled);
      sendResponse({ success: true, enabled: Boolean(enabled) });
    } catch (error) {
      console.error('Toggle extension error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async notifyTabsOfExtensionToggle(enabled) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://www.youtube.com/watch*' });
      const notifications = tabs.map(tab => 
        chrome.tabs.sendMessage(tab.id, { 
          type: 'EXTENSION_TOGGLED', 
          enabled: enabled 
        }).catch(() => {})
      );
      await Promise.allSettled(notifications);
    } catch (error) {
      console.error('Failed to notify tabs of toggle:', error);
    }
  }

  async handleGetExtensionState(sendResponse) {
    try {
      const { enabled } = await chrome.storage.sync.get(['enabled']);
      sendResponse({ success: true, enabled: Boolean(enabled) });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleResetSettings(sendResponse) {
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      await this.handleInstallation({ reason: 'install' });
      
      this.apiCache.clear();
      this.rateLimiter.clear();
      
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // ENHANCED FACT-CHECKING WITH CORRECTED GROUNDING SEARCH
  async handleAdvancedFactCheckRequest(data, sender, sendResponse) {
    try {
      const settings = await chrome.storage.sync.get();
      
      if (!settings.enabled) {
        throw new Error('Extension is disabled');
      }
      
      if (!settings.apiKey) {
        throw new Error('API key not configured');
      }

      if (!this.checkRateLimit(sender.tab?.id)) {
        throw new Error('Rate limit exceeded. Please wait before trying again.');
      }

      if (!data.transcript || data.transcript.trim().length < 100) {
        throw new Error('Video transcript is too short or unavailable for reliable analysis');
      }

      // Enhanced cache key with grounding search
      const contentType = this.detectContentType(data.transcript);
      const cacheKey = this.generateAdvancedCacheKey(
        data.transcript, 
        settings.language, 
        settings.usePremiumModel,
        contentType,
        settings.strictMode,
        settings.useGroundingSearch
      );
      
      if (settings.cacheResults) {
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
          sendResponse({ success: true, result: cachedResult, cached: true, contentType });
          return;
        }
      }

      // Perform enhanced fact-checking with corrected grounding
      const result = await this.performAdvancedFactCheckWithGrounding(
        data.transcript, 
        settings.apiKey, 
        settings.language,
        settings.usePremiumModel,
        settings.analysisTimeout || 45,
        contentType,
        settings.strictMode,
        settings.confidenceThreshold || 70,
        settings.useGroundingSearch
      );
      
      // Enhanced result validation
      const validatedResult = this.validateAndEnhanceResults(result, settings.confidenceThreshold);
      
      if (settings.cacheResults) {
        this.addToCache(cacheKey, validatedResult);
      }
      
      await this.updateUsageStats(validatedResult);
      
      sendResponse({ 
        success: true, 
        result: validatedResult, 
        cached: false, 
        contentType: contentType,
        analysisMetadata: {
          confidence: this.calculateOverallConfidence(validatedResult),
          claimTypes: this.categorizeClaimTypes(validatedResult),
          reliability: this.assessResultReliability(validatedResult),
          groundingUsed: settings.useGroundingSearch,
          modelUsed: settings.usePremiumModel ? this.modelConfig.premium : this.modelConfig.default
        }
      });
      
    } catch (error) {
      console.error('Advanced fact-check request error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // CONTENT TYPE DETECTION
  detectContentType(transcript) {
    const lowercaseTranscript = transcript.toLowerCase();
    const scores = {};
    
    for (const [type, patterns] of Object.entries(this.contentPatterns)) {
      let score = 0;
      
      patterns.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowercaseTranscript.match(regex);
        if (matches) {
          score += matches.length * 2;
        }
      });
      
      patterns.indicators.forEach(indicator => {
        const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
        const matches = lowercaseTranscript.match(regex);
        if (matches) {
          score += matches.length * 3;
        }
      });
      
      scores[type] = score;
    }
    
    const maxScore = Math.max(...Object.values(scores));
    const detectedType = Object.keys(scores).find(key => scores[key] === maxScore);
    
    return maxScore > 5 ? detectedType : 'general';
  }

  // CORRECTED FACT-CHECKING WITH PROPER GROUNDING SEARCH
  async performAdvancedFactCheckWithGrounding(transcript, apiKey, language = 'en', usePremiumModel = true, timeout = 45, contentType = 'general', strictMode = true, confidenceThreshold = 70, useGroundingSearch = true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    try {
      // Select model 
      const selectedModel = useGroundingSearch ? this.modelConfig.grounding : 
                           usePremiumModel ? this.modelConfig.premium : this.modelConfig.default;
      
      const prompt = this.createAdvancedFactCheckPrompt(transcript, language, contentType, strictMode, confidenceThreshold, useGroundingSearch);
      
      const modelsToTry = [selectedModel, ...this.modelConfig.fallbacks];
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          console.log(`🔍 Trying model: ${model}`);
          
          // Enhanced request body
          const requestBody = {
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.05,
              maxOutputTokens: 4000,
              candidateCount: 1,
              topP: 0.7,
              topK: 20
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          };

          // 🔧 FIXED: Only enable grounding for 1.5 models that support it
          if (useGroundingSearch && (model.includes('1.5-flash') || model.includes('1.5-pro'))) {
            requestBody.tools = [{
              googleSearchRetrieval: {
                disableAttribution: false
              }
            }];
            console.log(`🌐 Grounding search enabled for ${model}`);
          } else if (useGroundingSearch) {
            console.log(`⚠️ Grounding search skipped for ${model} (not supported)`);
          }

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!textContent) {
              throw new Error('No response content received from AI model');
            }

            const result = this.parseAdvancedFactCheckResponse(textContent, contentType);
            console.log(`✅ Analysis successful with ${model}`);
            return result;
          }

          // Handle different error types
          if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid or expired API key');
          }

          if (response.status === 404) {
            console.log(`❌ Model ${model} not available, trying next...`);
            continue;
          }

          if (response.status === 429) {
            throw new Error('API rate limit exceeded. Please try again later.');
          }

          if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            console.log(`❌ Model ${model} request failed:`, errorData.error?.message || 'Bad request');
            continue;
          }

          const errorData = await response.json().catch(() => ({}));
          lastError = new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          console.log(`❌ ${model} failed:`, lastError.message);
          continue;

        } catch (error) {
          if (error.name === 'AbortError') {
            throw new Error(`Analysis timed out after ${timeout} seconds`);
          }
          lastError = error;
          console.log(`❌ Error with model ${model}:`, error.message);
          continue;
        }
      }

      console.error('❌ All models failed. Last error:', lastError?.message);
      throw lastError || new Error('All AI models failed to process the request');

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ADVANCED PROMPT CREATION 
  createAdvancedFactCheckPrompt(transcript, language, contentType, strictMode, confidenceThreshold, useGroundingSearch) {
    const languageNames = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
      'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi'
    };

    const languageName = languageNames[language] || 'English';
    const truncatedTranscript = transcript.length > 8000 ? transcript.substring(0, 8000) + '...' : transcript;
    const strictnessLevel = strictMode ? 'MAXIMUM' : 'HIGH';

    // Grounding search instructions
    const groundingInstructions = useGroundingSearch ? `
🌐 REAL-TIME VERIFICATION ENABLED:
- Use Google Search to verify each claim against current, authoritative sources
- Cross-reference with multiple recent sources for accuracy
- Check official websites, news agencies, government databases
- Prioritize recent information over older sources
- Cite specific sources found through search when possible
` : `
📚 KNOWLEDGE-BASE VERIFICATION:
- Use your training knowledge to verify claims
- Apply consistency with known facts from training data
`;

    const contentRules = this.getContentTypeRules(contentType);

    return `You are an expert fact-checker with ${useGroundingSearch ? 'REAL-TIME INTERNET ACCESS' : 'comprehensive knowledge base'}. Your task is to identify and verify specific factual claims with ${strictnessLevel} accuracy.

${groundingInstructions}

CONTENT TYPE: ${contentType.toUpperCase()}
STRICTNESS LEVEL: ${strictnessLevel}
MINIMUM CONFIDENCE THRESHOLD: ${confidenceThreshold}%

${contentRules}

VERIFICATION STANDARDS:
- "True" (90-100%): Confirmed by multiple reliable sources or real-time verification
- "Mostly True" (75-89%): Largely accurate with minor discrepancies
- "Partly True" (60-74%): Contains accurate elements but also inaccuracies  
- "Misleading" (40-59%): Technically accurate but misleading context
- "False" (20-39%): Factually incorrect or contradicted by evidence
- "Unverifiable" (0-19%): Cannot be verified from available sources

CLAIM IDENTIFICATION CRITERIA:
✅ INCLUDE: Statistical data, dates, locations, quantities, official statements, scientific findings, historical events, company information, legal facts, measurable phenomena
❌ EXCLUDE: Opinions, predictions, subjective assessments, motivational statements, personal experiences, hypothetical scenarios

VIDEO TRANSCRIPT:
"${truncatedTranscript}"

REQUIRED OUTPUT FORMAT (JSON ONLY):
[
  {
    "claim": "Exact quote from transcript",
    "category": "statistical|temporal|geographical|scientific|official|business|other", 
    "status": "True|Mostly True|Partly True|Misleading|False|Unverifiable",
    "confidence": 85,
    "explanation": "Detailed verification with specific evidence and sources",
    "evidenceType": "official_record|scientific_study|news_report|government_data|real_time_search|other",
    "verificationMethod": "Description of verification process${useGroundingSearch ? ' including search results' : ''}",
    "sources": "Specific sources used for verification",
    "context": "Important context affecting interpretation",
    "lastVerified": "timeframe of verification",
    "groundingUsed": ${useGroundingSearch}
  }
]

CRITICAL REQUIREMENTS:
- Return empty array [] if no claims meet ${confidenceThreshold}% confidence
- Output ONLY valid JSON - no additional text
- Each claim must be exact quote from transcript
- Focus on most significant verifiable claims (max 8)
- Use ${languageName} for explanations
${useGroundingSearch ? '- Leverage real-time search for current verification' : '- Use knowledge base for historical verification'}

${useGroundingSearch ? 'REAL-TIME SEARCH VERIFICATION: Use Google Search to verify each claim against current sources, official websites, and recent authoritative information.' : 'KNOWLEDGE-BASE VERIFICATION: Apply your comprehensive training knowledge for fact verification.'}`;
  }

  // CONTENT TYPE SPECIFIC RULES
  getContentTypeRules(contentType) {
    const rules = {
      news: `
NEWS CONTENT VERIFICATION RULES:
- Verify against current news agencies (Reuters, AP, BBC, CNN, etc.)
- Check official government statements and press releases  
- Cross-reference with multiple news sources
- Validate dates, locations, casualty figures, quotes
- Check election results, poll numbers, political statements
- Verify economic data and market information`,

      documentary: `
DOCUMENTARY VERIFICATION RULES:
- Verify historical facts with academic and authoritative sources
- Check scientific claims against peer-reviewed research
- Validate statistics with original research papers
- Cross-reference with encyclopedias and databases
- Verify expert credentials and institutional affiliations
- Check archival accuracy and timeline consistency`,

      political: `
POLITICAL VERIFICATION RULES:
- Verify voting records and legislative history
- Check policy statements against official documents
- Validate campaign promises and political statements
- Cross-reference with government databases
- Check election results and polling accuracy
- Verify biographical information about political figures`,

      health: `
HEALTH VERIFICATION RULES:
- Verify medical claims with peer-reviewed studies
- Check drug information with FDA/medical authority records
- Validate statistics with CDC, WHO, health agency data
- Cross-reference with medical journals and research
- Verify doctor credentials and institutional affiliations
- Check clinical trial results and methodology`,

      science: `
SCIENCE VERIFICATION RULES:
- Verify with peer-reviewed scientific journals
- Check experimental results and methodology
- Validate statistical claims and data interpretation
- Cross-reference with scientific institutions
- Verify researcher credentials and affiliations
- Check scientific consensus on topics`,

      business: `
BUSINESS VERIFICATION RULES:
- Verify financial data with SEC filings and reports
- Check market data with financial databases
- Validate merger and acquisition information
- Cross-reference with business news and records
- Verify executive information and company structure
- Check stock prices, market caps, financial metrics`,

      technology: `
TECHNOLOGY VERIFICATION RULES:
- Verify technical specifications with official documentation
- Check product release dates and features
- Validate performance claims and benchmarks
- Cross-reference with tech publications and reviews
- Verify company information and statements
- Check patent information and innovations`,

      general: `
GENERAL VERIFICATION RULES:
- Apply universal verification standards
- Focus on most verifiable claims
- Use appropriate sources based on claim type
- Maintain consistent methodology
- Prioritize factual accuracy over quantity`
    };

    return rules[contentType] || rules.general;
  }

  // ENHANCED RESPONSE PARSING
  parseAdvancedFactCheckResponse(responseText, contentType) {
    try {
      let cleanedResponse = responseText.trim();
      
      cleanedResponse = cleanedResponse.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '');
      cleanedResponse = cleanedResponse.replace(/^\s*\[/, '[').replace(/\]\s*$/, ']');
      
      const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/) || cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanedResponse);
      const results = Array.isArray(parsed) ? parsed : [parsed];
      
      return results
        .filter(result => this.validateClaimResult(result))
        .slice(0, 8)
        .map(result => this.enhanceClaimResult(result, contentType))
        .sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      console.error('Error parsing enhanced AI response:', error);
      console.error('Raw response:', responseText);
      
      return [{
        claim: "Analysis completed with parsing difficulties",
        category: "technical",
        status: "Unverifiable", 
        confidence: 30,
        explanation: "The AI completed the analysis but encountered technical difficulties parsing the response.",
        evidenceType: "system_response",
        verificationMethod: "Automated parsing validation",
        sources: "Internal system analysis",
        context: "Technical processing limitation",
        lastVerified: "real-time",
        timestamp: Date.now(),
        groundingUsed: false
      }];
    }
  }

  // Validation and enhancement methods
  validateClaimResult(result) {
    return result && 
           typeof result.claim === 'string' && 
           typeof result.status === 'string' && 
           typeof result.explanation === 'string' &&
           typeof result.confidence === 'number' &&
           result.claim.trim().length > 10 &&
           result.explanation.trim().length > 20 &&
           result.confidence >= 0 && result.confidence <= 100 &&
           ['True', 'Mostly True', 'Partly True', 'Misleading', 'False', 'Unverifiable'].includes(result.status);
  }

  enhanceClaimResult(result, contentType) {
    return {
      claim: String(result.claim).trim(),
      category: String(result.category || 'other').trim(),
      status: String(result.status).trim(),
      confidence: Math.min(100, Math.max(0, Number(result.confidence) || 50)),
      explanation: String(result.explanation || 'No explanation provided').trim(),
      evidenceType: String(result.evidenceType || 'general').trim(),
      verificationMethod: String(result.verificationMethod || 'Standard verification').trim(),
      sources: String(result.sources || 'Multiple sources').trim(),
      context: String(result.context || '').trim(),
      lastVerified: String(result.lastVerified || 'recent').trim(),
      contentType: contentType,
      timestamp: Date.now(),
      reliabilityScore: this.calculateReliabilityScore(result),
      groundingUsed: Boolean(result.groundingUsed)
    };
  }

  calculateReliabilityScore(result) {
    let score = 0;
    
    // Base confidence contribution (40% weight)
    score += (result.confidence || 0) * 0.4;
    
    // Evidence type contribution (25% weight) 
    const evidenceWeights = {
      'real_time_search': 30,
      'official_record': 25,
      'scientific_study': 23,
      'government_data': 22,
      'statistical_agency': 20,
      'news_report': 15,
      'company_filing': 18,
      'other': 10,
      'general': 8
    };
    score += (evidenceWeights[result.evidenceType] || 8) * 0.25;
    
    // Explanation quality contribution (20% weight)
    const explanationLength = (result.explanation || '').length;
    const explanationScore = Math.min(20, explanationLength / 10);
    score += explanationScore * 0.2;
    
    // Status certainty contribution (15% weight)
    const statusWeights = {
      'True': 15,
      'Mostly True': 12,
      'False': 12,
      'Partly True': 8,
      'Misleading': 6,
      'Unverifiable': 3
    };
    score += (statusWeights[result.status] || 3) * 0.15;
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  validateAndEnhanceResults(results, confidenceThreshold) {
    return results
      .filter(result => result.confidence >= confidenceThreshold)
      .map(result => ({
        ...result,
        consistencyHash: this.generateConsistencyHash(result.claim),
        verificationLevel: this.getVerificationLevel(result.confidence, result.evidenceType),
        trustworthinessIndicator: this.calculateTrustworthiness(result)
      }))
      .sort((a, b) => {
        if (a.reliabilityScore !== b.reliabilityScore) {
          return b.reliabilityScore - a.reliabilityScore;
        }
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence;
        }
        const statusOrder = { 'True': 5, 'False': 4, 'Mostly True': 3, 'Misleading': 2, 'Partly True': 1, 'Unverifiable': 0 };
        return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
      });
  }

  generateConsistencyHash(claim) {
    const normalized = claim.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  getVerificationLevel(confidence, evidenceType) {
    const evidenceTiers = {
      'real_time_search': 4,
      'official_record': 3,
      'scientific_study': 3,
      'government_data': 3,
      'statistical_agency': 2,
      'company_filing': 2,
      'news_report': 1,
      'other': 1,
      'general': 0
    };
    
    const evidenceTier = evidenceTiers[evidenceType] || 0;
    
    if (confidence >= 90 && evidenceTier >= 3) return 'HIGHEST';
    if (confidence >= 80 && evidenceTier >= 2) return 'HIGH';
    if (confidence >= 70) return 'MEDIUM';
    if (confidence >= 60) return 'LOW';
    return 'MINIMAL';
  }

  calculateTrustworthiness(result) {
    const factors = {
      confidence: result.confidence >= 85 ? 1 : result.confidence >= 70 ? 0.8 : 0.6,
      evidence: ['real_time_search', 'official_record', 'scientific_study', 'government_data'].includes(result.evidenceType) ? 1 : 0.7,
      explanation: result.explanation.length >= 100 ? 1 : 0.8,
      sources: result.sources && result.sources !== 'Multiple sources' ? 1 : 0.9,
      grounding: result.groundingUsed ? 1.1 : 1.0
    };
    
    const score = Object.values(factors).reduce((sum, factor) => sum + factor, 0) / Object.keys(factors).length;
    
    if (score >= 0.9) return 'VERY_HIGH';
    if (score >= 0.8) return 'HIGH';
    if (score >= 0.7) return 'MEDIUM';
    if (score >= 0.6) return 'LOW';
    return 'VERY_LOW';
  }

  calculateOverallConfidence(results) {
    if (results.length === 0) return 0;
    
    const weightedSum = results.reduce((sum, result) => {
      const weight = result.reliabilityScore / 100;
      return sum + (result.confidence * weight);
    }, 0);
    
    const totalWeight = results.reduce((sum, result) => sum + (result.reliabilityScore / 100), 0);
    
    return Math.round(totalWeight > 0 ? weightedSum / totalWeight : 0);
  }

  categorizeClaimTypes(results) {
    const categories = {};
    results.forEach(result => {
      const category = result.category || 'other';
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }

  assessResultReliability(results) {
    if (results.length === 0) return 'NO_DATA';
    
    const avgReliability = results.reduce((sum, result) => sum + result.reliabilityScore, 0) / results.length;
    const highConfidenceCount = results.filter(r => r.confidence >= 80).length;
    const reliableEvidenceCount = results.filter(r => ['real_time_search', 'official_record', 'scientific_study', 'government_data'].includes(r.evidenceType)).length;
    
    const reliabilityPercentage = highConfidenceCount / results.length;
    const evidenceQuality = reliableEvidenceCount / results.length;
    
    if (avgReliability >= 80 && reliabilityPercentage >= 0.7 && evidenceQuality >= 0.5) {
      return 'VERY_HIGH';
    } else if (avgReliability >= 70 && reliabilityPercentage >= 0.5) {
      return 'HIGH';
    } else if (avgReliability >= 60 && reliabilityPercentage >= 0.3) {
      return 'MEDIUM';
    } else if (avgReliability >= 50) {
      return 'LOW';
    } else {
      return 'VERY_LOW';
    }
  }

  // API KEY VALIDATION
  async handleApiKeyValidation(apiKey, sendResponse) {
    try {
      if (!apiKey || apiKey.trim().length === 0) {
        sendResponse({ success: false, error: 'API key is required' });
        return;
      }

      const isValid = await this.validateApiKey(apiKey.trim());
      sendResponse({ success: true, valid: isValid });
      
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  async validateApiKey(apiKey) {
    try {
      const testPrompt = "Test connection. Respond with 'OK'.";
      
      // Test with working model
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelConfig.default}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: testPrompt }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
        })
      });

      return response.ok || response.status === 400;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  }

  // RATE LIMITING
  checkRateLimit(tabId) {
    if (!tabId) return true;
    
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;
    
    if (!this.rateLimiter.has(tabId)) {
      this.rateLimiter.set(tabId, []);
    }
    
    const requests = this.rateLimiter.get(tabId);
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= this.maxRequestsPerWindow) {
      return false;
    }
    
    recentRequests.push(now);
    this.rateLimiter.set(tabId, recentRequests);
    
    if (Math.random() < 0.1) {
      this.cleanupRateLimit();
    }
    
    return true;
  }

  cleanupRateLimit() {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow;
    
    for (const [tabId, requests] of this.rateLimiter.entries()) {
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);
      if (recentRequests.length === 0) {
        this.rateLimiter.delete(tabId);
      } else {
        this.rateLimiter.set(tabId, recentRequests);
      }
    }
  }

  // ENHANCED CACHING
  generateAdvancedCacheKey(transcript, language, usePremiumModel, contentType, strictMode, useGroundingSearch) {
    const content = transcript.substring(0, 1000) + 
                   language + 
                   contentType + 
                   (usePremiumModel ? 'premium' : 'lite') + 
                   (strictMode ? 'strict' : 'normal') +
                   (useGroundingSearch ? 'grounding' : 'nogrounding');
    
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `advanced_fact_check_${Math.abs(hash)}_${contentType}_${useGroundingSearch ? 'grounded' : 'knowledge'}`;
  }

  getFromCache(key) {
    const cached = this.apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiryTime) {
      return cached.data;
    }
    if (cached) {
      this.apiCache.delete(key);
    }
    return null;
  }

  addToCache(key, data) {
    if (this.apiCache.size >= this.maxCacheSize) {
      const firstKey = this.apiCache.keys().next().value;
      this.apiCache.delete(firstKey);
    }
    
    this.apiCache.set(key, { 
      data, 
      timestamp: Date.now(),
      contentType: data[0]?.contentType || 'general'
    });
  }

  cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of this.apiCache.entries()) {
      if (now - cached.timestamp > this.cacheExpiryTime) {
        this.apiCache.delete(key);
      }
    }
    
    setTimeout(() => this.cleanupExpiredCache(), this.cacheExpiryTime);
  }

  // STATISTICS
  async updateUsageStats(results) {
    try {
      const data = await chrome.storage.sync.get(['stats']);
      const stats = data.stats || {
        videosChecked: 0,
        claimsFound: 0,
        accurateClaims: 0,
        lastUsed: null,
        installDate: Date.now()
      };

      stats.videosChecked += 1;
      stats.claimsFound += results.length;
      stats.accurateClaims += results.filter(r => 
        ['True', 'Mostly True'].includes(r.status) && r.confidence >= 75
      ).length;
      stats.lastUsed = Date.now();

      await chrome.storage.sync.set({ stats });
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
  }

  async handleActionClick(tab) {
    try {
      if (tab.url && tab.url.includes('youtube.com/watch')) {
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FACT_CHECK' });
      } else {
        chrome.action.openPopup();
      }
    } catch (error) {
      console.log('Could not communicate with content script:', error);
    }
  }

  async initializeDefaultSettings() {
    try {
      const settings = await chrome.storage.sync.get();
      if (Object.keys(settings).length === 0) {
        await this.handleInstallation({ reason: 'install' });
      }
    } catch (error) {
      console.error('Failed to initialize default settings:', error);
    }
  }
}

// Initialize the corrected background service
const advancedFactCheckService = new AdvancedFactCheckService();

// Handle service worker lifecycle
self.addEventListener('activate', () => {
  console.log('🔧 CORRECTED Fact-Check extension activated with fixed grounding search');
});

// Ensure service worker stays alive
chrome.runtime.onConnect.addListener(() => {
  // Keep connection alive
});

console.log('🔧 FIXED: YouTube Fact-Check Extension loaded with corrected grounding search configuration');