# 风暴实验室 · 西北太平洋台风模拟器

浏览器气象科普沙盒：原生 ES modules + 本地 Three.js + Canvas 2D 回退。不是实时天气、业务预报或灾害决策工具。

## 启动

要求 Node.js 22 或以上。无需 npm install。

```sh
npm start
```

打开 http://127.0.0.1:8770 。其他端口可用 `PORT=8771 npm start`。

## 线上发布

固定地址：https://xiaoxiong20260206.github.io/typhoon-lab/

用户已要求后续完成修改后同步发布到此地址。`npm run deploy` 会先运行模型测试，将网页运行资源打包到本地 `.publish/`，再更新专用 GitHub Pages 仓库。它不会上传此 README、开发记录、测试、截图或环境配置；不使用强制推送。

需要 GitHub CLI 已登录，并具有 `xiaoxiong20260206/typhoon-lab` 写入权限。首次 Pages 配置由维护者完成；后续更新 `main` 自动触发 Pages 构建。上传成功不等于上线成功，必须等待构建完成并验证公网资源与交互。

浏览器回归脚本 `scripts/verify-browser.mjs` 支持 `SITE_URL=https://xiaoxiong20260206.github.io/typhoon-lab/`，可复用完整交互测试验证线上。详细交付约定见 `AGENTS.md`。

```sh
npm test
```

## 操作

- 初始暂停在第 3 天；「↶」回到最初扰动阶段。
- 三种情景：北上变性、西行登陆、海上生命周期。
- 海温、风切变、环流规模、冷空气四项参数；修改会重新计算整个实验。
- 「台风工坊」自选海洋位置、初始风速、环流规模和引导路径，也可直接在地图生成扰动；不设四系统上限。
- 新系统在当前回放时刻诞生，不倒回起点；时间轴随最后出生时刻延长，出生前的历史不变。
- 达到热带风暴才领取名字；未命名就消散不占名，已命名系统消散保留历史名。140 名轮完，从达维开始下一轮。
- 侧栏显示下一名及轮次，历史消散系统仍可查看；切换情景会开启新实验、从表首重新命名。
- 云系、七/十/十二级风圈、降雨、风场和路径可单独切换。
- 时间轴回放、1/4/12 倍速度；空格播放，左右键逐小时移动。
- 滚轮缩放、拖动地图、点击风暴选择、点击海陆查询当地风雨。
- 窄屏自适应，触屏与键盘操作可用；降低动态效果偏好会关闭云系旋转。

## 架构

- `js/rules.js`：风力、强度、风圈及风雨空间函数。
- `js/model.js`：固定步长、确定性演化、编号命名、海陆和变性反馈。
- `js/geo.js`、`assets/land.json`：真实轮廓与一致的海陆判断。
- `js/map.js`、`js/weather.js`：底图缓存、云系纹理、风雨与风圈绘制。
- `js/panels.js`、`js/app.js`：观测面板与实验操作。
- `js/forge.js`：自定义创建表单与地图选点。
- `assets/names.json`：JMA 2026 官方 140 名完整固定列表。
- `guide.html`：完整科学边界、分级口径与数据来源。

地图数据：Natural Earth，公有领域。命名数据：JMA 2026 表，实验从表首开始，不冒充真实年份命名进度。中文未收录的名字使用官方英文。

所有运行资源均本地化；`scripts/prepare-data.mjs` 是开发时更新数据的脚本，会访问 JMA 和 Natural Earth 来源，不在启动时执行。无需账户，无后台写入，不上传数据。

## v2.0 · 3D 风暴剧场

- 默认使用 Three.js r128（本地 MIT 许可版本，与恒星项目同源）；无需 CDN 或 npm install。`assets/vendor/LICENSE.txt` 随站发布。
- 全域、追风、风眼近景三种镜头；拖动调整视角，滚轮缩放。影院模式隐藏侧栏，按 Escape 退出。
- 地图为带曲率的西北太平洋区域面，不提供跨洋活动。柔边云粒子、起伏云片和海面着色是视觉示意，不是真实体积云、海拔或数值天气模拟。
- 风圈沿用模型地理半径；三维雨丝和风线是效果示意，精确的模型内局地读数请点击地图，降雨强弱分布可切回二维查看。
- 点击「开启声音」后播放模拟，可听见随所选风暴、镜头变化的合成风雨声。提供音量和静音，暂停后渐静音，后台自动挂起音频。
- 低、自动、高画质；自动档在低帧率时降低像素密度，不保证所有设备达到固定帧率。
- 点击「切换二维」保留同一实验；`?view=2d` 可直接启动二维。WebGL 初始化失败或上下文丢失时自动回退。
- 这一阶段不改变 `model.js` / `rules.js`；不新增完全消散后复活、吞并或藤原效应。
- 浏览器回归：`tests/browser/theater.test.mjs`（3D/声音/回退）与 `scripts/verify-browser.mjs`（经典模式），均支持 `SITE_URL`。需要本机 Puppeteer，`PUPPETEER_MODULE` 与 `CHROME_PATH` 可指定现有安装；产物在本地 `Output/`，不发布。

