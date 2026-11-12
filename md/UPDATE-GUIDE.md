# dsh-purge 更新文档（给 Little Code Sauce 读的执行契约）

> **位置与路径口径（2026-11-02 起）**：本文件在 **`src\md\`**，与 `FORK-GUIDE.md`、`UPDATE-LOG.md` 同级；
> 文中 `md\X.md` 一律指 `src\md\X.md`（**路径以 `src\` 为根**）。
> **占位符**（脱敏，换机器只需替换这四个，正文不再出现本机绝对路径）：
> `$WS` = 工作区根 · `$SRC` = `$WS\src`（插件包根 / git 仓库） · `<DSH_ROOT>` = DSH 安装目录（`…\Program Files\<安装目录>`，**目录名与可执行文件名里都带空格，必须枚举取，别手抄**，见 §0.B） · `<USERPROFILE>` = 当前用户目录。
> `<HOST_EXE>` = 宿主主程序文件名（与目录名同名 + `.exe`，同样带空格，取自 §0.B 的枚举结果）。
>
> 两条替换纪律：① 代码里的 `$src='$SRC'` 是**字面替换**（单引号不做变量展开）——把 `$SRC` 三个字母换成真实路径，别理解成「引用环境变量」；
> ② 所有 `<…>` / `…` 占位符必须**整段替换成实际值再跑**，尤其像 `git remote set-url upstream __NEW_URL__` 这种位置，直接照抄会语法报错。

> **读这份文档的助手请注意 —— 这是硬性流程，不是建议：**
>
> 你被要求读这份文档时，默认任务是**做只读调研，不是做更新**。你必须按顺序走完四个阶段：
>
> **⚡ 先说最常用的那句话：用户只说「读下这个文档」或「跑一遍」时 —— 直接执行 §0.0 的 8 步触发协议**
> （基线核对 → 宿主闸门 → **探测上游死活** → 拉上游或复用末代基线 → 算差异 → 判性质 → 按模板汇报 → 等你圈定），
> **一次做完再开口**，不要反问「要做什么」，不要只回「读完了」。
> 换句话说：这句话 = 「体检 + 探上游 + 告诉我哪些该跟、哪些不跟」。
> **上游自 2026-11-06 起已消失（两地址 404）**，所以第 3 步的探测是每次都必跑的固定动作 —— 详见 §0.0.1。
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
| 1 | **基线核对** | §0.A 结构判据逐项跑命令（分支 / 工作区 / 副本 `DIFF=0` / `app.asar`=False / `app-update.yml`=False / `allowBuilds` 2 行 + §0.B 取快照），再跟 **`UPDATE-LOG.md` 附录 I 最后一条快照**比 | 有偏差先记下来，**仍然继续走完**，最后单列「基线异常」，并**顺手往 log 追加一条新快照**。⚠️ 判基线只认 CLI `--status` 的 patch id 口径；GUI 的 `/dsh-purge/status` 是 rollup 口径，只作展示 |
| 2 | **宿主闸门** | §0.5.1 的四条验收（首轮 `drifted=0` / 二次 apply 幂等 / 真机 `pending=0` / 64 工具 + 测试）；上游复活时才加 §0.5.3 的三证据 | 没验完就明写「**还不能升**」；验完才说「可以升」+ 升完三步 |
| 3 | **探测上游死活** | §0.0.1 的两地址探测（`YuJunZhiXue` + `HunYiSage`，**必须先跑，不许直接 fetch**） | 上游 2026-11-06 起已消失；探测结果要写进汇报，见 §0.0.1 表 |
| 4 | **拉上游 / 复用镜像** | 探测可达 → `git -C $src fetch upstream --tags --prune`；**不可达 → 跳过 fetch，直接用 `final-upstream-1.1.92` 标签当 `BASE_REF`** | fetch 128 不是故障，是既定状态；别拿旧数据冒充「上游没动静」 |
| 4b | **对齐镜像 / 探测复活** | §1.1：能 ff 就 ff；不能 ff 就先打 `upstream-mirror-backup-<日期>` tag 再 `branch -f` 并 push。**上游复活时**才做这一步 | **只动 `upstream-mirror`，绝不动 `local`** |
| 5 | **算差异** | `git diff --stat local upstream-mirror`；`lib/core.js` / `update.js` / `index.js` 的 blob（**比「上游上一版 vs 本次」，见 §1.2.4**）；§1.5 ② `RANGE_HOSTS` 条目数；`git ls-tree -r --name-only upstream-mirror -- skills` 文件数；§4.1.2 的白名单式 `git grep 'YuJunZhiXue'` | 数字要写实测值，不要写「看起来没变」 |
| 6 | **判性质** | 逐提交按 §1.2.3 打标：**增强 / 修复 / 适配 / 收窄 / 删除 / 文档**；用 §1.5.1 能力基线量收窄；**先翻 `UPDATE-LOG.md` 附录 B（已判定不跟清单），别重复提案** | 收窄、删除一律标「**不跟**」，并写清「砍了什么、我们丢了什么能力」 |
| 7 | **汇报** | 按 §2 模板：差异总览 + 性质分布 + 分组清单（含「性质」列）+ 每条给「跟 / 不跟 / 建议」+ 最后 A~E 选项 | 不许只贴文件列表；不许省掉「不跟」的项目 |
| 8 | **等指令** | 未收到明确「更新 / 跟 / 执行」前，**一个字节都不改**（§0 顶部的硬性流程） | 用户说「全部更新」才是全部；说「只跟 X」就只动 X |

### 0.0.1 🔭 上游死活探测（**每次巡检必跑的第 3 步**）

**背景（2026-11-10 实测）**：原作者 `YuJunZhiXue/dsh-purge` 与其新马甲 `HunYiSage/dsh-purge`
经本机代理（`127.0.0.1:7890`）实测 **双双 404**（`git ls-remote` exit 128 `Repository not found`），
最后一次提交是 2026-11-06 01:04 的 `fc6e787` = **1.1.92**；镜像作者 `mmparko` 也于 2026-10-12
声明「暂停更新、不再发版」。⇒ **上游目前是死的**，`fc6e787` 已被钉成 tag **`final-upstream-1.1.92`**。

**但用户要求：每次读文档都要探一次，看上游有没有重新开放。** 所以第 3 步不是可选动作。

```powershell
$ProgressPreference='SilentlyContinue'
# 走代理：本机 git 已配 http.https://github.com.proxy = http://127.0.0.1:7890；
# 若换机器，先补: git config --global http.https://github.com.proxy http://127.0.0.1:7890
# ⚠️ 必须 2>$null：git 把 404 写到 stderr，pwsh 会当成 NativeCommandError 抛出并污染输出。
#    判据只看 $LASTEXITCODE，别看输出文本。
foreach($u in @(
  'https://github.com/YuJunZhiXue/dsh-purge.git',   # 原作者
  'https://github.com/HunYiSage/dsh-purge.git'      # 2026-11-04 迁过去的新地址
)){
  $h = git ls-remote --heads $u 2>$null
  "{0,-46} exit={1}  heads=[{2}]" -f $u, $LASTEXITCODE, (($h | ForEach-Object { ($_ -split "`t")[1] }) -join ',')
}
```

判定与动作：

| 探测结果 | 含义 | 必须做什么 |
|---|---|---|
| 两个地址都 `exit=128` / `Repository not found` | **上游仍是死的**（当前状态） | 跳过 fetch，`BASE_REF` 用 tag `final-upstream-1.1.92`（= `fc6e787`）；汇报里写一句「上游仍 404，无新提交可跟」 |
| 任一地址 `exit=0` | **⚠️ 上游复活了** | **立刻停手并报告**：把 `upstream` 远端改成新地址 → `git fetch upstream --tags --prune` → §1.1 对齐镜像 → 走完整 §1.2 差异计算 → 按 §2 模板汇报。**未经用户圈定不许 port** |
| `exit=0` 但 heads 为空 / 仓库改名转到别处 | 空壳或改址 | 用 `Invoke-RestMethod https://api.github.com/repos/<owner>/<repo>` 确认 `full_name` 与 `pushed_at`，把结论写进汇报 |

**复活后的额外动作**（一次性，别漏）：

