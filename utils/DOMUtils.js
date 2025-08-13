// DOMUtils.js - Utility functions for DOM manipulation and queries
// Shared utilities for element visibility, container validation, and DOM operations

export class DOMUtils {
  // Check if element is visible and valid for interaction
  static isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  // Validate if a container is suitable for button injection
  static isValidContainer(container) {
    return container && 
           container.offsetParent !== null && 
           container.getBoundingClientRect().width > 0 &&
           container.getBoundingClientRect().height > 0;
  }

  // Find element using multiple selectors
  static findElementBySelectors(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && this.isElementVisible(element)) {
        return element;
      }
    }
    return null;
  }

  // Find all elements using multiple selectors
  static findElementsBySelectors(selectors) {
    const results = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (this.isElementVisible(element)) {
          results.push(element);
        }
      }
    }
    return results;
  }

  // Wait for element to appear in DOM
  static async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element && this.isElementVisible(element)) {
        return element;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null;
  }

  // Wait for multiple elements to appear
  static async waitForElements(selector, minCount = 1, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const elements = document.querySelectorAll(selector);
      const visibleElements = Array.from(elements).filter(el => this.isElementVisible(el));
      
      if (visibleElements.length >= minCount) {
        return visibleElements;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return [];
  }

  // Scroll element into view smoothly
  static scrollIntoView(element, behavior = 'smooth', block = 'center') {
    if (!element) return;
    
    element.scrollIntoView({
      behavior,
      block,
      inline: 'nearest'
    });
  }

  // Get element text content, handling different text selectors
  static getElementText(element, textSelectors = []) {
    if (!element) return '';

    // Try provided selectors first
    for (const selector of textSelectors) {
      const textElement = element.querySelector(selector);
      if (textElement && textElement.textContent?.trim()) {
        return textElement.textContent.trim();
      }
    }

    // Fallback to element's own text content
    return element.textContent?.trim() || '';
  }

  // Remove element safely
  static removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  // Remove elements by selector
  static removeElementsBySelector(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => this.removeElement(element));
  }

  // Create element with attributes and content
  static createElement(tag, attributes = {}, innerHTML = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    
    if (innerHTML) {
      element.innerHTML = innerHTML;
    }
    
    return element;
  }

  // Add event listener with cleanup tracking
  static addEventListenerWithCleanup(element, event, handler, options = {}) {
    if (!element) return null;
    
    element.addEventListener(event, handler, options);
    
    // Return cleanup function
    return () => {
      element.removeEventListener(event, handler, options);
    };
  }

  // Find parent element by selector
  static findParentBySelector(element, selector) {
    if (!element) return null;
    
    let parent = element.parentElement;
    while (parent) {
      if (parent.matches(selector)) {
        return parent;
      }
      parent = parent.parentElement;
    }
    
    return null;
  }

  // Check if element is currently in viewport
  static isInViewport(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Safely execute XPath query
  static evaluateXPath(xpath, contextNode = document) {
    try {
      const result = document.evaluate(
        xpath,
        contextNode,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    } catch (error) {
      console.error('XPath evaluation failed:', error);
      return null;
    }
  }

  // Escape HTML for safe insertion
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Check if page is ready for manipulation
  static isPageReady() {
    return document.readyState === 'complete' || document.readyState === 'interactive';
  }

  // Wait for page to be ready
  static async waitForPageReady(timeout = 10000) {
    if (this.isPageReady()) {
      return true;
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if (this.isPageReady()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          resolve(false);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
    });
  }

  // Throttle function for performance
  static throttle(func, limit) {
    let lastFunc;
    let lastRan;
    
    return function() {
      const context = this;
      const args = arguments;
      
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  // Debounce function for performance
  static debounce(func, wait, immediate = false) {
    let timeout;
    
    return function() {
      const context = this;
      const args = arguments;
      
      const later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func.apply(context, args);
    };
  }
}