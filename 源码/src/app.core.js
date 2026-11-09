/* ===================================================================
   暖仓 v1.0 · 核心数据层
   =================================================================== */

const APP_VERSION = 'v1.1';
const TRASH_DAYS = 30;
const LABEL_W = 591;   // 50mm @300dpi
const LABEL_H = 354;   // 30mm @300dpi

const CABINETS = [
  { id: 1, name: '1号柜', kind: 'fixed', floors: 4, perFloor: 5, note: '4 层 × 5 箱' },
  { id: 2, name: '2号柜', kind: 'fixed', floors: 4, perFloor: 5, note: '4 层 × 5 箱' },
  { id: 3, name: '3号柜', kind: 'fixed', floors: 4, perFloor: 4, note: '4 层 × 4 箱' },
  { id: 4, name: '4号柜', kind: 'flex', floors: 4, perFloor: 6, note: '灵活层板 · 按需建箱位' },
  { id: 5, name: '5号柜', kind: 'flex', floors: 4, perFloor: 6, note: '灵活层板 · 按需建箱位' }
];

const DEFAULT_CATEGORIES = ['工具', '五金', '食品', '药品', '文件', '日用品', '衣物', '电子产品', '纪念品', '其他'];

const CAT_PALETTE = [
  '#a7603f', '#8a7b45', '#5f7d63', '#7a6a9a', '#9a5f6a',
  '#4f7a8a', '#8a6a4a', '#6b7f45', '#7d5f8a', '#5f7a7a'
];

const nativeApi = window.暖仓API || null;
const STORAGE_KEY = 'nuancang.v1';
/* 用 http(s) 打开时走家庭共享服务；双击文件打开时退回本机存储 */
const sharedMode = !nativeApi && (cloudMode || /^https?:$/.test(location.protocol));

const SYNC = {
  rev: '',
  savedJson: '',
  online: false,
  pushing: false,
  timer: null,
  lastError: ''
};

let state = null;
let saveTimer = null;
let currentView = 'room';
let currentCabinet = 1;
let openBoxId = null;

/* ---------------- 位置与编码 ---------------- */

function cabinetOf(id) {
  return CABINETS.find(c => c.id === Number(id));
}

function posCode(cab, floor, slot) {
  return `G${cab}-L${floor}-B${slot}`;
}

function posCn(cab, floor, slot) {
  return `柜${cab} 层${floor} 箱${slot}`;
}

function posKey(cab, floor, slot) {
  return `${cab}-${floor}-${slot}`;
}

function parsePosCode(code) {
  const m = /^G(\d+)-L(\d+)-B(\d+)$/.exec(String(code || '').trim().toUpperCase());
  if (!m) return null;
  return { cabinet: Number(m[1]), floor: Number(m[2]), slot: Number(m[3]) };
}

function boxAt(cab, floor, slot) {
  return state.boxes.find(b => b.cabinet === cab && b.floor === floor && b.slot === slot) || null;
}

function positionLabel(b) {
  return posCn(b.cabinet, b.floor, b.slot);
}

function boxMatches(b, q) {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [
    b.name, b.keywords, b.note, b.category,
    posCode(b.cabinet, b.floor, b.slot),
    posCn(b.cabinet, b.floor, b.slot)
  ].join(' ').toLowerCase();
  return hay.includes(s);
}

/* ---------------- 分类颜色 ---------------- */

function catColor(name) {
  const i = state.categories.indexOf(name);
  if (i >= 0) return CAT_PALETTE[i % CAT_PALETTE.length];
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) % 9973;
  return CAT_PALETTE[h % CAT_PALETTE.length];
}

/* ---------------- 状态 ---------------- */

function defaultState() {
  return {
    app: '暖仓',
    schema: 1,
    version: APP_VERSION,
    updatedAt: new Date().toISOString(),
    categories: DEFAULT_CATEGORIES.slice(),
    boxes: [],
    history: [],
    trash: []
  };
}

