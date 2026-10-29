/**
 * 用户层 profile/cordis.patch.yml 的本体 insert（#154 / #159）。
 *
 * 包内 overlay 只改已入队行的 inject/config，不能再 insert 一次（Hub 已入队会
 * already queued）。postinstall 和演练台子行都走这里：行不存在就写一条。
 */
import fs from "node:fs";
import path from "node:path";

export const PURGE_NAME = "dsh-purge";

export const INSERT_BLOCK = [
  "- insert:",
  "    - id: dsh-purge",
  "      name: dsh-purge",
  "      inject: [systemPrompt, tools]",
  "      config:",
  "        enabled: true",
  "        stripMnemon: true",
  "        capabilityProtocol: true",
  "        hooksDenyBypass: true",
  "",
].join("\n");

export function profileHasPurgeBodyInsert(text) {
  const lines = String(text || "").split(/\r?\n/);
  let insertIndent = -1;
  for (const line of lines) {
    if (/^-\s*insert:\s*$/.test(line) || /^\s+-\s*insert:\s*$/.test(line)) {
      insertIndent = (line.match(/^[ \t]*/) || [""])[0].length;
      continue;
    }
    if (insertIndent < 0) continue;
    const indent = (line.match(/^[ \t]*/) || [""])[0].length;
    const trimmed = line.trim();
    if (trimmed && indent <= insertIndent && /^-\s/.test(trimmed)) {
      insertIndent = -1;
      if (/^-\s*insert:\s*$/.test(trimmed)) {
        insertIndent = indent;
      }
      continue;
    }
    // 本体行：id: dsh-purge，或用户按 #159 临时绕过写的 dsh-purge-main / name: dsh-purge
    if (/^-\s*id:\s*dsh-purge(-main)?\s*$/.test(trimmed)) return true;
    if (/^-\s*name:\s*dsh-purge\s*$/.test(trimmed)) return true;
  }
  return false;
}

export function ensureProfileBodyInsert(profileDir) {
  const fp = path.join(profileDir, "cordis.patch.yml");
  let text = "";
  try { text = fs.readFileSync(fp, "utf8"); } catch { text = ""; }
  if (profileHasPurgeBodyInsert(text)) {
    return { ok: true, wrote: false, path: fp };
  }
  const prefix = text && !text.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(fp, `${text}${prefix}${text ? "\n" : ""}${INSERT_BLOCK}`, "utf8");
  return { ok: true, wrote: true, path: fp };
}

function readJson(fp) {
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch {
    return null;
  }
}

function profileOwnsPurge(dir) {
  const pkg = readJson(path.join(dir, "package.json"));
  const bundles = pkg?.dsh?.profile?.bundles;
  if (Array.isArray(bundles) && bundles.includes(PURGE_NAME)) return true;
  try {
    return fs.existsSync(path.join(dir, "node_modules", PURGE_NAME, "package.json"));
  } catch {
    return false;
  }
}

export function listProfileDirs(dshHome) {
  const root = path.join(dshHome || "", "profiles");
  const out = [];
  let names = [];
  try { names = fs.readdirSync(root); } catch { return out; }
  for (const name of names) {
    const dir = path.join(root, name);
    try {
      if (fs.statSync(dir).isDirectory()) out.push(dir);
    } catch { /* skip */ }
  }
  return out;
}

