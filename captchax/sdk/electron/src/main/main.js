const { app, BrowserWindow, Menu, Tray, ipcMain, Notification, nativeImage } = require('electron');
const path = require('path');
const log = require('electron-log');

class CaptchaElectronApp {
  constructor() {
    this.mainWindow = null;
    this.tray = null;
    this.isQuitting = false;
    
    this.init();
  }

  init() {
    log.initialize();
    log.transports.file.level = 'info';
    log.info('CaptchaX Electron SDK starting...');
    
    app.whenReady().then(() => {
      this.createWindow();
      this.createMenu();
      this.setupIPC();
      
      if (process.platform !== 'darwin') {
        app.on('window-all-closed', () => {
          if (process.platform !== 'darwin') {
            app.quit();
          }
        });
      }
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
      
      app.on('before-quit', () => {
        this.isQuitting = true;
      });
      
      log.info('CaptchaX Electron SDK initialized successfully');
    });
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../../assets/icon.png'),
      title: 'CaptchaX SDK Demo',
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      log.info('Main window displayed');
    });

    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
        this.showNotification('CaptchaX', '应用已最小化到系统托盘');
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  createMenu() {
    const template = [
      {
        label: '文件',
        submenu: [
          {
            label: '新建验证码窗口',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.mainWindow.webContents.send('menu:new-captcha')
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
            click: () => {
              this.isQuitting = true;
              app.quit();
            }
          }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: '视图',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: '窗口',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { role: 'close' }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于 CaptchaX',
            click: () => {
              const { dialog } = require('electron');
              dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: '关于 CaptchaX',
                message: 'CaptchaX Electron SDK',
                detail: '版本: 1.0.0\n跨平台桌面验证码解决方案'
              });
            }
          },
          {
            label: '开发者工具',
            accelerator: 'F12',
            click: () => this.mainWindow.webContents.toggleDevTools()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  createTray() {
    const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
    let trayIcon;
    
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        trayIcon = nativeImage.createEmpty();
      }
    } catch (error) {
      log.warn('Failed to load tray icon, using default');
      trayIcon = nativeImage.createEmpty();
    }

    this.tray = new Tray(trayIcon);
    this.tray.setToolTip('CaptchaX SDK');
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          this.mainWindow.show();
        }
      },
      {
        label: '新建验证码',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.webContents.send('menu:new-captcha');
        }
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
    
    this.tray.on('double-click', () => {
      this.mainWindow.show();
    });
    
    log.info('System tray created');
  }

  setupIPC() {
    ipcMain.handle('captcha:show-notification', async (event, options) => {
      return this.showNotification(options.title, options.body);
    });

    ipcMain.handle('captcha:show-message', async (event, options) => {
      const { dialog } = require('electron');
      return dialog.showMessageBox(this.mainWindow, {
        type: options.type || 'info',
        title: options.title || 'CaptchaX',
        message: options.message,
        detail: options.detail
      });
    });

    ipcMain.handle('app:get-version', async () => {
      return app.getVersion();
    });

    ipcMain.handle('app:get-platform', async () => {
      return process.platform;
    });

    ipcMain.on('captcha:log', (event, level, message) => {
      log[level](message);
    });

    log.info('IPC handlers registered');
  }

  showNotification(title, body) {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: title,
        body: body,
        silent: false
      });
      
      notification.show();
      
      notification.on('click', () => {
        this.mainWindow.show();
      });
      
      return true;
    }
    
    log.warn('Notifications not supported');
    return false;
  }

  getMainWindow() {
    return this.mainWindow;
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
    }
    if (this.mainWindow) {
      this.mainWindow.destroy();
    }
  }
}

if (require.main === module) {
  new CaptchaElectronApp();
}

module.exports = CaptchaElectronApp;
