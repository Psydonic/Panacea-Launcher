const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  submitToken: (token) => ipcRenderer.invoke('submit-token', token),
});
