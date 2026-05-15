Component({
  properties: {
    captchaId: {
      type: String,
      value: ''
    },
    backgroundImage: {
      type: String,
      value: ''
    },
    targetCount: {
      type: Number,
      value: 4
    },
    imageSize: {
      type: Object,
      value: { width: 300, height: 200 }
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  data: {
    clickPoints: [],
    selectedPoints: [],
    localBackgroundImage: '',
    currentStep: 0,
    instruction: ''
  },

  lifetimes: {
    attached() {
      this.downloadImage();
      this.updateInstruction();
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
        if (this.data.backgroundImage) {
          const bgPath = await sdk.preloadImage(this.data.backgroundImage);
          this.setData({ localBackgroundImage: bgPath });
        }
      } catch (error) {
        console.error('图片下载失败:', error);
      }
    },

    updateInstruction() {
      const instructions = [
        `请依次点击第1-${this.data.targetCount}个图标`,
        `请依次点击所有目标位置`
      ];
      this.setData({ instruction: instructions[this.data.currentStep] });
    },

    onImageTap(e) {
      if (this.data.disabled) return;

      const { x, y } = e.detail;
      const imageInfo = e.currentTarget.dataset.imageInfo;
      
      const scaleX = this.data.imageSize.width / imageInfo.width;
      const scaleY = this.data.imageSize.height / imageInfo.height;
      
      const actualX = x * scaleX;
      const actualY = y * scaleY;

      this.data.selectedPoints.push({
        x: actualX,
        y: actualY,
        timestamp: Date.now()
      });

      this.setData({
        clickPoints: [...this.data.clickPoints, { x, y }],
        selectedPoints: this.data.selectedPoints
      });

      if (this.data.selectedPoints.length >= this.data.targetCount) {
        this.triggerVerify();
      }
    },

    triggerVerify() {
      const verifyData = {
        captchaId: this.data.captchaId,
        track: [],
        userResponse: {
          points: this.data.selectedPoints
        }
      };

      this.triggerEvent('verify', verifyData);
    },

    undo() {
      if (this.data.selectedPoints.length > 0) {
        this.data.selectedPoints.pop();
        this.data.clickPoints.pop();
        this.setData({
          selectedPoints: this.data.selectedPoints,
          clickPoints: this.data.clickPoints
        });
      }
    },

    reset() {
      this.setData({
        clickPoints: [],
        selectedPoints: [],
        currentStep: 0
      });
      this.updateInstruction();
    }
  }
});
