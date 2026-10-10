import { expect, test } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pointInTime, gatedBuild } from "./site-previews";

// Each flagship page shows a stored, build-computed result. These tests recompute every stored file with the Lab's own
// code and fail on any difference; UPDATE_PREVIEW=1 rewrites them.
const FILES = [["sources/site-experiments/point-in-time-preview.json", pointInTime], ["sources/site-experiments/gated-build-preview.json", gatedBuild]] as const;
for (const [file, make] of FILES) {
  test(`${file} equals a fresh computation`, () => {
    const fresh = JSON.stringify(make(), null, 2) + "\n";
    if (process.env.UPDATE_PREVIEW) writeFileSync(file, fresh);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(fresh);
  });
}

test("point-in-time: a read as of the early day never sees a value published later", () => {
  const p = pointInTime(), close = p.rows.find((r) => r.field === "close (Mon)")!;
  expect(close.early).toBe("10");
  expect(close.late).toBe("10.4");
  expect(p.rows.find((r) => r.field === "dividend (Wed)")!.early).toBe("not known yet");
});

test("gated build: a failed gate leaves the task pending with evidence, a claim changes nothing, and the next task cannot start", () => {
  const g = gatedBuild(), t4 = g.tasks.find((t) => t.id === "4")!;
  expect(t4.state).toBe("pending");
  expect(t4.evidence).toHaveLength(1);
  expect(g.tasks.filter((t) => t.state === "done").map((t) => t.id)).toEqual(["1", "2", "3"]);
  expect(g.ready).toEqual(["4"]);
  expect(g.log.join(" ")).toMatch(/not ready/);
});
