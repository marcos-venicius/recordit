const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, desktopCapturer, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Screen capture on Wayland via xdg-desktop-portal + PipeWire
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');

const APP_ICON = path.join(__dirname, 'build', 'icon.png');

let win;
let tray;
let recording = false;
let quitting = false;

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

const sanitize = (s) =>
  String(s || '')
    .replace(/[/\\:*?"<>|\x00-\x1f]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80);

function timestamp(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_` +
    `${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`;
}

// "Document - Visual Studio Code" -> "Visual Studio Code"
const appName = (sourceName) => String(sourceName || '').split(/\s[-–—|]\s/).pop();

function outputPath({ folder, name, sourceName, startTime, ext }) {
  const base = sanitize(name) || `${sanitize(appName(sourceName)) || 'recordit'}_${timestamp(new Date(startTime))}`;
  let file = path.join(folder, `${base}.${ext}`);
  for (let i = 1; fs.existsSync(file); i++) file = path.join(folder, `${base}_${i}.${ext}`);
  return file;
}

// Dot drawn in code (premultiplied BGRA), no image files
function dotIcon([r, g, b], size = 32) {
  const buf = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const radius = size * 0.4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = Math.max(0, Math.min(1, radius - Math.hypot(x - c, y - c) + 0.5));
      const i = (y * size + x) * 4;
      buf[i] = b * a;
      buf[i + 1] = g * a;
      buf[i + 2] = r * a;
      buf[i + 3] = 255 * a;
    }
  }
  return nativeImage.createFromBitmap(buf, { width: size, height: size });
}

const icons = {};

function showWindow() {
  win.show();
  win.focus();
}

function requestStop() {
  if (recording) win.webContents.send('stop-request');
}

function updateTray() {
  tray.setImage(recording ? icons.recording : icons.idle);
  tray.setToolTip(recording ? 'RecordIt — recording (click to stop)' : 'RecordIt');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Stop recording', enabled: recording, click: requestStop },
      { label: 'Show window', click: showWindow },
      { type: 'separator' },
      { label: 'Quit', click: quit },
    ]),
  );
}

function quit() {
  quitting = true;
  if (recording) requestStop();
  else app.quit();
}

function createWindow() {
  win = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 400,
    minHeight: 480,
    title: 'RecordIt',
    icon: APP_ICON,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // The window is hidden while recording; throttling would make MediaRecorder drop/stall frames
      backgroundThrottling: false,
    },
  });
  win.setMenu(null);
  win.loadFile('index.html');
  // While recording, closing the window only hides it; the tray stays active
  win.on('close', (e) => {
    if (recording && !quitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function createTray() {
  icons.idle = nativeImage.createFromPath(APP_ICON).resize({ width: 32, height: 32 });
  icons.recording = dotIcon([229, 72, 77]);
  tray = new Tray(icons.idle);
  tray.on('click', () => (recording ? requestStop() : showWindow()));
  updateTray();
}

ipcMain.handle('get-settings', () => {
  const settings = loadSettings();
  return { ...settings, folder: settings.folder || app.getPath('videos') };
});

ipcMain.handle('save-settings', (_e, patch) => saveSettings(patch));

ipcMain.handle('pick-folder', async (_e, current) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Save to',
    defaultPath: current,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (canceled || !filePaths.length) return null;
  saveSettings({ folder: filePaths[0] });
  return filePaths[0];
});

// On Wayland, getSources opens the system picker and returns only the chosen source
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 240, height: 135 },
    });
    return sources.map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
  } catch {
    return [];
  }
});

ipcMain.on('set-recording', (_e, on) => {
  recording = on;
  updateTray();
  if (on) win.hide();
});

ipcMain.handle('save-recording', async (_e, { data, ...meta }) => {
  try {
    await fs.promises.mkdir(meta.folder, { recursive: true });
    const file = outputPath(meta);
    await fs.promises.writeFile(file, Buffer.from(data));
    return file;
  } finally {
    recording = false;
    updateTray();
    if (quitting) app.quit();
    else showWindow();
  }
});

ipcMain.handle('show-in-folder', (_e, file) => shell.showItemInFolder(file));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => win && !recording && showWindow());
  app.whenReady().then(() => {
    createWindow();
    createTray();
  });
  app.on('window-all-closed', () => app.quit());
}
