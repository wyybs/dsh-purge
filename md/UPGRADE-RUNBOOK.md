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

- **只追加、不替换**。适配新宿主时，旧 `pattern` 一个字都不改，只在 `replacements` 里追加新变体、在 `targetFiles` 里追加新路径。这样老版本宿主的命中集合只增不减，回滚零成本。
- **改完必须给数字**。"应该能跑"不算结论，要给出 `applied / drifted / missing_file` 的实测值。

---

## 1. 第 0 步：确认基线

```bash
cd <仓库>/src
git rev-parse --abbrev-ref HEAD          # 期望 local
git log --oneline -1
node -e "const p=require('./package.json');console.log(p.version, p.dshTargets)"
```

记下：当前 `dshTargets`、当前宿主版本（老大界面上的"宿主 / host"）。

新版本号不用猜，装包里有：

```bash
# PE 头里的 FileVersion，最快
python - <<'PY'
import struct
d=open(r"<NEWPKG_DIR>/deepseek-harness-<版本>-win-x64.exe",'rb').read(0x20000)
i=d.find(b'FileVersion')
print(d[i:i+80])
PY
```

或者解包后直接读 `<app>/resources/app/dsh/package.json` 的 `version`（最准）。

---

## 2. 第 1 步：解包到隔离区

新版是 **NSIS 安装包**（`NullsoftInst` 标记，偏移 ~0x19c00），里面是 electron-builder 的
`$PLUGINSDIR\app-64.7z`。7-Zip 26 起原生支持 NSIS，18.05 那种精简版**不支持**。

```bash
cd <NEWPKG_DIR>
mkdir -p _dl && cd _dl

# 拿一个支持 NSIS 的 7z（本机若没有：winget download 7zip.7zip 拿 MSI，再解 cab 取 7z.exe）
7z x ../deepseek-harness-*.exe -o nsis '*/app-64.7z' -y
mkdir -p ../app && 7z x "nsis/\$PLUGINSDIR/app-64.7z" -o ../app -y
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
node scripts/port/check-host.mjs --asar "<NEWPKG_DIR>/app/resources/app.asar"
```

不用手工解 asar —— 脚本自己会解到临时目录、跑首轮和次轮，跑完自动清。它输出：

```
首轮  applied NN  already NN  missing_file NN  skipped N  na N
次轮  already NN  ...
```

`drifted` 非 0 → 这些就是要重锚的补丁；`missing_file` 一般是有可选包没装，属正常。

**想逐条看清哪条失配**，把 `ALL_PATCHES` 过一遍：

```js
// 对每个 patch、每个 file 键、每个文件跑 applyReplacementsToText，看 changed / hasMarker
import * as core from "file:///<仓库>/src/lib/core.js";
const files = core.targetFiles(process.env.AI);
for (const p of core.ALL_PATCHES) {
  for (const key of (Array.isArray(p.file) ? p.file : [p.file])) {
    for (const fp of (Array.isArray(files[key]) ? files[key] : [files[key]]).filter(Boolean)) {
      const text = fs.readFileSync(fp, "utf8");
      const r = core.applyReplacementsToText(text, p, fp);
      console.log(`#${p.id}`, path.basename(fp), "changed=", r.changed, "marker=", text.includes("[dsh-purge]"));
    }
  }
}
```

---

## 4. 第 3 步：重锚（按失配类型对号入座）

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

---

## 5. 第 4 步：验证（三条判据，缺一不可）

```bash
node scripts/port/check-host.mjs --asar "<新 asar 路径>"
```

| 判据 | 含义 |
|---|---|
| 首轮 `drifted = 0` | pattern 全部对得上新宿主 |
| 次轮 `drifted = 0` 且 `already == 首轮命中数` | 幂等，没有"只打中一半"的补丁 |
| 被改的 JS/YAML 语法全过 | 补丁不能把宿主写坏 |

语法检查（补丁会改 40+ 个文件，必须逐个验 —— 改写坏一个就是宿主启动崩溃）：

```bash
# 1) 拿到"被改文件清单"：同一份 asar 解两份，一份不打一份打完，然后 diff
node scripts/port/check-host.mjs --asar "<新 asar>" --keep    # 打完的那份会留在输出里
diff -rq <干净副本>/dsh/node_modules/@deepseek-ai <打完副本>/dsh/node_modules/@deepseek-ai \
  | grep differ | sed 's/.*@deepseek-ai\///; s/ differ//' > dirty.txt

# 2) 逐个语法检查：.js 走 ESM（复制成 .mjs），.yml 用宿主自带 yaml 包 parse
node - <<'JS'
import { execFileSync } from "child_process";
import fs from "fs"; import os from "os"; import path from "path";
const root = process.env.AI, tmp = path.join(os.tmpdir(), "chk.mjs");
let bad = 0;
for (const rel of fs.readFileSync("dirty.txt", "utf8").split("\n").filter(Boolean)) {
  const fp = path.join(root, rel);
  if (!fp.endsWith(".js")) continue;
  fs.copyFileSync(fp, tmp);
  try { execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" }); }
  catch { bad++; console.log("SYNTAX FAIL", rel); }
}
console.log("fail", bad);
JS
```

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
node scripts/port/check-host.mjs        # 自动探测安装目录，A 段 + B 段全跑
```

判据：`drifted = 0`。若某条红了，用第 2 步的逐条脚本定位。

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
| **临时目录太深** | 两万个文件解包后最深路径逼近 260 字符，删除/遍历失败 | 用短目录名（`check-host.mjs` 已用 6 位随机戳） |

---

## 9. 速查

```bash
# 当前状态（真机）
node scripts/port/check-host.mjs

# 只看干净副本双跑（不动真机）
node scripts/port/check-host.mjs --asar "<path>/app.asar" --keep

# 仓库自测
node --test

# 分支操作（不碰工作树）
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
