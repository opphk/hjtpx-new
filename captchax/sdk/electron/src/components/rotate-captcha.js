const { EventEmitter } = require('events');

class RotateCaptcha extends EventEmitter {
  constructor(container, options = {}) {
    super();
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      width: options.width || 320,
      height: options.height || 320,
      backgroundImage: options.backgroundImage || '',
      targetAngle: options.targetAngle || 45,
      ...options
    };
    
    this.state = {
      currentAngle: 0,
      startAngle: 0,
      startX: 0,
      isDragging: false,
      isVerified: false,
      isExpired: false,
      track: []
    };
    
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    const wrapper = document.createElement('div');
    wrapper.className = 'captcha-rotate-wrapper';
    wrapper.style.cssText = `
      position: relative;
      width: ${this.options.width}px;
      height: ${this.options.height + 80}px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: #f5f5f5;
      font-family: Arial, sans-serif;
    `;

    this.imageContainer = document.createElement('div');
    this.imageContainer.className = 'captcha-images';
    this.imageContainer.style.cssText = `
      position: relative;
      width: ${this.options.width}px;
      height: ${this.options.height}px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ddd;
    `;

    this.bgImage = document.createElement('div');
    this.bgImage.className = 'captcha-background';
    this.bgImage.style.cssText = `
      width: 280px;
      height: 280px;
      background-size: cover;
      background-position: center;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: transform 0.1s ease-out;
    `;

    this.rotateIndicator = document.createElement('div');
    this.rotateIndicator.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 20px;
      background: #ff5722;
      border-radius: 2px;
    `;

    this.angleDisplay = document.createElement('div');
    this.angleDisplay.className = 'captcha-angle';
    this.angleDisplay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 24px;
      font-weight: bold;
      pointer-events: none;
    `;
    this.angleDisplay.textContent = '0°';

    this.controlBar = document.createElement('div');
    this.controlBar.className = 'captcha-control-bar';
    this.controlBar.style.cssText = `
      width: 100%;
      height: 80px;
      background: white;
      border-top: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px;
      box-sizing: border-box;
    `;

    this.hintText = document.createElement('div');
    this.hintText.style.cssText = `
      color: #666;
      font-size: 14px;
      margin-bottom: 10px;
    `;
    this.hintText.textContent = '拖动图片旋转至正确位置';

    this.buttonGroup = document.createElement('div');
    this.buttonGroup.style.cssText = `
      display: flex;
      gap: 10px;
    `;

    this.rotateLeftButton = document.createElement('button');
    this.rotateLeftButton.textContent = '↺ 左转';
    this.rotateLeftButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
    `;

    this.rotateRightButton = document.createElement('button');
    this.rotateRightButton.textContent = '右转 ↻';
    this.rotateRightButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
    `;

    this.verifyButton = document.createElement('button');
    this.verifyButton.textContent = '验证';
    this.verifyButton.style.cssText = `
      padding: 8px 24px;
      border: none;
      border-radius: 4px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    `;

