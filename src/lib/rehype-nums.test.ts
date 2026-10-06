import { describe, it, expect } from "vitest";
import rehypeNums, { wrapNums } from "./rehype-nums.mjs";

const nums = (s: string) => (wrapNums(s) ?? []).filter((n: { type: string }) => n.type === "element").map((n: { children: { value: string }[] }) => n.children[0].value);

describe("prose numbers", () => {
  it("wraps figures with their units", () => {
    expect(nums("a Sharpe of 2.18 over 11 alphas, 40% faster, 25× the rows, 700B+ tokens")).toEqual(["2.18", "11", "40%", "25×", "700B+"]);
  });
  it("leaves codes and names alone", () => {
    expect(wrapNums("CSCI3100, Q4, H2 and v0.3 and gpt-4")).toBeNull();
  });
  it("keeps the text identical", () => {
    const s = "from 3 to 12.5% in 2027.";
    expect((wrapNums(s) ?? []).map((n: { value?: string; children?: { value: string }[] }) => n.value ?? n.children![0].value).join("")).toBe(s);
  });
  it("skips code and links but enters paragraphs and lists", () => {
    const t = (tagName: string, v: string) => ({ type: "element", tagName, properties: {}, children: [{ type: "text", value: v }] });
    const tree = { type: "root", children: [t("p", "11 alphas"), t("code", "x = 11"), t("a", "top 11"), { type: "element", tagName: "ul", children: [t("li", "7 days")] }] };
    rehypeNums()(tree);
    const json = JSON.stringify(tree);
    expect(json.match(/"num"/g)).toHaveLength(2);
    expect(tree.children[1].children[0]).toEqual({ type: "text", value: "x = 11" });
  });
});
