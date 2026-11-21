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

## v2.3.0 深海仪表视觉维护

- `styles/polish.css` 是沉浸布局最后一层纯视觉覆盖；不得在其中复制第二套 DOM、事件或模拟状态。`?layout=classic` 保留原控件外观。
- 所有下拉框必须使用 `appearance:none`、统一自定义箭头、7px 圆角和明确 hover/focus/disabled 状态；移动端实际字号不低于 16px，触控高度不低于 44px。
- 顶部主操作保持在 `#sceneActions` 单一控制轨内；风暴摘要必须有独立暗色底板，保证任意云图背景下可读。时间轴琥珀进度只表达回放位置，不改模型时间。
- `tests/browser/refinement.test.mjs` 必须继续断言可见下拉框外观、主控制轨、工坊控件、移动端字号与触控尺寸，并覆盖桌面/移动端单屏无溢出。
- 本轮只改变表现层；不得把视觉升级表述为新气象规则、FPS 提升或已经支持复活/吞并。
- 当前公网 v2.3.0 提交 `ddd04c399cc2983d87ae61b88c95f2fcb82f6b26`，资源版本 `0ec2d7169093`；Pages 工作流 `44877222463` 成功。
- 当前内网版本 `cdef1d71`，上传 29 个运行文件；固定地址和版本地址未登录仍返回 SSO 302，内置浏览器等待 90 秒超时，**内网应用渲染验收仍未完成**。

## v2.4.0 自定义命名与地图展示多选维护

- `js/naming.js` 负责自建系统名称的 NFKC、控制字符清理、空白压缩与 20 个 Unicode 字符上限；自定义名称立即显示，但不得写入、消耗或重排 `assets/names.json` 的 140 名官方表。
- 官方命名仍只由 `js/model.js` 在热带风暴门槛按表序领取；统计“下一名”时必须排除 `custom=true` 的系统。不要为了自定义名称修改官方命名表，也不要让它挤占官方序号。
- `state.visibleStorms` 只过滤交给 `map.frame` 的展示对象，`run.frames` 必须保留全部系统继续演化、编号和命名。二维、三维共用过滤后的同一个 frame，不得复制第二套模拟状态。
- 展示集合使用稳定 `sourceId`，基础系统固定为 `base`，历史系统使用历史记录 id。至少保留一个展示系统；取消当前选中项的展示时必须自动选择仍可见的系统。
- 自定义名称与展示集合都必须由 `js/history.js` 清洗并持久化到 `typhoon-lab-session-v1`。坏数据、过期 id 或空集合要安全降级，不得阻断模拟。
- 维护 `tests/naming.test.mjs`；`tests/browser/refinement.test.mjs` 覆盖自定义创建、展示多选、地图/3D 同步过滤、“仅当前”“全部”和移动端浮层；`tests/browser/persistence-reopen.test.mjs` 必须彻底关闭并重开浏览器验证两者恢复。
- 当前公网 v2.4.0 提交 `2e25cbb35999fa4eecfae53eec4d184a26211df3`，资源版本 `d79f98f758ed`，Pages 工作流 `44880437597` 成功；30 个运行文件与本地发布包一致，公网完整浏览器回归通过。
- 当前内网版本 `edef2329`，上传 30 个运行文件；固定地址和版本地址仍未登录返回 SSO 302，Electron 内置浏览器 45 秒超时，**内网应用渲染验收仍未完成**。

## v2.5.0 台风实验台维护

