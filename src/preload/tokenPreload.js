const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  submitToken: (token) => ipcRenderer.send('submit-token', token),
  onInitialError: (callback) => ipcRenderer.on('set-initial-error', (event, ...args) => callback(...args)),
});
