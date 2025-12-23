const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: ({ type, payload }) => ipcRenderer.invoke(type, payload),
  onStatus: (callback) => ipcRenderer.on('status', callback),
  onProgress: (callback) => ipcRenderer.on('progress', callback),
  onError: (callback) => ipcRenderer.on('error', callback)
});
