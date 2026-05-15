Component({
  data: {
    points: [],
    clickCount: 0,
    maxClicks: 4,
    success: false
  },

  props: {
    backgroundImage: '',
    targetPositions: [],
    onComplete: () => {}
  },

  methods: {
    onImageClick(e) {
      if (this.data.success) return;
      if (this.data.clickCount >= this.data.maxClicks) return;

      const { x, y } = e.detail;

      const clickX = Math.round(x);
      const clickY = Math.round(y);

      const newPoints = [...this.data.points, { x: clickX, y: clickY }];

      this.setData({
        points: newPoints,
        clickCount: this.data.clickCount + 1
      });

      if (this.data.clickCount >= this.data.maxClicks) {
        setTimeout(() => {
          this.verifyClicks();
        }, 300);
      }
    },

    verifyClicks() {
      const isCorrect = this.checkAccuracy();

      if (isCorrect) {
        this.setData({ success: true });
        this.props.onComplete({
          type: 'click',
          data: {
            points: this.data.points
          }
        });
      } else {
        this.resetClicks();
        this.triggerEvent('fail');
      }
    },

    checkAccuracy() {
      const accuracy = 20;
      const targets = this.props.targetPositions || [];

      if (this.data.points.length !== targets.length) {
        return false;
      }

      for (let i = 0; i < targets.length; i++) {
        const dx = Math.abs(this.data.points[i].x - targets[i].x);
        const dy = Math.abs(this.data.points[i].y - targets[i].y);

        if (dx > accuracy || dy > accuracy) {
          return false;
        }
      }

      return true;
    },

    resetClicks() {
      this.setData({
        points: [],
        clickCount: 0,
        success: false
      });
    }
  }
});
