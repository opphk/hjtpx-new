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
    puzzleImage: {
      type: String,
      value: ''
    },
    targetPosition: {
      type: Object,
      value: { x: 0, y: 0 }
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
    puzzlePosition: 0,
    isDragging: false,
    startX: 0,
    track: [],
    localBackgroundImage: '',
    localPuzzleImage: '',
    isPuzzlePlaced: false,
    isSuccess: false
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
        if (this.data.puzzleImage) {
          const puzzlePath = await sdk.preloadImage(this.data.puzzleImage);
          this.setData({ localPuzzleImage: puzzlePath });
        }
      } catch (error) {
        console.error('图片下载失败:', error);
      }
    },

    onPuzzleTouchStart(e) {
      if (this.data.disabled || this.data.isPuzzlePlaced) return;
      
      this.setData({
        isDragging: true,
        startX: e.touches[0].clientX
      });
    },

    onPuzzleTouchMove(e) {
      if (!this.data.isDragging || this.data.disabled || this.data.isPuzzlePlaced) return;

      const currentX = e.touches[0].clientX;
      const deltaX = currentX - this.data.startX;
      let newPosition = this.data.puzzlePosition + deltaX;

      newPosition = Math.max(0, Math.min(newPosition, this.data.imageSize.width - 60));
      
      this.data.track.push({
        x: newPosition,
        timestamp: Date.now()
      });

      this.setData({
        puzzlePosition: newPosition,
        startX: currentX
      });
    },

    onPuzzleTouchEnd() {
      if (!this.data.isDragging || this.data.disabled || this.data.isPuzzlePlaced) return;

      this.setData({ isDragging: false });

      const threshold = 10;
      const targetX = this.data.targetPosition.x;
      const diff = Math.abs(this.data.puzzlePosition - targetX);

      if (diff <= threshold) {
        this.setData({
          puzzlePosition: targetX,
          isPuzzlePlaced: true,
          isSuccess: true
        });
      } else {
        this.setData({
          puzzlePosition: 0,
          track: []
        });
        wx.showToast({
          title: '位置不对，请重试',
          icon: 'none',
          duration: 1500
        });
      }

      const verifyData = {
        captchaId: this.data.captchaId,
        track: this.data.track,
        userResponse: {
          position: this.data.puzzlePosition,
          targetPosition: this.data.targetPosition.x
        }
      };

      this.triggerEvent('verify', verifyData);
    },

    reset() {
      this.setData({
        puzzlePosition: 0,
        isDragging: false,
        startX: 0,
        track: [],
        isPuzzlePlaced: false,
        isSuccess: false
      });
    }
  }
});
