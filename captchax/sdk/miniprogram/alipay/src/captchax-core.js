const CaptchaXAPI = require('../utils/api');

class CaptchaX {
  constructor(options = {}) {
    this.appId = options.appId || '';
    this.apiBase = options.apiBase;
    this.api = new CaptchaXAPI({
      appId: this.appId,
      apiBase: this.apiBase
    });
  }

  static async verify(token) {
    try {
      const result = await this.api.verify(null, { token });
      return result.success;
    } catch (error) {
      console.error('CaptchaX verification failed:', error);
      return false;
    }
  }

  async createSession(type) {
    try {
      const session = await this.api.createSession(type);
      return session;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  async verifySession(sessionId, data) {
    try {
      const result = await this.api.verify(sessionId, data);
      return result;
    } catch (error) {
      console.error('Verification failed:', error);
      throw error;
    }
  }
}

module.exports = CaptchaX;