export function ensureProfileBundles(profileDir) {
  const fp = path.join(profileDir, "package.json");
  const pkg = readJson(fp);
  if (!pkg) return { ok: false, wrote: false, path: fp };
  pkg.dsh = pkg.dsh && typeof pkg.dsh === "object" ? pkg.dsh : {};
  pkg.dsh.profile = pkg.dsh.profile && typeof pkg.dsh.profile === "object" ? pkg.dsh.profile : {};
  const bundles = Array.isArray(pkg.dsh.profile.bundles) ? pkg.dsh.profile.bundles : [];
  if (bundles.includes(PURGE_NAME)) return { ok: true, wrote: false, path: fp };
  pkg.dsh.profile.bundles = [...bundles, PURGE_NAME];
  fs.writeFileSync(fp, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  return { ok: true, wrote: true, path: fp };
}

function readPurgeTarball() {
  try {
    const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    return String(pkg?.dsh?.install?.tarball || "").trim();
  } catch {
    return "https://github.com/wyybs/dsh-purge/archive/refs/heads/local.tar.gz";
  }
}

/**
 * 从 profile 的 pnpm-lock.yaml 读 dsh-purge 实际解析到的 tarball URL（#180）。
 * 用 `github:user/repo#<commit>` 固定 commit 安装时，lock 里记录的是 `.../tar.gz/<commit>`，
 * 只按 package.json 的 tarball 写，会和实际键并存成两个 URL 键（YAML 重复映射 / 键漂移）。
 * 纯文本解析，不引 yaml 依赖；读不到返回空串。
 */
function readPurgeTarballFromLock(profileDir) {
  if (!profileDir) return "";
  let text = "";
  try {
    text = fs.readFileSync(path.join(profileDir, "pnpm-lock.yaml"), "utf8");
  } catch {
    return "";
  }
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  let inImporters = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\S/.test(line)) {
      if (inImporters) break; // 已扫过 importers，遇到下一个顶层键就结束
      inImporters = /^importers[ \t]*:/.test(line);
      continue;
    }
    if (!inImporters) continue;
    const entry = line.match(/^([ \t]+)dsh-purge[ \t]*:[ \t]*$/);
    if (!entry) continue;
    const indent = entry[1].length;
    // 收集该条目下的 specifier / version 行，直到缩进回到条目本身
    let specifier = "";
    let version = "";
    for (let j = i + 1; j < lines.length; j += 1) {
      const sub = lines[j];
      if (sub.trim() && (sub.match(/^[ \t]*/) || [""])[0].length <= indent) break;
      const sm = sub.match(/^[ \t]+(specifier|version)[ \t]*:[ \t]*(.*)$/);
      if (!sm) continue;
      let value = String(sm[2] || "").trim();
      // 掉引号：pnpm-lock 里带引号与否取决于内容
      if (/^(["']).*\1[ \t]*$/.test(value)) value = value.slice(1, -1).trim();
      if (sm[1] === "specifier") specifier = value;
      else version = value;
    }
    // version 是实际解析结果，优先；specifier 只是没有 URL 化版本时兜底
    for (const candidate of [version, specifier]) {
      const url = String(candidate || "").match(/https?:\/\/[^\s'"]+/);
      if (url) return url[0];
    }
    return "";
  }
  return "";
}

/** pnpm 11/12 会把「带 spec 的同一依赖」单独列一行：`dsh-purge@<tarball>` 或 `dsh-purge@file:...`。
 *  只写裸包名不够，必须把 profile 里实际用的那条 spec 也写进去，否则每次都报 ERR_PNPM_IGNORED_BUILDS。
 *  期望键按「profile 依赖 spec + 实际解析到的 tarball URL」收集（#180：lock 里的 commit URL 优先于包内 tarball）。 */
export function purgePnpmBuildSpecs(profileDir) {
  const specs = ["dsh-purge"];
  const push = (spec) => {
    const s = String(spec || "").trim();
    if (!s) return;
    if (s === "dsh-purge") return;
    const key = s.startsWith("dsh-purge@") ? s : `${PURGE_NAME}@${s}`;
    if (!specs.includes(key)) specs.push(key);
  };
  if (profileDir) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(profileDir, "package.json"), "utf8"));
      const dep = pkg?.dependencies?.[PURGE_NAME]
        || pkg?.devDependencies?.[PURGE_NAME]
        || pkg?.optionalDependencies?.[PURGE_NAME];
      push(dep);
    } catch { /* 读不到就退回 tarball */ }
  }
  // lock 里解析出的 URL 优先；读不到才回到包内 dsh.install.tarball（本地固定为 wyybs/local）
  push(readPurgeTarballFromLock(profileDir) || readPurgeTarball());
  return specs;
}

