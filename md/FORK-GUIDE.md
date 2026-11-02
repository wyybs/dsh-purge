# dsh-purge Fork 维护指南（wyybs/dsh-purge）

> 目标：**上游更新不影响到我在用的版本；只有我主动操作时才把上游代码合进来。**
> 适用：DeepSeek Harness 桌面端 0.2.1-rc.2，Windows，插件来自 `https://github.com/wyybs/dsh-purge`（fork 自 `YuJunZhiXue/dsh-purge`）。
> **占位符**：`$WS` = 工作区根 · `$SRC` = `$WS\src` · `<DSH_ROOT>` = DSH 安装目录（名字带空格） · `<USERPROFILE>` = 用户目录。文中不再出现本机绝对路径。
> 写于 2026-10-23 15:25；**10-23 16:40 补入坑 9–11**；**10-28 11:30 补入 rc.3 踩坑与降级**；**11-02 13:30 更新到 1.1.88 基线、删掉已废弃的旧更新流程**。

---

## 0. 一句话原理

**fork 不等于钉住。** 只要宿主装的是 `tarball` / `zip` / `git` 这三种通道之一，它就永远盯着
`package.json` → `dsh.install` 里写的那个仓库的 `master`，上游一 push 就可能被覆盖
（2026-10-23 12:47 就是这么丢掉 13 处本地改动的）。

**唯一能钉住的装法是 `file:` 本地目录引用**——没有远端可比，就不存在自动更新。

### 0.1 本机当前状态（**2026-11-02 13:30 复核**）

| 项 | 值 |
|---|---|
| 源码 | `$SRC`，分支 `local`，HEAD **`e499e03`**，工作区干净，已 push |
| port 链 | **13 条**，底 `6667999` → 顶 `a162c8f`(1.1.88 / d1eff01)；完整链条见 `UPDATE-GUIDE.md` §0 表 |
| `local:` 定制 | **4 条**：`d246244`(安装源 wyybs)、`efcc00c`(`files[]` 加 `skills`)、`0f7ba6c`(修 allowBuilds 键截断)、`e499e03`(allowBuilds 兼容 pnpm 11.28.5 的 `file:` 依赖) |
| tag | `v1.1.73`、`v1.1.73-wyybs`、`-port1`(6667999)、`-port2`(5f7bbc2)、`v1.1.81-wyybs-port3/3.1`、`v1.1.82-wyybs-port4`(c7ab58e)、`port-1.1.86-20261101`(115de05)、`pre-port-1.1.88-20261102`、**`port-1.1.88-20261102`(e499e03，当前 HEAD)**、`pre-port-*` 与 6 个 `upstream-snapshot-*` |
| 宿主依赖 | `<USERPROFILE>\.dsh\profiles\desktop\package.json` → `"dsh-purge": "file:$SRC"` ✓ |
| 安装副本 | `~/.dsh/profiles/desktop/node_modules/dsh-purge`，**189 个文件**，**独立拷贝不是链接**（`LinkType` 为空）；逐文件 SHA256 **DIFF=0**、MISSING 14（5 个打包白名单外 + 9 个 `test/`）；`skills\` = **88 文件** |
| `pnpm-workspace.yaml` | `allowBuilds:` **2 行**：裸包名 `dsh-purge` + `"dsh-purge@file:D:/…/src"`（含 `:` 的键必须双引号），否则 `ERR_PNPM_IGNORED_BUILDS`（详见坑 12；旧的「3 行含 tarball URL」写法已废弃） |
| 远端 | `origin` = wyybs（`master` 4c98517 / `local` **e499e03** / `upstream-mirror` **d1eff01**），`upstream` = YuJunZhiXue（最新 **d1eff01 = 1.1.88**，已 fetch 对齐） |
| **宿主版本** | **0.2.1-rc.2**（rc.3 起不来 → 用户手动降级，详见下方「10-28 rc.3 踩坑」）。⛔ **升级宿主前必须先查上游是否支持**，规则见 UPDATE-GUIDE §0.5；rc.5 目前属「上游自称支持、尚未实测」 |
| **`app.asar`** | **已改名为 `app.asar.bak`（182,794,869 B）**，`app.asar` 不存在 ✓；`resources\app\` = 18367 文件完整可引导树 ✓ |
| 补丁 | **77 applied / 0 pending / 6 na / 1 skipped / 1 missing_file（共 85）**，`drifted=0`；`applied.json` = `2026-11-02T03:28:45Z`；无 `errors.log`；二次 `--apply` 零写入 |
| shim | `resources\runtime\cli\bin\dsh.cmd` 含 `dsh-purge cli entry` 块 ✓；三级回退前两条 Test-Path 均 False → 落到第 3 条 `app\dsh\...`（正确）；`dsh.cmd --version` → `0.2.1-rc.2` exit 0 ✓ |
| 自动更新源 | `resources\app-update.yml` **已改名为 `app-update.yml.disabled`**（2026-10-28 会话内关闭，防 nightly 再拉 rc.3）。想恢复官方更新就把名字改回来。⚠️ 宿主升级重装可能重建该文件 |
| 红队工具 | **10-28 复检 64/64**（stub 宿主法，见 UPDATE-GUIDE §5.1）；`node --test` = 23 tests / 23 pass / 0 fail |
| GUI 地址 | 每次重启都变 |

**10-28 rc.3 踩坑（最重要的新教训）**

> ⛔ **在升 DSH 之前先做这件事**：查上游支不支持。完整规则在
> [UPDATE-GUIDE.md §0.5](UPDATE-GUIDE.md)「宿主版本闸门」—— 一句话版本：
> **上游 `dshTarget` 还是 `0.2.1-rc.2`、README 还写着 `rc.3 and newer are not supported`，
> 就绝对不许升。升级只能在上游适配 + 我们把代码 port 进 `local` 并自检通过之后，
> 由我明确告诉你「可以升了」才动。** 插件的 `dshTarget` 只是 `package.json:99` 一个元数据字段，
> 代码里零引用 ⇒ **它不会拦住你**，升上去只会静默地让补丁全部匹配不上。

- 宿主 `resources\app-update.yml` 里 `channel: **nightly**` + provider `generic` + url `https://download.deepseek.com/dsh-desk/feeds/win-x64/`
  ⇒ **宿主会自己把 nightly 的 rc.3 拉下来**，用户没主动升级也会中招。
- rc.3 起不来**不是配置问题**：上游 1.1.80 的 release-notes 已明确写 **#176「不支持 DSH 0.2.1-rc.3 及更新的 rc，请退回 0.2.1-rc.2」**。
  我们 1.1.73 更不支持。⇒ **必须关掉宿主自动更新**，或至少别留在 nightly 通道。
