/* ===================================================================
   暖仓 v1.0 · 界面层
   =================================================================== */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ---------------- 提示 ---------------- */

let toastTimer = null;
function toast(msg) {
  const node = $('#toast');
  node.textContent = msg;
  node.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
}

/* ---------------- 共享状态 ---------------- */

function setSyncStatus(kind) {
  if (!sharedMode) return;
  const pill = $('#syncPill');
  if (!pill) return;
  const labels = {
    ok: ['on', cloudMode ? '云端已同步' : '家人共享'],
    warn: ['warn', '同步重试'],
    offline: ['off', '本机暂存']
  };
  const item = labels[kind] || labels.offline;
  pill.hidden = false;
  pill.className = 'sync-pill ' + item[0];
  pill.textContent = item[1];
  pill.title = kind === 'ok'
    ? (cloudMode
      ? '数据保存在 Supabase，换设备用同一个 GitHub 账号登录即可看到'
      : '数据存在这台电脑上，同一个 Wi-Fi 下的家人看到的是同一份')
    : '连不上同步服务，改动先存本机，连接恢复后自动补传';
}

/* ---------------- 视图切换 ---------------- */

function switchView(view, cabinetId) {
  currentView = view;
  if (cabinetId) currentCabinet = Number(cabinetId);
  $('#viewRoom').hidden = view !== 'room';
  $('#viewCabinet').hidden = view !== 'cabinet';
  $('#viewTrash').hidden = view !== 'trash';
  if (view === 'room') renderRoom();
  if (view === 'cabinet') renderCabinet(currentCabinet);
  if (view === 'trash') renderTrash();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- 统计 ---------------- */

function renderStats() {
  const used = state.boxes.length;
  const cap = totalCapacity();
  const free = Math.max(0, cap - used);
  const trash = state.trash.length;
  $('#roomStats').innerHTML = [
    statBox(used, '已建档箱子'),
    statBox(cap, '固定箱位'),
    statBox(free, '空闲箱位'),
    statBox(trash, '回收站')
  ].join('');
}

function statBox(value, label) {
  return '<div class="stat"><b>' + value + '</b><span>' + label + '</span></div>';
}

/* ---------------- 平面图 ---------------- */

const PLAN_POS = {
  1: { x: 150, y: 40, w: 300, h: 100 },
  2: { x: 450, y: 40, w: 300, h: 100 },
  3: { x: 750, y: 40, w: 100, h: 300, vertical: true },
  4: { x: 250, y: 416, w: 200, h: 100 },
  5: { x: 450, y: 416, w: 200, h: 100 }
};

function renderRoom() {
  renderStats();
  const svg = $('#planSvg');
  const parts = [];

  parts.push('<defs>');
  parts.push('<linearGradient id="woodFill" x1="0" y1="0" x2="0" y2="1">');
  parts.push('<stop offset="0%" stop-color="#d9b58a"/>');
  parts.push('<stop offset="100%" stop-color="#c2986c"/>');
  parts.push('</linearGradient>');
  parts.push('<pattern id="floorDots" width="26" height="26" patternUnits="userSpaceOnUse">');
  parts.push('<circle cx="1" cy="1" r="1" fill="rgba(150,104,63,.18)"/>');
  parts.push('</pattern>');
  parts.push('</defs>');

  parts.push('<rect class="room-floor" x="50" y="40" width="800" height="476" rx="10" fill="url(#floorDots)"/>');
  parts.push('<rect x="50" y="40" width="800" height="476" rx="10" fill="none" stroke="#e2d0b8" stroke-width="2"/>');
  // 左墙下段为入口，门向内开；1、2 号沿上墙，3 号竖靠右墙，4、5 号在下排
  parts.push('<path class="room-wall" d="M50 316 V40 H850 V516 H50"/>');
  parts.push('<path d="M50 316 A200 200 0 0 1 250 516" fill="none" stroke="#d9c3a6" stroke-width="2" stroke-dasharray="6 6"/>');
  parts.push('<text x="72" y="304" font-size="12" fill="#a08a72">门</text>');

  for (const cab of CABINETS) {
    const p = PLAN_POS[cab.id];
    const used = usedCount(cab.id);
    const cap = cab.kind === 'fixed' ? cab.floors * cab.perFloor : null;
    const dash = cab.kind === 'flex' ? ' stroke-dasharray="7 5"' : '';
    const meta = cap == null ? '灵活层板' : used + ' / ' + cap;

    parts.push('<g class="cabinet-node" data-cab="' + cab.id + '" tabindex="0" role="button" aria-label="' + cab.name + '，' + used + ' 个箱子">');
    parts.push('<rect class="cabinet-shape" x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="10"/>');

    if (p.vertical) {
      parts.push('<rect class="cabinet-face" x="' + (p.x + 10) + '" y="' + (p.y + 10) + '" width="' + (p.w - 20) + '" height="' + (p.h - 20) + '" rx="5"' + dash + '/>');
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      parts.push('<g transform="rotate(90 ' + cx + ' ' + cy + ')">');
      parts.push('<text class="cabinet-label" x="' + cx + '" y="' + (cy - 8) + '" text-anchor="middle">' + cab.name + '</text>');
      parts.push('<text class="cabinet-meta" x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle">' + meta + '</text>');
      parts.push('</g>');
    } else {
      parts.push('<rect class="cabinet-face" x="' + (p.x + 10) + '" y="' + (p.y + 30) + '" width="' + (p.w - 20) + '" height="' + (p.h - 42) + '" rx="5"' + dash + '/>');
      parts.push('<line class="cabinet-shelf" x1="' + (p.x + 10) + '" y1="' + (p.y + 30 + (p.h - 42) / 2) + '" x2="' + (p.x + p.w - 10) + '" y2="' + (p.y + 30 + (p.h - 42) / 2) + '"/>');
      parts.push('<text class="cabinet-label" x="' + (p.x + 12) + '" y="' + (p.y + 22) + '">' + cab.name + '</text>');
      parts.push('<text class="cabinet-meta" x="' + (p.x + p.w - 12) + '" y="' + (p.y + 22) + '" text-anchor="end">' + meta + '</text>');
    }

    if (cap != null && used > 0) {
      const ratio = Math.min(1, used / cap);
      const bx = p.x + 10;
      const bw = p.w - 20;
      const by = p.y + p.h - 8;
      parts.push('<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="4" rx="2" fill="rgba(122,82,48,.16)"/>');
      parts.push('<rect x="' + bx + '" y="' + by + '" width="' + (bw * ratio).toFixed(1) + '" height="4" rx="2" fill="#a75d38"/>');
    }
    parts.push('</g>');
  }

  parts.push('<text x="450" y="285" text-anchor="middle" font-size="13" fill="#b09a82">储藏室</text>');
  svg.innerHTML = parts.join('');

  const legend = [];
  state.categories.slice(0, 10).forEach(c => {
    legend.push('<span><i style="background:' + catColor(c) + '"></i>' + escapeHtml(c) + '</span>');
  });
  legend.push('<span><i style="background:#fffdf9;border:1px dashed #cbb28f"></i>空闲箱位</span>');
  legend.push('<span><i style="background:#d9b58a"></i>灵活柜</span>');
  $('#legend').innerHTML = legend.join('');
}

/* ---------------- 柜体视图 ---------------- */

function renderCabinet(cabinetId) {
  const cab = cabinetOf(cabinetId) || CABINETS[0];
  const used = usedCount(cab.id);
  const cap = cab.kind === 'fixed' ? cab.floors * cab.perFloor : null;

  $('#crumbCabinet').textContent = cab.name;
  $('#cabTitle').textContent = cab.name;
  $('#cabSub').textContent = cab.kind === 'fixed'
    ? cab.floors + ' 层 · 每层 ' + cab.perFloor + ' 箱 · 已用 ' + used + ' / ' + cap
    : cab.floors + ' 层灵活层板 · 已用 ' + used + ' 箱 · 点击空位建立箱位';

  const floors = [];
  for (let f = 1; f <= cab.floors; f++) {
    const slots = [];
    for (let s = 1; s <= cab.perFloor; s++) {
      const box = boxAt(cab.id, f, s);
      if (box) {
        slots.push(
          '<button class="slot box-card" data-box="' + box.id + '" style="--cat:' + catColor(box.category) + '">' +
            '<div class="box-name">' + escapeHtml(box.name) + '</div>' +
            '<div class="box-kw">' + escapeHtml(box.keywords || '未填关键词') + '</div>' +
            '<div class="box-pos">' + posCode(cab.id, f, s) + ' · ' + escapeHtml(box.category || '未分类') + '</div>' +
          '</button>'
        );
      } else {
        slots.push(
          '<button class="slot empty" data-add="' + cab.id + '-' + f + '-' + s + '">' +
            '<div style="text-align:center">' +
              '<div class="plus">+</div>' +
              '<div class="pos">' + posCode(cab.id, f, s) + '</div>' +
            '</div>' +
          '</button>'
        );
      }
    }
    floors.push(
      '<div class="floor">' +
        '<div class="floor-label"><b>层' + f + '</b><span>' + (f === 1 ? '最上层' : f === cab.floors ? '最下层' : '') + '</span></div>' +
        '<div class="slots">' + slots.join('') + '</div>' +
      '</div>'
    );
  }
  $('#floors').innerHTML = floors.join('');
}

/* ---------------- 回收站 ---------------- */

function renderTrash() {
  const list = $('#trashList');
  if (!state.trash.length) {
    list.innerHTML = '<div class="empty-hint"><h3>回收站是空的</h3><p>删除的箱子会在这里保留 30 天。</p></div>';
    return;
  }
  list.innerHTML = state.trash.map((t, i) => {
    const b = t.box;
    return '<div class="trash-item">' +
      '<div class="t-name">' + escapeHtml(b.name) + ' <span class="tag" style="--cat:' + catColor(b.category) + '">' + escapeHtml(b.category || '未分类') + '</span></div>' +
      '<div class="t-sub">' + posCn(b.cabinet, b.floor, b.slot) + ' · ' + posCode(b.cabinet, b.floor, b.slot) + ' · 删除于 ' + fmtTime(t.deletedAt) + ' · 剩余 ' + daysLeft(t.deletedAt) + ' 天</div>' +
      '<div class="t-actions">' +
        '<button class="btn btn-sm" data-restore="' + i + '">恢复</button>' +
        '<button class="btn btn-sm btn-danger" data-purge="' + i + '">彻底删除</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function updateTrashBadge() {
  const n = state.trash.length;
  const badge = $('#trashCount');
  badge.textContent = n;
  badge.hidden = n === 0;
}

/* ---------------- 详情抽屉 ---------------- */

function renderDrawer(boxId) {
  const box = state.boxes.find(b => b.id === boxId);
  const drawer = $('#drawer');
  const backdrop = $('#drawerBackdrop');

  if (!box) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    openBoxId = null;
    return;
  }

  openBoxId = box.id;
  const history = state.history.filter(h => h.boxId === box.id).slice(0, 6);

  drawer.innerHTML =
    '<div class="drawer-head">' +
      '<div>' +
        '<h3>' + escapeHtml(box.name) + '</h3>' +
        '<div class="pos">' + posCn(box.cabinet, box.floor, box.slot) + ' · ' + posCode(box.cabinet, box.floor, box.slot) + '</div>' +
      '</div>' +
      '<button class="icon-btn" id="drawerClose" aria-label="关闭">×</button>' +
    '</div>' +
    '<div class="drawer-body">' +
      '<div class="field"><label>分类</label><div class="value"><span class="tag" style="--cat:' + catColor(box.category) + '">' + escapeHtml(box.category || '未分类') + '</span></div></div>' +
      '<div class="field"><label>内容关键词</label><div class="value">' + escapeHtml(box.keywords || '—') + '</div></div>' +
      '<div class="field"><label>备注</label><div class="value">' + escapeHtml(box.note || '—') + '</div></div>' +
      '<div class="field"><label>重量</label><div class="value">' + (box.weight != null ? box.weight + ' kg' : '—') + '</div></div>' +
      '<div class="field"><label>创建时间</label><div class="value mono">' + fmtTime(box.createdAt) + '</div></div>' +
      '<div class="field"><label>最近更新</label><div class="value mono">' + fmtTime(box.updatedAt) + '</div></div>' +
      (history.length ? '<div class="field"><label>变动记录</label><div class="timeline">' + history.map(h =>
        '<div class="timeline-item"><b>' + escapeHtml(h.text || h.type) + '</b>' +
        (h.from && h.to ? ' · ' + posCode(h.from.cabinet, h.from.floor, h.from.slot) + ' → ' + posCode(h.to.cabinet, h.to.floor, h.to.slot) : '') +
        '<time>' + fmtTime(h.at) + '</time></div>'
      ).join('') + '</div></div>' : '') +
    '</div>' +
    '<div class="drawer-foot">' +
      '<button class="btn btn-sm" id="btnEdit">编辑资料</button>' +
      '<button class="btn btn-sm" id="btnMove">移动</button>' +
      '<button class="btn btn-sm" id="btnSwap">互换</button>' +
      '<button class="btn btn-sm" id="btnLabelOne">导出标签</button>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-sm btn-danger" id="btnDelete">删除</button>' +
    '</div>';

  backdrop.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  });
  drawer.setAttribute('aria-hidden', 'false');

  $('#drawerClose').onclick = closeDrawer;
  $('#btnEdit').onclick = () => openBoxForm('edit', box);
  $('#btnMove').onclick = () => openMoveModal(box);
  $('#btnSwap').onclick = () => openSwapModal(box);
  $('#btnLabelOne').onclick = () => exportLabelPng(box).catch(err => toast(err.message));
  $('#btnDelete').onclick = async () => {
    const ok = await confirmDialog({
      title: '删除箱子',
      text: '「' + box.name + '」将移入回收站，保留 30 天，可随时恢复。',
      okText: '移入回收站',
      danger: true
    });
    if (!ok) return;
    deleteBox(box.id);
    closeDrawer();
    renderAll();
    toast('已移入回收站');
  };
}

