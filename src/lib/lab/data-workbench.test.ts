import { describe, expect, it } from "vitest";
import { parseVersions, queryVersions, versionsCSV } from "./data-workbench";

describe("editable point-in-time data", () => {
  it("reads the user's rows, preserves quoted keys and traces the chosen revision", () => {
    const rows = parseVersions('key,value,known\n"price, adjusted",10,1\n"price, adjusted",12.5,4\nvolume,100,2\n');
    const before = queryVersions(rows, 1);
    expect(before[0]).toMatchObject({ key: "price, adjusted", selected: { value: 10, known: 1, line: 2 }, latest: { value: 12.5 }, later: true });
    expect(before[1].selected).toBeNull();
    expect(queryVersions(rows, 4)[0].selected?.value).toBe(12.5);
    expect(parseVersions(versionsCSV(rows))).toEqual(rows);
  });
  it("does not depend on input order and refuses ambiguous or malformed input", () => {
    expect(queryVersions(parseVersions('key,value,known\nprice,12,4\nprice,10,1'), 2)[0].selected?.value).toBe(10);
    for (const input of ['', 'key,value,known', 'key,value,known\na,NaN,2', 'key,value,known\na,3,-1', 'key,value,known\na,3,2\na,4,2', 'key,value,known\n"unclosed,3,2']) {
      expect(() => parseVersions(input)).toThrow();
    }
  });
  it("keeps every selected record at or before the cutoff", () => {
    const csv = 'key,value,known\n' + Array.from({ length: 100 }, (_, i) => `field${i % 5},${i * 7},${i}`).reverse().join('\n');
    const rows = parseVersions(csv);
    for (let t = 0; t <= 100; t++) for (const field of queryVersions(rows, t)) {
      expect(field.selected === null || field.selected.known <= t).toBe(true);
      const eligible = rows.filter((r) => r.key === field.key && r.known <= t);
      expect(field.selected?.known ?? null).toBe(eligible.length ? Math.max(...eligible.map((r) => r.known)) : null);
    }
  });
  it("ignores blank lines but rejects empty delimited or quoted records", () => {
    const prefix = 'key,value,known\nprice,10,1\n';
    expect(parseVersions(prefix + '\n \t\n')).toEqual([{ key: 'price', value: 10, known: 1, line: 2 }]);
    for (const row of [',,', ' , , ', '"","",""', '""']) {
      expect(() => parseVersions(prefix + row + '\n')).toThrow(/Line 3/);
    }
    expect(parseVersions(prefix + '\n"price, adjusted",12,4\n')[1]).toMatchObject({ key: 'price, adjusted', line: 4 });
  });
});
