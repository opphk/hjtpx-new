Component({
  data: {
    icons: [],
    selectedIcons: [],
    targetIcon: '',
    success: false,
    error: ''
  },

  properties: {
    iconImages: {
      type: Array,
      value: []
    },
    targetIcon: {
      type: String,
      value: ''
    },
    onComplete: {
      type: Function,
      value: () => {}
    }
  },

  methods: {
    onIconClick(e) {
      if (this.data.success) return;

      const iconId = e.currentTarget.dataset.id;
      const isSelected = this.data.selectedIcons.includes(iconId);

      let newSelected;
      if (isSelected) {
        newSelected = this.data.selectedIcons.filter(id => id !== iconId);
      } else {
        if (this.data.selectedIcons.length >= 3) {
          this.setData({ error: '最多选择3个图标' });
          return;
        }
        newSelected = [...this.data.selectedIcons, iconId];
      }

      this.setData({
        selectedIcons: newSelected,
        error: ''
      });
    },

    onSubmit() {
      if (this.data.selectedIcons.length === 0) {
        this.setData({ error: '请选择图标' });
        return;
      }

      const isCorrect = this.verifyIcons();

      if (isCorrect) {
        this.setData({ success: true });
        this.properties.onComplete({
          type: 'icon',
          data: {
            selected: this.data.selectedIcons,
            target: this.data.targetIcon
          }
        });
      } else {
        this.setData({
          error: '选择错误，请重试',
          selectedIcons: []
        });
        this.triggerEvent('fail');
      }
    },

    verifyIcons() {
      return this.data.selectedIcons.includes(this.data.targetIcon);
    },

    onRefresh() {
      this.setData({
        selectedIcons: [],
        error: '',
        success: false
      });
      this.triggerEvent('refresh');
    }
  }
});