- 降级后现场：`app.asar` 是 rc.2 原版（归档头 `"version": "0.2.1-rc.2"`），
  `resources\app\` 被删、`app.asar.bak` 也被清 —— 即 **rc.3 的升级过程把我们辛苦 swap 的成果一起抹掉了**。
- 恢复顺序：① 应用内 `/purge apply`（或 GUI 面板 Apply）重新解包 asar → ② 完全退出宿主
  → ③ 跑 `restart-host.ps1`（它前置检查 `app\` 是否存在，不存在直接 ABORT，不会把宿主搞成无 dsh 树）。

**本会话 shell 故障（2026-10-27 起，2026-10-28 12:05 已解决）**

- 现象：`pwsh` 工具一律 `spawn EPERM`，连 `'x'` 这种纯字符串命令都失败；`read`/`glob`/`grep`/`write`/`edit` 正常。
- 机制层看是 DSH 的 `AclSandbox`：受限令牌 + `CreateProcessAsUserW`，失败映射成 `spawn EPERM`
  （`app.asar:1844350` 注释原文 `ERROR_ACCESS_DENIED; Node surfaces it as spawn EPERM`）。
- **但真正根因是杀毒软件**拦了这条受限令牌通道。用户关掉杀软后立刻恢复，**不需要**改沙箱策略、
  **不需要**装 PowerShell 7（装了两条 runner 链路还走同一套受限令牌，`:2156034` / `:2156045`，照样 EPERM）。
- 以后再遇到 `spawn EPERM`：**先让用户临时关/加白杀软**，别急着改配置。
- `scripts\` 下的 `.ps1`（`scripts\host\restart-host.ps1`、`scripts\host\rescue-rc2.ps1`、
  `scripts\host\swap-once.ps1`、`scripts\host\swap-task.ps1`、`scripts\diag\install-pwsh.ps1`、
  `scripts\diag\diag-spawn.ps1`、`scripts\port\port-1.1.81.ps1`）现在会话内可直接跑，
  同时也是**给用户在自己的 PowerShell 里跑**的备份路径。

**验收实测（2026-10-23 17:15 / 18:18，历史记录）**

- 宿主进程重启时间 17:11:52–17:14:03，全部晚于 `app.asar` 改名时刻 → 加载的是解包目录
- 当前 checkout 已从 `resources\app.asar\dsh\` 切到 `resources\app\dsh\` ← 单条最强证据
- `/purge status` 不再出现 `✗ app.asar: 还在`
- 宿主实际加载的模块里带 dsh-purge 标记：`app\lib\main.js` 9 处、`dsh-system-prompt\lib\index.js` 8 处、`dsh-persona\lib\index.js` 2 处、`dsh-sandbox-policy\lib\index.js` 1 处
- `dsh\lib\` 下已生成两个运行期文件：`dsh-purge-hide-console.js`（2165 B）、`dsh-purge-child-process-hide.mjs`（3010 B）
- `dsh.cmd` 三级回退全部落到第 3 条（前两条 Test-Path 均为 False）
- `applied.json` 时间戳刷新为 `2026-10-23T09:12:12.168Z`，`installed-rev` = `apply:1.1.73`
- 18:18 第二次重启：宿主 18:18:18 起晚于 `tools.js` mtime 18:09:31 → 加载移植后新版；补丁 61/66；红队自检 64/64；GUI 64270

**验收实测（2026-10-28 15:12，rc.2 + 1.1.73 最终态 ✅ 全通）**

- `app.asar` = **False**、`app.asar.bak` = **True**（182,794,869 B）、`resources\app` = **True**
- 宿主 6 个进程全部 15:12:01–15:12:43 启动，命令行**全部走 `app\`**，没有任何一个 `--expose-internals "...\app.asar\dsh\..."` ⇒ checkout 已切到 `resources\app\dsh\`
- `/dsh-purge/status`（GUI 路由 `http://127.0.0.1:<port>/dsh-purge/status`，HTTP 200）：
  `surface=desktop`、`ai_base=...\resources\app\dsh\node_modules\@deepseek-ai`、
  `asar_still_sealed=false`、`patches_applied=61`、`patches_pending=0`、`patches_skipped=5`、`patches_ready=66`、`patches_lost=false`、`ready=true`
- 红队 64 工具自检（stub 宿主法）：`OK tools=64`，首尾 `redteam_engagement_open … redteam_unknown_list` 齐全
- `*.dshpurge.bak` 备份 56 个（证明补丁确实落盘）；`errors.log` 不存在
- `dsh.cmd --version` → `0.2.1-rc.2`，exit 0
- **唯一遗留的非致命项**：patch **#71 `LIANGSHEN_IDENTITY_LINE` = `missing_file`**（该补丁 `file: ["preset-liangshen","preset-liangshen-pkg"]`、`strictFiles:true`，本机没装「梁神」预设包，属预期缺失，不是故障）

**10-27 rc.3 救急记录（13:39）**

