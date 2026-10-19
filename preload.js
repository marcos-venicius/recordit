const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (patch) => ipcRenderer.invoke('save-settings', patch),
  pickFolder: (current) => ipcRenderer.invoke('pick-folder', current),
  getSources: () => ipcRenderer.invoke('get-sources'),
});
