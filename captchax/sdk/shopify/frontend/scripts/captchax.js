class CaptchaX {
  static version = '1.0.0';
  static instances = new Map();
  
  static config = {
    apiUrl: window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : 'https://captchax.example.com',
    defaultTheme: 'light',
    defaultLanguage: 'zh-CN',
    defaultPosition: 'bottom-right'
  };

  static init(options = {}) {
    const shop = options.shop || this.getShopFromDomain();
    
    if (!shop) {
      console.error('CaptchaX: Shop domain is required');
      return null;
    }

    const config = {
      ...this.config,
      ...options,
      shop
    };

    const instance = new CaptchaX(config);
    this.instances.set(shop, instance);
    
    if (options.types && options.types.length > 0) {
      this.integratePages(instance, options.types);
    }

    return instance;
  }

  static getShopFromDomain() {
    const hostname = window.location.hostname;
    const match = hostname.match(/^([a-zA-Z0-9-]+)\.myshopify\.com$/);
    return match ? `${match[1]}.myshopify.com` : null;
  }

  constructor(config) {
    this.config = config;
    this.widgets = [];
    this.loadedScripts = new Set();
  }

  async createCaptcha(type = 'image', options = {}) {
    try {
      const response = await fetch(`${this.config.apiUrl}/captcha/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shop: this.config.shop,
          type,
          options: {
            theme: options.theme || this.config.defaultTheme,
            language: options.language || this.config.defaultLanguage,
            ...options
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create captcha');
      }

      return await response.json();
    } catch (error) {
      console.error('CaptchaX create error:', error);
      throw error;
    }
  }

  async verify(token, response) {
    try {
      const result = await fetch(`${this.config.apiUrl}/captcha/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, response })
      });

      return await result.json();
    } catch (error) {
      console.error('CaptchaX verify error:', error);
      throw error;
    }
  }

  showWidget(type, element, options = {}) {
    const widget = {
      type,
      element,
      options,
      createdAt: Date.now()
    };

    this.widgets.push(widget);
    this.renderWidget(widget);
    
    return widget;
  }

  async renderWidget(widget) {
    try {
      const captchaData = await this.createCaptcha(widget.type, widget.options);
      
      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'captcha-widget-container';
      widgetContainer.innerHTML = `
        <div class="captcha-content">
          <div class="captcha-header">
            <h3>CaptchaX 验证码</h3>
            <span class="captcha-type-badge">${widget.type}</span>
          </div>
          <div class="captcha-body">
            <p>请完成验证</p>
            <button class="captcha-verify-btn">验证</button>
          </div>
        </div>
      `;

      widget.element.appendChild(widgetContainer);

      const verifyBtn = widgetContainer.querySelector('.captcha-verify-btn');
      verifyBtn.addEventListener('click', async () => {
        try {
          const result = await this.verify(captchaData.token, { type: widget.type });
          if (result.success) {
            widgetContainer.innerHTML = '<div class="captcha-success">验证成功 ✓</div>';
            widget.options.onSuccess?.(result);
          } else {
            widget.options.onError?.(result);
          }
        } catch (error) {
          widget.options.onError?.(error);
        }
      });

    } catch (error) {
      console.error('Widget render error:', error);
      widget.options.onError?.(error);
    }
  }

  static integratePages(instance, types) {
    if (types.includes('login')) {
      CaptchaX.integrateLoginPage(instance);
    }
    
    if (types.includes('register')) {
      CaptchaX.integrateRegisterPage(instance);
    }
    
    if (types.includes('contact')) {
      CaptchaX.integrateContactPage(instance);
    }
    
    if (types.includes('comment')) {
      CaptchaX.integrateCommentPage(instance);
    }
  }

  static integrateLoginPage(instance) {
    const loginForm = document.querySelector('[action*="/login"], .login-form');
    if (loginForm) {
      const captchaContainer = document.createElement('div');
      captchaContainer.id = 'captchax-login-container';
      captchaContainer.className = 'captchax-container';
      
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.parentNode.insertBefore(captchaContainer, submitBtn);
        instance.showWidget('image', captchaContainer, {
          onSuccess: (result) => {
            console.log('Login captcha verified:', result);
          }
        });
      }
    }
  }

  static integrateRegisterPage(instance) {
    const registerForm = document.querySelector('[action*="/register"], .register-form');
    if (registerForm) {
      const captchaContainer = document.createElement('div');
      captchaContainer.id = 'captchax-register-container';
      captchaContainer.className = 'captchax-container';
      
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.parentNode.insertBefore(captchaContainer, submitBtn);
        instance.showWidget('slider', captchaContainer, {
          onSuccess: (result) => {
            console.log('Register captcha verified:', result);
          }
        });
      }
    }
  }

  static integrateContactPage(instance) {
    const contactForm = document.querySelector('[action*="/contact"], .contact-form');
    if (contactForm) {
      const captchaContainer = document.createElement('div');
      captchaContainer.id = 'captchax-contact-container';
      captchaContainer.className = 'captchax-container';
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.parentNode.insertBefore(captchaContainer, submitBtn);
        instance.showWidget('grid', captchaContainer, {
          onSuccess: (result) => {
            console.log('Contact captcha verified:', result);
          }
        });
      }
    }
  }

  static integrateCommentPage(instance) {
    const commentForm = document.querySelector('[action*="/comments"], .comment-form');
    if (commentForm) {
      const captchaContainer = document.createElement('div');
      captchaContainer.id = 'captchax-comment-container';
      captchaContainer.className = 'captchax-container';
      
      const submitBtn = commentForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.parentNode.insertBefore(captchaContainer, submitBtn);
        instance.showWidget('image', captchaContainer, {
          onSuccess: (result) => {
            console.log('Comment captcha verified:', result);
          }
        });
      }
    }
  }

  getStatistics() {
    return fetch(`${this.config.apiUrl}/captcha/stats/${this.config.shop}`)
      .then(res => res.json());
  }
}

if (typeof window !== 'undefined') {
  window.CaptchaX = CaptchaX;
}

module.exports = CaptchaX;
