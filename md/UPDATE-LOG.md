# dsh-purge 更新日志（append-only）

> **这份文件只放「记录」，不放「规范」。**
> 规范/动作 → `UPDATE-GUIDE.md`；这里放：某天发生了什么、实测数值、移植明细、事故复盘、已判定不跟的上游提交。
> 规则：**只追加，不改写历史**。新条目加在 `## 时间线` 的最上面；表格类（附录）可以直接追加行。

---

## 时间线（新→旧）

### 2026-11-02 13:52 文档收尾：加「逐文件差异原因速查」附录 G

- 新增附录 G：把 `local` vs 上游的 21 个非资产文件逐条写清「差什么 / 为什么 / 下次怎么处理」，
  并点名**高发冲突三件套** `lib/core.js`、`lib/net-scope.js`、`package.json` —— 以后 cherry-pick 撞了直接照表解，禁止 `-X theirs`。
- `UPDATE-GUIDE.md` §9 加了指向附录 F（待办）与附录 G（冲突原因）的两行指针。
- 提交前全量自检：语法 0 失败、相对 import 断链 0、`import.meta.url` 断链 0、`node --test` 85/85、文档无冲突标记且不含本机路径。

### 2026-11-02 13:47 补 2 处漏移植 + 立「附录 F 待办清单」

- 复查 `git diff --numstat local upstream-mirror` 时发现两处上游修复没搬（不在 1.1.87/1.1.88 的 diff 里，是更早提交的边角）：
  - `lib/web.js` +10：**#197 重启提示语**（「服务在后台跑，关窗口不会停」）——少这句用户会立刻再开一个 → `EADDRINUSE`；
  - `scripts/ensure-profile-bundle.mjs` +3：**#191** 当 `cordis.patch.yml` 内容不认识时打印提示而不是写坏。
  - 提交 `1ed1662`，85/85 通过，副本重装后 DIFF=0。
- 现状盘点（这是判断「还剩什么」的唯一口径）：`git diff --name-only local upstream-mirror` = **121** 文件
  = 88 `skills/` + 9 `test/` + 3 `md/`（我方资产）+ 7 有意保留 + 3 README + 1 `validate.js`（只留英文文案）+ **9 个欠账**。
- 新增 **附录 F「待办清单」**：把 9 个欠账（红队 `store-core`/`tools`/`skill-fixes`/`skill-availability`/`schema`/`platform-config`、面板文案四件、rc.5 实测、`.ignored` 残留）
  连同「为什么不跟 / 动手前提 / 优先级」列成表；`UPDATE-GUIDE.md` §9 加了指针，防止下次重复提案。

### 2026-11-02 13:35 文档脱敏并纳入 git（`6e60e01`）

- `src\md\` 三份文档正式进仓库（`local` 分支），换机器 clone 即得。
- 脱敏：工作区路径 → `$WS`/`$SRC`，宿主目录 → `<DSH_ROOT>`，用户目录 → `<USERPROFILE>`；正文与本机路径零关联。
- 清理：FORK-GUIDE 删掉已废弃的 `merge --ff-only` 旧流程（702 → 645 行）；allowBuilds 口径统一为 **2 行**；
  两处基线表更新到 1.1.88 / 77-0-6-85 / 副本 189 文件。
- 影响面：`package.json` 的 `files[]` 不含 `md`，安装副本与打包不受影响（仍 189 文件）。

### 2026-11-02 13:25 三份文档迁入 `src\md\`（本机忽略，不进公开仓库）

- 迁移：`dsh-purge\md\` 下三份 → `src\md\`：`FORK-GUIDE.md`(49.1KB/700 行)、`UPDATE-GUIDE.md`(76.5KB/1283 行)、`UPDATE-LOG.md`(24.6KB)；旧 `md\` 空目录已删。
- 路径口径：文档内 `md\X.md` 一律指 `src\md\X.md`（以 `src\` 为根），已在 `UPDATE-GUIDE.md` 顶部写死；`local-*.patch` 导出路径同步改成 `src\md\`。
- 引用修正：根 `README.md` 12 处 `md\` → `src\md\`（并重画目录树）；`FORK-GUIDE.md` 目录树；`scripts\host\restart-host.ps1` 注释 1 处。
- **为什么不提交**：`wyybs/dsh-purge` 是**公开仓库**（匿名访 `github.com/wyybs/dsh-purge` 返回 200），这三份文档含宿主绝对路径、asar 改名流程与破甲细节。
  故写入 **`.git/info/exclude`**（本机忽略，不随仓库走）：`git status` 保持干净、`git ls-files md` 为空、不会误推。
- 影响面：`package.json` 的 `files[]` 不含 `md`，安装副本与打包都不受影响（副本仍是 189 文件）。
- 取舍：文档=本机资产，**不跨机同步**。要同步/公开，先脱敏再改成提交推送（见下条待办）。

### 2026-11-02 11:30 rc.2 实测全绿：77/85 applied、0 pending、0 drifted

- 用 CLI 直读宿主（宿主未运行也能查）：
  `DSH_SURFACE=desktop DSH_BASE="<宿主>/resources/app/dsh/node_modules/@deepseek-ai" node bin/dsh-purge.js --status`
  ⚠️ 宿主目录名带空格（`DeepSeek…`），**硬编码路径必失败**，一律从 `readdirSync('D:/Program Files')` 里取实际名字。
- `--apply` 一次：补上 10 条 pending（#32 #36 #50 #53 #57 #62 #77 #89 #90 #91）。
- 结果分布：**77 applied / 0 pending / 6 na / 1 skipped(#80) / 1 missing_file(#71 梁神预设，预期)**，
  **drifted = 0、write_error = 0**、`errors.log` 不存在、`app.asar` = False、`*.dshpurge.bak` 56→58。
- **幂等实测**：紧接着再跑一次 `--apply` → `✓ 已清洗` 计数 **0**（零写入），
  `dsh-web-app/lib/index.js` 里 #32 的 marker 仍是 2 处（不同上下文），未叠加。
  ⇒ 本轮给 #32 补的 `insertProbe` 在真机上生效。
- 分母变化：文档旧基线 `61/0/5/66` → 现在 **`77/0/6/85`**（补丁总数 66→85，1.1.84–1.1.88 累积）。
- 清理：`node_modules\.ignored\` 删掉 `billion-context_tmp_*`(119.3MB) + 3 份 `dsh-purge.old-*`(14.3MB)，
  保留 `dsh-purge.bak-tarball-20261023`(3.8MB) 作回滚件。

### 2026-11-02 11:26 `e499e03` local: allowBuilds 兼容 pnpm 11.28.5 的 `file:` 依赖

- 现象：1.1.86 #185「只写裸包名」后，第二次 `pnpm install` 直接
  `[ERR_PNPM_IGNORED_BUILDS] dsh-purge@file:D:/…/src`，**postinstall 被跳过** ——
  而自愈逻辑就在 postinstall 里，死锁（exit 1 但文件已拷好，极易误判成功）。
- pnpm 自己回写的键是 `dsh-purge@file:D:/…: set this to true or false`（没引号、值也不对）。
- 修正：`purgePnpmBuildSpecs(profileDir)` = 裸名 + 当依赖是 `file:|link:|portal:` 时追加
  `dsh-purge@<spec>`；`formatAllowBuildLine()` 对含 `:` 的键一律加引号；
  `https://` / 版本键仍不写（守住 #185 的 `ERR_PNPM_INVALID_VERSION_UNION`）。
