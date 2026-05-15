const { CaptchaComponents, createCaptcha } = require('../components');
const { createSDK, CAPTCHA_TYPES, CAPTCHA_EVENTS } = require('../../captcha-electron');

class CaptchaDemoApp {
  constructor() {
    this.sdk = null;
    this.currentCaptcha = null;
    this.currentType = 'slider';
    this.captchaInstance = null;
    
    this.captchaInfo = {
      slider: {
        title: '滑块验证码',
        description: '拖动滑块至正确位置完成验证',
        info: '滑块验证码通过检测用户的滑动轨迹来判断是否为真实用户。拖动滑块到图片缺口位置即可完成验证。'
      },
      click: {
        title: '点选验证码',
        description: '点击指定目标完成验证',
        info: '点选验证码要求用户点击图片中指定的目标区域。系统会记录点击位置进行验证。'
      },
      puzzle: {
        title: '拼图验证码',
        description: '滑动拼图块完成验证',
        info: '拼图验证码需要用户将拼图块滑动到正确的位置。拼图块会自动与背景图片对齐。'
      },
      rotate: {
        title: '旋转验证码',
        description: '旋转图片至正确角度',
        info: '旋转验证码要求用户将图片旋转到指定角度。可以通过拖动或点击按钮来旋转图片。'
      },
      text: {
        title: '文字验证码',
        description: '输入显示的字符',
        info: '文字验证码显示一组字符或数字，用户需要正确输入这些字符来完成验证。'
      },
      icon: {
        title: '图标验证码',
        description: '选择指定图标完成验证',
        info: '图标验证码显示多个图标，用户需要选择符合提示条件的图标来完成验证。'
      }
    };
    
    this.init();
  }

  async init() {
    console.log('CaptchaX Demo App initializing...');
    
    this.sdk = createSDK({
      apiBaseUrl: 'http://localhost:3000',
      enableNotifications: true,
      enableTray: true
    });
    
    this.setupEventListeners();
    this.setupUI();
    await this.loadInitialCaptcha();
    
    console.log('CaptchaX Demo App initialized');
  }

