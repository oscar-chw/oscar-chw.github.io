import { asOf, type Version } from "./asof";

export interface RecordVersion extends Version { line: number }
export const MAX_CSV_BYTES = 64 * 1024;
const MAX_ROWS = 200;

/** Small bounded CSV reader: quoted commas, escaped quotes and CRLF are accepted. */
export function parseVersions(text: string): RecordVersion[] {
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) throw new Error("File exceeds the 64 KB workspace limit.");
  const records: { cells: string[]; line: number }[] = [];
  let cells: string[] = [], cell = "", quoted = false, closed = false, line = 1, start = 1;
  const field = () => { cells.push(cell); cell = ""; closed = false; };
  const row = () => {
    const blank = cells.length === 0 && !closed && !cell.trim();
    field(); if (!blank) records.push({ cells, line: start }); cells = []; start = line + 1;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else { cell += c; if (c === "\n") line++; }
    } else if (c === '"') {
      if (cell || closed) throw new Error(`Line ${line}: unexpected quote.`);
      quoted = true;
    } else if (c === ",") field();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row(); line++;
    } else {
      if (closed && c.trim()) throw new Error(`Line ${line}: text after a quoted field.`);
      if (!closed) cell += c;
    }
  }
  if (quoted) throw new Error(`Line ${start}: unclosed quoted field.`);
  if (cell || cells.length || closed) row();
  const header = records.shift();
  if (!header || header.cells.map((c) => c.trim()).join(",") !== "key,value,known") throw new Error("Use the header key,value,known.");
  if (!records.length) throw new Error("Add at least one version record.");
  if (records.length > MAX_ROWS) throw new Error(`Use at most ${MAX_ROWS} version records.`);
  const seen = new Set<string>();
  return records.map(({ cells, line }) => {
    if (cells.length !== 3) throw new Error(`Line ${line}: expected three columns: key, value, known.`);
    const key = cells[0].trim(), value = Number(cells[1]), known = Number(cells[2]);
    if (!key || key.length > 80 || /[\r\n\x00-\x1f]/.test(key)) throw new Error(`Line ${line}: use a non-empty, single-line key of at most 80 characters.`);
    if (!cells[1].trim() || !Number.isFinite(value)) throw new Error(`Line ${line}: value must be a finite number.`);
    if (!cells[2].trim() || !Number.isSafeInteger(known) || known < 0 || known > 1000) throw new Error(`Line ${line}: known must be an integer from 0 to 1000.`);
    const id = JSON.stringify([key, known]);
    if (seen.has(id)) throw new Error(`Line ${line}: ${key} already has a revision at ${known}; use a different publication time.`);
    seen.add(id); return { key, value, known, line };
  });
}

export function versionsCSV(rows: Version[]) {
  const quote = (s: string) => /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
  return "key,value,known\n" + rows.map((r) => `${quote(r.key)},${r.value},${r.known}`).join("\n") + "\n";
}

export function queryVersions(rows: RecordVersion[], cutoff: number) {
  if (!Number.isSafeInteger(cutoff) || cutoff < 0 || cutoff > 1000) throw new Error("Cutoff must be an integer from 0 to 1000.");
  return [...new Set(rows.map((r) => r.key))].map((key) => {
    const selected = asOf(rows, key, cutoff) as RecordVersion | null;
    const latest = asOf(rows, key, Infinity) as RecordVersion;
    return { key, selected, latest, later: latest.known > cutoff, versions: rows.filter((r) => r.key === key).sort((a, b) => a.known - b.known) };
  });
}
