Component({
  data: {
    currentAngle: 0,
    targetAngle: 0,
    success: false,
    rotating: false,
    lastTouchX: 0
  },

  properties: {
    backgroundImage: {
      type: String,
      value: ''
    },
    rotatedImage: {
      type: String,
      value: ''
    },
    targetAngle: {
      type: Number,
      value: 0
    },
    onComplete: {
      type: Function,
      value: () => {}
    }
  },

  methods: {
    onRotateStart(e) {
      if (this.data.success) return;
      this.setData({
        rotating: true,
        lastTouchX: e.touches[0].clientX
      });
    },

    onRotateMove(e) {
      if (!this.data.rotating || this.data.success) return;

      const currentX = e.touches[0].clientX;
      const deltaX = currentX - this.data.lastTouchX;

      let newAngle = this.data.currentAngle + deltaX * 0.5;
      newAngle = newAngle % 360;

      this.setData({
        currentAngle: newAngle,
        lastTouchX: currentX
      });
    },

    onRotateEnd(e) {
      if (!this.data.rotating || this.data.success) return;

      this.setData({ rotating: false });

      const accuracy = 15;
      const diff = Math.abs(this.data.currentAngle - this.data.targetAngle);

      if (diff <= accuracy || (360 - diff) <= accuracy) {
        this.setData({ success: true });
        this.properties.onComplete({
          type: 'rotate',
          data: {
            angle: this.data.currentAngle,
            target: this.data.targetAngle
          }
        });
      } else {
        this.setData({ currentAngle: 0 });
        this.triggerEvent('fail');
      }
    },

    resetRotate() {
      this.setData({ currentAngle: 0 });
    }
  }
});