- 宿主自动升级 rc.3 → `app.asar` 放回原版归档、`app\` 解包目录被删、补丁全灭（status 报 ai_base=null）
- CLI `dsh-purge --apply` 走不通（surface 判成 web、`enumeratePatchAiBases` 空）→ **改走 GUI 后端路由** `POST http://127.0.0.1:64888/dsh-purge/apply`（宿主进程内插件 server，`lib/index.js:1970`，自动 `openSealedDesktopHost` 解包 asar）→ HTTP 200 `{ok:true, applied:64, already:7, failed:0, unpacked_asar:true, needs_full_quit:true}`
- **教训：rc 升级后 asar 重放时，GUI 面板的 apply 按钮就是救急通道**（鉴权对本会话 GUI 端口放行）；重启脚本 `restart-host.ps1` 前置条件（`app\` 存在）现已满足

---

## 1. 目录与分支布局

全部收在工作区里，不再另开同级目录：

```
$WS\          ← 工作区根
├─ README.md                                  ← 迁移与总入口（换机器先看这个）
├─ src\                                       ← dsh-purge fork 源码（= 插件包根，带 .git）
│  └─ md\                                     ← 三份长文档（2026-11-02 起在这里；本机忽略，不进公开仓库）
│     ├─ FORK-GUIDE.md                        ← 本文件（初始化 / 坑 / 回滚）
│     ├─ UPDATE-GUIDE.md                      ← 更新契约（四阶段：比较→汇报→等确认→执行）
│     └─ UPDATE-LOG.md                        ← 更新日志（append-only）
├─ scripts\host\                              ← 宿主侧运维：挪 asar / 重启 / 救援
│  ├─ restart-host.ps1                        ← 挪开 app.asar + 重启宿主（§3.1）
│  ├─ rescue-rc2.ps1                          ← rc.2 救援（-Check / -Swap）
│  ├─ swap-now.ps1 / swap-now.cmd             ← 计划任务 / 双击版换 asar（日志进 logs\）
│  ├─ swap-at-boot.ps1                        ← PendingFileRenameOperations 兜底（需管理员）
│  └─ swap-once.ps1 / swap-task.ps1           ← 一次性历史脚本
├─ scripts\port\port-1.1.81.ps1               ← 上游补丁移植（-Check / -Push）
├─ scripts\diag\                              ← diag-spawn.ps1 / install-pwsh.ps1
├─ src\                                       ← git clone 的 fork 源码（唯一需要 git 的地方）
│  ├─ master        ← fork 自己的历史存档，238 提交线，一个字都不改
│  ├─ upstream-mirror ← 上游只读镜像，只许 fast-forward，永不改（§1.2）
│  ├─ local         ← 自己的改动全在这，宿主装这条
│  ├─ tag v1.1.73-wyybs        ← 每次要装之前打个标，方便回退
│  └─ tag upstream-snapshot-*  ← 上游每次快照，用来查"某功能在哪版被删/改"
├─ workbuddy-armor\                           ← WorkBuddy 破甲（独立体系，见其 README）
├─ logs\                                      ← swap-log.txt / swap-log2.txt
├─ artifacts\                                 ← 一次性产物（可删）
├─ backup\                                    ← 重组前快照与整包 zip
└─ .workbuddy\                                 ← 会话记忆，与代码无关
```

### 1.2 三条分支的职责（不能混）

| 分支 | 指向 | 谁能改 | 用途 |
|---|---|---|---|
| `master` | `origin/master`（fork 远端） | **谁都不改** | fork 的历史存档。238 个提交的完整开发史，是查「我们以前做过什么」的唯一依据 |
| `upstream-mirror` | `upstream/master`（原作者） | **只允许 `git pull --ff-only`** | 上游只读镜像。用来查「原作者改了什么、什么时候删的、改之前长什么样」 |
| `local` | 宿主实际装的这条 | 我们改 | 唯一的活分支。所有定制、所有移植都落这里 |

**为什么必须单独开镜像分支，而不是让 `master` 跟上游走：**

`master` 与 `upstream/master` 是两个**互不相干的根**（`merge-base` 为空）：

```
master          4c98517   238 个提交, 186 个文件, 起点 2026-08-19
upstream/master ca848d7     2 个提交,  97 个文件, 起点 2026-10-23
```

把 `master` 重置成 `upstream/master` 会**当场丢**：
- 238 个提交（其中 154 个 `fix`/`adapt`/`patch` 类）
- 工作树里 89 个文件（88 个 `skills/` + 1 个 `scripts/install-paper-autopilot.mjs`）
- `local` 那条链的祖先（`master` 是 `local` 的父，父没了 `local` 整条悬空）

而这些正是用户要「查清楚功能回退」的依据。所以 **`master` 原地不动，另开 `upstream-mirror`**。

**日常三问，各用一条命令：**

```powershell
$src='$SRC'

# 问「上游改了什么」→ upstream-mirror（vs fork 存档，只看性质，不算工作量）
git -C $src fetch upstream --tags
git -C $src log --oneline upstream-mirror -10
git -C $src diff --stat master upstream-mirror

# 问「某个功能/文件被上游改过几次」→ upstream-mirror
git -C $src log --oneline upstream-mirror -- lib/net-scope.js
git -C $src log --oneline --diff-filter=D --name-only upstream-mirror -- skills/redteam

# 问「我们还差多少没跟」→ local vs upstream-mirror（不要经过 master）
git -C $src diff --stat local upstream-mirror -- lib
```

**镜像分支的更新方式（永远 ff-only，永不产生本地提交）：**

```powershell
git -C $src fetch upstream --tags
git -C $src checkout upstream-mirror
git -C $src merge --ff-only upstream/master      # 只可能快进；报错说明有人动过它，立刻查
git -C $src tag "upstream-snapshot-$(Get-Date -Format 'yyyyMMdd')-$(git -C $src rev-parse --short upstream/master)" upstream-mirror
git -C $src checkout local
```

> ⚠️ **不要 push `upstream-mirror` 到 `origin`**。它的存在意义是本地只读对照，推上去只会让
> fork 远端多出一条别人能误点的分支。`git push origin --all` 这种命令必须避开。

> ⚠️ **不要在 `upstream-mirror` 上 commit**。一旦本地提交混进去，`merge --ff-only` 就会失败，
> 镜像的可信度就废了。要试东西请新开临时分支。

- 源码就放 `dsh-purge\src`，**不要**去 `~/.dsh\plugins\dsh-purge` 里改（那是宿主安装副本，会被重装覆盖）。
- **别长期待在 `master`**：`git pull` 一次它就会和上游对齐，你的改动容易被卷进去。
- **要更新时先读 `md\UPDATE-GUIDE.md`**，别直接照这份文档的第 5 节干 —— 第 5 节是初始化流程，
  更新流程要求先出差异报告、等用户圈范围。
- **别用 `version` 字段标记 fork**：插件拿版本号当状态键（`installed-rev` / `applied.json` /
  `settle-restart.guard`），改版本号会触发"以为换了新版"→ 反复重打补丁 + 反复重启。
  标记用 **git tag** 或 README 备注。

### 1.1 三层「覆盖」：哪些会丢、哪些不会

| 层 | 会被覆盖吗 | 说明 | 出事怎么办 |
|---|---|---|---|
| **源码层** `dsh-purge\src` | **不会** | 上游只在 GitHub 上 push，碰不到本地磁盘 | 只有你自己 `git checkout` / `reset --hard` 才会丢 → 改完先 commit |
| **GitHub 上的 fork** | 一般不会 | 唯一的雷：网页上点 **Sync fork → Discard commits**，会丢掉 master 上的提交 | 二开一律放 `local`，`master` 保持纯净 |
| **运行层**：`~/.dsh/profiles/desktop/node_modules/dsh-purge` + `resources\` 里的补丁 | **会，且属正常** | `pnpm install` 覆盖安装副本；DSH 升级重放 `app.asar`，补丁全部失效 | 重跑 install + 重新「应用」，源码不受影响 |

**一句话：丢的是"生效状态"，不是你的代码。** 代码只要进了 git，永远能拿回来；
没 commit 的改动在 `pnpm install` / `checkout` 时是真丢，git 救不回来。

---

## 2. 一次性初始化

```bash
cd $WS
git clone https://github.com/wyybs/dsh-purge.git src
cd src

# 上游只读远端（用来收更新）
git remote add upstream https://github.com/YuJunZhiXue/dsh-purge.git
git fetch upstream

