# dsh-purge 更新文档（给 Little Code Sauce 读的执行契约）

> **位置与路径口径（2026-11-02 起）**：本文件在 **`src\md\`**，与 `FORK-GUIDE.md`、`UPDATE-LOG.md` 同级；
> 文中 `md\X.md` 一律指 `src\md\X.md`（**路径以 `src\` 为根**）。
> **占位符**（脱敏，换机器只需替换这四个，正文不再出现本机绝对路径）：
> `$WS` = 工作区根 · `$SRC` = `$WS\src`（插件包根 / git 仓库） · `<DSH_ROOT>` = DSH 安装目录（`…\Program Files\DeepSeek…`，**名字带空格**） · `<USERPROFILE>` = 当前用户目录。

> **读这份文档的助手请注意 —— 这是硬性流程，不是建议：**
>
> 你被要求读这份文档时，默认任务是**做只读调研，不是做更新**。你必须按顺序走完四个阶段：
>
> **⚡ 先说最常用的那句话：用户只说「读下这个文档」或「跑一遍」时 —— 直接执行 §0.0 的 8 步触发协议**
> （基线核对 → 宿主闸门 → 拉上游 → 对齐镜像 → 算差异 → 判性质 → 按模板汇报 → 等你圈定），
> **一次做完再开口**，不要反问「要做什么」，不要只回「读完了」。
> 换句话说：这句话 = 「体检 + 拉上游 + 告诉我哪些该跟、哪些不跟」。
>
> **⓪ 先查宿主闸门**：上游支持哪个 DSH 版本？**当前本机该不该升 DSH？** —— 见 §0.5，这一条优先于一切。
> **① 先比较**：把「本机正在用的版本」与「候选的新版本」逐项对比，算出到底差了什么。
> **② 再汇报**：把差异整理成「谁改了什么、对我们有什么影响、建议跟进 / 不跟进」的清单给用户看。
> **③ 等确认**：用户会告诉你「哪些要更新」或者「全部更新」。**没拿到明确的"更新/同意/执行"之前，一个字节都不许改。**
> **④ 才执行**：只执行用户圈定的那部分，每步做完立刻报结果，并给出回滚办法。
>
> 禁止事项：不许自作主张 `git reset`、`git checkout -B`、`pnpm install`、重启宿主、改 `app.asar`；
> 不许因为「差异很小」就跳过 ②③；不许把「要不要更新」替用户决定。
> 用户如果说「更新全部」，那就是全部；说「只更新 net-scope」，就只动那一个文件，别顺手把别的也带进来。
>
> 唯一例外：用户开头就写「直接更新」「不用问了」，才可跳过 ②③ 直接进 ④，但仍要在动手前把计划一句话打出来。

---

## 0.0 ⚡ 触发协议：用户说「读下这个文档」/「跑一遍」= 立刻做完整体检并汇报

**这句话不是「请阅读」，是「请体检 + 拉上游 + 列差异 + 给建议」。**
收到后**直接连续执行下面 8 步**，不要反问「需要我做什么」，不要只回「读完了」：

| # | 动作 | 依据 / 命令 | 说明 |
|---|---|---|---|
| 1 | **基线核对** | §0 表逐项：git 状态、HEAD、副本 189 文件 / `skills` 88、`allowBuilds` 2 行、`/dsh-purge/status` = 77/0/6/85、`app.asar` = False | 有偏差先记下来，**仍然继续走完**，最后单列「基线异常」 |
| 2 | **宿主闸门** | §0.5.3 三证据（`dshTarget` / README 矩阵 / release-notes） | 不支持就明写「**不能升 DSH**」并给原话依据 |
| 3 | **拉上游** | `git -C $src fetch upstream --tags --prune` | fetch 失败就报网络问题，其余照跑，别拿旧数据冒充 |
| 4 | **对齐镜像** | §1.1：能 ff 就 ff；不能 ff 就先打 `upstream-mirror-backup-<日期>` tag 再 `branch -f upstream-mirror upstream/master` 并 push | **只动 `upstream-mirror`，绝不动 `local`** |
| 5 | **算差异** | `git diff --stat local upstream-mirror`；`lib/core.js` / `update.js` / `index.js` 的 blob；§1.5 ② `RANGE_HOSTS` 条目数；`git ls-tree -r --name-only upstream-mirror -- skills` 文件数；`git grep -n 'YuJunZhiXue'` | 数字要写实测值，不要写「看起来没变」 |
| 6 | **判性质** | 逐提交按 §1.2.3 打标：**增强 / 修复 / 适配 / 收窄 / 删除 / 文档**；用 §1.5.1 能力基线量收窄；**先翻 `UPDATE-LOG.md` 附录 B（已判定不跟清单），别重复提案** | 收窄、删除一律标「**不跟**」，并写清「砍了什么、我们丢了什么能力」 |
| 7 | **汇报** | 按 §2 模板：差异总览 + 性质分布 + 分组清单（含「性质」列）+ 每条给「跟 / 不跟 / 建议」+ 最后 A~E 选项 | 不许只贴文件列表；不许省掉「不跟」的项目 |
| 8 | **等指令** | 未收到明确「更新 / 跟 / 执行」前，**一个字节都不改**（§0 顶部的硬性流程） | 用户说「全部更新」才是全部；说「只跟 X」就只动 X |

**三种收尾，只许选一种：**

| 情况 | 必须这样回 |
|---|---|
| 基线全绿、上游无新提交 | 一句话结论 + 实测值：「基线全绿（77/0/6/85、副本 189/88、asar=False），上游仍是 `<sha>`（`<版本>`），**无新提交**。」 |
| 有新提交 | 走完第 5–7 步，把「该跟 / 不该跟」分两栏列清，最后给 A~E 选项等圈定 |
| 基线有偏差 | **先讲异常**（哪一项、期望值、实测值、会导致什么），再讲上游差异；未修好之前不建议动上游 |

**明确禁止**：
- 只回「已阅读」「看完了」这种空话；
- 反问「需要我做什么」「要不要查上游」——**默认就要查**；
- 因为「上次刚查过」就不 fetch（本地脚本/面板也可能改过工作区）;
- 把「读下这个文档」理解成「这次不要动上游」；
- 在第 8 步之前顺手 `pnpm install` / 改文件 / 重启宿主。

> 用户若在同一句里追加了范围（例如「只读 §4」「只看 net-scope」「直接更新」），
> 按范围裁剪第 5–7 步的**输出粒度**，但第 1–4 步照跑；「直接更新」按顶部唯一例外处理。

---

## 0.1 文档边界（写什么、不写什么）

| 内容 | 去哪 |
|---|---|
| 下次还要执行的**动作 / 命令 / 判据 / 模板 / 清单** | **本文件** |
| 某天发生了什么、实测数值、移植明细、事故复盘、已判定「不跟」的上游提交 | **`UPDATE-LOG.md`**（append-only） |

三条写作约束：

1. **入口自问**：这是「下次还要执行的动作」吗？是 → 本文件；这是「某天发生过的事」吗？→ log。
2. **单行原则**：本文件里任何背景说明**最多一行**，超了就写进 log，这里只留「见 `UPDATE-LOG.md` 附录 X」。
3. **巡检不改正文**：每次体检/移植的结论只往 log 追加一节；只有**规范本身变了**才动本文件。

---

## 0. 本机基线（2026-10-29 重构）

读这份文档时，先用下面的值核对现场。**任何一项不符就先报告偏差**；
巡检本身继续走完（见 §0.0 第 1 步），但**不要带着基线异常进入执行阶段**。

> **历史沿革（rc.3 事故、杀软导致 `spawn EPERM`、每次验收的实测值）全部在 `md\UPDATE-LOG.md`。**
> 这里只留一条硬结论：**补丁层现在是生效态**（77/0/6/85，`drifted=0`），`app.asar` 已改名，
> 上游从 1.1.82 起是「净化线」（`skills/` 清空、`RANGE_HOSTS` 0、`permittedHost` 恒 false），
> 所以**永远不要**用 `git checkout upstream-mirror -- <目录>` 整目录同步，只能按 §1.2.3 逐 hunk 取。

| 项 | 期望值 | 现状（巡检时核对） |
|---|---|---|
| 源码目录 | `$SRC` | ✓ |
| 当前分支 | `local` | ✓ |
| 当前 HEAD | `e499e03`（`local: allowBuilds 兼容 pnpm 11.28.5 的 file: 依赖`；上一版 `a162c8f` = 1.1.88 移植） | ✓ 已 push，`origin/local` = `e499e03`；tag `port-1.1.88-20261102` |
| port 移植链（底→顶） | `6667999`（seal schema / 6cb2ac3）→ `a6786ee`（#108 / 5d4b45c）→ `becd6aa`（#157 #154 #155 / 671011a）→ `a114362`（#162 #159 / af7cd22）→ `5f7bbc2`（1.1.79 / 24f4a7f）→ `1f0727f`（1.1.80 / 9a8e848）→ `b14e956`（DSH NEXT + 单测 / a0005ac）→ `b124add`（1.1.81 notes / 160b911）→ `c7ab58e`（1.1.82 #180 / 0c933dc）→ `115de05`（1.1.86 / 1bdf239）→ `b771e39`（补回 web-preflight-entry）→ `3523463`（1.1.87 / 335ddee）→ `a162c8f`（1.1.88 / d1eff01） | ✓ **13 条** |
| `local:` 定制清单 | `git -C $src log --oneline --grep='^local:' local` | ✓ 4 条：`d246244`（安装源）、`efcc00c`（`files[]` 加 `skills` + `install:skill`）、`0f7ba6c`（修 `allowBuilds` 键被第一个冒号截断）、`e499e03`（allowBuilds 兼容 pnpm 11.28.5 的 `file:` 依赖） |
| 远端 `origin` | `https://github.com/wyybs/dsh-purge.git`（`local` = 活分支；`master` `4c98517` 存档；`upstream-mirror` `0c933dc`） | ✓ |
| 远端 `upstream` | `https://github.com/YuJunZhiXue/dsh-purge.git`，最新 `d1eff01`（**1.1.88**） | ✓ 已 fetch；`dshTarget` 仍 `0.2.1-rc.2`，**新增 `dshTargets` = [`0.2.1-rc.2`, `0.2.1-rc.5`]** |
| **上游镜像分支** | **`upstream-mirror`** = `d1eff01`（1.1.88；`0c933dc`→`1bdf239`→`d1eff01` 均为 ff） | ✓ 与 `upstream/master` 同点，已 push；快照 tag 见下行 |
| 上游快照 tag | `upstream-snapshot-20261023-ca848d7`、`…-ba12c91`、`…-20261027-24f4a7f`、`…-20261028-160b911`、`upstream-snapshot-20261029-0c933dc`、`upstream-mirror-backup-20261029` | ✓ 已 push |
| 上游与 fork 关系 | **无共同祖先**（`merge-base` 为空），上游 21 个提交，fork 250 | ✓ `rev-list --left-right --count upstream/master...local` = `21 250` |
| 宿主依赖 | `<USERPROFILE>\.dsh\profiles\desktop\package.json` → `"dsh-purge": "file:$SRC"` | ✓（`dsh.profile.bundles` 7 项含 `dsh-purge`；`cordis.patch.yml` L25-26 有本体 insert） |
| 安装副本 | `<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge`，**189 文件**，逐文件比对 **DIFF=0**、MISSING 14（5 个打包白名单外 + 9 个 `test/`），**独立拷贝**（`LinkType` 为空） | ✓ 含 `skills\`（88 文件）、`lib\anchor.js`、`lib\bin-preflight.js`、`lib\subagent-control.js`、`lib\web-reclaim.js` |
| `pnpm-workspace.yaml` | `allowBuilds:` **2 行**：裸包名 `dsh-purge` + `"dsh-purge@file:D:/…/src"`（含 `:` 的键必须双引号；`e499e03` 起由插件自动维护并自愈） | ✓ L14-15 实测两行；**旧的「3 行含 tarball URL」写法已废弃**（`https://` 键会被 pnpm 11 当版本联合解析） |
| 版本号 | `src/package.json` 保持 `1.1.73`（**永不改 version 字段**）；上游已到 **1.1.88** | ✓ 源码与副本都是 1.1.73 |
| tag | `v1.1.73`、`v1.1.73-wyybs`、`v1.1.73-wyybs-port1`（=6667999）、`-port2`（=5f7bbc2）、`v1.1.81-wyybs-port3`（=efcc00c）、`v1.1.81-wyybs-port3.1`（=0f7ba6c）、`v1.1.82-wyybs-port4`（=c7ab58e ← **当前 HEAD**）、`pre-port-20261027`、`pre-rc3-rescue-20261027`、`upstream-mirror-backup-20261029`、5 个 `upstream-snapshot-*` | ✓ 全部已 push |
| **`app.asar`** | **必须是 False**（已改名为 `app.asar.bak`） | ✓ `False`；`app.asar.bak` = True（182,794,869 B）；`resources\app` = True（18367 文件 / 416.3 MB） |
| **补丁状态** | **77 applied / 0 pending / 6 na / 1 skipped / 1 missing_file（共 85 条）**；`drifted = 0`、无 `errors.log`、`*.dshpurge.bak` 58 | ✓ `applied.json` = `2026-11-02T03:28:45Z`；二次 `--apply` 零写入（幂等）；`#80` skipped、`#71 missing_file` 均属预期 |
| **宿主** | **0.2.1-rc.2**（rc.3 起不来 → 用户手动降级）；`app-update.yml` 已改名 `.disabled` 掐断 nightly | ✓ `FileVersion` = 0.2.1-rc.2；GUI 端口每次重启都换（当前 49880） |
| **本会话 shell** | `pwsh` 可用（§0 顶部：EPERM 是杀软导致，已解决） | ✓ 全部命令可跑 |
| **DSH 支持矩阵** | 上游 `dshTarget` 仍 `0.2.1-rc.2`；1.1.88 起 `dshTargets` 声明接受 **rc.2 + rc.5**，但 **README 仍写 rc.3 及更新不支持**（声明自相矛盾） | ✓ `dshTarget`=`0.2.1-rc.2`；rc.5 属「上游自称支持、README 未改口」，**需本机离线实测后才写进文档** |
| **能不能升 DSH** | **rc.2 不动；rc.5 未经实测不升** | ✗ 见 §0.5 —— 升 rc.5 前先按 §1.2 的离线比对法，在 rc.5 的 `resources\app` 副本上跑一遍 85 条，drifted 必须为 0 |

