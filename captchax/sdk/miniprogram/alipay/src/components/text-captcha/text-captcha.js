Component({
  data: {
    inputValue: '',
    targetText: '',
    success: false,
    error: ''
  },

  props: {
    textImage: '',
    targetText: '',
    onComplete: () => {}
  },

  methods: {
    onInput(e) {
      this.setData({
        inputValue: e.detail.value,
        error: ''
      });
    },

    onSubmit() {
      if (!this.data.inputValue.trim()) {
        this.setData({ error: '请输入验证码' });
        return;
      }

      const isCorrect = this.verifyText();

      if (isCorrect) {
        this.setData({ success: true });
        this.props.onComplete({
          type: 'text',
          data: {
            input: this.data.inputValue,
            target: this.data.targetText
          }
        });
      } else {
        this.setData({
          error: '验证码错误，请重试',
          inputValue: ''
        });
        this.triggerEvent('fail');
      }
    },

    verifyText() {
      const input = this.data.inputValue.trim().toLowerCase();
      const target = this.data.targetText.toLowerCase();
      return input === target;
    },

    onRefresh() {
      this.setData({
        inputValue: '',
        error: '',
        success: false
      });
      this.triggerEvent('refresh');
    }
  }
});
