const CaptchaX = require('./captchax.js');

App({
  captchaX: null,

  onLaunch() {
    this.captchaX = new CaptchaX({
      baseUrl: 'https://captchax.example.com',
      debug: true,
      timeout: 10000
    });

    console.log('CaptchaX SDK 初始化完成');
  }
});