> **「补丁层」和「插件本体」是两个独立的东西，别混**（2026-10-29 14:25 两层全部 ✓）：
>
> | 层 | 从哪加载 | 现在状态 | 坏了的表现 |
> |---|---|---|---|
> | **插件本体**（命令、面板、红队 preset、64 个工具） | `~/.dsh/profiles/desktop/node_modules/dsh-purge` | ✓ 在、189 文件、独立拷贝、`version` 1.1.73 | 面板没按钮 / 命令不存在 / 红队工具变少 |
> | **宿主补丁层**（82 个 `core.js` 补丁：审批门、沙箱策略、提示词注入、隐藏控制台等） | `resources\app\`（解包目录） | ✓ `app.asar` 已改名，applied=61 / pending=0 / skipped=5 | `/purge status` 报 `✗ app.asar: 还在`、applied=0 |
>
> 换句话说：**插件自己的面板和红队工具在没有补丁时照样能用**（它们只是普通插件代码）；
> 补丁管的是「宿主对模型的限制」。所以「现在 purge 能用吗」的答案是：
> **两层都在，全功能可用。** 若哪天 `app.asar` 又回来了，就是「插件功能仍可用、破甲/审批放行失效」。
>
> 唯一非致命缺失项：patch **#71 `LIANGSHEN_IDENTITY_LINE` = `missing_file`**
> （该补丁 `file: ["preset-liangshen","preset-liangshen-pkg"]`、`strictFiles:true`，
> 本机没装「梁神」预设包，属预期缺失，不是故障）。

核对命令（一条条跑，对照上表）：

```powershell
$src='$SRC'
git -C $src branch --show-current
git -C $src log --oneline -1
git -C $src status --porcelain          # 必须为空
git -C $src rev-parse local upstream-mirror   # 全 SHA，可靠（左边是活分支）
# 想要短 hash：--short 只接受单个 rev（多 rev 会报 fatal: Needed a single revision），逐个跑
foreach($r in @('local','origin/local','origin/master','upstream-mirror')){
  "{0,-16} {1}" -f $r, (git -C $src rev-parse --short $r)
}
(Get-Content '<USERPROFILE>\.dsh\profiles\desktop\package.json' -Raw | ConvertFrom-Json).dependencies.'dsh-purge'
Test-Path '<DSH_ROOT>\resources\app.asar'
```

> ⚠️ **宿主目录名带空格，硬编码路径会「假报不存在」。** 2026-11-02 实测：
> 写死 `<DSH_ROOT>…` 时 `Test-Path` / `Test-Path -LiteralPath` / `node fs.statSync`
> 全部返回 False / ENOENT，但用 `Get-ChildItem 'D:\Program Files'` 枚举出来的 `FullName` 就正常。
> 凡是碰宿主路径，一律先枚举取真名：
>
> ```powershell
> $base = (Get-ChildItem 'D:\Program Files' -Directory | Where-Object { $_.Name -like '*Deep*' } | Select-Object -First 1).FullName
> ```
>
> **不开 GUI 也能查补丁状态**（CLI 直读宿主；`DSH_BASE` 必须是 `resources\app\dsh\node_modules\@deepseek-ai`）：
>
> ```powershell
> $env:DSH_SURFACE='desktop'
> $env:DSH_BASE=(Join-Path $base 'resources\app\dsh\node_modules\@deepseek-ai')
> node $SRC\bin\dsh-purge.js --status
> # 需要补打时换成 --apply；打完再 --status 复查 drifted 必须为 0
> ```

---

## 0.5 ⛔ 宿主版本闸门（**优先级最高，先读这一节**）

> **一句话**：`dsh-purge` 是**贴着宿主源码打补丁**的插件。宿主换一个 rc，补丁匹配点就可能全消失。
> **所以「升级 DSH」这个动作，只能在上游明确支持之后做**，而且要由助手先确认、先 port、再通知用户。

### 0.5.1 铁律（写给人也写给助手）

1. **用户不许自己升 DSH**（关掉自动更新、别点升级、别装新版安装包）。想升就一句话：
   「**上游支持新版 DSH 了吗？**」—— 由助手去查。
2. **助手不许在没查上游的情况下说「可以升」**。判断依据只有三个，缺一不可：
   ① 上游 `package.json` 的 `dshTarget`；② 上游 README 的兼容矩阵；③ 上游 release-notes 里关于 rc 的原话。
3. **顺序永远是**：上游发版 → 助手把代码 port 进 `local` → 助手装好并自检 → **助手明确说「可以升了」** → 用户才升 DSH。
   反过来做（用户先升、助手后补）会经历一段「补丁全灭 + 可能起不来」的空窗期，2026-10-27 已经踩过一次。
4. 升 DSH 之后**必须重走一遍** `/purge apply` 解包 + 用户手动改名 `app.asar` → `app.asar.bak`（§4.6.1）。
   这不是可选步骤 —— 宿主的升级程序会把 `resources\app\` 整个删掉、把 `app.asar` 放回来。

### 0.5.2 上游支持矩阵（2026-11-02 快照，`upstream-mirror` = `d1eff01` = 1.1.88）

| DSH 宿主版本 | 该用哪个 dsh-purge | 上游原话 |
|---|---|---|
| `0.2.1-rc.2` | **1.1.88**（我们 `local` 已 port，标 `1.1.73`） | `dshTarget` = `0.2.1-rc.2`；README 仍写 `1.1.81 targets DSH 0.2.1-rc.2` |
| `0.2.0-rc.2` | 1.1.40 或更新 | `0.2.0 still works` |
| `0.1.7`（含 rc.1/rc.2） | 1.1.39 或更旧 | `use 1.1.39 or older` |
| **`0.2.1-rc.5`** | **⚠ 上游声称支持（`dshTargets` + 6 条双 pattern），README 未改口** | release-notes 1.1.88：`#32/#36/#50/#53/#57/#62 在 rc.2 与 rc.5 上都能命中`；`web + desktop 双宿主 73/85 applied、0 pending、0 drifted` |
| **`0.2.1-rc.3` / `rc.4`** | **❌ 不支持** | `DSH 0.2.1-rc.3 and newer RCs are not supported. Stay on 0.2.1-rc.2.` |

> **rc.5 的口径**：上游代码层已适配（85 条里 6 条双 pattern，其余 79 条在 rc.5 上应「不命中但不漂移」），
> 但 README 的 not-supported 没改、我们也没在真机验过 ⇒ **只当「待验证」**。
> 升 rc.5 前必须先在 rc.5 的 `resources\app` **副本**上跑一遍 85 条，`drifted` 必须为 0。

上游 README 原文（`README.md` L60 / L136-139，`README.zh-CN.md` 同款）：
> **1.1.81** targets **DSH 0.2.1-rc.2** (0.2.0 still works). **DSH 0.2.1-rc.3 and newer RCs are not supported.**
> **dsh 0.2.1-rc.3 / rc.4 and newer are not supported.** Unmatched patches stay pending or skipped; nothing is rewritten blindly. Stay on **0.2.1-rc.2**.

release-notes 原文（`release-notes.md` L26 / L35）：
> **#176**：写清 **不支持 DSH 0.2.1-rc.3 及更新的 rc**，请退回 **0.2.1-rc.2**。对不上的补丁待应用或跳过，不乱改文件。

### 0.5.3 一条命令查「上游现在支不支持」（只读，随便跑）