function closeDrawer() {
  const drawer = $('#drawer');
  const backdrop = $('#drawerBackdrop');
  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  setTimeout(() => { backdrop.hidden = true; }, 200);
  openBoxId = null;
}

/* ---------------- 模态框 ---------------- */

let activeModal = null;

function closeModal() {
  if (!activeModal) return;
  activeModal.remove();
  activeModal = null;
}

function openModal(opts) {
  closeModal();
  const backdrop = el('div', { class: 'backdrop' });
  const modal = el('div', { class: 'modal' + (opts.wide ? ' wide' : '') });
  modal.innerHTML =
    '<div class="modal-head"><h3>' + escapeHtml(opts.title) + '</h3>' +
    '<button class="icon-btn" data-close aria-label="关闭">×</button></div>' +
    '<div class="modal-body">' + (opts.bodyHtml || '') + '</div>' +
    (opts.footerHtml ? '<div class="modal-foot">' + opts.footerHtml + '</div>' : '');

  backdrop.appendChild(modal);
  backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) closeModal(); });
  modal.querySelector('[data-close]').onclick = closeModal;

  $('#modalRoot').appendChild(backdrop);
  activeModal = backdrop;
  if (opts.onReady) opts.onReady(modal);
  const firstInput = modal.querySelector('input, select, textarea');
  if (firstInput && opts.focus !== false) setTimeout(() => firstInput.focus(), 30);
  return modal;
}

