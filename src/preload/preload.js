const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onStatus: (callback) => ipcRenderer.on('status', callback),
  onError: (callback) => ipcRenderer.on('error', callback)
});
