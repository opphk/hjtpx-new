const CONFIG = require('./config');

class CaptchaXAPI {
  constructor(options = {}) {
    this.appId = options.appId || '';
    this.apiBase = options.apiBase || CONFIG.getApiBase();
    this.timeout = options.timeout || 10000;
  }

  request(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.apiBase}${endpoint}`;
      my.request({
        url,
        method: options.method || 'POST',
        data: options.data || {},
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: this.timeout,
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            resolve(res.data);
          } else {
            reject(new Error(res.errMsg || 'Request failed'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }

  async createSession(type) {
    return this.request('/api/captcha/session', {
      method: 'POST',
      data: {
        appId: this.appId,
        type
      }
    });
  }

  async verify(sessionId, data) {
    return this.request('/api/captcha/verify', {
      method: 'POST',
      data: {
        sessionId,
        appId: this.appId,
        ...data
      }
    });
  }

  async reportResult(result, type) {
    return this.request('/api/captcha/report', {
      method: 'POST',
      data: {
        appId: this.appId,
        type,
        result
      }
    });
  }
}

module.exports = CaptchaXAPI;
