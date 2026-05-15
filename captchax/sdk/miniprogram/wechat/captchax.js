/**
 * CaptchaX 微信小程序 SDK
 * 用于集成滑块验证码、点选验证码、拼图验证码等多种验证码类型
 */

class CaptchaX {
  constructor(options = {}) {
    this.config = {
      baseUrl: options.baseUrl || 'https://captchax.example.com',
      timeout: options.timeout || 10000,
      debug: options.debug || false
    };
  }

  /**
   * 设置配置
   */
  setConfig(options) {
    if (options.baseUrl) this.config.baseUrl = options.baseUrl;
    if (options.timeout) this.config.timeout = options.timeout;
    if (options.debug !== undefined) this.config.debug = options.debug;
  }

  /**
   * 获取验证码
   * @param {string} type - 验证码类型：slider, click, puzzle, rotate, text, icon
   * @param {object} options - 可选参数
   * @returns {Promise<object>} 验证码数据
   */
  async getCaptcha(type, options = {}) {
    const validTypes = ['slider', 'click', 'puzzle', 'rotate', 'text', 'icon'];
    
    if (!validTypes.includes(type)) {
      throw new Error(`无效的验证码类型: ${type}。支持的类型: ${validTypes.join(', ')}`);
    }

    try {
      const response = await this.request({
        url: `/api/v1/captcha/${type}`,
        method: 'POST',
        data: options
      });

      if (response.success && response.data) {
        this.log('获取验证码成功:', response.data);
        return response.data;
      } else {
        throw new Error(response.message || '获取验证码失败');
      }
    } catch (error) {
      this.log('获取验证码失败:', error);
      throw error;
    }
  }

  /**
   * 验证验证码
   * @param {string} type - 验证码类型
   * @param {object} verifyData - 验证数据
   * @returns {Promise<object>} 验证结果
   */
  async verify(type, verifyData) {
    if (!verifyData || !verifyData.captchaId) {
      throw new Error('验证数据无效：缺少 captchaId');
    }

    try {
      const response = await this.request({
        url: `/api/v1/captcha/${type}/verify`,
        method: 'POST',
        data: verifyData
      });

      if (response.success) {
        this.log('验证成功:', response.data);
      } else {
        this.log('验证失败:', response.message);
      }

      return response;
    } catch (error) {
      this.log('验证失败:', error);
      throw error;
    }
  }

  /**
   * 发送请求
   */
  async request(options) {
    const { url, method = 'GET', data = {} } = options;
    const fullUrl = url.startsWith('http') ? url : this.config.baseUrl + url;

    return new Promise((resolve, reject) => {
      wx.request({
        url: fullUrl,
        method: method,
        data: data,
        timeout: this.config.timeout,
        header: {
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }

  /**
   * 日志输出
   */
  log(...args) {
    if (this.config.debug) {
      console.log('[CaptchaX]', ...args);
    }
  }

  /**
   * 预加载图片
   * @param {string} url - 图片URL
   * @returns {Promise<string>} 本地临时文件路径
   */
  async preloadImage(url) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath);
          } else {
            reject(new Error('图片下载失败'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 批量预加载图片
   * @param {string[]} urls - 图片URL数组
   * @returns {Promise<string[]>} 本地临时文件路径数组
   */
  async preloadImages(urls) {
    const promises = urls.map(url => this.preloadImage(url));
    return Promise.all(promises);
  }
}

module.exports = CaptchaX;
