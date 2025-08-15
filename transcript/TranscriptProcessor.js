// TranscriptProcessor.js - Intelligent Transcript Pre-Processing Pipeline
// Cleans, segments, and optimizes transcripts for accurate fact-checking

import { APIService } from '../core/APIService.js';
import { Cache } from '../utils/Cache.js';
import { Constants } from '../utils/Constants.js';

export class TranscriptProcessor {
  constructor() {
    this.apiService = new APIService();
    this.cache = new Cache('processed_transcript', 50, 2); // 2-hour cache for processed transcripts
    
    // Processing statistics
    this.stats = {
      totalProcessed: 0,
      averageReduction: 0,
      segmentationSuccess: 0,
      claimExtractionSuccess: 0
    };
  }

  /**
   * Main processing pipeline
   * @param {string} rawTranscript - Raw transcript from YouTube
   * @param {string} videoId - Video ID for caching
   * @param {Object} settings - User settings
   * @param {Object} options - Processing options
   * @returns {Object} Processed transcript with segments and claims
   */
  async process(rawTranscript, videoId, settings = {}, options = {}) {
    const {
      forceRefresh = false,
      maxLength = 8000,
      preserveTimestamps = false,
      aggressiveCleaning = true
    } = options;

    // Check cache first
    const cacheKey = this.generateCacheKey(rawTranscript, settings, options);
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('📦 Using cached processed transcript');
        return cached;
      }
    }

    console.log('🔄 Starting transcript pre-processing pipeline...');
    const startTime = Date.now();

    try {
      // Step 1: Initial validation and basic cleaning
      const cleanedTranscript = this.basicCleanup(rawTranscript);
      
      if (cleanedTranscript.length < Constants.MIN_TRANSCRIPT_LENGTH) {
        throw new Error('Transcript too short for processing');
      }

      // Step 2: AI-powered cleaning and segmentation
      const processedData = await this.aiProcessing(cleanedTranscript, settings, {
        maxLength,
        aggressiveCleaning
      });

      // Step 3: Post-processing and validation
      const finalResult = this.postProcess(processedData, videoId, {
        preserveTimestamps,
        originalLength: rawTranscript.length
      });

      // Cache the result
      this.cache.set(cacheKey, finalResult);
      
      // Update statistics
      this.updateStats(rawTranscript.length, finalResult.processedTranscript.length);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Transcript processed in ${processingTime}ms`);
      console.log(`📊 Reduction: ${rawTranscript.length} → ${finalResult.processedTranscript.length} chars`);
      
      return finalResult;

    } catch (error) {
      console.error('❌ Transcript processing failed:', error);
      
      // Fallback to basic cleaning
      return this.fallbackProcessing(rawTranscript, videoId);
    }
  }

  /**
   * Basic cleanup - handles simple cleaning without AI
   */
  basicCleanup(transcript) {
    let cleaned = transcript
      // Remove timestamps if present
      .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, '')
      .replace(/\d{1,2}:\d{2}(?::\d{2})?\s*-?\s*/g, '')
      
      // Remove speaker indicators
      .replace(/^[A-Z][a-z]*\s*:\s*/gm, '')
      .replace(/\[[A-Z][a-z]*\]\s*/g, '')
      
      // Remove common filler expressions
      .replace(/\b(um+|uh+|er+|ah+)\b/gi, '')
      .replace(/\b(you know|like|actually|basically|literally|so|well)\b/gi, '')
      
      // Fix common transcription errors
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([a-z])/g, '$1 $2')
      
      // Remove excessive punctuation
      .replace(/[.]{2,}/g, '.')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      
      .trim();

    return cleaned;
  }

  /**
   * AI-powered processing using Gemini
   */
  async aiProcessing(cleanedTranscript, settings, options) {
    const { maxLength, aggressiveCleaning } = options;
    
    // If transcript is short enough, process in one go
    if (cleanedTranscript.length <= maxLength) {
      return await this.singlePassProcessing(cleanedTranscript, settings, aggressiveCleaning);
    } else {
      return await this.chunkedProcessing(cleanedTranscript, settings, maxLength, aggressiveCleaning);
    }
  }

  /**
   * Single-pass processing for shorter transcripts
   */
  async singlePassProcessing(transcript, settings, aggressiveCleaning) {
    const prompt = this.createProcessingPrompt(transcript, aggressiveCleaning);
    
    try {
      const response = await this.apiService.makeRequest(
        prompt, 
        settings.apiKey, 
        { ...settings, temperature: 0.1 }, // Low temperature for consistent processing
        30 // 30-second timeout
      );

      return this.parseAIResponse(response);
    } catch (error) {
      console.error('AI processing failed:', error);
      throw error;
    }
  }

  /**
   * Chunked processing for very long transcripts
   */
  async chunkedProcessing(transcript, settings, maxLength, aggressiveCleaning) {
    const chunks = this.intelligentChunking(transcript, maxLength * 0.7); // Leave room for prompt
    const processedChunks = [];
    
    console.log(`📝 Processing ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
      
      try {
        const chunkResult = await this.singlePassProcessing(chunks[i], settings, aggressiveCleaning);
        processedChunks.push(chunkResult);
        
        // Small delay between chunks to respect rate limits
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Chunk ${i + 1} processing failed:`, error);
        // Use fallback for this chunk
        processedChunks.push(this.fallbackChunkProcessing(chunks[i]));
      }
    }

    // Merge chunks back together
    return this.mergeProcessedChunks(processedChunks);
  }

  /**
   * Create the AI processing prompt
   */
  createProcessingPrompt(transcript, aggressiveCleaning) {
    const cleaningLevel = aggressiveCleaning ? 'AGGRESSIVE' : 'MODERATE';
    
    return `You are an expert transcript processor. Your task is to clean, segment, and optimize this video transcript for fact-checking analysis.

PROCESSING LEVEL: ${cleaningLevel}
INPUT TRANSCRIPT LENGTH: ${transcript.length} characters

TASKS TO PERFORM:
1. CLEANING & CORRECTION:
   - Fix transcription errors and typos
   - Correct grammar and sentence structure
   - Remove filler words (um, uh, you know, like, etc.)
   - Remove repetitions and redundant phrases
   - Fix punctuation and capitalization
   - Standardize terminology and spelling

2. CONTENT SEGMENTATION:
   - Identify distinct topics/subjects discussed
   - Group related statements together
   - Create logical paragraph breaks
   - Maintain chronological flow

3. CONTENT CLASSIFICATION:
   - Separate FACTUAL CLAIMS from opinions/stories
   - Identify segments likely to contain verifiable information
   - Mark subjective content, personal anecdotes, predictions
   - Prioritize segments with specific data, dates, statistics

4. OPTIMIZATION:
   - Preserve all important factual information
   - Condense verbose explanations while keeping key points
   - Remove casual conversation and off-topic tangents
   - Maintain context necessary for understanding claims

TRANSCRIPT TO PROCESS:
"${transcript}"

REQUIRED OUTPUT FORMAT (JSON ONLY):
{
  "processedTranscript": "cleaned and optimized full transcript",
  "segments": [
    {
      "id": 1,
      "type": "factual|opinion|story|discussion",
      "topic": "brief topic description",
      "content": "segment content",
      "priority": "high|medium|low",
      "claimDensity": "density score 1-10",
      "keywords": ["key", "terms", "mentioned"]
    }
  ],
  "factualClaims": [
    {
      "claim": "specific factual statement",
      "context": "surrounding context",
      "type": "statistical|temporal|geographical|scientific|other",
      "confidence": "how clear/specific the claim is (1-10)",
      "segment": "segment_id where found"
    }
  ],
  "metadata": {
    "originalLength": ${transcript.length},
    "processedLength": "length after processing",
    "reductionPercentage": "percentage reduced",
    "topicsCount": "number of distinct topics",
    "factualSegments": "number of factual segments",
    "primarySubject": "main topic of video"
  }
}

CRITICAL REQUIREMENTS:
- Output ONLY valid JSON - no additional text
- Preserve ALL important factual information
- Fix transcription errors intelligently based on context
- Ensure processed transcript flows naturally and is readable
- Each factual claim must be specific and verifiable
- Maintain enough context for claims to be understood
- Priority should reflect likelihood of containing verifiable facts`;
  }

  /**
   * Parse AI response and validate
   */
  parseAIResponse(responseText) {
    try {
      // Clean up response
      let cleanedResponse = responseText.trim()
        .replace(/```(?:json)?\s*/g, '')
        .replace(/```\s*/g, '');
      
      // Extract JSON
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/) || cleanedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanedResponse);
      
      // Validate structure
      if (!parsed.processedTranscript || !parsed.segments || !parsed.factualClaims) {
        throw new Error('Invalid response structure');
      }

      return this.validateAndEnhance(parsed);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AI response parsing failed');
    }
  }

  /**
   * Validate and enhance parsed response
   */
  validateAndEnhance(parsed) {
    // Ensure all required fields exist
    const enhanced = {
      processedTranscript: String(parsed.processedTranscript || '').trim(),
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
      factualClaims: Array.isArray(parsed.factualClaims) ? parsed.factualClaims : [],
      metadata: parsed.metadata || {}
    };

    // Validate segments
    enhanced.segments = enhanced.segments
      .filter(segment => segment.content && segment.content.trim().length > 20)
      .map((segment, index) => ({
        id: segment.id || index + 1,
        type: segment.type || 'discussion',
        topic: String(segment.topic || 'General').trim(),
        content: String(segment.content).trim(),
        priority: segment.priority || 'medium',
        claimDensity: Math.max(1, Math.min(10, parseInt(segment.claimDensity) || 5)),
        keywords: Array.isArray(segment.keywords) ? segment.keywords : []
      }));

    // Validate factual claims
    enhanced.factualClaims = enhanced.factualClaims
      .filter(claim => claim.claim && claim.claim.trim().length > 10)
      .map(claim => ({
        claim: String(claim.claim).trim(),
        context: String(claim.context || '').trim(),
        type: claim.type || 'other',
        confidence: Math.max(1, Math.min(10, parseInt(claim.confidence) || 5)),
        segment: claim.segment || 1
      }));

    // Enhance metadata
    enhanced.metadata = {
      originalLength: parseInt(enhanced.metadata.originalLength) || 0,
      processedLength: enhanced.processedTranscript.length,
      reductionPercentage: 0, // Will be calculated later
      topicsCount: enhanced.segments.length,
      factualSegments: enhanced.segments.filter(s => s.type === 'factual').length,
      primarySubject: enhanced.metadata.primarySubject || 'General Discussion',
      processingTimestamp: new Date().toISOString()
    };

    return enhanced;
  }

  /**
   * Intelligent chunking that preserves sentence boundaries
   */
  intelligentChunking(transcript, maxChunkSize) {
    const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Merge processed chunks back together
   */
  mergeProcessedChunks(processedChunks) {
    const merged = {
      processedTranscript: '',
      segments: [],
      factualClaims: [],
      metadata: {
        originalLength: 0,
        processedLength: 0,
        topicsCount: 0,
        factualSegments: 0,
        primarySubject: 'Multi-topic Discussion',
        processingTimestamp: new Date().toISOString()
      }
    };

    let segmentIdCounter = 1;

    processedChunks.forEach((chunk, index) => {
      // Merge transcripts
      merged.processedTranscript += (index > 0 ? ' ' : '') + chunk.processedTranscript;
      
      // Merge segments with updated IDs
      chunk.segments.forEach(segment => {
        merged.segments.push({
          ...segment,
          id: segmentIdCounter++
        });
      });
      
      // Merge factual claims
      chunk.factualClaims.forEach(claim => {
        merged.factualClaims.push(claim);
      });
      
      // Merge metadata
      merged.metadata.originalLength += chunk.metadata.originalLength || 0;
      merged.metadata.topicsCount += chunk.segments.length;
      merged.metadata.factualSegments += chunk.segments.filter(s => s.type === 'factual').length;
    });

    merged.metadata.processedLength = merged.processedTranscript.length;
    
    return merged;
  }

  /**
   * Post-processing and final validation
   */
  postProcess(processedData, videoId, options) {
    const { preserveTimestamps, originalLength } = options;
    
    // Calculate reduction percentage
    const reductionPercentage = Math.round(
      ((originalLength - processedData.processedTranscript.length) / originalLength) * 100
    );
    
    processedData.metadata.reductionPercentage = reductionPercentage;
    
    // Sort segments by priority and claim density
    processedData.segments.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.claimDensity || 5) - (a.claimDensity || 5);
    });
    
    // Sort factual claims by confidence
    processedData.factualClaims.sort((a, b) => (b.confidence || 5) - (a.confidence || 5));
    
    // Add processing metadata
    processedData.metadata.videoId = videoId;
    processedData.metadata.processingVersion = '1.0.0';
    
    return processedData;
  }

  /**
   * Fallback processing when AI fails
   */
  fallbackProcessing(rawTranscript, videoId) {
    console.log('🔄 Using fallback processing...');
    
    const cleaned = this.basicCleanup(rawTranscript);
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
    
    return {
      processedTranscript: cleaned,
      segments: [{
        id: 1,
        type: 'discussion',
        topic: 'General Content',
        content: cleaned,
        priority: 'medium',
        claimDensity: 5,
        keywords: []
      }],
      factualClaims: [],
      metadata: {
        originalLength: rawTranscript.length,
        processedLength: cleaned.length,
        reductionPercentage: Math.round(((rawTranscript.length - cleaned.length) / rawTranscript.length) * 100),
        topicsCount: 1,
        factualSegments: 1,
        primarySubject: 'General Discussion',
        processingTimestamp: new Date().toISOString(),
        fallbackUsed: true,
        videoId: videoId
      }
    };
  }

  /**
   * Fallback for individual chunks
   */
  fallbackChunkProcessing(chunk) {
    const cleaned = this.basicCleanup(chunk);
    
    return {
      processedTranscript: cleaned,
      segments: [{
        id: 1,
        type: 'discussion',
        topic: 'General',
        content: cleaned,
        priority: 'medium',
        claimDensity: 5,
        keywords: []
      }],
      factualClaims: [],
      metadata: {
        originalLength: chunk.length,
        processedLength: cleaned.length,
        fallbackUsed: true
      }
    };
  }

  /**
   * Generate cache key for processed transcript
   */
  generateCacheKey(transcript, settings, options) {
    const hash = this.simpleHash(transcript + JSON.stringify(settings) + JSON.stringify(options));
    return `processed_${hash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Update processing statistics
   */
  updateStats(originalLength, processedLength) {
    this.stats.totalProcessed++;
    const reduction = ((originalLength - processedLength) / originalLength) * 100;
    
    if (this.stats.totalProcessed === 1) {
      this.stats.averageReduction = reduction;
    } else {
      this.stats.averageReduction = (this.stats.averageReduction + reduction) / 2;
    }
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheInfo: this.cache.getInfo ? this.cache.getInfo() : null
    };
  }

  /**
   * Clear processing cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Transcript processing cache cleared');
  }
}