// A toy of agent-harness's command guard for the lab: tokenise a shell command the way a shell
// would, then refuse the destructive shapes. Like the real guard it fails closed: a command it
// cannot parse is blocked. This is an illustration, not the guard's code or rule set.
export interface Verdict { allow: boolean; rule: string; why: string }

/** Shell-like split honouring quotes and escapes; null when quotes are unbalanced. */
export function tokenize(cmd: string): string[][] | null {
  const parts: string[][] = [[]];
  let cur = "", q: string | null = null, has = false;
  const push = () => { if (has) parts[parts.length - 1].push(cur); cur = ""; has = false; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) { if (c === q) q = null; else if (c === "\\" && q === '"' && i + 1 < cmd.length) cur += cmd[++i]; else cur += c; continue; }
    if (c === "'" || c === '"') { q = c; has = true; continue; }
    if (c === "\\" && i + 1 < cmd.length) { cur += cmd[++i]; has = true; continue; }
    if (/\s/.test(c)) { push(); continue; }
    if (c === "|" || c === ";" || c === "&") { push(); if (parts[parts.length - 1].length) parts.push([]); if (cmd[i + 1] === c) i++; continue; }
    cur += c; has = true;
  }
  if (q) return null;
  push();
  return parts.filter((p) => p.length);
}

const BROAD = /^(\/|~|~\/|\/\*|\*|\.\.?|\$HOME|\/(etc|usr|bin|var|home|Users|System)(\/.*)?)$/;

export function judge(cmd: string): Verdict {
  if (!cmd.trim()) return { allow: true, rule: "empty", why: "nothing to run" };
  const parts = tokenize(cmd);
  if (!parts) return { allow: false, rule: "unparseable", why: "unbalanced quotes: the guard cannot tell what would run, so it fails closed" };
  for (let k = 0; k < parts.length; k++) {
    let p = parts[k];
    if (p[0] === "sudo") p = p.slice(1);
    const [bin, ...args] = p, flags = args.filter((a) => a.startsWith("-")).join(""), paths = args.filter((a) => !a.startsWith("-"));
    if (bin === "rm" && /r/.test(flags) && /f/.test(flags) && paths.some((a) => BROAD.test(a))) return { allow: false, rule: "rm-broad", why: "recursive force-delete of a root, home or system path" };
    if (bin === "rm" && /r/.test(flags) && paths.some((a) => BROAD.test(a))) return { allow: false, rule: "rm-broad", why: "recursive delete of a root, home or system path" };
    if (bin === "git" && args[0] === "push" && args.some((a) => a === "--force" || a === "-f") && args.some((a) => /^(main|master)$/.test(a))) return { allow: false, rule: "force-push-main", why: "force-push rewrites the shared main branch" };
    if (bin === "git" && args[0] === "reset" && args.includes("--hard")) return { allow: false, rule: "reset-hard", why: "discards uncommitted work with no undo" };
    if (bin === "dd" && args.some((a) => /^of=\/dev\//.test(a))) return { allow: false, rule: "raw-disk", why: "writes straight over a disk device" };
    if (bin && /^mkfs(\.|$)/.test(bin)) return { allow: false, rule: "format", why: "formats a filesystem" };
    if (bin === "chmod" && /R/.test(flags) && args.includes("777") && paths.some((a) => BROAD.test(a))) return { allow: false, rule: "chmod-broad", why: "opens a whole tree to everyone" };
    if ((bin === "sh" || bin === "bash" || bin === "zsh") && k > 0 && /^(curl|wget)$/.test(parts[k - 1][0])) return { allow: false, rule: "pipe-to-shell", why: "runs a downloaded script without reading it" };
    if (/^:\(\)/.test(bin ?? "")) return { allow: false, rule: "fork-bomb", why: "a fork bomb" };
  }
  return { allow: true, rule: "ok", why: "no destructive shape found" };
}
