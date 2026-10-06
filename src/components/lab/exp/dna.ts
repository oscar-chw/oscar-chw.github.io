import { encode, decode, channel, gc, longestRun, intact, type Event } from "../../../lib/lab/dna";
import { h, slider, button, readout } from "../ui";
import { Shuffle } from "lucide";

// Type a message, write it as DNA, damage the strand and read it back with no correction. The strand
// shows each event where it landed; the read-back shows which characters survived.
export function mount(stage: HTMLElement, controls: HTMLElement) {
  let seed = 1, subs = 1, ins = 0, dels = 0;
  const input = h("input", { class: "sr-in", type: "text", value: "Data in DNA lasts for ages.", maxlength: "48", "aria-label": "Message to store in DNA" }) as HTMLInputElement;
  const strandEl = h("p", { class: "dna mono", "aria-label": "The damaged DNA strand" });
  const backEl = h("p", { class: "dna-back mono", "aria-live": "polite" });
  const ro = h("div", {});
  stage.append(input, h("p", { class: "ctl-l mono" }, "the strand after the channel"), strandEl, h("p", { class: "ctl-l mono" }, "read back, no correction"), backEl,
    h("p", { class: "lab-note mono" }, "red: substituted letter · amber: inserted letter · | : a letter was deleted here"));

  const draw = () => {
    const msg = input.value || " ", clean = encode(msg), { out, events } = channel(clean, seed, subs, ins, dels), back = decode(out);
    // mark the final strand: substitutions and insertions by position, deletions as a bar before the next letter
    const mark = new Map<number, Event["kind"]>();
    for (const e of events) mark.set(e.pos, e.kind);
    strandEl.replaceChildren(...[...out].slice(0, 220).map((c, i) => {
      const k = mark.get(i);
      return k === "del" ? h("span", { class: "del" }, "|", h("i", { class: `b ${c}` }, c)) : h("i", { class: `b ${c} ${k ?? ""}` }, c);
    }));
    backEl.replaceChildren(...[...back].map((c, i) => h("span", { class: c === msg[i] ? "ok" : "bad" }, c)));
    const kept = intact(msg, back);
    ro.replaceChildren(readout([
      ["characters intact", `${kept} of ${msg.length}`],
      ["GC content", `${(gc(clean) * 100).toFixed(0)}%`],
      ["longest run", `${longestRun(clean)} letters`],
    ]));
  };
  input.addEventListener("input", draw);
  controls.append(
    slider("substitutions", 0, 6, 1, subs, String, (v) => { subs = v; draw(); }),
    slider("insertions", 0, 3, 1, ins, String, (v) => { ins = v; draw(); }),
    slider("deletions", 0, 3, 1, dels, String, (v) => { dels = v; draw(); }),
    button("damage it differently", () => { seed++; draw(); }, "", Shuffle),
    ro,
    h("p", { class: "lab-note" }, "Try one deletion: everything after it shifts by a letter and the rest is unreadable. That is the case the simulator's beam-search decoder exists for."),
  );
  draw();
}
