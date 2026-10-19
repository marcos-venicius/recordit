const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let win;

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return {};
  }
}

function saveSettings(patch) {
  const settings = { ...loadSettings(), ...patch };
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
  return settings;
}

function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 400,
    minHeight: 480,
    title: 'RecordIt',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenu(null);
  win.loadFile('index.html');
}

ipcMain.handle('get-settings', () => {
  const settings = loadSettings();
  return { ...settings, folder: settings.folder || app.getPath('videos') };
});

ipcMain.handle('save-settings', (_e, patch) => saveSettings(patch));

ipcMain.handle('pick-folder', async (_e, current) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Pasta de destino',
    defaultPath: current,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (canceled || !filePaths.length) return null;
  saveSettings({ folder: filePaths[0] });
  return filePaths[0];
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
