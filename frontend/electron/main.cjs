const { app, BrowserWindow, Menu, ipcMain, shell, Tray, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;
let tray;
let isQuitting = false;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

function getAppIconPath() {
  const pngPath = path.join(__dirname, '../dist/meloday-app-icon.png');
  const icoPath = path.join(__dirname, '../dist/meloday-app-icon.ico');
  return fs.existsSync(pngPath) ? pngPath : icoPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 14 },
    icon: getAppIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      // QQ 音频、封面和本地 file:// 页面会跨源加载资源；保留该项避免播放链路被 Electron 拦截。
      webSecurity: false,
      allowRunningInsecureContent: false,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', async (event) => {
    if (isQuitting) return;
    event.preventDefault();

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: '关闭 Meloday',
      message: '要最小化到托盘继续运行，还是直接退出？',
      detail: '最小化到托盘后，播放和本地服务会继续运行。',
      buttons: ['最小化到托盘', '直接退出', '取消'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });

    if (response === 0) {
      mainWindow?.hide();
    } else if (response === 1) {
      isQuitting = true;
      app.quit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  if (tray) return;
  tray = new Tray(getAppIconPath());
  tray.setToolTip('Meloday');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 Meloday', click: showMainWindow },
    { label: '最小化到托盘', click: () => mainWindow?.hide() },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
  tray.on('double-click', showMainWindow);
}

ipcMain.handle('window:minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.handle('window:maximize-toggle', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return false;
  if (win.isMaximized()) {
    win.unmaximize();
    return false;
  }
  win.maximize();
  return true;
});

ipcMain.handle('window:is-maximized', () => {
  return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false;
});

ipcMain.handle('window:close', () => {
  BrowserWindow.getFocusedWindow()?.close();
});

ipcMain.handle('app:open-data-directory', async () => {
  const dataDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  await shell.openPath(dataDir);
  return { ok: true, path: dataDir };
});

function startBackend() {
  const isPackaged = app.isPackaged;

  let backendPath;
  let backendEntry;

  if (isPackaged) {
    backendPath = path.join(process.resourcesPath, 'backend');
    backendEntry = path.join(backendPath, 'dist', 'index.js');
  } else {
    backendPath = path.join(__dirname, '..', '..', 'backend');
    backendEntry = path.join(backendPath, 'dist', 'index.js');
  }

  // Store runtime data in the current Windows user's app data folder.
  // Release packages must never include or migrate the developer's local database.
  const userDataDir = app.getPath('userData');
  const userDbDir = path.join(userDataDir, 'data');
  const userDbPath = path.join(userDbDir, 'meloday.db');
  if (!fs.existsSync(userDbDir)) {
    fs.mkdirSync(userDbDir, { recursive: true });
  }

  console.log('[Electron] Starting backend from:', backendEntry);
  console.log('[Electron] Database path:', userDbPath);

  backendProcess = spawn(process.execPath, [backendEntry], {
    cwd: backendPath,
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: '3000',
      ELECTRON_RUN_AS_NODE: '1',
      DATABASE_PATH: userDbPath,
      MELODAY_CLOUD_AI_URL: process.env.MELODAY_CLOUD_AI_URL || 'https://www.cpc1.asia/api/meloday',
    },
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`);
    if (data.toString().includes('running on') && !mainWindow) {
      createWindow();
    }
  });

  backendProcess.on('exit', (code, signal) => {
    console.error(`[Electron] Backend exited with code ${code}, signal ${signal}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data}`);
  });

  backendProcess.on('error', (err) => {
    console.error('[Backend Process Error]', err);
  });

  // Fallback: open the window even if the backend log wording changes.
  setTimeout(() => {
    if (!mainWindow) {
      createWindow();
    }
  }, 3000);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createTray();
  startBackend();
});

app.on('window-all-closed', () => {
  if (isQuitting) {
    app.quit();
  }
});

app.on('activate', () => {
  showMainWindow();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});