function normalizeState(raw) {
  const s = Object.assign(defaultState(), raw || {});
  if (!Array.isArray(s.categories) || !s.categories.length) s.categories = DEFAULT_CATEGORIES.slice();
  if (!Array.isArray(s.boxes)) s.boxes = [];
  if (!Array.isArray(s.history)) s.history = [];
  if (!Array.isArray(s.trash)) s.trash = [];
  s.boxes = s.boxes.filter(b => b && b.cabinet && b.floor && b.slot && b.name);
  s.trash = s.trash.filter(t => t && t.box && t.deletedAt);
  return s;
}

/* ---------------- 家庭共享同步 ---------------- */

function readLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch (err) {
    return null;
  }
}

function writeLocalState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (err) {
    /* 本机缓存写不进去不影响共享数据 */
  }
}

function timeOf(v) {
  const t = new Date(v).getTime();
  return isNaN(t) ? 0 : t;
}

async function fetchRemoteState() {
  if (cloudMode) {
    if (!cloudSession) throw new Error('尚未登录');
    return cloudFetchState();
  }
  const res = await fetch('/api/state', { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

/* 两台设备同时改：按箱子逐条取较新的一份，删除与恢复按时间先后判胜负 */
function mergeStates(a, b) {
  const out = normalizeState({});

  out.categories = [];
  for (const name of [...(a.categories || []), ...(b.categories || [])]) {
    if (name && !out.categories.includes(name)) out.categories.push(name);
  }
  if (!out.categories.length) out.categories = DEFAULT_CATEGORIES.slice();

  const boxMap = new Map();
  for (const list of [a.boxes || [], b.boxes || []]) {
    for (const box of list) {
      if (!box || !box.id) continue;
      const prev = boxMap.get(box.id);
      if (!prev || timeOf(box.updatedAt) >= timeOf(prev.updatedAt)) boxMap.set(box.id, box);
    }
  }

  const trashMap = new Map();
  for (const list of [a.trash || [], b.trash || []]) {
    for (const item of list) {
      if (!item || !item.box || !item.box.id) continue;
      const prev = trashMap.get(item.box.id);
      if (!prev || timeOf(item.deletedAt) > timeOf(prev.deletedAt)) trashMap.set(item.box.id, item);
    }
  }

  const ids = new Set([...boxMap.keys(), ...trashMap.keys()]);
  for (const id of ids) {
    const box = boxMap.get(id);
    const gone = trashMap.get(id);
    if (box && gone) {
      if (timeOf(box.updatedAt) > timeOf(gone.deletedAt)) out.boxes.push(box);
      else out.trash.push(gone);
    } else if (box) {
      out.boxes.push(box);
    } else if (gone) {
      out.trash.push(gone);
    }
  }

  out.boxes.sort((x, y) => timeOf(y.updatedAt) - timeOf(x.updatedAt));
  const slots = new Set();
  const kept = [];
  for (const box of out.boxes) {
    const key = box.cabinet + '-' + box.floor + '-' + box.slot;
    if (slots.has(key)) {
      out.trash.push({ box, deletedAt: new Date().toISOString(), conflict: true });
      continue;
    }
    slots.add(key);
    kept.push(box);
  }
  out.boxes = kept;

  const seen = new Set();
  out.history = [];
  for (const h of [...(a.history || []), ...(b.history || [])]) {
    if (!h || !h.id || seen.has(h.id)) continue;
    seen.add(h.id);
    out.history.push(h);
  }
  out.history.sort((x, y) => timeOf(y.at) - timeOf(x.at));
  if (out.history.length > 500) out.history.length = 500;

  out.updatedAt = timeOf(a.updatedAt) >= timeOf(b.updatedAt) ? a.updatedAt : b.updatedAt;
  return out;
}

function editingNow() {
  return Boolean((typeof activeModal !== 'undefined' && activeModal) || openBoxId);
}

async function pushState() {
  if (!sharedMode || SYNC.pushing) return;
  SYNC.pushing = true;
  try {
    if (cloudMode) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const latest = await cloudFetchState();
        if (latest.rev && latest.rev !== SYNC.rev && latest.state) {
          state = mergeStates(state, normalizeState(latest.state));
          SYNC.rev = latest.rev;
          renderAll();
        }
        const out = await cloudSaveState(state);
        SYNC.rev = out.rev;
        SYNC.savedJson = JSON.stringify(state);
        SYNC.online = true;
        writeLocalState(state);
        SYNC.lastError = '';
        setSyncStatus('ok');
        return;
      }
      setSyncStatus('warn');
      return;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseRev: SYNC.rev, state })
      });
      if (res.status === 409) {
        const cur = await res.json();
        state = mergeStates(state, normalizeState(cur.state));
        SYNC.rev = cur.rev || '';
        renderAll();
        continue;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const out = await res.json();
      SYNC.rev = out.rev || '';
      SYNC.savedJson = JSON.stringify(state);
      SYNC.online = true;
      writeLocalState(state);
      SYNC.lastError = '';
      setSyncStatus('ok');
      return;
    }
    setSyncStatus('warn');
  } catch (err) {
    console.warn('保存到共享服务失败：', err.message);
    SYNC.online = false;
    setSyncStatus('offline');
    if (SYNC.lastError !== err.message) {
      SYNC.lastError = err.message;
      toast((cloudMode ? '云端保存失败：' : '保存失败：') + err.message);
    }
  } finally {
    SYNC.pushing = false;
  }
}

