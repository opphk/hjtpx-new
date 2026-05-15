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
    targetAngle: {
      type: Number,
      value: 0
    },
    imageSize: {
      type: Object,
      value: { width: 200, height: 200 }
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  data: {
    currentAngle: 0,
    startAngle: 0,
    startTouchAngle: 0,
    track: [],
    localImageUrl: '',
    isSuccess: false,
    rotationIndicator: 0
  },

  lifetimes: {
    attached() {
      this.downloadImage();
      this.setRandomStartAngle();
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

    setRandomStartAngle() {
      const randomAngle = Math.floor(Math.random() * 360);
      this.setData({
        currentAngle: randomAngle,
        rotationIndicator: randomAngle
      });
    },

    calculateAngle(touch) {
      const centerX = this.data.imageSize.width / 2;
      const centerY = this.data.imageSize.height / 2;
      
      const dx = touch.clientX - centerX;
      const dy = touch.clientY - centerY;
      
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return angle;
    },

    onRotateTouchStart(e) {
      if (this.data.disabled) return;
      
      const touch = e.touches[0];
      const angle = this.calculateAngle(touch);
      
      this.setData({
        startAngle: this.data.currentAngle,
        startTouchAngle: angle
      });
    },

    onRotateTouchMove(e) {
      if (this.data.disabled) return;

      const touch = e.touches[0];
      const currentTouchAngle = this.calculateAngle(touch);
      const deltaAngle = currentTouchAngle - this.data.startTouchAngle;
      
      let newAngle = this.data.startAngle + deltaAngle;
      
      newAngle = ((newAngle % 360) + 360) % 360;
      
      this.data.track.push({
        angle: newAngle,
        timestamp: Date.now()
      });

      this.setData({
        currentAngle: newAngle,
        rotationIndicator: newAngle
      });
    },

    onRotateTouchEnd() {
      if (this.data.disabled) return;

      const verifyData = {
        captchaId: this.data.captchaId,
        track: this.data.track,
        userResponse: {
          angle: this.data.currentAngle,
          targetAngle: this.data.targetAngle
        }
      };

      this.triggerEvent('verify', verifyData);
    },

    adjustAngle(direction) {
      const step = direction === 'left' ? -5 : 5;
      const newAngle = ((this.data.currentAngle + step) % 360 + 360) % 360;
      
      this.setData({
        currentAngle: newAngle,
        rotationIndicator: newAngle
      });
    },

    reset() {
      this.setRandomStartAngle();
      this.setData({
        track: [],
        isSuccess: false
      });
    }
  }
});