function confirmDialog(opts) {
  return new Promise(resolve => {
    openModal({
      title: opts.title || '确认',
      bodyHtml: '<p style="margin:4px 0 6px">' + escapeHtml(opts.text || '') + '</p>',
      footerHtml:
        '<button class="btn" data-cancel>取消</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + escapeHtml(opts.okText || '确定') + '</button>',
      onReady(modal) {
        modal.querySelector('[data-cancel]').onclick = () => { closeModal(); resolve(false); };
        modal.querySelector('[data-ok]').onclick = () => { closeModal(); resolve(true); };
      }
    });
  });
}

/* ---------------- 新增 / 编辑 ---------------- */

function positionOptions(cabinetId, floor, slot) {
  const cab = cabinetOf(cabinetId);
  const floors = [];
  for (let f = 1; f <= cab.floors; f++) {
    floors.push('<option value="' + f + '"' + (f === floor ? ' selected' : '') + '>层' + f + (f === 1 ? '（最上层）' : '') + '</option>');
  }
  const slots = [];
  for (let s = 1; s <= cab.perFloor; s++) {
    const taken = boxAt(cab.id, f2(cab, floor), s);
    slots.push('<option value="' + s + '"' + (s === slot ? ' selected' : '') + (taken ? ' disabled' : '') + '>箱' + s + (taken ? '（已占用）' : '') + '</option>');
  }
  return { floors: floors.join(''), slots: slots.join('') };
}

function f2(cab, floor) { return Number(floor) || 1; }