- `js/library.js` 与 `styles/library.css` 承载统一「台风实验台」；顶部 `stormLibraryButton` 打开“实验中的台风”，风暴卡 `historyButton` 打开“我的创建”，两者复用同一个原生 dialog 与同一份模拟状态。
- “实验中的台风”控制交给 `map.frame` 的展示对象；“我的创建”勾选调用原有 `toggleHistory`，用保存的 seed 重新加入/还原系统。取消展示或取消加入都不得删除历史。
- 历史名称必须通过 `cleanCustomName` 与 `isCustomNameTaken` 清洗、限长和去重；默认名称由 `nextCustomName` 生成。改名只更新对应历史 seed 的自定义名称，官方 140 名表仍只由 `model.js` 按门槛和表序领取。
- 删除必须保留二次确认，只移除点击的单条历史，并同步 active/visible 集合、回放选择与 localStorage；不得提供批量误删入口。
- 台风工坊和地图直接落点创建默认使用可编辑的自定义名称；工坊显式选择“官方自动命名”时保持旧命名行为。`createAt` 接收 `nameMode`，不得用空字符串歧义区分两种模式。
- `tests/browser/refinement.test.mjs` 覆盖双分类、默认名称、改名、搜索、移出/还原、二次确认删除、地图/3D 同步与移动端；`tests/browser/persistence-reopen.test.mjs` 必须验证名称、展示、加入选择和删除在彻底关闭浏览器后恢复。
- README、guide 和旧版回归脚本中涉及官方命名顺序的用例，必须在工坊显式选择 `auto`；不能把默认自定义名称误判为官方命名表回归失败。
- 当前公网 v2.5.0 提交 `0e140dd809de2bf8b4bda848804d04e3dcc6cc01`，资源版本 `c6e80bca356e`，Pages 工作流 `44883679151` 成功；32 个运行文件与本地发布包一致，公网完整浏览器回归通过。
- 当前内网版本 `9fd2ea13`，上传 32 个运行文件；固定地址和版本地址未登录仍返回 SSO 302，`myflicker-browser` 45 秒超时，**内网应用渲染验收仍未完成，不计通过**。

## v2.6.0 官方真实台风库维护

- `scripts/prepare-official-storms.mjs` 从本地 `Output/ibtracs.WP.v04r01.csv` 生成 `assets/official-storms.json`；原始 109MB CSV、统计脚本和检查结果不得上传公网或内网。
- 官方目录只收录 1945–2026 年 IBTrACS v04r01 西北太平洋有名称且强度可用、完整轨迹保持在 100°E–180°E、0°N–60°N 的系统，当前 1965 个、129604 个路径点。任何数量变化必须同步 `tests/official-storms.test.mjs` 与说明文档。
- 官方台风是历史最佳路径重放，不是预报或再分析，不得受海温、风切变、环流规模或冷空气参数重算。自建系统仍走原有气象规则；两者共享同一个模拟 frame，但不得声称已实现相互作用、复活或吞并。
- `state.activeOfficial` 保存官方资料 id，`sourceId` 必须为 `official:<IBTrACS_SID>`，并随 `typhoon-lab-session-v1` 清洗和持久化。官方资料只读：只能加入、查看、移出，不得改名、删除或写回 `assets/names.json`。
- 统计“下一名”和官方命名事件必须排除 `official=true` 的系统。官方台风真实名称与编号不消耗 140 名动态命名表。
- `tests/official-storms.test.mjs` 必须覆盖目录完整性、ID 唯一性、坐标强度范围、历史轨迹重放与命名表隔离；沉浸回归覆盖官方搜索、加入、只读约束、2D/3D 同步与移动端；彻底关闭浏览器测试覆盖官方选择恢复。
- 当前公网 v2.6.0 提交 `e6baf408f97dede54ed0b5c4325bdad0ca545d78`，资源版本 `aced45d83ba1`；Pages 工作流 `44886909892` 成功，33 个运行文件与本地发布包一致，公网完整浏览器回归通过。
- 当前内网版本 `aa06d5df`，上传 33 个运行文件；固定地址和版本地址未登录仍返回 SSO 302，`myflicker-browser` 45 秒超时，**内网应用渲染验收仍未完成，不计通过**。

## v2.7.0 官方中英文名与自然蓝绿地图维护

- `assets/official-name-translations.json` 保存 1965 个官方台风的 555 个唯一英文名对应中文名；`scripts/prepare-official-name-translations.mjs` 负责 JMA/HKWW/中文维基/OpenCC 数据合成与繁转简。不要手工改写 `assets/names.json` 的 140 名动态命名表。
- 官方台风在台风库、当前实验、2D 地图标签、3D 标签和观测摘要中同时显示「中文 · 英文」；官方资料仍只读，不能改名、删除或写回 `assets/names.json`。
- 官方台风必须保持 IBTrACS 历史最佳路径重放，不得受海温、风切变、环流规模或冷空气参数重算；`tests/official-storms.test.mjs` 需验证不同实验环境参数下官方重放帧完全一致。
- 2D 地图使用 `js/map.js` 的深蓝海洋、鲜绿陆地、圆角裁切和 1.06 倍构图；3D 场景使用 `js/theater.js` 的自然蓝绿地球色与更亮海洋高光。本轮只改表现层，不改变气象规则、风圈地理半径或模拟 frame。
- 当前公网 v2.7.0 提交 `cdea69826dba15d501008cc2ea0078253d987de9`，资源版本 `92ed7ac2270e`；Pages 工作流 `44893460975` 成功，34 个运行文件与本地发布包一致，公网完整浏览器回归通过。
- 当前内网版本 `6773b108`，上传 `.publish/site-1795256063597` 中 34 个运行文件；固定地址未登录仍返回 SSO 302，`myflicker-browser new_tab` 20 秒 `EXECUTION_TIMEOUT`，**内网应用渲染验收仍未完成，不计通过**。

