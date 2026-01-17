const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  submitToken: (username, token) => ipcRenderer.send('submit-token', { username, token }),
  onInitialError: (callback) => ipcRenderer.on('set-initial-error', (event, ...args) => callback(...args)),
});