```powershell
$src='$SRC'
git -C $src fetch upstream --tags --prune 2>&1 | Out-Null

'=== ① 上游版本 + dshTarget ==='
git -C $src show upstream/master:package.json | ConvertFrom-Json |
  Select-Object version, dshTarget | Format-List

'=== ② 上游 README 兼容矩阵原话 ==='
git -C $src show upstream/master:README.md |
  Select-String -Pattern 'targets \*\*DSH|not supported|use \*\*1\.1\.|Stay on' |
  ForEach-Object { '  ' + $_.Line.Trim() }

'=== ③ 上游 release-notes 的版本声明（最近 3 条）==='
git -C $src show upstream/master:release-notes.md |
  Select-String -Pattern 'target DSH|适配 DSH|rc\.3|rc\.4' |
  Select-Object -First 6 | ForEach-Object { '  ' + $_.Line.Trim() }

'=== ④ 本机现状对照 ==='
'  本机宿主  : ' + (Get-Item '<DSH_ROOT>\DeepSeek Harness.exe').VersionInfo.FileVersion
'  本机插件  : ' + (Get-Content "$src\package.json" -Raw | ConvertFrom-Json).version
'  插件 dshTarget : ' + ((git -C $src show upstream/master:package.json | ConvertFrom-Json).dshTarget)
'  app.asar  : ' + (Test-Path '<DSH_ROOT>\resources\app.asar') + '  (必须是 False)'
```

判定：

- 上游 `dshTarget` 变成 `0.2.1-rc.3`（或更高）**且** README 里「not supported」那句被改掉
  → **上游已支持新版**，进 §0.5.5 走升级流程。
- 上游 `dshTarget` 还是 `0.2.1-rc.2`，README 仍写着 not supported
  → **不许升**，直接告诉用户「上游还没适配，先别动 DSH」。
- 两者矛盾（`dshTarget` 升了但 README 没改，或反之）→ **以 README + release-notes 为准**，
  并在汇报里把这个矛盾原样说出来。

### 0.5.4 ⚠️ 插件**不会**拒绝启动（必须靠人守闸门）

`dshTarget` 全仓只出现在 `src/package.json:99` 一处，`lib/*.js` 里**没有任何**运行时版本校验。
⇒ 升到不支持的宿主时，插件照样加载、面板照开、命令照敲，只是补丁一条条匹配不上，
**没有任何弹窗警告**。这就是为什么必须靠 §0.5.1 的铁律，而不是指望插件自己挡。

> 详细的「升级副作用」实证（`app.asar` 被放回、`resources\app\` 被删、连 `.bak` 被清）
> 见 `UPDATE-LOG.md` 附录 D5。

### 0.5.5 上游支持之后：从「上游发版」到「用户升 DSH」的完整顺序

**助手做 ①→④，用户做 ⑤→⑦。**

| # | 谁 | 动作 | 完成标志 |
|---|---|---|---|
| ① | 助手 | 确认上游已支持新版 DSH（§0.5.3 三处依据一致） | 汇报「上游 X.Y.Z 适配 DSH A.B.C」 |
| ② | 助手 | 按 §1.5 判断 `lib/core.js` blob 变没变 —— **宿主大版本变了，core.js 一定变，必须跟** | 拿到要 cherry-pick 的提交清单 |
| ③ | 助手 | 按 §4.1 走 `cherry-pick -x` → 前缀 `port:` → §4.4 删副本重装 → §5 + §5.1 自检 | 64 工具自检 OK、`node --test` 全过 |
| ④ | 助手 | **明确通知用户**：「`local` 已适配 DSH A.B.C，可以升宿主了。升完要做 ⑤⑥⑦」 | 用户收到这句话 |
| ⑤ | 用户 | 装新版 DSH 安装包 / 打开自动更新让它升 | `FileVersion` 变成 A.B.C |
| ⑥ | 用户 | 打开宿主 → 应用内 `/purge apply`（或 GUI 面板 Apply）重新解包 | `unpacked_asar:true` |
| ⑦ | 用户 | **完全退出宿主 + 退出 WorkBuddy** → 手动把 `app.asar` 改名成 `app.asar.bak` → 重开（§4.6.1 四步） | `app.asar` = False |
| ⑧ | 助手 | `/purge status` 复查：applied 数是否回到满值（当前 61/66，新宿主可能变） | 无 `✗ app.asar: 还在`、无 `errors.log` 新增 |

> **④ 那句话必须说清楚「现在可以升了」+「升完还要做 ⑤⑥⑦」。** 只丢一句「上游更新了」
> 会让用户以为插件已经能用而直接升，那就又回到空窗期。
>
> **⑤ 之前先确认自动更新是关的**（`resources\app-update.yml` 应已改名 `.disabled`）。
> 升级必须是用户主动动作，不能是 nightly 通道半夜自己拉的。

### 0.5.6 升级 DSH 之后，判断「到底成没成」的硬指标

```powershell
$R='<DSH_ROOT>\resources'
"app.asar      : " + (Test-Path "$R\app.asar")        # 升完重开前会是 True；swap 后必须 False
"resources\app : " + (Test-Path "$R\app")             # 必须 True（apply 解包产物）
"宿主版本      : " + (Get-Item (Join-Path (Split-Path $R) 'DeepSeek Harness.exe')).VersionInfo.FileVersion

# 再看插件活体状态（端口取当前 GUI 地址，会在托盘/窗口标题里；或用下行的自动探测）
$ports = (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
          Where-Object { $_.LocalAddress -in @('127.0.0.1','::1','0.0.0.0') -and $_.LocalPort -ge 1024 }).LocalPort |
         Sort-Object -Unique
foreach($p in $ports){
  try {
    $j = (Invoke-WebRequest -Uri "http://127.0.0.1:$p/dsh-purge/status" -UseBasicParsing -TimeoutSec 3).Content | ConvertFrom-Json
    "port=$p  surface=$($j.surface)  applied=$($j.patches_applied) pending=$($j.patches_pending) skipped=$($j.patches_skipped) sealed=$($j.asar_still_sealed)"
    break
  } catch { }
}
```

| 现象 | 结论 | 处置 |
|---|---|---|
| 版本已是新版，`app.asar`=False，applied 数满 | ✅ 成功 | 收工 |
| 版本已是新版，`app.asar`=True | 还没 swap | 走 §4.6.1（用户手动改名） |
| 版本已是新版，applied **掉了很多**、pending 一堆 | 补丁匹配点变了 ⇒ **上游那一版并不真的适配这个 rc** | 立刻 §6 回滚宿主到 rc.2，向用户报告 |
| 宿主起不来 / 白屏 | 同上 | 装回 rc.2 安装包，`app.asar.bak` 改回 `app.asar`，再走 §4.6.1 |

### 0.5.7 「能不能升」的三种答法（照抄，不许混）

| 情况 | 回答要点 |
|---|---|
| 上游还不支持 | 「**还不能升。**」+ 上游 `dshTarget` 现值 + README 的 not-supported 原话 |
| 上游刚支持、还没 port | 「**上游已支持，但我还没 port。** 现在升会补丁全灭，等我一轮。」 |
| 上游支持 + 已 port + 自检过 | 「**可以升了。**」+ 升完三步：`/purge apply` → 完全退出宿主与 WorkBuddy → 手动把 `app.asar` 改名 `.bak` |

> 说「可以升了」之前，§0.5.5 的 ①→④ 必须全做完。

---

## 1. 阶段一：怎么比较（只读，随便跑）

### 1.1 先把远端最新状态拉下来（不改本地分支）

```powershell
$src='$SRC'
git -C $src fetch origin --tags
git -C $src fetch upstream --tags
# 注意：--short 只接受单个 rev，多 rev 会报 fatal: Needed a single revision
foreach($r in @('local','origin/local','origin/master','upstream-mirror')){ "{0,-16} {1}" -f $r, (git -C $src rev-parse --short $r) }
```

拉完顺手把镜像分支对齐，并给上游留一个快照 tag。**先判能不能 ff，不能就重建（2026-10-29 起上游会重写历史）**：

```powershell
$src='$SRC'
git -C $src merge-base --is-ancestor upstream-mirror upstream/master
if ($LASTEXITCODE -eq 0) {
  # 正常快进
  git -C $src branch -f upstream-mirror upstream/master
} else {
  # 上游 force-push / rebase 过 —— 1.1.82 就是这样：160b911 已不是新线的祖先
  # 先打备份 tag，再重建镜像点（镜像本来就是只读副本，重建不丢我们的东西）
  git -C $src tag -f ("upstream-mirror-backup-" + (Get-Date -Format 'yyyyMMdd')) upstream-mirror
  git -C $src branch -f upstream-mirror upstream/master
  git -C $src push -q -f origin upstream-mirror
}
git -C $src tag ("upstream-snapshot-" + (Get-Date -Format 'yyyyMMdd') + "-" + (git -C $src rev-parse --short upstream/master)) upstream-mirror
git -C $src push -q origin ("upstream-snapshot-" + (Get-Date -Format 'yyyyMMdd') + "-" + (git -C $src rev-parse --short upstream/master))
```

> `upstream-mirror` 是上游只读镜像，全程不参与安装、不在上面 commit。
> 它存在的唯一目的是让「上游改了什么、某个文件哪版被删」永远可查 —— 因为 `master` 与上游
> **无共同祖先**，不能让 `master` 去跟随上游（会丢 238 个提交 + 89 个文件）。
> 详见 `md\FORK-GUIDE.md` §1.2。
>
> ⚠️ **`--ff-only` 不再是硬规则（2026-10-29 起）**：上游已经开始重写历史（1.1.82 那条线
> 把我们镜像的 `160b911` 甩在外面），ff 必然失败。规则改为：**能 ff 就 ff，不能 ff 就先打
> `upstream-mirror-backup-<日期>` tag 再 `branch -f` 重建**。重建只能动 `upstream-mirror`，
> **绝不许动 `local`**。

后续所有比较命令，**上游那一侧一律用 `upstream-mirror`**，不用 `upstream/master` —— 两者
本应一致，但如果对齐失败（说明有人动过镜像或上游又重写了历史），用镜像会立刻暴露问题，
用远端 ref 则会悄悄算错。

### 1.2 判断「有没有新东西」

#### 1.2.1 ⚠️ 先查宿主是否升级（优先级最高）

**这一步比查上游重要。** 宿主升级会同时造成两件事：重新放回 `app.asar`（补丁全部失效）+
改变宿主源码（补丁匹配点可能消失）。而上游是否更新，往往只是**宿主升级带来的后果**。

```powershell
# ① 宿主版本（记下来跟上次比对）
(Get-Item '<DSH_ROOT>\DeepSeek Harness.exe').VersionInfo.FileVersion
# 对照基线：0.2.1-rc.2

# ② app.asar 是否又出现了 ← 最强信号
Test-Path '<DSH_ROOT>\resources\app.asar'
# False = 正常；True = 宿主升级过，补丁已失效

# ③ app\ 解包目录的写入时间（宿主升级会覆盖它）
(Get-Item '<DSH_ROOT>\resources\app').LastWriteTime

