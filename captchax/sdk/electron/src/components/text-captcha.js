const { EventEmitter } = require('events');

class TextCaptcha extends EventEmitter {
  constructor(container, options = {}) {
    super();
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      width: options.width || 320,
      height: options.height || 200,
      backgroundImage: options.backgroundImage || '',
      textType: options.textType || 'numeric',
      textLength: options.textLength || 4,
      caseSensitive: options.caseSensitive !== false,
      ...options
    };
    
    this.state = {
      currentText: '',
      userInput: '',
      isVerified: false,
      isExpired: false,
      attempts: 0
    };
    
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    const wrapper = document.createElement('div');
    wrapper.className = 'captcha-text-wrapper';
    wrapper.style.cssText = `
      position: relative;
      width: ${this.options.width}px;
      height: ${this.options.height}px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: #f5f5f5;
      font-family: Arial, sans-serif;
    `;

    this.imageContainer = document.createElement('div');
    this.imageContainer.className = 'captcha-text-image';
    this.imageContainer.style.cssText = `
      width: 100%;
      height: 120px;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;

    this.captchaText = document.createElement('div');
    this.captchaText.className = 'captcha-display-text';
    this.captchaText.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: #333;
      letter-spacing: 8px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
      user-select: none;
    `;

    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = this.options.width;
    this.noiseCanvas.height = 120;
    this.noiseCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 120px;
      pointer-events: none;
    `;

    this.inputContainer = document.createElement('div');
    this.inputContainer.style.cssText = `
      padding: 20px;
      background: white;
    `;

    this.inputLabel = document.createElement('label');
    this.inputLabel.textContent = '请输入验证码:';
    this.inputLabel.style.cssText = `
      display: block;
      margin-bottom: 10px;
      color: #666;
      font-size: 14px;
    `;

    this.inputWrapper = document.createElement('div');
    this.inputWrapper.style.cssText = `
      display: flex;
      gap: 10px;
    `;

    this.textInput = document.createElement('input');
    this.textInput.type = 'text';
    this.textInput.placeholder = '输入验证码';
    this.textInput.maxLength = this.options.textLength;
    this.textInput.style.cssText = `
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      outline: none;
    `;

    this.verifyButton = document.createElement('button');
    this.verifyButton.textContent = '验证';
    this.verifyButton.style.cssText = `
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    `;

    this.refreshButton = document.createElement('button');
    this.refreshButton.textContent = '↻';
    this.refreshButton.title = '刷新验证码';
    this.refreshButton.style.cssText = `
      width: 40px;
      height: 40px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 18px;
    `;

    this.messageArea = document.createElement('div');
    this.messageArea.className = 'captcha-message';
    this.messageArea.style.cssText = `
      margin-top: 10px;
      padding: 8px;
      border-radius: 4px;
      font-size: 14px;
      text-align: center;
      display: none;
    `;

    this.imageContainer.appendChild(this.captchaText);
    this.imageContainer.appendChild(this.noiseCanvas);
    
    this.inputWrapper.appendChild(this.textInput);
    this.inputWrapper.appendChild(this.verifyButton);
    this.inputWrapper.appendChild(this.refreshButton);
    
    this.inputContainer.appendChild(this.inputLabel);
    this.inputContainer.appendChild(this.inputWrapper);
    this.inputContainer.appendChild(this.messageArea);
    
    wrapper.appendChild(this.imageContainer);
    wrapper.appendChild(this.inputContainer);
    
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);
    
    this.wrapper = wrapper;
    this.ctx = this.noiseCanvas.getContext('2d');
  }

  bindEvents() {
    this.verifyButton.addEventListener('click', () => this.verify());
    this.refreshButton.addEventListener('click', () => this.refresh());
    this.textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.verify();
      }
    });
  }

  generateText() {
    const chars = {
      numeric: '0123456789',
      alphabetic: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      alphanumeric: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    };
    
    const charSet = chars[this.options.textType] || chars.alphanumeric;
    let text = '';
    
    for (let i = 0; i < this.options.textLength; i++) {
      text += charSet.charAt(Math.floor(Math.random() * charSet.length));
    }
    
    return text;
  }

  generateNoise() {
    this.ctx.clearRect(0, 0, this.noiseCanvas.width, this.noiseCanvas.height);
    
    for (let i = 0; i < 100; i++) {
      this.ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.1)`;
      this.ctx.fillRect(
        Math.random() * this.noiseCanvas.width,
        Math.random() * this.noiseCanvas.height,
        Math.random() * 3,
        Math.random() * 3
      );
    }
    
    for (let i = 0; i < 10; i++) {
      this.ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`;
      this.ctx.beginPath();
      this.ctx.moveTo(
        Math.random() * this.noiseCanvas.width,
        Math.random() * this.noiseCanvas.height
      );
      this.ctx.lineTo(
        Math.random() * this.noiseCanvas.width,
        Math.random() * this.noiseCanvas.height
      );
      this.ctx.stroke();
    }
  }

  setText(text) {
    this.state.currentText = text || this.generateText();
    this.captchaText.textContent = this.state.currentText;
    this.generateNoise();
  }

  verify() {
    const userText = this.textInput.value;
    
    if (!userText) {
      this.showMessage('请输入验证码', 'error');
      return;
    }
    
    this.state.userInput = userText;
    this.state.attempts++;
    
    const isCorrect = this.options.caseSensitive
      ? userText === this.state.currentText
      : userText.toLowerCase() === this.state.currentText.toLowerCase();
    
    this.emit('verify', {
      userInput: userText,
      correctText: this.state.currentText,
      isCorrect: isCorrect,
      attempts: this.state.attempts
    });
    
    if (isCorrect) {
      this.showSuccess();
    } else {
      this.showError();
    }
  }

  refresh() {
    this.state.userInput = '';
    this.textInput.value = '';
    this.hideMessage();
    this.setText();
    
    this.emit('refresh', {
      oldText: this.state.currentText,
      newText: this.state.currentText
    });
  }

  showMessage(message, type = 'info') {
    this.messageArea.textContent = message;
    this.messageArea.style.display = 'block';
    
    if (type === 'success') {
      this.messageArea.style.background = '#d4edda';
      this.messageArea.style.color = '#155724';
    } else if (type === 'error') {
      this.messageArea.style.background = '#f8d7da';
      this.messageArea.style.color = '#721c24';
    } else {
      this.messageArea.style.background = '#d1ecf1';
      this.messageArea.style.color = '#0c5460';
    }
  }

  hideMessage() {
    this.messageArea.style.display = 'none';
  }

  showSuccess() {
    this.state.isVerified = true;
    this.showMessage('✓ 验证成功', 'success');
    this.textInput.disabled = true;
    this.verifyButton.disabled = true;
    this.verifyButton.style.background = '#4CAF50';
    this.verifyButton.textContent = '已验证';
  }

  showError() {
    this.showMessage('验证码错误，请重试', 'error');
    this.textInput.value = '';
    this.textInput.focus();
    
    this.captchaText.style.color = '#f44336';
    setTimeout(() => {
      this.captchaText.style.color = '#333';
    }, 500);
  }

  reset() {
    this.state = {
      currentText: '',
      userInput: '',
      isVerified: false,
      isExpired: false,
      attempts: 0
    };
    
    this.textInput.value = '';
    this.textInput.disabled = false;
    this.verifyButton.disabled = false;
    this.verifyButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    this.verifyButton.textContent = '验证';
    this.hideMessage();
    this.setText();
  }

  destroy() {
    this.removeAllListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

module.exports = TextCaptcha;
