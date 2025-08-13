// Constants.js - Configuration values, selectors, and settings
// Centralized place for all constant values used across modules

export const Constants = {
  // Button Configuration
  BUTTON_ID: 'fact-check-button',
  BUTTON_CLASSES: 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m fact-check-btn',
  
  // Sidebar Configuration
  SIDEBAR_ID: 'fact-check-sidebar',
  
  // Transcript Configuration
  MIN_TRANSCRIPT_LENGTH: 50,
  MAX_INJECTION_ATTEMPTS: 30,
  INJECTION_INTERVAL: 200,
  
  // Cache Configuration
  MAX_CACHE_SIZE: 5,
  CACHE_EXPIRY_HOURS: 24,
  
  // API Configuration
  API_ENDPOINTS: {
    TRANSCRIPT: 'https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false',
    TIMEDTEXT: 'https://www.youtube.com/api/timedtext',
    GOOGLE_TIMEDTEXT: 'https://video.google.com/timedtext'
  },
  
  // YouTube Client Configuration
  YOUTUBE_CLIENT: {
    NAME: 'WEB',
    VERSION: '2.20250731.09.00',
    CLIENT_NAME: '1'
  },
  
  // Button Container Selectors (in priority order)
  BUTTON_CONTAINER_SELECTORS: [
    '#top-row.style-scope.ytd-watch-metadata #actions.style-scope.ytd-watch-metadata #top-level-buttons-computed',
    '#actions.style-scope.ytd-watch-metadata #top-level-buttons-computed',
    'ytd-menu-renderer#menu .top-level-buttons'
  ],
  
  // Like Button Selectors
  LIKE_BUTTON_SELECTORS: [
    'like-button-view-model button[aria-label*="like"]',
    'ytd-toggle-button-renderer[target-id="watch-like"]',
    '#segmented-like-button'
  ],
  
  // Transcript Button Selectors
  TRANSCRIPT_BUTTON_SELECTORS: [
    'button[aria-label*="transcript" i]',
    'button[aria-label*="Show transcript" i]',
    'ytd-button-renderer button[aria-label*="transcript" i]',
    '[role="button"][aria-label*="transcript" i]'
  ],
  
  // Show More Button Selectors
  SHOW_MORE_SELECTORS: [
    '#expand',
    'tp-yt-paper-button#expand',
    '[id="expand"]',
    'button#expand',
    '#description button[aria-label*="more" i]',
    '#description button[aria-label*="expand" i]'
  ],
  
  // Transcript Segment Selectors
  TRANSCRIPT_SEGMENT_SELECTORS: [
    'ytd-transcript-segment-renderer',
    '.ytd-transcript-segment-renderer',
    '[class*="transcript-segment"]',
    '.transcript-segment',
    '.segment'
  ],
  
  // Text Track Selectors
  TEXT_TRACK_SELECTORS: [
    '.segment-text',
    '[class*="text"]',
    'yt-formatted-string',
    '.ytd-transcript-segment-renderer [dir]',
    '.cue-group-start-offset',
    '.cue'
  ],
  
  // Required Authentication Cookies
  REQUIRED_COOKIES: ['SAPISID', 'APISID', 'SSID', 'HSID', 'SID'],
  
  // Fallback Values
  FALLBACK_VISITOR_DATA: 'CgtRVUpTLXFjWnNUOA%3D%3D',
  FALLBACK_TRANSCRIPT_PARAMS: 'CgtmcFFGNFJtWUF4ZxISQ2dBU0JXVnVMVlVUR2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDAAOAFAAQ%3D%3D',
  
  // Timing Configuration
  TIMEOUTS: {
    PLAYER_RESPONSE_WAIT: 5000,
    TEXT_TRACK_WAIT: 8000,
    TRANSCRIPT_PANEL_WAIT: 8000,
    UI_INTERACTION_DELAY: 200,
    CONTENT_LOAD_DELAY: 1000,
    TRANSCRIPT_LOAD_DELAY: 1500
  },
  
  // HTTP Headers
  DEFAULT_HEADERS: {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json'
  },
  
  // Transcript Formats
  TRANSCRIPT_FORMATS: {
    JSON3: 'json3',
    SRV3: 'srv3',
    XML: 'xml',
    PLAIN: 'txt'
  },
  
  // Language Codes
  LANGUAGE_CODES: {
    ENGLISH: 'en',
    ENGLISH_US: 'en-US',
    ENGLISH_UK: 'en-GB'
  },
  
  // Status Classes for Results
  STATUS_CLASSES: {
    'True': 'status-true',
    'Mostly True': 'status-mostly-true',
    'Partly True': 'status-partly-true',
    'False': 'status-false',
    'Misleading': 'status-misleading',
    'Unverifiable': 'status-unverifiable'
  },
  
  // Status Icons
  STATUS_ICONS: {
    'True': '✅',
    'Mostly True': '✅',
    'Partly True': '⚠️',
    'False': '❌',
    'Misleading': '⚠️',
    'Unverifiable': '❓'
  },
  
  // Evidence Type Mapping
  EVIDENCE_TYPES: {
    'real_time_search': '🌐 Real-time Search',
    'official_record': '📋 Official Record',
    'scientific_study': '🔬 Scientific Study',
    'government_data': '🏛️ Government Data',
    'news_report': '📰 News Report',
    'company_filing': '📊 Company Filing',
    'statistical_agency': '📈 Statistical Agency',
    'other': '📄 Other Sources',
    'general': '📄 General Sources'
  },
  
  // Error Messages
  ERROR_MESSAGES: {
    NO_API_KEY: 'Please configure your API key in the extension settings first.',
    NO_TRANSCRIPT: 'Could not retrieve video transcript. This video may not have captions available or they may be restricted.',
    TRANSCRIPT_TOO_SHORT: 'Video transcript is too short for reliable analysis.',
    ANALYSIS_FAILED: 'Analysis failed. Please try again.',
    NO_VIDEO_ID: 'No video ID found for current page.',
    AUTHENTICATION_FAILED: 'Could not extract authentication data from page.',
    NETWORK_ERROR: 'Network request failed. Please check your connection.'
  },
  
  // Success Messages
  SUCCESS_MESSAGES: {
    BUTTON_INJECTED: 'Fact-check button injected successfully',
    TRANSCRIPT_EXTRACTED: 'Transcript extracted successfully',
    ANALYSIS_COMPLETE: 'Fact-check analysis completed',
    CACHE_HIT: 'Using cached results'
  },
  
  // Debug Configuration
  DEBUG: {
    ENABLED: true,
    LOG_TRANSCRIPT_PREVIEW: true,
    LOG_API_RESPONSES: false,
    LOG_TIMING: true
  },

  // Cache Prefixes
  CACHE_PREFIXES: {
    TRANSCRIPT: 'transcript',
    RESULTS: 'results',
    SETTINGS: 'settings'
  },

  // Animation Durations (in milliseconds)
  ANIMATIONS: {
    SIDEBAR_TRANSITION: 300,
    BUTTON_HOVER: 200,
    CARD_EXPAND: 300,
    LOADING_SPINNER: 1000
  },

  // Browser Events
  EVENTS: {
    YT_NAVIGATE: 'yt-navigate-finish',
    PAGE_LOAD: 'DOMContentLoaded',
    BEFORE_UNLOAD: 'beforeunload',
    FOCUS: 'focus',
    RESIZE: 'resize'
  },

  // Extension Message Types
  MESSAGE_TYPES: {
    GET_SETTINGS: 'GET_SETTINGS',
    SETTINGS_UPDATED: 'SETTINGS_UPDATED',
    EXTENSION_TOGGLED: 'EXTENSION_TOGGLED',
    TOGGLE_FACT_CHECK: 'TOGGLE_FACT_CHECK',
    FACT_CHECK_REQUEST: 'FACT_CHECK_REQUEST'
  },

  // UI Class Names
  UI_CLASSES: {
    ACTIVE: 'active',
    LOADING: 'loading',
    VISIBLE: 'sidebar-visible',
    EXPANDED: 'expanded',
    HIDDEN: 'hidden'
  },

  // Retry Configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
    BACKOFF_FACTOR: 2
  },

  // File Extensions
  FILE_EXTENSIONS: {
    JS: '.js',
    CSS: '.css',
    JSON: '.json'
  },

  // Regular Expressions
  REGEX: {
    VIDEO_ID: /[?&]v=([^&]+)/,
    YOUTUBE_URL: /^https?:\/\/(www\.)?youtube\.com/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    TIMESTAMP: /^\d+:\d+/
  },

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500
  },

  // Limits and Thresholds
  LIMITS: {
    MAX_TRANSCRIPT_LENGTH: 100000,
    MIN_CONFIDENCE_SCORE: 60,
    MAX_CLAIMS_PER_VIDEO: 20,
    MAX_RETRY_ATTEMPTS: 5
  },

  // Color Themes
  COLORS: {
    PRIMARY: '#667eea',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
    GRAY: '#6b7280'
  },

  // Z-Index Values
  Z_INDEX: {
    SIDEBAR: 999999,
    OVERLAY: 999998,
    BUTTON: 1000,
    TOOLTIP: 10000
  },

  // Performance Monitoring
  PERFORMANCE: {
    MEASURE_EXTRACTION: true,
    MEASURE_RENDERING: true,
    LOG_SLOW_OPERATIONS: true,
    SLOW_THRESHOLD_MS: 1000
  }
};