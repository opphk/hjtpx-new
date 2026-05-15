const { EventEmitter } = require('events');

class ClickCaptcha extends EventEmitter {
  constructor(container, options = {}) {
    super();
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      width: options.width || 320,
      height: options.height || 240,
      backgroundImage: options.backgroundImage || '',
      clickLimit: options.clickLimit || 4,
      ...options
    };
    
    this.state = {
      clickPositions: [],
      isVerified: false,
      isExpired: false,
      clickCount: 0
    };
    
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    const wrapper = document.createElement('div');
    wrapper.className = 'captcha-click-wrapper';
    wrapper.style.cssText = `
      position: relative;
      width: ${this.options.width}px;
      height: ${this.options.height}px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: #f5f5f5;
      font-family: Arial, sans-serif;
      cursor: crosshair;
    `;

    this.bgImage = document.createElement('div');
    this.bgImage.className = 'captcha-background';
    this.bgImage.style.cssText = `
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
    `;

    this.clickIndicator = document.createElement('div');
    this.clickIndicator.className = 'captcha-indicator';
    this.clickIndicator.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10;
    `;
    this.updateIndicator();

    this.clickMarkers = document.createElement('div');
    this.clickMarkers.className = 'captcha-markers';

    this.hintText = document.createElement('div');
    this.hintText.className = 'captcha-hint';
    this.hintText.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10;
    `;
    this.hintText.textContent = `请依次点击所有目标 (${this.options.clickLimit}个)`;

    this.successOverlay = document.createElement('div');
    this.successOverlay.className = 'captcha-success';
    this.successOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(76, 175, 80, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
    `;
    this.successOverlay.innerHTML = '✓ 验证成功';

    wrapper.appendChild(this.bgImage);
    wrapper.appendChild(this.clickIndicator);
    wrapper.appendChild(this.clickMarkers);
    wrapper.appendChild(this.hintText);
    wrapper.appendChild(this.successOverlay);
    
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);
    
    this.wrapper = wrapper;
  }

  bindEvents() {
    this.wrapper.addEventListener('click', (e) => this.onClick(e));
  }

  onClick(e) {
    if (this.state.isVerified) return;
    
    const rect = this.wrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (this.state.clickCount >= this.options.clickLimit) {
      this.hintText.textContent = `已选择 ${this.options.clickLimit} 个目标，请验证`;
      return;
    }
    
    this.state.clickPositions.push({ x, y, timestamp: Date.now() });
    this.state.clickCount++;
    
    this.addMarker(x, y, this.state.clickCount);
    this.updateIndicator();
    
    this.hintText.textContent = this.state.clickCount >= this.options.clickLimit
      ? `已选择 ${this.options.clickLimit} 个目标，请验证`
      : `请继续点击 (${this.state.clickCount}/${this.options.clickLimit})`;
    
    if (this.state.clickCount >= this.options.clickLimit) {
      this.emit('ready', {
        positions: this.state.clickPositions
      });
    }
  }

  addMarker(x, y, number) {
    const marker = document.createElement('div');
    marker.className = `captcha-marker marker-${number}`;
    marker.style.cssText = `
      position: absolute;
      left: ${x - 15}px;
      top: ${y - 15}px;
      width: 30px;
      height: 30px;
      background: rgba(255, 87, 34, 0.8);
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
      animation: pulse 0.3s ease-in-out;
    `;
    marker.textContent = number;
    
    this.clickMarkers.appendChild(marker);
  }

  updateIndicator() {
    this.clickIndicator.textContent = `${this.state.clickCount}/${this.options.clickLimit}`;
  }

  setImages(backgroundImage) {
    if (backgroundImage) {
      this.bgImage.style.backgroundImage = `url(${backgroundImage})`;
    }
  }

  setClickLimit(limit) {
    this.options.clickLimit = limit;
    this.updateIndicator();
    this.hintText.textContent = `请依次点击所有目标 (${limit}个)`;
  }

  verify() {
    if (this.state.clickPositions.length === 0) {
      return null;
    }
    
    this.emit('verify', {
      positions: this.state.clickPositions,
      count: this.state.clickCount
    });
    
    return {
      positions: this.state.clickPositions,
      count: this.state.clickCount
    };
  }

  showSuccess() {
    this.state.isVerified = true;
    this.successOverlay.style.display = 'flex';
    this.hintText.textContent = '验证成功';
    this.wrapper.style.cursor = 'default';
  }

  showError() {
    this.hintText.textContent = '验证失败，请重试';
    
    setTimeout(() => {
      this.reset();
    }, 1500);
  }

  reset() {
    this.state = {
      clickPositions: [],
      isVerified: false,
      isExpired: false,
      clickCount: 0
    };
    
    this.clickMarkers.innerHTML = '';
    this.updateIndicator();
    this.hintText.textContent = `请依次点击所有目标 (${this.options.clickLimit}个)`;
    this.successOverlay.style.display = 'none';
    this.wrapper.style.cursor = 'crosshair';
  }

  destroy() {
    this.removeAllListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

module.exports = ClickCaptcha;