## v2.8.0 中央气象台轨迹与完整地球维护

- `scripts/prepare-official-cma.mjs` 从 `typhoon.nmc.cn` 获取 2000–2026 有名称台风轨迹；同名同年记录覆盖 IBTrACS，更早记录继续明确标注为 IBTrACS。当前 1979 个风暴、111009 个路径点，其中 CMA 614 个、IBTrACS 1365 个。不得把整个目录统称为中央气象台资料。
- 中央气象台轨迹保留官网原始整点序列，包括时间、经纬度、风速、气压与 `nature`；`source.agency` 必须为 `CMA` 或 `IBTrACS`。2026-11-21 已对 614 个 CMA 记录逐条与官网接口复核，差异为 0。
- `assets/land.json` 保存完整 Natural Earth 1:50m 全球陆地轮廓，2D 视口为 `80°E–180°E / 20°S–60°N`；`js/geo.js` 的城市目录用于 2D 与 3D 共用。可视范围扩大不代表允许模拟系统移出西北太平洋。
- `js/scene-math.js` 使用真实球面投影，`js/theater.js` 使用完整球体、全球贴图、大气层与星空；风暴、云系、风圈和城市标签必须贴合球面，背面标签隐藏。不得把视觉修复表述成新的气象规则。
- 官方台风仍为历史最佳路径重放，不受海温、风切变、环流规模或冷空气参数重算；仍只读，不消耗 140 名动态命名表。
- `tests/official-storms.test.mjs` 固化 CMA 数量、年份、来源名称和 URL；发布前继续运行完整模型、持久化、沉浸布局、三维/声音、经典模式与性能回归。
- 当前公网 v2.8.0 提交 `6494125f8503e68fffab31e048671e8429ec3b0a`，资源版本 `49c5a791b041`；Pages 工作流 `44896389380` 成功，34 个运行文件逐字节一致，公网完整浏览器回归通过。
- 当前内网版本 `ffd815a6`，上传 `.publish/site-1795258339406` 中 34 个运行文件，平台打包 1.74 MB；固定地址与版本地址未登录均返回 SSO 302，`myflicker-browser new_tab` 90 秒 `EXECUTION_TIMEOUT`，**内网应用渲染验收仍未完成，不计通过**。

## v2.8.1 旧版用户数据兼容与自动镜像维护

- 不得修改 `typhoon-lab-session-v1` 主键；`js/history.js` 同时维护 `${SESSION_KEY}-backup`，但读取时以有效主记录为准，避免旧备份复活已删除系统。
- 主键只有 JSON 对象且至少包含 `history`、`scenario` 或 `hour` 之一才视为有效；空壳 `{}`、损坏 JSON 或缺失主键时读取备份。保存时两份记录写同一序列化字符串。
- 旧版缺少 `activeOfficial`、`visibleStorms` 或 `customName` 时按既有默认值迁移；不得因字段缺失丢弃自建历史。
- `tests/browser/legacy-migration.test.mjs` 必须覆盖旧版数据启动、新增记录、备份同步、彻底关闭浏览器、主记录损坏与镜像恢复；`persistence-reopen.test.mjs` 必须断言主备份一致。
- 本地数据不能跨浏览器、公网/内网域名或固定/版本域名自动同步；需要迁移时不得声称已经实现云同步。
- 当前公网 v2.8.1 提交 `7d588eec9625c7a61df4f343c1838f1b7e1e4561`，资源版本 `f105babb07bd`；Pages 工作流 `44913923967` 成功，34 个运行文件逐字节一致，公网完整浏览器回归通过。
- 当前内网版本 `21cb9426`，上传 34 个运行文件，平台打包 1.74 MB；固定地址与版本地址未登录均返回 SSO 302，`myflicker-browser new_tab` 90 秒 `EXECUTION_TIMEOUT`，**内网应用渲染验收仍未完成，不计通过**。