# 自己的改动分支
git checkout -b local
git tag v1.1.73-wyybs      # 记下当前基线
```

### 2.1 改掉 fork 里的安装源（重要）

打开 fork 的 `package.json`，把 `dsh.install` 三个地址改成自己的（或直接删掉 tarball / zip）：

```json
"install": {
  "preferred": "tarball",
  "tarball": "https://github.com/wyybs/dsh-purge/archive/refs/heads/local.tar.gz",
  "zip":     "https://github.com/wyybs/dsh-purge/archive/refs/heads/local.zip",
  "git":     "https://github.com/wyybs/dsh-purge.git"
}
```

不改的话，任何一次"重新安装 / 修复 / 检测更新"动作，都会把你拉回**原作者的 master**。
改完提交到 `local` 分支并推上去。

---

## 3. 装进宿主（`file:` 通道）

编辑 `<USERPROFILE>\.dsh\profiles\desktop\package.json`：

```json
"dependencies": {
  "dsh-purge": "file:$SRC"
}
```

`"dsh": { "profile": { "bundles": [ ... , "dsh-purge" ] } }` 里保留 `"dsh-purge"`。

用**宿主自带 pnpm** 安装（系统 pnpm 10 会想重建整个 node_modules 并中止）：

```bash
cd <USERPROFILE>/.dsh/profiles/desktop
"<USERPROFILE>/.workbuddy/binaries/node/versions/22.22.2-6/node.exe" \
  "<DSH_ROOT>/resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.cjs" \
  install
```

装完，宿主实际加载的是 `~/.dsh/profiles/desktop/node_modules/dsh-purge`
（pnpm 的 `file:` 依赖可能是符号链接、硬链接或拷贝，见第 7 节坑 3）。

### 3.1 让补丁真正生效（重启脚本）

`pnpm install` 只管「装哪份代码」。补丁要生效还差一步：把 `resources\app.asar` 挪开
（见坑 11）。仓库根目录放了脚本 `restart-host.ps1`，在**应用外部**跑：

```powershell
pwsh -NoProfile -File "$WS\scripts\host\restart-host.ps1"
```

它做四件事：等宿主进程全部退出（或 `-Force` 强杀）→ `app.asar` 改名成 `app.asar.bak`
→ 重启 `DeepSeek Harness.exe` → 复核 `app.asar` 是否又回来了。

> 该脚本带 UTF-8 BOM 保存。Windows PowerShell 5.1 读无 BOM 的 UTF-8 会把中文按 GBK 解，
> 出现 `字符串缺少终止符` 之类假报警 —— 改脚本时别让编辑器把 BOM 去掉。

> 想回官方原样：退出应用 → `app.asar.bak` 改回 `app.asar` → 重开。

---

## 4. 验证"真的钉住了"（四查）

| # | 查什么 | 期望 |
|---|---|---|
| 1 | `profiles/desktop/package.json` 的依赖 | 值是 `file:$SRC`，不是 tarball / git URL |
| 2 | `~/.dsh/profiles/desktop/node_modules/dsh-purge/package.json` 的 `version` | 与你 tag 的基线一致（如 1.1.73） |
| 3 | `src/package.json` 里 `dsh.install.tarball` | 指向 `wyybs/dsh-purge`，不是 `YuJunZhiXue` |
| 4 | 宿主设置里的插件"自动更新 / 检查更新" | **关掉** |
| 5 | `resources\app.asar` 是否存在 | 应为「不存在，只剩 `app.asar.bak`」；还在就说明补丁没生效（坑 11） |

只要 1、3 成立，上游怎么推都碰不到你——它不知道你的存在。

**本机 2026-10-23 16:25 的实测结果**：1 ✓（`file:` 已写入，`bundles` 7 项含 `dsh-purge`）；
2 ✓（安装副本 `version` = `1.1.73`）；3 ✓（`dsh.install` 三处已指向 `wyybs`）；
4 由人在设置里确认；5 ✗（`app.asar` 182,794,869 字节仍在，归档内 `dsh-purge` 标记数 0 →
是原版归档，61 个补丁只落在 `resources\app\`）。

另外顺手查一眼，别只看 spec 字符串：

```powershell
# 装的是不是真副本（pnpm 的 file: 可能是拷贝而不是符号链接）
(Get-Item '<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge').LinkType, $_.Target
# 源码目录当前分支
git -C '$SRC' branch --show-current   # 应是 local
```

---

## 5. 我想更新时的标准流程

> 📌 **已全部移到 `md\UPDATE-GUIDE.md`** —— 四阶段「比较 → 汇报 → 等你确认 → 执行」，外加 §0.0 的 8 步触发协议。
>
> 这里不再保留旧版 `merge --ff-only` 流程：本 fork 与上游**无共同祖先**（`git merge-base master upstream/master` 为空），
> 那条路必失败；整树 `merge --allow-unrelated-histories` 会把 `skills/`、`scripts/` 整片删掉。
>
> **唯一硬原则：同步上游只用「目录级 diff + 手工移植 / `cherry-pick -x`」，不 rebase、不整树 merge、不用 `-X theirs`。**
> 工作量指标一律 `git diff --stat local upstream-mirror`（`master` 是历史存档，拿它算会把已搬过的重算一遍）。

### 5.1 二开怎么写，才不会被上游 merge 打死

1. **新功能放 `lib/local/<模块>.js`**，在上游文件里只加一行 `import` + 注册调用。
   **不要去改 `lib/core.js`**（342KB，上游几乎天天动），否则每次合上游都得手解一堆冲突。
2. **一个二开点一个 commit，message 统一加 `local:` 前缀**，例如
   `local: 增加 XXX 面板`。好处：`git log --oneline --grep="local:"` 一眼看清自己改了什么；
   换基线时可以用 `git cherry-pick` 挑过去。
3. **从上游搬来的代码用 `port:` 前缀**，例如 `port: 移植 ca848d7 的 lib/net-scope.js`。
   `local:` 是「我们自己的东西，重建时必须手工重做」，`port:` 是「上游的东西，重建时从新基线
   自动获得，不需要重做」。混用会让 `git log --grep="local:"` 这份定制清单失真。
   **为什么不能靠 diff 区分**：`git checkout <ref> -- <file>` 是整文件覆盖，跑几次部分更新后
   `git diff master local` 就变成「本地定制 + 上游移植」混在一起，再也分不开。
   详见 `md\UPDATE-GUIDE.md` §1.3.1。
4. **合并顺序固定**：`master` 对齐上游 → 合进 `local` → 冲突只会落在那一行注册代码上 → 解完 `node --check`。
   ⚠️ 本机不适用这条（fork 与上游**无共同祖先**，合不了），实际走 `md\UPDATE-GUIDE.md` 的
   「部分更新 / cherry-pick 重建」两条路线。
5. **先 commit 再 install**：脏工作区跑 `pnpm install` 或 `git checkout`，未提交的改动可能被物理覆盖。
6. **上游节奏很快**（10-11 一天发过 4 个版本），别天天合。攒到确实需要某个修复时合一次，合完打 tag。
   ⚠️ 本机还有个更强的判据：**上游改的文件数没有意义，只看 `lib/core.js` 的 blob 变没变**。
   不变 = 只是收窄能力/改文案，不值得跟；变了 = 适配新宿主，必须跟。

---

## 6. 跨版本必清的状态（不清就会反复重启）

`<USERPROFILE>\.dsh\dsh-purge\` 下的这些文件都用**版本号**做键：

| 文件 | 作用 | 跨版本时的处理 |
|---|---|---|
| `installed-rev` | 记录已装的 git rev / `apply:x.y.z` | 删掉，让它重新生成 |
| `applied.json` | 补丁打戳（version + sha + 时间） | 删掉 |
| `settle-restart.guard` | 重启冷却守卫（version + 时间） | 删掉 |
| `auto-update-guard.json` | 更新守卫（ref + sha） | 删掉 |
| `errors.log` | 插件兜底异常记录 | **别删**，排查靠它 |

症状对照：改完版本没清 → 启动时反复"重打 → 重启 → 再重打"，甚至启动崩溃
（典型报错 `INACTIVE_EFFECT: cannot create effect on inactive context`）。

---

## 7. 已知的坑

1. **宿主升级会重放 `app.asar`**：插件是往 `resources\app\`（解包目录）打补丁的，
   宿主更新/重装会重新放回 `app.asar` 并覆盖 `app\`，补丁全部失效。
   处置：退出应用 → `mv resources/app.asar resources/app.asar.bak` → 重开 → 重新「应用」
   （一条命令的版本见 §3.1 `restart-host.ps1`）。
   关于 `runtime\cli\bin\dsh.cmd`：本机实测（2026-10-23 16:12 那版）**已经自带三级回退**，
   不用手改：

   ```bat
   set "entry=%~dp0..\..\..\app.asar\dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\cli.js"
   if not exist "%entry%" set "entry=%~dp0..\..\..\app.asar.unpacked\dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\cli.js"
   if not exist "%entry%" set "entry=%~dp0..\..\..\app\dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\cli.js"
   ```

   改名后前两个 `not exist` 命中，自动落到 `..\app\dsh\...`。原版备份在同目录
   `dsh.cmd.dsh-purge.bak`（243 字节）。
   ⚠️ 注意 `app.asar` 里的**归档路径**其实是存在可读的（`resources\app.asar\dsh\...`
   在改名之前 Test-Path 为 True，能直接读），所以 `dsh.cmd` 第一行永远命中——
   这也解释了为什么命令行 `bin/dsh-purge.js status` 与 GUI 内 `/purge status` 会给出不同答案。
2. **`app.asar` 被恢复时说明补丁已失效**：检查 `resources\` 下是否只有 `app.asar.bak`；
   若 `app.asar` 又回来了，说明环境被官方归档覆盖了。
3. **`file:` 依赖不保证是同一 inode**：pnpm 可能做符号链接、硬链接或直接拷贝。
   本机实测（2026-10-23 16:40）：`node_modules\dsh-purge` 的 `LinkType` 为空 = **独立拷贝**，
   181 个文件与源码逐文件 SHA256 全一致，只少了 5 个非运行文件
   （`.gitignore`/`.npmignore`/`LICENSE-COMMERCIAL.md`/`release-notes.md`/`.github/`）。
   → **改源码后必须重新 `pnpm install`（或手工同步）再重启**，别指望"改一处两处生效"。
   **但只跑 `pnpm install` 不够** —— 实测（2026-10-23 18:10）`file:` 依赖不感知源码内容变化，
   lock 里只记 `directory` 路径，pnpm 判定"已装过"就跳过，输出 `Packages: +1 -27`、exit 0，
   副本里却还是旧文件（`DIFF: lib\redteam\tools.js`）。**必须先删副本再装**：

   ```powershell
   $inst='<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge'
   if (Test-Path $inst) { Remove-Item -LiteralPath $inst -Recurse -Force }
   cd <USERPROFILE>\.dsh\profiles\desktop
   & "<USERPROFILE>\.workbuddy\binaries\node\versions\22.22.2-6\node.exe" `
     "<DSH_ROOT>\resources\runtime\primary-runtime\dependencies\pnpm\bin\pnpm.cjs" install
   ```

   装完立刻比对 SHA256（安装副本 vs 源码必须相同，见上面那段脚本），**不比对就等于没装**。

   ```powershell
   $src='$SRC'
   $inst='<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge'
   Get-ChildItem $src -Recurse -File -Force | Where-Object { $_.FullName -notmatch '\\\.git\\' } |
     ForEach-Object {
       $rel = $_.FullName.Substring($src.Length+1)
       $b = Join-Path $inst $rel
       if (-not (Test-Path $b)) { "MISSING $rel" }
       elseif ((Get-FileHash $_.FullName -Algorithm SHA256).Hash -ne (Get-FileHash $b -Algorithm SHA256).Hash) { "DIFF $rel" }
     }
   # 无输出 = 完全一致
   ```
