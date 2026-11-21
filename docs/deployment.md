# 线上发布记录 · 2026-11-08

- 固定公网地址：https://xiaoxiong20260206.github.io/typhoon-lab/
- 专用公开发布仓库：https://github.com/xiaoxiong20260206/typhoon-lab
- 首次发布提交：`d8dafb1a298358f37f3ea2ef2ca78c8f85b9bd5a`
- Pages 工作流：`42458559682`，完成状态 `success`。
- Pages 状态：`built`，来源 `main` 根目录，HTTPS 强制开启。
- 首页实际 HTTP 200，`text/html; charset=utf-8`。
- 模型测试：29 项通过。
- 通过 `SITE_URL=https://xiaoxiong20260206.github.io/typhoon-lab/` 运行独立临时 Chrome 回归：51 项通过，无脚本错误、无资源请求失败。包括桌面/笔记本/手机、8 系统工坊、命名、地图、登陆、变性和回放。
- MyFlicker 内置浏览器打开页面超时，未将其计作验证通过；真实网页验证由独立临时 Chrome 完成。
- 远端根目录仅含 `.nojekyll`、`assets`、`favicon.svg`、`guide.html`、`index.html`、`js`、`styles`。开发记录、测试脚本、截图、环境配置不上传。

## 后续修改

用户已明确授权本项目后续修改完成后更新线上，见根目录 `AGENTS.md`。发布使用 `npm run deploy`，不创建新站点；等待 Pages 工作流完成，再验证同一公网地址。发生发布错误时报告阻塞，不冒充线上已更新。

GitHub Pages 资源有十分钟 CDN/浏览器缓存。自 v2.2.1 起，构建会为 CSS、JS module 和数据请求注入内容哈希；旧 HTML 最多滞后一个缓存周期，一旦取得新 HTML 就不会再混用旧脚本。不得仅用缓存旧页面作为新版验收依据。

## v2.2.1 · 自动保存可见性与缓存修正 · 2026-11-21

- 故障排查确认公网 v2.2 的 HTML、`app.js` 与 `history.js` 已逐字节匹配本地，且完整关闭浏览器重开后 localStorage 历史与多选可恢复；主要用户侧风险是发布后十分钟内仍取到旧 HTML/JS，以及多选入口藏在实验抽屉底部。
- 构建资源统一注入内容哈希，主界面新增「历史与多台风 n/n」和页面版本 `v2.2.1`；保存能力改为即时探测，受限时明确显示未持久保存。
- 公网提交 `f2e3c56d952bec9202c5d504bd2f516d56382a32`；Pages 工作流 `44875817735` 成功并 built。资源版本 `da7166334ba9`；28 个运行文件 HTTP 内容与构建逐字节一致。
- 公网真实浏览器：完整关闭重开 9 项、沉浸 31 项、三维/声音 26 项、经典 51 项、性能预算通过，无 JS/shader 错误或失败资源。
- 内网用 PDE Agent 发布版本 `7cbcdcfd`，平台 `latest_version_id` 与 `amc_init_status=ready` 已确认。固定地址和版本地址匿名请求仍 HTTP 302 跳转 SSO，内置浏览器 30 秒超时；应用内渲染与交互验收仍待已授权浏览器，不把 SSO 登录页算作通过。

## v2.0.0 · 3D 风暴剧场 · 2026-11-08

- 沿用同一仓库、`main` 与公网地址；`npm run deploy` 成功。
- 发布提交：`f78dd9f2302d26faec9ca9ceb47e2bab251c77dd`。
- Pages 工作流 `42477663645` 成功；Pages 状态 `built`，HTTPS 强制开启。
- 25 个公网运行文件（首页、说明页、JS、CSS、数据及 Three.js/许可）逐一 HTTP 成功，SHA-256 与本次本地发布包一致。
- 同一线上地址通过 26 项三维浏览器检查与 51 项经典模式检查；没有 JS/shader 错误，经典模式无资源失败。
- 实际查看线上风眼近景截图；桌面、手机影院截图与逐项结果保存在本地 `Output/`。
- 远端文件树核对为公开运行资源与 `.nojekyll`，无开发文档、测试、截图、凭证或个人路径。

## v2.1.0 · 沉浸简洁版 · 2026-11-09

