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

/** pnpm 11/12 会把「带 spec 的同一依赖」单独列一行：`dsh-purge@<tarball>` 或 `dsh-purge@file:...`。
 *  只写裸包名不够，必须把 profile 里实际用的那条 spec 也写进去，否则每次都报 ERR_PNPM_IGNORED_BUILDS。 */
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
  push(readPurgeTarball());
  return specs;
}

function isPurgeAllowBuildKey(key) {
  const name = String(key || "").replace(/^['"]|['"]$/g, "");
  return name === PURGE_NAME || name.startsWith(`${PURGE_NAME}@`);
}

function parseAllowBuildLine(line) {
  // 值只可能是布尔：把 (true|false) 锚到行尾，键才能非贪婪吃下 `https://…` / `file:D:/…` 里的冒号。
  // 上游用 (\S+?) 会在第一个冒号处截断，把 `dsh-purge@https://…` 变成 `dsh-purge@https`，
  // 下一轮 rewrite 就写回截断键 → 真正的 URL 键丢失 + 每次 postinstall 多一行重复。
  const m = String(line || "").match(/^[ \t]+(?:"([^"]+)"|'([^']+)'|(.+?))[ \t]*:[ \t]*(true|false)[ \t]*$/i);
  if (!m) return null;
  return { key: m[1] || m[2] || m[3], value: String(m[4] || "").trim() };
}

function formatAllowBuildLine(key) {
  // 含冒号的键一律加引号，避免二次解析歧义（`dsh-purge@file:D:/…`、`dsh-purge@https://…`）。
  const name = String(key || "");
  if (/[:\s]/.test(name)) return `  '${name}': true`;
  return `  ${name}: true`;
}

/** 把 dsh-purge 以及 profile 里实际那条 spec（tarball / file:）都写成 true，避免装别的插件还报 ERR_PNPM_IGNORED_BUILDS（#168）。 */
export function rewritePnpmAllowBuilds(raw, profileDir) {
  const wanted = purgePnpmBuildSpecs(profileDir);
  const text = String(raw || "").replace(/\r\n/g, "\n");
  if (!text.trim()) {
    return `allowBuilds:\n${wanted.map(formatAllowBuildLine).join("\n")}\n`;
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
    return `${text}${prefix}\nallowBuilds:\n${wanted.map(formatAllowBuildLine).join("\n")}\n`;
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
    const parsed = parseAllowBuildLine(line);
    if (!parsed) {
      kept.push(line);
      continue;
    }
    if (isPurgeAllowBuildKey(parsed.key)) {
      // 只保留两个规范键（裸包名 + tarball spec）；其它 `dsh-purge@…` 是历史上被截断键
      // （`dsh-purge@https` / `dsh-purge@file`）反复写回来的残渣，直接丢弃。
      if (parsed.key !== PURGE_NAME && !wanted.includes(parsed.key)) continue;
      if (seen.has(parsed.key)) continue;
      kept.push(formatAllowBuildLine(parsed.key));
      seen.add(parsed.key);
      continue;
    }
    kept.push(line);
  }
  for (const key of wanted) {
    if (!seen.has(key)) kept.push(formatAllowBuildLine(key));
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