function openBoxForm(mode, box) {
  const isEdit = mode === 'edit';
  const init = box || { cabinet: currentCabinet, floor: 1, slot: 1 };
  const firstFree = (() => {
    if (isEdit) return null;
    for (let s = 1; s <= cabinetOf(init.cabinet).perFloor; s++) {
      if (!boxAt(init.cabinet, init.floor, s)) return s;
    }
    return 1;
  })();
  const initSlot = isEdit ? init.slot : (init.slot && !boxAt(init.cabinet, init.floor, init.slot) ? init.slot : firstFree);

  const cabOptions = CABINETS.map(c =>
    '<option value="' + c.id + '"' + (c.id === init.cabinet ? ' selected' : '') + '>' + c.name + '</option>'
  ).join('');

  const currentCat = box ? box.category : '未分类';
  const catOptions = '<option value="未分类"' + (currentCat === '未分类' ? ' selected' : '') + '>未分类</option>' +
    state.categories.map(c =>
      '<option value="' + escapeHtml(c) + '"' + (currentCat === c ? ' selected' : '') + '>' + escapeHtml(c) + '</option>'
    ).join('');

  const pos = positionOptions(init.cabinet, init.floor, initSlot);

  openModal({
    title: isEdit ? '编辑箱子资料' : '新增箱子',
    bodyHtml:
      '<div class="form-grid">' +
        '<div class="full"><label>位置</label><div class="pos-picker">' +
          '<select id="fCabinet">' + cabOptions + '</select>' +
          '<select id="fFloor">' + pos.floors + '</select>' +
          '<select id="fSlot">' + pos.slots + '</select>' +
        '</div><p class="hint" id="posHint"></p></div>' +
        '<div class="full"><label>箱名 <span class="req">*</span></label>' +
          '<input class="input" id="fName" maxlength="40" placeholder="例如：电动工具" value="' + escapeHtml(box ? box.name : '') + '"></div>' +
        '<div><label>分类</label><select id="fCategory">' + catOptions + '</select></div>' +
        '<div><label>重量（可选，kg）</label><input class="input" id="fWeight" type="number" min="0" max="200" step="0.1" value="' + (box && box.weight != null ? box.weight : '') + '"></div>' +
        '<div class="full"><label>内容关键词 <span class="req">*</span></label>' +
          '<input class="input" id="fKeywords" maxlength="120" placeholder="例如：电钻、螺丝刀、钻头" value="' + escapeHtml(box ? box.keywords : '') + '"></div>' +
        '<div class="full"><label>备注（可选）</label>' +
          '<textarea id="fNote" maxlength="400" placeholder="例如：靠里侧有一盒备用钻头">' + escapeHtml(box ? box.note : '') + '</textarea></div>' +
      '</div>',
    footerHtml:
      '<button class="btn" data-cancel>取消</button>' +
      '<button class="btn btn-primary" id="fSave">' + (isEdit ? '保存' : '创建箱子') + '</button>',
    onReady(modal) {
      const cabSel = modal.querySelector('#fCabinet');
      const floorSel = modal.querySelector('#fFloor');
      const slotSel = modal.querySelector('#fSlot');
      const hint = modal.querySelector('#posHint');

      const refreshPos = () => {
        const cab = cabinetOf(cabSel.value);
        const floor = Number(floorSel.value) || 1;
        const keepSlot = Number(slotSel.value) || 1;
        const p = positionOptions(cab.id, floor, keepSlot);
        floorSel.innerHTML = p.floors;
        slotSel.innerHTML = p.slots;
        if (!slotSel.value) {
          const firstFreeSlot = Array.from(slotSel.options).find(o => !o.disabled);
          if (firstFreeSlot) slotSel.value = firstFreeSlot.value;
        }
        const taken = boxAt(Number(cabSel.value), Number(floorSel.value), Number(slotSel.value));
        hint.textContent = posCn(Number(cabSel.value), Number(floorSel.value), Number(slotSel.value)) +
          ' · ' + posCode(Number(cabSel.value), Number(floorSel.value), Number(slotSel.value)) +
          (taken ? ' · 该位置已占用' : ' · 空闲') +
          (cab.kind === 'flex' ? ' · 灵活柜，保存后创建该箱位' : '');
      };

      cabSel.onchange = () => { floorSel.value = '1'; slotSel.value = '1'; refreshPos(); };
      floorSel.onchange = refreshPos;
      slotSel.onchange = refreshPos;
      refreshPos();

      modal.querySelector('[data-cancel]').onclick = closeModal;
      modal.querySelector('#fSave').onclick = () => {
        const cab = Number(cabSel.value);
        const floor = Number(floorSel.value);
        const slot = Number(slotSel.value);
        const name = modal.querySelector('#fName').value.trim();
        const keywords = modal.querySelector('#fKeywords').value.trim();
        const category = modal.querySelector('#fCategory').value;
        const note = modal.querySelector('#fNote').value.trim();
        const weightRaw = modal.querySelector('#fWeight').value;

        if (!name) return toast('箱名必填');
        if (!keywords) return toast('内容关键词必填');

        const existing = boxAt(cab, floor, slot);
        if (existing && !(isEdit && existing.id === box.id)) return toast('该位置已被「' + existing.name + '」占用');

        const data = { cabinet: cab, floor, slot, name, keywords, category, note, weight: weightRaw === '' ? null : Number(weightRaw) };

        if (isEdit) {
          updateBox(box.id, { name, keywords, category, note, weight: data.weight });
          closeModal();
          renderAll();
          renderDrawer(box.id);
          toast('已保存');
        } else {
          const created = addBox(data);
          closeModal();
          renderAll();
          renderDrawer(created.id);
          toast('已创建：' + posCn(cab, floor, slot));
        }
      };
    }
  });
}

/* ---------------- 移动 / 互换 ---------------- */

function slotButtonHtml(p, extra) {
  return '<button class="btn btn-sm" data-pick="' + p.cabinet + '-' + p.floor + '-' + p.slot + '"' + (extra || '') + '>' +
    posCn(p.cabinet, p.floor, p.slot) + '</button>';
}

function openMoveModal(box) {
  const groups = CABINETS.map(cab => {
    const slots = [];
    for (let f = 1; f <= cab.floors; f++) {
      for (let s = 1; s <= cab.perFloor; s++) {
        if (!boxAt(cab.id, f, s)) slots.push({ cabinet: cab.id, floor: f, slot: s });
      }
    }
    if (!slots.length) return '';
    return '<div class="section"><h4>' + cab.name + ' <span class="badge-soft">' + slots.length + ' 个空位</span></h4>' +
      '<div class="chips">' + slots.map(p => slotButtonHtml(p)).join('') + '</div></div>';
  }).join('');

  openModal({
    title: '移动「' + box.name + '」',
    wide: true,
    bodyHtml: groups || '<p class="hint">没有空位可移动。</p>',
    footerHtml: '<button class="btn" data-cancel>取消</button>',
    onReady(modal) {
      modal.querySelector('[data-cancel]').onclick = closeModal;
      modal.querySelectorAll('[data-pick]').forEach(btn => {
        btn.onclick = () => {
          const [c, f, s] = btn.dataset.pick.split('-').map(Number);
          if (boxAt(c, f, s)) return toast('该位置已被占用');
          moveTo(box, c, f, s);
          closeModal();
          renderAll();
          renderDrawer(box.id);
          toast('已移动到 ' + posCn(c, f, s));
        };
      });
    }
  });
}

