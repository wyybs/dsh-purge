# 升级 Runbook（给 AI / 给未来的自己）

> **这份文件只写"怎么做"，不写"为什么"**。原理看 `FORK-GUIDE.md`，契约看 `UPDATE-GUIDE.md`，历史看 `UPDATE-LOG.md`。
>
> 触发方式：老大下载好新安装包，给出**一个目录**（下称 `<NEWPKG_DIR>`），里面通常是
> `deepseek-harness-<版本>-win-x64.exe`。工作全程只在 `<NEWPKG_DIR>` 和仓库里进行。

---

## 0. 铁律（先看这三条，违反任何一条都算事故）

| 不许做 | 原因 | 替代做法 |
|---|---|---|
| 碰 `D:\Program Files\DeepSeekRuntime`（安装目录名中间**一个空格**，不是 `DeepSeekRuntime`） | 那是老大正在用的环境，写坏了他当天没法干活 | 只在 `<NEWPKG_DIR>` 里解包、改、测 |
| `git checkout` 到别的分支 | `src/lib/core.js`、`src/cordis.patch.yml` 与 `~/.dsh/profiles/desktop/node_modules/dsh-purge/` 下的文件**是同一个 inode（硬链接）**。切分支 = 当场改写运行中插件 | 用 `git update-ref refs/heads/<目标> refs/heads/<源>` 移动指针，不碰工作树 |
| 在 profile 里 `pnpm install` / 重装插件 | 会让老大那边立即换代码 | 等他自己升级完再动；实在要验证就用干净副本 |

另外两条默认假设：

- **只追加、不替换**。适配新宿主时，旧 `pattern` 一个字都不改，只在 `replacements` 里追加新变体、在 `targetFiles` 里追加新路径。这样老版本宿主的命中集合只增不减，回滚零成本。**§5 判据 4 有机器检查，别靠自觉。**
- **改完必须给数字**。"应该能跑"不算结论，要给出 `applied / drifted / missing_file` 的实测值。

---

## 1. 第 0 步：确认基线

### 1.1 看现在是什么状态

```bash
cd <仓库>/src
git rev-parse --abbrev-ref HEAD          # 期望 local
git log --oneline -1
node -e "const p=require('./package.json');console.log(p.version, p.dshTargets)"
```

记下：当前 `dshTargets`、当前宿主版本（老大界面上的"宿主 / host"）。

新版本号不用猜。**先看文件名** —— 这一步还不知道版本，别把 `<版本>` 写进路径：

```bash
ls -1 "<NEWPKG_DIR>"/deepseek-harness-*.exe
```

**最可靠**的版本号在解包后的 `<app>/resources/app/dsh/package.json` 的 `version`，走到 §2 就知道了。
想在解包前看个大概，可以读 PE 头里的 FileVersion（有 Python 时）：

```bash
python - <<'PY'
import glob
f = glob.glob(r"<NEWPKG_DIR>/deepseek-harness-*.exe")[0]
d = open(f, "rb").read(0x20000)
i = d.find(b"FileVersion")
print(d[i:i+60] if i >= 0 else "未找到，解包后读 package.json")
PY
```

（Windows 上 `python` 有时是应用商店占位符，报错就跳过这段，不影响流程。）

### 1.2 开分支（先开分支，再动手改）

```bash
git status --short                     # 必须为空；有未提交的东西先提交或 stash
git checkout -b feat/dsh-<新版本> local
```

**必须从 `local` 拉**，不要从上一个 `feat/` 拉 —— 否则会把上次的适配混进来，回滚时说不清哪条是谁的。

这条 `checkout -b` 是安全的：新分支和 `local` 指向同一个 commit，工作树内容不变，git 不重写任何文件，**硬链接不受影响**。危险只发生在切换到"内容不同"的分支时。

提交粒度按"一个可验证的改动"分，别攒成一个巨型 commit：

```
port: 重锚 #14/#40/#54/#60/#62/#67/#74（新宿主 X.Y.Z）
port: #54/#60/#62 加 softSettle（旧壳文件拖红）
port: 关掉 X.Y.Z 新增的上报行
docs: 记录 X.Y.Z 验收数值
```

