Component({
  data: {
    currentAngle: 0,
    targetAngle: 0,
    success: false,
    rotating: false
  },

  props: {
    backgroundImage: '',
    rotatedImage: '',
    targetAngle: 0,
    onComplete: () => {}
  },

  methods: {
    onRotateStart(e) {
      if (this.data.success) return;
      this.setData({ rotating: true });
    },

    onRotateMove(e) {
      if (!this.data.rotating || this.data.success) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;

      const centerX = 140;
      const centerY = 80;

      const angle = Math.atan2(touchY - centerY, touchX - centerX) * (180 / Math.PI);

      let newAngle = this.data.currentAngle + (e.touches[0].clientX - e.touches[0].pageX) * 0.5;
      newAngle = newAngle % 360;

      this.setData({ currentAngle: newAngle });
    },

    onRotateEnd(e) {
      if (!this.data.rotating || this.data.success) return;

      this.setData({ rotating: false });

      const accuracy = 15;
      const diff = Math.abs(this.data.currentAngle - this.data.targetAngle);

      if (diff <= accuracy || (360 - diff) <= accuracy) {
        this.setData({ success: true });
        this.props.onComplete({
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
    }
  }
});
