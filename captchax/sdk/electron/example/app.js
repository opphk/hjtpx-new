const { createCaptcha } = require('../src/components');

class ExampleApplication {
  constructor() {
    this.currentType = 'slider';
    this.captchaInstance = null;
    this.currentCaptchaData = null;
    
    this.typeInfo = {
      slider: {
        name: '滑块验证',
        info: '拖动滑块至正确位置完成验证。滑块验证码通过检测滑动轨迹来判断是否为真实用户。'
      },
      click: {
        name: '点选验证',
        info: '点击图片中指定的区域。系统会记录点击位置进行验证。'
      },
      puzzle: {
        name: '拼图验证',
        info: '将拼图块滑动到正确的位置。拼图块会自动与背景图片对齐。'
      },
      rotate: {
        name: '旋转验证',
        info: '将图片旋转到指定角度。可以通过拖动或点击按钮来旋转图片。'
      },
      text: {
        name: '文字验证',
        info: '输入显示的字符或数字。区分大小写。'
      },
      icon: {
        name: '图标验证',
        info: '选择符合提示条件的图标。可多选。'
      }
    };
    
    this.init();
  }

  init() {
    console.log('Example app initializing...');
    
    this.setupEventListeners();
    this.loadCaptcha('slider');
    this.loadAppInfo();
    
    if (window.exampleApp) {
      window.exampleApp.onCaptchaSuccess((data) => {
        console.log('Captcha success:', data);
        this.showResult('success', '验证成功！', data);
      });
      
      window.exampleApp.onCaptchaFail((data) => {
        console.log('Captcha failed:', data);
        this.showResult('fail', '验证失败', data);
      });
      
      window.exampleApp.onCaptchaError((data) => {
        console.error('Captcha error:', data);
        this.showResult('error', '验证出错', data);
      });
    }
    
    console.log('Example app initialized');
  }

  setupEventListeners() {
    const captchaBtns = document.querySelectorAll('.captcha-btn');
    captchaBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.switchType(type);
        
        captchaBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('btn-verify').addEventListener('click', () => {
      this.verify();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      this.reset();
    });
  }

  async switchType(type) {
    this.currentType = type;
    this.hideResult();
    
    const info = this.typeInfo[type];
    document.getElementById('info-text').textContent = info.info;
    
    this.loadCaptcha(type);
  }