4. **不要动 `version` 字段**（见第 1 节）。
5. **应用外跑 `bin/dsh-purge.js status` 不准**：没有桌面端环境标记时 surface 会判成 `web`，
   补丁状态全 `undefined`。**以应用内 `/purge status` 为准。**
6. **`desktop` profile 由 Electron 独占**：`dsh --profile desktop` 会报
   "managed exclusively by the Electron application"，命令行验证不了启动，只能重启 GUI。
7. **npm 上没有这个包**（官方 registry 和 npmmirror 都 404），是因为作者改用 tarball 安装，
   不是删库。别再去 npm 找。
8. **`mmparko/dsh-purge` 镜像别用**：停在上游 1.1.71 且已分叉（许可证、`NOTICE`、
   client inject 都不同），用它是降级。
9. **本 fork 与上游没有共同祖先**（2026-10-23 实测）：`git merge-base master upstream/master`
   输出为空；`git rev-list --left-right --count upstream/master...origin/master` = `2  238`。
   上游被作者重建过，只剩 2 个提交（`679a3db`、`ca848d7`「drop skills and knowledge base」，
   diff 为 1708 insertions / 20472 deletions）；fork 保留 238 个历史提交。→ 第 5 节原版
   `merge --ff-only` 必然 `fatal: Not possible to fast-forward`；`--allow-unrelated-histories`
   会让 `lib/` 全量冲突并删掉 `skills/`。**正确做法见第 5 节「本机实际能走的流程」**：
   `git diff origin/master upstream/master` 目录级对照 + 手工移植，不做整树合并。
