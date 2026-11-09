const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_NAME = '暖仓数据.json';
const isDev = !app.isPackaged;

function baseDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  if (isDev) return path.join(__dirname, '..');
  return path.dirname(app.getPath('exe'));
}

function dataPath() {
  return path.join(baseDir(), DATA_NAME);
}

function defaultState() {
  return {
    app: '暖仓',
    schema: 1,
    version: 'v1.0',
    updatedAt: new Date().toISOString(),
    categories: ['工具', '五金', '食品', '药品', '文件', '日用品', '衣物', '电子产品', '纪念品', '其他'],
    boxes: [],
    history: [],
    trash: []
  };
}

function writeAtomic(file, text) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, file + '.bak'); } catch (err) { /* 备份失败不阻断保存 */ }
  }
  fs.renameSync(tmp, file);
}

function loadState() {
  const file = dataPath();
  if (!fs.existsSync(file)) {
    const fresh = defaultState();
    writeAtomic(file, JSON.stringify(fresh, null, 2));
    return { state: fresh, created: true, recovered: false, path: file };
  }
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return { state: parsed, created: false, recovered: false, path: file };
  } catch (err) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const broken = file + '.broken-' + stamp;
    try { fs.copyFileSync(file, broken); } catch (e) { /* 保留失败也继续 */ }
    const fresh = defaultState();
    writeAtomic(file, JSON.stringify(fresh, null, 2));
    return { state: fresh, created: true, recovered: true, broken, path: file };
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f3e9dc',
    title: '暖仓',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => win.show());
  return win;
}

app.whenReady().then(() => {
  ipcMain.handle('data:load', () => loadState());

  ipcMain.handle('data:save', (event, state) => {
    try {
      writeAtomic(dataPath(), JSON.stringify(state, null, 2));
      return { ok: true, path: dataPath() };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('data:path', () => dataPath());

  ipcMain.handle('file:save', async (event, filename, bytes) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const safeName = String(filename || '暖仓导出').replace(/[\\/:*?"<>|]/g, '_');
    const res = await dialog.showSaveDialog(win, {
      title: '保存文件',
      defaultPath: path.join(baseDir(), safeName)
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(res.filePath, Buffer.from(bytes));
      return { ok: true, path: res.filePath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('file:open', async event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const res = await dialog.showOpenDialog(win, {
      title: '选择备份文件',
      properties: ['openFile'],
      filters: [{ name: '暖仓备份', extensions: ['json'] }]
    });
    if (res.canceled || !res.filePaths.length) return { canceled: true };
    try {
      const text = fs.readFileSync(res.filePaths[0], 'utf8');
      return { ok: true, path: res.filePaths[0], text };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('shell:reveal', (event, target) => {
    if (!target || !fs.existsSync(target)) return false;
    shell.showItemInFolder(target);
    return true;
  });

  ipcMain.handle('app:version', () => 'Electron ' + process.versions.electron);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