出问题时能单独回退某一步，而不是整批回滚。

### 1.3 留存"干净旧宿主"，作为下一轮的比对基线

§4.2 要 diff 新旧宿主的 `cordis.patch.yml` 才能看出官方新增了什么。但**线上宿主已经被我们打过补丁，磁盘上的文件不是干净原文** —— 拿它当基线，diff 出来的"新增行"里会混进自己的补丁痕迹。

所以每一轮都要留一份原始归档：

```bash
# 已打补丁的宿主：只有 app.asar.bak 是原始归档；还没解包时 app.asar 本身就是
ls -la "<当前安装>/resources/app.asar" "<当前安装>/resources/app.asar.bak"
mkdir -p "<归档目录>/dsh-baseline/<当前版本>"
cp "<上一步选中的原始归档>" "<归档目录>/dsh-baseline/<当前版本>/app.asar"
```

下一轮升级时，§4.2 里的 `<旧宿主>` 就用这份归档按 §2 解开，**不要用线上目录**。

---

## 2. 第 1 步：解包到隔离区

新版是 **NSIS 安装包**（文件里能找到 `NullsoftInst` 字样），里面是 electron-builder 的
`$PLUGINSDIR\app-64.7z`。7-Zip 26 起原生支持 NSIS，18.05 那种精简版**不支持**。

```bash
cd <NEWPKG_DIR>
mkdir -p _dl && cd _dl

# 拿一个支持 NSIS 的 7z（本机若没有：winget download 7zip.7zip 拿 MSI，再解 cab 取 7z.exe）
# 注意：7z 的 -o 必须紧贴目录名，写成 "-o nsis" 会把 nsis 当成另一个归档参数，解包直接失败
7z x ../deepseek-harness-*.exe -onsis '*/app-64.7z' -y
mkdir -p ../app && 7z x "nsis/\$PLUGINSDIR/app-64.7z" -o../app -y
```

解完应该看到：

```
app/DeepSeekRuntime.exe          宿主主程序
app/resources/app.asar           打包归档（JS 全在里面）
app/resources/app.asar.unpacked  native 模块（.node/.dll/exe）
app/resources/runtime/{cli,versions.json}
```

再把 `app.asar` 拆成目录，**用本仓库的逻辑**（`lib/extract-asar.js` 同款，跳过 `unpacked` 条目）：

```js
// 放在 _dl/extract.mjs，node _dl/extract.mjs app/resources/app.asar _dl/asar
import fs from "fs"; import path from "path";
const [src, out] = process.argv.slice(2);
const fd = fs.openSync(src, "r");
const h = Buffer.alloc(16); fs.readSync(fd, h, 0, 16, 0);
const n = h.readUInt32LE(12); const j = Buffer.alloc(n); fs.readSync(fd, j, 0, n, 16);
const header = JSON.parse(j.toString("utf8"));
const start = 8 + h.readUInt32LE(4);
let c = 0, skip = 0;
(function walk(node, prefix) {
  for (const [k, v] of Object.entries(node.files || {})) {
    const p = prefix ? `${prefix}/${k}` : k;
    if (v.files) { walk(v, p); continue; }
    if (v.unpacked) { skip++; continue; }
    const dest = path.join(out, p);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const b = Buffer.alloc(v.size);
    fs.readSync(fd, b, 0, v.size, start + Number(v.offset));
    fs.writeFileSync(dest, b);
    c++;
  }
})(header, "");
console.log("files", c, "skipped", skip);
```

拿到 `_dl/asar/dsh/node_modules/@deepseek-ai`，这就是后面所有补丁测试的靶子。

---

## 3. 第 2 步：跑基线，列出要重锚的补丁

```bash
cd <仓库>/src
node scripts/port/check-host.mjs --asar "<NEWPKG_DIR>/app/resources/app.asar" | tee baseline.txt
```

`tee` 是为了存档 —— §6 汇报要"改前 vs 改后"的数字，别靠记忆。

不用手工解 asar —— 脚本自己会解到临时目录、跑首轮和次轮，跑完自动清。它输出：

```
[A] 真机只读复核 ...        ← 线上那台的状态（打了 `注：这验的是当前已安装的宿主` 就是指这段）
[B] 干净副本双跑
  首轮  applied NN  already NN  missing_file NN  skipped N  na N
  次轮  already NN  ...
```

