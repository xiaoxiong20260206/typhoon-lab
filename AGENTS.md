# 台风模拟器交付约定

- 用户于 2026-11-08 明确要求：本项目发布线上，后续每次完成修改也更新同一个线上地址。
- 仅针对本项目授权，不延伸到其他仓库或网站。修改通过测试后执行 `npm run deploy`，等待 Pages 完成，再检查公网页面，不能只凭上传成功宣布上线。
- 固定发布目标：`xiaoxiong20260206/typhoon-lab`，主分支 `main`。
- 固定访问地址：`https://xiaoxiong20260206.github.io/typhoon-lab/`。
- 远端仅存网页运行所需的公开文件。不得上传开发记录、测试截图、凭证、环境配置或本地个人信息。
- 发布失败时保留已验证的本地修改，明确告知原因；不得宣称线上已更新，不要强制推送或改发其他站点。
- `npm run deploy` 运行模型测试并上传白名单发布包。浏览器验证通过 `scripts/verify-browser.mjs`，设置 `SITE_URL` 可以验证线上地址。

## v2.0 三维表现层维护

- `js/theater.js`、`js/scene-math.js`、`js/sound.js` 与 `styles/theater.css` 承载三维与声音；Three.js r128 和 MIT 许可放在 `assets/vendor/`，运行时不请求 CDN。
- 三维/二维必须共用同一个模拟 frame；本次升级不更改气象规则，不得宣称已支持复活或吞并。
- 三维云高度、云尺寸及风雨粒子有视觉增强，风圈保留原地理半径。三维隐藏二维比例尺和降雨色标，以免误导。
- 声音必须由用户手势开启，暂停渐静音、后台挂起；WebGL 出错须保留实验并切回二维。
- 维护 `tests/browser/theater.test.mjs` 与 `tests/browser/INDEX.md`；发布前后均跑三维和经典模式浏览器回归。截图、设计记录和测试结果只留本地。

## v2.1 沉浸布局与性能维护

- 默认 shell 由 `js/shell.js` 和 `styles/immersive.css` 管理；复用原控件 ID 与事件，不复制第二套模拟状态。`?layout=classic` 保留旧布局，不是另一份应用。
- 抽屉打开时发 `lab:panel-open` 更新当前观测；抽屉关闭不重画重型图表。保持 Escape、焦点恢复、移动端创建与高级选项可达。
- `cloudDetail` 控制网格与粒子预算；风圈、轨迹复用 BufferGeometry；回放倒退时清理未来系统的可视对象，但保留模型历史。
- 默认布局用 `tests/browser/refinement.test.mjs`，旧版交互/声音/回退用原两个 classic 回归脚本；发布前后都验。性能脚本 `tests/browser/performance.mjs` 断言 8 系统不隐藏且三角形 <100000、首屏控件 ≤14。
- 渲染复杂度下降不等于帧率同比上升；不要将三角形降幅说成 FPS 提升。原气象规则与数据仍不变。

## 快手内网同步 · 2026-11-09

- 用户明确要求使用 `pde-agent` 同步部署快手内网；公网固定目标与原发布约定保持不变。内网项目 `typhoonlab`，地址 `https://typhoonlab.frontend-cloud.corp.kuaishou.com/`，不要另建重复站点。
- 使用 PDE Agent 的 frontend-cloud 流程；先 `appwrite-cf whoami`，鉴权失效只使用 `appwrite-cf login-ks`。不使用官方 `appwrite` CLI。
- `npm run deploy` 仍仅负责 GitHub Pages。内网同步先测试、`npm run build`，复审本次输出目录后执行 `npx -y --registry https://npm.corp.kuaishou.com/ @codeflicker/frontend-cloud-cli@latest deploy --dir <本次构建目录>`；不得上传整个工作区。
- `.static-site-deploy.json` 由部署 CLI 生成，仅本地保存，不上传公网；README、CHANGELOG、测试与截图也不发布。
- 内网默认快手 SSO + 白名单；未经用户明确要求，不更改访问权限。权限后台：`https://myflicker.corp.kuaishou.com/web-artifacts/detail?id=28596&tab=AccessControl`。
- 首次内网版本 `9ec8893f` 已由平台确认，27 个运行文件与公网 v2.1.0 发布包一致；本地33项模型、101项浏览器检查通过。内置浏览器超时，独立 Chrome 被 SSO 门禁阻挡，线上应用验收尚未完成，不能把登录页或上传成功算作白屏回归通过。
- 复验继续复用 `tests/browser/refinement.test.mjs`、`tests/browser/theater.test.mjs`、`scripts/verify-browser.mjs`，设置 `SITE_URL=https://typhoonlab.frontend-cloud.corp.kuaishou.com/`。独立临时 Chrome 没有用户登录态，完整内网验收需要可用的已授权浏览器；不得复制凭据或放宽访问权限绕过门禁。

