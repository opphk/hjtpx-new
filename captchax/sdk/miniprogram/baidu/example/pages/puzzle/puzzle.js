Page({
  data: {
    appId: '',
    verifyResult: '',
    resultType: ''
  },

  onLoad() {
    const app = getApp();
    this.setData({
      appId: app.globalData.appId
    });
  },

  showCaptcha() {
    const captchaComponent = this.selectComponent('#captcha');
    if (captchaComponent) {
      captchaComponent.show({ type: 'puzzle' });
    }
  },

  onVerify(result) {
    console.log('Verification success:', result);
    this.setData({
      verifyResult: JSON.stringify(result, null, 2),
      resultType: 'success'
    });
  },

  onCaptchaClose() {
    console.log('Captcha closed');
  },

  onCaptchaError(error) {
    console.error('Captcha error:', error);
    this.setData({
      verifyResult: '验证出错: ' + error.message,
      resultType: 'error'
    });
  }
});
