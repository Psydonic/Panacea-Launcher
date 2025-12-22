const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onStatus: (callback) => ipcRenderer.on('status', callback),
  onProgress: (callback) => ipcRenderer.on('progress', callback),
  onError: (callback) => ipcRenderer.on('error', callback)
});
