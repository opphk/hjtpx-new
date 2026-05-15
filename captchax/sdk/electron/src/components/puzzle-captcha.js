const { EventEmitter } = require('events');

class PuzzleCaptcha extends EventEmitter {
  constructor(container, options = {}) {
    super();
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      width: options.width || 320,
      height: options.height || 160,
      pieceSize: options.pieceSize || 50,
      backgroundImage: options.backgroundImage || '',
      thumbnailImage: options.thumbnailImage || '',
      ...options
    };
    
    this.state = {
      isDragging: false,
      startX: 0,
      currentX: 0,
      targetX: 0,
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
    wrapper.className = 'captcha-puzzle-wrapper';
    wrapper.style.cssText = `
      position: relative;
      width: ${this.options.width}px;
      height: ${this.options.height + 60}px;
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
      background: #ddd;
    `;

    this.bgImage = document.createElement('div');
    this.bgImage.className = 'captcha-background';
    this.bgImage.style.cssText = `
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
    `;

    this.pieceContainer = document.createElement('div');
    this.pieceContainer.className = 'captcha-piece-container';
    this.pieceContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;

    this.pieceImage = document.createElement('div');
    this.pieceImage.className = 'captcha-piece';
    this.pieceImage.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: ${this.options.pieceSize}px;
      height: 100%;
      background-size: cover;
      background-position: left center;
      box-shadow: 2px 0 8px rgba(0,0,0,0.3);
    `;

    this.controlBar = document.createElement('div');
    this.controlBar.className = 'captcha-control-bar';
    this.controlBar.style.cssText = `
      width: 100%;
      height: 60px;
      background: white;
      border-top: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      padding: 0 15px;
      box-sizing: border-box;
    `;

    this.sliderTrack = document.createElement('div');
    this.sliderTrack.style.cssText = `
      flex: 1;
      height: 6px;
      background: #e0e0e0;
      border-radius: 3px;
      margin: 0 10px;
      position: relative;
    `;

    this.sliderFill = document.createElement('div');
    this.sliderFill.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 3px;
      transition: width 0.1s;
    `;

    this.sliderButton = document.createElement('div');
    this.sliderButton.style.cssText = `
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      cursor: grab;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
    `;
    this.sliderButton.innerHTML = '⋮⋮';

    this.refreshButton = document.createElement('button');
    this.refreshButton.className = 'captcha-refresh';
    this.refreshButton.style.cssText = `
      width: 32px;
      height: 32px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    this.refreshButton.innerHTML = '↻';

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

    this.pieceContainer.appendChild(this.pieceImage);
    this.imageContainer.appendChild(this.bgImage);
    this.imageContainer.appendChild(this.pieceContainer);
    this.imageContainer.appendChild(this.successOverlay);
    
    this.sliderTrack.appendChild(this.sliderFill);
    this.sliderTrack.appendChild(this.sliderButton);
    
    this.controlBar.appendChild(this.sliderTrack);
    this.controlBar.appendChild(this.refreshButton);
    
    wrapper.appendChild(this.imageContainer);
    wrapper.appendChild(this.controlBar);
    
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
    
    this.refreshButton.addEventListener('click', () => this.emit('refresh'));
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
    const maxX = this.options.width - this.options.pieceSize;
    let newX = Math.max(0, Math.min(deltaX, maxX));
    
    this.state.currentX = newX;
    this.state.track.push({
      x: newX,
      timestamp: Date.now()
    });
    
    const percentage = (newX / maxX) * 100;
    this.sliderFill.style.width = `${percentage}%`;
    this.sliderButton.style.left = `${percentage}%`;
    this.pieceImage.style.transform = `translateX(${newX}px)`;
  }

  completeSlider() {
    const finalPosition = this.state.currentX;
    
    this.emit('verify', {
      position: finalPosition,
      track: this.state.track,
      targetPosition: this.state.targetX
    });
  }

  setImages(backgroundImage, pieceImage) {
    if (backgroundImage) {
      this.bgImage.style.backgroundImage = `url(${backgroundImage})`;
    }
    if (pieceImage) {
      this.pieceImage.style.backgroundImage = `url(${pieceImage})`;
    }
  }

  setTargetPosition(x) {
    this.state.targetX = x;
    const targetPercentage = (x / (this.options.width - this.options.pieceSize)) * 100;
    
    const targetIndicator = document.createElement('div');
    targetIndicator.className = 'captcha-target';
    targetIndicator.style.cssText = `
      position: absolute;
      top: 0;
      left: ${targetPercentage}%;
      width: 3px;
      height: 100%;
      background: rgba(255, 87, 34, 0.8);
    `;
    this.sliderTrack.appendChild(targetIndicator);
  }

  showSuccess() {
    this.state.isVerified = true;
    this.successOverlay.style.display = 'flex';
    this.sliderButton.style.background = '#4CAF50';
    this.sliderButton.innerHTML = '✓';
    this.sliderButton.style.cursor = 'default';
  }

  showError() {
    this.sliderButton.style.background = '#f44336';
    this.sliderButton.innerHTML = '✕';
    
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
    
    this.sliderFill.style.width = '0%';
    this.sliderButton.style.left = '0%';
    this.pieceImage.style.transform = 'translateX(0)';
    this.sliderButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    this.sliderButton.innerHTML = '⋮⋮';
    this.sliderButton.style.cursor = 'grab';
    this.successOverlay.style.display = 'none';
    
    const targetIndicator = this.sliderTrack.querySelector('.captcha-target');
    if (targetIndicator) {
      targetIndicator.remove();
    }
  }

  destroy() {
    this.removeAllListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

module.exports = PuzzleCaptcha;