- 实测：allowBuilds 收敛为 2 行、重复 install 零写入、postinstall 正常、85/85 用例通过。

### 2026-11-02 11:20 移植 1.1.87 + 1.1.88（`3523463` / `a162c8f`，tag `port-1.1.88-20261102`）

- 上游两个提交：`335ddee`(1.1.87 全仓审计加固) + `d1eff01`(1.1.88 rc.2/rc.5 双版本适配)。
- 跟：`core.js`（空 bak 改名 .bad、#6/#7/#8/#10 marker 基线、原子写、optional 软失败、#42 探针、
  rc.2+rc.5 双 pattern）、`index.js`/`identity.js`（停用后还原装配 + 缓存签名纳入红队/策略）、
  `hide-console`/`extract-asar`（原子写、解包越界校验）、`desktop`/`restart-desktop`/`host-clean`/`uninstall*`
  （进程枚举 `|` 分隔 + UTF-8，修中文路径换包杀不掉进程）、`restart-web`+`web-reclaim`+`bin-preflight`
  （#197 孤儿 server 回收）、`update.js`（只允许 https）、`redteam/atomic-write`(新)+`validate`(realpath)+`report-replay`、
  `bin/dsh-purge.js`（CLI 打 applied 戳 #202 + 失败退出码 1）、`package.json`（`dshTargets` = rc.2 / rc.5）。
- 不跟：`net-scope` 再删死代码（本机 `permittedHost` 是活的）、`client.js`/`redteam/{client,ui}` 中文化重排、
  `test/**` 删除、`package.json` 删 `test` 脚本；`mnemon-settings.js` 全仓无引用，随上游删除。
- **回退上游一处**：`rollupPatchStatus` 保留「已写入优先于 drifted」。上游 1.1.83 起让 drifted 压过 applied，
  多文件补丁里「另一个构建产物本来就没这段代码」会把整条判红 → 状态页常年假告警。见 `core.js` 注释 + `test/patch-status.test.js` L41/L45。

### 2026-11-02 11:15 上游 bug：#32 的 rc.5 替换不幂等（已在我们这侧修掉）

- `335ddee`→`d1eff01` 给 #32 加的这条：
  `pattern: "export { Config, apply, inject, internals, name };"` →
  `replace: 同文本 + " // [dsh-purge] …"` —— **replace 产物仍含 pattern 本身**，且没有 `insertProbe`，
  每 apply 一遍就多挂一条注释，永不收敛（正是历史「每次 +841 字符」事故的形态）。
- 上游 1.1.87 刚把 `test/` 目录删了，所以它自己的幂等用例挡不住这一条。
- 我们补 `insertProbe: "// [dsh-purge] web surface identity neutralized"` → 第二次起跳过。
  单测 `applyReplacementsToText: 全部字面量 pattern 二次应用不叠加` 恢复通过；真机二次 `--apply` 零写入（见 11:30 条）。

### 2026-11-02 11:12 基线异常三连（本轮起点）

- 副本落后：源码 198/199 文件 vs 副本 184（`DIFF 8`、`MISSING 17`，含 `anchor.js`/`bin-preflight.js`/`subagent-control.js`
  三个新文件全缺），副本 mtime 停在 10-29 14:06 —— 昨天在另一台机器上的 1.1.86 port 没进本机副本。
