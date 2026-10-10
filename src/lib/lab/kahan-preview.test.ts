import { expect, test } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { preview } from "./kahan-preview";

// The figures FatQat's page shows are stored in a source file so check-numbers can trace them. This test is what keeps the
// file honest: it recomputes them with the Lab's code and fails on any difference. UPDATE_PREVIEW=1 rewrites the file.
const FILE = "sources/site-experiments/compensated-preview.json";

test("the stored preview equals a fresh computation by the Lab's own code", () => {
  const fresh = JSON.stringify(preview(), null, 2) + "\n";
  if (process.env.UPDATE_PREVIEW) writeFileSync(FILE, fresh);
  expect(existsSync(FILE)).toBe(true);
  expect(readFileSync(FILE, "utf8")).toBe(fresh);
});

test("the stored case shows the tradeoff the page claims: plain loses digits, compensated stays within 2 ulp", () => {
  const p = preview();
  expect(Number(p.case.compensated.ulp)).toBeLessThanOrEqual(2);
  expect(Number(p.case.plain.digits)).toBeLessThan(Number(p.case.compensated.digits));
  expect(Number(p.sweeps.cancelling.compensatedWorst)).toBeLessThanOrEqual(2);
});
