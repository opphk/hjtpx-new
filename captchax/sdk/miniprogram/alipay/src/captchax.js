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

  props: {
    appId: '',
    type: 'slider',
    apiBase: '',
    onVerify: () => {},
    onClose: () => {},
    onError: () => {}
  },

  didMount() {
    this.api = new CaptchaXAPI({
      appId: this.props.appId,
      apiBase: this.props.apiBase
    });
  },

  methods: {
    async show(options = {}) {
      const type = options.type || this.props.type;
      this.setData({
        visible: true,
        loading: true,
        captchaType: type,
        error: null,
        success: false
      });

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
        this.props.onError(error);
      }
    },

    hide() {
      this.setData({
        visible: false,
        success: false
      });
      this.props.onClose();
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
            this.props.onVerify(result);
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
        this.props.onError(error);
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
