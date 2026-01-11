const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (payload) => ipcRenderer.send(payload.type, payload),
  load: (page) => ipcRenderer.send('load-page', page),
  onStatus: (callback) => ipcRenderer.on('status', callback),
  onProgress: (callback) => ipcRenderer.on('progress', callback),
  onError: (callback) => ipcRenderer.on('error', callback)
});
