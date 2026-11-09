const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

const css = read('src/app.css');
const body = read('src/app.body.html');
const cloud = read('src/app.cloud.js');
const core = read('src/app.core.js');
const ui = read('src/app.ui.js');

const js = [cloud, core, ui].join('\n\n');

if (!body.includes('__APP_JS__')) throw new Error('app.body.html 缺少 __APP_JS__ 占位符');
if (js.includes('</script')) throw new Error('脚本里不能出现 </script');

const html = [
  '<!doctype html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="color-scheme" content="light">',
  '<title>暖仓 v1.1 · 家庭共享</title>',
  '<style>',
  css,
  '</style>',
  '</head>',
  '<body>',
  body.replace('__APP_JS__', () => js),
  '</body>',
  '</html>',
  ''
].join('\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('built dist/index.html', Buffer.byteLength(html), 'bytes');