  setupEventListeners() {
    const captchaItems = document.querySelectorAll('.captcha-item');
    captchaItems.forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        this.switchCaptchaType(type);
      });
    });

    document.getElementById('btn-verify').addEventListener('click', () => this.verifyCaptcha());
    document.getElementById('btn-reset').addEventListener('click', () => this.resetCaptcha());
    document.getElementById('btn-refresh').addEventListener('click', () => this.refreshCaptcha());

    if (window.captchaElectron) {
      window.captchaElectron.onMenuNewCaptcha(() => {
        console.log('New captcha requested from menu');
        this.refreshCaptcha();
      });
    }

    this.sdk.on(CAPTCHA_EVENTS.SUCCESS, (data) => {
      console.log('Captcha verified successfully:', data);
      this.showResult({
        success: true,
        message: '验证成功',
        data: data
      });
      
      if (window.captchaElectron) {
        window.captchaElectron.showNotification('CaptchaX', '验证成功');
      }
    });

    this.sdk.on(CAPTCHA_EVENTS.FAIL, (data) => {
      console.log('Captcha verification failed:', data);
      this.showResult({
        success: false,
        message: data.message || '验证失败',
        data: data
      });
    });

    this.sdk.on(CAPTCHA_EVENTS.ERROR, (data) => {
      console.error('Captcha error:', data);
      this.showResult({
        success: false,
        message: `错误: ${data.error}`,
        data: data
      });
    });
  }

  setupUI() {
    document.querySelectorAll('.captcha-item').forEach(item => {
      if (item.dataset.type === this.currentType) {
        item.classList.add('active');
      }
    });

    this.updateInfoBox();
    this.updateStatusBar();
  }

  async loadInitialCaptcha() {
    try {
      const data = await this.sdk.getCaptcha(this.currentType);
      this.createCaptchaUI(data);
    } catch (error) {
      console.error('Failed to load captcha:', error);
      this.createDemoCaptcha();
    }
  }

  switchCaptchaType(type) {
    if (type === this.currentType) return;

    this.currentType = type;
    
    document.querySelectorAll('.captcha-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.type === type) {
        item.classList.add('active');
      }
    });

    const info = this.captchaInfo[type];
    document.getElementById('captcha-title').textContent = info.title;
    document.getElementById('captcha-description').textContent = info.description;
    
    this.updateInfoBox();
    this.hideResult();
    this.loadInitialCaptcha();
  }

  createCaptchaUI(data) {
    const wrapper = document.getElementById('captcha-wrapper');
    wrapper.innerHTML = '';

    try {
      this.captchaInstance = createCaptcha(this.currentType, wrapper, {
        width: 320,
        height: this.currentType === 'rotate' ? 320 : 160,
        backgroundImage: data.imageUrl || data.backgroundImage,
        sliderImage: data.thumbnailUrl
      });

      if (data.track) {
        this.captchaInstance.setTargetPosition(data.track.targetX || 0);
      }

      this.setupCaptchaEvents();
      
      this.currentCaptcha = data;
    } catch (error) {
      console.error('Error creating captcha UI:', error);
      this.createDemoCaptcha();
    }
  }

  createDemoCaptcha() {
    const wrapper = document.getElementById('captcha-wrapper');
    wrapper.innerHTML = '';

    const demoData = this.getDemoData();
    this.createCaptchaUI(demoData);
  }

  getDemoData() {
    const demoIcons = [
      { icon: '🚗', emoji: '🚗' },
      { icon: '🏠', emoji: '🏠' },
      { icon: '🌳', emoji: '🌳' },
      { icon: '🐱', emoji: '🐱' },
      { icon: '🍎', emoji: '🍎' },
      { icon: '⭐', emoji: '⭐' },
      { icon: '🎵', emoji: '🎵' },
      { icon: '📱', emoji: '📱' },
      { icon: '✈️', emoji: '✈️' },
      { icon: '🌹', emoji: '🌹' },
      { icon: '🎨', emoji: '🎨' },
      { icon: '🔑', emoji: '🔑' }
    ];

    return {
      captchaId: `demo-${Date.now()}`,
      imageUrl: '',
      backgroundImage: '',
      thumbnailUrl: '',
      track: { targetX: Math.random() * 200 + 50 },
      icons: demoIcons,
      hint: '请选择所有包含"汽车"的图片'
    };
  }

  setupCaptchaEvents() {
    if (!this.captchaInstance) return;

    this.captchaInstance.on('verify', (data) => {
      console.log('Captcha verification data:', data);
      this.lastVerificationData = data;
    });

    this.captchaInstance.on('ready', (data) => {
      console.log('Captcha ready:', data);
    });

    this.captchaInstance.on('refresh', () => {
      console.log('Captcha refreshed');
      this.refreshCaptcha();
    });

    this.captchaInstance.on('select', (data) => {
      console.log('Icon selected:', data);
    });
  }

  async verifyCaptcha() {
    if (!this.captchaInstance) {
      this.showResult({
        success: false,
        message: '请先加载验证码'
      });
      return;
    }

    let verificationData;

    if (this.currentType === 'slider' || this.currentType === 'puzzle') {
      verificationData = {
        position: this.captchaInstance.state?.currentX || 0,
        track: this.captchaInstance.state?.track || []
      };
    } else if (this.currentType === 'click') {
      verificationData = this.captchaInstance.verify();
      if (!verificationData) return;
    } else if (this.currentType === 'rotate') {
      verificationData = {
        angle: this.captchaInstance.state?.currentAngle || 0,
        track: this.captchaInstance.state?.track || []
      };
      this.captchaInstance.verifyRotation();
      return;
    } else if (this.currentType === 'text') {
      this.captchaInstance.verify();
      return;
    } else if (this.currentType === 'icon') {
      this.captchaInstance.verify();
      return;
    }

    if (this.lastVerificationData) {
      verificationData = this.lastVerificationData;
    }

    try {
      const result = await this.sdk.verify(
        this.currentType,
        this.currentCaptcha?.captchaId || 'demo-captcha',
        verificationData.track || [],
        verificationData
      );

      if (result.data?.success) {
        this.captchaInstance.showSuccess();
      } else {
        this.captchaInstance.showError();
      }
    } catch (error) {
      console.error('Verification error:', error);
      
      this.simulateVerification(verificationData);
    }
  }

  simulateVerification(data) {
    const isCorrect = Math.random() > 0.3;
    
    if (isCorrect) {
      this.captchaInstance.showSuccess();
      this.showResult({
        success: true,
        message: '模拟验证成功',
        data: data
      });
    } else {
      this.captchaInstance.showError();
      this.showResult({
        success: false,
        message: '模拟验证失败，请重试',
        data: data
      });
    }
  }

  resetCaptcha() {
    if (this.captchaInstance) {
      this.captchaInstance.reset();
    }
    this.hideResult();
    this.lastVerificationData = null;
  }

  refreshCaptcha() {
    this.hideResult();
    this.lastVerificationData = null;
    this.loadInitialCaptcha();
  }

  showResult(result) {
    const resultArea = document.getElementById('result-area');
    const resultContent = document.getElementById('result-content');
    
    resultArea.classList.remove('hidden');
    resultContent.textContent = JSON.stringify(result, null, 2);
  }

  hideResult() {
    const resultArea = document.getElementById('result-area');
    resultArea.classList.add('hidden');
  }

  updateInfoBox() {
    const info = this.captchaInfo[this.currentType];
    document.getElementById('info-text').textContent = info.info;
  }

  async updateStatusBar() {
    const platformSpan = document.getElementById('status-platform');
    const versionSpan = document.getElementById('status-version');

    if (window.captchaElectron) {
      try {
        const platform = await window.captchaElectron.getPlatform();
        const version = await window.captchaElectron.getAppVersion();
        
        platformSpan.textContent = `平台: ${platform}`;
        versionSpan.textContent = `版本: ${version}`;
      } catch (error) {
        platformSpan.textContent = '平台: Web';
        versionSpan.textContent = '版本: Demo';
      }
    } else {
      platformSpan.textContent = '平台: Web';
      versionSpan.textContent = '版本: Demo';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new CaptchaDemoApp();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CaptchaDemoApp;
}