function openSwapModal(box) {
  const others = state.boxes
    .filter(b => b.id !== box.id)
    .sort((a, b) => a.cabinet - b.cabinet || a.floor - b.floor || a.slot - b.slot);

  const groups = CABINETS.map(cab => {
    const list = others.filter(b => b.cabinet === cab.id);
    if (!list.length) return '';
    return '<div class="section"><h4>' + cab.name + '</h4><div class="chips">' +
      list.map(b => '<button class="btn btn-sm" data-swap="' + b.id + '">' + escapeHtml(b.name) + ' · ' + posCode(b.cabinet, b.floor, b.slot) + '</button>').join('') +
      '</div></div>';
  }).join('');

  openModal({
    title: '与「' + box.name + '」互换位置',
    wide: true,
    bodyHtml: '<p class="hint">选择另一个箱子，两者位置立即交换，并各自生成新标签。</p>' + (groups || '<p class="hint">没有其他箱子可互换。</p>'),
    footerHtml: '<button class="btn" data-cancel>取消</button>',
    onReady(modal) {
      modal.querySelector('[data-cancel]').onclick = closeModal;
      modal.querySelectorAll('[data-swap]').forEach(btn => {
        btn.onclick = async () => {
          const other = state.boxes.find(b => b.id === btn.dataset.swap);
          if (!other) return;
          const ok = await confirmDialog({
            title: '确认互换',
            text: box.name + '（' + posCn(box.cabinet, box.floor, box.slot) + '）与 ' + other.name + '（' + posCn(other.cabinet, other.floor, other.slot) + '）交换位置。',
            okText: '互换'
          });
          if (!ok) return;
          closeModal();
          swapBoxes(box, other);
          renderAll();
          renderDrawer(box.id);
          toast('已互换，旧标签作废');
        };
      });
    }
  });
}

/* ---------------- 选择空位 ---------------- */

function openSlotPicker(title, onPick) {
  const groups = CABINETS.map(cab => {
    const slots = [];
    for (let f = 1; f <= cab.floors; f++) {
      for (let s = 1; s <= cab.perFloor; s++) {
        if (!boxAt(cab.id, f, s)) slots.push({ cabinet: cab.id, floor: f, slot: s });
      }
    }
    if (!slots.length) return '';
    return '<div class="section"><h4>' + cab.name + '</h4><div class="chips">' +
      slots.map(p => slotButtonHtml(p)).join('') + '</div></div>';
  }).join('');

  openModal({
    title,
    wide: true,
    bodyHtml: groups || '<p class="hint">没有空闲位置。</p>',
    footerHtml: '<button class="btn" data-cancel>取消</button>',
    onReady(modal) {
      modal.querySelector('[data-cancel]').onclick = closeModal;
      modal.querySelectorAll('[data-pick]').forEach(btn => {
        btn.onclick = () => {
          const [c, f, s] = btn.dataset.pick.split('-').map(Number);
          closeModal();
          onPick(c, f, s);
        };
      });
    }
  });
}

/* ---------------- 回收站操作 ---------------- */

function handleRestore(index) {
  const item = state.trash[index];
  if (!item) return;
  const b = item.box;
  if (!boxAt(b.cabinet, b.floor, b.slot)) {
    restoreBox(index, b.cabinet, b.floor, b.slot);
    renderAll();
    toast('已恢复到 ' + posCn(b.cabinet, b.floor, b.slot));
    return;
  }
  openSlotPicker('原位置 ' + posCn(b.cabinet, b.floor, b.slot) + ' 已被占用，选择新位置', (c, f, s) => {
    restoreBox(index, c, f, s);
    renderAll();
    toast('已恢复到 ' + posCn(c, f, s));
  });
}

async function handlePurge(index) {
  const item = state.trash[index];
  if (!item) return;
  const ok = await confirmDialog({
    title: '彻底删除',
    text: '「' + item.box.name + '」将被永久删除，无法恢复。',
    okText: '永久删除',
    danger: true
  });
  if (!ok) return;
  purgeOne(index);
  renderAll();
  toast('已永久删除');
}

/* ---------------- 标签中心 ---------------- */

