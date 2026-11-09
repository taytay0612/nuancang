const fs = require('fs');
const vm = require('vm');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.core.js'), 'utf8');

const ctx = {
  window: {},
  document: { createElement: () => ({ getContext: () => ({}), width: 0, height: 0, toBlob: () => {} }) },
  localStorage: { getItem: () => null, setItem: () => {} },
  console,
  Date, Math, JSON, URL,
  setTimeout, clearTimeout,
  TextEncoder, DataView, Uint8Array, Uint32Array, ArrayBuffer,
  Blob: class { constructor(parts) { this.parts = parts; } },
  navigator: { userAgent: 'node' }
};
vm.createContext(ctx);
vm.runInContext(code + '\n;__api = { code128Values, code128Modules, crc32, zipStore, CODE128_WIDTHS, posCode, posCn };', ctx);
const api = ctx.__api;

let failed = 0;
const check = (name, ok, extra) => { if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : '')); };

check('Code128 表有 107 项', api.CODE128_WIDTHS.length === 107, api.CODE128_WIDTHS.length);
check('停止符宽度为 7 位数字', api.CODE128_WIDTHS[106] === '2331112', api.CODE128_WIDTHS[106]);

const values = api.code128Values('G1-L1-B1');
const expected = [104, 39, 17, 13, 44, 17, 13, 34, 17, 2, 106];
check('Code128B 编码值正确', JSON.stringify(values) === JSON.stringify(expected), values.join(','));

const modules = api.code128Modules('G1-L1-B1');
const expectedWidth = values.reduce((n, v) => n + api.CODE128_WIDTHS[v].split('').reduce((a, d) => a + Number(d), 0), 0);
check('模块数与图案宽度一致', modules.length === expectedWidth, modules.length + ' vs ' + expectedWidth);

const text = new TextEncoder().encode('hello 暖仓');
check('crc32 计算稳定', api.crc32(text) === api.crc32(text), api.crc32(text).toString(16));

const zip = api.zipStore([
  { name: 'G1-L1-B1.png', data: new TextEncoder().encode('fake-png-bytes-1') },
  { name: 'G2-L3-B4.png', data: new TextEncoder().encode('fake-png-bytes-2') }
]);
const zipPath = path.join(__dirname, '..', 'work', 'test-labels.zip');
fs.writeFileSync(zipPath, Buffer.from(zip));
check('ZIP 文件已生成', fs.existsSync(zipPath) && fs.statSync(zipPath).size > 100, fs.statSync(zipPath).size + ' bytes');
check('ZIP 签名正确', zip[0] === 0x50 && zip[1] === 0x4b, 'PK');

console.log(failed === 0 ? 'ALL PASS' : failed + ' FAILED');
process.exit(failed === 0 ? 0 : 1);
