const CaptchaXAPI = require('./utils/api');

Component({
  data: {
    visible: false,
    loading: false,
    error: null,
    sessionId: '',
    captchaType: 'slider',
    backgroundImage: '',
    captchaImage: '',
    tipText: '请完成验证',
    success: false
  },

  properties: {
    appId: {
      type: String,
      value: ''
    },
    type: {
      type: String,
      value: 'slider'
    },
    apiBase: {
      type: String,
      value: ''
    },
    onVerify: {
      type: Function,
      value: () => {}
    },
    onClose: {
      type: Function,
      value: () => {}
    },
    onError: {
      type: Function,
      value: () => {}
    }
  },

  lifetimes: {
    attached() {
      this.api = new CaptchaXAPI({
        appId: this.properties.appId,
        apiBase: this.properties.apiBase
      });
    }
  },

  methods: {
    show(options = {}) {
      const type = options.type || this.properties.type;
      this.setData({
        visible: true,
        loading: true,
        captchaType: type,
        error: null,
        success: false
      });

      this.createSession(type);
    },

    async createSession(type) {
      try {
        const session = await this.api.createSession(type);
        this.setData({
          sessionId: session.sessionId,
          backgroundImage: session.backgroundImage,
          captchaImage: session.captchaImage,
          loading: false
        });
      } catch (error) {
        this.setData({
          loading: false,
          error: '验证码加载失败'
        });
        this.properties.onError(error);
      }
    },

    hide() {
      this.setData({
        visible: false,
        success: false
      });
      this.properties.onClose();
    },

    async handleVerify(e) {
      const { data } = e.detail || {};
      if (!data || !this.data.sessionId) {
        return;
      }

      this.setData({ loading: true });

      try {
        const result = await this.api.verify(this.data.sessionId, data);
        if (result.success) {
          this.setData({
            success: true,
            loading: false,
            tipText: '验证成功'
          });
          setTimeout(() => {
            this.hide();
            this.properties.onVerify(result);
          }, 1000);
        } else {
          this.setData({
            error: result.message || '验证失败，请重试',
            loading: false
          });
        }
      } catch (error) {
        this.setData({
          loading: false,
          error: '验证失败'
        });
        this.properties.onError(error);
      }
    },

    handleRefresh() {
      this.show({ type: this.data.captchaType });
    },

    handleFail() {
      this.setData({
        error: '验证失败，请重试'
      });
      setTimeout(() => {
        this.handleRefresh();
      }, 1500);
    }
  }
});
