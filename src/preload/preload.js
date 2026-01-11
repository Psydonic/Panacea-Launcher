import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  onStatus: (callback) => ipcRenderer.on('status', callback),
  onProgress: (callback) => ipcRenderer.on('progress', callback),
  onError: (callback) => ipcRenderer.on('error', callback)
});