**看 B 段的 drifted**，不是 A 段 —— A 段是线上已打完补丁的状态，B 段才是"新宿主 + 现有补丁"的真相。`drifted` 非 0 就是这些要重锚；`missing_file` 一般是有可选包没装，属正常。

**想逐条看清哪条失配**，把 `ALL_PATCHES` 过一遍（先设 `AI` 指向解出来的 `@deepseek-ai` 那一层）：

```bash
export AI="<NEWPKG_DIR>/_dl/asar/dsh/node_modules/@deepseek-ai"   # §2 解出来的目录
node --input-type=module - <<'JS'
import fs from "node:fs";
import path from "node:path";
import * as core from "file:///<仓库>/src/lib/core.js";
const files = core.targetFiles(process.env.AI);
for (const p of core.ALL_PATCHES) {
  for (const key of (Array.isArray(p.file) ? p.file : [p.file])) {
    const list = Array.isArray(files[key]) ? files[key] : [files[key]];
    for (const fp of list.filter(Boolean)) {
      const text = fs.readFileSync(fp, "utf8");
      const r = core.applyReplacementsToText(text, p, fp);
      console.log(`#${p.id}`, path.basename(fp), "changed=", r.changed, "marker=", text.includes("[dsh-purge]"));
    }
  }
}
JS
```

`changed=false` 但 `marker=true` 的文件 = 已经打上了，不是失配（多文件补丁里常见）。

---

## 4. 第 3 步：重锚（按失配类型对号入座）

### 4.1 四类失配怎么改

先分类，不同类改法不同。四类覆盖了历史上全部情况：

| 类型 | 表现 | 改法 |
|---|---|---|
| **A. 代码搬家** | 目标文案整段出现在另一个包里，旧包还在但已无该段 | `targetFiles()` 里给对应的键**追加新路径**（`nestedPkg(aiBase,"新包名","lib","index.js")`），补丁体不动 |
| **B. 缩进/层级变了** | 原文一字未改，只是 tab 数变了 | `replacements` 里**追加一条新缩进的字面量**，旧的留着 |
| **C. 结构改了** | 返回值、字段、调用形态变了（例：`return transformed` → `return {...transformed, tools}`） | 追加一条新 `pattern` + 对应 `replace`，**新 replace 必须保住原结构的每一个字段**（丢 `tools` = 模型这轮没工具） |
| **D. 定义域消失** | 宿主里压根没这个概念了（例：0.2.2 主进程不再读 `DSH_PROFILE`） | 加 `softSettle: true`，让它判"无需处理"而不是 drifted。**不要删补丁**，将来可能回来 |

配套两条经验：

- **一条补丁多个文件时，只要有一个文件写入成功，rollup 就报 `applied`**。所以"A 类搬家"之后，旧壳文件会把整条拖成 `drifted`，必须给该补丁加 `softSettle: true`（见 `#54/#60/#62`）。
- 加 `softSettle` 前确认：干净副本**首轮**仍然能打上（`softSettle` 只在"pattern 不中且无 marker"时生效，pattern 还在就照常打）。

改完 `package.json`：

```json
"dshTargets": ["<旧版本...>", "<新版本>"]      // 追加，不动 dshTarget
```

### 4.2 新版"该破没破"的地方怎么找

**重锚只保住旧功能。新版本往往同时带来新的限制、新的上报，这些要主动挖，不能等它咬人。**

按性价比排四个必查点：

**① base / web-app 的 cordis.patch.yml 新增了哪些行**（最容易漏，也最要命）

`<旧宿主>` **必须是 §1.3 留存的那份原始归档解出来的目录**，不是线上目录 —— 线上文件已经被我们打过补丁，diff 出来的"新增行"里会混进自己的改动。

```bash
# <旧宿主> 和 <新宿主> 都指到 @deepseek-ai 那一层
for f in dsh-base dsh-web-app; do
  echo "=== $f ==="
  diff -u "<旧宿主>/$f/cordis.patch.yml" "<新宿主>/$f/cordis.patch.yml"
done
```

新增的插件行分三类处理：

