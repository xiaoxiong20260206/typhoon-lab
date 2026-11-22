| 用例 | 覆盖页面 | 脚本 |
|---|---|---|
| 三维显示、放大后的全域镜头、镜头模式、声音信号与静音、地理点击、8系统、影院遮挡、回退（27项） | /?layout=classic | theater.test.mjs |
| 经典模式完整模拟规则回归（51项） | /?layout=classic、/guide.html | ../../scripts/verify-browser.mjs |
| 沉浸布局、双阶段台风实验台、严格展示白名单、跨时间轴稳定花名册、默认命名、搜索、恢复、改名、删除、官方/自建双体系、官方中英文名、自然蓝绿地图、移动端与缓存（61项） | / | refinement.test.mjs |
| 创建两台台风并勾选一个官方台风后彻底关闭并重开浏览器，验证保存选择、自定义名称、多选实验、严格展示勾选、官方选择与删除持久化（14项） | /?view=2d | persistence-reopen.test.mjs |
| 旧版保存数据迁入新版，新增台风后同步三份本地记录，彻底重开后从损坏主记录恢复并合并导入旧备份 | /?view=2d | legacy-migration.test.mjs |
| 同条件8系统性能采样与首屏控件计数 | / | performance.mjs |