10. **面板「更新/切换版本」会把 `file:` 依赖当 git 仓库去 reset**：`lib/update.js:346`
    `planUpdates()` 里 `isLinkSpec("file:...")` 为真 → `resolveLinkDir()` → `canGit()` 命中
    （`src` 有 `.git`）→ job 变 `kind:"git"` → `gitResetTo(dir, ref, { force })`
    （`lib/update.js:861`，默认 `force=true`）→ `git fetch origin --tags` +
    `git checkout -B master origin/master` 或 `git reset --hard <ref>`。
    而 `REPO` 在 `lib/update.js:12` 被写死为 `"YuJunZhiXue/dsh-purge"`，`STABLE_REF="master"`、
    `BETA_REF="beta"`（`lib/update.js:13-14`）。后果：
    - 点「检查更新/立即更新」→ `git checkout -B master origin/master` 会把 `src` 切回
      **fork 的 master**（`4c98517`），你在 `local` 上的提交失去 HEAD，`file:` 装的是另一棵树；
    - `beta` 分支在 origin 上不存在 → 切 beta 直接失败；
    - `pinInstalledSpec()`（`lib/update.js:308`）会把 profile 的 `file:` spec 改写成
      `codeload.github.com/YuJunZhiXue/dsh-purge/tar.gz/...` —— **钉住当场失效**。
    **结论：装了 `file:` 通道之后，面板的更新/切版本按钮一律别点；升级只按第 5 节手工走。**
    好消息：启动路径不会自动升 —— `autoUpdateIfNeeded()`（`lib/update.js:1128`）直接返回
    `{ auto:true, skipped:"manual-only", hasUpdate:false }`，不改任何文件。所以坑只在
    **手动点按钮**时踩到（`handleUpdateOp` 的 `apply` / `switch` / `rollback` / `channel`
    四个 op 都会走到 `applyUpdate(planUpdates(), { ..., force: true })`）。
