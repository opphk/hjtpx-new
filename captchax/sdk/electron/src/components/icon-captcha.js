const { EventEmitter } = require('events');

class IconCaptcha extends EventEmitter {
  constructor(container, options = {}) {
    super();
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      width: options.width || 400,
      height: options.height || 300,
      columns: options.columns || 4,
      rows: options.rows || 3,
      selectLimit: options.selectLimit || 3,
      icons: options.icons || [],
      hint: options.hint || '请选择所有包含"汽车"的图片',
      ...options
    };
    
    this.state = {
      selectedIcons: [],
      isVerified: false,
      isExpired: false,
      icons: []
    };
    
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    const wrapper = document.createElement('div');
    wrapper.className = 'captcha-icon-wrapper';
    wrapper.style.cssText = `
      position: relative;
      width: ${this.options.width}px;
      padding: 20px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      font-family: Arial, sans-serif;
      box-sizing: border-box;
    `;

    this.hintText = document.createElement('div');
    this.hintText.className = 'captcha-hint';
    this.hintText.style.cssText = `
      margin-bottom: 15px;
      color: #333;
      font-size: 16px;
      font-weight: bold;
    `;
    this.hintText.textContent = this.options.hint;

    this.indicator = document.createElement('div');
    this.indicator.className = 'captcha-indicator';
    this.indicator.style.cssText = `
      margin-bottom: 15px;
      color: #666;
      font-size: 14px;
    `;
    this.updateIndicator();

    this.iconGrid = document.createElement('div');
    this.iconGrid.className = 'captcha-icon-grid';
    this.iconGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${this.options.columns}, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    `;

    this.buttonContainer = document.createElement('div');
    this.buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    `;

    this.refreshButton = document.createElement('button');
    this.refreshButton.textContent = '刷新';
    this.refreshButton.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
    `;

    this.verifyButton = document.createElement('button');
    this.verifyButton.textContent = '验证';
    this.verifyButton.style.cssText = `
      padding: 10px 30px;
      border: none;
      border-radius: 4px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
    `;

    this.messageArea = document.createElement('div');
    this.messageArea.className = 'captcha-message';
    this.messageArea.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      border-radius: 4px;
      font-size: 14px;
      text-align: center;
      display: none;
    `;

    this.buttonContainer.appendChild(this.refreshButton);
    this.buttonContainer.appendChild(this.verifyButton);
    