# ④ 补丁实际状态（宿主升级后 applied 数会掉）
#    在应用内跑 /purge status，看 "补丁 / patches: N/66 applied"
```

判定表：

| 现象 | 结论 | 动作 |
|---|---|---|
| 版本仍是 `0.2.1-rc.2`，`app.asar` 为 False | 宿主没动、补丁在生效（**当前状态 ✓**） | 继续 §1.2.2 查上游 |
| `app.asar` 变成 True，但 `app\` **还在** | 宿主升级过（归档被放回，解包目录里补丁可能仍可读） | 先 `/purge status` 看 applied 数；掉了就把 `app.asar` 改名（**让用户做**，见 §4.6.1）|
| **`app.asar` 为 True，且 `app\` 不存在** | **最惨：升级把解包目录删了，补丁全部失效，插件等于没装** | ① 应用内 `/purge apply` 重新解包 → ② 完全退出宿主（含 WorkBuddy）→ ③ 用户手动把 `app.asar` 改名成 `app.asar.bak` → ④ 重开宿主（详见 §4.6.1） |
| 跑完脚本 applied 仍 < 61 | 宿主源码变了，补丁匹配不上 | **这时才需要上游适配后的 `core.js`**，进 §1.5 ① 查 blob |
| 版本号变了但 applied 没掉 | 宿主升了但补丁仍匹配 | 只需把 `app.asar` 改名（用户手动），无需跟上游 |

> **反向结论也要记住**：如果 `app.asar` 是 False、版本没变、applied 数没掉，那就算上游推送了
> 一堆提交，你也**不需要更新** —— 你现在的状态是完好的。
>
> **但「补丁在生效」和「插件可用」是两件事**：补丁只改宿主行为。插件本体（红队 preset / 命令 / 面板）
> 是从 `node_modules\dsh-purge` 加载的，跟 `app.asar` 无关，只要安装副本在、宿主重启过、红队 preset 没被
> 禁用，就能用。§1.2.1 判的是**补丁层**，别拿它当「插件能不能用」的唯一结论。

#### 1.2.2 再查上游有没有新东西

按候选来源逐个查，任何一个是新的就要报给用户：

| 候选来源 | 怎么查 | 含义 |
|---|---|---|
| **活分支 `local`（这是「本机在用的」）** | `git -C $src log --oneline local -5` | 我们实际安装的那棵树。**所有对比的左边一律用它** |
| 自己 fork 的 `origin/local` | `git -C $src log --oneline origin/local -5` | 已推送的活分支，与 `local` 应一致 |
| 原作者 `upstream-mirror`（= `upstream/master`） | `git -C $src log --oneline upstream-mirror -5` | YuJunZhiXue 的新提交 |
| 新 tag | `git -C $src tag --list --sort=-creatordate \| Select-Object -First 10` | 带版本号的发布点 |
| 新的 GitHub Release | 看 `https://github.com/wyybs/dsh-purge/releases` 与 `https://github.com/YuJunZhiXue/dsh-purge/releases` | 常附 release-notes.md |

#### 1.2.3 判定优先级（**先于一切 blob 判据，按序判、后者不得推翻前者**）

用户的原则只有一句：**只跟「需要的」和「增强的」；上游收窄能力、删有用功能 —— 一律不跟。**
下面这张表是它的可执行版本：

| 序 | 上游这次干了什么 | 处置 |
|---|---|---|
| 1 | **新增功能 / 修真 bug / 增强健壮性** | **跟。** 优先级：P0 影响正确性 > P1 影响可用性 > P2 体验 |
| 2 | **收窄能力 / 删除有用功能 / 加写死地址 / 把默认改成关闭** | **不跟 —— 即使 `lib/core.js` 的 blob 变了。** 这种情况按 §1.5.1 的能力基线逐项量 |
| 3 | 仅适配宿主版本（blob 变、无收窄） | **必须跟**，否则宿主一升补丁全灭 |
| 4 | 纯 version bump / 纯文档 / 纯翻译 | 不跟（`README` 里「不支持哪个 rc」这类声明是信息，可抄文案，但不动代码） |

> ⚠️ **判定前先翻 `UPDATE-LOG.md` 附录 B**（已判定「不跟」的上游提交），别把评估过的东西重新提一遍。
>
> ⚠️ **`core.js` blob 变化 ≠ 允许夹带收窄。** 只要 blob 变了，就必须逐 hunk 过一遍：
> `git show <上游提交> -- lib/core.js`，把「删工具 / 删白名单条目 / 加 `return false` / 加默认关闭开关」
> 这类段落剥掉再搬，**不许整提交照搬**。
> 落不了干净 patch 时：先 `git cherry-pick -n`，再手工回退收窄 hunk；
> 或者只 `git checkout <上游ref> -- <文件>`，然后从我们这侧把被收窄掉的部分补回去。

#### 1.2.4 上游改动的两种性质（快速对照）

| 性质 | 特征 | 处置 |
|---|---|---|
| **能力收窄/文案调整** | `lib/core.js` 的 blob **不变**；改动集中在 `skills/`、`README`、`net-scope.js` 名单、`redteam/*` 开关 | **不跟。** 跟了只会让能力变少，换不到新功能 |
| **适配宿主版本** | `lib/core.js`（或 `update.js`/`index.js`）的 blob **变了** | **必须跟。** 否则宿主一升级，补丁全部匹配不上 |

判定命令就一条：

```powershell
# 左边必须是 local（本机在装的），不是 origin/master（fork 存档，停在 1.1.73）
git -C $src rev-parse local:lib/core.js upstream-mirror:lib/core.js
```

两个 hash 相同 → 上游没动补丁规则 → 无论它改了多少文件，都不值得跟。

> ⚠️ **别用 `origin/master:lib/core.js`**：`origin/master` 是 fork 的历史存档，它跟上游比永远是「变了」，
> 但那些改动可能早就 `port:` 进 `local` 了。用它当左边会把「已经搬过的」重新算一遍，结论是假的。

### 1.3 算出「差在哪」—— 四种对比，按需选

**A. 本地定制有多少（`master` → `local`）**

```powershell
git -C $src diff --stat master local
```

预期**首次**是 `package.json | 6 +++---`。⚠️ **但这个数字一旦做过部分更新就不再干净**，见 §1.3.1。

判断「哪些是我们自己的定制」不要靠 diff，靠 commit 消息前缀：

```powershell
# 我们的定制（重建时必须重做）
git -C $src log --oneline --grep='^local:' local

# 从上游搬来的（重建时从上游自动获得，不重做）
git -C $src log --oneline --grep='^port:' local
```

#### 1.3.1 每条对比命令用在哪（只记这张表就够）

`git checkout <ref> -- <file>` 是**整文件覆盖**，不是增量插补，所以每做一次部分更新，
`master → local` 就会混进「上游移植」的文件，含义变糊（推演过程见 `UPDATE-LOG.md` 附录 E）。

| 想知道什么 | 用哪条命令 |
|---|---|
| 上游改了什么（**性质判断**，两边都不含我们） | `git diff --stat master upstream-mirror` |
| **我还差什么没拿（更新决策依据 ← 看这条）** | `git diff --stat local upstream-mirror` |
| 只看补丁定义层差什么 | `git diff --stat local upstream-mirror -- lib` |
| 我们的定制有哪些（**重建用**） | `git log --oneline --grep='^local:' local` |
| 从上游搬过哪些（**重建时跳过**） | `git log --oneline --grep='^port:' local` |

> **「要不要更新、工作量多大」的唯一正确命令是 `git diff --stat local upstream-mirror`。**
> `master → local` 只回答「我们的定制有哪些」；`master → upstream-mirror` 只用于看性质。

**B. 上游相对 fork 存档改了多少（`master` → `upstream-mirror`，只看性质）**

> ⚠️ 这条**只用于看「上游改动的性质」**（是收窄能力还是适配宿主），**不用来算我们的工作量**。
> 算工作量用 §1.3.1 表里的 `git diff --stat local upstream-mirror`。

```powershell
git -C $src diff --stat master upstream-mirror
git -C $src diff --numstat master upstream-mirror |
  ForEach-Object {
    $p = $_ -split "`t"
    $dir = if ($p[2] -match '/') { ($p[2] -split '/')[0] } else { '(root)' }
    [pscustomobject]@{ dir=$dir; add=[int]$p[0]; del=[int]$p[1] }
  } | Group-Object dir |
  ForEach-Object {
    [pscustomobject]@{ dir=$_.Name; files=$_.Count;
      add=($_.Group|Measure-Object add -Sum).Sum; del=($_.Group|Measure-Object del -Sum).Sum }
  } | Sort-Object { $_.add + $_.del } -Descending | Format-Table -AutoSize
