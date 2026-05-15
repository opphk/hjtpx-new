const path = require('path');

const SDK_CONFIG = {
  apiBaseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://captchax.example.com' 
    : 'http://localhost:3000',
  
  apiVersion: 'v1',
  
  endpoints: {
    getCaptcha: '/api/{version}/captcha/{type}',
    verifyCaptcha: '/api/{version}/captcha/{type}/verify'
  },
  
  timeouts: {
    request: 10000,
    captcha: 120000
  },
  
  retry: {
    maxAttempts: 3,
    delay: 1000
  }
};

const CAPTCHA_TYPES = {
  SLIDER: 'slider',
  CLICK: 'click',
  PUZZLE: 'puzzle',
  ROTATE: 'rotate',
  TEXT: 'text',
  ICON: 'icon'
};

const CAPTCHA_EVENTS = {
  READY: 'captcha:ready',
  SUCCESS: 'captcha:success',
  FAIL: 'captcha:fail',
  ERROR: 'captcha:error',
  EXPIRED: 'captcha:expired',
  CLOSE: 'captcha:close'
};

const NOTIFICATION_CONFIG = {
  title: 'CaptchaX 验证码',
  successMessage: '验证成功',
  failMessage: '验证失败',
  expiredMessage: '验证码已过期',
  errorMessage: '验证出错'
};

function getApiUrl(type, endpoint = 'getCaptcha') {
  const endpointTemplate = SDK_CONFIG.endpoints[endpoint];
  return SDK_CONFIG.apiBaseUrl + endpointTemplate
    .replace('{version}', SDK_CONFIG.apiVersion)
    .replace('{type}', type);
}

function createRequestOptions(method, body = null) {
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CaptchaX-Electron-SDK/1.0.0'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  return options;
}

function buildVerifyRequest(captchaId, track, userResponse) {
  return {
    captchaId: captchaId,
    track: track || [],
    userResponse: userResponse || {},
    timestamp: Date.now()
  };
}

module.exports = {
  SDK_CONFIG,
  CAPTCHA_TYPES,
  CAPTCHA_EVENTS,
  NOTIFICATION_CONFIG,
  getApiUrl,
  createRequestOptions,
  buildVerifyRequest
};
