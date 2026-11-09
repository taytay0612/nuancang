# 暖仓 · 储藏室编码管理

按柜、层、箱位给储藏室建档，一箱一码，打印 50×30 mm 标签，手机和电脑共用同一份数据。

## 三种运行形态

| 形态 | 打开方式 | 数据位置 | 适用 |
|---|---|---|---|
| 单机 | 双击 `暖仓网页版.html` | 浏览器 localStorage | 一台电脑，不联网 |
| 局域网 | 双击 `暖仓共享版\启动暖仓.bat` | 本机 `数据\暖仓数据.json` | 家里同一 Wi-Fi，免登录 |
| 云端 | 公网静态站点（Netlify） | Supabase | 任意网络，邮箱登录 |

三种形态共用同一份前端代码，页面按打开方式自动选择存储层。

## 功能

- 房间平面图：5 个柜位，点击进入柜体。
- 箱位档案：箱名、分类、内容关键词、备注、重量、位置码 `G{柜}-L{层}-B{箱}`。
- 移动与互换：箱子换位后旧标签作废，自动记录变动。
- 标签中心：Code 128 一维条码，50×30 mm、300 dpi；可单张导出 PNG、批量导出 ZIP，或打印 A4 排版页（每页 24 张）。
- 搜索：箱名、关键词、位置码，Ctrl+K 唤起。
- 回收站：删除保留 30 天，可恢复。
- 备份：导出 / 恢复整份 JSON。
- 多端同步：局域网走 `/api/state` 轮询；云端走 Supabase，冲突按箱子逐条合并。

## 目录

```
暖仓网页版.html       v1.0 单文件，历史版本
暖仓发布/             Electron 打包产物与桌面版数据
暖仓共享版/           局域网服务：server.js + index.html + 启动脚本
暖仓公网版/           上传 Netlify 的静态包：index.html + _redirects
源码/                 前端与桌面端源码
  src/                app.core.js（数据层）app.ui.js（界面）app.cloud.js（云端）app.css
  electron/           桌面壳
  tools/              构建与自检脚本
  dist/               构建产物
设计稿源码/           平面与箱体清单的生成脚本
output/               平面图、清单、PDF 等交付物
```

## 本地构建

```powershell
cd 源码
node tools/build-app.js                       # 生成 dist/index.html
copy dist\index.html ..\暖仓共享版\index.html   # 局域网版更新
```

`暖仓公网版/index.html` 在 `dist/index.html` 基础上做两处替换：

- `const cloudMode` 写死为 `true`；
- `CLOUD_URL` 改为 `location.origin + '/sb'`。

打包上传：把 `暖仓公网版` 两个文件压成 zip，拖进 Netlify 的 Deploys。

## 云端部署

1. Supabase 建表与授权：执行 `暖仓共享版\supabase_setup.sql`。
2. Authentication → Users 建一个家庭账号，勾 `Auto Confirm User`。
3. Netlify 新建站点，上传 `暖仓公网版` 两个文件。
4. `_redirects` 把 `/sb/*` 反代到 Supabase，页面与接口同域。

```
/sb/*  https://<project-ref>.supabase.co/:splat  200
```

`_redirects` 结尾必须有换行，否则 Netlify 整份忽略。

## 数据

- 云端：`public.nuancang_spaces`，一行一个账号，整份数据放在 `data jsonb`。
- 局域网：`暖仓共享版\数据\暖仓数据.json`，每次保存留 `.bak`。
- 备份：页面「设置与备份」→「导出备份 JSON」。

## 版本记录

### v1.1.0

- 新增云端模式：Supabase Auth + PostgREST，邮箱密码登录。
- 新增局域网共享：Node 静态服务 + `/api/state`，同一 Wi-Fi 多设备共用。
- 新增 A4 标签打印页，每页 24 张。
- 新增多端合并：按箱子 `updatedAt` 与回收站 `deletedAt` 判定增删。
- 同步轮询 8 秒，页面隐藏时暂停。
- 修复：改写存储层后遗留的 `cloudClient` 未定义引用。

### v1.0.0

- 单文件网页版：平面图、箱位档案、Code 128 标签、回收站、备份。

## 已知限制

- 云端站点依赖 `netlify.app` 域名可达；个别网络环境会被污染。
- Supabase 免费项目 7 天无访问会暂停，需后台恢复。
- GitHub 登录在部分网络不可用，云端默认用邮箱密码。
- 局域网版需要本机开机并保持服务窗口不关。