- 断链：`lib/bin-preflight.js` 引 `./web-preflight-entry.js`，但 `local` 树里没有这个文件（也没有 `web-reclaim.js`）
  ⇒ `installBinPreflight()` 恒返回 `error:ENOENT`，#197 的功能静默不生效、不报错。
- 补丁总数已从 66 变 85（`1bdf239` 的 `core.js` 里就有 85 条），文档 §0 的 `61/0/5/66` 已过时。

### 2026-11-02 11:10 `b771e39` port: 补回 1.1.86 漏移植的 `lib/web-preflight-entry.js`

- 从 `1bdf239` 取原文件（156 行 / 5129 字节），修掉上面那条断链；该文件只 import `node:fs|os|path|child_process`，
  **自包含**，不需要 `web-reclaim.js`（那个是 1.1.87 `restart-web` 才用）。
- 静态检查：相对 import 断链 0、`new URL(import.meta.url)` 断链 0；`node --test` 85/85。

### 2026-10-29 14:26 文档重构：规范与记录分家
- `UPDATE-GUIDE.md` 瘦身：§9 变更日志、§9.1 逐文件评估、已知未跟表、基线历史叙述、事故复盘全部搬到本文件。
- 新增写作约束（guide §0.1）：一条背景说明最多一行，超了进 log；每次巡检只往 log 追加，不改 guide 正文。
- 结果：guide 从 1380 行降到约 600 行，本文件承接全部历史。

### 2026-10-29 14:21 巡检结论：上游 1.1.82，用户选 B（全不跟）
- 上游 `0c933dc` 自 14:13 起无新提交；`dshTarget` 仍 `0.2.1-rc.2`，README 仍写 rc.3+ 不支持 ⇒ 不能升 DSH。
- 唯一可选项 `stripToolFilter`（`lib/redteam/index.js` +38/−3，防御性修复）经用户决定**不跟**，已登记到附录 B。
- 基线：`61/0/5/66`、副本 184 / skills 88、`allowBuilds` 3 键、`app.asar`=False、无 `errors.log`、`*.dshpurge.bak` 56。
- 零改动。

### 2026-10-29 14:20 移植 1.1.82 `#180`（`c7ab58e`，tag `v1.1.82-wyybs-port4`）
- 上游 1.1.82 线是**净化版**：`skills/` 0 文件、`RANGE_HOSTS` 32→0、`permittedHost(){return false}`、`files[]` 去 `skills`、`readPkgTarball()` 写死 `codeload…YuJunZhiXue/master`、`default-prompt-inject` 把「外挂/注入」条款改成禁止、POC 知识库整体下架（`poc_*` 8 个工具变空壳）。
- **只取 `#180`**，改动文件 `lib/profile-insert.js` + `test/profile-insert.test.js` + `release-notes.md`：
  - `parseAllowBuildLine` 改为「冒号+空白」定位分隔符，URL / `file:` 键不再被第一个冒号截断；
  - 含 `:` 的键写回加双引号，round-trip 无损；
  - 期望键优先取 `pnpm-lock.yaml` 实际解析的 tarball URL，**保留** profile `file:` spec 来源与 `wyybs/local` 兜底；
  - 畸形/过期 `dsh-purge@*` 历史键自愈清理；非 purge 重复键只留第一份；注释行保留；
  - 新增 `validateAllowBuildRewrite()`，写盘前校验，不过就不写；健康文件零写入。
