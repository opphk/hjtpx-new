const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('exampleApp', {
  sdk: {
    getCaptcha: (type) => ipcRenderer.invoke('sdk:get-captcha', type),
    verify: (options) => ipcRenderer.invoke('sdk:verify-captcha', options)
  },

  app: {
    showNotification: (title, body) => {
      return ipcRenderer.invoke('app:show-notification', { title, body });
    },
    getInfo: () => ipcRenderer.invoke('app:get-info')
  },

  onCaptchaSuccess: (callback) => {
    ipcRenderer.on('captcha:success', (event, data) => callback(data));
  },

  onCaptchaFail: (callback) => {
    ipcRenderer.on('captcha:fail', (event, data) => callback(data));
  },

  onCaptchaError: (callback) => {
    ipcRenderer.on('captcha:error', (event, data) => callback(data));
  }
});

console.log('Example app preload script loaded');
