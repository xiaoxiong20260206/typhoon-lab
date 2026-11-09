# 部署记录

## 2026-11-09 · 完整源码上传 GitHub

- 仓库：https://github.com/xiaoxiong20260206/typhoon-lab （Public）
- 上传 28 个源码/文档文件：`scripts/`、`tests/`、`docs/`、`package.json`、`README.md`、`AGENTS.md`、`CHANGELOG.md`、`.gitignore`。
- 未上传：`.publish/`、`Output/`、`.static-site-deploy.json`、`.env*`、`node_modules/`。
- 运行文件保持根目录不变；推送前逐文件核对，28 个远端运行文件与本地完全一致，站点内容未变。
- `npm run deploy` 改为只替换运行文件，保留源码与文档，避免整体替换文件树导致源码丢失。
- 本地 33 项模型测试通过。

## 2026-11-09 11:05（任务时间） · 内网同步 v2.1.0 · 9ec8893f

- 固定地址：https://typhoonlab.frontend-cloud.corp.kuaishou.com/
- 版本地址：https://typhoonlab-9ec8893f.frontend-cloud.corp.kuaishou.com/
- 使用 PDE Agent 的 frontend-cloud CLI 首次部署；平台项目 `typhoonlab`（28596），最新版本 `9ec8893f`，状态 ready。
- 仅同步现有27个运行文件，与公网提交 `ab1f8ea1c9076b4f4305064b8e16eb3dbb00ca77` 的构建包逐字节一致；无应用逻辑或视觉修改，公网不变。开发记录、测试、配置和截图不上传。
- 发布前33项模型测试与101项浏览器检查通过。
- 线上白屏回归：**未完成，不计通过**。首页 HTTP 302 跳转快手 SSO；独立 Chrome 等待应用初始化超时，MyFlicker 内置浏览器打开页面也超时。默认白名单未更改，需已授权浏览器完成首页、经典模式与说明页验收；未继续重复运行受同一登录门禁阻挡的声音/经典线上测试。
- 权限管理：https://myflicker.corp.kuaishou.com/web-artifacts/detail?id=28596&tab=AccessControl

## 2026-11-09 · v2.1.0 · 沉浸简洁版

- 地址：https://xiaoxiong20260206.github.io/typhoon-lab/
- 提交：`ab1f8ea1c9076b4f4305064b8e16eb3dbb00ca77`；Pages 工作流 `42552970882` 成功，状态 `built`。
- 默认全屏风暴，常用操作与身份/强度常驻，进阶设置与观测按需抽屉；创建参数渐进展开，经典布局保留。
- 电影巡航、差速云层、侧光与柔边风眼；云网格分级，风圈/轨迹缓冲复用，标签节流及隐藏图表按需更新。
- 同条件基线：首屏控件 32→12；8 系统三角形 174200→32344，减少约81%；draw calls 仍33，帧间隔中位数均约16.7ms，不将几何降幅冒充FPS提升。
- 本地33项单元测试通过；本地和线上各24项沉浸布局、26项三维、51项经典回归通过，合计101项浏览器检查。无JS/shader错误，经典回归无失败资源。
- 27个公网运行文件 SHA-256 与发布包一致；线上首页实际渲染、说明页可读，查看了线上桌面截图，无白屏。
- 气象规则、命名表、海陆数据与v2.0发布包一致；未新增复活/吞并。文档和测试截图不发布。

## 2026-11-08 · v2.0.0 · 3D 风暴剧场

- 地址：https://xiaoxiong20260206.github.io/typhoon-lab/
- 提交：`f78dd9f2302d26faec9ca9ceb47e2bab251c77dd`；Pages 工作流 `42477663645` 成功，站点状态 `built`。
- 新增本地 Three.js 三维海面、分层云系与风眼、全域/追风/近景镜头、影院模式、用户主动开启的风雨声音及画质选择。
- 原模拟规则与二维模式保留；WebGL 不可用时回退，不丢失实验。
- 本地 32 项单元测试；本地和线上各 26 项三维浏览器检查、51 项经典模式检查全部通过。
- 白屏回归：首页实际 WebGL 渲染、模型说明页可读；无 JS/shader 错误，经典模式无失败资源。25 个公网运行文件 SHA-256 与本次发布包一致。
- 浏览器验证由独立临时 Chrome 完成；内置浏览器连接超时未计作通过。未做真人试听或固定帧率承诺。
- 未包含完全消散后复活、吞并、藤原效应或真实体积云。本记录、测试与截图不发布到远端。