function openLabelsModal(preselectId) {
  const boxes = state.boxes.slice().sort((a, b) => a.cabinet - b.cabinet || a.floor - b.floor || a.slot - b.slot);
  if (!boxes.length) {
    openModal({
      title: '标签中心',
      bodyHtml: '<div class="empty-hint"><h3>还没有箱子</h3><p>先添加箱子，再导出 50×30 mm 标签。</p></div>',
      footerHtml: '<button class="btn" data-cancel>关闭</button>',
      onReady(modal) { modal.querySelector('[data-cancel]').onclick = closeModal; }
    });
    return;
  }

  const selected = new Set(preselectId ? [preselectId] : []);

  const rows = boxes.map(b =>
    '<label class="label-row' + (selected.has(b.id) ? ' on' : '') + '" data-row="' + b.id + '">' +
      '<input type="checkbox" data-check="' + b.id + '"' + (selected.has(b.id) ? ' checked' : '') + '>' +
      '<span><span class="l-name">' + escapeHtml(b.name) + '</span><br>' +
      '<span class="l-pos">' + posCode(b.cabinet, b.floor, b.slot) + '</span></span>' +
    '</label>'
  ).join('');

  openModal({
    title: '标签中心',
    wide: true,
    bodyHtml:
      '<div class="row" style="margin-bottom:10px">' +
        '<button class="btn btn-sm" id="lblAll">全选</button>' +
        '<button class="btn btn-sm" id="lblNone">清空</button>' +
        '<span class="spacer"></span>' +
        '<span class="hint" id="lblCount"></span>' +
      '</div>' +
      '<div class="label-list" id="lblList">' + rows + '</div>' +
      '<div class="divider"></div>' +
      '<div class="label-preview" id="lblPreview"></div>' +
      '<p class="hint">规格：50×30 mm · 300 dpi · 白底 · Code 128 一维条码，条码内容为 ASCII 位置码。打印标签页按 A4 每页 24 张排版。</p>',
    footerHtml:
      '<button class="btn" data-cancel>关闭</button>' +
      '<button class="btn" id="lblPrint">打印标签页</button>' +
      '<button class="btn" id="lblZipSel">导出所选 ZIP</button>' +
      '<button class="btn btn-primary" id="lblZipAll">全部导出 ZIP</button>',
    onReady(modal) {
      const list = modal.querySelector('#lblList');
      const preview = modal.querySelector('#lblPreview');
      const count = modal.querySelector('#lblCount');

      const refresh = () => {
        list.querySelectorAll('[data-row]').forEach(row => {
          row.classList.toggle('on', selected.has(row.dataset.row));
          const cb = row.querySelector('input');
          if (cb) cb.checked = selected.has(row.dataset.row);
        });
        count.textContent = '已选 ' + selected.size + ' / ' + boxes.length + ' 箱';
        const first = boxes.find(b => selected.has(b.id));
        preview.innerHTML = '';
        if (first) {
          const cv = drawLabel(first);
          preview.appendChild(cv);
        } else {
          preview.innerHTML = '<span class="hint">勾选箱子后在此预览标签</span>';
        }
      };

      list.addEventListener('click', e => {
        const row = e.target.closest('[data-row]');
        if (!row) return;
        e.preventDefault();
        const id = row.dataset.row;
        if (selected.has(id)) selected.delete(id); else selected.add(id);
        refresh();
      });

      modal.querySelector('#lblAll').onclick = () => { boxes.forEach(b => selected.add(b.id)); refresh(); };
      modal.querySelector('#lblNone').onclick = () => { selected.clear(); refresh(); };
      modal.querySelector('[data-cancel]').onclick = closeModal;

      modal.querySelector('#lblPrint').onclick = () => {
        const chosen = boxes.filter(b => selected.has(b.id));
        if (!chosen.length) return toast('请先勾选箱子');
        printLabelSheet(chosen);
      };

      modal.querySelector('#lblZipSel').onclick = async () => {
        const chosen = boxes.filter(b => selected.has(b.id));
        if (!chosen.length) return toast('请先勾选箱子');
        try {
          await exportLabelZip(chosen, '暖仓标签_选中_' + todayStamp() + '.zip');
        } catch (err) { toast(err.message); }
      };

      modal.querySelector('#lblZipAll').onclick = async () => {
        try {
          await exportLabelZip(boxes, '暖仓标签_全部_' + todayStamp() + '.zip');
        } catch (err) { toast(err.message); }
      };

      refresh();
    }
  });
}

/* ---------------- 标签打印页 ---------------- */

const PRINT_SHEET_CSS = [
  '@page { size: A4 portrait; margin: 8mm; }',
  '* { box-sizing: border-box; }',
  'body { margin: 0; background: #f2f2f2; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #333; }',
  '.toolbar { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; padding: 10px 16px; background: #fff; border-bottom: 1px solid #ddd; }',
  '.toolbar button { padding: 7px 16px; font-size: 14px; border: 1px solid #bbb; border-radius: 6px; background: #fff; cursor: pointer; }',
  '.toolbar button:hover { background: #f6f3ee; }',
  '.toolbar span { font-size: 12px; color: #777; }',
  '.sheet { width: 194mm; margin: 8mm auto; background: #fff; display: grid; grid-template-columns: repeat(3, 50mm); grid-auto-rows: 30mm; gap: 4mm; justify-content: center; align-content: start; padding: 4mm 0; page-break-after: always; }',
  '.sheet.last { page-break-after: auto; }',
  '.cell { width: 50mm; height: 30mm; overflow: hidden; outline: 0.2mm dashed #d9d9d9; }',
  '.cell.empty { outline: none; }',
  '.cell img { display: block; width: 100%; height: 100%; }',
  '@media print {',
  '  body { background: #fff; }',
  '  .toolbar { display: none; }',
  '  .sheet { margin: 0; padding: 0; }',
  '  .cell { outline: none; }',
  '}'
].join('\n');

function printLabelSheet(boxes) {
  const perPage = 24;
  const pages = [];
  for (let i = 0; i < boxes.length; i += perPage) pages.push(boxes.slice(i, i + perPage));

  const body = pages.map((group, index) => {
    const cells = group.map(box => {
      const cv = drawLabel(box);
      return '<div class="cell"><img src="' + cv.toDataURL('image/png') + '" alt="' +
        escapeHtml(posCode(box.cabinet, box.floor, box.slot)) + '"></div>';
    }).join('');
    const blanks = new Array(Math.max(0, perPage - group.length)).fill('<div class="cell empty"></div>').join('');
    return '<section class="sheet' + (index === pages.length - 1 ? ' last' : '') + '">' + cells + blanks + '</section>';
  }).join('');

  const doc = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
    '<title>暖仓标签 ' + todayStamp() + '</title><style>' + PRINT_SHEET_CSS + '</style></head><body>' +
    '<div class="toolbar"><button onclick="window.print()">打印 / 存为 PDF</button>' +
    '<span>共 ' + boxes.length + ' 张 · 50×30 mm · A4 每页 24 张</span></div>' +
    body + '</body></html>';

  const win = window.open('', '_blank');
  if (!win) return toast('浏览器拦住了新窗口，允许弹窗后再试');
  win.document.open();
  win.document.write(doc);
  win.document.close();
  win.focus();
}

/* ---------------- 设置与备份 ---------------- */