```powershell
$src='$SRC'                                    # ← 字面替换成真实路径
git -C $src remote set-url upstream '__NEW_URL__'   # ← 换成探测到的新地址；占位符必须整段替换
git -C $src fetch upstream --tags --prune
git -C $src tag -f final-upstream-1.1.92 fc6e787   # 旧末代基线保留，别删
git -C $src tag ("upstream-revived-" + (Get-Date -Format 'yyyyMMdd')) upstream/master
```

> ⚠️ 本节和 §4.1/§4.2 里出现的 `<新地址>`、`<目标 ref…>`、`<4.0 里的 stamp>` 都是**给人看的占位提示**，
> 不是可直接执行的 PowerShell —— 保留尖括号直接粘进终端会被当成重定向。替换完再跑。

> **顺手扩展侦察（可选，成本很低）**：GitHub 搜索常能发现同类马甲/接盘仓库，
> 复活线索往往先出现在这里 —— `Invoke-RestMethod 'https://api.github.com/search/repositories?q=dsh-purge+in:name&sort=updated&per_page=20'`。
> 2026-11-10 实扫到 `luowang-ui/dsh-purge-plus`（105★）、`lhg-projects/dsh-purge`（21★）、
> `wxcvm/dsh-purge`（6★）等 20 个活跃 fork，但**都不是原作者**，不作为上游判据，只当线索。

> ⚠️ **探测失败 ≠ 网络故障**：`exit 128 Repository not found` 是 GitHub 的明确答复（仓库不存在或已转私有）。
> 只有 `Could not resolve host` / `Connection timed out` / `Failed to connect` 才叫网络问题。
> 别把「404」误报成「我这边网不通，查不了」。

**三种收尾，只许选一种**（汇报里当然要给实测值 —— 那是「这一轮的读数」，取自 §0.B，**别回写进正文**）：

| 情况 | 必须这样回 |
|---|---|
| 基线全绿、上游仍 404 | 一句话结论 + 本轮读数：「基线全绿（CLI patch id 口径 applied=满值、pending=0、drifted=0；副本 `DIFF=0` 且 MISSING 只在白名单内；asar=False、update.yml=disabled），上游两地址仍 404，末代基线 `final-upstream-1.1.92`，**无新提交可跟**。」 |
| 基线全绿、上游无新提交 | 一句话结论 + 本轮读数：「基线全绿（同上口径），上游仍是 `<sha>`（`<版本>`），**无新提交**。」 |
| 有新提交 | 走完第 5–7 步，把「该跟 / 不该跟」分两栏列清，最后给 A~E 选项等圈定 |
| 基线有偏差 | **先讲异常**（哪一项、判据要求、实测值、会导致什么），再讲上游差异；未修好之前不建议动上游，并顺手往 log 追加一条快照 |

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
| 下次还要执行的**动作 / 命令 / 判据 / 阈值 / 模板 / 清单** | **本文件** |
| 某天发生了什么、**任何会随一次 apply / 一次提交而变化的数值**、移植明细、事故复盘、已判定「不跟」的上游提交 | **`UPDATE-LOG.md`**（append-only），数值统一进**附录 I「基线快照」** |

四条写作约束：

1. **入口自问**：这是「下次还要执行的动作 / 判据」吗？是 → 本文件；这是「某天发生过的事」或「今天量出来是多少」吗？→ log。
2. **单行原则**：本文件里任何背景说明**最多一行**，超了就写进 log，这里只留「见 `UPDATE-LOG.md` 附录 X」。
3. **巡检不改正文**：每次体检/移植的结论只往 log 追加一节；只有**规范本身变了**才动本文件。
4. **数值禁令（2026-11-10 新增，血泪）**：本文件**不许出现会变的数字** —— HEAD SHA、`applied` 数、文件数、字节数、
   条数、宿主 `FileVersion`、上游 `dshTarget` 读数、tag 清单，全部只写在 log 附录 I。
   允许留在正文的只有两类：**结构常量**（86 个 patch id、64 个工具、`RANGE_HOSTS` 32 条、`skills` 88 文件 ——
   它们定义「低于这个就是收窄」，是判据阈值）和**合格条件**（`= False` / `DIFF=0` / `pending=0` / `merge-base` 为空）。
   > 教训：数字写进指南的那一刻就开始腐烂 —— 上一版把 20 多行快照写进 §0，两周内十几处过期，巡检天天误报。

---

## 0. 基线核对（**只写「怎么量」，不写「量出来多少」**）

本节回答两个问题：**核对哪些项、合格长什么样**。**具体数值一律不写在这里** ——
HEAD、文件数、applied 数、tag 清单、宿主版本这些每 apply 一次或每提交一次就会变的东西，
全部记在 `UPDATE-LOG.md` **附录 I「基线快照」**（按日期，新→旧）。

三类判据，别混：

| 类型 | 例子 | 会不会变 | 写在哪 |
|---|---|---|---|
| **结构判据** | 分支是 `local`、`merge-base` 为空、`app.asar` = False、副本 `DIFF=0` | 不变（架构决定的） | **本节** |
| **阈值** | 红队 64 工具、`RANGE_HOSTS` 32 条、`skills` 88 文件 —— 低于它就是收窄 | 只在有人主动砍能力时才变 | **本节**（§1.5.1） |
| **快照** | HEAD SHA、`applied` 数、副本文件数、`resources\app` 文件数、宿主 `FileVersion`、上游 `dshTarget` 读数 | 天天变 | **log 附录 I** |

> 巡检时：跑本节命令 → 拿实测值跟 **log 附录 I 最后一条快照**比 → 不一致就是「基线偏差」，
> 报告偏差并**顺手往 log 追加一条新快照**（不回来改本节）。

### 0.A 结构判据（这些不合就是坏了，与数值无关）

| 项 | 怎么量 | 合格 |
|---|---|---|
| 当前分支 | `git -C $src branch --show-current` | `local` |
| 工作区 | `git -C $src status --porcelain` | 空 |
| `local` 与远端同步 | `git -C $src rev-parse local origin/local` | 两个 SHA 相同 |
| 分支职责 | 见 §1.1 末 | `master` 存档、`upstream-mirror` 只读镜像、`local` 唯一活分支 |
| 上游与 fork 关系 | `git -C $src merge-base local upstream-mirror` | **空**（无共同祖先 ⇒ 只能 cherry-pick / 重建，不能 merge） |
| 镜像冻结 | `git -C $src rev-parse upstream-mirror final-upstream-1.1.92` | 两点相同 |
| 宿主依赖 | profile `package.json` 的 `dependencies.'dsh-purge'` | 指向 `$SRC`：**`link:$SRC`（junction，推荐）或 `file:$SRC`（独立拷贝）都合规**；绝不许是 registry 版本号或 tarball URL |
| 安装副本形态 | `(Get-Item $inst) \| Select-Object LinkType,Target` | **两种都合规**：① `LinkType=Junction` 且 `Target` = `$SRC`；② `LinkType` 为空（独立拷贝）。**判据是「它指向 `$SRC` 还是指向别处」**，不是「必须独立」 |
| 副本一致性 | 形态①（junction）：**跳过逐文件比对**（永远 `0/0`，见 §1.3 D）；形态②（独立拷贝）：跑 §1.3 D 的 SHA 脚本 | 形态①看 `Target` = `$SRC`；形态②要 **`DIFF=0`**，`MISSING` 只能是「打包白名单外」的文件（见下） |
| `allowBuilds` | profile `pnpm-workspace.yaml` 的 `allowBuilds:` | **恰好 2 行**：裸包名 + 带引号的来源键。**键前缀跟着安装形态走**：junction 是 `"dsh-purge@link:…"`，独立拷贝是 `"dsh-purge@file:…"` |
| 版本号 | `src/package.json` 的 `version` | **等于 fork 点那版，永不改**（禁区 3） |
| **`app.asar`** | `Test-Path <DSH_ROOT>\resources\app.asar` | **False**（已改名 `.bak`） |
| **`app-update.yml`** | `Test-Path <DSH_ROOT>\resources\app-update.yml` | **False**（应已 `.disabled`） |
| 补丁层自洽 | §0.B 的 CLI `--status` | `pending=0`、`drifted=0`、`errors.log` 不存在；`applied + na + skipped + missing_file` 必须等于 `core.js` 里 `id:` 的总条数 |
| `dshTarget` 分布 | `git grep -n '"dshTarget"' -- package.json` | 只有 `src/package.json` 一处（代码里零引用 ⇒ 插件不会自己拦版本） |

