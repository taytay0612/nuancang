/* ===================================================================
   暖仓 v1.1 · 云端同步（Supabase，直接调用接口，不加载外部脚本）
   只在地址带 ?mode=cloud 时启用。
   =================================================================== */

const CLOUD_URL = 'https://yozswbcoesmhstywbzhg.supabase.co';
const CLOUD_KEY = 'sb_publishable_Cu9yt1h4DSWciNY33Ud2Dw_ulel5eXx';
const CLOUD_TABLE = 'nuancang_spaces';
const CLOUD_SESSION_KEY = 'nuancang.cloud.session';

/* 放在 Supabase 域名下的副本自动走云端模式，不用手动加 ?mode=cloud */
const cloudMode = !(window.暖仓API) && (
  new URLSearchParams(location.search).get('mode') === 'cloud' ||
  /(^|\.)supabase\.co$/i.test(location.hostname)
);

let cloudSession = null;
let cloudInitPromise = null;
let cloudError = '';

function cloudRedirectUrl() {
  return location.origin + location.pathname + '?mode=cloud';
}

function cloudB64UrlDecode(text) {
  const pad = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = pad + '='.repeat((4 - (pad.length % 4)) % 4);
  return decodeURIComponent(Array.prototype.map.call(atob(padded), ch =>
    '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

function cloudDecodeJwt(token) {
  try {
    const part = String(token || '').split('.')[1];
    return part ? JSON.parse(cloudB64UrlDecode(part)) : null;
  } catch (err) {
    return null;
  }
}

function cloudSaveSession(session) {
  cloudSession = session;
  try {
    if (session) localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(CLOUD_SESSION_KEY);
  } catch (err) {
    /* 本机存不下时只影响下次免登录 */
  }
}

function cloudReadSession() {
  try {
    const raw = localStorage.getItem(CLOUD_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

/* 登录回来时 token 在地址 # 后面；取走后从地址栏抹掉 */
function cloudTakeHashSession() {
  const hash = location.hash || '';
  if (!hash || hash.indexOf('access_token=') < 0) {
    const params = new URLSearchParams(location.search);
    const err = params.get('error_description') || params.get('error');
    if (err) cloudError = decodeURIComponent(err);
    return null;
  }
  const params = new URLSearchParams(hash.slice(1));
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  const expiresIn = Number(params.get('expires_in') || 3600);
  if (!access) return null;
  const payload = cloudDecodeJwt(access);
  const session = {
    access_token: access,
    refresh_token: refresh || '',
    expires_at: Date.now() + expiresIn * 1000,
    user_id: (payload && payload.sub) || '',
    email: (payload && payload.email) || '',
    name: (payload && payload.user_metadata && (payload.user_metadata.user_name || payload.user_metadata.name)) || ''
  };
  history.replaceState(null, '', location.pathname + '?mode=cloud');
  return session;
}

function sessionFromToken(data, fallbackRefresh) {
  const payload = cloudDecodeJwt(data.access_token);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || fallbackRefresh || '',
    expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
    user_id: (payload && payload.sub) || '',
    email: (payload && payload.email) || '',
    name: (payload && payload.user_metadata && (payload.user_metadata.user_name || payload.user_metadata.name)) || ''
  };
}

async function cloudPasswordLogin(email, password) {
  const res = await fetch(CLOUD_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: CLOUD_KEY, Authorization: 'Bearer ' + CLOUD_KEY },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || ('登录失败 HTTP ' + res.status));
  const session = sessionFromToken(data);
  cloudSaveSession(session);
  return session;
}

async function cloudSignUp(email, password) {
  const res = await fetch(CLOUD_URL + '/auth/v1/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: CLOUD_KEY, Authorization: 'Bearer ' + CLOUD_KEY },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || ('注册失败 HTTP ' + res.status));
  if (!data.access_token) throw new Error('账号已创建，但 Supabase 还要求邮箱验证。到 Authentication → Sign In / Providers → Email 关闭 Confirm email 后即可直接登录。');
  const session = sessionFromToken(data);
  cloudSaveSession(session);
  return session;
}

async function cloudTokenRequest(body) {
  const res = await fetch(CLOUD_URL + '/auth/v1/token?grant_type=' + body.grant_type, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: CLOUD_KEY,
      Authorization: 'Bearer ' + CLOUD_KEY
    },
    body: JSON.stringify(body.payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.message || ('登录失败 HTTP ' + res.status));
  return sessionFromToken(data, body.payload.refresh_token);
}

async function cloudRefresh() {
  if (!cloudSession || !cloudSession.refresh_token) throw new Error('登录已过期');
  const next = await cloudTokenRequest({
    grant_type: 'refresh_token',
    payload: { refresh_token: cloudSession.refresh_token }
  });
  cloudSaveSession(next);
  return next;
}

async function cloudApi(path, options) {
  const opts = options || {};
  const call = async () => {
    const headers = Object.assign({
      apikey: CLOUD_KEY,
      Authorization: 'Bearer ' + (cloudSession ? cloudSession.access_token : CLOUD_KEY),
      'Content-Type': 'application/json'
    }, opts.headers || {});
    return fetch(CLOUD_URL + path, Object.assign({}, opts, { headers }));
  };

  let res = await call();
  if (res.status === 401 && cloudSession && cloudSession.refresh_token) {
    await cloudRefresh();
    res = await call();
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.message || body.hint || body.error_description || body.error || '';
    } catch (err) {
      detail = '';
    }
    if (res.status === 401) {
      cloudSaveSession(null);
      throw new Error('登录已过期，请重新登录');
    }
    if (res.status === 403 || res.status === 42501) throw new Error(detail || '数据库没有授权，先在 Supabase 运行授权 SQL');
    if (res.status === 404) throw new Error(detail || '云端表不存在，先在 Supabase 运行建表 SQL');
    throw new Error(detail || ('云端接口返回 ' + res.status));
  }
  return res;
}

async function cloudInit() {
  if (!cloudMode) return null;
  if (cloudInitPromise) return cloudInitPromise;
  cloudInitPromise = (async () => {
    const fromHash = cloudTakeHashSession();
    if (fromHash) cloudSaveSession(fromHash);
    else cloudSession = cloudReadSession();

    if (cloudSession && cloudSession.refresh_token && cloudSession.expires_at - 60000 < Date.now()) {
      try {
        await cloudRefresh();
      } catch (err) {
        cloudSaveSession(null);
      }
    }
    return cloudSession;
  })();
  return cloudInitPromise;
}

async function cloudFetchState() {
  const res = await cloudApi(
    '/rest/v1/' + CLOUD_TABLE + '?select=data,updated_at&owner_id=eq.' + encodeURIComponent(cloudSession.user_id)
  );
  let rows = null;
  try {
    rows = await res.json();
  } catch (err) {
    rows = null;
  }
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row || !row.data) return { rev: '', state: null };
  return { rev: row.updated_at || '', state: row.data };
}

async function cloudSaveState(next) {
  const stamp = new Date().toISOString();
  const res = await cloudApi('/rest/v1/' + CLOUD_TABLE + '?on_conflict=owner_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{ owner_id: cloudSession.user_id, data: next, updated_at: stamp }])
  });
  let row = null;
  try {
    const rows = await res.json();
    row = Array.isArray(rows) ? rows[0] : rows;
  } catch (err) {
    row = null;
  }
  return { rev: (row && row.updated_at) || stamp };
}

function showCloudLogin() {
  if (document.getElementById('cloudGate')) return;
  const gate = document.createElement('div');
  gate.id = 'cloudGate';
  gate.innerHTML =
    '<div class="gate-card">' +
      '<div class="gate-logo">暖</div>' +
      '<h2>暖仓 · 云端版</h2>' +
      '<p class="gate-desc">用家庭共用的邮箱账号登录，数据存在云端，手机和电脑看到同一份。</p>' +
      '<div class="gate-form">' +
        '<input class="input" id="cloudEmail" type="email" placeholder="邮箱" autocomplete="username" spellcheck="false">' +
        '<input class="input" id="cloudPass" type="password" placeholder="密码（至少 6 位）" autocomplete="current-password">' +
      '</div>' +
      '<p class="gate-error" id="cloudErr" hidden></p>' +
      '<button class="btn btn-primary gate-btn" id="cloudLoginBtn">登录</button>' +
      '<button class="btn gate-btn" id="cloudSignupBtn">创建账号</button>' +
      '<button class="btn gate-btn gate-ghost" id="cloudGithubBtn">用 GitHub 登录</button>' +
      '<button class="btn gate-btn gate-ghost" id="cloudLocalBtn">先按本机数据使用</button>' +
      '<p class="gate-hint">第一次使用先点「创建账号」，之后每台设备用同一个邮箱和密码登录。</p>' +
    '</div>';
  document.body.appendChild(gate);

  const emailEl = document.getElementById('cloudEmail');
  const passEl = document.getElementById('cloudPass');
  const errEl = document.getElementById('cloudErr');

  const fail = message => {
    errEl.textContent = message;
    errEl.hidden = false;
  };

  const run = async (action, label) => {
    const email = emailEl.value.trim();
    const password = passEl.value;
    errEl.hidden = true;
    if (!email || email.indexOf('@') < 0) return fail('请填写邮箱');
    if (!password || password.length < 6) return fail('密码至少 6 位');
    const buttons = gate.querySelectorAll('button');
    buttons.forEach(btn => { btn.disabled = true; });
    try {
      await action(email, password);
      location.href = location.pathname + '?mode=cloud';
    } catch (err) {
      fail(label + '失败：' + (err.message || '未知错误'));
      buttons.forEach(btn => { btn.disabled = false; });
    }
  };

  document.getElementById('cloudLoginBtn').onclick = () => run(cloudPasswordLogin, '登录');
  document.getElementById('cloudSignupBtn').onclick = () => run(cloudSignUp, '创建账号');
  document.getElementById('cloudGithubBtn').onclick = () => {
    location.href = CLOUD_URL + '/auth/v1/authorize?provider=github&redirect_to=' +
      encodeURIComponent(cloudRedirectUrl());
  };
  document.getElementById('cloudLocalBtn').onclick = () => {
    gate.remove();
    toast('当前只使用本机数据，改动不会上传云端');
  };
  setTimeout(() => { if (emailEl.offsetParent) emailEl.focus(); }, 50);
}

function hideCloudLogin() {
  const gate = document.getElementById('cloudGate');
  if (gate) gate.remove();
}

async function cloudSignOut() {
  try {
    if (cloudSession && cloudSession.access_token) {
      await fetch(CLOUD_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: {
          apikey: CLOUD_KEY,
          Authorization: 'Bearer ' + cloudSession.access_token
        }
      });
    }
  } catch (err) {
    /* 退出失败也清本机登录态 */
  }
  cloudSaveSession(null);
  location.href = location.pathname + '?mode=cloud';
}
