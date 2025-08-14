// Advanced fact-checking processing engine - Fixed to support force refresh
import { APIService } from './APIService.js';
import { SettingsManager } from '../utils/SettingsManager.js';
import { Cache } from '../utils/Cache.js';
import { StatsManager } from '../utils/StatsManager.js';
import { ModelConfig } from '../utils/ModelConfig.js';

export class FactCheckEngine {
  constructor() {
    this.apiService = new APIService();
    this.settingsManager = new SettingsManager();
    this.cache = new Cache('fact_check_results', 100, 1); // prefix, maxSize, expiryHours
    this.statsManager = new StatsManager();
    this.modelConfig = new ModelConfig();
  }

  async process(data, sender, forceRefresh = false) {
    const settings = await this.settingsManager.getAll();
    
    if (!settings.enabled) {
      throw new Error('Extension is disabled');
    }
    
    if (!settings.apiKey) {
      throw new Error('API key not configured');
    }

    if (!this.apiService.checkRateLimit(sender.tab?.id)) {
      throw new Error('Rate limit exceeded. Please wait before trying again.');
    }

    if (!data.transcript || data.transcript.trim().length < 100) {
      throw new Error('Video transcript is too short or unavailable for reliable analysis');
    }

    const contentType = this.detectContentType(data.transcript);
    const cacheKey = this.cache.generateFactCheckKey(data.transcript, settings, contentType);
    
    // Check cache ONLY if not force refreshing
    if (settings.cacheResults && !forceRefresh) {
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        console.log('📋 Using cached results (not force refresh)');
        return { success: true, result: cachedResult, cached: true, contentType };
      }
    }

    // Force refresh - skip cache completely
    if (forceRefresh) {
      console.log('🔄 Force refresh - performing fresh analysis');
      // Clear this specific cache entry
      this.cache.delete(cacheKey);
    }

    const prompt = this.createPrompt(data.transcript, settings, contentType);
    const responseText = await this.apiService.makeRequest(
      prompt, 
      settings.apiKey, 
      settings,
      settings.analysisTimeout || 45
    );
    
    const result = this.parseResponse(responseText, contentType);
    const validatedResult = this.validateResults(result, settings.confidenceThreshold);
    
    // Cache the fresh result (even after force refresh)
    if (settings.cacheResults) {
      this.cache.set(cacheKey, validatedResult);
    }
    
    await this.statsManager.update(validatedResult);
    