  async loadCaptcha(type) {
    const container = document.getElementById('captcha-container');
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>加载验证码中...</p>
      </div>
    `;

    if (this.captchaInstance) {
      this.captchaInstance.destroy();
      this.captchaInstance = null;
    }

    try {
      if (window.exampleApp) {
        const response = await window.exampleApp.sdk.getCaptcha(type);
        
        if (response.success) {
          this.currentCaptchaData = response.data;
          this.createCaptchaUI(type, container, response.data);
        } else {
          console.warn('Failed to load captcha from server, using demo mode');
          this.createDemoCaptcha(type, container);
        }
      } else {
        this.createDemoCaptcha(type, container);
      }
    } catch (error) {
      console.error('Error loading captcha:', error);
      this.createDemoCaptcha(type, container);
    }

    this.updateStatus('验证码已加载');
  }

  createCaptchaUI(type, container, data) {
    const options = {
      width: 320,
      height: type === 'rotate' ? 320 : 160,
      backgroundImage: data.imageUrl || data.backgroundImage,
      sliderImage: data.thumbnailUrl
    };

    if (data.track && data.track.targetX) {
      options.targetX = data.track.targetX;
    }

    if (type === 'click') {
      options.clickLimit = data.clickLimit || 4;
    } else if (type === 'icon') {
      options.selectLimit = data.selectLimit || 3;
      options.hint = data.hint || '请选择所有包含"汽车"的图片';
      options.icons = data.icons || [];
    } else if (type === 'text') {
      options.textLength = data.textLength || 4;
      options.textType = data.textType || 'alphanumeric';
    } else if (type === 'rotate') {
      options.targetAngle = data.targetAngle || 45;
    }

    try {
      container.innerHTML = '';
      this.captchaInstance = createCaptcha(type, container, options);
      this.setupCaptchaEvents();
    } catch (error) {
      console.error('Error creating captcha UI:', error);
      this.createDemoCaptcha(type, container);
    }
  }

  createDemoCaptcha(type, container) {
    const demoData = {
      slider: {
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        targetX: 150
      },
      click: {
        backgroundImage: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
        clickLimit: 4
      },
      puzzle: {
        backgroundImage: 'linear-gradient(135deg, #48dbfb 0%, #0abde3 100%)',
        targetX: 160
      },
      rotate: {
        backgroundImage: 'linear-gradient(135deg, #ff9ff3 0%, #f368e0 100%)',
        targetAngle: 45
      },
      text: {
        textLength: 4,
        textType: 'alphanumeric'
      },
      icon: {
        selectLimit: 3,
        hint: '请选择所有包含"汽车"的图片',
        icons: [
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
        ]
      }
    };

    const data = demoData[type];
    this.currentCaptchaData = {
      captchaId: `demo-${Date.now()}`,
      ...data
    };

    this.createCaptchaUI(type, container, data);
  }

  setupCaptchaEvents() {
    if (!this.captchaInstance) return;

    this.captchaInstance.on('verify', (data) => {
      console.log('Verification data:', data);
      this.lastVerificationData = data;
    });

    this.captchaInstance.on('ready', (data) => {
      console.log('Captcha ready:', data);
      this.updateStatus('验证码已就绪');
    });

    this.captchaInstance.on('select', (data) => {
      console.log('Icon selected:', data);
    });
  }

  async verify() {
    if (!this.captchaInstance) {
      this.showResult('error', '请先加载验证码');
      return;
    }

    let userResponse = {};

    switch (this.currentType) {
      case 'slider':
      case 'puzzle':
        userResponse = {
          position: this.captchaInstance.state?.currentX || 0,
          track: this.captchaInstance.state?.track || []
        };
        break;

      case 'click':
        const clickResult = this.captchaInstance.verify();
        if (!clickResult) {
          this.showResult('error', '请先完成点选');
          return;
        }
        userResponse = clickResult;
        break;

      case 'rotate':
        userResponse = {
          angle: this.captchaInstance.state?.currentAngle || 0,
          track: this.captchaInstance.state?.track || []
        };
        this.captchaInstance.verifyRotation();
        return;

      case 'text':
        this.captchaInstance.verify();
        return;

      case 'icon':
        this.captchaInstance.verify();
        return;
    }

    if (this.lastVerificationData) {
      userResponse = this.lastVerificationData;
    }

    this.updateStatus('验证中...');

    try {
      if (window.exampleApp) {
        const result = await window.exampleApp.sdk.verify({
          type: this.currentType,
          captchaId: this.currentCaptchaData?.captchaId || 'demo-captcha',
          track: userResponse.track || [],
          userResponse: userResponse
        });

        if (result.data?.success) {
          this.captchaInstance.showSuccess();
          this.showResult('success', '验证成功', result);
        } else {
          this.captchaInstance.showError();
          this.showResult('fail', result.data?.message || '验证失败', result);
        }
      } else {
        this.simulateVerification(userResponse);
      }
    } catch (error) {
      console.error('Verification error:', error);
      this.simulateVerification(userResponse);
    }
  }

  simulateVerification(data) {
    const isSuccess = Math.random() > 0.3;

    if (isSuccess) {
      this.captchaInstance.showSuccess();
      this.showResult('success', '模拟验证成功', data);
      this.updateStatus('验证成功');

      if (window.exampleApp) {
        window.exampleApp.app.showNotification('CaptchaX', '验证成功');
      }
    } else {
      this.captchaInstance.showError();
      this.showResult('fail', '模拟验证失败，请重试', data);
      this.updateStatus('验证失败');
    }
  }

  reset() {
    if (this.captchaInstance) {
      this.captchaInstance.reset();
    }
    this.hideResult();
    this.lastVerificationData = null;
    this.updateStatus('验证码已重置');
  }

  showResult(type, message, data) {
    const resultDiv = document.getElementById('result');
    const resultContent = document.getElementById('result-content');

    resultDiv.classList.add('show');

    const icon = type === 'success' ? '✓' : type === 'fail' ? '✗' : '⚠';
    const color = type === 'success' ? '#4CAF50' : type === 'fail' ? '#f44336' : '#ff9800';

    resultContent.innerHTML = `
      <div style="color: ${color}; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
        ${icon} ${message}
      </div>
      <pre style="margin-top: 10px; white-space: pre-wrap; word-wrap: break-word;">
${JSON.stringify(data, null, 2)}
      </pre>
    `;
  }

  hideResult() {
    const resultDiv = document.getElementById('result');
    resultDiv.classList.remove('show');
  }

  updateStatus(message) {
    document.getElementById('status-info').textContent = message;
  }

  async loadAppInfo() {
    if (window.exampleApp) {
      try {
        const info = await window.exampleApp.app.getInfo();
        document.getElementById('version-info').textContent =
          `Electron ${info.electronVersion} | 版本 ${info.version} | ${info.platform}`;
      } catch (error) {
        console.error('Failed to load app info:', error);
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new ExampleApplication();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExampleApplication;
}
