// 暖仓 · 公网入口函数（Supabase Edge Function）
// 作用：把 Storage 里的 index.html 以 text/html 返回。
// Storage 公开桶默认按 text/plain + sandbox CSP 返回，浏览器只会显示源码，不能当网页用。

const PAGE = 'https://yozswbcoesmhstywbzhg.supabase.co/storage/v1/object/public/nuancang/index.html';

Deno.serve(async () => {
  const res = await fetch(PAGE, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) {
    return new Response('页面读取失败：HTTP ' + res.status, {
      status: 502,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
  const html = await res.text();
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
});