**`MISSING` 的合法集合**（脚本报 MISSING 不算错，只有超集才是错）：
`package.json` 的 `files[]` 之外的文件，即点文件（`.gitignore` / `.npmignore` / `.github/`）、
`LICENSE-COMMERCIAL.md`、`release-notes.md`、`md\` 三份文档、`test\` 全部。
判据：**`MISSING` 里出现 `lib\` / `bin\` / `skills\` / `presets\` / `client.js` 任何一个 = 打包配置坏了**（见禁区 17）。

### 0.B 快照怎么取（数字取完写 log，别写回来）

```powershell
$src='$SRC'
$inst=Join-Path $env:USERPROFILE '.dsh\profiles\desktop\node_modules\dsh-purge'
# 宿主路径一律枚举取（目录名/可执行文件名里都有空格，手抄必漏 —— 实测漏一个空格就全 False）
$base=(Get-ChildItem 'D:\Program Files' -Directory |
        Where-Object { $_.Name -like '*Deep*' -and (Test-Path -LiteralPath (Join-Path $_.FullName 'resources\app')) } |
        Select-Object -First 1).FullName
$exe=(Get-ChildItem -LiteralPath $base -Filter *.exe |
      Where-Object { $_.Name -notlike 'Uninstall*' } | Select-Object -First 1).FullName   # 别拼名字，直接取

# ① 代码侧快照
foreach($r in @('local','origin/local','upstream-mirror')){ "{0,-16} {1}" -f $r,(git -C $src rev-parse --short $r) }
# 计数用 rev-list --count，别用 `log --oneline | Measure-Object`（实测会少报：18 条只数出 14 条）
"port 链 : " + (git -C $src rev-list --count --grep='^port:'  local)
"local 链: " + (git -C $src rev-list --count --grep='^local:' local)
"补丁条数: " + (Select-String -Path "$src\lib\core.js" -Pattern '^\s+id: \d+' -AllMatches).Matches.Count

# ② 宿主侧快照
"宿主版本: " + (Get-Item -LiteralPath $exe).VersionInfo.FileVersion
"app.asar: " + (Test-Path -LiteralPath (Join-Path $base 'resources\app.asar'))
"update.yml: " + (Test-Path -LiteralPath (Join-Path $base 'resources\app-update.yml'))
"app 文件数: " + (Get-ChildItem -LiteralPath (Join-Path $base 'resources\app') -Recurse -File).Count

# ③ 副本侧快照（先记形态，再记数；junction 形态下「文件数」等于源码文件数）
$i = Get-Item -LiteralPath $inst -Force
"副本形态: " + ($(if($i.LinkType){$i.LinkType + " -> " + ($i.Target -join ',')}else{"独立拷贝"}))
"副本文件: " + (Get-ChildItem -LiteralPath $inst -Recurse -File -Force).Count
"skills  : " + (Get-ChildItem (Join-Path $inst 'skills') -Recurse -File).Count

# ④ 补丁状态（**判基线只认这个口径**，别用 GUI 的 rollup 数字）
$env:DSH_SURFACE='desktop'
$env:DSH_BASE=(Join-Path $base 'resources\app\dsh\node_modules\@deepseek-ai')
node "$src\bin\dsh-purge.js" --status
```

> **两套口径必须分清**：CLI `--status` / `patch_status` 是 **patch id 口径**（86 条逐条计数，**判基线用它**）；
> GUI 的 `/dsh-purge/status` 是 **rollup 口径**（同一条清洗链合成一行、把 `na` 摊进 `ready`，数字天然更小）。
> 拿 rollup 的 `applied` 去比 patch id 的 `applied`，会得出「掉了 10 个补丁」的假警报。
> GUI 端口每次重启都换，要么看窗口标题，要么按 §0.5.6 扫端口。

### 0.C 架构：补丁层与插件本体是两个独立的东西

| 层 | 从哪加载 | 里面是什么 | 坏了的表现 |
|---|---|---|---|
| **插件本体** | `<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge` | 命令、面板、红队 preset、64 个工具 | 面板没按钮 / 命令不存在 / 红队工具变少 |
| **宿主补丁层** | `resources\app\`（apply 解包出来的目录） | 86 个 patch id：审批门、沙箱策略、提示词注入、隐藏控制台等 | `/purge status` 报 `✗ app.asar: 还在`、applied=0 |

**补丁管的是「宿主对模型的限制」，不是插件能不能跑。** 面板和红队工具只是普通插件代码，
`app.asar` 回来了也照样能用，只是破甲与审批放行失效。反过来：插件本体缺失时补丁仍在宿主里生效。

> 唯一允许长期存在的 `missing_file`：**#71 `LIANGSHEN_IDENTITY_LINE`**
> （`file: ["preset-liangshen","preset-liangshen-pkg"]` + `strictFiles:true`，本机没装「梁神」预设包 ⇒ 预期缺失）。
> 除它之外出现 `missing_file`，一律当故障查。

---

## 0.5 ⛔ 宿主版本闸门（**优先级最高，先读这一节**）

> **一句话**：`dsh-purge` 是**贴着宿主源码打补丁**的插件。宿主换一个 rc，补丁匹配点就可能全消失。
> **所以「升级 DSH」只能在我们自己完成适配并验收之后做** —— 由助手先 port、先验，再通知用户。

> ⚠️ **闸门的依据已经变了（2026-11-10 之后）**：上游仓库已消失（两地址 404），`dshTarget` / README / release-notes
> 三处证据**永远冻结在 1.1.92 那一刻**，再也不可能「改口说支持新 rc」。
> **所以「等上游宣布支持」这条路已经作废** —— 继续照 §0.5.2 的三证据判据读，只会得出「永远不支持任何新宿主」，
> 而本机实际上已经跑在比它更新的 rc 上。
>
> **现行判据（取代三证据）**：**我们自己 port 完 + 四条验收全过 = 可以升**。
> 完整流程、四类失配怎么重锚、四条验收判据、坑清单 —— **全部在 [`UPGRADE-RUNBOOK.md`](./UPGRADE-RUNBOOK.md)**，
> 本节只保留「什么时候允许动手」这一层判断，操作细节不再在这里重复。

### 0.5.1 铁律（写给人也写给助手）

1. **用户不许自己升 DSH**（关掉自动更新、别点升级、别装新版安装包）。想升就一句话：
   「**这个新版你能适配吗？**」—— 由助手去跑 runbook。
2. **助手不许在没跑 runbook 的情况下说「可以升」**。判据从「上游三证据」换成下面的**四条**（缺一不可）：
   ① 干净副本上首轮 `apply` 后 `drifted = 0`；② **二次 apply 幂等**（`already` 等于首轮命中数）；
   ③ 真机（`DSH_SURFACE=desktop`）状态页 `pending = 0`、`drifted = 0`；
   ④ 红队 64 工具自检通过、`node --test` 全过。
   > 三证据只在「上游复活」时才有意义：那时回到 §0.5.2 先判上游，再跑 runbook。
3. **顺序永远是**：宿主出新包 → 助手照 runbook 适配 → 助手验完四条 → **助手明确说「可以升了」** → 用户才升。
   反过来做（用户先升、助手后补）会经历一段「补丁全灭 + 可能起不来」的空窗期，2026-10-27 已经踩过一次。
4. 升 DSH 之后**必须重走一遍** `/purge apply` 解包 + 用户手动改名 `app.asar` → `app.asar.bak`（§4.6.1）。
   这不是可选步骤 —— 宿主的升级程序会把 `resources\app\` 整个删掉、把 `app.asar` 放回来。

### 0.5.2 上游支持矩阵（**判据，不是读数**）

**判据只有一条**：三处依据（`dshTarget` / README 兼容矩阵 / release-notes）**一致指向同一个 rc** 才算「上游支持」；
**任何两处打架 ⇒ 按「不支持」处理**，并把矛盾原样写进汇报。

由此派生的固定规则（不随读数变化）：

| 情况 | 结论 |
|---|---|
| 三处都说支持某个 rc | 才进 §0.5.5 升级流程（且必须是我们已 port 并自检过的那个 rc）。**上游已死时这条永远不成立**，走 `UPGRADE-RUNBOOK.md` |
| `dshTarget` 写了新版，但 README 的 not-supported 没改（或反之） | **不支持**。这是最常见的一种「假支持」—— 只看 `dshTarget` 会误判 |
| release-notes 只是说「某些补丁在新 rc 上也能命中」 | 那是「部分可用」，**不等于支持**，不能据此放行 |
| 上游 README 明确写「rc.N 及更新不支持」 | 除非它改口，否则**永远不支持**，无论 `dshTarget` 写什么 |

> **当前读数（三处各写了什么、`dshTarget` 现在是哪个 rc、我们自己的 `package.json` 是哪个）一律看
> `UPDATE-LOG.md` 附录 I「基线快照」。** 本文不记录读数 —— 记了就会腐烂，2026-11-10 已经烂过一次。
> 唯一稳定的事实：**本机宿主的版本由用户手动降/升，插件不会自己拦**（`dshTarget` 代码里零引用，见 §0.5.4）。

### 0.5.3 一条命令查「上游现在支不支持」（只读，随便跑）

```powershell
$src='$SRC'
# <DSH_ROOT> 换成真实安装目录、<HOST_EXE> 换成主程序文件名 —— 两者都带空格，按 §0.B 枚举取，手抄必漏
# ⚠️ 上游已 404（§0.0.1）。先探活：可达才 fetch；不可达就把 BASE_REF 指向末代 tag，
# 下面三条 git show 全部用 $BASE 而不是 upstream/master（后者 fetch 失败后是不可靠的陈旧 ref）。
# 2>$null：git 把 404 写到 stderr，pwsh 会当成 NativeCommandError 抛出。
$BASE='final-upstream-1.1.92'
git -C $src ls-remote --heads https://github.com/YuJunZhiXue/dsh-purge.git 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  git -C $src fetch upstream --tags --prune 2>$null
  $BASE='upstream/master'
} else { '上游不可达（404）→ BASE = ' + $BASE }

