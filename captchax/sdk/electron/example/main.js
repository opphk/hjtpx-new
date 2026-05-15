const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const log = require('electron-log');

class ExampleApp {
  constructor() {
    this.mainWindow = null;
    this.sdk = null;
    
    this.init();
  }

  init() {
    log.initialize();
    log.transports.file.level = 'info';
    
    log.info('Example app starting...');
    
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIPC();
      this.loadSDK();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'CaptchaX SDK 示例应用',
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      log.info('Example window displayed');
    });
  }

  setupIPC() {
    ipcMain.handle('sdk:get-captcha', async (event, type) => {
      try {
        const data = await this.sdk.getCaptcha(type);
        return { success: true, data };
      } catch (error) {
        log.error('Failed to get captcha:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('sdk:verify-captcha', async (event, { type, captchaId, track, userResponse }) => {
      try {
        const result = await this.sdk.verify(type, captchaId, track, userResponse);
        return result;
      } catch (error) {
        log.error('Failed to verify captcha:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('app:show-notification', async (event, { title, body }) => {
      if (Notification.isSupported()) {
        const notification = new Notification({ title, body });
        notification.show();
        return true;
      }
      return false;
    });

    ipcMain.handle('app:get-info', async () => {
      return {
        version: app.getVersion(),
        platform: process.platform,
        electronVersion: process.versions.electron
      };
    });

    log.info('IPC handlers registered');
  }

  loadSDK() {
    try {
      const CaptchaSDK = require('../captcha-electron');
      this.sdk = CaptchaSDK.createSDK({
        apiBaseUrl: 'http://localhost:3000',
        enableNotifications: true
      });

      this.sdk.on('captcha:success', (data) => {
        log.info('Captcha success:', data);
        this.mainWindow.webContents.send('captcha:success', data);
      });

      this.sdk.on('captcha:fail', (data) => {
        log.warn('Captcha failed:', data);
        this.mainWindow.webContents.send('captcha:fail', data);
      });

      this.sdk.on('captcha:error', (data) => {
        log.error('Captcha error:', data);
        this.mainWindow.webContents.send('captcha:error', data);
      });

      log.info('SDK loaded successfully');
    } catch (error) {
      log.error('Failed to load SDK:', error);
    }
  }

  getSDK() {
    return this.sdk;
  }
}

if (require.main === module) {
  new ExampleApp();
}

module.exports = ExampleApp;
