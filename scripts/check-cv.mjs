// Gate: the downloadable CV is the phone-free general one, and the /cv page links it.
// Named failures: the PDF is missing, carries a phone number, lacks the email /
// LinkedIn / GitHub header, or the page links a file that is not in dist.
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PDF = "dist/cv/Oscar_Choi_CV.pdf";
const PAGE = "dist/cv/index.html";
const fail = (m) => { console.error(`check-cv: ${m}`); process.exit(1); };
for (const f of [PDF, PAGE]) if (!existsSync(f)) fail(`${f} missing; build first`);

const text = execFileSync("pdftotext", ["-layout", PDF, "-"], { encoding: "utf8" });
if (text.trim().length < 500) fail("PDF has almost no text; wrong file?");
if (/(?:\+?852[\s-]?)?\b[2-9]\d{3}[\s-]?\d{4}\b/.test(text)) fail("PDF contains a phone-like number");
for (const need of ["choiheiwang@gmail.com", "linkedin.com/in/oscar-chw", "github.com/oscar-chw"])
  if (!text.includes(need)) fail(`PDF header lacks ${need}`);
if (!/href="[^"]*\/cv\/Oscar_Choi_CV\.pdf"/.test(readFileSync(PAGE, "utf8"))) fail("/cv page does not link the PDF");
console.log("check-cv: OK");