    this.successOverlay = document.createElement('div');
    this.successOverlay.className = 'captcha-success';
    this.successOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: ${this.options.height}px;
      background: rgba(76, 175, 80, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
      z-index: 20;
    `;
    this.successOverlay.innerHTML = '✓ 验证成功';

    this.imageContainer.appendChild(this.bgImage);
    this.imageContainer.appendChild(this.rotateIndicator);
    this.imageContainer.appendChild(this.angleDisplay);
    this.imageContainer.appendChild(this.successOverlay);
    
    this.buttonGroup.appendChild(this.rotateLeftButton);
    this.buttonGroup.appendChild(this.verifyButton);
    this.buttonGroup.appendChild(this.rotateRightButton);
    
    this.controlBar.appendChild(this.hintText);
    this.controlBar.appendChild(this.buttonGroup);
    
    wrapper.appendChild(this.imageContainer);
    wrapper.appendChild(this.controlBar);
    
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);
    
    this.wrapper = wrapper;
  }

  bindEvents() {
    this.bgImage.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    
    this.bgImage.addEventListener('touchstart', (e) => this.onTouchStart(e));
    document.addEventListener('touchmove', (e) => this.onTouchMove(e));
    document.addEventListener('touchend', (e) => this.onTouchEnd(e));
    
    this.rotateLeftButton.addEventListener('click', () => this.rotateBy(-15));
    this.rotateRightButton.addEventListener('click', () => this.rotateBy(15));
    this.verifyButton.addEventListener('click', () => this.verifyRotation());
  }

  getAngleFromCenter(clientX, clientY) {
    const rect = this.bgImage.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    angle = angle + 90;
    
    if (angle < 0) angle += 360;
    
    return angle;
  }

  onMouseDown(e) {
    if (this.state.isVerified) return;
    
    e.preventDefault();
    this.state.isDragging = true;
    this.state.startAngle = this.getAngleFromCenter(e.clientX, e.clientY);
    this.state.startX = this.state.currentAngle;
  }

  onMouseMove(e) {
    if (!this.state.isDragging) return;
    
    const currentAngle = this.getAngleFromCenter(e.clientX, e.clientY);
    let deltaAngle = currentAngle - this.state.startAngle;
    
    this.state.currentAngle = this.state.startX + deltaAngle;
    this.updateRotation();
  }

  onMouseUp(e) {
    if (!this.state.isDragging) return;
    
    this.state.isDragging = false;
    this.state.track.push({
      angle: this.state.currentAngle,
      timestamp: Date.now()
    });
  }

  onTouchStart(e) {
    if (this.state.isVerified) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    this.state.isDragging = true;
    this.state.startAngle = this.getAngleFromCenter(touch.clientX, touch.clientY);
    this.state.startX = this.state.currentAngle;
  }

  onTouchMove(e) {
    if (!this.state.isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const currentAngle = this.getAngleFromCenter(touch.clientX, touch.clientY);
    let deltaAngle = currentAngle - this.state.startAngle;
    
    this.state.currentAngle = this.state.startX + deltaAngle;
    this.updateRotation();
  }

  onTouchEnd(e) {
    if (!this.state.isDragging) return;
    
    this.state.isDragging = false;
    this.state.track.push({
      angle: this.state.currentAngle,
      timestamp: Date.now()
    });
  }

  updateRotation() {
    this.bgImage.style.transform = `rotate(${this.state.currentAngle}deg)`;
    this.angleDisplay.textContent = `${Math.round(this.state.currentAngle)}°`;
    
    this.state.track.push({
      angle: this.state.currentAngle,
      timestamp: Date.now()
    });
  }

  rotateBy(degrees) {
    if (this.state.isVerified) return;
    
    this.state.currentAngle += degrees;
    this.updateRotation();
    
    this.state.track.push({
      angle: this.state.currentAngle,
      timestamp: Date.now()
    });
  }

  verifyRotation() {
    if (this.state.isVerified) return;
    
    this.emit('verify', {
      angle: this.state.currentAngle,
      track: this.state.track,
      targetAngle: this.options.targetAngle
    });
  }

  setImages(backgroundImage) {
    if (backgroundImage) {
      this.bgImage.style.backgroundImage = `url(${backgroundImage})`;
    }
  }

  setTargetAngle(angle) {
    this.options.targetAngle = angle;
    this.hintText.textContent = `请旋转至 ${angle}° 位置`;
  }

  showSuccess() {
    this.state.isVerified = true;
    this.successOverlay.style.display = 'flex';
    this.verifyButton.style.background = '#4CAF50';
    this.verifyButton.textContent = '已验证';
    this.verifyButton.disabled = true;
  }

  showError() {
    this.bgImage.style.border = '3px solid #f44336';
    
    setTimeout(() => {
      this.bgImage.style.border = 'none';
      this.state.currentAngle = 0;
      this.updateRotation();
    }, 1500);
  }

  reset() {
    this.state = {
      currentAngle: 0,
      startAngle: 0,
      startX: 0,
      isDragging: false,
      isVerified: false,
      track: []
    };
    
    this.bgImage.style.transform = 'rotate(0deg)';
    this.bgImage.style.border = 'none';
    this.angleDisplay.textContent = '0°';
    this.successOverlay.style.display = 'none';
    this.verifyButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    this.verifyButton.textContent = '验证';
    this.verifyButton.disabled = false;
  }

  destroy() {
    this.removeAllListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

module.exports = RotateCaptcha;