async function pullState(silent) {
  if (!sharedMode || SYNC.pushing) return;
  /* 页面在后台时不轮询，省流量也省免费额度 */
  if (silent && document.hidden) return;
  try {
    const remote = await fetchRemoteState();
    SYNC.online = true;
    if ((remote.rev || '') === SYNC.rev) {
      setSyncStatus('ok');
      return;
    }
    const dirty = JSON.stringify(state) !== SYNC.savedJson;
    if (!dirty) {
      state = normalizeState(remote.state);
      SYNC.rev = remote.rev || '';
      SYNC.savedJson = JSON.stringify(state);
      writeLocalState(state);
      renderAll();
      setSyncStatus('ok');
      if (!silent) toast('已同步家人刚改的内容');
      return;
    }
    if (editingNow()) return;
    state = mergeStates(state, normalizeState(remote.state));
    SYNC.rev = remote.rev || '';
    writeLocalState(state);
    renderAll();
    await pushState();
  } catch (err) {
    SYNC.online = false;
    setSyncStatus('offline');
    if (SYNC.lastError !== err.message) {
      SYNC.lastError = err.message;
      toast('云端读取失败：' + err.message);
    }
  }
}

function startSyncLoop() {
  if (!sharedMode) return;
  if (SYNC.timer) clearInterval(SYNC.timer);
  SYNC.timer = setInterval(() => pullState(true), 8000);
  window.addEventListener('focus', () => pullState(true));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) pullState(true);
  });
}

/* ---------------- 读取与保存 ---------------- */

async function loadState() {
  if (cloudMode) {
    const session = await cloudInit();
    if (!session) {
      state = readLocalState() || defaultState();
      SYNC.online = false;
      purgeExpiredTrash(true);
      renderAll();
      showCloudLogin();
      return;
    }
    hideCloudLogin();
    try {
      const remote = await fetchRemoteState();
      if (remote.state) {
        state = normalizeState(remote.state);
        SYNC.rev = remote.rev || '';
        writeLocalState(state);
      } else {
        state = readLocalState() || defaultState();
        SYNC.rev = '';
      }
      SYNC.online = true;
      SYNC.savedJson = JSON.stringify(state);
      if (!remote.state) await pushState();
    } catch (err) {
      console.warn('读取云端失败：', err.message);
      state = readLocalState() || defaultState();
      SYNC.online = false;
      toast('读取云端失败：' + err.message);
    }
    startSyncLoop();
    purgeExpiredTrash(true);
    renderAll();
    return;
  }

  if (sharedMode) {
    try {
      const remote = await fetchRemoteState();
      state = normalizeState(remote.state);
      SYNC.rev = remote.rev || '';
      SYNC.online = true;
      const cached = readLocalState();
      if (!state.boxes.length && cached && cached.boxes.length) {
        state = cached;
        await pushState();
      } else {
        writeLocalState(state);
      }
      SYNC.savedJson = JSON.stringify(state);
    } catch (err) {
      console.warn('共享服务不可用，改用本机存储：', err.message);
      state = readLocalState() || defaultState();
      SYNC.online = false;
      toast('共享服务连不上，先按本机数据使用');
    }
    startSyncLoop();
    purgeExpiredTrash(true);
    renderAll();
    return;
  }

  try {
    if (nativeApi) {
      const res = await nativeApi.load();
      state = normalizeState(res && res.state);
      if (res && res.recovered) toast('数据文件损坏，已保留 .broken 副本并新建空白数据');
    } else {
      const raw = localStorage.getItem(STORAGE_KEY);
      state = normalizeState(raw ? JSON.parse(raw) : null);
    }
  } catch (err) {
    console.error(err);
    state = defaultState();
    toast('数据读取失败，已使用空白数据');
  }
  purgeExpiredTrash(true);
  renderAll();
}

