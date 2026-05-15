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
    sliderImage: {
      type: String,
      value: ''
    },
    targetPosition: {
      type: Number,
      value: 0
    },
    sliderSize: {
      type: Object,
      value: { width: 50, height: 50 }
    },
    trackLength: {
      type: Number,
      value: 300
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  data: {
    sliderPosition: 0,
    isDragging: false,
    startX: 0,
    track: [],
    localBackgroundImage: '',
    localSliderImage: ''
  },

  lifetimes: {
    attached() {
      this.downloadImages();
    }
  },

  methods: {
    async downloadImages() {
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
        if (this.data.sliderImage) {
          const sliderPath = await sdk.preloadImage(this.data.sliderImage);
          this.setData({ localSliderImage: sliderPath });
        }
      } catch (error) {
        console.error('图片下载失败:', error);
      }
    },

    onSliderTouchStart(e) {
      if (this.data.disabled) return;
      
      this.setData({
        isDragging: true,
        startX: e.touches[0].clientX
      });
    },

    onSliderTouchMove(e) {
      if (!this.data.isDragging || this.data.disabled) return;

      const currentX = e.touches[0].clientX;
      const deltaX = currentX - this.data.startX;
      let newPosition = this.data.sliderPosition + deltaX;

      newPosition = Math.max(0, Math.min(newPosition, this.data.trackLength));
      
      this.data.track.push({
        x: newPosition,
        timestamp: Date.now()
      });

      this.setData({
        sliderPosition: newPosition,
        startX: currentX
      });
    },

    onSliderTouchEnd() {
      if (!this.data.isDragging || this.data.disabled) return;

      this.setData({ isDragging: false });

      const verifyData = {
        captchaId: this.data.captchaId,
        track: this.data.track,
        userResponse: {
          position: this.data.sliderPosition,
          targetPosition: this.data.targetPosition
        }
      };

      this.triggerEvent('verify', verifyData);
    },

    onSliderTap() {
      if (this.data.disabled) return;
      
      const verifyData = {
        captchaId: this.data.captchaId,
        track: this.data.track,
        userResponse: {
          position: this.data.sliderPosition,
          targetPosition: this.data.targetPosition
        }
      };

      this.triggerEvent('verify', verifyData);
    },

    reset() {
      this.setData({
        sliderPosition: 0,
        isDragging: false,
        startX: 0,
        track: []
      });
    }
  }
});