```

**C. 上游改的新版本（`local` → 某个新 tag/commit）← 这是「我还差多少」的正解**

```powershell
git -C $src diff --stat local <新ref>
git -C $src log --oneline local..<新ref>
```

> 若你只想看上游在两个版本之间改了什么（不含我们的定制），才用 `master → <新ref>`，
> 但那只是「性质参考」，不是工作量。

**D. 存档版和现装版有没有漂移（重要！`file:` 是独立拷贝）**

```powershell
$src='$SRC'
$inst='<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge'
$diff=0
Get-ChildItem $src -Recurse -File -Force | Where-Object { $_.FullName -notmatch '\\\.git\\' } | ForEach-Object {
  $rel = $_.FullName.Substring($src.Length+1)
  $b = Join-Path $inst $rel
  if (-not (Test-Path $b)) { "MISSING $rel"; $script:diff++ }
  elseif ((Get-FileHash $_.FullName -Algorithm SHA256).Hash -ne (Get-FileHash $b -Algorithm SHA256).Hash) { "DIFF $rel"; $script:diff++ }
}
if ($diff -eq 0) { '安装副本与源码完全一致' } else { "漂移 $diff 个文件（预期 5 个是 .gitignore/.npmignore/LICENSE-COMMERCIAL.md/release-notes.md/.github/）" }
```

> 正常情况：报 5 个 `MISSING`，全是打包白名单外的文件。若报 `DIFF`，说明有人直接改了安装副本没改源码 —— 先报告，别顺手覆盖。

### 1.4 关键：判断改动的「性质」

光看行数没用。必须把 diff 落到**这个项目的实际分层**上，才能判断要不要跟：

| 层 | 文件 | 判断要点 |
|---|---|---|
| **安全语义层** | `lib/net-scope.js`、`lib/redteam/*` | 改的是「哪些目标被放行」。**必须逐行看语义，不能只看行数。** |
| **补丁定义层** | `lib/core.js`、`lib/update.js`、`lib/index.js` | 82 个补丁的匹配规则与状态机。**用 blob hash 比，不要肉眼看**（见 §1.5） |
| **面板 UI 层** | `client.js`（~2000 行） | 大部分是文案/字段增删，安全影响小，但会改变面板行为 |
| **打包配置层** | `package.json` 的 `files` / `scripts` | 决定哪些目录会被装进宿主（`skills` 是否随包） |
| **文档层** | `README*.md`、`release-notes.md` | 零运行影响，只看要不要同步声明 |
| **技能库层** | `skills/**` | 不参与补丁逻辑，纯素材 |

### 1.5 三个「一票否决」的快速判定

```powershell
$src='$SRC'
# ① 补丁定义有没有变（左边用 local，不是 origin/master）
#    相同 blob = 我们手上这棵树和上游一致，补丁规则零差异
git -C $src rev-parse local:lib/core.js upstream-mirror:lib/core.js
git -C $src rev-parse local:lib/update.js upstream-mirror:lib/update.js
git -C $src rev-parse local:lib/index.js upstream-mirror:lib/index.js

# ② 放行名单有没有被砍（条目数对比）
$up = git -C $src show upstream-mirror:lib/net-scope.js
$fk = Get-Content "$src\lib\net-scope.js" -Raw
foreach($pair in @(@('upstream',$up), @('fork',$fk))){
  $m = [regex]::Match($pair[1], 'const RANGE_HOSTS = new Set\(\[(?<b>[\s\S]*?)\]\)')
  "$($pair[0]) RANGE_HOSTS 条目数: " + (($m.Groups['b'].Value -split ',' | Where-Object {$_.Trim()}).Count)
}
# 上游若把 permittedHost 改成 return false，等于放行逻辑整根拆掉

# ③ 版本号有没有动（没动 = 上游只是改文档/删文件，没发新版）
"src      : " + ((Get-Content "$src\package.json" -Raw | ConvertFrom-Json).version)
"upstream : " + (git -C $src show upstream-mirror:package.json | ConvertFrom-Json).version
```

#### 1.5.1 能力基线（判断「有没有被收窄」的度量尺）

**不要按上游的措辞判收窄**（它会写成「加固」「收敛攻击面」「安全默认值」），只对照这张表。
任何一项变少、变弱、变成默认关闭 = 收窄 = **不跟**，哪怕它出现在 `core.js` blob 变了的那个提交里：

| 能力 | 基线值 | 怎么量 |
|---|---|---|
| 红队工具数 | **64** | stub 宿主自检（§5.1）数 `redteam_*`；少一个就是收窄 |
| `RANGE_HOSTS` 条目数 | **32** | 上面 §1.5 ② 的脚本 |
| `permittedHost()` | 不得被改成 `return false` | 读 `lib/net-scope.js` |
| 公网靶场 / 长任务 | 不得被无条件拦截 | 读 `lib/redteam/**` 里的门禁分支 |
| 审批放行 / 提示词注入 / 隐藏控制台 | 必须仍在 applied 里（当前 61/66） | `/purge status` 对照 |
| 新增「默认关闭 / 需显式开启」开关 | 一律按收窄处理 | diff 里找 `enabled: false`、`?? false`、`optIn` |
| 写死地址 | 不得出现 `YuJunZhiXue`（上游原文引用除外） | `git grep -n 'YuJunZhiXue' -- lib client.js` |

> 判完性质再谈工作量。**「收窄」的项目不进 cherry-pick 清单**，只在 §2 汇报里列出并标「不跟」，
> 让用户看得见「上游砍了什么、我们没跟」。

---

## 2. 阶段二：汇报模板（用户看的就是这个）

不要贴原始 diff。按下面结构输出，一段都不许省：

```
## 差异总览
- 在用的：local @ 5f7bbc2（version 1.1.73，port 链 5 条）
- 候选的：<ref>（version x.y.z）
- 变了 N 个文件，+A / -D 行（命令：git diff --stat local upstream-mirror）
- 补丁定义（core.js/update.js/index.js）：变了 / 没变（命令见 §1.5 ①）
- 放行名单（net-scope）：变了 / 没变
- **上游性质分布**：增强 A 条 / 修复 B 条 / 适配 C 条 / **收窄 D 条 / 删除 E 条**（D+E>0 时逐条点名）
```

然后是**分组清单**，每组统一五列：

```
### 组：<名字>（风险等级 高/中/低）
| 提交 | 文件 | 改了什么 | 性质（增强/修复/适配/收窄/删除/文档） | 对我们的影响 | 建议 |
|---|---|---|---|---|---|
```

> **「性质」一栏必须逐提交填，不许空。** 出现「收窄 / 删除」的项目，建议一栏一律写 **不跟**，
> 除非用户当轮明确说「这个也要」。

组别固定按这个顺序，方便用户勾选：

1. **安全语义**（`lib/net-scope.js`、`lib/redteam/*`）—— 影响「谁能被探测」
2. **补丁定义**（`lib/core.js` 等）—— 影响 82 个补丁能不能匹配上新宿主
3. **面板 UI**（`client.js`）—— 影响交互
4. **打包配置**（`package.json`）—— 影响安装时带哪些目录
5. **技能库**（`skills/**`）—— 纯素材增减
6. **文档**（`README*.md`）—— 零影响

最后给**选项**，让用户能用一句话回：

```
A. 全部更新到 <ref>
B. 只更新：<组号列表，或具体文件列表>
C. 只更新补丁定义层（保安全语义不变）
D. 不更新，只同步文档
E. 先不动，我要先看某个文件的具体 diff
```

---

## 3. 阶段三：等确认

- 用户回 `A` / `全部` / `按 B 的 1、4` 之类，就照办，**范围严格等于他圈的那些**。
- 用户回 `E` / 问细节，就只读展示，不动文件。
- 用户说「你再分析一下」，就补分析，还是不动。
- 用户没说清楚范围，只回「更新」→ 按 A 执行，但动手前一句话确认：「按全部更新到 `<ref>` 执行」。

---

## 4. 阶段四：执行（拿到确认后才动手）

> **前提：宿主正在运行 → 先提醒用户「改动装完后需要重启宿主」，不要自己重启。**

### 4.0 无论哪种更新，第一步都一样：备份可回滚点

```powershell
$src='$SRC'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
git -C $src tag "pre-update-$stamp"          # 本地回滚点
git -C $src tag -f "v1.1.73-wyybs"           # 保持"当前装的版本"标签不失效
git -C $src tag --list "pre-update-*"
```

再存一份本地改动的补丁（重建法要用）。

**注意：不要用 `git diff master local`**，做过部分更新后它是混合清单（§1.3.1）。正确做法是把
`local:` 开头的提交逐条导出：

```powershell
$src='$SRC'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$out = "$SRC\md\local-$stamp.patch"

# 只导出我们自己的定制（local: 前缀），不含 port: 从上游搬来的
$shas = git -C $src log --format='%H' --grep='^local:' local
if ($shas) {
  $shas | ForEach-Object { git -C $src format-patch -1 --stdout $_ } | Set-Content $out -Encoding UTF8
  "已导出 $($shas.Count) 个 local: 提交 → $out"
} else {
  "没有 local: 提交（异常，至少应有安装源那一条）"
}
```

### 4.1 路线一：**部分更新**（推荐，风险最小）

按文件从目标 ref 取过来，然后按项目规范提交（**`port:` 前缀**，表示来自上游）：

```powershell
$src='$SRC'
$ref='<目标 ref，比如 upstream-mirror 或某个 tag>'
$files=@(
  'lib/net-scope.js',
  'lib/redteam/tools.js'
)
foreach($f in $files){ git -C $src checkout $ref -- $f }
git -C $src status --porcelain
# 逐个复查取过来的文件，确认没有把不该带的东西带进来
git -C $src diff --cached --stat
```

提交（**前缀必须是 `port:`，不是 `local:`**）：

```powershell
git -C $src -c user.name="wyybs" -c user.email="wyybs@users.noreply.github.com" `
  commit -m "port: 移植 $ref 的 lib/net-scope.js、lib/redteam/tools.js"
```

> **为什么前缀要分开：**
> - `local:` = **我们自己的定制**，全量重建时必须手工重做（现在只有 `package.json` 那条）
> - `port:` = **从上游搬来的代码**，全量重建时从上游分支自动获得，不需要重做
>
> 分开之后，`git log --grep='^local:' local` 就是一份永远干净的定制清单，
> 不受「`master → local` diff 变成混合清单」影响（§1.3.1）。
>
> 已有的那条 `d246244 local: 安装源指向 wyybs/dsh-purge 的 local 分支` 前缀已经是 `local:`，
> 无需改历史。

> ⚠️ `skills/**` 这种整目录移植要额外小心：`git checkout $ref -- skills` 会**删掉** `$ref` 里不存在的文件。
> 取之前先 `git -C $src diff --numstat local $ref -- skills` 看清楚是增还是删。

#### 4.1.1 更推荐的做法：`cherry-pick -x` 上游的单个提交

上面那套「`git checkout $ref -- 文件` + 手写 commit」在**上游刚好有对应提交**时不如直接 cherry-pick，
因为 `-x` 会把上游 SHA 写进提交信息，以后能追到源头（`port:` 提交的可追溯性就靠这个）。

```powershell
$src='$SRC'
git -C $src fetch upstream --tags
git -C $src log --oneline upstream-mirror -5        # 挑出要跟的 SHA

# 干跑确认不冲突（不落盘，试完 reset 回去）
git -C $src cherry-pick -n <SHA>
git -C $src status --porcelain
git -C $src reset --hard HEAD
git -C $src clean -fd

# 正式移植
git -C $src -c user.name="wyybs" -c user.email="wyybs@users.noreply.github.com" `
  cherry-pick -x <SHA>
```

`-x` 生成的提交信息末尾会带 `(cherry picked from commit <上游SHA>)`，接着改写前缀：

```powershell
$msg = git -C $src log -1 --format='%B'
$msg = $msg -replace '^\s*', "port: "          # 前缀必须是 port:
[System.IO.File]::WriteAllText("$env:TEMP\port-msg.txt", $msg, (New-Object System.Text.UTF8Encoding($false)))
git -C $src -c user.name="wyybs" -c user.email="wyybs@users.noreply.github.com" `
  commit --amend -F "$env:TEMP\port-msg.txt"
```

验证前缀分离生效：

```powershell
git -C $src log --format='%s' --grep='^local:' local    # 我们的定制
git -C $src log --format='%s' --grep='^port:'  local    # 从上游搬来的
```

> 首例：`6667999` = cherry-pick `-x` 上游 `6cb2ac3`（红队 64 工具全部注册）。

#### 4.1.2 cherry-pick 之后**必查**：上游有没有把地址写死回 `YuJunZhiXue`

上游每次动 `dsh.install` / `readPurgeTarball()` 这类地方，都会把地址写成 `codeload.github.com/YuJunZhiXue/dsh-purge/...`。
这类行一旦混进来，`file:` 钉住会以「本来无声无息」的方式失效。**每次 cherry-pick 完都跑这条**：

```powershell
$src='$SRC'
# 应该只剩「注释/文档里提到上游」的地方；运行代码里出现就是问题
git -C $src grep -n 'YuJunZhiXue' -- '*.js' '*.mjs' 'package.json'
```

判定：

| 出现位置 | 处置 |
|---|---|
| `package.json` 的 `dsh.install` 三处地址 | **必须改回 `wyybs`**（这是 `local:` 定制的核心） |
| `lib/profile-insert.js` 的 `readPurgeTarball()` fallback | **必须改回 `wyybs/dsh-purge` + `local` 分支**（1.1.80 引入的坑，见 `UPDATE-LOG.md` 附录 C） |
| `lib/update.js` 的 `const REPO = "YuJunZhiXue/dsh-purge"` | 保留（面板更新按钮的展示用，别改，改了会和上游冲突） |
| `README*.md` / `release-notes.md` | 保留（只是文档里的安装说明） |

> 这条规则的由来：`d246244 local:` 那次改动只改了 `package.json` 三处。上游 `dbaf377` 就因为把地址换回
> codeload 而被我们跳过（见 `UPDATE-LOG.md` 附录 B）。1.1.80 的 `readPurgeTarball()` 是**新的一处**写死点，移植时一并处理。

### 4.2 路线二：**全量更新**（无共同祖先，不能 merge）

上游被重写过历史，`git merge upstream/master` 会 `fatal: refusing to merge unrelated histories`，
加 `--allow-unrelated-histories` 又会把 `lib/` 全量冲突并删掉 `skills/`。**正确做法是重建**：

```powershell
$src='$SRC'
$ref='<目标 ref>'
$stamp='<4.0 里的 stamp>'

# 0. 先把要重放的 local: 提交记下来（必须在 checkout 之前查，否则分支切走就查不到了）
$localShas = git -C $src log --format='%H' --reverse --grep='^local:' local
"待重放的本地定制: $($localShas.Count) 条"
$localShas

# 1. 从目标 ref 拉一条干净的新分支
git -C $src checkout -B local-next $ref

# 2. 逐条 cherry-pick 回来（保持 local: 前缀，保持提交粒度）
foreach ($sha in $localShas) {
  git -C $src -c user.name="wyybs" -c user.email="wyybs@users.noreply.github.com" `
    cherry-pick $sha
}
git -C $src status --porcelain
```

> **为什么不 `git am` 那个 patch 文件：** `cherry-pick` 走三方合并，`package.json` 即使上游改过
> 周边字段也能自动合上；`git am` 是纯文本补丁，上下文一变就 `patch does not apply`。
> patch 文件只作为 `cherry-pick` 也失败时的兜底（`git apply -3`）。

如果 `cherry-pick` 冲突（通常是 `package.json` 的 `dsh.install` 段被上游动过）：

```powershell
# 手工解决冲突后继续
git -C $src add -A
git -C $src -c core.editor=true cherry-pick --continue

# 或者确认冲突文件内容已正确，直接跳过这次记录
git -C $src cherry-pick --skip
```

冲突解决后**必须复核**这三处仍是 wyybs（cherry-pick 合错方向最常见的后果就是这里回到上游）：

```powershell
(git -C $src show HEAD:package.json | ConvertFrom-Json).dsh.install |
  Format-List preferred, tarball, zip, git
```

再确认没有把 `port:` 提交也重放进来（它们在 `$ref` 里已经有了，重放会重复）：

```powershell
git -C $src log --oneline --grep='^port:' local-next
# 期望：空输出。非空说明 $ref 是从 fork 拿的，而不是从 upstream 拿的
```

```powershell
# 3. 换分支（local-next → local）
git -C $src branch -M local-next local

# 4. 打 tag（必须）
$ver = (Get-Content "$src\package.json" -Raw | ConvertFrom-Json).version
git -C $src tag -f "v$ver-wyybs"
git -C $src tag --list "v*-wyybs"
```

> **重建丢失的是 `local` 的提交历史，不是代码** —— 真正的本地定制只有 `package.json` 那三行，
> 用 cherry-pick 原样搬过来即可。
>
> **重建后必须打 tag**（`v<version>-wyybs`），否则下次又不知道自己装的是哪棵树。
>
> ⚠️ **重建会把 `master` 弄脏**：`local-next` 基于 `$ref`，而 `$ref` 是 `upstream-mirror`，不是
> 本地 `master`。重建后 `git diff --stat master local` 会把「上游那 97 个文件的改动」全算成
> 我们的定制，数字从 `1 file` 暴涨到近百个。**这不是出错**，是 `master` 还停在旧 fork 顶端
> （`4c98517`）而 `local` 已经搬到 upstream 线上的必然结果。
>
> 二选一处理：
>
> | 做法 | 命令 | 后果 |
> |---|---|---|
> | **接受**（推荐） | 什么都不做，继续用 `git log --grep='^local:'` 判断定制 | `master→local` diff 从此不可用，但本来也不该用它 |
> | **对齐** | `git -C $src branch -f master $ref` | `master→local` 恢复成只剩定制几条，但 `master` 不再是「fork 的同源基线」 |
>
> 选「对齐」后要记得：`master` 与 `origin/master`（fork 远端）会分叉，`git push origin master` 会被拒。
> 若确定不再需要 fork 的 master 线，可 `git push -f origin master`，否则别推。

### 4.3 路线三：**只改安装源 / 只改 own-servers 名单**（不动代码）

直接改文件 → 走 §5 的同步与重启。不需要碰 git 历史，但**要提交**，否则下次 `pnpm install` 前
若有人 `git checkout` 就会被抹掉。

### 4.4 装进宿主（任何路线都必须做这一步）

`file:` 是**独立拷贝**，改源码不等于宿主生效。

**三条硬规则**（踩坑经过见 `UPDATE-LOG.md` 附录 D）：

1. **必须先删副本再 install** —— `file:` 在 lock 里只记目录路径，pnpm 判定「已装过」就跳过，源码改了也不拷（D1）。
2. **`--allow-build` 在 pnpm 11.28.5 上不存在** —— 正确机制是 profile 的 `allowBuilds` 段（见下）；缺键会报 `ERR_PNPM_IGNORED_BUILDS`，而且 **exit 1 时文件其实已拷好**，别误判（D3）。
3. **`files[]` 必须含 `skills`** —— 否则副本 `skills\` 是空目录，88 文件全丢且不报错（D2）。

```powershell
# ① 删掉旧的安装副本（file: 依赖不感知内容变化）
$inst = '<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge'
if (Test-Path $inst) { Remove-Item -LiteralPath $inst -Recurse -Force; "已移除旧副本" }

# ② 重装
cd <USERPROFILE>\.dsh\profiles\desktop
& "<USERPROFILE>\.workbuddy\binaries\node\versions\22.22.2-6\node.exe" `
  "<DSH_ROOT>\resources\runtime\primary-runtime\dependencies\pnpm\bin\pnpm.cjs" `
  install
```

留意输出：应为 `+ dsh-purge dsh-purge@file:$SRC`，`Done in …`，exit 0。
**若出现 `ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY` / `no entry for 'dsh-purge@…'`**：
先 `pnpm install --lockfile-only` 重生成 lock，再装一次；仍失败则备份并删 `pnpm-lock.yaml` 后重装。

**`allowBuilds` 必须是这两行**（含 `:` 的键加双引号；`e499e03` 起由插件自动维护并自愈）：

```yaml
allowBuilds:
  dsh-purge: true
  "dsh-purge@file:$SRC": true
```

> **不要再写 `dsh-purge@https://…` 那行**：pnpm 11 会把 URL 当版本联合解析，直接
> `[ERR_PNPM_INVALID_VERSION_UNION]`；而 `file:`/`link:` 这类绝对来源必须写完整 spec，只写裸名会被判 `ignoredBuilds`（`e499e03` 修复）。
> 被写坏时手改成上面两行即可，不必等重装。`ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY` 的处置：
> 先 `pnpm install --lockfile-only` 重生成 lock 再装；仍失败则备份并删 `pnpm-lock.yaml` 后重装。
> **装完必须数 `skills`**：`(Get-ChildItem "$inst\skills" -Recurse -File).Count` 应为 **88**。

**装完立刻验证真的同步了**（不验证等于没装）：

```powershell
$inst='<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge'
$srcd='$SRC'
"安装=$( (Get-FileHash "$inst\lib\redteam\tools.js" -Algorithm SHA256).Hash.Substring(0,12) )"
"源码=$( (Get-FileHash "$srcd\lib\redteam\tools.js" -Algorithm SHA256).Hash.Substring(0,12) )"
# 两个哈希必须相同
```

### 4.5 版本号跨了（宿主大版本也变了）→ 必清状态

仅当**插件版本号变化**或**宿主版本变化**时执行，同版本换装不要清：

```powershell
$d='<USERPROFILE>\.dsh\dsh-purge'
foreach($f in @('installed-rev','applied.json','settle-restart.guard','auto-update-guard.json')){
  if(Test-Path "$d\$f"){ Remove-Item "$d\$f" -Force; "deleted $f" }
}
# errors.log 不要删 —— 那是排查依据
```

> 不清这几个文件的后果：陷入「重打补丁 → 重启 → 再重打」，
> 典型报错 `INACTIVE_EFFECT: cannot create effect on inactive context`。

### 4.6 重启宿主让改动生效

**不要自己重启。** 绝大多数情况只需要用户在托盘退出再打开：

```powershell
# 手动：托盘退出 → 双击 DeepSeek Harness.exe
# 脚本（等进程退出 → 重启 → 复核）：
pwsh -NoProfile -File "$WS\scripts\host\restart-host.ps1"
```

#### 4.6.1 ⚠️ `app.asar` 改名这一步 —— **直接让用户手动做，别写脚本**

这是本项目唯一一件「脚本绕三层、用户一秒完成」的事。**2026-10-28 15:12 最终是靠用户手动改名收工的**，
之前三条脚本路线全部失败，教训必须记住。

**为什么脚本全失败（2026-10-28 实测）**

| 方案 | 结果 | 死因 |
|---|---|---|
| `restart-host.ps1`（等宿主退出→改名→重启） | ❌ 连续 40 次 rename 后 `ABORT rename never succeeded` | 第三个持锁者：`RmGetList(app.asar)` = `2100\|WorkBuddy  16868\|DeepSeek Harness  16336\|DeepSeek Harness`。**PID 2100 = `<WB_ROOT>\WorkBuddy.exe` 的 `codebuddy --serve` sidecar**（`resources\app.asar.unpacked\cli\bin\codebuddy`），横跨宿主完整退出 |
| `swap-now.ps1` + 计划任务 | ❌ `Last Result: 1` | 同上；且未提权建的 `schtasks` 是 `Interactive only` + 默认 23:59 触发，等于没跑 |
| `swap-at-boot.ps1`（`PendingFileRenameOperations`） | ⚠️ 条目写进去了，但**机器一整天没真重启** | `LastBootUpTime = 2026-10-27 18:27:56` 到 10-28 14:58 未变 ⇒ 用户说的「重启」只是重启应用，SMSS 从没执行队列 |
| **用户手动改名** | ✅ **成功并验收** | — |

**正确流程（写给人看的，4 步）**

1. 托盘右键退出 **DeepSeek Harness**（要真正退干净，任务管理器里 6 个进程全部消失）。
2. 退出 **WorkBuddy**（它的 `codebuddy --serve` sidecar 持有 `app.asar`，不退就改不了）。
3. 资源管理器打开 `<DSH_ROOT>\resources\`，把 `app.asar` 改名成 `app.asar.bak`。
4. 双击 `DeepSeek Harness.exe` 重开。

**改名前自检**（可以不提权、一条命令判定）：

```powershell
$asar='<DSH_ROOT>\resources\app.asar'
try { [System.IO.File]::Move($asar,"$asar.probe"); [System.IO.File]::Move("$asar.probe",$asar); 'FREE - can rename' }
catch { 'LOCKED: ' + $_.Exception.HResult.ToString('X8') }
# 0x80070020 = SHARING_VIOLATION（还有人持有，按上表逐个退）
# 0x80070005 = ACCESS_DENIED（极少见；本机 resources\ 对 Authenticated Users 是 Modify）
```

> **权限从来不是瓶颈**：`resources\` 的 ACL 里 `NT AUTHORITY\Authenticated Users` 有 `Modify`，
> 写临时文件实测 OK ⇒ 改名**不需要管理员**，也不需要提权。失败纯是共享冲突。
>
> **换 SYSTEM / 提权杀锁也没用** —— `FileShare` 冲突和身份无关，只有「持锁者自己放手」
> 或「引导早期改」两条路。而「引导早期改」的前置是**机器真重启**，所以它并不可靠。

**`swap-at-boot.ps1` 保留作为兜底**（只在用户确实会重启机器时用）：

```powershell
# 右键 -> 以管理员身份运行（只有写 HKLM 这一步需要提权）
powershell -ExecutionPolicy Bypass -File "$WS\scripts\host\swap-at-boot.ps1"
# 只读检查挂起项（不必提权）
powershell -ExecutionPolicy Bypass -File "$WS\scripts\host\swap-at-boot.ps1" -Check
# 撤销
powershell -ExecutionPolicy Bypass -File "$WS\scripts\host\swap-at-boot.ps1" -Disarm
```

arm 完必须**关机再开机**（不是重启应用）。三道闸门：非管理员直接退 / `resources\app\` 不存在
直接 `ABORT` / 重复 arm 自动识别已存在的同源项。已验证 `resources\app\` 是完整可引导树
（18367 文件 / 416.3 MB，`main=lib/main.js` 可解析，`dsh-desktop-host\lib\index.js` 在，
`runtime` 指向 `..\runtime`），改名后不会出现「无处可启动」。

**swap 成功的验收标志**：

```
app.asar     = False
app.asar.bak = True（182,794,869 B）
resources\app= True（18367 文件）
宿主进程命令行全部走 app\（无 --expose-internals "...\app.asar\dsh\..."）
/dsh-purge/status → applied=61 pending=0 skipped=5 ready=66
                     asar_still_sealed=false patches_lost=false ready=true
dsh.cmd --version → 0.2.1-rc.2，exit 0
```

**收尾清理**（可选，不必提权也能删计划任务；清 HKLM 队列需管理员）：

```powershell
schtasks /Delete /TN dsh-purge-swap-now /F      # 若存在
schtasks /Delete /TN dsh-purge-swap /F          # 若存在
# PendingFileRenameOperations 里残留的 app.asar 两条：源文件已不存在 ⇒ smss 下次引导会跳过，无害
# 想清干净（管理员）：Set-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' `
#   -Name PendingFileRenameOperations -Value @() -Type MultiString
```

---

## 5. 装完必做的验证（缺一条都不算完成）

```powershell
$src='$SRC'
$inst='<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge'

# ① 分支与干净度
git -C $src branch --show-current      # local
git -C $src status --porcelain         # 空

# ② 安装副本版本一致
(Get-Content "$inst\package.json" -Raw | ConvertFrom-Json).version

# ③ 逐文件一致性（预期 5 个 MISSING，0 个 DIFF）
#    用 §1.3 D 的脚本

# ④ 安装源仍指向 wyybs
(Get-Content "$inst\package.json" -Raw | ConvertFrom-Json).dsh.install | ConvertTo-Json -Compress

# ⑤ 语法
Get-ChildItem "$inst" -Recurse -Filter *.js | ForEach-Object {
  node --check $_.FullName 2>&1 | Where-Object { $_ } }   # 应无输出

# ⑥ 宿主侧
Test-Path '<DSH_ROOT>\resources\app.asar'   # 必须是 False
Test-Path '<USERPROFILE>\.dsh\dsh-purge\errors.log'               # 最好是 False
```

### 5.1 红队工具能否全部注册（改了 `lib/redteam/**` 必查）

DSH 0.2.1 的 `dsh-tools` 在编译参数 schema 时是**硬断言**，任何一处不合规都会让
**整份红队预设**注册中断（`dsh-agent-preset` 只 warn 不崩，所以用户看到的是
「红队模式工具变少」而不是报错，极易漏检）。

`<DSH_ROOT>\resources\app\dsh\node_modules\@deepseek-ai\dsh-tools\lib\index.js`
`:699`：

```js
if (!Object.hasOwn(input, "additionalProperties") || typeof input.additionalProperties !== "boolean")
  authorError(`${path}.additionalProperties must be explicitly true or false`);
```

**离线自检脚本**（不需要宿主、不需要重启，直接跑）。

> ⚠️ **2026-10-28 修正：旧版这份脚本在本机跑不通。** 直接 import 安装副本的
> `lib\redteam\tools.js` 会立刻报
> `dsh-purge/redteam/tools: cannot resolve @deepseek-ai/dsh-tools from host`
> （抛点在 `src\lib\redteam\tools.js:99`）—— 因为宿主的 `@deepseek-ai/dsh-tools`
> 打包在 `app.asar` 里，node 的解析器穿不进去。
> 现在 rc.3 之后 `resources\app\` 解包目录也不存在了，所以连"指到解包目录"这条退路都没了。
>
> **正确做法：搭一个 stub 宿主。** `loadDefineTool()` 会扫
> `process.cwd()/package.json`，只要把 cwd 设成一个自带
> `node_modules/@deepseek-ai/dsh-tools` 的临时目录即可。
>
> ```powershell
> $stub="$env:TEMP\dshpurge-stub"
> New-Item -ItemType Directory -Force -Path "$stub\node_modules\@deepseek-ai\dsh-tools" | Out-Null
> # package.json 只要有 name 即可
> '{"name":"dshpurge-stub","version":"1.0.0"}' | Set-Content "$stub\package.json" -Encoding UTF8
> ```
>
> `"$stub\node_modules\@deepseek-ai\dsh-tools\index.js"` 要**复刻宿主的硬断言**
> （否则自检形同虚设）。stub 的 `package.json` 没写 `"type":"module"`，所以
> `index.js` 用 **CommonJS**（`module.exports`）写最省事 —— 实测可用版本：
>
> ```js
> 'use strict'
> function assertSchema(node, path) {
>   if (!node || typeof node !== 'object') return
>   if (Array.isArray(node)) { node.forEach((n, i) => assertSchema(n, path + '[' + i + ']')); return }
>   if (node.type === 'object') {
>     if (!Object.hasOwn(node, 'additionalProperties') || typeof node.additionalProperties !== 'boolean') {
>       throw new Error(path + '.additionalProperties must be explicitly true or false')
>     }
>   }
>   if (node.properties) {
>     for (const k of Object.keys(node.properties)) assertSchema(node.properties[k], path + '.properties.' + k)
>   }
>   if (node.items) assertSchema(node.items, path + '.items')
> }
> function defineTool(spec) {
>   if (!spec || typeof spec !== 'object') throw new Error('defineTool: spec must be an object')
>   if (spec.parameters) assertSchema(spec.parameters, 'parameters')
>   return spec
> }
> module.exports = { defineTool }
> ```
>
> 然后**把 cwd 切到 stub 目录**再跑自检：

```powershell
$node='<USERPROFILE>\.workbuddy\binaries\node\versions\22.22.2-6\node.exe'
$tmp="$env:TEMP\dshpurge-selfcheck.mjs"
@'
process.resourcesPath = '<DSH_ROOT>\\resources'
process.env.DSH_HOME = 'C:\\Users\\admin\\.dsh'
const m = await import('file:///<USERPROFILE>/.dsh/profiles/desktop/node_modules/dsh-purge/lib/redteam/tools.js')
const reg = []
const ctx = new Proxy({}, { get(t,k){
  if (k === 'tools') return { register: (x) => { reg.push(x?.name || '?'); return x } }
  if (k === 'logger') return { info(){}, warn(){}, error(){} }
  return () => {}
}})
try { m.apply(ctx); console.log('OK tools=' + reg.length) }
catch (e) { console.log('FAILED: ' + e.message) }
'@ | Set-Content -Path $tmp -Encoding UTF8
Push-Location "$env:TEMP\dshpurge-stub"
try { & $node $tmp 2>$null | Select-Object -First 1 } finally { Pop-Location }
```

- 预期输出 **`OK tools=64`**（2026-10-28 实测）
- stderr 里的 `ExperimentalWarning: SQLite is an experimental feature` 是噪音，`2>$null` 滤掉
- 若输出 `FAILED: unsupported JSON schema: …additionalProperties must be explicitly true or false`
  → 有新加的工具漏了 `additionalProperties`，看报错里的 `parameters.xxx` 定位
- 若仍报 `cannot resolve @deepseek-ai/dsh-tools from host` → **cwd 没在 stub 目录**，
  或 stub 的 `index.js` 没写 `defineTool` 导出

然后在**应用内**跑 `/purge status`，确认：

- 不出现 `✗ app.asar: 还在`（`asar_still_sealed:false`）
- `补丁 / patches` = **77 applied / 0 pending / 6 na / 1 skipped / 1 missing_file（共 85）**，`drifted` 必须为 **0**
- `patches_lost:false`、`ready:true`
- `#80 MINIMAL_OFFICIAL_TOOLSET` skipped（本机无 minimal 预设）、`#71 LIANGSHEN_IDENTITY_LINE` missing_file（缺「梁神」预设包）—— 两个都属预期
- `errors.log` 没有新增（当前不存在）

命令行侧也可以直接走后端路由拿同一份数据（不用开 GUI）：

```powershell
$r = Invoke-WebRequest -Uri 'http://127.0.0.1:<GUI_PORT>/dsh-purge/status' -UseBasicParsing -TimeoutSec 15
$j = $r.Content | ConvertFrom-Json
'{0} applied={1} pending={2} skipped={3} ready={4} sealed={5} lost={6}' -f `
  $j.surface,$j.patches_applied,$j.patches_pending,$j.patches_skipped,$j.patches_ready,$j.asar_still_sealed,$j.patches_lost
# 期望：desktop applied=77 pending=0 skipped=1 ready=85 sealed=False lost=False（na=6、missing_file=1）
```

再跑一次命令行入口，确认 shim 没坏：

```powershell
& "<DSH_ROOT>\resources\runtime\cli\bin\dsh.cmd" --version
```

---

## 6. 回滚（任一验证失败就立刻回滚，别硬扛）

```powershell
$src='$SRC'

# 回到本次更新前
git -C $src checkout -B local <pre-update-xxx 那个 tag 或 4.0 记下的 SHA>
# 然后：pnpm install → 清状态（若版本号变了）→ 重启

# 或回到上线前的稳定标签
git -C $src checkout -B local v1.1.73-wyybs
```

| 场景 | 处置 |
|---|---|
| 更新后补丁匹配不上（applied 数掉下来） | 回滚 `lib/core.js` 到更新前版本 |
| 更新后放行名单被砍（探测全被拒） | 回滚 `lib/net-scope.js` |
| 更新后技能库消失 | 回滚 `skills/**`，或检查 `package.json` 的 `files` 有没有 `skills` |
| 更新后宿主起不来 | `git checkout -B local <pre-update>` → `pnpm install` → 重启 |
| 面板点更新把 `src` reset 了 | `git -C $src reflog` 找回原 HEAD → `git checkout -B local <sha>` → 回写 `file:` spec → `pnpm install` |
| `app.asar` 又出现了 | **让用户手动改名**（§4.6.1 四步），不要自己写脚本硬试 |

---

## 7. 禁区（每次都要念一遍）

1. **不许点面板的「检查更新 / 立即更新 / 切换版本」**。`lib/update.js:861` 的 `gitResetTo` 会对
   `file:` 依赖执行 `git fetch origin --tags` + `git checkout -B master origin/master`（`force` 默认 true），
   `pinInstalledSpec()`（`lib/update.js:308`）还会把 profile 的 `file:` spec 改写成上游 codeload 地址 ——
   **钉版当场失效**。启动路径不会自动升（`autoUpdateIfNeeded()` 在 `lib/update.js:1128` 直接返回
   `skipped:"manual-only"`），所以只要不点按钮就安全。
2. **不许 `git merge upstream/master`**（无共同祖先），不许 `git rebase`（会改写 `local` 历史）。
3. **不许改 `version` 字段**。插件拿版本号当状态键，改了会反复重打补丁 + 反复重启。
4. **不许把本地改动写进 `lib/core.js`**（342KB，上游几乎天天动）。新功能放 `lib/local/<模块>.js`，
   上游文件只加一行 import。
5. **不许 `git commit` / `git push` 到 `master` 分支**（`master` 只收原作者代码）；`local` 只有用户
   明确要求时才推。
6. **不许在会话内试图改名 `app.asar`**：被宿主 + WorkBuddy sidecar 双重持有，报
   `SHARING_VIOLATION (0x80070020)`；而且宿主一退出，本会话进程链就断。**直接请用户手动改名**
   （§4.6.1 四步），不要先写三个 ps1 再发现全失败。
6.1 **不许自己重启宿主**（会杀掉本会话）。要重启就提示用户。
6.2 **遇到「我做不到、绕不过、要管理员、要物理重启」的操作，第一轮就交给用户。**
   本项目的经验：用户十秒能做完的事（改名、退出 WorkBuddy、重启机器），我写三个脚本各失败一次，
   浪费的是一小时。**不要卡住硬试。**
7. **不许跳过 §2 直接动手**。用户要的是「先看差异再决定」。
7.1 **❌ 绝不许在没查 §0.5 的情况下说出「可以升 DSH」「新版 DSH 没问题」这类话。**
   判定只能依据上游 `dshTarget` + README 兼容矩阵 + release-notes 三处。当前上游 1.1.81
   **明确不支持 0.2.1-rc.3 及更新**，插件运行时**不会**自己拦（`dshTarget` 只是 `package.json:99`
   一个元数据字段，代码里零引用）—— 说错一句话，用户就会升上去然后补丁全灭 + 可能起不来。
7.2 **不许让用户「先升 DSH 再等适配」**。顺序固定：上游适配 → 我们 port 进 `local` → 自检通过 →
   **助手明确说「可以升了」** → 用户才升 → apply 解包 → 用户手动 swap asar → 复查。
   （§0.5.5 的八步表）
8. `REPO` 常量（`lib/update.js:12`）仍硬编码 `"YuJunZhiXue/dsh-purge"`，面板上的
   「GitHub」链接与版本列表都指上游。**这是已知未改项，不在更新范围里，不要顺手改。**
9. **不许给「从上游搬来的代码」用 `local:` 前缀**。`local:` = 我们自己的定制（重建时必须手工重做），
   `port:` = 上游代码移植（重建时从目标 ref 自动获得，不重做）。混用会让 `git log --grep='^local:'`
   这份定制清单失真 —— 而它已经是判断「我们改了什么」的唯一可靠手段（§1.3.1）。
10. **不许用 `git diff master local` 作为「本地改了多少」的依据**。它是混合清单，不是定制清单。
   判断定制用 `git log --grep='^local:' local`；判断工作量用 `git diff --stat local upstream-mirror`。
11. **不许在 `upstream-mirror` 上 commit，也不许 push 它到 `origin`**。它是上游只读镜像，
   一旦混入本地提交，`merge --ff-only` 就会失败，镜像可信度归零；推上去只会让 fork 远端多一条
   别人能误点的分支。`git push origin --all` 这种命令必须避开。
12. **不许把 `master` 重置成 `upstream/master`**。两者**无共同祖先**，重置会丢 238 个提交、
   89 个文件（88 个 `skills/` + 1 个 `scripts/`），并让 `local` 整条链悬空。
   要跟上游就更新 `upstream-mirror`（§1.1），要拿上游代码就在 `local` 上 `port:` 提交。
13. **不许只跑 `pnpm install` 就以为装好了**。`file:` 依赖**不感知源码内容变化**，必须
   先 `Remove-Item node_modules\dsh-purge -Recurse -Force` 再 install，装完比对 SHA256（§4.4）。
   这个坑实测踩过：install exit 0、输出正常，但副本里还是旧文件（见 `UPDATE-LOG.md` 附录 D1）。
14. **不许跳过 §5.1 的红队自检**。动过 `lib/redteam/**` 或 `tools.js` 就必须跑那个 64 工具脚本。
   宿主对 schema 是硬断言，但 `dsh-agent-preset` 只 `logger.warn` 不崩，表现为「工具悄悄变少」，
   不主动查根本发现不了（`lib/index.js:516` / `:738`）。
15. **不许不问地址就 cherry-pick**。上游每次动安装/更新路径都会把 `YuJunZhiXue` 写回去
   （历史上有 `dbaf377`，1.1.80 又新增了 `lib/profile-insert.js` 的 `readPurgeTarball()` fallback）。
   每次移植完必须跑 §4.1.2 的 `git grep -n 'YuJunZhiXue'` 复查，把运行代码里的写死地址改回 `wyybs`
   再提交。这类失效是**静默的** —— 装的时候一切正常，等哪天走了 fallback 才会发现钉的是上游。
16. **不许用 `--allow-build=…` 解决 `ERR_PNPM_IGNORED_BUILDS`**。本机 pnpm 是 **11.28.5**，
   `--allow-build` 不是它的选项（`[ERROR] Unknown option: 'allow-build'`），
   上游 README 里那串命令照抄必失败。正确做法只改 profile 的
   `pnpm-workspace.yaml` → `allowBuilds:`（要 2 行，见 §4.4）。而且这类报错 **exit 1 但文件已经拷好**，
   不看清 exit code 会误判成功。
17. **不许让 `files[]` 丢掉 `skills`**。每次从上游合并 `package.json` 都要数字：
   `(Get-ChildItem "$inst\skills" -Recurse -File).Count` 必须是 **88**。
   上游 `files[]` 漏了 `skills`（drop-skills 遗留），`pnpm install` 装出来的副本 `skills\` 会是**空目录**
   且**不报任何错**，红队技能静默全丢。`efcc00c` 已补，但下次合上游还会被覆盖。
18. **不许直接 import 安装副本的 `lib/redteam/tools.js` 做红队自检**。宿主的
   `@deepseek-ai/dsh-tools` 在 `app.asar` 里，node 解析不进去；rc.3 之后连 `resources\app\`
   解包目录都没了。必须用 §5.1 的 **stub 宿主 + 切 cwd** 那套。
19. **不许把「`spawn EPERM`」当沙箱配置问题处理**。2026-10-27/28 实测根因是
   **杀毒软件**拦 `CreateProcessAsUserW` 的受限令牌通道。先让用户临时关/加白杀软，
   不要浪费时间去改 AclSandbox 策略、也不要去装 pwsh（装了也不管用）。

---

## 8. 一句话摘要（给未来的自己）

> **第一件事不是查上游，是查宿主** —— `Test-Path resources\app.asar` 为 True 就说明宿主升级过、
> 补丁已失效，**让用户手动把 `app.asar` 改名成 `app.asar.bak`**（§4.6.1 四步，别写脚本），
> 再看 applied 数是否还是 61。宿主没问题才需要关心上游。
>
> **第零件事是查「上游支不支持本机宿主版本」**（§0.5）。`dshTarget` 只要还写着 `0.2.1-rc.2`、
> README 还写着 `rc.3 and newer are not supported`，就**绝对不许升 DSH** —— 插件运行时不校验版本，
> 会静默加载然后补丁全部匹配不上。**升级 DSH 是我们主动通知用户，不是用户自己决定。**
>
> 上游要不要跟：**先按 §1.2.3 的优先级判性质，再用 `lib/core.js` 的 blob 做交叉验证。**
> blob 不变 ⇒ 补丁规则没动，剩下的只可能是收窄 / 文案 / 文档 —— **一律不跟**；
> blob 变了 ⇒ 动了补丁定义，**必须逐 hunk 审、剥离收窄后再跟**（「blob 变了必须跟」≠「整提交照搬」）。
> 收窄的度量用 §1.5.1 的能力基线，不看上游怎么措辞。
>
> 三条分支各有各的活：`master` 是 fork 的 238 提交历史存档（谁都不改）；`upstream-mirror` 是上游
> 只读镜像（只许 `--ff-only`，每次 fetch 后打 `upstream-snapshot-*` tag）；`local` 是唯一的活分支。
> **要查「某功能哪版被删/改」查 `upstream-mirror`，不要动 `master`。**
>
> 流程：`git fetch` 拉数据 → 快进 `upstream-mirror` + 打快照 tag → **§0.5 查上游支不支持宿主版本** →
> §1.2.1 查宿主 + §1.5 查 blob →
> 按 §2 分六组报给用户 → 等用户圈范围 → 备份 tag + 导出 `local:` 补丁 → 走 §4.1 部分更新
> （`cherry-pick -x` 上游提交，前缀 `port:`）/ §4.2 重建（cherry-pick `local:`）→
> **删安装副本** → `pnpm install` → 比对 SHA256 → 验证 §5（动过 `lib/redteam/**` 还要跑 §5.1
> 的 64 工具自检）→ 让用户重启 → `/purge status` 复查。任何一步异常，立即 §6 回滚。
>
> **宿主版本升级是单独的线**：上游适配新 rc → 我们 port 完 → 我明确告知用户「可以升了」→
> 用户升 → apply 解包 → 用户手动 swap asar → 复查 applied 数（§0.5.5 八步）。

---
---

## 9. 记录去哪看

历史内容全部在 **[`UPDATE-LOG.md`](./UPDATE-LOG.md)**：变更日志（port / local 全表）、上游 1.1.80 / 1.1.81 逐文件评估、已判定「不跟」的上游提交清单、事故复盘（`file:` 不感知变化、`files[]` 吞 skills、`ERR_PNPM_IGNORED_BUILDS`、`spawn EPERM`、rc.3 清空补丁层）、每次巡检的实测数值。

> **撞冲突先查 `UPDATE-LOG.md` 附录 G「逐文件差异原因速查」**（21 个文件的差异原因 + 处理方式，高发冲突：`core.js` / `net-scope.js` / `package.json`）。
>
> **先看 `UPDATE-LOG.md` 附录 F「待办清单」** —— 还没移植的 9 个文件（红队 `store-core` / `tools` 等）与 rc.5 实测都在那张表里，附「为什么不跟 / 动手前提 / 优先级」。动手前先翻一遍，别重复提案。

> 本文件只写**下次还要执行的动作与规范**。任何「某天发生了什么、为什么改」的内容一律追加到 log，不进这里（判据见 §0.1）。
