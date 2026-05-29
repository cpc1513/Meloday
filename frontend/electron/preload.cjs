const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('melodayWindow', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:maximize-toggle'),
  close: () => ipcRenderer.invoke('window:close'),
});
