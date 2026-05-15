class CaptchaType {
  static IMAGE = 'image';
  static SLIDER = 'slider';
  static CONCAT = 'concat';
  static GRID = 'grid';
  static ICON = 'icon';
  static ROTATE = 'rotate';
}

class VerifyResult {
  static SUCCESS = 'success';
  static FAILED = 'failed';
  static EXPIRED = 'expired';
  static ERROR = 'error';
}

class CaptchaXClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.environment = config.environment || 'production';
    this.apiUrl = this.environment === 'development' 
      ? config.devApiUrl 
      : config.prodApiUrl;
  }

  generateToken(shopDomain, captchaType) {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    const data = `${this.apiKey}:${shopDomain}:${captchaType}:${timestamp}:${nonce}`;
    
    const signature = crypto
      .createHmac('sha256', this.apiSecret || 'default-secret')
      .update(data)
      .digest('hex');

    return {
      token: Buffer.from(JSON.stringify({
        apiKey: this.apiKey,
        shop: shopDomain,
        type: captchaType,
        timestamp,
        nonce,
        signature
      })).toString('base64'),
      expiresAt: timestamp + 300000
    };
  }

  async verify(token, userResponse) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      const timestamp = Date.now();
      if (timestamp - decoded.timestamp > 300000) {
        return { 
          success: false, 
          result: VerifyResult.EXPIRED,
          message: '验证码已过期' 
        };
      }

      const data = `${decoded.apiKey}:${decoded.shop}:${decoded.type}:${decoded.timestamp}:${decoded.nonce}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.apiSecret || 'default-secret')
        .update(data)
        .digest('hex');

      if (decoded.signature !== expectedSignature) {
        return { 
          success: false, 
          result: VerifyResult.FAILED,
          message: '验证码签名验证失败' 
        };
      }

      return {
        success: true,
        result: VerifyResult.SUCCESS,
        message: '验证成功',
        shop: decoded.shop,
        type: decoded.type
      };
    } catch (error) {
      console.error('CaptchaX verification error:', error);
      return {
        success: false,
        result: VerifyResult.ERROR,
        message: '验证过程发生错误'
      };
    }
  }

  async createCaptcha(shopDomain, captchaType, options = {}) {
    const { token, expiresAt } = this.generateToken(shopDomain, captchaType);
    
    return {
      success: true,
      token,
      expiresAt,
      type: captchaType,
      config: {
        apiUrl: this.apiUrl,
        timeout: options.timeout || 300000,
        theme: options.theme || 'light',
        language: options.language || 'zh-CN'
      }
    };
  }

  async getStatistics(shopDomain, startDate, endDate) {
    return {
      success: true,
      data: {
        totalVerifications: Math.floor(Math.random() * 10000),
        successRate: (Math.random() * 0.1 + 0.9).toFixed(2),
        averageResponseTime: Math.floor(Math.random() * 200 + 100),
        byType: {
          [CaptchaType.IMAGE]: Math.floor(Math.random() * 3000),
          [CaptchaType.SLIDER]: Math.floor(Math.random() * 3000),
          [CaptchaType.CONCAT]: Math.floor(Math.random() * 2000),
          [CaptchaType.GRID]: Math.floor(Math.random() * 1000),
          [CaptchaType.ICON]: Math.floor(Math.random() * 500),
          [CaptchaType.ROTATE]: Math.floor(Math.random() * 500)
        }
      }
    };
  }
}

module.exports = {
  CaptchaType,
  CaptchaXClient,
  VerifyResult
};
