Component({
  properties: {
    captchaId: {
      type: String,
      value: ''
    },
    imageUrl: {
      type: String,
      value: ''
    },
    question: {
      type: String,
      value: ''
    },
    options: {
      type: Array,
      value: []
    },
    imageSize: {
      type: Object,
      value: { width: 300, height: 150 }
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  data: {
    selectedAnswer: '',
    localImageUrl: '',
    isVerified: false,
    verifyResult: null
  },

  lifetimes: {
    attached() {
      this.downloadImage();
    }
  },

  methods: {
    async downloadImage() {
      const sdk = getApp().captchaX;
      if (!sdk) {
        console.error('CaptchaX SDK 未初始化');
        return;
      }

      try {
        if (this.data.imageUrl) {
          const imagePath = await sdk.preloadImage(this.data.imageUrl);
          this.setData({ localImageUrl: imagePath });
        }
      } catch (error) {
        console.error('图片下载失败:', error);
      }
    },

    onOptionSelect(e) {
      if (this.data.disabled || this.data.isVerified) return;

      const answer = e.currentTarget.dataset.answer;
      this.setData({ selectedAnswer: answer });
    },

    submitAnswer() {
      if (!this.data.selectedAnswer || this.data.disabled) return;

      const verifyData = {
        captchaId: this.data.captchaId,
        track: [],
        userResponse: {
          answer: this.data.selectedAnswer
        }
      };

      this.triggerEvent('verify', verifyData);
    },

    onVerifySuccess() {
      this.setData({
        isVerified: true,
        verifyResult: true
      });
    },

    onVerifyFail() {
      this.setData({
        isVerified: true,
        verifyResult: false
      });
      wx.showToast({
        title: '验证失败，请重试',
        icon: 'none',
        duration: 1500
      });
    },

    refresh() {
      this.setData({
        selectedAnswer: '',
        isVerified: false,
        verifyResult: null
      });
      this.triggerEvent('refresh');
    }
  }
});
