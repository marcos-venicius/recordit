const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (patch) => ipcRenderer.invoke('save-settings', patch),
  pickFolder: (current) => ipcRenderer.invoke('pick-folder', current),
  getSources: () => ipcRenderer.invoke('get-sources'),
  setRecording: (on) => ipcRenderer.send('set-recording', on),
  saveRecording: (recording) => ipcRenderer.invoke('save-recording', recording),
  showInFolder: (file) => ipcRenderer.invoke('show-in-folder', file),
  onStopRequest: (callback) => ipcRenderer.on('stop-request', () => callback()),
});