| 类别 | 典型名字 | 处理 |
|---|---|---|
| **上报类** | `*inventory*`、`*telemetry*`、`*analytics*`、`*anonymous*`、`*-log-*` | `cordis.patch.yml` 里 `disabled: true`，整条关 |
| **拦截类** | `*policy*`、`*approval*`、`*guard*`、`*review*`、`*permission*` | 看它是"默认值"还是"硬拦截"；默认值改 config，硬拦截打补丁改成放行 |
| **能力类** | 新工具 / 新 preset / 新 provider | 通常不用动，但要看它有没有带"使用前需审批"的说明 |

关之前先确认**服务归属**：如果某个服务是别的包 `provide` 的，被关的那条只是消费者，关掉无连带（例：`pluginPackages` 由 `dsh-app-boot` 提供，关 `plugin-package-inventory-deepseek` 不影响任何人）。`super(ctx, "<服务名>")` 出现在哪个包里，服务就归谁。

**② 包列表 diff —— 新包名本身就是线索**

```bash
# 进程替换只有 bash 系可用；PowerShell 下改成两次 ls 重定向到文件再 diff
diff <(ls "<旧宿主>") <(ls "<新宿主>")
```

`dsh-*` 里带 `policy` / `approval` / `guard` / `review` / `permission` / `telemetry` / `inventory` 的新面孔，逐个看 `README.zh.md` 三行就够判断。

**③ 关键词 grep（只看 `lib/*.js`，量可控）**

```bash
grep -rn --include=*.js -iE \
  "requires approval|must not|do not (refuse|call)|opt[- ]out|telemetry|upload|consent|escalat|deny" \
  "<新宿主>/@deepseek-ai"/*/lib 2>/dev/null | grep -v "dsh-purge" | head -40
```

命中的两类要动：**官方新写的劝导/拒绝话术**（今天的 `#54` 就是这类），**新的上报通道**。纯内部逻辑的 hit 跳过。

**④ 前端设置项新增**

设置页里新出现的开关，背后几乎都是一条新限制或新上报，值得点开看一眼它控制什么。

找到之后两种落地方式：

- **能整条关的**（上报、埋点、遥测、清单）→ `cordis.patch.yml` 里 `- id: ... / disabled: true`，比打补丁干净，也不会因为官方改文案而失效
- **只能改行为的**（拦截逻辑、拒绝话术）→ 加新补丁，`id` 取当前最大值 +1，按 §4 的四类手法写，`markers` 挑一句"只有我们写进去才存在"的文本

**红线：关掉之后功能不能少。** 凡是"关了就少一个能力"的，不能一刀切，要打成"放行"而不是"移除"（例：`approval` 不是删掉整条审批链，是把默认策略改成 never + 无通道时 fail-open）。

---

## 5. 第 4 步：验证（四条判据，缺一不可）

```bash
node scripts/port/check-host.mjs --asar "<新 asar 路径>"
```

| # | 判据 | 含义 |
|---|---|---|
| 1 | 首轮 `drifted = 0` | pattern 全部对得上新宿主 |
| 2 | 次轮 `drifted = 0` 且 `already == 首轮命中数` | 幂等，没有"只打中一半"的补丁 |
| 3 | 被改的 **JS 和 YAML** 语法全过 | 补丁不能把宿主写坏（`cordis.patch.yml` 写坏一样起不来） |
| 4 | **只增不减**：`git diff` 里没有删掉任何 `pattern` / `replace` / `markers` | 功能不缩窄的机器判据 |

判据 1/2 还有个前提：**B 段必须真的执行过**。输出里必须出现「解包 N 个文件」那一行 —— 路径写错时脚本会把 B 段跳过、结论写"部分通过"，别当成通过看。

状态枚举（`check-host.mjs` 和状态页都会出现）：

| 状态 | 含义 | 算失败吗 |
|---|---|---|
| `applied` / `already` | 打上了 / 之前就打上了 | 否 |
| `na` | 该补丁不适用于当前面（`surfaces` 限定） | 否 |
| `skipped` | 自注入型补丁的自我标记，本来就不需要动作 | 否 |
| `missing_file` | 补丁依赖的可选包/文件这台机器上没有（梁神预设、`dsh-hooks-*`） | 否 |
| `drifted` | 文件在、pattern 不中、也没 marker = 官方原文改了 | **是** |
| `pattern_not_found` | 同 drifted，`strictFiles` 补丁的严格版说法 | **是** |

