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
    icons: {
      type: Array,
      value: []
    },
    targetIcon: {
      type: String,
      value: ''
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
    selectedIcon: '',
    localImageUrl: '',
    localIcons: [],
    isVerified: false,
    verifyResult: null
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
        const downloadPromises = [];
        
        if (this.data.imageUrl) {
          downloadPromises.push(
            sdk.preloadImage(this.data.imageUrl).then(path => {
              this.setData({ localImageUrl: path });
            })
          );
        }

        if (this.data.icons && this.data.icons.length > 0) {
          downloadPromises.push(
            Promise.all(
              this.data.icons.map(icon => sdk.preloadImage(icon))
            ).then(paths => {
              this.setData({ localIcons: paths });
            })
          );
        }

        await Promise.all(downloadPromises);
      } catch (error) {
        console.error('图片下载失败:', error);
      }
    },

    onIconSelect(e) {
      if (this.data.disabled || this.data.isVerified) return;

      const icon = e.currentTarget.dataset.icon;
      this.setData({ selectedIcon: icon });
    },

    submitSelection() {
      if (!this.data.selectedIcon || this.data.disabled) return;

      const verifyData = {
        captchaId: this.data.captchaId,
        track: [],
        userResponse: {
          selectedIcon: this.data.selectedIcon,
          targetIcon: this.data.targetIcon
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
        title: '选择错误，请重试',
        icon: 'none',
        duration: 1500
      });
    },

    refresh() {
      this.setData({
        selectedIcon: '',
        isVerified: false,
        verifyResult: null
      });
      this.triggerEvent('refresh');
    }
  }
});
