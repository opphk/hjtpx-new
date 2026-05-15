const app = getApp();

Page({
  data: {
    isLoading: true,
    captchaData: null,
    isVerified: false,
    verifyResult: null
  },

  onLoad() {
    this.loadCaptcha();
  },

  async loadCaptcha() {
    this.setData({ isLoading: true });

    try {
      const captchaData = await app.captchaX.getCaptcha('text', {});
      this.setData({
        captchaData,
        isLoading: false
      });
    } catch (error) {
      console.error('加载验证码失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  async onVerify(e) {
    const verifyData = e.detail;

    try {
      const result = await app.captchaX.verify('text', verifyData);

      if (result.success) {
        this.setData({
          isVerified: true,
          verifyResult: true
        });
        wx.showToast({
          title: '验证成功',
          icon: 'success',
          duration: 1500
        });
      } else {
        this.setData({
          isVerified: true,
          verifyResult: false
        });
        wx.showToast({
          title: '验证失败',
          icon: 'none',
          duration: 1500
        });
        setTimeout(() => {
          this.loadCaptcha();
        }, 1500);
      }
    } catch (error) {
      console.error('验证失败:', error);
      this.setData({
        isVerified: true,
        verifyResult: false
      });
      setTimeout(() => {
        this.loadCaptcha();
      }, 1500);
    }
  },

  onRefresh() {
    this.loadCaptcha();
  }
});
