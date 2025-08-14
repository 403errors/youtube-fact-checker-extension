// Gemini API communication and management
import { ModelConfig } from '../utils/ModelConfig.js';

export class APIService {
  constructor() {
    this.modelConfig = new ModelConfig();
    this.rateLimiter = new Map();
    this.rateLimitWindow = 60 * 1000; // 1 minute
    this.maxRequestsPerWindow = 15;
  }

  async validateKey(apiKey) {
    try {
      const testPrompt = "Test connection. Respond with 'OK'.";
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelConfig.getDefault()}:generateContent?key=${apiKey}`, {
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

  async makeRequest(prompt, apiKey, settings = {}, timeout = 45) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    try {
      const selectedModel = this.modelConfig.selectModel(settings);
      const modelsToTry = [selectedModel, ...this.modelConfig.getFallbacks()];
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          console.log(`🔍 Trying model: ${model}`);
          
          const requestBody = this.buildRequestBody(prompt, model, settings);
          
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

            console.log(`✅ Analysis successful with ${model}`);
            return textContent;
          }

          if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid or expired API key');
          }

          if (response.status === 429) {
            throw new Error('API rate limit exceeded. Please try again later.');
          }

          if (response.status === 404) {
            console.log(`❌ Model ${model} not available, trying next...`);
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

  buildRequestBody(prompt, model, settings) {
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.05,
        maxOutputTokens: 4000,
        candidateCount: 1,
        topP: 0.7,
        topK: 20
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    // Only enable grounding for compatible models
    if (settings.useGroundingSearch && this.modelConfig.supportsGrounding(model)) {
      requestBody.tools = [{
        googleSearchRetrieval: { disableAttribution: false }
      }];
      console.log(`🌐 Grounding search enabled for ${model}`);
    } else if (settings.useGroundingSearch) {
      console.log(`⚠️ Grounding search skipped for ${model} (not supported)`);
    }

    return requestBody;
  }

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
}