- 测试：`node --test` 全量 **36/36 通过**（新增 13 条 + 原有 23 条）。
- 装机：删副本重装 exit 0；副本 184 文件、`skills\` 88、逐文件 `same=181 diff=0`、version 仍 1.1.73；`allowBuilds` L14-16 三键（双引号形态）。
- 镜像：`upstream-mirror` 由 `160b911` **重建**到 `0c933dc`（上游重写历史，非 ff），旧点存 `upstream-mirror-backup-20261029`；新增快照 tag `upstream-snapshot-20261029-0c933dc`；全部 push。
- 补丁层复查：`61 / 0 / 5 / 66`、`sealed=false`、`lost=false`。

### 2026-10-29 14:13 文档新增 §0.0 触发协议
- 约定「读下这个文档 / 跑一遍」= 连续执行 8 步（基线 → 闸门 → 拉上游 → 对齐镜像 → 算差异 → 判性质 → 按模板汇报 → 等圈定）。
- 三种收尾：无新东西（一句话+实测值）/ 有新东西（该跟·不该跟两栏 + A~E）/ 基线异常（先讲异常）。
- 明令禁止：只回「已阅读」、反问「要做什么」、不 fetch 就断言没更新、等指令前动文件。

### 2026-10-29 14:05 文档新增判定规则三件套
- §1.2.3「判定优先级」：增强/修复跟；收窄/删除/写死地址/默认关闭不跟（即使 `core.js` blob 变了）；仅适配宿主必须跟；纯文档不跟。
- §1.5.1「能力基线」：64 工具、`RANGE_HOSTS` 32、`permittedHost` 不得 `return false`、写死地址检查等。
- §2 汇报模板加「提交」「性质」列与性质分布统计；修正「blob 变了必须跟」的绝对化表述；删掉 §1.2.1 末尾重复文字。

### 2026-10-28 15:12 补丁层恢复，运行层验收通过
- `app.asar` → `app.asar.bak`（**用户手动改名**），`resources\app\` 完整；补丁 **61 applied / 0 pending / 5 skipped / 66 ready**。
- `/dsh-purge/status`：`asar_still_sealed=false`、`patches_lost=false`、`ready=true`。
- 宿主 6 进程命令行全部走 `app\`；`dsh.cmd --version` = `0.2.1-rc.2` exit 0；`errors.log` 不存在。
- `resources\app-update.yml` → `app-update.yml.disabled`（掐断 nightly）；计划任务 `dsh-purge-swap-now` / `dsh-purge-swap` 已删除。
- 教训：这类 swap 操作**第一轮就交给用户**（见附录 D）。

### 2026-10-28 12:05 `pwsh` 恢复；`spawn EPERM` 根因是杀软
- 之前一整天 `spawn EPERM` 的根因是**杀毒软件**拦 `CreateProcessAsUserW` 的受限令牌通道，**不是** DSH 的 AclSandbox 配置。
- 处置：临时关/加白杀软即可。以后再遇到 `spawn EPERM`，先查杀软，别先改沙箱策略。

### 2026-10-28 rc.3 事故（已闭环）
- 宿主被 nightly 通道自动升到 **rc.3** → 起不来 → 用户**手动降回 rc.2** → 重走 apply 解包 → 用户手动把 `app.asar` 改名 `.bak` → 重启 → 补丁 61/66 生效。
- 上游 README 明确写「不支持 DSH 0.2.1-rc.3 及更新」；`app-update.yml` 改名 `.disabled` 掐断 nightly。

### 2026-10-28 11:20–11:55 移植 1.1.80 / 1.1.81
- `1f0727f`（1.1.80 / `9a8e848`）：`lib/skills.js` 补 `fs` 导入（#172）、`zip-extract` 目录条目先 mkdir（#170）、`profile-insert` allowBuilds 重写（#168）、按钮字体修复（#169）。
- `b14e956`（DSH NEXT + 单测 / `a0005ac`）：`surface.js` / `desktop.js` / `official-update.js` / `restart-desktop.js` 加 DSH NEXT 识别；新增 5 个单测；删两份草稿文档。
- `b124add`（1.1.81 notes / `160b911`）：纯文档。
- `efcc00c`（`local:`）：`files[]` 加 `skills` + `install:skill`，防 `skills/` 被白名单吞掉。
- `0f7ba6c`（`local:`）：修上游 `parseAllowBuildLine()` 的冒号截断真 bug。
- `node --test`：23 / 23 通过。

### 2026-10-27 移植 1.1.78 / 1.1.79 / #108 / #157 #154 #155 / #162 #159
- `a6786ee`（`5d4b45c`）：停用/卸载清 `selectedDefault`。
- `becd6aa`（`671011a`）：`atomicWrite` 保留权限、`healCopiedLauncher` 软链自愈、`shimFileStatus`、`desktopCliEntryPatched`、引入 `ensure-profile-bundle.mjs`。
- `a114362`（`af7cd22`）：命令撞名只丢一条、引入 `lib/profile-insert.js`。
- `5f7bbc2`（`24f4a7f`）：1.1.79 稳定性、apply 进度条、`core.js` atomicWrite 权限补全。
- 同日晚些时候：宿主被 nightly 升 rc.3 → 起不来 → 用户手动降回 rc.2（事故详见上一条）。

### 2026-10-23 首次建链
- `d246244`（`local:`）：`dsh.install` 三处地址 `YuJunZhiXue` → `wyybs`。
- `6667999`（`6cb2ac3`）：红队 preset schema seal，修 64 工具只成 56 个。
- 当天 18:10 踩到「`file:` 依赖不感知内容变化」的坑（见附录 D）。

---

## 附录 A：变更日志（移植与定制全表）

| 时间 | 提交 | 类型 | 来源 | 内容 |
|---|---|---|---|---|
| 2026-10-29 14:20 | `c7ab58e` | `port:` | 上游 `0c933dc` | 1.1.82 只取 #180：`parseAllowBuildLine` 改「冒号+空白」切分、含 `:` 键写回加双引号、期望键优先取 `pnpm-lock.yaml` 实际 URL、历史键自愈、非 purge 重复键去重、写前 `validateAllowBuildRewrite`、健康文件零写入；新增 13 条单测。剥离掉：写死 `codeload…YuJunZhiXue/master`（保留 `wyybs/local`）、删 `file:` 依赖来源（保留）；`skills/` 清空、`RANGE_HOSTS` 32→0、`permittedHost(){return false}`、`files[]` 去 `skills` 一律不跟 |
| 2026-10-28 11:55 | `0f7ba6c` | `local:` | 自制 | 修上游 `parseAllowBuildLine()` 真 bug：非贪婪 `(\S+?)` 在第一个冒号处截断（`dsh-purge@file:D:/…` → `dsh-purge@file`），每轮 postinstall 写回坏键导致 `ERR_PNPM_IGNORED_BUILDS` 死循环 |
| 2026-10-28 11:40 | `efcc00c` | `local:` | 自制 | `files[]` 加 `"skills",`，`scripts` 加 `"install:skill"`；上游 `a0005ac` 的 `files[]` 漏了 `skills`，装出来 `skills\` 是空目录且不报错 |
| 2026-10-28 11:35 | `b124add` | `port:` | 上游 `160b911` | 1.1.81 release notes + README 版本号（无代码改动） |
| 2026-10-28 11:30 | `b14e956` | `port:` | 上游 `a0005ac` | #174 识别 DSH NEXT 桌面；新增 5 个单测 + `test` 脚本；删两份草稿文档 |
| 2026-10-28 11:20 | `1f0727f` | `port:` | 上游 `9a8e848` | 1.1.80：`skills.js` 补 `fs`、`zip-extract` 目录条目、`profile-insert` allowBuilds 重写、按钮字体修复；`readPurgeTarball()` fallback 改 `wyybs` |
| 2026-10-27 13:50 | `5f7bbc2` | `port:` | 上游 `24f4a7f` | 1.1.79 稳定性：DS Bot 识别、pnpm12 allowBuilds、升级后补 bundles+insert、apply 进度条、`core.js` atomicWrite 权限 |
| 2026-10-27 13:48 | `a114362` | `port:` | 上游 `af7cd22` | 命令撞名只丢一条；引入 `lib/profile-insert.js` |
| 2026-10-27 13:47 | `becd6aa` | `port:` | 上游 `671011a` | `atomicWrite` 保留权限、`healCopiedLauncher`、`shimFileStatus`、`desktopCliEntryPatched`、`ensure-profile-bundle.mjs` |
| 2026-10-27 13:45 | `a6786ee` | `port:` | 上游 `5d4b45c` | 停用/卸载时 `selectedDefault` 清回 `standard`（#108 前半） |
| 2026-10-23 18:05 | `6667999` | `port:` | 上游 `6cb2ac3` | `lib/redteam/tools.js` 补 `additionalProperties` + `sealObjectSchemas()`；修 64 工具只成 56 个 |
| 2026-10-23 16:20 | `d246244` | `local:` | 自制 | `dsh.install` 三处地址 `YuJunZhiXue` → `wyybs` |

---

## 附录 B：已知未跟的上游提交（评估过，主动跳过）

| 上游提交 / 范围 | 内容 | 为什么不跟 |
|---|---|---|
| 1.1.82 线 `lib/redteam/index.js` `stripToolFilter()`（+38/−3） | 加载预设前剥掉残留 `toolFilter` key | **2026-10-29 14:21 用户选 B：不跟。** 本机预设里 `toolFilter` 已是注释、模板无真 key，纯防御性；真踩到再单 port |
| `1.1.82` 净化线：`skills/` 全清空 + `files[]` 去 `skills` | 上游 `skills/` 0 文件（我们 88：`paper-autopilot/` + `redteam/` 24 篇） | 功能删除。跟了红队技能库消失且 install 不报错 |
| `lib/net-scope.js`：`RANGE_HOSTS` 32→0、`permittedHost(){return false}` | 靶场放行逻辑整根拆掉 | 能力阉割（原 `51afafd`/`5a9b8e1`/`ac58b3e` 已并入主线）。跟了只剩 localhost |
| `lib/redteam/tools.js` + `store-core.js` + 面板：POC/EXP 知识库下架 | `poc_search/list/get/save/update/delete/use/stats` 全部返回「开源版已下架知识库」 | 功能删除。跨靶标 POC 复用与回填全废 |
| `lib/default-prompt-inject.zh/en.md`：外挂/注入条款改「禁止」 | 从「本地测试，完整实现和绕过说明」改成「禁止。不实现、不绕过、不给步骤」 | 提示词层收窄，跟了等于自废破甲/注入放行 |
| `readPkgTarball()` 写死 `codeload.github.com/YuJunZhiXue/dsh-purge/tar.gz/refs/heads/master` | 安装源兜底改回上游 master | 破坏 `wyybs/local` 钉住（`c7ab58e` 保留我们的地址） |
| 1.1.82 删掉 `purgePnpmBuildSpecs()` 的 `file:` 依赖来源 | 期望键只留 lock URL + 包内 tarball | 本机 `file:D:/…/src`，删了会少一个键 → `ERR_PNPM_IGNORED_BUILDS`（`c7ab58e` 保留） |
| `ba12c91` | `strip leftover toolFilter from installed redteam presets`（`lib/redteam/index.js` +38/−3） | 本机预设 L319 的 `toolFilter` 已是注释、模板无真 key，重装不复活；纯防御性 |
| `51afafd` / `5a9b8e1` / `ac58b3e` | 靶场门禁收窄（RANGE_HOSTS 32→0、`permittedHost return false`、公网长任务拦截） | 能力阉割，跟了公网靶场只剩 localhost；用户明确「收窄的不跟」 |
| `dbaf377` | pnpm 适配：地址改 codeload + postinstall 写 bundles | 破坏 wyybs/local 钉住；bundles 写入已由 `ensure-profile-bundle.mjs` 覆盖 |
| `6980fe2` | 修市场一键安装 `already queued` | 我们不走市场；`cordis.patch.yml` 已取上游侧，等效达成 |
| `fd109e1` | 纯版本 bump 1.1.77→1.1.78 | 永不改 version 字段（插件拿它当状态键） |
| `335ddee`(1.1.87) `lib/net-scope.js` −31 行 | 删掉 `permittedHost` / `isOwnNetwork` / `readAllowExact` / `allowDecision` / `allowCache` | **再次不跟。** 上游那侧这些已是死代码，本机 `permittedHost(host, allow)` 仍在 32 条放行名单上跑；跟了公网靶场只剩 localhost |
| `335ddee`(1.1.87) 删 `test/**` 11 个文件 + `package.json` 的 `test` 脚本 | 宣称「发布 CI 只做语法检查」 | **不跟。** 本机 85 个用例是唯一的回归网；本轮就靠它抓出 #32 幂等 bug |
| `6f9c500`(1.1.83) 起 `rollupPatchStatus` 让 `drifted` 压过 `applied`/`already` | 状态汇总优先级调整 | **回退。** 多文件补丁里「另一个构建产物本来不含这段代码」会被判红 → 状态页常年假告警，真漂移被淹。保留「已写入优先」，`a162c8f` 里写明 |
| 1.1.84 起 `client.js` / `lib/redteam/{client,ui}` 红队面板中文化重排 | 英文文案 → 中文，配套 CSS | **不跟（文案层）。** 本机保留现面板；这三个文件连同 `store-core`/`tools`/`score-rules`/`platform-config` 仍停在 1.1.73–1.1.82，属遗留项，需单轮做（`store-core`/`tools` 里含本机 POC 知识库，**不能整文件覆盖**） |

---

## 附录 C：上游 1.1.80 / 1.1.81 逐文件评估（2026-10-28，同日 11:45 全部移植）

上游三个提交：`9a8e848`（1.1.80）、`a0005ac`（DSH NEXT 识别 + 单测）、`160b911`（1.1.81）。
移植结果：`9a8e848`→`1f0727f`、`a0005ac`→`b14e956`、`160b911`→`b124add`（tag `v1.1.81-wyybs-port3`）。

| 文件 | 上游改了什么 | 结论 | 落地情况 |
|---|---|---|---|
| `lib/skills.js` | `import { promises as fsp }` → `import fs, { promises as fsp }` | 跟（P0） | #172 真 bug：`fs` 未导入导致「软链重叠守卫」抛 ReferenceError，守卫从未生效 |
| `lib/zip-extract.js` | 新增 `isZipDirectoryEntry()`，目录条目先 `mkdirSync` | 跟（P0） | #170 真 bug：目录条目被当文件写，同名导致 `EEXIST` |
| `lib/profile-insert.js` | 新增 `purgePnpmBuildSpecs` / `parseAllowBuildLine` / `rewritePnpmAllowBuilds` 等，重写 `ensurePnpmAllowBuild` | 跟（P0） | 已跟，并额外修掉上游冒号截断 bug（`0f7ba6c`）；`readPurgeTarball()` fallback 改 `wyybs` |
| `lib/surface.js` | 三处加 `dsh next` / `dsh-next` / `DSH NEXT.exe` 识别 | 跟（P1） | #174，纯增量零风险 |
| `lib/desktop.js` | +35/−7：桌面识别函数与三处内嵌 PowerShell 全加 DSH NEXT；`ASAR_SWAP_PS1` 的 `$names` 也改 | 跟（P1） | 配套 #174；与我们的 `restart-host.ps1` 互不影响 |
| `lib/official-update.js` | `harnessExeName()` 加 `dsh next.exe` / `dsh-next.exe` | 跟（P1） | 配套 #174 |
| `lib/restart-desktop.js` | `listDesktopPids()` 的 `images` 加 `"DSH NEXT.exe"` | 跟（P1） | 配套 #174 |
| `client.js` | `.dshp-btn` 字体/实色修复 + 32 行 CSS 强制按钮字体 | 跟（P1） | #169：宿主图标字体 / `font-size:0` / `color:transparent` 会把按钮文字吃掉 |
| `lib/redteam/client.js` | 同上 CSS（红队面板） | 跟（P1） | 配套 #169 |
| `package.json` | version 1.1.79→1.1.81；新增 `"test": "node --test"` | 只跟 `test` 脚本 | version 保持 1.1.73 |
| `README*.md` | 版本号文案 + 明确「不支持 DSH 0.2.1-rc.3 及更新」 | 跟 | 印证 rc.3 起不来是上游未适配 |
| `release-notes.md` | 新增 1.1.80 / 1.1.81 两节 | 跟 | 纯文档 |
| `test/*.test.js`（5 个） | 单测 23 条 | 跟 | 实测 23/23 通过；`files[]` 不含 `test/`，只当回归护栏 |
| `docs/修改文档.md` / `docs/注入方式改造方案-1.1.34化.md` | 被删除（619 行） | 跟（接受删除） | 上游清理草稿，与我们 `md/` 无关 |
| `.gitignore` | 追加 `*.bak` | 跟 | 无害 |
| `lib/core.js` / `update.js` / `index.js` / `net-scope.js` | 零改动 | —— | 补丁定义层没变，不影响 61/66 |

结论：#172 / #170 / #168 / #169 都是真 bug，#174 是零风险新功能；补丁定义层零改动。

---

## 附录 D：事故复盘（踩过的坑，写清根因）

### D1. `file:` 依赖不感知内容变化（2026-10-23 18:10）
- 现象：源码改了 `lib/redteam/tools.js`（SHA 变化），直接 `pnpm install` 输出 `Packages: +1 -27`、exit 0，但 `node_modules\dsh-purge` 里仍是旧文件。
- 根因：`file:` 在 lock 里的 `resolution` 只记 `directory` 路径，pnpm 判定「已装过」就跳过，不比对内容。
- 处置：**先删副本再装**（`Remove-Item -LiteralPath $inst -Recurse -Force`），装完逐文件比 SHA256。

### D2. `files[]` 白名单吞掉 `skills/`（2026-10-28 11:30）
- 现象：装完 `skills\` 是空目录（0 文件），红队技能全丢，`pnpm install` 不报任何错。
- 根因：上游 `a0005ac` 的 `package.json` `files[]` 没有 `skills`，npm 打包只认白名单。
- 处置：`efcc00c` 加 `"skills",`；装机后必须数 `(Get-ChildItem "$inst\skills" -Recurse -File).Count` = 88。

### D3. `ERR_PNPM_IGNORED_BUILDS` 死循环（2026-10-28 11:40）
- 现象：`pnpm install` exit 1 报 `Ignored build scripts: dsh-purge@file:D:/…`（但文件已拷进去，容易误判成功）；`pnpm-workspace.yaml` 里被写回 `dsh-purge@https: true` 这类截断键。
- 根因：`parseAllowBuildLine()` 用非贪婪 `(\S+?)`，在第一个冒号处截断 `dsh-purge@file:D:/…` → `dsh-purge@file`；每轮 postinstall 都把坏键写回。
- 处置：`0f7ba6c` 改值锚定 + 贪婪键 + 引号；`c7ab58e` 再升级为「冒号+空白」切分 + 写前校验 + 自愈清理。
- 备注：`pnpm 11.28.5` **不支持** `--allow-build`；正确机制是 profile 的 `pnpm-workspace.yaml` → `allowBuilds` 段 3 行键。

### D4. `spawn EPERM`（2026-10-28 12:05）
- 根因：杀毒软件拦 `CreateProcessAsUserW` 的受限令牌通道，**不是** DSH AclSandbox 配置。
- 处置：临时关/加白杀软。别再先改沙箱策略。

### D5. rc.3 升级把补丁层清空（2026-10-28）
- 现象：nightly 自动升 rc.3 后宿主起不来；`app.asar` 被放回、`resources\app\` 被删、连 `app.asar.bak` 也被清；`/purge status` 报 `ai_base=null`、`applied=0`。
- 处置：用户手动降回 rc.2 → 应用内 `/purge apply` 解包 → 完全退出宿主与 WorkBuddy → 手动改 `app.asar` 为 `app.asar.bak` → 重开。
- 预防：`app-update.yml` 改名 `.disabled`；升级顺序永远「上游适配 → 我们 port → 我们通知」。

---

## 附录 E：为什么 `master → local` 会变成「混合清单」（推演记录）

`git checkout <ref> -- <file>` 是**整文件覆盖**，不是增量插补（git 没有「只取某个 hunk」的语义，那是 `git apply` 的事）。所以：

- 每次部分更新后，被搬的文件变成**上游版本**，它和 `master` 的差异归零，从 diff 里消失；
- 但 `master → local` 会**多出一个文件条目**，而这个文件装的是上游代码，不是我们的定制；
- 做几次之后，这个 diff 变成「本地定制 + 上游移植」混在一起，**区分不出来了**。

差异不会越积越多（每次是覆盖，不是叠加），但**含义会变糊**。结论：判断「要不要更新」只用
`git diff --stat local upstream-mirror`；判断「我们的定制有哪些」只用 `git log --grep='^local:' local`。
`master → local` 的数字不作任何决策依据。

---

## 附录 F：待办清单（未移植 / 待验证，2026-11-02 立）

> 判据：`git diff --name-only local upstream-mirror` 共 **121** 文件 = 88 `skills/` + 9 `test/` + 3 `md/`（我方资产，永不跟）
> + 7 有意保留 + 3 README + 1 `validate.js`（只留英文文案）+ **下面这 9 个欠账**。

| # | 待办 | 现状 | 为什么不跟/没做 | 动手前提 | 优先级 |
|---|---|---|---|---|---|
| 1 | `lib/redteam/store-core.js`（+306/−318） | 停在 1.1.73 | 上游 1.1.82 起把 POC 知识库整体下架成空壳；本机 `searchPocs`/`pocStats`/`getPoc`/`markPocUsed` 全在里面，**整文件覆盖 = 知识库报废**，必须逐 hunk 合并 | 宿主开着（要回归红队面板） | P1：真正收益是 `listEngagements` 统计入参 + `evidenceLimit`，大证据不再拖慢面板 |
| 2 | `lib/redteam/tools.js`（+19/−15） | 停在 1.1.73 | 同上，`poc_*` 8 个工具的实现在这 | 与 #1 同一轮 | P1：`listVulns` 传 `evidenceLimit`、`listEngagements({stats:true})` |
| 3 | `lib/redteam/skill-fixes.js`（+230/−218） | 停在 1.1.80 前 | 上游技能修复逻辑演进，本机未跟 | 需确认不影响现有技能加载 | P2 |
| 4 | `lib/redteam/skill-availability.js`（+13/−13） | 同上 | 同上 | 同上 | P2 |
| 5 | `lib/redteam/schema.js`（+15/−15） | 同上 | 同上 | 同上 | P2 |
| 6 | `lib/redteam/platform-config.js`（+16/−16） | 停在 1.1.82 | 1.1.87 起改用 `atomic-write.js`（该文件已跟），本文件未跟 | 低风险，可先单独跟 | P2 |
| 7 | 面板文案四件：`client.js`、`lib/redteam/client.js`、`lib/redteam/ui.js`、`score-rules.js` | 停在 1.1.80–1.1.82 | **纯中文化重排**（英文 → 中文），按「纯文案不跟」原则 | —— | P3：**永远不碰**，除非要切中文界面 |
| 8 | `rc.5` 适配实测 | `dshTargets` 已声明 rc.2+rc.5，6 条补丁双 pattern | 上游 README 仍写「rc.3 及更新不支持」，与 release-notes 自相矛盾；本机仍是 rc.2，**没有实测** | 拿到 rc.5 安装包 → 解 `resources\app` 副本 → 离线跑 85 条，`drifted` 必须 0 | 用户 2026-11-02 明确「先不用管」 |
| 9 | `node_modules\.ignored\` 新残留 | 每轮重装会堆一份 `dsh-purge.old-*`（约 5 MB） | 属 pnpm 行为，非故障 | 定期清理即可 | P3 |

> **不在此表里、但已确认不用跟的**：`skills/`、`test/`、`README*.md`、`default-prompt-inject`（外挂条款）、
> `net-scope.js`（放行名单）、`install-paper-autopilot.mjs`、`package.json` 的 version/`files[]`/`dsh.install`。
> 理由见附录 B。

---

## 附录 G：逐文件差异原因速查（下次 `cherry-pick` 撞冲突时先看这张表）

> 口径：`git diff --name-only local upstream-mirror` 里**除 `skills/`、`test/`、`md/` 之外**的 21 个文件。
> 这 21 个就是「上游改了、我们没跟（或故意不一样）」的全部原因；表里没有的文件，说明两边一致，直接跟即可。

| 文件 | 两边差什么 | 原因 | 下次怎么处理 |
|---|---|---|---|
| `lib/core.js` | 上游 1.1.88 版 vs 我们 +2 处 fork 修正 | ① `rollupPatchStatus` 保留「已写入优先于 drifted」（上游 1.1.83 起 drifted 压过 applied，多文件补丁常年假告警）；② #32 那条第 rc.5 替换加了 `insertProbe`（上游缺，每 apply 多挂一条注释） | **必冲突**。cherry-pick 后手工保留这两处；`test/patch-status.test.js` 会立刻抓出来 |
| `lib/net-scope.js` | 上游 `RANGE_HOSTS` 0 + `permittedHost(){return false}`；我们 32 条 + 真放行 | 能力收窄，跟了公网靶场只剩 localhost | **必冲突**，整文件取我方（`git checkout --ours`） |
| `lib/profile-insert.js` | 上游 #185「只写裸包名」；我们裸名 + 带引号 `file:` 键 | pnpm 11.28.5 对 `file:` 依赖按完整 spec 记账，只写裸名会 `ERR_PNPM_IGNORED_BUILDS` 且 postinstall 被跳过（自愈就在 postinstall 里 → 死锁） | **必冲突**，保留 `purgePnpmBuildSpecs` + `formatAllowBuildLine` 的改动 |
| `lib/default-prompt-inject.zh.md` / `.en.md` | 上游把「外挂/注入」条款改成「禁止。不实现」；我们保留「本地测试·完整实现」 | 提示词层收窄，跟了等于自废放行 | 取我方 |
| `package.json` | version 1.1.73（上游 1.1.88）、`files[]` 含 `skills`、保留 `install:skill`、`dsh.install` 指 wyybs、已含 `dshTargets` | version 是插件的状态键（永不跟随）；`files[]` 少了 skills 会静默丢 88 个技能文件；安装源改了会破坏 `file:` 钉住 | **必冲突**。只保留上游新增的字段（如 `dshTargets`），其余取我方 |
| `scripts/install-paper-autopilot.mjs` | 上游删除（整体清 skills）；我们保留 | 与 `skills/paper-autopilot` 配套 | 别跟删除 |
| `lib/redteam/validate.js` | 已跟 realpath 修复，仅 3 段报错文案保留英文 | 文案 | 冲突时取我方文案 + 上游代码 |
| `lib/redteam/store-core.js` | 上游 +306/−318；我们停在 1.1.73 | **POC 知识库后端在本文件里**（`searchPocs`/`pocStats`/`getPoc`/`markPocUsed`），上游 1.1.82 起把它下架成空壳 | 见附录 F #1：**禁止整文件覆盖**，逐 hunk 合 |
| `lib/redteam/tools.js` | 上游 +19/−15；我们停在 1.1.73 | 同上，`poc_*` 8 个工具实现在这 | 见附录 F #2 |
| `lib/redteam/skill-fixes.js` | 上游 +230/−218；我们停在 1.1.80 前 | 未移植（P2） | 见附录 F #3 |
| `lib/redteam/skill-availability.js` | +13/−13 | 未移植（P2） | 见附录 F #4 |
| `lib/redteam/schema.js` | +15/−15 | 未移植（P2） | 见附录 F #5 |
| `lib/redteam/platform-config.js` | +16/−16 | 未移植（P2，1.1.87 起该文件改用 `atomic-write.js`，那个已跟） | 见附录 F #6 |
| `client.js` / `lib/redteam/client.js` / `lib/redteam/ui.js` / `lib/redteam/score-rules.js` | 上游 1.1.84 起**面板中文化重排**；我们保留英文 | 纯文案，按「纯文案不跟」原则 | **别跟**，除非要切中文界面（P3） |
| `README.md` / `README.zh-CN.md` / `README.ja.md` | 上游改安装说明、新增日文版 | 纯文档，零运行影响 | 想同步就单独抄文案，不动代码 |

**高发冲突三件套**：`lib/core.js`、`lib/net-scope.js`、`package.json` —— 每次 port 都会撞，撞了按上表处理，不要 `-X theirs`。
