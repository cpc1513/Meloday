const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    icon: path.join(__dirname, '../dist/meloday-app-icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    show: false,
  });

  // 加载前端
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  // 判断是否在打包后的环境
  const isPackaged = app.isPackaged;

  let backendPath;
  let backendEntry;

  if (isPackaged) {
    // 打包后：后端在 extraResources 里
    backendPath = path.join(process.resourcesPath, 'backend');
    backendEntry = path.join(backendPath, 'dist', 'index.js');
  } else {
    // 开发时：后端在项目根目录的 backend/ 里
    backendPath = path.join(__dirname, '..', '..', 'backend');
    backendEntry = path.join(backendPath, 'dist', 'index.js');
  }

  // 数据库放在用户数据目录，避免被重新打包覆盖
  const userDataDir = app.getPath('userData');
  const userDbDir = path.join(userDataDir, 'data');
  const userDbPath = path.join(userDbDir, 'meloday.db');
  if (!fs.existsSync(userDbDir)) {
    fs.mkdirSync(userDbDir, { recursive: true });
  }
  // 首次启动：如果 resources/data/meloday.db 存在，迁移到用户目录
  const bundledDbPath = path.join(process.resourcesPath, 'data', 'meloday.db');
  if (fs.existsSync(bundledDbPath) && !fs.existsSync(userDbPath)) {
    fs.copyFileSync(bundledDbPath, userDbPath);
    console.log('[Electron] Migrated database to:', userDbPath);
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

  // 兜底：3秒后如果窗口还没打开，直接打开
  setTimeout(() => {
    if (!mainWindow) {
      createWindow();
    }
  }, 3000);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  startBackend();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