function saveSoon() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 180);
}

async function saveNow() {
  saveTimer = null;
  state.updatedAt = new Date().toISOString();
  if (sharedMode) {
    writeLocalState(state);
    await pushState();
    return;
  }
  try {
    if (nativeApi) await nativeApi.save(state);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error(err);
    toast('保存失败：' + (err && err.message ? err.message : '未知错误'));
  }
}

function touch(source) {
  state.updatedAt = new Date().toISOString();
  if (source) console.debug('state changed:', source);
  saveSoon();
}

/* ---------------- 数据操作 ---------------- */

function newId() {
  return 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function addBox(data) {
  const box = {
    id: newId(),
    cabinet: Number(data.cabinet),
    floor: Number(data.floor),
    slot: Number(data.slot),
    name: String(data.name || '').trim(),
    category: data.category || '未分类',
    keywords: String(data.keywords || '').trim(),
    note: String(data.note || '').trim(),
    weight: data.weight === '' || data.weight == null ? null : Number(data.weight),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.boxes.push(box);
  pushHistory({ type: 'create', box, to: box, text: '新增箱子' });
  touch('addBox');
  return box;
}

function updateBox(id, patch) {
  const box = state.boxes.find(b => b.id === id);
  if (!box) return null;
  Object.assign(box, patch, { updatedAt: new Date().toISOString() });
  touch('updateBox');
  return box;
}

function pushHistory(entry) {
  state.history.unshift(Object.assign({
    id: 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    at: new Date().toISOString()
  }, entry));
  if (state.history.length > 500) state.history.length = 500;
}

function moveTo(box, cab, floor, slot) {
  const from = { cabinet: box.cabinet, floor: box.floor, slot: box.slot };
  box.cabinet = cab; box.floor = floor; box.slot = slot;
  box.updatedAt = new Date().toISOString();
  pushHistory({ type: 'move', boxId: box.id, name: box.name, from, to: { cabinet: cab, floor, slot }, text: '移动位置' });
  touch('move');
}

function swapBoxes(a, b) {
  const pa = { cabinet: a.cabinet, floor: a.floor, slot: a.slot };
  const pb = { cabinet: b.cabinet, floor: b.floor, slot: b.slot };
  a.cabinet = pb.cabinet; a.floor = pb.floor; a.slot = pb.slot;
  b.cabinet = pa.cabinet; b.floor = pa.floor; b.slot = pa.slot;
  const now = new Date().toISOString();
  a.updatedAt = now; b.updatedAt = now;
  pushHistory({ type: 'swap', boxId: a.id, name: a.name, from: pa, to: pb, text: '与「' + b.name + '」互换位置' });
  pushHistory({ type: 'swap', boxId: b.id, name: b.name, from: pb, to: pa, text: '与「' + a.name + '」互换位置' });
  touch('swap');
}

function deleteBox(id) {
  const idx = state.boxes.findIndex(b => b.id === id);
  if (idx < 0) return;
  const box = state.boxes.splice(idx, 1)[0];
  state.trash.unshift({ box, deletedAt: new Date().toISOString() });
  pushHistory({ type: 'delete', boxId: box.id, name: box.name, from: { cabinet: box.cabinet, floor: box.floor, slot: box.slot }, text: '移入回收站' });
  touch('delete');
}

function restoreBox(trashIndex, cab, floor, slot) {
  const item = state.trash[trashIndex];
  if (!item) return;
  const box = item.box;
  box.cabinet = cab; box.floor = floor; box.slot = slot;
  box.updatedAt = new Date().toISOString();
  state.boxes.push(box);
  state.trash.splice(trashIndex, 1);
  pushHistory({ type: 'restore', boxId: box.id, name: box.name, to: { cabinet: cab, floor, slot }, text: '从回收站恢复' });
  touch('restore');
}

function purgeOne(index) {
  state.trash.splice(index, 1);
  touch('purge');
}

function purgeExpiredTrash(silent) {
  const cutoff = Date.now() - TRASH_DAYS * 86400 * 1000;
  const before = state.trash.length;
  state.trash = state.trash.filter(t => new Date(t.deletedAt).getTime() > cutoff);
  const removed = before - state.trash.length;
  if (removed > 0) {
    touch('purgeExpired');
    if (!silent) toast('已自动清理 ' + removed + ' 个超过 30 天的箱子');
  }
  return removed;
}

function daysLeft(deletedAt) {
  const end = new Date(deletedAt).getTime() + TRASH_DAYS * 86400 * 1000;
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}

function emptySlots(cabinetFilter) {
  const out = [];
  for (const c of CABINETS) {
    if (cabinetFilter && c.id !== cabinetFilter) continue;
    for (let f = 1; f <= c.floors; f++) {
      for (let s = 1; s <= c.perFloor; s++) {
        if (!boxAt(c.id, f, s)) out.push({ cabinet: c.id, floor: f, slot: s });
      }
    }
  }
  return out;
}

function usedCount(cabinetId) {
  return state.boxes.filter(b => b.cabinet === cabinetId).length;
}

function totalCapacity() {
  return CABINETS.filter(c => c.kind === 'fixed').reduce((n, c) => n + c.floors * c.perFloor, 0);
}

/* ---------------- 事件绑定辅助 ---------------- */

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') node.className = attrs[k];
    else if (k === 'text') node.textContent = attrs[k];
    else if (k === 'html') node.innerHTML = attrs[k];
    else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
  }
  if (children) for (const ch of children) {
    if (ch == null) continue;
    node.appendChild(typeof ch === 'string' ? document.createTextNode(ch) : ch);
  }
  return node;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function highlight(text, q) {
  const safe = escapeHtml(text);
  if (!q) return safe;
  const needle = q.trim();
  if (!needle) return safe;
  try {
    const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return safe.replace(re, m => '<mark>' + m + '</mark>');
  } catch (e) {
    return safe;
  }
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

/* ---------------- Code 128 B ---------------- */

const CODE128_WIDTHS = (
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 ' +
  '221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
  '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 ' +
  '212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
  '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 ' +
  '231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
  '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 ' +
  '112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 ' +
  '214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
  '114131 311141 411131 211412 211214 211232 2331112'
).trim().split(/\s+/);

if (CODE128_WIDTHS.length !== 107) {
  console.warn('Code128 表长度异常：', CODE128_WIDTHS.length);
}

function code128Values(text) {
  const data = [];
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) throw new Error('条码只支持 ASCII 字符：' + ch);
    data.push(code - 32);
  }
  const values = [104].concat(data);
  let sum = 104;
  data.forEach((v, i) => { sum += (i + 1) * v; });
  values.push(sum % 103);
  values.push(106);
  return values;
}

