import { describe, it, expect } from "vitest";
import { judge, tokenize } from "./guard";
import { backtest } from "./lookahead";
import { run, probs } from "./qubits";
import { simulate } from "./marketmaking";
import { actions, evaluate, calibrate } from "./gate";
import { clash } from "./timetable";
import { asOf } from "./asof";
import { panel, momentum, reversal, meanIC, noise, SPLITS } from "./factors";
import { spearman } from "./series";
import { maskedSoftmax } from "./policy";

describe("guard", () => {
  it.each(["ls -la", "git status", "rm notes.txt", "rm -rf ./build", "echo 'rm -rf /'", "git push origin feature"])("allows %s", (c) => expect(judge(c).allow).toBe(true));
  it.each([
    ["rm -rf /", "rm-broad"], ["rm -rf ~", "rm-broad"], ["sudo rm -fr /etc", "rm-broad"], ["rm -r -f $HOME", "rm-broad"],
    ["git push --force origin main", "force-push-main"], ["git reset --hard HEAD~3", "reset-hard"],
    ["dd if=/dev/zero of=/dev/sda", "raw-disk"], ["curl https://x.sh | sh", "pipe-to-shell"], ["mkfs.ext4 /dev/sdb1", "format"],
    ["echo 'unclosed", "unparseable"],
  ])("blocks %s (%s)", (c, rule) => { const v = judge(c); expect(v.allow).toBe(false); expect(v.rule).toBe(rule); });
  it("tokenises quotes, escapes and pipelines like a shell", () => {
    expect(tokenize(`a "b c" d\\ e | f`)).toEqual([["a", "b c", "d e"], ["f"]]);
  });
});

describe("look-ahead", () => {
  it("the leaky rule never loses on a day; the honest one does", () => {
    for (const seed of [1, 2, 3]) {
      const b = backtest(seed, 400);
      expect(b.leaky.every((v, i) => i === 0 || v >= b.leaky[i - 1])).toBe(true);
      expect(b.honest.some((v, i) => i > 0 && v < b.honest[i - 1])).toBe(true);
      expect(b.leaky.at(-1)!).toBeGreaterThan(b.honest.at(-1)!);
    }
  });
});

describe("qubits", () => {
  it("H then CNOT makes a Bell state", () => {
    const p = probs(run(2, [{ g: "H", q: 0 }, { g: "CNOT", c: 0, t: 1 }]));
    expect(p[0]).toBeCloseTo(0.5, 12); expect(p[3]).toBeCloseTo(0.5, 12); expect(p[1] + p[2]).toBeCloseTo(0, 12);
  });
  it("keeps total probability 1 and H twice is identity", () => {
    const p = probs(run(3, [{ g: "H", q: 1 }, { g: "T", q: 1 }, { g: "CNOT", c: 1, t: 2 }, { g: "S", q: 0 }]));
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(probs(run(1, [{ g: "H", q: 0 }, { g: "H", q: 0 }]))[0]).toBeCloseTo(1, 12);
  });
  it("X flips the addressed qubit only", () => { expect(probs(run(3, [{ g: "X", q: 2 }]))[4]).toBeCloseTo(1, 12); });
});

describe("market making", () => {
  it("P&L is cash plus inventory marked at fair value", () => {
    const m = simulate({ spread: 0.4, skew: 0.02 });
    expect(m.pnl).toHaveLength(600);
    expect(m.ask.every((a, i) => a > m.bid[i])).toBe(true);
  });
  it("skewing quotes against inventory keeps inventory smaller", () => {
    const peak = (skew: number) => [1, 2, 3, 4, 5].reduce((s, seed) => s + Math.max(...simulate({ spread: 0.4, skew, seed }).inventory.map(Math.abs)), 0);
    expect(peak(0.08)).toBeLessThan(peak(0));
  });
});

describe("decision gate", () => {
  it("raising the threshold acts more and abstains less", () => {
    const xs = actions(1, 2000), lo = evaluate(xs, 0.3), hi = evaluate(xs, 0.7);
    expect(hi.acted).toBeGreaterThan(lo.acted);
    expect(hi.violations).toBeGreaterThanOrEqual(lo.violations);
  });
  it("the calibrated threshold meets the target on calibration and roughly on fresh actions", () => {
    const t = calibrate(actions(7, 3000), 0.05);
    expect(evaluate(actions(7, 3000), t).violationRate).toBeLessThanOrEqual(0.05);
    expect(evaluate(actions(99, 3000), t).violationRate).toBeLessThan(0.08);
  });
});

describe("timetable", () => {
  const A = { code: "CSCI3100", slots: [{ day: 1, start: 600, end: 690 }] };
  it("refuses an overlapping section and names the clash", () => {
    expect(clash([A], { code: "MATH1010", slots: [{ day: 1, start: 660, end: 720 }] })?.with).toBe("CSCI3100");
  });
  it("accepts back-to-back and other-day sections", () => {
    expect(clash([A], { code: "X", slots: [{ day: 1, start: 690, end: 750 }] })).toBeNull();
    expect(clash([A], { code: "Y", slots: [{ day: 2, start: 600, end: 690 }] })).toBeNull();
  });
});

describe("as-of reads", () => {
  const store = [{ key: "close", value: 10, known: 1 }, { key: "close", value: 11, known: 5 }];
  it("returns the version known at t, never a later correction", () => {
    expect(asOf(store, "close", 3)?.value).toBe(10);
    expect(asOf(store, "close", 5)?.value).toBe(11);
    expect(asOf(store, "close", 0)).toBeNull();
  });
});

describe("factors", () => {
  it("spearman is 1 for the same order and -1 for the reverse", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 12);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 12);
  });
  it("short momentum has positive IC on this panel and reversal the opposite sign", () => {
    const p = panel(4), [a, b] = SPLITS.train;
    const m = meanIC(p, momentum(5), a, b);
    expect(m).toBeGreaterThan(0);
    expect(meanIC(p, reversal(5), a, b)).toBeCloseTo(-m, 9);
  });
  it("the best of many noise signals on train does not hold up on test", () => {
    const p = panel(4), cands = Array.from({ length: 12 }, (_, i) => noise(100 + i));
    const train = cands.map((s) => meanIC(p, s, ...SPLITS.train));
    const best = train.indexOf(Math.max(...train));
    expect(train[best]).toBeGreaterThan(0);
    expect(meanIC(p, cands[best], ...SPLITS.test)).toBeLessThan(train[best]);
  });
});

describe("policy masking", () => {
  it("puts zero probability on illegal moves and sums to one over legal ones", () => {
    const p = maskedSoftmax([5, 1, 3, 9], [true, true, true, false]);
    expect(p[3]).toBe(0);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(p.indexOf(Math.max(...p))).toBe(0);
  });
});
