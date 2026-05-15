Component({
  data: {
    puzzleLeft: 0,
    targetX: 0,
    puzzleUrl: '',
    slotUrl: '',
    trackWidth: 280,
    success: false,
    sliding: false
  },

  props: {
    backgroundImage: '',
    puzzleImage: '',
    slotImage: '',
    targetPosition: 0,
    onComplete: () => {}
  },

  methods: {
    onSliderStart(e) {
      if (this.data.success) return;
      this.setData({ sliding: true });
    },

    onSliderMove(e) {
      if (!this.data.sliding || this.data.success) return;

      const touchX = e.touches[0].clientX;
      const startX = e.target.dataset.startX || 0;
      const trackWidth = this.data.trackWidth;
      let newLeft = touchX - startX;

      newLeft = Math.max(0, Math.min(newLeft, trackWidth));
      this.setData({ puzzleLeft: newLeft });
    },

    onSliderEnd(e) {
      if (!this.data.sliding || this.data.success) return;

      this.setData({ sliding: false });

      const accuracy = 10;
      const diff = Math.abs(this.data.puzzleLeft - this.data.targetX);

      if (diff <= accuracy) {
        this.setData({ success: true });
        this.props.onComplete({
          type: 'puzzle',
          data: {
            position: this.data.puzzleLeft,
            target: this.data.targetX
          }
        });
      } else {
        this.setData({ puzzleLeft: 0 });
        this.triggerEvent('fail');
      }
    }
  }
});