第 4 条是硬闸门 —— "只追加不替换"这条约定光靠自觉不可靠，用 diff 查：

```bash
# 合并回 local 之前跑。空输出 = 通过。
# 只盯 pattern / replace / markers：旧的匹配规则一旦删改，旧宿主的命中集合就变了。
git diff local..HEAD -- lib/core.js cordis.patch.yml \
  | grep -E "^-[^-]" | grep -E "pattern|replace|markers"
```

**允许**的删除只有两种：`file:` 数组追加元素（改的是同一行）、注释行。
**不允许**：任何 `pattern` / `replace` / `markers` 被删或改。真要做破坏性改动，必须在提交信息里写清原因和影响面，并在旧宿主上重测一遍。

闸门本身有假阳性：注释里出现 `pattern` / `replace` 字样的被删行也会命中。命中后人工核一眼是不是那两种允许情形，别直接当成违规。

语法检查（补丁会改 40+ 个文件，必须逐个验 —— 改写坏一个就是宿主启动崩溃）。

先备好两份目录：**干净副本** = §2 解出来的 `_dl/asar`；**打完副本** = `--keep` 留下的那个（脚本会打印路径，是 `%TEMP%\dpchk\<6位随机戳>\app`，每次不同，从输出里抄）。两份必须出自同一份 asar，否则 diff 出来的全是噪音。

```bash
# 1) 被改文件清单
diff -rq "<干净副本>/dsh/node_modules/@deepseek-ai" "<打完副本>/dsh/node_modules/@deepseek-ai" \
  | grep differ | sed 's/.*@deepseek-ai\///; s/ differ//' > dirty.txt

# 2) 逐个语法检查：.js 走 ESM（复制成 .mjs 再 --check），.yml 用宿主自带的 yaml 包 parse
export AI="<打完副本>/dsh/node_modules/@deepseek-ai"
export YAML_MOD="file:///<打完副本>/dsh/node_modules/yaml/dist/index.js"
node --input-type=module - <<'JS'
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const root = process.env.AI;
const tmp = path.join(os.tmpdir(), "chk.mjs");
const YAML = (await import(process.env.YAML_MOD)).default;
let bad = 0;
for (const rel of fs.readFileSync("dirty.txt", "utf8").split("\n").filter(Boolean)) {
  const fp = path.join(root, rel);
  if (rel.endsWith(".js")) {
    fs.copyFileSync(fp, tmp);
    try { execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" }); }
    catch { bad++; console.log("JS SYNTAX FAIL", rel); }
  } else if (rel.endsWith(".yml") || rel.endsWith(".yaml")) {
    try { YAML.parse(fs.readFileSync(fp, "utf8"), { logLevel: "silent" }); }
    catch (e) { bad++; console.log("YAML FAIL", rel, e.message); }
  }
}
console.log("fail", bad);
JS
```

（`!!js` 是宿主自定义 tag，yaml 会打 `TAG_RESOLVE_FAILED` 警告但不抛错，属正常。）

仓库自带测试也要跑：`cd src && node --test`（应 85/85）。

---

## 6. 第 5 步：汇报给老大

固定格式，没数字不算完：

1. **宿主**：新版本号、`hostCompat` 是否 ok
2. **补丁**：`applied / drifted / missing_file / skipped / na` 五个数，改前 vs 改后
3. **不能打的是哪几条、为什么**（可选包没装？定义域消失？）
4. **动了哪些文件**（`package.json` / `lib/core.js` / `cordis.patch.yml`）
5. **他需要做什么**（重启？重装插件？还是什么都不用）
6. **我的推荐 + 代价**

---

## 7. 第 6 步：老大升级完之后

他装完新包、重装插件、点过"应用"之后，跑 A 段（真机只读）：

```bash
cd <仓库>/src
node scripts/port/check-host.mjs        # 自动探测安装目录，A 段 + B 段全跑
```