'=== ① 上游版本 + dshTarget ==='
git -C $src show "${BASE}:package.json" | ConvertFrom-Json |
  Select-Object version, dshTarget, dshTargets | Format-List

'=== ② 上游 README 兼容矩阵原话 ==='
git -C $src show "${BASE}:README.md" |
  Select-String -Pattern 'targets \*\*DSH|not supported|use \*\*1\.1\.|Stay on' |
  ForEach-Object { '  ' + $_.Line.Trim() }

'=== ③ 上游 release-notes 的版本声明（最近 3 条）==='
git -C $src show "${BASE}:release-notes.md" |
  Select-String -Pattern 'target DSH|适配 DSH|rc\.3|rc\.4' |
  Select-Object -First 6 | ForEach-Object { '  ' + $_.Line.Trim() }

'=== ④ 本机现状对照 ==='
'  本机宿主  : ' + (Get-Item -LiteralPath (Join-Path $base '<HOST_EXE>')).VersionInfo.FileVersion
'  本机插件  : ' + (Get-Content "$src\package.json" -Raw | ConvertFrom-Json).version
'  本机 dshTarget : ' + ((Get-Content "$src\package.json" -Raw | ConvertFrom-Json).dshTarget) + '   ← 本机的，不是上游的'
'  app.asar  : ' + (Test-Path '<DSH_ROOT>\resources\app.asar') + '  (必须是 False)'
'  update.yml: ' + (Test-Path '<DSH_ROOT>\resources\app-update.yml') + '  (必须是 False)'
```

判定（照 §0.5.2 那条判据走，不认「看起来像支持」）：

- **三处一致说支持** → 才算「上游已支持」；但这只是**必要条件**，还得跑完 `UPGRADE-RUNBOOK.md` 的四条验收才能说「可以升」。
  ⚠️ **上游已消失，三处读数冻结，这条分支实际上不会触发** —— 保留它只为「上游哪天复活」。
- **`dshTarget` 改了、README 没改（或反之）** → 按「不支持」处理（上游活着的年代适用）。
- **README 改口了、`dshTarget` 还是旧的** → 同样按「不支持」，等上游把两处对齐。
- **release-notes 只说「某几个补丁在新 rc 上能命中」** → 那是部分可用，**不构成支持**。
- 结论一句话给用户：**能升 / 不能升**，加上三处依据的**本轮读数**（读数取自命令输出，别抄文档）。

### 0.5.4 ⚠️ 插件**不会**拒绝启动（必须靠人守闸门）

`dshTarget` 全仓只出现在 `src/package.json:99` 一处，`lib/*.js` 里**没有任何**运行时版本校验。
⇒ 升到不支持的宿主时，插件照样加载、面板照开、命令照敲，只是补丁一条条匹配不上，
**没有任何弹窗警告**。这就是为什么必须靠 §0.5.1 的铁律，而不是指望插件自己挡。

> 详细的「升级副作用」实证（`app.asar` 被放回、`resources\app\` 被删、连 `.bak` 被清）
> 见 `UPDATE-LOG.md` 附录 D5。

### 0.5.5 从「宿主出新包」到「用户升 DSH」的顺序

**适配阶段（①→④）的全部操作细节在 [`UPGRADE-RUNBOOK.md`](./UPGRADE-RUNBOOK.md)**，本节只说顺序和交接点，不重复命令。

| # | 谁 | 动作 | 完成标志 |
|---|---|---|---|
| ① | 助手 | 确认有新版宿主（安装包 / 官方提要），**先开分支**（runbook §1.2） | 分支名 `feat/dsh-<版本>` |
| ② | 助手 | 按 runbook 解包到隔离区、跑基线、列出要重锚的补丁（runbook §2–§3） | 拿到失配清单（按四类对号） |
| ③ | 助手 | 重锚 + 验证四条判据（runbook §4–§5）；**旧 pattern 一字不许删改** | 首轮 `drifted=0` + 二次 apply 幂等 + 真机 `pending=0` + 64 工具 OK |
| ④ | 助手 | **明确通知用户**：「`local` 已适配 DSH A.B.C，可以升宿主了。升完要做 ⑤⑥⑦」 | 用户收到这句话 |
| ⑤ | 用户 | 装新版 DSH 安装包 / 打开自动更新让它升 | `FileVersion` 变成 A.B.C |
| ⑥ | 用户 | 打开宿主 → 应用内 `/purge apply`（或 GUI 面板 Apply）重新解包 | `unpacked_asar:true` |
| ⑦ | 用户 | **完全退出宿主 + 退出 WorkBuddy** → 手动把 `app.asar` 改名成 `app.asar.bak` → 重开（§4.6.1 四步） | `app.asar` = False |
| ⑧ | 助手 | `/purge status` 复查：`applied` 是否回到「满值」（= patch id 总数 − 该宿主下应 na/skipped 的项；新宿主可能整体变） | 无 `✗ app.asar: 还在`、无 `errors.log` 新增、`drifted=0` |

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
"宿主版本      : " + (Get-Item -LiteralPath (Join-Path (Split-Path $R) '<HOST_EXE>')).VersionInfo.FileVersion

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

> 上游已死，**日常只会遇到下面第 1 和第 3 种**；第 2 种只在「上游复活」时才用得上。

| 情况 | 回答要点 |
|---|---|
| **还没适配**（常态） | 「**还不能升。**这个版本我还没跑完适配，现在升会补丁全灭。等我一轮。」（不要说「上游不支持」—— 上游已经没了，这话没有意义） |
| 上游刚宣布支持、我们还没 port（仅复活场景） | 「**上游已支持，但我还没 port。** 现在升会补丁全灭，等我一轮。」 |
| 已 port + 四条验收全过 | 「**可以升了。**」+ 升完三步：`/purge apply` → 完全退出宿主与 WorkBuddy → 手动把 `app.asar` 改名 `.bak` |

> 说「可以升了」之前，`UPGRADE-RUNBOOK.md` 的四条验收（首轮 drift=0 / 二次幂等 / 真机 pending=0 / 64 工具 + 测试全过）必须全绿。

---

## 1. 阶段一：怎么比较（只读，随便跑）

### 1.1 先把远端最新状态拉下来（不改本地分支）

> ⚠️ **2026-11-10 起：上游已 404，`git fetch upstream` 必然 exit 128。**
> **先跑 §0.0.1 探活**：不可达 → 跳过 `fetch upstream`，把 `$BASE` 指向 tag `final-upstream-1.1.92`；
> 可达 → 才走下面的 fetch + 镜像对齐。别把 128 当故障排查，也别拿陈旧 ref 冒充「上游没动静」。

```powershell
$src='$SRC'
git -C $src fetch origin --tags

# 上游探活（§0.0.1）—— 只有可达才 fetch；2>$null 防 pwsh 把 stderr 当异常抛
git -C $src ls-remote --heads https://github.com/YuJunZhiXue/dsh-purge.git 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  git -C $src fetch upstream --tags --prune
  $BASE='upstream/master'
} else {
  '上游不可达（404）→ 复用末代基线，跳过 fetch'
  $BASE='final-upstream-1.1.92'
}
# 注意：--short 只接受单个 rev，多 rev 会报 fatal: Needed a single revision
foreach($r in @('local','origin/local','origin/master','upstream-mirror',"$BASE")){ "{0,-24} {1}" -f $r, (git -C $src rev-parse --short $r) }
```

拉完顺手把镜像分支对齐，并给上游留一个快照 tag。**先判能不能 ff，不能就重建（2026-10-29 起上游会重写历史）**。
**这一段只在上游可达时执行**：

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
# <DSH_ROOT> / <HOST_EXE> 按 §0.B 的枚举结果填（名字带空格，手抄必漏）
# ① 宿主版本（记下来跟上次比对）
(Get-Item -LiteralPath (Join-Path $base '<HOST_EXE>')).VersionInfo.FileVersion
# 对照基线：0.2.1-rc.2

# ② app.asar 是否又出现了 ← 最强信号
Test-Path '<DSH_ROOT>\resources\app.asar'
# False = 正常；True = 宿主升级过，补丁已失效

# ②b app-update.yml 是否又回来了 ← 第二强信号（回来了 = 升级通道又通了，随时会自己升）
Test-Path '<DSH_ROOT>\resources\app-update.yml'
# False = 正常（.disabled）；True = 有人重装宿主，立刻让用户改名

# ③ app\ 解包目录的写入时间（宿主升级会覆盖它）
(Get-Item '<DSH_ROOT>\resources\app').LastWriteTime

# ④ 补丁实际状态（宿主升级后 applied 数会掉）
#    在应用内跑 /purge status，或 GET http://127.0.0.1:<端口>/dsh-purge/status
```

判定表：

| 现象 | 结论 | 动作 |
|---|---|---|
| 版本仍是 `0.2.1-rc.2`，`app.asar` 为 False，`app-update.yml` 为 False | 宿主没动、补丁在生效、升级通道已掐断（**当前状态 ✓**） | 继续 §1.2.2（含 §0.0.1 探活） |
| **`app-update.yml` 又变成 True** | 有人重装了宿主安装包或还原了 resources | **立刻让用户改名 `.disabled`**（不用重启，改名即生效）；再查 `app.asar` 与 applied 数 |
| `app.asar` 变成 True，但 `app\` **还在** | 宿主升级过（归档被放回，解包目录里补丁可能仍可读） | 先 `/purge status` 看 applied 数；掉了就把 `app.asar` 改名（**让用户做**，见 §4.6.1）|
| **`app.asar` 为 True，且 `app\` 不存在** | **最惨：升级把解包目录删了，补丁全部失效，插件等于没装** | ① 应用内 `/purge apply` 重新解包 → ② 完全退出宿主（含 WorkBuddy）→ ③ 用户手动把 `app.asar` 改名成 `app.asar.bak` → ④ 重开宿主（详见 §4.6.1） |
| 跑完脚本 `applied` 明显低于满值（满值 = 总数 − na − skipped − missing_file） | 宿主源码变了，补丁匹配不上 | **这时才需要上游适配后的 `core.js`**，进 §1.5 ① 查 blob |
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
| 原作者 `upstream-mirror`（= 末代 tag `final-upstream-1.1.92`） | `git -C $src log --oneline upstream-mirror -5` | YuJunZhiXue 的提交；**已冻结在 `fc6e787`（1.1.92）** |
| **上游是否复活** | §0.0.1 的两地址探活（`YuJunZhiXue` + `HunYiSage`） | **每次巡检必跑**。复活 → 立刻报告并按 §0.0.1 的额外动作重设 upstream 远端 |
| 新 tag | `git -C $src tag --list --sort=-creatordate \| Select-Object -First 10` | 带版本号的发布点 |
| 新的 GitHub Release | 看 `https://github.com/wyybs/dsh-purge/releases`；原作者地址已 404，改看 §0.0.1 的搜索线索 | 常附 release-notes.md |

> **上游死后的口径**：`upstream-mirror` 已冻结，`git diff local upstream-mirror` 的差异**不会自己变化**。
> 所以「有没有新东西」这个问题的答案将长期是「没有」，除非 §0.0.1 探活成功。
> 这不代表可以不跑 —— 探活就是这一步的全部意义。

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

判定命令就一条（**比的是「上游上一版 → 上游这一版」，不是拿 `local` 去比**）：

```powershell
# $PREV = 上一次的基线 ref（现在是 tag final-upstream-1.1.92）；$BASE = 本次候选 ref
git -C $src rev-parse "${PREV}:lib/core.js" "${BASE}:lib/core.js"
```

两个 hash 相同 → 上游这次没动补丁规则 → 无论它改了多少文件，都不值得跟。

> ⚠️ **别拿 `local:lib/core.js` 和 `upstream-mirror:lib/core.js` 比。** 两者**永远不相等** ——
> `core.js` 里有我们两处 fork 修正（`insertProbe` ×2 + `rollupPatchStatus` 保留「已写入优先于 drifted」，共 16 行，
> 见 §7 第 4 条），两边 hash 天然不同。用这个比法，结论恒为「变了 ⇒ 必须跟」，
> 是假信号。`local` 那侧只用来查「我们落地没落地」。
>
> ⚠️ **也别用 `origin/master:lib/core.js`**：`origin/master` 是 fork 的历史存档，停在 1.1.73，
> 跟上游比永远是「变了」，但那些改动可能早就 `port:` 进 `local` 了。用它当左边会把「已经搬过的」重新算一遍。

### 1.3 算出「差在哪」—— 四种对比，按需选

**A. 本地定制有多少（`master` → `local`）**

```powershell
git -C $src diff --stat master local
```

预期**只有地址改动时**是 `package.json | 6 +++---`（3 处 `dsh.install` 地址）。
⚠️ 这个数字只对「刚 fork、还没 port 过」的树成立；做过任意一次 port 之后它就是混合清单了（见 §1.3.1），别拿它当指标。

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

**D. 存档版和现装版有没有漂移（**只对「独立拷贝」形态有意义**）**

> ⚠️ **先判形态，再决定跑不跑**。当前本机是 **junction**（`node_modules\dsh-purge` → `$SRC`），
> 这时下面的脚本会**恒报 `0 差异`** —— 因为它比的其实是源码和它自己。junction 形态下这一项**不看内容、看指向**：
>
> ```powershell
> $i = Get-Item '<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge' -Force
> "形态: $($i.LinkType)  指向: $($i.Target)"
> # 合格 = LinkType=Junction 且 Target = $SRC（改源码立即生效，无需重装）
> ```
>
> 只有 **`LinkType` 为空**（`file:` 独立拷贝，历史形态）时才跑下面这段：

```powershell
$src='$SRC'
$inst='<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge'
$i = Get-Item $inst -Force
if ($i.LinkType) { "跳过：这是 $($i.LinkType) 形态，指向 $($i.Target)，逐文件比对无意义" ; return }
$diff=0
Get-ChildItem $src -Recurse -File -Force | Where-Object { $_.FullName -notmatch '\\\.git\\' } | ForEach-Object {
  $rel = $_.FullName.Substring($src.Length+1)
  $b = Join-Path $inst $rel
  if (-not (Test-Path $b)) { "MISSING $rel"; $script:diff++ }
  elseif ((Get-FileHash $_.FullName -Algorithm SHA256).Hash -ne (Get-FileHash $b -Algorithm SHA256).Hash) { "DIFF $rel"; $script:diff++ }
}
if ($diff -eq 0) { '安装副本与源码完全一致' } else { "差异 $diff 个文件（MISSING 只许在白名单内，见下行判据）" }
```

> 正常情况：报 **17** 个 `MISSING`，全是打包白名单外的文件 ——
> `.github/workflows/release.yml`、`.gitignore`、`.npmignore`、`LICENSE-COMMERCIAL.md`、`release-notes.md`、
> `md\UPDATE-GUIDE.md`、`md\UPDATE-LOG.md`、`md\FORK-GUIDE.md`（这 8 个）+ `test\` 下 9 个。
> `md\` 三份文档报 MISSING 是**正常的**：`md` 不在 `package.json` 的 `files[]` 里，本来就不随包。
> 若报 `DIFF`，说明有人直接改了安装副本没改源码 —— 先报告，别顺手覆盖。

### 1.4 关键：判断改动的「性质」

光看行数没用。必须把 diff 落到**这个项目的实际分层**上，才能判断要不要跟：

| 层 | 文件 | 判断要点 |
|---|---|---|
| **安全语义层** | `lib/net-scope.js`、`lib/redteam/*` | 改的是「哪些目标被放行」。**必须逐行看语义，不能只看行数。** |
| **补丁定义层** | `lib/core.js`、`lib/update.js`、`lib/index.js` | **86** 个补丁的匹配规则与状态机（`core.js` 里 86 个 `id:`）。**用 blob hash 比，不要肉眼看**（见 §1.5） |
| **面板 UI 层** | `client.js`（~2000 行） | 大部分是文案/字段增删，安全影响小，但会改变面板行为 |
| **打包配置层** | `package.json` 的 `files` / `scripts` | 决定哪些目录会被装进宿主（`skills` 是否随包） |
| **文档层** | `README*.md`、`release-notes.md` | 零运行影响，只看要不要同步声明 |
| **技能库层** | `skills/**` | 不参与补丁逻辑，纯素材 |

### 1.5 三个「一票否决」的快速判定

```powershell
$src='$SRC'
$PREV='final-upstream-1.1.92'   # 上一次的基线 ref
$BASE=$PREV                    # 本次候选；上游复活后改成 upstream/master
# ① 补丁定义有没有变 —— 比「上游上一版 vs 本次」，不要拿 local 比（local 恒不等，见 §1.2.4）
git -C $src rev-parse "${PREV}:lib/core.js" "${BASE}:lib/core.js"
git -C $src rev-parse "${PREV}:lib/update.js" "${BASE}:lib/update.js"
git -C $src rev-parse "${PREV}:lib/index.js" "${BASE}:lib/index.js"

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
| 审批放行 / 提示词注入 / 隐藏控制台 | 必须仍在 `applied` 里（按 patch id 查，别被 rollup 数字骗） | `/purge status` 或 CLI `--status` 对照对应 id |
| 新增「默认关闭 / 需显式开启」开关 | 一律按收窄处理 | diff 里找 `enabled: false`、`?? false`、`optIn` |
| 写死地址 | 运行代码里只允许 §4.1.2 白名单列的 5 处，且 `dsh.install` 三处必须是 `wyybs` | `git grep -n 'YuJunZhiXue' -- lib client.js \| grep -v -E 'update\.js:12\|redteam/ui\.js:360\|client\.js:(143\|501)'` → **输出必须为空**（白名单细节见 §4.1.2） |

> 判完性质再谈工作量。**「收窄」的项目不进 cherry-pick 清单**，只在 §2 汇报里列出并标「不跟」，
> 让用户看得见「上游砍了什么、我们没跟」。

---

## 2. 阶段二：汇报模板（用户看的就是这个）

不要贴原始 diff。按下面结构输出，一段都不许省：

```
## 差异总览
- 在用的：local @ <sha>（version <本机 version>，port 链 <条数>）   ← 全部取实测值，别抄模板
- 候选的：<ref>（version x.y.z）
- 变了 N 个文件，+A / -D 行（命令：git diff --stat local upstream-mirror）
- 补丁定义（core.js/update.js/index.js）：变了 / 没变（命令见 §1.5 ①）
- 放行名单（net-scope）：变了 / 没变
- **上游性质分布**：增强 A 条 / 修复 B 条 / 适配 C 条 / **收窄 D 条 / 删除 E 条**（D+E>0 时逐条点名）
```

然后是**分组清单**，每组统一六列（表头本来就六列，别再写成五列）：

```
### 组：<名字>（风险等级 高/中/低）
| 提交 | 文件 | 改了什么 | 性质（增强/修复/适配/收窄/删除/文档） | 对我们的影响 | 建议 |
|---|---|---|---|---|---|
```

> **「性质」一栏必须逐提交填，不许空。** 出现「收窄 / 删除」的项目，建议一栏一律写 **不跟**，
> 除非用户当轮明确说「这个也要」。

组别固定按这个顺序，方便用户勾选：

1. **安全语义**（`lib/net-scope.js`、`lib/redteam/*`）—— 影响「谁能被探测」
2. **补丁定义**（`lib/core.js` 等）—— 影响 **86** 个补丁能不能匹配上新宿主
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
$ref='__TARGET_REF__'                 # ← 换成真实 ref（upstream-mirror / 某个 tag）；尖括号占位符不许直接跑
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
> - `local:` = **我们自己的定制**，全量重建时必须手工重做（条数与清单见 `UPDATE-LOG.md` 附录 I 快照）
> - `port:` = **从上游搬来的代码**，全量重建时从上游分支自动获得，不需要重做
>
> 分开之后，`git log --grep='^local:' local` 就是一份永远干净的定制清单，
> 不受「`master → local` diff 变成混合清单」影响（§1.3.1）。
>
> 已有的本地定制提交前缀都已经是 `local:`，无需改历史（逐条清单见 `UPDATE-LOG.md` 附录 I 快照）。

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

上游每次动 `dsh.install` / 更新路径这类地方，都会把地址写成 `codeload.github.com/YuJunZhiXue/dsh-purge/...`。
这类行一旦混进来，`file:` 钉住会以「本来无声无息」的方式失效。**每次 cherry-pick 完都跑这条**：

```powershell
$src='$SRC'
git -C $src grep -n 'YuJunZhiXue' -- '*.js' '*.mjs' 'package.json'
```

**白名单（2026-11-10 实测：运行代码里 5 处 + 文档若干，多一处都算移植事故）**：

| 出现位置 | 实测内容 | 处置 |
|---|---|---|
| `package.json:99` 附近的 `dsh.install` 三处（`tarball` / `zip` / `git`） | 已是 `wyybs/dsh-purge` + `local` 分支 ✓ | **必须保持 `wyybs`**（`local:` 定制的核心）；被上游改回来就改回去 |
| `package.json:62 / :64 / :66` 的 `repository.url` / `homepage` / `bugs.url` | 仍是 `YuJunZhiXue` | **建议一并改成 `wyybs`**（面板「GitHub」入口会读它）；不改不影响安装，属于待办 |
| `lib/update.js:12` `const REPO = "YuJunZhiXue/dsh-purge"` | 保留 | **保留**。`L190-199 / L307 / L394` 的 codeload 地址全部由它拼出来，改它会和上游每次冲突 |
| `client.js:143`、`client.js:501` 的 `welcome.repo` | 保留（欢迎页文案） | **保留**；要改就两处一起改，别只改一处 |
| `lib/redteam/ui.js:360` 的 `return 'YuJunZhiXue/dsh-purge'` | 保留（面板展示用） | **保留** |
| `README*.md` / `release-notes.md` | 保留 | 保留（只是文档里的安装说明） |

> 判据命令（**输出必须为空**）：
>
> ```powershell
> git -C $src grep -n 'YuJunZhiXue' -- lib client.js |
>   grep -v -E 'update\.js:12|redteam/ui\.js:360|client\.js:(143|501)'
> ```
>
> 这条规则的由来：`d246244 local:` 那次只改了 `package.json` 三处；上游 `dbaf377` 因为把地址换回
> codeload 被我们跳过（见 `UPDATE-LOG.md` 附录 B）。**1.1.80 那处写死点不是 `readPurgeTarball()`**
> （该函数在当前代码里已不存在，`git grep readPurgeTarball` 只命中本文档），真正会复发的是
> `package.json` 的 `dsh.install` 三处 + 上面那 4 处展示文案。

> ⚠️ 代码里**没有** `readPurgeTarball()`。旧版本（1.1.80 那一代）有过这个 fallback，现在已删；
> 看到别处文档提它，按「历史遗留」处理，别去代码里找。

### 4.2 路线二：**全量更新**（无共同祖先，不能 merge）

上游被重写过历史，`git merge upstream/master` 会 `fatal: refusing to merge unrelated histories`，
加 `--allow-unrelated-histories` 又会把 `lib/` 全量冲突并删掉 `skills/`。**正确做法是重建**：

```powershell
$src='$SRC'
$ref='__TARGET_REF__'                  # ← 换成真实 ref（upstream-mirror / 某个 tag），别带着尖括号跑
$stamp='__STAMP_FROM_4_0__'           # ← 换成 §4.0 里那条 pre-update-<stamp> 的实际时间戳

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

### 4.4 装进宿主（**先判形态**：`link:` 不用重装，`file:` 才要）

**两种安装形态，做法完全不同**：

| 形态 | 判定 | 改源码后怎么生效 | 本节是否适用 |
|---|---|---|---|
| **`link:`（junction，当前本机）** | `(Get-Item $inst).LinkType` = `Junction`，`Target` = `$SRC` | **立即生效**（目录就是源码），只需**重启宿主**加载新代码 | **不适用**，跳过 ①②，直接重启 |
| **`file:`（独立拷贝，历史形态）** | `LinkType` 为空 | 要删副本重装（下面三条硬规则） | 适用 |

> 怎么切形态：profile `package.json` 的 `dependencies.'dsh-purge'` 写 `link:$SRC` 或 `file:$SRC`，
> 然后 `pnpm install`。**`link:` 的好处是不用反复删装、也不会出现「install exit 0 但副本还是旧文件」（D1）**；
> 代价是安装副本与源码同体，`Remove-Item` 副本等于删源码 —— 见禁区 13.1。

`file:` 是独立拷贝，改源码不等于宿主生效。**下面只对 `file:` 成立**：

**三条硬规则**（踩坑经过见 `UPDATE-LOG.md` 附录 D）：

1. **必须先删副本再 install** —— `file:` 在 lock 里只记目录路径，pnpm 判定「已装过」就跳过，源码改了也不拷（D1）。
2. **`--allow-build` 在 pnpm 11.28.5 上不存在** —— 正确机制是 profile 的 `allowBuilds` 段（见下）；缺键会报 `ERR_PNPM_IGNORED_BUILDS`，而且 **exit 1 时文件其实已拷好**，别误判（D3）。
3. **`files[]` 必须含 `skills`** —— 否则副本 `skills\` 是空目录，88 文件全丢且不报错（D2）。

```powershell
# ① 删掉旧的安装副本（file: 依赖不感知内容变化）
$inst = '<USERPROFILE>\.dsh\profiles\desktop\node_modules\dsh-purge'
$i = Get-Item $inst -Force -ErrorAction SilentlyContinue
if ($i.LinkType) { "跳过：$($i.LinkType) 形态 → $($i.Target)，改源码已即时生效，重启宿主即可" ; return }
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

**`allowBuilds` 必须是两行**（含 `:` 的键加双引号；`e499e03` 起由插件自动维护并自愈）。
**第二行的前缀必须与安装形态一致**，写错就会掉进 `ignoredBuilds`：

```yaml
allowBuilds:
  dsh-purge: true
  "dsh-purge@link:$SRC": true     # junction 形态（当前本机）
  # 或 "dsh-purge@file:$SRC": true  # 独立拷贝形态，二选一，不是两行都写
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
# 手动：托盘退出 → 双击宿主主程序（`<HOST_EXE>`）
# 脚本（等进程退出 → 重启 → 复核）：
pwsh -NoProfile -File "$WS\scripts\host\restart-host.ps1"
```

#### 4.6.1 ⚠️ `app.asar` 改名这一步 —— **直接让用户手动做，别写脚本**

这是本项目唯一一件「脚本绕三层、用户一秒完成」的事。**历史结论只有一条：脚本路线全失败，唯一成功的是用户手动改名**
（三套脚本各自的死因见 `UPDATE-LOG.md` 附录 D5；根因是 `app.asar` 被宿主进程 + WorkBuddy 的 `codebuddy --serve` sidecar 双重持有）。
**所以本节只写给人看的四步，不给脚本。**

**正确流程（写给人看的，4 步）**

1. 托盘右键退出宿主（要真正退干净，任务管理器里它的全部进程都消失，本机是 6 个）。
2. 退出 **WorkBuddy**（它的 `codebuddy --serve` sidecar 持有 `app.asar`，不退就改不了）。
3. 资源管理器打开 `<DSH_ROOT>\resources\`，把 `app.asar` 改名成 `app.asar.bak`。
4. 双击宿主主程序 `<HOST_EXE>` 重开。

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
（文件数与体积见 log 快照；结构性要求是 `main=lib/main.js` 可解析、`dsh-desktop-host\lib\index.js` 在，
`runtime` 指向 `..\runtime`），改名后不会出现「无处可启动」。

**swap 成功的验收标志**：

```
app.asar     = False
app.asar.bak = True（体积与 app.asar 原档一致）
resources\app= True（文件数 > 0，且与 apply 解包前一致）
宿主进程命令行全部走 app\（无 --expose-internals "...\app.asar\dsh\..."）
/purge status（patch id 口径）→ pending=0、drifted=0，applied + na + skipped + missing = 补丁总数
                                 无 errors.log 新增
                                 asar_still_sealed=false patches_lost=false ready=true
（HTTP /dsh-purge/status 是 rollup 口径，数字天然更小，仅展示、不作判据）
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

# ③ 逐文件一致性（**DIFF 必须 0**；MISSING 只许是打包白名单外的文件）
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

> ⚠️ **不能直接 import 安装副本的 `lib\redteam\tools.js`** —— 会报
> `dsh-purge/redteam/tools: cannot resolve @deepseek-ai/dsh-tools from host`（抛点 `lib/redteam/tools.js:99`），
> 因为宿主的 `@deepseek-ai/dsh-tools` 打在 `app.asar` 里，node 解析器穿不进去。
> 现在 `resources\app\` **在 apply 解包之后才有**：只要装过补丁就一直在，
> §0.B 那条 CLI 正是靠 `DSH_BASE = …\resources\app\dsh\node_modules\@deepseek-ai` 跑的。
> 只有「rc.3+ 干净安装、还没 apply」时它才不存在 —— 那时连退路都没有，只能走下面的 stub。
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
- 补丁状态：`pending` = 0、`drifted` = 0，且 `applied + na + skipped + missing_file` = `core.js` 里 `id:` 总数
  （**具体条数看 log 快照**，别拿别处的旧数字比）
- `patches_lost:false`、`ready:true`
- `#80 MINIMAL_OFFICIAL_TOOLSET` skipped（本机无 minimal 预设）、`#71 LIANGSHEN_IDENTITY_LINE` missing_file（缺「梁神」预设包）—— 两个都属预期
- `errors.log` 没有新增（当前不存在）

命令行侧也可以直接走后端路由拿同一份数据（不用开 GUI）：

```powershell
$r = Invoke-WebRequest -Uri 'http://127.0.0.1:<GUI_PORT>/dsh-purge/status' -UseBasicParsing -TimeoutSec 15
$j = $r.Content | ConvertFrom-Json
'{0} applied={1} pending={2} skipped={3} ready={4} sealed={5} lost={6}' -f `
  $j.surface,$j.patches_applied,$j.patches_pending,$j.patches_skipped,$j.patches_ready,$j.asar_still_sealed,$j.patches_lost
# 判据（rollup 口径只做交叉检查）：sealed=False、lost=False；数字别拿去比 patch id 口径
# 判基线别看这行，看 CLI 的 patch id 口径（pending=0 / drifted=0 且四项之和等于总数）
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

1. **不许点面板的「检查更新 / 立即更新 / 切换版本」**。`lib/update.js:860` 的 `gitResetTo` 会对
   `file:` 依赖执行 `git fetch origin --tags` + `git checkout -B master origin/master`（`force` 默认 true），
   `pinInstalledSpec()`（`lib/update.js:308`）还会把 profile 的 `file:` spec 改写成上游 codeload 地址 ——
   **钉版当场失效**。启动路径不会自动升（`autoUpdateIfNeeded()` 在 `lib/update.js:1128` 直接返回
   `skipped:"manual-only"`），所以只要不点按钮就安全。
2. **不许 `git merge upstream/master`**（无共同祖先），不许 `git rebase`（会改写 `local` 历史）。
3. **不许改 `version` 字段**。插件拿版本号当状态键，改了会反复重打补丁 + 反复重启。
4. **`lib/core.js` 只许存在「有记录、有注释」的 fork 修正，不许随手加新逻辑**（近 400KB 的单文件，
   上游几乎天天动）。当前允许的两处，全部带 `// 【fork…】` 注释：
   ① #32/#36 那两条补丁的 `insertProbe`（防二次 apply 叠加）；
   ② `rollupPatchStatus` 保留「已写入优先于 `drifted`」（上游 1.1.83 起改成 drifted 优先，会让多文件补丁常年假告警）。
   新功能放**新文件**（`lib/` 下平铺，例如 `lib/rewind.js`、`lib/drill-grant.js` —— **没有 `lib/local/` 这个目录**），
   `core.js` 里最多加一行 import。每加一处 fork 修正，必须同时登记到 `UPDATE-LOG.md` 附录 G，
   否则下次 cherry-pick 撞了就没人知道该保留什么。
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
7.1 **❌ 绝不许在没跑完 §0.5 判据的情况下说出「可以升 DSH」「新版 DSH 没问题」这类话。**
   现行判据是 `UPGRADE-RUNBOOK.md` 的**四条验收**（首轮 `drifted=0` / 二次 apply 幂等 / 真机 `pending=0` /
   64 工具 + 测试全过）；上游三证据只在**上游复活**时才作为前置条件（现在它冻结在 1.1.92，永远说「不支持」，
   拿它当判据会得出「永远不许升」）。插件运行时**不会**自己拦（`dshTarget` 只是 `package.json` 里一个元数据字段，
   代码里零引用）—— 说错一句话，用户就会升上去然后补丁全灭 + 可能起不来。
7.2 **不许让用户「先升 DSH 再等适配」**。顺序固定：上游适配 → 我们 port 进 `local` → 自检通过 →
   **助手明确说「可以升了」** → 用户才升 → apply 解包 → 用户手动 swap asar → 复查。
   （§0.5.5 的八步表）
8. `REPO` 常量（`lib/update.js:12`）仍硬编码 `"YuJunZhiXue/dsh-purge"`，面板上的
   「GitHub」链接与版本列表都指上游。**这是已知未改项，不在更新范围里，不要顺手改。**
   完整写死点清单（实测 5 处）见 §4.1.2：`package.json` 的 `repository/homepage/bugs`（可改，待办）、
   `lib/update.js:12`（保留）、`client.js:143/501`（保留）、`lib/redteam/ui.js:360`（保留）。
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
13. **不许只跑 `pnpm install` 就以为装好了 —— 这条只对 `file:`（独立拷贝）成立**。`file:` 依赖
   **不感知源码内容变化**，必须先 `Remove-Item node_modules\dsh-purge -Recurse -Force` 再 install，装完比对 SHA256（§4.4）。
   这个坑实测踩过：install exit 0、输出正常，但副本里还是旧文件（见 `UPDATE-LOG.md` 附录 D1）。
13.1 **`link:`（junction）形态下反过来：不许删「安装副本」**。它就是个指向 `$SRC` 的目录联接，
   `Remove-Item node_modules\dsh-purge -Recurse -Force` 会**顺着联接把源码删掉**。
   这种形态下改源码即时生效，只需**重启宿主**；要换回独立拷贝，先改 `dependencies` 的 spec 再 `pnpm install`。
   判形态：`(Get-Item $inst).LinkType` 为 `Junction` 就是 link 形态。
14. **不许跳过 §5.1 的红队自检**。动过 `lib/redteam/**` 或 `tools.js` 就必须跑那个 64 工具脚本。
   宿主对 schema 是硬断言，但 `dsh-agent-preset` 只 `logger.warn` 不崩，表现为「工具悄悄变少」，
   不主动查根本发现不了（`lib/index.js:516` / `:738`）。
15. **不许不问地址就 cherry-pick**。上游每次动安装/更新路径都会把 `YuJunZhiXue` 写回去
   （历史上有 `dbaf377`；1.1.80 那代的 `readPurgeTarball()` fallback 现已从代码里消失，别再去找）。
   每次移植完必须跑 §4.1.2 的判据命令（带白名单过滤，输出必须为空），把运行代码里**多出来**的写死地址
   改回 `wyybs` 再提交。这类失效是**静默的** —— 装的时候一切正常，等哪天走了 fallback 才会发现钉的是上游。
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
   `@deepseek-ai/dsh-tools` 在 `app.asar` 里，node 解析不进去；只有「还没 apply 解包」时才真的没有退路。
   必须用 §5.1 的 **stub 宿主 + 切 cwd** 那套。
19. **不许把「`spawn EPERM`」当沙箱配置问题处理**。2026-10-27/28 实测根因是
   **杀毒软件**拦 `CreateProcessAsUserW` 的受限令牌通道。先让用户临时关/加白杀软，
   不要浪费时间去改 AclSandbox 策略、也不要去装 pwsh（装了也不管用）。

---

## 8. 一句话摘要（给未来的自己）

> **第一件事不是查上游，是查宿主** —— `Test-Path resources\app.asar` 为 True 就说明宿主升级过、
> 补丁已失效，**让用户手动把 `app.asar` 改名成 `app.asar.bak`**（§4.6.1 四步，别写脚本），
> 再看 `applied` 是否还是**满值**（四项之和等于补丁总数，`pending`/`drifted` 为 0）。宿主没问题才需要关心上游。
>
> **第零件事是查「这个新版宿主我们适配了没」**（§0.5）。判据是 `UPGRADE-RUNBOOK.md` 的**四条验收全绿**
> （首轮 `drifted=0` / 二次 apply 幂等 / 真机 `pending=0` / 64 工具 + 测试全过）。
> 上游三证据只在**上游复活**时才是前置条件 —— 它现在冻结在 1.1.92，永远说「不支持」。
> 插件运行时不校验版本，会静默加载然后补丁全部匹配不上。**升级 DSH 是我们主动通知用户，不是用户自己决定。**
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

历史内容全部在 **[`UPDATE-LOG.md`](./UPDATE-LOG.md)**：变更日志（port / local 全表）、上游 1.1.80 / 1.1.81 逐文件评估、已判定「不跟」的上游提交清单、事故复盘（`file:` 不感知变化、`files[]` 吞 skills、`ERR_PNPM_IGNORED_BUILDS`、`spawn EPERM`、rc.3 清空补丁层）。

> **要读数就去 `UPDATE-LOG.md` 附录 I「基线快照」** —— 那是**唯一**记录 HEAD、条数、`applied`、文件数、tag 清单、
> 上游 `dshTarget` 读数的地方（按日期，新→旧）。本文件不存读数，只存判据与取数方法（§0.B）。
>
> **撞冲突先查 `UPDATE-LOG.md` 附录 G「逐文件差异原因速查」**（21 个文件的差异原因 + 处理方式，高发冲突：`core.js` / `net-scope.js` / `package.json`）。
>
> **先看 `UPDATE-LOG.md` 附录 F「待办清单」** —— 还没移植的 9 个文件（红队 `store-core` / `tools` 等）与 rc.5 实测都在那张表里，附「为什么不跟 / 动手前提 / 优先级」。动手前先翻一遍，别重复提案。

> 本文件只写**下次还要执行的动作、判据与阈值**。任何「某天发生了什么、为什么改、当时量出来多少」的内容一律追加到 log，不进这里（判据见 §0.1）。
