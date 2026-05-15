const { SDK_CONFIG, CAPTCHA_TYPES, CAPTCHA_EVENTS, getApiUrl, createRequestOptions, buildVerifyRequest } = require('./utils/config');
const log = require('electron-log');

class CaptchaElectronSDK {
  constructor(options = {}) {
    this.config = {
      apiBaseUrl: options.apiBaseUrl || SDK_CONFIG.apiBaseUrl,
      timeout: options.timeout || SDK_CONFIG.timeouts.request,
      retryAttempts: options.retryAttempts || SDK_CONFIG.retry.maxAttempts,
      enableNotifications: options.enableNotifications !== false,
      enableTray: options.enableTray !== false
    };
    
    this.currentCaptcha = null;
    this.eventListeners = new Map();
    this.requestController = null;
    
    log.initialize();
    log.transports.file.level = 'info';
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
    return this;
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          log.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  async fetchWithTimeout(url, options, timeout = this.config.timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async fetchWithRetry(url, options, maxRetries = this.config.retryAttempts) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'API request failed');
        }
        
        return data;
      } catch (error) {
        lastError = error;
        log.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          await this.delay(SDK_CONFIG.retry.delay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getCaptcha(type) {
    if (!Object.values(CAPTCHA_TYPES).includes(type)) {
      throw new Error(`Invalid captcha type: ${type}`);
    }

    try {
      const url = getApiUrl(type, 'getCaptcha');
      const options = createRequestOptions('POST');
      
      log.info(`Fetching ${type} captcha from ${url}`);
      
      const response = await this.fetchWithRetry(url, options);
      
      this.currentCaptcha = {
        ...response.data,
        type: type,
        createdAt: Date.now()
      };
      
      this.emit(CAPTCHA_EVENTS.READY, this.currentCaptcha);
      
      return this.currentCaptcha;
    } catch (error) {
      log.error('Failed to fetch captcha:', error);
      this.emit(CAPTCHA_EVENTS.ERROR, {
        type: type,
        error: error.message
      });
      throw error;
    }
  }

  async verify(type, captchaId, track = [], userResponse = {}) {
    if (!Object.values(CAPTCHA_TYPES).includes(type)) {
      throw new Error(`Invalid captcha type: ${type}`);
    }

    try {
      const url = getApiUrl(type, 'verifyCaptcha');
      const body = buildVerifyRequest(captchaId, track, userResponse);
      const options = createRequestOptions('POST', body);
      
      log.info(`Verifying ${type} captcha:`, captchaId);
      
      const response = await this.fetchWithRetry(url, options);
      
      if (response.data && response.data.success) {
        this.emit(CAPTCHA_EVENTS.SUCCESS, {
          type: type,
          captchaId: captchaId,
          data: response.data
        });
      } else {
        this.emit(CAPTCHA_EVENTS.FAIL, {
          type: type,
          captchaId: captchaId,
          message: response.data?.message || 'Verification failed'
        });
      }
      
      return response;
    } catch (error) {
      log.error('Verification failed:', error);
      this.emit(CAPTCHA_EVENTS.FAIL, {
        type: type,
        captchaId: captchaId,
        error: error.message
      });
      throw error;
    }
  }

  isExpired() {
    if (!this.currentCaptcha || !this.currentCaptcha.expiresAt) {
      return false;
    }
    
    const expiresAt = new Date(this.currentCaptcha.expiresAt).getTime();
    return Date.now() > expiresAt;
  }

  clear() {
    this.currentCaptcha = null;
    this.emit(CAPTCHA_EVENTS.CLOSE, {});
  }

  getCurrentCaptcha() {
    return this.currentCaptcha;
  }

  setApiBaseUrl(url) {
    this.config.apiBaseUrl = url;
    log.info(`API base URL changed to: ${url}`);
  }

  async slider(options = {}) {
    return this.getCaptcha(CAPTCHA_TYPES.SLIDER);
  }

  async click(options = {}) {
    return this.getCaptcha(CAPTCHA_TYPES.CLICK);
  }

  async puzzle(options = {}) {
    return this.getCaptcha(CAPTCHA_TYPES.PUZZLE);
  }

  async rotate(options = {}) {
    return this.getCaptcha(CAPTCHA_TYPES.ROTATE);
  }

  async text(options = {}) {
    return this.getCaptcha(CAPTCHA_TYPES.TEXT);
  }

  async icon(options = {}) {
    return this.getCaptcha(CAPTCHA_TYPES.ICON);
  }

  async verifySlider(captchaId, track, sliderPosition) {
    return this.verify(CAPTCHA_TYPES.SLIDER, captchaId, track, {
      position: sliderPosition
    });
  }

  async verifyClick(captchaId, track, clickPositions) {
    return this.verify(CAPTCHA_TYPES.CLICK, captchaId, track, {
      positions: clickPositions
    });
  }

  async verifyPuzzle(captchaId, track, puzzlePosition) {
    return this.verify(CAPTCHA_TYPES.PUZZLE, captchaId, track, {
      position: puzzlePosition
    });
  }

  async verifyRotate(captchaId, track, rotationAngle) {
    return this.verify(CAPTCHA_TYPES.ROTATE, captchaId, track, {
      angle: rotationAngle
    });
  }

  async verifyText(captchaId, track, textInput) {
    return this.verify(CAPTCHA_TYPES.TEXT, captchaId, track, {
      text: textInput
    });
  }

  async verifyIcon(captchaId, track, selectedIcons) {
    return this.verify(CAPTCHA_TYPES.ICON, captchaId, track, {
      icons: selectedIcons
    });
  }
}

function createSDK(options) {
  return new CaptchaElectronSDK(options);
}

module.exports = {
  CaptchaElectronSDK,
  createSDK,
  CAPTCHA_TYPES,
  CAPTCHA_EVENTS
};
