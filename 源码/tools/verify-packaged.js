const http = require('http');
const fs = require('fs');

const PORT = Number(process.argv[2] || 9225);
const DATA = process.argv[3] || 'E:\\deepseek\\储藏室系统开发\\暖仓发布\\暖仓数据.json';

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

(async () => {
  const list = await getJson('/json/list');
  const page = list.find(t => t.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    }
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

  const evalJs = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  const checks = [];
  const check = (name, ok, extra) => checks.push({ name, ok, extra });

  check('窗口标题', (await evalJs('document.title')) === '暖仓 v1.0', await evalJs('document.title'));
  check('平面图 5 个柜子', (await evalJs("document.querySelectorAll('.cabinet-node').length")) === 5);
  const wall = await evalJs("document.querySelector('.room-wall').getAttribute('d')");
  check('门开在左墙下段', wall === 'M50 316 V40 H850 V516 H50', wall);
  const arc = await evalJs("document.querySelectorAll('path[stroke-dasharray]')[0].getAttribute('d')");
  check('门弧线在左墙', String(arc).startsWith('M50 316 A200 200'), arc);
  const posOf = async id => await evalJs("(() => { const r = document.querySelector('.cabinet-node[data-cab=\"" + id + "\"] rect.cabinet-shape'); return [r.getAttribute('x'), r.getAttribute('y'), r.getAttribute('width'), r.getAttribute('height')].join(','); })()");
  check('1号在上墙左', (await posOf(1)) === '150,40,300,100', await posOf(1));
  check('2号在上墙中', (await posOf(2)) === '450,40,300,100', await posOf(2));
  check('3号竖靠右墙', (await posOf(3)) === '750,40,100,300', await posOf(3));
  check('4号在下排左', (await posOf(4)) === '250,416,200,100', await posOf(4));
  check('5号在下排右', (await posOf(5)) === '450,416,200,100', await posOf(5));
  check('初始箱子数为 0', (await evalJs('state.boxes.length')) === 0);
  const dataPath = await evalJs('window.暖仓API.dataPath()');
  check('数据路径在 exe 同目录', dataPath.endsWith('暖仓发布\\暖仓数据.json'), dataPath);

  await evalJs("(() => { const b = addBox({cabinet:2, floor:2, slot:3, name:'测试箱', category:'五金', keywords:'螺丝'}); renderAll(); return b.id; })()");
  await evalJs('saveNow()');
  await new Promise(r => setTimeout(r, 600));
  const disk = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  check('写入数据文件', disk.boxes.length === 1 && disk.boxes[0].cabinet === 2, 'boxes=' + disk.boxes.length);

  await evalJs("(() => { state.boxes = []; state.history = []; state.trash = []; renderAll(); })()");
  await evalJs('saveNow()');
  await new Promise(r => setTimeout(r, 600));
  const disk2 = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  check('清理测试数据', disk2.boxes.length === 0, 'boxes=' + disk2.boxes.length);

  let failed = 0;
  for (const c of checks) { if (!c.ok) failed++; console.log((c.ok ? 'PASS ' : 'FAIL ') + c.name + (c.extra ? '  [' + c.extra + ']' : '')); }
  console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILED');
  ws.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch(err => { console.error('ERROR', err.message); process.exit(3); });
