Page({
  data: {},

  onLoad() {},

  navigateTo(e) {
    const page = e.currentTarget.dataset.page;
    wx.navigateTo({
      url: `../${page}/${page}`
    });
  }
});