function code128Modules(text) {
  const values = code128Values(text);
  const modules = [];
  values.forEach((v, idx) => {
    const pat = CODE128_WIDTHS[v];
    for (let i = 0; i < pat.length; i++) {
      const w = Number(pat[i]);
      const isBar = i % 2 === 0;
      for (let k = 0; k < w; k++) modules.push(isBar ? 1 : 0);
    }
  });
  return modules;
}

function drawBarcode(ctx, text, x, y, width, height) {
  const modules = code128Modules(text);
  const quiet = 10;
  const total = modules.length + quiet * 2;
  const mw = Math.max(1, Math.floor(width / total));
  const drawWidth = mw * total;
  let cx = x + Math.floor((width - drawWidth) / 2) + quiet * mw;

  ctx.save();
  ctx.fillStyle = '#111';
  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) ctx.fillRect(cx, y, mw, height);
    cx += mw;
  }
  ctx.restore();
  return { left: x + Math.floor((width - drawWidth) / 2) + quiet * mw, right: cx - quiet * mw, moduleWidth: mw };
}

/* ---------------- 标签绘制 ---------------- */

function fitText(ctx, text, maxWidth) {
  let s = String(text || '');
  if (ctx.measureText(s).width <= maxWidth) return s;
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1);
  return s + '…';
}

