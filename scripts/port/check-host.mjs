#!/usr/bin/env node
/**
 * check-host.mjs — 宿主补丁一致性核对（一条命令跑完三段）
 *
 * 为什么要这个脚本：`/purge status` 只会告诉你"现在是几条红"，但升级后真正要回答的是
 * 三个问题，而且它们互相独立：
 *   1. 真机上补丁到底打上没有？（只读 patchStatus，带 DSH_SURFACE=desktop 才和界面一致）
 *   2. 干净宿主上首轮能不能全打上？（证明 pattern 没漂）
 *   3. 打第二遍会不会冒 drift？（证明没有"只打中一半"的补丁）
 * 第 3 条最容易漏：一次 apply 报 applied，二次 apply 报 drifted，说明同一补丁里有的
 * replacement 命中、有的没命中 —— rollup 的"applied 优先"会把它盖成绿色（历史事故：#17）。
 *
 * 用法：
 *   node scripts/port/check-host.mjs                 # 自动探测桌面安装，三段全跑
 *   node scripts/port/check-host.mjs --root "D:\Program Files\DeepSeekRuntime"
 *   node scripts/port/check-host.mjs --asar <app.asar 路径>   # 只做干净副本双跑
 *   node scripts/port/check-host.mjs --work "D:\tmp\check"    # 指定解包目录（默认 %TEMP%）
 *   node scripts/port/check-host.mjs --keep                   # 保留解包目录
 *   node scripts/port/check-host.mjs --surface web            # 非桌面宿主
 *
 * 退出码：0 全部通过；1 有任一项不通过；2 环境不满足（找不到宿主/asar）
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE_PATH = path.resolve(HERE, "..", "..", "lib", "core.js");

// ---------------------------------------------------------------- 参数

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback = "") => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const next = argv[i + 1];
  return next && !next.startsWith("--") ? next : fallback;
};

const SURFACE = value("surface", "desktop");
const KEEP = flag("keep");
// 解包目录会塞进 2 万个文件、最深的路径逼近 Windows 260 字符上限，
// 所以默认用短目录名 + 6 位随机戳，别用 ISO 时间戳那种长名字。
const WORK_ROOT = value("work", path.join(os.tmpdir(), "dpchk"));
process.env.DSH_SURFACE ||= SURFACE;

const log = (s = "") => process.stdout.write(`${s}\n`);

// ---------------------------------------------------------------- 探测宿主

/** 桌面安装目录名不是固定的：历史上有 DeepSeekRuntime / deepseek-harness / dsh next 几种。 */
function installNameLooksRight(name) {
  const n = String(name).toLowerCase();
  return /^deepseek[\s._-]*harness/.test(n) || /^dsh([\s._-]*(next|desktop))?$/.test(n);
}

function findInstallRoots(explicit) {
  if (explicit) return fs.existsSync(path.join(explicit, "resources")) ? [explicit] : [];
  const roots = [
    "C:\\Program Files",
    "C:\\Program Files (x86)",
    "D:\\Program Files",
    "D:\\Program Files (x86)",
    path.join(os.homedir(), "AppData", "Local", "Programs"),
  ];
  const found = [];
  for (const root of roots) {
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || !installNameLooksRight(entry.name)) continue;
      const dir = path.join(root, entry.name);
      if (fs.existsSync(path.join(dir, "resources"))) found.push(dir);
    }
  }
  return found;
}

// ---------------------------------------------------------------- asar 读取

