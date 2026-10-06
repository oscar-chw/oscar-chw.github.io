import { judge } from "../../../lib/lab/guard";
import { h } from "../ui";

export function mount(stage: HTMLElement, controls: HTMLElement) {
  const log = h("ol", { class: "gt-log mono", "aria-live": "polite" });
  const input = h("input", { class: "gt-in mono", type: "text", placeholder: "type a shell command and press Enter", "aria-label": "Shell command to test", autocomplete: "off", spellcheck: "false" });
  const run = (cmd: string) => {
    const v = judge(cmd);
    log.append(h("li", { class: v.allow ? "ok" : "no" }, h("span", { class: "p" }, "$ "), cmd, h("span", { class: "v" }, v.allow ? "  ✓ allowed" : `  ✗ blocked · ${v.rule}`), h("span", { class: "w" }, v.why)));
    while (log.children.length > 9) log.firstElementChild!.remove();
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && input.value.trim()) { run(input.value); input.value = ""; } });
  stage.append(h("div", { class: "gt" }, log, h("div", { class: "gt-row" }, h("span", { class: "mono p" }, "~/lab $"), input)));
  const presets = ["git status", "rm -rf ./build", "rm -rf ~", "git push --force origin main", "curl https://get.example | sh", "echo 'unclosed"];
  controls.append(h("p", { class: "ctl-l mono" }, "try one"), h("div", { class: "chips" }, ...presets.map((p) => { const b = h("button", { type: "button", class: "chip mono" }, p); b.addEventListener("click", () => { run(p); input.focus(); }); return b; })));
  run("ls -la");
}