- 固定站点发布提交：`ab1f8ea1c9076b4f4305064b8e16eb3dbb00ca77`；Pages 工作流 `42552970882` success，站点 built。
- 27 个公网运行文件 HTTP 成功，SHA-256 与本次发布包一致；远端白名单文件树检查通过。
- 线上 `refinement.test.mjs` 24项、`theater.test.mjs` 26项、`verify-browser.mjs` 51项通过。没有 JS/shader 错误，经典模式无资源失败。
- 线上截图和结果写入本地 Output。主地址默认沉浸布局，`?layout=classic` 保留旧操作布局。

## 快手内网同步 · 2026-11-09

- 按用户明确要求使用 `pde-agent`，经 `appwrite-cf login-ks` 完成部署工具 SSO 登录。
- 项目 `typhoonlab`（平台ID 28596），固定地址：https://typhoonlab.frontend-cloud.corp.kuaishou.com/ 。版本 `9ec8893f`，版本地址：https://typhoonlab-9ec8893f.frontend-cloud.corp.kuaishou.com/ 。部署后平台查询确认最新版本，访问配置 ready。
- 上传目录 `.publish/site-1794193659442`，仅27个运行文件，打包294.9 KB；与当前公网构建包逐字节一致。发布前33项模型、24项沉浸布局、26项三维声音、51项经典回归全部通过。
- 平台默认白名单访问；本次没有改变全员/指定人员权限。后台：https://myflicker.corp.kuaishou.com/web-artifacts/detail?id=28596&tab=AccessControl 。CLI 登录不等于浏览器拥有站点 SSO 会话。
- 线上访问检查：首页 HTTP 302 跳转 `sso.corp.kuaishou.com`。独立临时 Chrome 未进入模拟器、初始化等待超时；内置浏览器 `new_tab` 15秒超时。未将登录页当作应用白屏通过，也未绕过访问控制。内网完整验收仍待已授权浏览器完成。
- 待复验：首页3D渲染与沉浸操作、`?layout=classic` 的声音/二维回退及模拟交互、`guide.html`；复用现有测试与 `SITE_URL`。同时检查资源请求与重定向，不应出现来自应用的意外上传或跨域数据请求。
- 本轮不改运行文件，因此不重复发布相同公网版本。公网原地址与自动发布约定保留；本地增加内网配置和维护记录，不上传这些文档。

## v2.2.0 · 历史创建与多选演示 · 2026-11-21

- 公网发布提交：`1eb05037992fc333f8a7861c7fa0d2aabaa9e152`；Pages 工作流 `44872802830` 成功，站点 built。
- 28 个公网运行文件 HTTP 成功并逐字节匹配本地包；运行文件新增 `js/history.js`。远端不包含源码文档、测试、截图、配置或本地路径。
- 发布前 36 项单元测试通过；线上 29 项沉浸、26 项三维/声音、51 项经典回归通过，无 JS/shader 错误，无失败资源。
- 内网 v2.2.0 版本 `50a2007e`，上传目录 `.publish/site-1795240275205`，打包 298.1 KB，与公网构建包一致。平台查询确认 latest_version_id 为 `50a2007e`，访问配置 ready；未修改白名单。
- 内网验证：固定地址和版本地址未登录均 HTTP 302 跳转快手 SSO；MyFlicker 内置浏览器 20 秒超时。平台确认不等于应用渲染通过，完整验收仍需已授权浏览器。

## v2.7.0 · 官方中英文名与自然蓝绿地图 · 2026-11-21

- 公网发布提交：`cdea69826dba15d501008cc2ea0078253d987de9`；Pages 工作流 `44893460975` 成功，站点 built。
- 34 个公网运行文件 HTTP 成功并逐字节匹配本地包；运行文件新增 `assets/official-name-translations.json`。
- 发布前 44 项模型测试通过；线上 55 项沉浸、13 项完整关闭重开、26 项三维/声音、51 项经典回归及性能预算通过，无 JS/shader 错误，无失败资源。
- 2D 地图与 3D 场景升级为自然蓝绿视觉，官方台风在库、地图、3D 与观测摘要中同时显示中英文名；气象规则与官方重放数据不变。
- 内网 v2.7.0 版本 `6773b108`：https://typhoonlab-6773b108.frontend-cloud.corp.kuaishou.com/ 。仅上传 `.publish/site-1795256063597` 的 34 个运行文件，平台打包 1.48 MB。
- 内网验证：固定地址未登录 HTTP 302 跳转快手 SSO，`myflicker-browser new_tab` 20 秒 `EXECUTION_TIMEOUT`；上传成功不等于渲染验收通过，仍需已授权浏览器复验应用 DOM 与交互。
