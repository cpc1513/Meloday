const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('melodayWindow', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:maximize-toggle'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  close: () => ipcRenderer.invoke('window:close'),
  openDataDirectory: () => ipcRenderer.invoke('app:open-data-directory'),
});
