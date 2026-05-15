Component({
  data: {
    sliderLeft: 0,
    trackWidth: 280,
    targetX: 0,
    sliding: false,
    success: false
  },

  props: {
    backgroundImage: '',
    sliderImage: '',
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
      this.setData({ sliderLeft: newLeft });
    },

    onSliderEnd(e) {
      if (!this.data.sliding || this.data.success) return;

      this.setData({ sliding: false });

      const accuracy = 10;
      const diff = Math.abs(this.data.sliderLeft - this.data.targetX);

      if (diff <= accuracy) {
        this.setData({ success: true });
        this.props.onComplete({
          type: 'slider',
          data: {
            position: this.data.sliderLeft,
            target: this.data.targetX
          }
        });
      } else {
        this.setData({ sliderLeft: 0 });
        this.triggerEvent('fail');
      }
    },

    handleTrackClick(e) {
      const clickX = e.detail.x;
      const trackWidth = this.data.trackWidth;
      this.setData({ targetX: clickX });
    }
  }
});
