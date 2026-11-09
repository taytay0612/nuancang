/* 暖仓 · 家庭共享服务
   本机 Node 直接跑，无依赖、不联网、不要账号。
   同一 Wi-Fi 下的手机、平板、电脑打开同一个地址，共用一份数据。 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, '数据');
const DATA_FILE = path.join(DATA_DIR, '暖仓数据.json');
const LEGACY_FILE = path.join(ROOT, '..', '暖仓发布', '暖仓数据.json');
const INDEX_FILE = path.join(ROOT, 'index.html');
const MAX_BODY = 8 * 1024 * 1024;
const BASE_PORT = Number(process.env.PORT || 8787);

const APP_NAME = '暖仓';
const SCHEMA = 1;

function defaultState() {
  return {
    app: APP_NAME,
    schema: SCHEMA,
    version: 'v1.1',
    updatedAt: new Date().toISOString(),
    categories: ['工具', '五金', '食品', '药品', '文件', '日用品', '衣物', '电子产品', '纪念品', '其他'],
    boxes: [],
    history: [],
    trash: []
  };
}

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DATA_FILE)) return;
  let seed = null;
  if (fs.existsSync(LEGACY_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(LEGACY_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.boxes)) seed = parsed;
    } catch (err) {
      console.warn('旧数据文件读取失败，忽略：', err.message);
    }
  }
  writeData(seed || defaultState());
  if (seed) console.log('已从暖仓发布目录接管旧数据：' + LEGACY_FILE);
}

function readDataText() {
  ensureData();
  return fs.readFileSync(DATA_FILE, 'utf8');
}

function readData() {
  const text = readDataText();
  try {
    return { text, state: JSON.parse(text) };
  } catch (err) {
    const broken = DATA_FILE + '.broken-' + Date.now();
    fs.copyFileSync(DATA_FILE, broken);
    const fresh = defaultState();
    writeData(fresh);
    console.warn('数据文件损坏，已另存为 ' + broken + '，并新建空白数据。');
    return { text: JSON.stringify(fresh), state: fresh };
  }
}

function writeData(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const text = JSON.stringify(state, null, 2);
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  if (fs.existsSync(DATA_FILE)) {
    try { fs.copyFileSync(DATA_FILE, DATA_FILE + '.bak'); } catch (err) { /* 备份失败不挡保存 */ }
  }
  fs.renameSync(tmp, DATA_FILE);
  return text;
}

function revOf(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16);
}

function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const addr of ifaces[name] || []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      /* 只留家庭路由器网段，过滤 VPN、虚拟网卡 */
      const private4 =
        /^10\./.test(addr.address) ||
        /^192\.168\./.test(addr.address) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(addr.address);
      if (private4) out.push(addr.address);
    }
  }
  return out.sort();
}

function json(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('数据过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveIndex(res) {
  fs.readFile(INDEX_FILE, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('缺少 index.html，请先运行构建。');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}

async function handleApi(req, res, urlPath) {
  if (urlPath === '/api/info') {
    const { state } = readData();
    return json(res, 200, {
      app: APP_NAME,
      version: state.version || 'v1.1',
      dataPath: DATA_FILE,
      boxes: Array.isArray(state.boxes) ? state.boxes.length : 0,
      addresses: lanAddresses().map(ip => 'http://' + ip + ':' + server.address().port)
    });
  }

  if (urlPath === '/api/state' && req.method === 'GET') {
    const { text, state } = readData();
    return json(res, 200, { rev: revOf(text), state, dataPath: DATA_FILE });
  }

  if (urlPath === '/api/state' && req.method === 'PUT') {
    const raw = await readBody(req);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return json(res, 400, { error: 'bad-json' });
    }
    const incoming = parsed && parsed.state;
    if (!incoming || !Array.isArray(incoming.boxes)) {
      return json(res, 400, { error: 'bad-state' });
    }
    const current = readData();
    const currentRev = revOf(current.text);
    if (parsed.baseRev && parsed.baseRev !== currentRev) {
      return json(res, 409, { error: 'conflict', rev: currentRev, state: current.state });
    }
    const text = writeData(incoming);
    return json(res, 200, { rev: revOf(text), savedAt: new Date().toISOString() });
  }

  return json(res, 404, { error: 'not-found' });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath.startsWith('/api/')) {
    handleApi(req, res, urlPath).catch(err => {
      console.error('接口错误：', err);
      json(res, 500, { error: err.message });
    });
    return;
  }
  if (urlPath === '/' || urlPath === '/index.html') return serveIndex(res);
  if (urlPath === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

function openBrowser(url) {
  if (process.argv.includes('--no-open')) return;
  const cmd = process.platform === 'win32'
    ? 'start "" "' + url + '"'
    : process.platform === 'darwin' ? 'open "' + url + '"' : 'xdg-open "' + url + '"';
  exec(cmd, err => { if (err) console.warn('自动打开浏览器失败，请手动访问上面的地址。'); });
}

function start(port, attempt) {
  server.once('error', err => {
    if (err.code === 'EADDRINUSE' && attempt < 20) {
      start(port + 1, attempt + 1);
      return;
    }
    console.error('启动失败：', err.message);
    process.exit(1);
  });
  server.listen(port, '0.0.0.0', () => {
    ensureData();
    const local = 'http://127.0.0.1:' + port;
    const lan = lanAddresses().map(ip => 'http://' + ip + ':' + port);
    console.log('');
    console.log('  暖仓 · 家庭共享已启动');
    console.log('  ─────────────────────────────');
    console.log('  这台电脑：' + local);
    if (lan.length) {
      console.log('  手机 / 平板（同一 Wi-Fi）：');
      for (const url of lan) console.log('    ' + url);
    } else {
      console.log('  未检测到局域网地址，手机暂时无法访问。');
    }
    console.log('  数据文件：' + DATA_FILE);
    console.log('  关闭这个窗口即停止共享。');
    console.log('');
    openBrowser(local);
  });
}

start(BASE_PORT, 0);