async function openSettingsModal() {
  let dataPath = cloudMode ? 'Supabase 云端 · 表 nuancang_spaces' : (sharedMode ? '读取中…' : '浏览器本地存储（localStorage）');
  let shareUrls = [];
  if (cloudMode) {
    /* 云端模式下数据路径见账号区，不读本机接口 */
  } else if (sharedMode) {
    try {
      const info = await (await fetch('/api/info', { cache: 'no-store' })).json();
      dataPath = info.dataPath || dataPath;
      shareUrls = [location.origin].concat(info.addresses || []);
    } catch (err) {
      dataPath = '共享服务未连接';
    }
  } else if (nativeApi) {
    try { dataPath = await nativeApi.dataPath(); } catch (e) { dataPath = '读取失败'; }
  }

  const cloudUser = cloudSession
    ? (cloudSession.email || cloudSession.name || 'GitHub 账号')
    : '未登录';

  const shareSection = cloudMode
    ? '<div class="divider"></div>' +
      '<div class="section"><h4>云端账号</h4>' +
        '<p class="desc">已登录：' + escapeHtml(String(cloudUser)) + '</p>' +
        '<div class="row" style="margin-top:10px">' +
          '<button class="btn btn-sm" id="btnSignOut">退出登录</button>' +
        '</div>' +
        '<p class="hint">数据存在 Supabase 的 nuancang_spaces 表，一个 GitHub 账号一行。退出后本机不再上传，重新登录继续同步。</p>' +
      '</div>'
    : sharedMode
    ? '<div class="divider"></div>' +
      '<div class="section"><h4>家庭共享</h4>' +
        '<p class="desc">同一个 Wi-Fi 下，手机或平板打开下面的地址，看到的就是这一份数据。</p>' +
        '<div class="share-urls">' +
          (shareUrls.length
            ? shareUrls.map(u => '<div class="mono">' + escapeHtml(u) + '</div>').join('')
            : '<div class="hint">读取不到地址</div>') +
        '</div>' +
        '<div class="row" style="margin-top:10px">' +
          '<button class="btn btn-sm" id="btnCopyUrl">复制地址</button>' +
        '</div>' +
        '<p class="hint">数据存在这台电脑上，关掉共享服务后手机打不开。手机首次打开若失败，检查 Windows 防火墙是否拦住了 Node.js。</p>' +
      '</div>'
    : '';

  openModal({
    title: '设置与备份',
    wide: true,
    bodyHtml:
      '<div class="section"><h4>分类</h4>' +
        '<p class="desc">预设分类可删除，新增分类会出现在新增与筛选里。</p>' +
        '<div class="chips" id="catChips"></div>' +
        '<div class="row" style="margin-top:10px">' +
          '<input class="input" id="catInput" style="max-width:220px" maxlength="12" placeholder="新分类名称">' +
          '<button class="btn btn-sm" id="catAdd">添加分类</button>' +
        '</div>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="section"><h4>数据</h4>' +
        '<p class="desc">数据文件位置：</p>' +
        '<div class="mono" style="font-size:12px; word-break:break-all; background:#fffdf9; border:1px solid var(--line); border-radius:8px; padding:8px 10px">' + escapeHtml(dataPath) + '</div>' +
        '<div class="row" style="margin-top:10px">' +
          (nativeApi ? '<button class="btn btn-sm" id="btnReveal">打开所在文件夹</button>' : '') +
          '<button class="btn btn-sm" id="btnBackup">导出备份 JSON</button>' +
          '<button class="btn btn-sm" id="btnRestore">从备份恢复</button>' +
        '</div>' +
        '<p class="hint">备份包含箱子、分类、移动记录和回收站。恢复会覆盖当前数据。</p>' +
      '</div>' +
      shareSection +
      '<div class="divider"></div>' +
      '<div class="section"><h4>关于</h4>' +
        '<p class="desc">暖仓 ' + APP_VERSION + ' · ' + (cloudMode ? '云端同步 · GitHub 登录' : sharedMode ? '家庭共享 · 同一 Wi-Fi 共用一份数据' : '单机单用户 · 不联网、无账号、无密码') + '。</p>' +
        '<p class="hint">删除的箱子在回收站保留 30 天；到期清理只在打开暖仓时执行。</p>' +
      '</div>',
    footerHtml: '<button class="btn" data-cancel>关闭</button>',
    onReady(modal) {
      const chips = modal.querySelector('#catChips');

      const renderCats = () => {
        chips.innerHTML = state.categories.map((c, i) =>
          '<span class="chip"><i class="cat-dot" style="background:' + catColor(c) + '"></i>' + escapeHtml(c) +
          ' <button class="x" data-del-cat="' + i + '" title="删除分类" style="border:none;background:none;padding:0;cursor:pointer">×</button></span>'
        ).join('');
      };
      renderCats();

      chips.addEventListener('click', async e => {
        const btn = e.target.closest('[data-del-cat]');
        if (!btn) return;
        const idx = Number(btn.dataset.delCat);
        const name = state.categories[idx];
        const used = state.boxes.filter(b => b.category === name).length;
        const ok = await confirmDialog({
          title: '删除分类',
          text: used ? '「' + name + '」下有 ' + used + ' 个箱子，删除后这些箱子改为「未分类」。' : '删除分类「' + name + '」。',
          okText: '删除',
          danger: true
        });
        if (!ok) return;
        state.categories.splice(idx, 1);
        state.boxes.forEach(b => { if (b.category === name) b.category = '未分类'; });
        touch('category');
        renderCats();
        renderAll();
      });

      modal.querySelector('#catAdd').onclick = () => {
        const input = modal.querySelector('#catInput');
        const name = input.value.trim();
        if (!name) return toast('请输入分类名称');
        if (state.categories.includes(name)) return toast('分类已存在');
        state.categories.push(name);
        input.value = '';
        touch('category');
        renderCats();
        renderAll();
      };

      const reveal = modal.querySelector('#btnReveal');
      if (reveal) reveal.onclick = () => nativeApi.reveal(dataPath);

      modal.querySelector('#btnBackup').onclick = async () => {
        try {
          const text = JSON.stringify(state, null, 2);
          await saveText('暖仓备份_' + todayStamp() + '.json', text);
        } catch (err) { toast(err.message); }
      };

      modal.querySelector('#btnRestore').onclick = () => importBackup();

      const copyBtn = modal.querySelector('#btnCopyUrl');
      if (copyBtn) {
        copyBtn.onclick = async () => {
          try {
            await copyText(shareUrls.join('\n'));
            toast('已复制共享地址');
          } catch (err) {
            toast('复制失败，请手动选中地址');
          }
        };
      }

      const signOutBtn = modal.querySelector('#btnSignOut');
      if (signOutBtn) {
        signOutBtn.onclick = async () => {
          const ok = await confirmDialog({
            title: '退出登录',
            text: '退出后本机不再上传数据，云端那份保留。确定退出？',
            okText: '退出'
          });
          if (!ok) return;
          await cloudSignOut();
        };
      }

      modal.querySelector('[data-cancel]').onclick = closeModal;
    }
  });
}

