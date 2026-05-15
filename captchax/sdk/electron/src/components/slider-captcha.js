const { EventEmitter } = require('events');

class SliderCaptcha extends EventEmitter {
  constructor(container, options = {}) {
    super();
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      width: options.width || 320,
      height: options.height || 160,
      sliderWidth: options.sliderWidth || 50,
      sliderHeight: options.sliderHeight || 40,
      backgroundImage: options.backgroundImage || '',
      sliderImage: options.sliderImage || '',
      track: [],
      ...options
    };
    
    this.state = {
      isDragging: false,
      startX: 0,
      currentX: 0,
      targetX: 0,
      isVerified: false,
      isExpired: false
    };
    
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    const wrapper = document.createElement('div');
    wrapper.className = 'captcha-slider-wrapper';
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

    this.bgImage = document.createElement('div');
    this.bgImage.className = 'captcha-background';
    this.bgImage.style.cssText = `
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
    `;

    this.sliderTrack = document.createElement('div');
    this.sliderTrack.className = 'captcha-slider-track';
    this.sliderTrack.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 50px;
      background: rgba(255, 255, 255, 0.95);
      border-top: 1px solid #ddd;
      display: flex;
      align-items: center;
      padding: 0 10px;
      box-sizing: border-box;
    `;

    this.sliderButton = document.createElement('div');
    this.sliderButton.className = 'captcha-slider-button';
    this.sliderButton.style.cssText = `
      width: ${this.options.sliderWidth}px;
      height: ${this.options.sliderHeight}px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
      cursor: grab;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      user-select: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    this.sliderButton.innerHTML = '→';

    this.hintText = document.createElement('div');
    this.hintText.className = 'captcha-hint';
    this.hintText.style.cssText = `
      margin-left: 10px;
      color: #666;
      font-size: 14px;
    `;
    this.hintText.textContent = '拖动滑块完成拼图';

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

    this.sliderTrack.appendChild(this.sliderButton);
    this.sliderTrack.appendChild(this.hintText);
    
    wrapper.appendChild(this.bgImage);
    wrapper.appendChild(this.sliderTrack);
    wrapper.appendChild(this.successOverlay);
    
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);
    
    this.wrapper = wrapper;
  }

  bindEvents() {
    this.sliderButton.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    
    this.sliderButton.addEventListener('touchstart', (e) => this.onTouchStart(e));
    document.addEventListener('touchmove', (e) => this.onTouchMove(e));
    document.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  onMouseDown(e) {
    if (this.state.isVerified) return;
    
    e.preventDefault();
    this.state.isDragging = true;
    this.state.startX = e.clientX;
    this.sliderButton.style.cursor = 'grabbing';
  }

  onMouseMove(e) {
    if (!this.state.isDragging) return;
    
    const deltaX = e.clientX - this.state.startX;
    this.moveSlider(deltaX);
  }

  onMouseUp(e) {
    if (!this.state.isDragging) return;
    
    this.state.isDragging = false;
    this.sliderButton.style.cursor = 'grab';
    this.completeSlider();
  }

  onTouchStart(e) {
    if (this.state.isVerified) return;
    
    e.preventDefault();
    this.state.isDragging = true;
    this.state.startX = e.touches[0].clientX;
    this.sliderButton.style.cursor = 'grabbing';
  }

  onTouchMove(e) {
    if (!this.state.isDragging) return;
    
    e.preventDefault();
    const deltaX = e.touches[0].clientX - this.state.startX;
    this.moveSlider(deltaX);
  }

  onTouchEnd(e) {
    if (!this.state.isDragging) return;
    
    this.state.isDragging = false;
    this.sliderButton.style.cursor = 'grab';
    this.completeSlider();
  }

  moveSlider(deltaX) {
    const maxX = this.options.width - this.options.sliderWidth - 20;
    let newX = Math.max(0, Math.min(deltaX, maxX));
    
    this.state.currentX = newX;
    this.state.track.push({
      x: newX,
      timestamp: Date.now()
    });
    
    this.sliderButton.style.transform = `translateX(${newX}px)`;
  }

  completeSlider() {
    const finalPosition = this.state.currentX;
    
    this.emit('verify', {
      position: finalPosition,
      track: this.state.track,
      targetPosition: this.state.targetX
    });
  }

  setImages(backgroundImage, sliderImage) {
    if (backgroundImage) {
      this.bgImage.style.backgroundImage = `url(${backgroundImage})`;
    }
  }

  setTargetPosition(x) {
    this.state.targetX = x;
  }

  showSuccess() {
    this.state.isVerified = true;
    this.successOverlay.style.display = 'flex';
    this.hintText.textContent = '验证成功';
    this.sliderButton.style.background = '#4CAF50';
    this.sliderButton.innerHTML = '✓';
    this.sliderButton.style.cursor = 'default';
  }

  showError() {
    this.sliderButton.style.background = '#f44336';
    this.sliderButton.innerHTML = '✕';
    this.hintText.textContent = '验证失败，请重试';
    
    setTimeout(() => {
      this.reset();
    }, 1500);
  }

  reset() {
    this.state = {
      isDragging: false,
      startX: 0,
      currentX: 0,
      targetX: 0,
      isVerified: false,
      track: []
    };
    
    this.sliderButton.style.transform = 'translateX(0)';
    this.sliderButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    this.sliderButton.innerHTML = '→';
    this.sliderButton.style.cursor = 'grab';
    this.hintText.textContent = '拖动滑块完成拼图';
    this.successOverlay.style.display = 'none';
  }

  destroy() {
    this.removeAllListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

module.exports = SliderCaptcha;