function readAsarIndex(asarPath) {
  const fd = fs.openSync(asarPath, "r");
  try {
    const head = Buffer.alloc(16);
    fs.readSync(fd, head, 0, 16, 0);
    const jsonSize = head.readUInt32LE(12);
    const json = Buffer.alloc(jsonSize);
    fs.readSync(fd, json, 0, jsonSize, 16);
    const header = JSON.parse(json.toString("utf8"));
    const dataStart = 8 + head.readUInt32LE(4);
    const index = new Map();
    const walk = (node, prefix) => {
      for (const [name, meta] of Object.entries(node.files || {})) {
        const rel = prefix ? `${prefix}/${name}` : name;
        if (meta.files) {
          walk(meta, rel);
          continue;
        }
        index.set(rel, { offset: Number(meta.offset), size: meta.size, unpacked: meta.unpacked === true });
      }
    };
    walk(header, "");
    return { fd, dataStart, index };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function readAsarFile(asarPath, rel) {
  const { fd, dataStart, index } = readAsarIndex(asarPath);
  try {
    const meta = index.get(rel);
    if (!meta) return undefined;
    const buf = Buffer.alloc(meta.size);
    fs.readSync(fd, buf, 0, meta.size, dataStart + meta.offset);
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

/** 只解 JS/YAML 就够 —— 补丁从不改 native 模块，跳过 app.asar.unpacked 能省几分钟和 250MB。 */
function extractAsar(asarPath, outDir) {
  const { fd, dataStart, index } = readAsarIndex(asarPath);
  let written = 0;
  let skipped = 0;
  try {
    for (const [rel, meta] of index) {
      if (meta.unpacked) {
        skipped += 1;
        continue;
      }
      const dest = path.join(outDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const buf = Buffer.alloc(meta.size);
      fs.readSync(fd, buf, 0, meta.size, dataStart + meta.offset);
      fs.writeFileSync(dest, buf);
      written += 1;
    }
  } finally {
    fs.closeSync(fd);
  }
  return { written, skipped };
}

/** aiBase 是"直接放着 @deepseek-ai 包目录的那一层"，桌面解包布局固定是 dsh/node_modules/@deepseek-ai。 */
function findAiBase(appDir) {
  const nested = path.join(appDir, "dsh", "node_modules", "@deepseek-ai");
  if (fs.existsSync(path.join(nested, "dsh-system-prompt"))) return nested;
  const flat = path.join(appDir, "node_modules", "@deepseek-ai");
  if (fs.existsSync(path.join(flat, "dsh-system-prompt"))) return flat;
  return "";
}

function hostVersionOf(root) {
  const unpacked = path.join(root, "resources", "app", "dsh", "package.json");
  try {
    return JSON.parse(fs.readFileSync(unpacked, "utf8")).version || "";
  } catch {
    /* 退到 asar 里读 */
  }
  try {
    const raw = readAsarFile(path.join(root, "resources", "app.asar"), "dsh/package.json");
    return raw ? JSON.parse(raw.toString("utf8")).version || "" : "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- 统计

function tally(status) {
  const out = {};
  for (const value of Object.values(status || {})) {
    const s = String(typeof value === "string" ? value : value?.status ?? "?").replace(/:.*/, "");
    out[s] = (out[s] || 0) + 1;
  }
  return out;
}

function tallyReport(report) {
  const out = {};
  for (const row of report || []) {
    const s = String(row.status || "?").replace(/:.*/, "");
    out[s] = (out[s] || 0) + 1;
  }
  return out;
}

const order = ["applied", "already", "na", "skipped", "missing_file", "pattern_not_found", "drifted"];
function fmtTally(t) {
  return order
    .filter((k) => t[k])
    .map((k) => `${k} ${t[k]}`)
    .join("  ");
}

function badRows(status, core, thresholdStatuses = ["drifted", "pattern_not_found"]) {
  const out = [];
  const byId = new Map(core.ALL_PATCHES.map((p) => [String(p.id), p]));
  for (const [id, value] of Object.entries(status || {})) {
    const s = String(typeof value === "string" ? value : value?.status ?? "?").replace(/:.*/, "");
    if (!thresholdStatuses.includes(s)) continue;
    out.push({ id, status: s, name: byId.get(String(id))?.name || "?" });
  }
  return out;
}

// ---------------------------------------------------------------- 主流程

const core = await import(pathToFileURL(CORE_PATH).href);
const TOTAL = core.ALL_PATCHES.length;
const problems = [];
let exitCode = 0;

log("dsh-purge 宿主补丁一致性核对");
log("=".repeat(64));

// --- 定位宿主
const roots = findInstallRoots(value("root", ""));
const root = roots[0] || "";
let asarPath = value("asar", "");

// 已解包的宿主会把 app.asar 改名成 app.asar.bak —— 那份 bak 才是原始归档，
// B 段照样能跑。顺序：先找还封着的 asar，再退到 bak。
if (!asarPath && root) {
  for (const name of ["app.asar", "app.asar.bak"]) {
    const candidate = path.join(root, "resources", name);
    if (fs.existsSync(candidate)) {
      asarPath = candidate;
      break;
    }
  }
}

log("\n[宿主]");
if (root) log(`  install      ${root}`);
else log("  install      (未找到桌面安装，跳过真机复核)");
if (asarPath) log(`  asar         ${asarPath}${fs.existsSync(asarPath) ? "" : "  ← 不存在"}`);
const version = root ? hostVersionOf(root) : "";
if (version) {
  const compat = root ? core.hostCompat(findAiBase(path.join(root, "resources", "app")) || "") : null;
  log(`  宿主版本     ${version}`);
  if (compat && compat.known) log(`  hostCompat   ${compat.ok ? "ok" : "MISMATCH"}  目标 ${compat.target}`);
  if (compat && compat.known && !compat.ok) problems.push(`宿主版本 ${version} 不在 dshTargets 里`);
}

// --- A. 真机只读复核
log("\n[A] 真机只读复核 (patchStatus, surface=" + SURFACE + ")");
const liveAiBase = root ? findAiBase(path.join(root, "resources", "app")) : "";
const asarUnderRoot = root && asarPath && path.resolve(asarPath).toLowerCase().startsWith(path.resolve(root).toLowerCase());
if (root && asarPath && !asarUnderRoot) {
  log("  注：这验的是当前已安装的宿主；你 --asar 给的新包请看 B 段");
}
if (liveAiBase) {
  const status = await core.patchStatus(liveAiBase);
  const t = tally(status);
  log(`  ${fmtTally(t)}`);
  const bad = badRows(status, core);
  for (const row of bad) log(`  ! #${row.id} ${row.name} — ${row.status}`);
  if (t.drifted) problems.push(`真机有 ${t.drifted} 条 drifted`);
  if (!t.drifted) log("  ✓ 无 drifted");
} else {
  log("  跳过：resources/app 下没有 @deepseek-ai（宿主还封在 app.asar 里，先在插件面板点一次「应用」）");
}

// --- B. 干净副本双跑
log("\n[B] 干净副本双跑 (首轮 / 次轮)");
let asarRan = false;
if (!asarPath || !fs.existsSync(asarPath)) {
  log("  跳过：没有 app.asar 可解（宿主已解包，用 --asar 指一份原始归档才能跑这一段）");
} else {
  const stamp = Math.random().toString(36).slice(2, 8);
  const dir = path.join(WORK_ROOT, stamp);
  const appDir = path.join(dir, "app");
  try {
    fs.mkdirSync(appDir, { recursive: true });
    const started = Date.now();
    const extracted = extractAsar(asarPath, appDir);
    log(`  解包 ${extracted.written} 个文件（跳过 unpacked ${extracted.skipped} 个），${((Date.now() - started) / 1000).toFixed(1)}s`);

    const aiBase = findAiBase(appDir);
    if (!aiBase) {
      log("  ✗ 解出来的目录里没有 @deepseek-ai，asar 结构不符预期");
      problems.push("干净副本解包后找不到 aiBase");
      exitCode = 1;
    } else {
      const first = await core.applyPatches(aiBase, core.ALL_PATCHES, {});
      asarRan = true;
      const t1 = tallyReport(first);
      log(`  首轮  ${fmtTally(t1)}`);

      const second = await core.applyPatches(aiBase, core.ALL_PATCHES, {});
      const t2 = tallyReport(second);
      log(`  次轮  ${fmtTally(t2)}`);

      const firstHit = (t1.applied || 0) + (t1.already || 0);
      const secondHit = t2.already || 0;
      if (t1.drifted) {
        problems.push(`干净副本首轮有 ${t1.drifted} 条 drifted（pattern 已不匹配新宿主）`);
      }
      if (t2.drifted) {
        problems.push(`干净副本次轮有 ${t2.drifted} 条 drifted（幂等被破坏，说明有补丁只打中一半）`);
        for (const row of second.filter((r) => String(r.status) === "drifted")) {
          log(`  ! #${row.patch_id} ${row.name} — 次轮 drift`);
        }
      }
      if (firstHit !== secondHit) {
        problems.push(`首轮命中 ${firstHit} 条、次轮 ${secondHit} 条，对不上（疑似半打）`);
      }
      log(`  ✓ 首轮命中 ${firstHit} / 次轮 already ${secondHit} / 总数 ${TOTAL}`);
      if (t1.missing_file) {
        log(`  · missing_file ${t1.missing_file} 条 = 该补丁依赖的可选包/文件在这台机器上不存在`);
        log("    （梁神预设、dsh-hooks-* 等），不计失败；只有 drifted 和命中数对不上才是问题");
      }
    }
  } catch (error) {
    log(`  ✗ 解包或 apply 失败：${error?.message || error}`);
    problems.push(`干净副本阶段异常：${error?.message || error}`);
  } finally {
    if (!KEEP) {
      // 两万个文件在 Windows 上经常前几次 EBUSY/EPERM，rmSync 自带重试比手写循环可靠。
      try {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
      } catch (error) {
        const why = String(error?.code || error?.message || error).slice(0, 60);
        log(`  (清理失败：${why}…；目录仍在 ${dir}，手工删掉即可，不影响本次结论)`);
      }
    } else {
      log(`  已保留解包目录：${dir}`);
    }
  }
}

// --- 结论
log("\n" + "=".repeat(64));
const ranA = Boolean(liveAiBase);
const ranB = asarRan;
if (problems.length === 0 && ranA && ranB) {
  log("结论：通过 —— 真机无 drift、干净副本首轮全命中、二次 apply 幂等。");
} else if (problems.length === 0) {
  const skippedParts = [!ranA && "A 真机复核", !ranB && "B 干净副本双跑"].filter(Boolean).join("、");
  log(`结论：部分通过 —— 只验了已跑的段；未执行：${skippedParts}。`);
  log("      要跑 B 段需要一份原始 app.asar（或 app.asar.bak），用 --asar 明确指定即可。");
} else {
  log("结论：不通过");
  for (const p of problems) log(`  - ${p}`);
  exitCode = 1;
}
process.exit(exitCode);
