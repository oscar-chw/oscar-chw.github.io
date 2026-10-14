import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { data, Evaluator, Lexer, Parser } from "@actions/expressions";

const deploy = parse(readFileSync(".github/workflows/deploy.yml", "utf8"));
const ci = parse(readFileSync(".github/workflows/ci.yml", "utf8"));
const revision = "1234567890abcdef1234567890abcdef12345678";
const repository = "oscar-chw/oscar-chw.github.io";
const run = {
  name: "CI", status: "completed", conclusion: "success", event: "push",
  head_branch: "main", head_sha: revision, head_repository: { full_name: repository },
};
function value(input: string | Record<string, unknown>): data.ExpressionData {
  return typeof input === "string" ? new data.StringData(input) :
    new data.Dictionary(...Object.entries(input).map(([key, item]) => ({ key, value: value(item as string | Record<string, unknown>) })));
}
function evaluate(expression: string, github: Record<string, unknown>) {
  const source = expression.replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/g, "");
  const ast = new Parser(new Lexer(source).lex().tokens, ["github"], []).parse();
  return new Evaluator(ast, new data.Dictionary({ key: "github", value: value(github) })).evaluate().coerceString();
}
const context = (event = "workflow_run", overrides = {}) => ({
  event_name: event, repository, sha: "a different untested checkout",
  event: { workflow_run: { ...run, ...overrides } },
});

describe("Pages deployment admission", () => {
  it("is triggered only by completed CI on main and has no manual bypass", () => {
    expect(Object.keys(deploy.on)).toEqual(["workflow_run"]);
    expect(deploy.on.workflow_run).toEqual({ workflows: ["CI"], types: ["completed"], branches: ["main"] });
  });
  it("admits successful same-repository main push CI", () => {
    expect(evaluate(deploy.jobs.build.if, context())).toBe("true");
  });
  for (const [name, event, overrides] of [
    ["manual request", "workflow_dispatch", {}],
    ["failed CI", "workflow_run", { conclusion: "failure" }],
    ["cancelled CI", "workflow_run", { conclusion: "cancelled" }],
    ["running CI", "workflow_run", { status: "in_progress" }],
    ["another workflow", "workflow_run", { name: "Unrelated check" }],
    ["pull-request CI", "workflow_run", { event: "pull_request" }],
    ["review branch", "workflow_run", { head_branch: "codex/review" }],
    ["fork named main", "workflow_run", { head_repository: { full_name: "someone/fork" } }],
    ["missing revision", "workflow_run", { head_sha: "" }],
  ] as const) it(`rejects ${name}`, () => {
    expect(evaluate(deploy.jobs.build.if, context(event, overrides))).toBe("false");
  });
  it("checks out the exact successful CI revision, never the triggering workflow revision", () => {
    const checkout = deploy.jobs.build.steps.find((step: { uses?: string }) => step.uses?.startsWith("actions/checkout@"));
    expect(evaluate(checkout.with.ref, context())).toBe(revision);
    expect(evaluate(checkout.with.ref, context("workflow_run", { head_sha: "" }))).toBe("");
    expect(deploy.jobs.deploy.needs).toBe("build");
  });
});

it("offers the checked site as a PR artifact only after all successful checks", () => {
  expect(ci.on).toHaveProperty("pull_request");
  const steps = ci.jobs.checks.steps;
  const index = steps.findIndex((step: { uses?: string; with?: { name?: string } }) =>
    step.uses?.startsWith("actions/upload-artifact@") && step.with?.name?.startsWith("website-preview-"));
  expect(index).toBeGreaterThan(steps.findIndex((step: { run?: string }) => step.run === "npx lhci autorun"));
  expect(steps[index].if).toBe("success()");
  expect(steps[index].with.path).toBe("dist/");
  expect(steps[index].with["if-no-files-found"]).toBe("error");
  expect(steps[index].with.name).toContain("github.sha");
  expect(ci.permissions).toEqual({ contents: "read" });
});