11. **`app.asar` 还在 = 当前进程没读到补丁**：`app.asar`（182,794,869 字节，2026-10-17）
    只要没改名，Electron 就优先读归档而不是 `resources\app\` 目录，`/purge status` 会报
    `✗ app.asar: 还在。补丁写在解开目录，当前进程读不到`。核实方法：探 `app.asar` 里
    `"[dsh-purge"`、`"dshpurge"`、`"DSH_PURGE_MARKER"` 三个串，全部 count=0 —— 说明归档
    是**原版**，所有 61 个补丁都只落在解包目录。要生效必须**退出应用 → 把 `app.asar`
    改名为 `app.asar.bak` → 重开**（`lib/extract-asar.js:189 renameAsarAside()` 就是这个语义），
    重开后再 `/purge status` 复查。当前会话（`app.asar\dsh\...` 启动，进程 16:16 起）
    仍是旧归档路径，所以本次改动要重启后才算落地。
    **实测（2026-10-23 16:45）：进程活着时改名会直接失败** ——
    `Rename-Item` 报 `另一个进程正在使用此文件，因此该进程无法访问此文件。`
    （`app.asar` 被 mmap 锁住）。所以没有任何办法在会话内部完成这一步，
    必须走 §3.1 的外部脚本。这也顺带说明：**别试图用 `pwsh` 从会话里"自己重启自己"**，
    宿主一退出，这个会话的进程链就断了，脚本后半段也不会执行 —— 脚本必须由用户在
    应用外部（Win+R / 资源管理器右键）启动。

    **✅ 已实际走通并验收（2026-10-23 17:15）**：改名后 `app.asar` 为 False、`app.asar.bak`
    为 True（182,794,869 字节，SHA256 `47874618…999512A`）；宿主重启（进程 17:11:52–17:14:03）；
    当前 checkout 自动从 `resources\app.asar\dsh\` 切到 `resources\app\dsh\`；
    `/purge status` 那行 `✗` 消失；`dsh.cmd --version` 正常返回 `0.2.1-rc.2`。
    → 这条坑是真实存在的，但**处置方案照 §3.1 走一遍即可解决，无需改任何代码**。

    **❌ 11b. 2026-10-28 反面实证：`restart-host.ps1` 在装了 WorkBuddy 的机器上会一直 ABORT。**
    这条坑比上面那次顺利的验收重要得多，先读它。

    - 14:11 那次（`swap-log.txt`）：宿主进程**全部退出**（日志 `host fully exited`）后，
      脚本仍连续 40 次 rename 失败，最后 `ABORT rename never succeeded`。
    - 根因：**`app.asar` 有三个持锁者，不是只有宿主自己**：
      ```
      RmGetList(app.asar) -> 2100|WorkBuddy  16868|DeepSeek Harness  16336|DeepSeek Harness
      ```
      其中 **PID 2100 = `<WB_ROOT>\WorkBuddy.exe` 的
      `resources\app.asar.unpacked\cli\bin\codebuddy --serve` sidecar**
      （命令行带 `--session-id … --permission-mode fullAccess`）。
      它从 11:10:43 就在跑，横跨宿主的一次完整退出，所以「等宿主退出」这个条件
      **永远不够**。
    - 用 `[System.IO.File]::Open($asar, Open, Read, [FileShare]::None)` 做独占探测，
      当前会话里立刻报「正由另一进程使用」；`[System.IO.File]::Move()` 同样报
      `IOException: 另一个进程正在使用此文件`。
    - **权限不是瓶颈**：`resources\` 的 ACL 里 `NT AUTHORITY\Authenticated Users` 有
      `Modify`，`Test-Path` 写临时文件实测 `WRITE OK`。也就是说**不需要管理员就能改名**，
      失败纯粹是共享冲突（`ERROR_SHARING_VIOLATION`），不是 `ACCESS_DENIED`。
    - 因此 `restart-host.ps1` / `swap-now.ps1` 这类「杀掉宿主 → 立刻改名」的脚本在
      本机**结构上不可能成功**：要么 WorkBuddy 还开着（2100 持有），要么为了改名去杀
      WorkBuddy 的 sidecar（用户正在用的另一个工具，不能擅自动）。

    **✅ 正解：`swap-at-boot.ps1`（PendingFileRenameOperations）**
    ```powershell
    # 右键 -> 以管理员身份运行（这一步确实需要提权，因为要写 HKLM）
    powershell -ExecutionPolicy Bypass -File $WS\scripts\host\swap-at-boot.ps1
    # 看当前挂起项（只读，不需要管理员）
    powershell -ExecutionPolicy Bypass -File $WS\scripts\host\swap-at-boot.ps1 -Check
    # 撤销挂起
    powershell -ExecutionPolicy Bypass -File $WS\scripts\host\swap-at-boot.ps1 -Disarm
    ```
    原理：往
    `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations`
    写一对 `\??\…\app.asar` → `\??\…\app.asar.bak`。SMSS 在**引导早期**执行这个队列，
    那时任何用户态进程（包括 WorkBuddy 和宿主自己）都还没起来，**没有锁能赢**。
    写完重启即可。脚本自带三道闸门：非管理员直接退、`resources\app\` 不存在直接
    `ABORT`（防止改名后没有可引导的树）、重复 arm 会识别已存在的同源项。

    - 已验证（2026-10-28 14:47）：脚本 147 行、纯 ASCII、UTF-8 BOM、`PARSE OK`、
      `-Check` 能正常列出 `PendingFileRenameOperations` 里与 `DeepSeek Harness`
      相关的项（当时 `(none)`，key 里共 18 条别人的项，不动它们）。
    - 已验证 `resources\app\` 是**完整可引导树**：18367 个文件 / 416.3 MB、
      `package.json` `main=lib/main.js` 可解析、
      `dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\index.js` 存在、
      `runtime` 是指向 `..\runtime` 的链接。⇒ 改名后宿主不会变成「无处可启动」。
    - 顺带纠正一个直觉误区：**别指望「提权后用 SYSTEM 身份杀锁」**。锁是文件共享模式
      层面的（`FileShare` 冲突），换什么身份都绕不过，只有「在持锁者启动之前改」或
      「让持锁者自己放手」两条路。这也解释了为什么 14:11 那次 `IsAdmin` 不是原因。

    **✅ 11c. 最终把它做成的其实是「让用户手动改名」这条最土的路（2026-10-28 15:12 验收）**

    走了三条弯路才认这件事，记下来省下次：

    | 方案 | 结果 | 死因 |
    |---|---|---|
    | `restart-host.ps1`（等宿主退出→改名→重启） | ❌ 连续 40 次 rename 失败后 ABORT | WorkBuddy PID 2100 的 `codebuddy --serve` sidecar 一直持有 `app.asar`，跨宿主退出 |
    | `swap-now.ps1` + 计划任务 `dsh-purge-swap-now` | ❌ `Last Result: 1` | 同上；而且计划任务以 Medium 完整性跑，`schtasks /Create` 未提权时建的是 `Interactive only` + 默认 23:59 触发，等于失效 |
    | `swap-at-boot.ps1`（`PendingFileRenameOperations`，管理员 arm） | ⚠️ 条目确实写进去了（`\??\…\app.asar` → `\??\…\app.asar.bak`），但**机器一整天没真重启**（`LastBootUpTime = 2026-10-27 18:27:56`，到 10-28 14:58 仍未变）⇒ SMSS 从没执行过队列 |
    | **用户手动改名**（托盘退出 DSH + 退出 WorkBuddy → 资源管理器改 `app.asar` → `app.asar.bak` → 重开） | ✅ **成功** | — |

    **关键教训**：
    1. **`LastBootUpTime` 是判断「用户说的重启到底是不是重启」的唯一硬证据**，先查它再分析锁。
       用户口语里的「重启」常常只是「重启了应用」。
    2. **有第三条进程链（WorkBuddy / 其他 Electron 工具）持有目标文件时，任何「先杀宿主再改名」的脚本都注定失败**。
       识别工具：Restart Manager（`rstrtmgr.dll` 的 `RmStartSession` + `RmRegisterResources` + `RmGetList`），
       比 `handle.exe` 免安装、比猜快。
    3. **人工改名只要两个前置：① 宿主完全退出 ② 所有其他持有者（含 WorkBuddy 托盘进程）完全退出**。
       改名前用 `[System.IO.File]::Move()` 试一次即可确认；报 `HResult=0x80070020`（`SHARING_VIOLATION`）
       就是还有人持有，报 `0x80070005` 才是权限问题。**本机 `resources\` 对 Authenticated Users 是 Modify，
       从来不需要管理员。**
    4. 结论：**这类「用户一秒能做完、脚本要绕三层」的事，第一轮就该让用户做**，不要先写三个 ps1。
       已写出来的 `swap-at-boot.ps1` 保留作为「用户不方便时」的兜底（它只在真重启后生效）。

12. **宿主 `channel: nightly` 会自己升级，把上面所有成果一次抹掉**（2026-10-27/28 实测）：
    `<DSH_ROOT>\resources\app-update.yml` 里是
    `provider: generic` + `url: https://download.deepseek.com/dsh-desk/feeds/win-x64/` + **`channel: nightly`**。
    结果是 **rc.3 被自动拉下来**，用户没有主动点升级。rc.3 之后的现场是：
    `app.asar` 变回原版归档（补丁标记 0 处）、`resources\app\` 解包目录**被删**、连 `app.asar.bak` 也**被清掉**。
    即 **坑 11 里那次成功的 swap 成果被连根抹平**。

    - **根因不在我们这边**：上游 1.1.80 的 release-notes #176 明确写
      「**不支持 DSH 0.2.1-rc.3 及更新的 rc，请退回 0.2.1-rc.2**」；我们本地是 1.1.73，更不支持。
      所以 rc.3 起不来是**上游未适配的已知状态**，不是配置问题。
    - **处置**：① 在宿主设置里**关掉自动更新**（或至少离开 nightly 通道）；
      ② 已经升上去的，装回 rc.2 安装包；
      ③ 降级后必须重新走一遍 §3.1 的 apply + swap（`app\` 已被删，`restart-host.ps1` 的
      前置检查会直接 `ABORT: resources\app\ does not exist`，这是设计如此，不是 bug）。
    - **判定命令**：`Get-Content '<DSH_ROOT>\resources\app-update.yml'`
      看 `channel:`；再看 `Test-Path resources\app` —— 两者组合就知道自己处在哪个状态。

13. **`spawn EPERM` 的根因是杀毒软件，不是沙箱配置**（2026-10-27/28，**已定位并解决**）：
    症状：`pwsh` 工具一律 `spawn EPERM`，`'x'` 这种纯字符串命令都失败。看起来像 DSH 的
    `AclSandbox` 问题（受限令牌 + `CreateProcessAsUserW`，`app.asar:1844350` 注释原文
    `ERROR_ACCESS_DENIED; Node surfaces it as spawn EPERM`），`:2156034` / `:2156045` 两条 runner
    链路也确实走同一套 Job Object + 受限令牌 —— **但改沙箱策略、装 PowerShell 7 都没用**。
    **真正原因：杀毒软件拦了这条受限令牌创建的进程通道。** 用户关掉杀软后立刻恢复正常。
    - **处置顺序**：① 先让用户临时关/加白杀软，重试一条纯字符串命令；② 恢复了就收工；
      ③ 还没恢复再去看沙箱。
    - 别浪费时间在 `install-pwsh.ps1`、`diag-spawn.ps1` 上 —— 它们只在根因是 shell 分辨率时有用。
14. **`ERR_PNPM_IGNORED_BUILDS` 不是加 `--allow-build` 能解决的**（2026-10-28 实测）：
    本机 pnpm 是 **11.28.5**，`--allow-build` 在这个版本**不是选项**
    （`[ERROR] Unknown option: 'allow-build'`）。上游 README 里
    `pnpm install --allow-build=dsh-purge --allow-build=dsh-purge@<url>` 那串照抄必失败。
    正确位置是 profile 的 **`pnpm-workspace.yaml` → `allowBuilds:`**，且必须
    **2 行都在**（裸包名 `dsh-purge` + 带 **实际 spec** 的 `"dsh-purge@file:…"`；`https://` 键不写，会被 pnpm 11 当版本联合解析）。
    - 这个报错**exit 1 但文件已经拷好**，很容易误判成成功。
    - **上游在这里有真 bug**：`lib/profile-insert.js` 的 `parseAllowBuildLine()` 用非贪婪
      `(\S+?)`，会在**第一个冒号处截断** —— `dsh-purge@file:D:/…` 解析成 `dsh-purge@file`，
      `dsh-purge@https://…` 解析成 `dsh-purge@https`。于是每轮 postinstall 都把坏键写回 yaml，
      真 URL 键反而丢失 → 下次 install 又报同样的错，**死循环**。
      我们的 `0f7ba6c` 已修（值锚定 `(true|false)`、键改贪婪、含 `:` 的键加单引号、
      `purgePnpmBuildSpecs(profileDir)` 读 profile 实际 spec）。