    return { 
      success: true, 
      result: validatedResult, 
      cached: false, // Always false for fresh analysis
      contentType: contentType,
      forceRefresh: forceRefresh,
      analysisMetadata: {
        confidence: this.calculateOverallConfidence(validatedResult),
        claimTypes: this.categorizeClaimTypes(validatedResult),
        reliability: this.assessResultReliability(validatedResult),
        groundingUsed: settings.useGroundingSearch,
        modelUsed: this.modelConfig.selectModel(settings),
        analysisTime: new Date().toISOString()
      }
    };
  }

  // Cache management methods
  clearCache(videoId) {
    if (videoId) {
      // Clear cache entries related to this video
      const keys = this.cache.keys();
      const videoKeys = keys.filter(key => key.includes(videoId) || key.includes('fact_check'));
      videoKeys.forEach(key => this.cache.delete(key));
      
      console.log(`🗑️ Cleared ${videoKeys.length} cache entries for video: ${videoId}`);
    }
  }

  clearAllCache() {
    this.cache.clear();
    console.log('🗑️ Cleared all fact-check cache');
  }

  // Rest of the methods remain the same...
  detectContentType(transcript) {
    const patterns = this.modelConfig.getContentPatterns();
    const lowercaseTranscript = transcript.toLowerCase();
    const scores = {};
    
    for (const [type, config] of Object.entries(patterns)) {
      let score = 0;
      
      config.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowercaseTranscript.match(regex);
        if (matches) score += matches.length * 2;
      });
      
      config.indicators.forEach(indicator => {
        const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
        const matches = lowercaseTranscript.match(regex);
        if (matches) score += matches.length * 3;
      });
      
      scores[type] = score;
    }
    
    const maxScore = Math.max(...Object.values(scores));
    const detectedType = Object.keys(scores).find(key => scores[key] === maxScore);
    
    return maxScore > 5 ? detectedType : 'general';
  }

  createPrompt(transcript, settings, contentType) {
    const languageNames = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
      'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi'
    };

    const languageName = languageNames[settings.language] || 'English';
    const truncatedTranscript = transcript.length > 8000 ? transcript.substring(0, 8000) + '...' : transcript;
    const strictnessLevel = settings.strictMode ? 'MAXIMUM' : 'HIGH';

    const groundingInstructions = settings.useGroundingSearch ? `
🌐 REAL-TIME VERIFICATION ENABLED:
- Use Google Search to verify each claim against current, authoritative sources
- Cross-reference with multiple recent sources for accuracy
- Prioritize recent information over older sources
- Cite specific sources found through search when possible
` : `
📚 KNOWLEDGE-BASE VERIFICATION:
- Use your training knowledge to verify claims
- Apply consistency with known facts from training data
`;

    const contentRules = this.modelConfig.getContentTypeRules(contentType);

    return `You are an expert fact-checker with ${settings.useGroundingSearch ? 'REAL-TIME INTERNET ACCESS' : 'comprehensive knowledge base'}. Your task is to identify and verify specific factual claims with ${strictnessLevel} accuracy.

${groundingInstructions}

CONTENT TYPE: ${contentType.toUpperCase()}
STRICTNESS LEVEL: ${strictnessLevel}
MINIMUM CONFIDENCE THRESHOLD: ${settings.confidenceThreshold}%

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
    "verificationMethod": "Description of verification process${settings.useGroundingSearch ? ' including search results' : ''}",
    "sources": "Specific sources used for verification",
    "context": "Important context affecting interpretation",
    "lastVerified": "timeframe of verification",
    "groundingUsed": ${settings.useGroundingSearch}
  }
]

CRITICAL REQUIREMENTS:
- Return empty array [] if no claims meet ${settings.confidenceThreshold}% confidence
- Output ONLY valid JSON - no additional text
- Each claim must be exact quote from transcript
- Focus on most significant verifiable claims (max 8)
- Use ${languageName} for explanations
${settings.useGroundingSearch ? '- Leverage real-time search for current verification' : '- Use knowledge base for historical verification'}`;
  }

  parseResponse(responseText, contentType) {
    try {
      let cleanedResponse = responseText.trim()
        .replace(/```(?:json)?\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*\[/, '[')
        .replace(/\]\s*$/, ']');
      
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
      console.error('Error parsing AI response:', error);
      
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
    
    score += (result.confidence || 0) * 0.4;
    
    const evidenceWeights = {
      'real_time_search': 30, 'official_record': 25, 'scientific_study': 23,
      'government_data': 22, 'statistical_agency': 20, 'company_filing': 18,
      'news_report': 15, 'other': 10, 'general': 8
    };
    score += (evidenceWeights[result.evidenceType] || 8) * 0.25;
    
    const explanationScore = Math.min(20, (result.explanation || '').length / 10);
    score += explanationScore * 0.2;
    
    const statusWeights = {
      'True': 15, 'Mostly True': 12, 'False': 12, 'Partly True': 8,
      'Misleading': 6, 'Unverifiable': 3
    };
    score += (statusWeights[result.status] || 3) * 0.15;
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  validateResults(results, confidenceThreshold) {
    return results
      .filter(result => result.confidence >= confidenceThreshold)
      .map(result => ({
        ...result,
        verificationLevel: this.getVerificationLevel(result.confidence, result.evidenceType),
        trustworthinessIndicator: this.calculateTrustworthiness(result)
      }))
      .sort((a, b) => {
        if (a.reliabilityScore !== b.reliabilityScore) return b.reliabilityScore - a.reliabilityScore;
        if (a.confidence !== b.confidence) return b.confidence - a.confidence;
        const statusOrder = { 'True': 5, 'False': 4, 'Mostly True': 3, 'Misleading': 2, 'Partly True': 1, 'Unverifiable': 0 };
        return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
      });
  }

  getVerificationLevel(confidence, evidenceType) {
    const evidenceTiers = {
      'real_time_search': 4, 'official_record': 3, 'scientific_study': 3,
      'government_data': 3, 'statistical_agency': 2, 'company_filing': 2,
      'news_report': 1, 'other': 1, 'general': 0
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
    const reliableEvidenceCount = results.filter(r => 
      ['real_time_search', 'official_record', 'scientific_study', 'government_data'].includes(r.evidenceType)
    ).length;
    
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
}