function isPurgeAllowBuildKey(key) {
  const name = String(key || "").replace(/^['"]|['"]$/g, "");
  return name === PURGE_NAME || name.startsWith(`${PURGE_NAME}@`);
}

/** 导出仅供单测 round-trip（#180）。 */
export function parseAllowBuildLine(line) {
  const text = String(line || "").replace(/\r$/, "");
  // 引号包裹：键整段取出，URL 里的冒号不会切碎键
  const quoted = text.match(/^[ \t]+(?:"([^"]+)"|'([^']+)')[ \t]*:[ \t]*(.*?)\s*$/);
  if (quoted) return { key: quoted[1] !== undefined ? quoted[1] : quoted[2], value: String(quoted[3] || "").trim() };
  // 未加引号的键：要求有缩进（顶层键不算），只在「冒号+空白（或行尾）」处切分，且取最后一次出现的位置——
  // URL 里的 `:` 后面跟的是 `/`，不会断键；`dsh-purge@https: true`（畸形历史键）也能正常切成键+值（#180）
  if (!/^[ \t]+/.test(text)) return null;
  let split = -1;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== ":") continue;
    if (i + 1 >= text.length || /[ \t]/.test(text[i + 1])) split = i;
  }
  if (split < 0) return null;
  const key = text.slice(0, split).trim();
  if (!key) return null;
  return { key, value: text.slice(split + 1).trim() };
}

/** 导出仅供单测 round-trip（#180）。 */
export function formatAllowBuildLine(key) {
  const name = String(key || "");
  // 含 `:` / 空白的键一律加双引号：`dsh-purge@file:D:/…`、`dsh-purge@https://…` 都不会被 YAML 二次切分
  if (/[:\s]/.test(name)) return `  ${JSON.stringify(name)}: true`;
  return `  ${name}: true`;
}

/**
 * 重写前做最小校验：顶层键、allowBuilds 段内键都不重复，每个键写回格式都能被
 * parseAllowBuildLine 无损还原。校验不过就不写盘，宁可不动用户的文件（#180）。
 * 导出仅供单测（#180）。
 */
export function validateAllowBuildRewrite(text) {
  const lines = String(text || "").split("\n");
  let inAllow = false;
  let allowIndent = -1;
  const topKeys = new Set();
  const allowKeys = new Set();
  for (const line of lines) {
    if (!line.trim()) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue; // 注释行原样保留，不参与校验
    if (/^\S/.test(line)) {
      inAllow = /^allowBuilds[ \t]*:/.test(line);
      allowIndent = -1;
      const m = line.match(/^(\S+?)[ \t]*:/);
      if (!m) return false;
      if (topKeys.has(m[1])) return false;
      topKeys.add(m[1]);
      continue;
    }
    if (!inAllow) continue;
    const indent = (line.match(/^[ \t]*/) || [""])[0].length;
    if (allowIndent < 0) allowIndent = indent;
    if (indent < allowIndent) {
      // 缩进回到 allowBuilds 的子键层级以上，说明段已结束
      inAllow = false;
      continue;
    }
    const parsed = parseAllowBuildLine(line);
    if (!parsed || !parsed.key) return false;
    const name = parsed.key;
    if (allowKeys.has(name)) return false;
    // 写回后的行必须能无损解析出同一个键
    if (parseAllowBuildLine(formatAllowBuildLine(name))?.key !== name) return false;
    allowKeys.add(name);
  }
  return true;
}

/**
 * 把 dsh-purge 以及 profile 里实际那条 spec（tarball / file:）都写成 true，避免装别的插件还报
 * ERR_PNPM_IGNORED_BUILDS（#168）。
 * 期望键精确命中的才保留；其它一切 `dsh-purge@*` 历史键（畸形 `dsh-purge@https`、过期版本/commit URL）
 * 一律丢弃，让旧的污染文件在下一次 ensure 时自动清干净（#180 自愈）。
 */