15. **`files[]` 白名单会静默吞掉 `skills/`**（2026-10-28 实测）：
    上游 `a0005ac` 的 `package.json` `files[]` **没有 `skills`**（drop-skills 遗留）。
    我们的 fork 有 `src/skills/`（88 文件：`paper-autopilot/` + `redteam/`），
    `file:` 拷贝只认白名单 ⇒ 装出来的副本 `skills\` 是**空目录（0 文件）**，
    红队技能全丢，而 `pnpm install` **不报任何错**。
    `efcc00c` 已在 `files[]` 补 `"skills",` + `scripts` 加 `"install:skill"`。
    **装完必须数**：`(Get-ChildItem "$inst\skills" -Recurse -File).Count` 应为 **88**。

---

## 8. 回滚

| 场景 | 操作 |
|---|---|
| 回到官方原样 | 退出应用 → 恢复 `app.asar`（去掉 `.bak`）→ `dsh.cmd` 用 `dsh.cmd.dsh-purge.bak` 覆盖回去 → 重开 |
| 停用插件但保留安装 | 从 `profiles/desktop/package.json` 的 `dsh.profile.bundles` 移除 `"dsh-purge"` |
| 回到上一个可用基线 | `git checkout v1.1.73-wyybs` → 删安装副本 → `pnpm install` → 清第 6 节状态 → 重启 |
| 只想撤掉某次移植，定制留着 | `git -C src revert --no-edit <port 提交 sha>` → 删安装副本 → `pnpm install` → 重启 |
| 彻底卸载 | 删 `~/.dsh/profiles/desktop/node_modules/dsh-purge`，去掉 `package.json` 里的 `file:` 依赖，`pnpm install` |
| 被面板更新按钮坑了（`src` 被 reset 到 `origin/master`） | `git -C src reflog` 找回 `local` 的原 HEAD → `git checkout -B local <sha>` → 回写 `file:` spec → 删安装副本 → `pnpm install` → 重启 |
| 宿主升级后补丁全灭 | `app.asar` 被重放 → **先查上游支不支持这个新 rc**（UPDATE-GUIDE §0.5），不支持就装回 rc.2；支持则重新 apply + 用户手动 swap asar（§3.1 / §7 坑 11c） |
| 手滑升了 DSH 到不支持的 rc | ① 装回 `0.2.1-rc.2` 安装包 ② 应用内 `/purge apply` ③ 用户手动把 `app.asar` 改名 `.bak` ④ 重开 ⑤ `/purge status` 复查 61/66 |
| **宿主被 nightly 自动升到 rc.3 起不来** | ① 装回 rc.2 安装包；② 关掉自动更新；③ `/purge apply` 重新解包；④ 完全退出后跑 `restart-host.ps1`。详解见坑 12 |
| 本会话 `pwsh` 报 `spawn EPERM` | **先关/加白杀毒软件**（坑 13 的真正根因），重试一条纯字符串命令；恢复了就继续，别去改沙箱策略、别装 pwsh 7 |
| `pnpm install` 报 `ERR_PNPM_IGNORED_BUILDS` | 改 `pnpm-workspace.yaml` 的 `allowBuilds:` 为 2 行（坑 14）。**不要加 `--allow-build`**（pnpm 11.28.5 没有这个选项）；注意它 exit 1 但文件已拷好 |
| 装完 `skills\` 是空目录 | `files[]` 丢了 `skills`（坑 15，`efcc00c` 已修；合上游时会被覆盖，需复查）；补 `"skills",` 后删副本重装 |

---

## 9. 每次动手前的检查清单

- [ ] `src` 里当前分支是 `local`（`git branch --show-current`）
- [ ] `git status` 干净，改动已提交（别带着脏工作区跑 install）
- [ ] 打好了 tag（出问题能秒回）
- [ ] 宿主已完全退出（托盘退出，进程数 0 —— `Get-Process '*DeepSeek*'` 为空）
- [ ] **没去点面板里的「检查更新 / 立即更新 / 切换版本」**（坑 10：会把 `file:` 依赖
      `git reset --hard` 并改写成上游 codeload 地址）
- [ ] 跨版本：第 6 节四个状态文件已清
- [ ] `app.asar` 已改名为 `app.asar.bak`（坑 11：不改名，补丁打在 `app\` 里也读不到）
- [ ] **装了新版源码后，先 `Remove-Item node_modules\dsh-purge -Recurse -Force` 再
      `pnpm install`**（坑 3：`file:` 依赖不感知内容变化，只跑 install 装的是旧文件）
- [ ] 装完比对安装副本与源码的 SHA256，确认无 `DIFF` / `MISSING`
- [ ] **数一下 `skills\`**：`(Get-ChildItem "$inst\skills" -Recurse -File).Count` 必须是 **88**（坑 15）
- [ ] **`pnpm-workspace.yaml` 的 `allowBuilds:` 是 2 行**（坑 14），且 `pnpm install` exit code 是 **0**
- [ ] 动过 `lib/redteam/**`：跑 UPDATE-GUIDE §5.1 的 64 工具自检（**必须用 stub 宿主 + 切 cwd**，直接 import 会报 `cannot resolve @deepseek-ai/dsh-tools`）
- [ ] 重启后 `/purge status` 无 `✗ app.asar: 还在`、无 `errors.log` 新增
- [ ] **宿主自动更新已关**（`resources\app-update.yml` 的 `channel: nightly` 会自己拉 rc.3，
      坑 12；rc.3 起不来是上游已知未适配）
- [ ] 本会话若 `pwsh` 报 `spawn EPERM`，**先让用户关/加白杀软**（坑 13），别急着改沙箱

---

## 10. 边界

本插件自带的规定（随上游代码保留，维护时不要放宽）：
**禁止对中国大陆、香港、澳门网段/站点做访问、扫描、探测**；只允许「自己的服务器」名单里登记的
**那一个确切 IP 或完整主机名**、离线本地靶标、或**已书面授权**的演练环境。
通配符、网段、密钥、口头说明都不构成例外。