    wrapper.appendChild(this.hintText);
    wrapper.appendChild(this.indicator);
    wrapper.appendChild(this.iconGrid);
    wrapper.appendChild(this.buttonContainer);
    wrapper.appendChild(this.messageArea);
    
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);
    
    this.wrapper = wrapper;
  }

  bindEvents() {
    this.refreshButton.addEventListener('click', () => this.refresh());
    this.verifyButton.addEventListener('click', () => this.verify());
  }

  updateIndicator() {
    const selected = this.state.selectedIcons.length;
    const total = this.options.selectLimit;
    this.indicator.textContent = `已选择: ${selected}/${total}`;
  }

  createIconElement(iconData, index) {
    const iconItem = document.createElement('div');
    iconItem.className = 'captcha-icon-item';
    iconItem.dataset.index = index;
    iconItem.style.cssText = `
      aspect-ratio: 1;
      background: #f0f0f0;
      border: 2px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      transition: all 0.2s ease;
      overflow: hidden;
    `;
    
    if (iconData.imageUrl) {
      const img = document.createElement('img');
      img.src = iconData.imageUrl;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;
      iconItem.appendChild(img);
    } else if (iconData.icon) {
      iconItem.textContent = iconData.icon;
    } else {
      iconItem.textContent = iconData.emoji || '?';
    }
    
    iconItem.addEventListener('click', () => this.toggleIcon(index));
    
    return iconItem;
  }

  toggleIcon(index) {
    if (this.state.isVerified) return;
    
    const iconData = this.state.icons[index];
    const iconElement = this.iconGrid.children[index];
    
    const selectedIndex = this.state.selectedIcons.indexOf(index);
    
    if (selectedIndex > -1) {
      this.state.selectedIcons.splice(selectedIndex, 1);
      iconElement.style.borderColor = 'transparent';
      iconElement.style.background = '#f0f0f0';
      iconElement.style.transform = 'scale(1)';
    } else {
      if (this.state.selectedIcons.length >= this.options.selectLimit) {
        this.showMessage(`最多只能选择 ${this.options.selectLimit} 个图标`, 'warning');
        return;
      }
      
      this.state.selectedIcons.push(index);
      iconElement.style.borderColor = '#667eea';
      iconElement.style.background = 'rgba(102, 126, 234, 0.1)';
      iconElement.style.transform = 'scale(0.95)';
    }
    
    this.updateIndicator();
    this.emit('select', {
      selected: this.state.selectedIcons,
      icon: iconData,
      index: index
    });
  }

  setIcons(icons) {
    this.state.icons = icons;
    this.iconGrid.innerHTML = '';
    
    icons.forEach((icon, index) => {
      const iconElement = this.createIconElement(icon, index);
      this.iconGrid.appendChild(iconElement);
    });
  }

  setHint(hint) {
    this.options.hint = hint;
    this.hintText.textContent = hint;
  }

  setSelectLimit(limit) {
    this.options.selectLimit = limit;
    this.updateIndicator();
    
    if (this.state.selectedIcons.length > limit) {
      this.state.selectedIcons = this.state.selectedIcons.slice(0, limit);
      this.updateAllIcons();
      this.updateIndicator();
    }
  }

  updateAllIcons() {
    Array.from(this.iconGrid.children).forEach((iconElement, index) => {
      if (this.state.selectedIcons.includes(index)) {
        iconElement.style.borderColor = '#667eea';
        iconElement.style.background = 'rgba(102, 126, 234, 0.1)';
        iconElement.style.transform = 'scale(0.95)';
      } else {
        iconElement.style.borderColor = 'transparent';
        iconElement.style.background = '#f0f0f0';
        iconElement.style.transform = 'scale(1)';
      }
    });
  }

  verify() {
    if (this.state.selectedIcons.length === 0) {
      this.showMessage('请至少选择一个图标', 'error');
      return;
    }
    
    if (this.state.selectedIcons.length !== this.options.selectLimit) {
      this.showMessage(`请选择恰好 ${this.options.selectLimit} 个图标`, 'warning');
      return;
    }
    
    this.emit('verify', {
      selectedIndices: this.state.selectedIcons,
      selectedIcons: this.state.selectedIcons.map(i => this.state.icons[i]),
      count: this.state.selectedIcons.length
    });
  }

  refresh() {
    this.state.selectedIcons = [];
    this.updateAllIcons();
    this.updateIndicator();
    this.hideMessage();
    
    this.emit('refresh', {
      oldSelection: [],
      newSelection: []
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
    } else if (type === 'warning') {
      this.messageArea.style.background = '#fff3cd';
      this.messageArea.style.color = '#856404';
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
    this.verifyButton.disabled = true;
    this.verifyButton.style.background = '#4CAF50';
    this.verifyButton.textContent = '已验证';
  }

  showError() {
    this.showMessage('验证失败，请重试', 'error');
    
    Array.from(this.iconGrid.children).forEach((iconElement, index) => {
      if (this.state.selectedIcons.includes(index)) {
        iconElement.style.borderColor = '#f44336';
        iconElement.style.background = 'rgba(244, 67, 54, 0.1)';
      }
    });
    
    setTimeout(() => {
      this.refresh();
    }, 1500);
  }

  reset() {
    this.state = {
      selectedIcons: [],
      isVerified: false,
      isExpired: false,
      icons: this.state.icons
    };
    
    this.updateAllIcons();
    this.updateIndicator();
    this.hideMessage();
    this.verifyButton.disabled = false;
    this.verifyButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    this.verifyButton.textContent = '验证';
  }

  destroy() {
    this.removeAllListeners();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

module.exports = IconCaptcha;
