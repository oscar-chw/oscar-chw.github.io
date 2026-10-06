import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Serve the CDN's Pyodide from node_modules/pyodide (the same pinned version, checked in
// src/lib/pyguard.test.ts) so guard tests do not depend on jsdelivr being reachable.
const TYPES: Record<string, string> = { mjs: "text/javascript", js: "text/javascript", wasm: "application/wasm", json: "application/json", zip: "application/zip" };
export async function localPyodide(page: Page) {
  await page.route(/cdn\.jsdelivr\.net\/pyodide\/v[\d.]+\/full\//, (r) => {
    const file = new URL(r.request().url()).pathname.split("/").pop()!;
    try {
      r.fulfill({ body: readFileSync(`node_modules/pyodide/${file}`), contentType: TYPES[file.split(".").pop()!] ?? "application/octet-stream", headers: { "access-control-allow-origin": "*" } });
    } catch { r.fulfill({ status: 404 }); }
  });
}