判据：`drifted = 0`。若某条红了，回到 §3 的逐条脚本定位（`AI` 指向线上 `resources\app\dsh\node_modules\@deepseek-ai`）。

---

## 8. 坑清单（每条都真踩过）

| 坑 | 现象 | 解法 |
|---|---|---|
| **硬链接** | 改 `src` 的文件，`~/.dsh/profiles/desktop/node_modules/dsh-purge/` 立刻同步 | 心里有数：改的就是运行中的那份。做破坏性改动前先 `git stash`/备份 |
| **`git checkout` 换分支** | 工作树被回写 → 运行中插件代码当场变旧 | 用 `git update-ref` 移指针，别 checkout |
| **安装目录名** | `D:\Program Files\DeepSeekRuntime`（中间有空格），拼成 `DeepSeekRuntime` 会得到"路径不存在" | 别硬拼路径：`Get-ChildItem 'D:\Program Files' \| Where Name -like 'Deep*'` 拿枚举结果 |
| **沙箱挡路径** | 某些会话里 `fs.existsSync` 对 Program Files 返回 false | 走 `check-host.mjs` 的自动探测（它用枚举 + 名字正则） |
| **surface 判定** | 纯 node 跑 `patchStatus` 一律判 web，`surfaces:["desktop"]` 的补丁（`#82/#83/#92/#93`）显示 na，和界面数字对不上 | 必须 `DSH_SURFACE=desktop`（脚本已内置） |
| **两次 apply 取最好值** | 首轮 applied、次轮 drifted 的半打补丁被掩盖（`#17` 就是这么漏的） | 看**次轮**的 tally，别看合并后的最优值 |
| **旧壳文件拖红** | 补丁实际打上了，状态页却报 drifted | 加 `softSettle`（见 `#54/#60/#62`） |
| **`name` mismatch** | patch 里写了 `name` 但和目标条目不一致 → **整条静默跳过** | 加 disable 类 patch 时，`name` 必须和 base 里一模一样；不确定就别写 `name` |
| **7-Zip 版本** | 18.05 精简版不支持 NSIS，报"无法打开" | 用 26.x；或用 `winget download 7zip.7zip` 拿 MSI 再解出 `7z.exe` |
| **`7z -o` 带空格** | `-o nsis` 会被当成两个参数，解包失败或解到错地方 | `-o` 必须紧贴目录名：`-onsis`、`-o../app` |
| **`node -` 喂 ESM** | 老版本 node（18/20）把 stdin 当 CommonJS，`import` 直接 SyntaxError；Node 22 有语法检测能兜住，换机器就炸 | 一律写 `node --input-type=module - <<'JS'` |
| **`--asar` 指错路径** | B 段被跳过、结论写"部分通过"、退出码 0，容易被当成通过 | 现在脚本对"指定了但不存在"直接退出 2；同时看输出里有没有「解包 N 个文件」那行 |
| **临时目录太深** | 两万个文件解包后最深路径逼近 260 字符，删除/遍历失败 | 用短目录名（`check-host.mjs` 已用 6 位随机戳） |

---

## 9. 速查

```bash
# 以下命令都在仓库根下跑
cd <仓库>/src

# 当前状态（真机 + 自动解新 asar 双跑）
node scripts/port/check-host.mjs

# 只看干净副本双跑（--asar 指文件，不指目录；路径错会直接退出 2）
node scripts/port/check-host.mjs --asar "<path>/app.asar" --keep

# 仓库自测
node --test

# 功能不缩窄的机器判据（合并回 local 之前，空输出才算过）
git diff local..HEAD -- lib/core.js | grep -E "^-[^-]" | grep -E "pattern|replace|markers"

# 分支操作（不碰工作树）
git status --short                      # 必须为空
git checkout -b feat/dsh-<新版本> local # 同一 commit，零文件变动
git update-ref refs/heads/local refs/heads/feat/dsh-<版本>
git branch -vv
git config --get-regexp '^branch\..*\.description$'
```

分支命名约定：

```
feat/dsh-<新版本>        适配新宿主的工作线
legacy/dsh-<旧版本>      旧宿主冻结快照（别在上面提交）
local                    本地主线，适配完成且验证通过后指过来
```
