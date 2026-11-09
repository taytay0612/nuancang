const Module = require('module');
const fs = require('fs');
const path = require('path');

const testDir = process.argv[2];
if (!testDir) { console.error('usage: node test-store.js <dir>'); process.exit(2); }
fs.mkdirSync(testDir, { recursive: true });
process.env.PORTABLE_EXECUTABLE_DIR = testDir;

const handlers = {};
const fakeElectron = {
  app: {
    isPackaged: true,
    whenReady: () => new Promise(resolve => setImmediate(resolve)),
    getPath: () => testDir,
    on: () => {},
    quit: () => {},
    isReady: () => true
  },
  BrowserWindow: class {
    constructor() { this.webContents = {}; }
    loadFile() { return Promise.resolve(); }
    once() {}
    setMenuBarVisibility() {}
    show() {}
    static getAllWindows() { return []; }
    static fromWebContents() { return null; }
  },
  ipcMain: { handle: (channel, fn) => { handlers[channel] = fn; } },
  dialog: { showSaveDialog: async () => ({ canceled: true }), showOpenDialog: async () => ({ canceled: true }) },
  shell: { showItemInFolder: () => {} }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') return fakeElectron;
  return originalLoad.call(this, request, parent, isMain);
};

require(path.join(__dirname, '..', 'electron', 'main.js'));

const file = path.join(testDir, '暖仓数据.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await sleep(50);
  const results = [];
  const check = (name, ok, extra) => { results.push({ name, ok, extra }); };

  check('registers ipc handlers', !!handlers['data:load'] && !!handlers['data:save'] && !!handlers['data:path']);

  // 1. 首次加载创建空白数据
  let res = await handlers['data:load']();
  check('creates data file on first load', fs.existsSync(file) && res.created === true, 'boxes=' + res.state.boxes.length);
  check('default categories', Array.isArray(res.state.categories) && res.state.categories.length === 10);

  // 2. 保存并写回
  res.state.boxes.push({ id: 'b1', cabinet: 1, floor: 1, slot: 1, name: '电动工具', category: '工具', keywords: '电钻' });
  const saved = await handlers['data:save'](null, res.state);
  const reread = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('save persists boxes', saved.ok && reread.boxes.length === 1, 'path=' + saved.path);
  check('save keeps backup file', fs.existsSync(file + '.bak'));

  // 3. 损坏恢复
  fs.writeFileSync(file, '{ broken json', 'utf8');
  const recovered = await handlers['data:load']();
  const brokenFiles = fs.readdirSync(testDir).filter(n => n.startsWith('暖仓数据.json.broken-'));
  check('recovers from corrupt file', recovered.recovered === true && recovered.state.boxes.length === 0);
  check('keeps broken copy', brokenFiles.length === 1, brokenFiles.join(','));
  check('rewrites valid file after recovery', (() => { try { JSON.parse(fs.readFileSync(file, 'utf8')); return true; } catch { return false; } })());

  // 4. 路径
  const p = await handlers['data:path']();
  check('data path resolves to exe dir', path.dirname(p) === path.resolve(testDir), p);

  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.extra ? '  [' + r.extra + ']' : ''));
  }
  console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILED');
  process.exit(failed === 0 ? 0 : 1);
})().catch(err => { console.error('ERROR', err); process.exit(3); });