## v2.1 · 沉浸简洁版

- 默认是全屏地图。名字、类别/编号、等级、风速与气压常驻；「详细观测」打开风圈、曲线、影响与纪事；下拉框切换所有系统。
- 「实验」收纳情景、环境参数、系统列表和地图落点创建；「显示」收纳图层、画质/音量、二维切换、缩放、影院与命名表。原功能不删，Escape 关闭抽屉并返回入口焦点。
- 「创造台风」是常驻主入口，默认只展开初始阶段和路径；经纬度、精确风速与规模可展开「进阶设置」。仍只能在海面生成。
- 增加电影巡航镜头（播放时缓慢绕行）、云层差速旋转、柔边风眼遮罩、侧光与更柔和的眼墙；均为艺术化视觉示意。减少动态效果设置会禁用巡航和入场运镜。
- `?layout=classic` 保留原双侧栏布局用于对照；与 `?view=2d` 可组合。所有布局与渲染模式共享同一模型，没有新增复活或吞并。
- 性能：云面按选中状态/画质/镜头/系统数分级；持久化风圈与路径顶点缓冲、缓存轨迹；标签布局节流；关闭的抽屉不重绘图表，打开时同步当前 frame。
- 同一桌面 Chrome 样本：32→12 个首屏控件；8 系统全域、自动画质为 174200→32344 个三角形（约降低 81%），draw calls 仍为 33。两次帧间隔中位数均约 16.7ms；不代表 FPS 提高 81%，不作设备无关帧率保证。
- 新增 `tests/browser/refinement.test.mjs`（默认布局与操作）和 `tests/browser/performance.mjs`（8 系统预算与采样）；旧回归脚本使用 classic 布局。所有脚本支持 `SITE_URL`。

## 快手内网副本 · 2026-11-09

- 内网地址：https://typhoonlab.frontend-cloud.corp.kuaishou.com/
- 首次版本：https://typhoonlab-9ec8893f.frontend-cloud.corp.kuaishou.com/
- 当前与公网 v2.1.0 使用相同的27个运行文件，不修改应用或气象规则。公网地址和 `npm run deploy` 保持不变。
- 通过 `pde-agent` 的 frontend-cloud CLI 发布；登录使用 `appwrite-cf whoami` / `appwrite-cf login-ks`，禁止使用官方 `appwrite` CLI。无需给应用新增 SDK 或依赖。
- 更新内网：运行 `npm test`、`npm run build`，审查其输出目录后执行 `npx -y --registry https://npm.corp.kuaishou.com/ @codeflicker/frontend-cloud-cli@latest deploy --dir <本次构建目录>`。CLI 自动读取本地 `.static-site-deploy.json`，不要打包整个工作目录。
- 默认 SSO 与白名单访问。管理入口：https://myflicker.corp.kuaishou.com/web-artifacts ，本项目权限：https://myflicker.corp.kuaishou.com/web-artifacts/detail?id=28596&tab=AccessControl 。本次未更改访问权限。
- 验证状态：平台已确认版本；本地33项模型与101项浏览器检查通过。内网未登录请求 HTTP 302 跳转 SSO；独立 Chrome 无登录态，内置浏览器超时，**内网白屏/完整交互回归待已授权浏览器复验**，不视为通过。
- 浏览器脚本仍复用上述三套，指定 `SITE_URL=https://typhoonlab.frontend-cloud.corp.kuaishou.com/` 即切换目标；独立 Chrome 不继承用户登录态，不能仅靠设置地址完成 SSO 后的验证。详见 `docs/deployment.md`。

## 源码仓库 · 2026-11-09

- 完整工程已上传 https://github.com/xiaoxiong20260206/typhoon-lab （Public），包含 `js/`、`styles/`、`assets/`、`scripts/`、`tests/`、`docs/`、`package.json` 与项目文档。
- Pages 从 `main` 根目录发布，运行文件仍位于仓库根：`index.html`、`guide.html`、`favicon.svg`、`assets/`、`js/`、`styles/`。源码目录也会被 Pages 一并提供，但不参与运行。
- `npm run deploy` 已改为**只替换运行文件**：保留仓库中的源码、测试、脚本与文档，不再整体替换文件树。构建产物一旦出现运行目录之外的文件会直接报错。
- 不进入仓库：`.publish/`、`.site-build-*/`、`Output/`、`node_modules/`、`.static-site-deploy.json`、`.env*`。