## 源码仓库与发布边界 · 2026-11-09

- 完整工程已提交到 `xiaoxiong20260206/typhoon-lab`；本地目录现在是 Git 工作副本，`main` 跟踪 `origin/main`。
- 仓库同时承载源码与站点运行文件：`index.html`、`guide.html`、`favicon.svg`、`assets/`、`js/`、`styles/` 必须留在根目录，Pages 从根目录发布。
- `npm run deploy` 只替换上述运行文件，复用并保留源码、测试、脚本与文档。构建输出若出现运行目录以外的文件，脚本会报错，不再整体替换文件树。
- 提交前运行 `npm test`；上线后必须核对公网运行文件哈希与本地构建一致，并用 `scripts/verify-browser.mjs` 做真实浏览器检查，不能只看推送成功。

## v2.2 历史创建与多选演示维护

- 本地历史只使用 `localStorage` key `typhoon-lab-session-v1`，由 `js/history.js` 负责清洗与读写；不得接入账号、云端或跨设备同步。
- 创建成功立即保存；刷新后恢复情景、环境、回放时刻、历史和演示选择。切换情景保留历史但清空当前演示选择；撤销同步删除最后一条历史。
- 历史列表位于实验抽屉/左侧实验面板，可折叠：沉浸布局默认展开，classic 默认收起以保护「创造台风」入口首屏可见。勾选多个历史系统只是加入同一模拟 frame，不实现吞并、复活或相互作用。
- 坏数据、隐私模式、容量不足必须安全降级并提示，不得阻断模拟。历史最多读取500条。
- 维护 `tests/history.test.mjs`；`tests/browser/refinement.test.mjs` 必须覆盖创建即时保存、刷新恢复、多选演示、移出和重新加入。发布前继续跑经典 51 项、三维 26 项与性能预算。

## v2.2.1 自动保存与缓存维护

- GitHub Pages 返回 `Cache-Control: max-age=600`。构建必须为 CSS、入口脚本、本地 ES module import 和 JSON 数据请求注入内容哈希版本；不得退回无版本资源 URL。
- 主界面的 `historyButton` 必须只在存在历史时显示，并直接打开/滚动到历史勾选列表；顶部 `buildTag` 是用户识别新旧页面的版本标记。
- `storageAvailable()` 必须真实探测 `localStorage`；保存失败时列表只能显示“未持久保存”，不得声称自动保存已生效。
- 发布前必须运行 `tests/browser/persistence-reopen.test.mjs`。该测试使用固定 `userDataDir` 创建两台台风、彻底关闭浏览器、再启动同一配置验证历史与多选；仅 `page.reload()` 不算通过。
- 发布后若用户仍见旧版，先检查页面顶部是否有 `v2.2.1`，并核对 HTML 引用的资源版本；不要仅凭上传成功或 CDN 返回 200 宣布生效。
- 当前公网提交 `f2e3c56d952bec9202c5d504bd2f516d56382a32`，资源版本 `da7166334ba9`；内网最新版本 `7cbcdcfd`。内网匿名访问仍是 SSO 302，应用渲染验收未完成。
