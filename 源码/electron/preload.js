const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('暖仓API', {
  load: () => ipcRenderer.invoke('data:load'),
  save: state => ipcRenderer.invoke('data:save', state),
  dataPath: () => ipcRenderer.invoke('data:path'),
  saveFile: (filename, bytes) => ipcRenderer.invoke('file:save', filename, bytes),
  openFile: kind => ipcRenderer.invoke('file:open', kind),
  reveal: target => ipcRenderer.invoke('shell:reveal', target),
  appVersion: () => ipcRenderer.invoke('app:version')
});