export function rewritePnpmAllowBuilds(raw, profileDir) {
  const wanted = purgePnpmBuildSpecs(profileDir);
  const wantedSet = new Set(wanted);
  const text = String(raw || "").replace(/\r\n/g, "\n");
  const wantedBlock = wanted.map(formatAllowBuildLine);
  if (!text.trim()) {
    return `allowBuilds:\n${wantedBlock.join("\n")}\n`;
  }
  const lines = text.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^allowBuilds[ \t]*:/.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start < 0) {
    const prefix = text.endsWith("\n") ? "" : "\n";
    return `${text}${prefix}\nallowBuilds:\n${wantedBlock.join("\n")}\n`;
  }
  let end = lines.length;
  const kept = [];
  const seen = new Set();
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      end = i;
      break;
    }
    if (/^\S/.test(line)) {
      end = i;
      break;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      kept.push(line);
      continue;
    }
    const parsed = parseAllowBuildLine(line);
    if (!parsed) {
      kept.push(line);
      continue;
    }
    if (isPurgeAllowBuildKey(parsed.key)) {
      // 只保留精确等于期望键的行，且去重；其余历史 purge 键丢弃（#180 自愈）
      if (!wantedSet.has(parsed.key) || seen.has(parsed.key)) continue;
      kept.push(formatAllowBuildLine(parsed.key));
      seen.add(parsed.key);
      continue;
    }
    // 非 purge 键原样保留；同键重复（会让 pnpm 报 duplicated mapping key）只留第一份（#180）
    if (seen.has(parsed.key)) continue;
    seen.add(parsed.key);
    kept.push(line);
  }
  for (let i = 0; i < wanted.length; i += 1) {
    if (!seen.has(wanted[i])) {
      kept.push(wantedBlock[i]);
      seen.add(wanted[i]);
    }
  }
  const next = [...lines.slice(0, start + 1), ...kept, ...lines.slice(end)].join("\n");
  return next.endsWith("\n") ? next : `${next}\n`;
}

/** pnpm 11/12 默认拦 postinstall（ERR_PNPM_IGNORED_BUILDS）。写进 profile 的 allowBuilds，下次 add 能跑脚本。 */
export function ensurePnpmAllowBuild(profileDir) {
  const fp = path.join(profileDir, "pnpm-workspace.yaml");
  let text = "";
  try { text = fs.readFileSync(fp, "utf8"); } catch { text = ""; }
  const current = String(text || "").replace(/\r\n/g, "\n");
  const next = rewritePnpmAllowBuilds(current, profileDir);
  if (next === current) return { ok: true, wrote: false, path: fp };
  // 写前校验不过就不写盘，宁可保持现状（#180）
  if (!validateAllowBuildRewrite(next)) return { ok: false, wrote: false, path: fp, reason: "allowBuilds-invalid" };
  fs.writeFileSync(fp, next, "utf8");
  return { ok: true, wrote: true, path: fp };
}

/** 已装进 bundles / node_modules 但缺 insert 的 profile，补上本体行。 */
export function ensureAllProfileBodyInserts(dshHome) {
  return ensureAllProfileInstall(dshHome).map((item) => ({
    dir: item.dir,
    ok: item.ok,
    wrote: Boolean(item.insert?.wrote),
    path: item.insert?.path || path.join(item.dir || "", "cordis.patch.yml"),
    error: item.error,
  }));
}

/** bundles + 本体 insert + pnpm allowBuilds。postinstall 被跳过、升级覆盖 overlay 之后靠这条把按钮找回来。 */
export function ensureAllProfileInstall(dshHome) {
  const results = [];
  for (const dir of listProfileDirs(dshHome)) {
    if (!profileOwnsPurge(dir)) continue;
    try {
      const bundles = ensureProfileBundles(dir);
      const insert = ensureProfileBodyInsert(dir);
      const pnpm = ensurePnpmAllowBuild(dir);
      results.push({ dir, ok: true, bundles, insert, pnpm });
    } catch (error) {
      results.push({
        dir,
        ok: false,
        error: error && error.message ? error.message : String(error),
      });
    }
  }
  return results;
}
