const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('captchaElectron', {
  showNotification: (title, body) => {
    return ipcRenderer.invoke('captcha:show-notification', { title, body });
  },

  showMessage: (options) => {
    return ipcRenderer.invoke('captcha:show-message', options);
  },

  getAppVersion: () => {
    return ipcRenderer.invoke('app:get-version');
  },

  getPlatform: () => {
    return ipcRenderer.invoke('app:get-platform');
  },

  log: (level, message) => {
    ipcRenderer.send('captcha:log', level, message);
  },

  onMenuNewCaptcha: (callback) => {
    ipcRenderer.on('menu:new-captcha', callback);
  },

  removeMenuNewCaptchaListener: () => {
    ipcRenderer.removeAllListeners('menu:new-captcha');
  }
});

console.log('CaptchaX preload script loaded');
