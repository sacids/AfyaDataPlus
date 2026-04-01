// utils/debug.js
import { Platform } from 'react-native';

// Configuration
let isEnabled = __DEV__; // Only enable in development by default
let currentLogLevel = 'info'; // 'error', 'warn', 'info', 'verbose'
let memoryInterval = null;

// Log levels priority
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3
};

// Helper to check if we should log at this level
function shouldLog(level) {
  if (!isEnabled) return false;
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel];
}

// Core logging functions
export const Debug = {
  // Configuration methods
  enable: () => {
    isEnabled = true;
    console.log('[Debug] Logging enabled');
  },
  
  disable: () => {
    isEnabled = false;
    console.log('[Debug] Logging disabled');
  },
  
  setLogLevel: (level) => {
    if (LOG_LEVELS[level] !== undefined) {
      currentLogLevel = level;
      console.log(`[Debug] Log level set to ${level}`);
    }
  },
  
  // Core logging
  log: (component, message, data = null) => {
    if (!shouldLog('info')) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${component}] ${message}`;
    
    if (data !== null && data !== undefined) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  },
  
  error: (component, error, context = null) => {
    if (!shouldLog('error')) return;
    
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${component}] ERROR:`, error);
    if (context) {
      console.error('Context:', context);
    }
  },
  
  warn: (component, message, data = null) => {
    if (!shouldLog('warn')) return;
    
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${component}] WARN: ${message}`, data || '');
  },
  
  // Performance tracking
  startTimer: (component, operation) => {
    if (!shouldLog('info')) return null;
    Debug.log(component, `⏱️ START ${operation}`);
    return Date.now();
  },
  
  endTimer: (component, operation, startTime) => {
    if (!shouldLog('info') || !startTime) return;
    const duration = Date.now() - startTime;
    Debug.log(component, `⏱️ END ${operation} - ${duration}ms`);
    return duration;
  },
  
  // Memory tracking
  trackMemory: (component) => {
    if (!shouldLog('info')) return null;
    
    if (global.performance && global.performance.memory) {
      const mem = global.performance.memory;
      const usedMB = Math.round(mem.usedJSHeapSize / 1048576);
      const limitMB = Math.round(mem.jsHeapSizeLimit / 1048576);
      const percent = Math.round((usedMB / limitMB) * 100);
      
      Debug.log(component, `📊 Memory: ${usedMB}MB / ${limitMB}MB (${percent}%)`);
      return { usedMB, limitMB, percent };
    }
    return null;
  },
  
  // Render tracking
  trackRender: (component, props = null) => {
    if (!shouldLog('verbose')) return;
    
    if (props) {
      Debug.log(component, `RENDER`, props);
    } else {
      Debug.log(component, `RENDER`);
    }
  },
  
  // Effect tracking
  trackEffect: (component, effectName, dependencies) => {
    if (!shouldLog('verbose')) return;
    Debug.log(component, `EFFECT ${effectName}`, dependencies);
  },
  
  // Mount/Unmount tracking
  trackMount: (component) => {
    Debug.log(component, '✅ MOUNTED');
  },
  
  trackUnmount: (component) => {
    Debug.log(component, '❌ UNMOUNTED');
  },
  
  // State tracking
  trackState: (component, stateName, stateValue) => {
    if (!shouldLog('verbose')) return;
    Debug.log(component, `STATE ${stateName}`, stateValue);
  },
  
  // Navigation tracking
  trackNavigation: (component, from, to) => {
    Debug.log(component, `NAVIGATE: ${from} → ${to}`);
  },
  
  // Async operation tracking
  trackAsync: (component, operation, startTime) => {
    if (!shouldLog('info')) return;
    const duration = startTime ? ` (${Date.now() - startTime}ms)` : '';
    Debug.log(component, `ASYNC ${operation}${duration}`);
  },
  
  // Crash tracking
  trackCrash: (component, error, stack) => {
    Debug.error(component, error);
    if (stack && shouldLog('error')) {
      console.error('Stack trace:', stack);
    }
  }
};

// Start memory monitoring
export function startMemoryMonitoring(intervalMs = 30000) {
  if (memoryInterval) clearInterval(memoryInterval);
  memoryInterval = setInterval(() => {
    Debug.trackMemory('System');
  }, intervalMs);
  Debug.log('Debug', `Memory monitoring started (every ${intervalMs}ms)`);
}

export function stopMemoryMonitoring() {
  if (memoryInterval) {
    clearInterval(memoryInterval);
    memoryInterval = null;
    Debug.log('Debug', 'Memory monitoring stopped');
  }
}

// Auto-start in development
if (__DEV__) {
  startMemoryMonitoring();
}