function drawLabel(box) {
  const cv = document.createElement('canvas');
  cv.width = LABEL_W;
  cv.height = LABEL_H;
  const ctx = cv.getContext('2d');
  const FONT = '"Microsoft YaHei", "PingFang SC", sans-serif';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);

  ctx.strokeStyle = '#d8c7b2';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, LABEL_W - 16, LABEL_H - 16);
  ctx.strokeStyle = '#f0e7da';
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, LABEL_W - 28, LABEL_H - 28);

  ctx.fillStyle = '#1f1b16';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 38px ' + FONT;
  ctx.fillText(posCn(box.cabinet, box.floor, box.slot), 30, 66);

  ctx.fillStyle = '#6b5a48';
  ctx.font = '600 20px Consolas, "Courier New", monospace';
  ctx.fillText(posCode(box.cabinet, box.floor, box.slot), 30, 94);

  ctx.strokeStyle = '#e4d6c2';
  ctx.beginPath();
  ctx.moveTo(30, 108);
  ctx.lineTo(LABEL_W - 30, 108);
  ctx.stroke();

  ctx.fillStyle = '#1f1b16';
  ctx.font = '700 30px ' + FONT;
  ctx.fillText(fitText(ctx, box.name, LABEL_W - 60), 30, 148);

  const cat = box.category || '未分类';
  ctx.font = '600 18px ' + FONT;
  const catW = ctx.measureText(cat).width + 22;
  ctx.fillStyle = '#f3e7d6';
  roundRect(ctx, 30, 160, catW, 28, 14);
  ctx.fill();
  ctx.fillStyle = '#7a5a3c';
  ctx.fillText(cat, 41, 180);

  if (box.weight != null && !isNaN(box.weight)) {
    ctx.fillStyle = '#6b5a48';
    ctx.font = '500 17px ' + FONT;
    ctx.fillText(box.weight + ' kg', 30 + catW + 12, 180);
  }

  drawBarcode(ctx, posCode(box.cabinet, box.floor, box.slot), 24, 202, LABEL_W - 48, 96);

  ctx.fillStyle = '#3c3228';
  ctx.font = '600 17px Consolas, "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(posCode(box.cabinet, box.floor, box.slot), LABEL_W / 2, 328);
  ctx.textAlign = 'left';

  return cv;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------- PNG / ZIP / 文件 ---------------- */

function canvasToBytes(cv) {
  return new Promise((resolve, reject) => {
    cv.toBlob(blob => {
      if (!blob) return reject(new Error('标签生成失败'));
      blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf))).catch(reject);
    }, 'image/png');
  });
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function zipStore(files) {
  const enc = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xFFFF;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);

    centralParts.push(central);
    offset += local.length + data.length;
  }

  const centralSize = centralParts.reduce((n, p) => n + p.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const all = localParts.concat(centralParts, [end]);
  const total = all.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of all) { out.set(p, pos); pos += p.length; }
  return out;
}

async function saveBytes(filename, bytes) {
  if (nativeApi) {
    const res = await nativeApi.saveFile(filename, bytes);
    if (res && res.canceled) return false;
    if (res && res.ok === false) throw new Error(res.error || '保存失败');
    toast('已保存：' + (res && res.path ? res.path : filename));
    return true;
  }
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('已下载：' + filename);
  return true;
}

function saveText(filename, text) {
  return saveBytes(filename, new TextEncoder().encode(text));
}

function todayStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

async function exportLabelPng(box) {
  const cv = drawLabel(box);
  const bytes = await canvasToBytes(cv);
  await saveBytes(posCode(box.cabinet, box.floor, box.slot) + '.png', bytes);
}

async function exportLabelZip(boxes, filename) {
  const files = [];
  for (const b of boxes) {
    const cv = drawLabel(b);
    const bytes = await canvasToBytes(cv);
    files.push({ name: posCode(b.cabinet, b.floor, b.slot) + '.png', data: bytes });
  }
  const zip = zipStore(files);
  await saveBytes(filename || ('暖仓标签_' + todayStamp() + '.zip'), zip);
}