async function importBackup() {
  let text = null;
  try {
    if (nativeApi) {
      const res = await nativeApi.openFile('backup');
      if (!res || res.canceled) return;
      text = res.text;
    } else {
      text = await pickFileText('.json,application/json');
    }
  } catch (err) {
    toast('读取失败：' + err.message);
    return;
  }
  if (!text) return;

  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { return toast('备份文件不是有效的 JSON'); }

  if (!parsed || !Array.isArray(parsed.boxes)) return toast('备份内容缺少 boxes 字段');

  const ok = await confirmDialog({
    title: '从备份恢复',
    text: '将用备份中的 ' + parsed.boxes.length + ' 个箱子、' + (Array.isArray(parsed.trash) ? parsed.trash.length : 0) + ' 条回收站记录覆盖当前数据。',
    okText: '覆盖恢复',
    danger: true
  });
  if (!ok) return;

  state = normalizeState(parsed);
  touch('restore-backup');
  await saveNow();
  renderAll();
  closeModal();
  toast('已从备份恢复');
}

function pickFileText(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const f = input.files && input.files[0];
      if (!f) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve(null);
      reader.readAsText(f);
    };
    input.click();
  });
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    if (ok) resolve(); else reject(new Error('copy failed'));
  });
}

/* ---------------- 搜索 ---------------- */

let searchTimer = null;

function runSearch(query) {
  const panel = $('#searchPanel');
  const q = query.trim();
  if (!q) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }
  const hits = state.boxes.filter(b => boxMatches(b, q)).slice(0, 30);

  if (!hits.length) {
    panel.innerHTML = '<div class="result-empty">没有找到与「' + escapeHtml(q) + '」匹配的箱子</div>';
    panel.hidden = false;
    return;
  }

  panel.innerHTML = hits.map(b =>
    '<div class="result" data-result="' + b.id + '">' +
      '<div class="r-name">' + highlight(b.name, q) + '</div>' +
      '<div class="r-pos">' + posCode(b.cabinet, b.floor, b.slot) + '</div>' +
      '<div class="r-sub">' + posCn(b.cabinet, b.floor, b.slot) + ' · ' + highlight(b.category || '未分类', q) +
        (b.keywords ? ' · ' + highlight(b.keywords, q) : '') + '</div>' +
    '</div>'
  ).join('');
  panel.hidden = false;
}

function focusBoxFromSearch(id) {
  const box = state.boxes.find(b => b.id === id);
  if (!box) return;
  $('#searchPanel').hidden = true;
  switchView('cabinet', box.cabinet);
  renderDrawer(box.id);
}

/* ---------------- 全局渲染 ---------------- */

function renderAll() {
  renderStats();
  updateTrashBadge();
  if (currentView === 'room') renderRoom();
  if (currentView === 'cabinet') renderCabinet(currentCabinet);
  if (currentView === 'trash') renderTrash();
  if (openBoxId) renderDrawer(openBoxId);
}

/* ---------------- 事件绑定 ---------------- */

function bindEvents() {
  $('#planSvg').addEventListener('click', e => {
    const node = e.target.closest('.cabinet-node');
    if (node) switchView('cabinet', Number(node.dataset.cab));
  });
  $('#planSvg').addEventListener('keydown', e => {
    const node = e.target.closest('.cabinet-node');
    if (node && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      switchView('cabinet', Number(node.dataset.cab));
    }
  });

  $('#floors').addEventListener('click', e => {
    const boxEl = e.target.closest('[data-box]');
    if (boxEl) return renderDrawer(boxEl.dataset.box);
    const addEl = e.target.closest('[data-add]');
    if (addEl) {
      const [c, f, s] = addEl.dataset.add.split('-').map(Number);
      openBoxForm('add', { cabinet: c, floor: f, slot: s });
    }
  });

  $('#btnAddHere').onclick = () => openBoxForm('add', { cabinet: currentCabinet, floor: 1, slot: 1 });

  $('#trashList').addEventListener('click', e => {
    const r = e.target.closest('[data-restore]');
    if (r) return handleRestore(Number(r.dataset.restore));
    const p = e.target.closest('[data-purge]');
    if (p) return handlePurge(Number(p.dataset.purge));
  });

  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]');
    if (nav) switchView(nav.dataset.nav);
  });

  $('#btnLabels').onclick = () => openLabelsModal();
  $('#btnTrash').onclick = () => switchView('trash');
  $('#btnSettings').onclick = () => openSettingsModal();
  $('#drawerBackdrop').onclick = closeDrawer;

  const input = $('#searchInput');
  input.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(input.value), 120);
  });
  input.addEventListener('focus', () => { if (input.value.trim()) runSearch(input.value); });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = $('#searchPanel .result');
      if (first) focusBoxFromSearch(first.dataset.result);
    }
    if (e.key === 'Escape') {
      input.value = '';
      $('#searchPanel').hidden = true;
      input.blur();
    }
  });

  $('#searchPanel').addEventListener('click', e => {
    const r = e.target.closest('[data-result]');
    if (r) focusBoxFromSearch(r.dataset.result);
  });

  document.addEventListener('mousedown', e => {
    if (!e.target.closest('.search')) $('#searchPanel').hidden = true;
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
    if (e.key === 'Escape') {
      if (activeModal) return closeModal();
      if (openBoxId) return closeDrawer();
    }
  });

  window.addEventListener('beforeunload', () => { if (saveTimer) saveNow(); });
}

/* ---------------- 启动 ---------------- */

async function boot() {
  $('#versionBadge').textContent = APP_VERSION;
  bindEvents();
  await loadState();
  if (sharedMode) setSyncStatus(SYNC.online ? 'ok' : 'offline');
  updateTrashBadge();
  switchView('room');
  if (nativeApi) {
    try {
      const v = await nativeApi.appVersion();
      if (v) console.info('暖仓', APP_VERSION, '运行于', v);
    } catch (e) { /* ignore */ }
  }
}

document.addEventListener('DOMContentLoaded', boot);
