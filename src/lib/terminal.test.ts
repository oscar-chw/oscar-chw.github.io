import { describe, it, expect } from "vitest";
import { WorkspaceShell } from "../../public/terminal/shell.js";

describe("browser workspace shell", () => {
  it("navigates real virtual paths and reads files through text pipelines", () => {
    const sh = new WorkspaceShell({ '/data/prices.csv': 'symbol,price\nAAA,12\nBBB,9\nAAA,13\n' });
    expect(sh.execute('pwd').output).toBe('/home/visitor\n');
    expect(sh.execute('cat /data/prices.csv | grep AAA | wc -l').output.trim()).toBe('2');
    expect(sh.execute('cd /data').ok).toBe(true);
    expect(sh.execute('pwd').output.trim()).toBe('/data');
    expect(sh.execute('head -n 2 prices.csv').output).toBe('symbol,price\nAAA,12\n');
    expect(sh.execute('cat missing').ok).toBe(false);
  });
  it("supports scratch edits, quoted filenames, append, copy, move and removal", () => {
    const sh = new WorkspaceShell();
    expect(sh.execute('mkdir -p notes/research').ok).toBe(true);
    expect(sh.execute('echo "first idea" > "notes/research/my file.txt"').ok).toBe(true);
    expect(sh.execute('echo "second idea" >> "notes/research/my file.txt"').ok).toBe(true);
    expect(sh.execute('cat "notes/research/my file.txt"').output).toBe('first idea\nsecond idea\n');
    expect(sh.execute('cp "notes/research/my file.txt" copy.txt').ok).toBe(true);
    expect(sh.execute('mv copy.txt final.txt').ok).toBe(true);
    expect(sh.execute('rm final.txt').ok).toBe(true);
    expect(sh.execute('cat final.txt').ok).toBe(false);
    expect(sh.execute('cp missing.txt missing.txt').ok).toBe(false);
    expect(sh.execute('rmdir -r notes').ok).toBe(false);
  });
  it("keeps source files and root intact, refuses expansions and bounds input", () => {
    const sh = new WorkspaceShell({ '/data/value.txt': 'original\n' });
    expect(sh.execute('rm /').output).toContain('Is a directory');
    expect(sh.execute('rm -rf /').ok).toBe(false);
    expect(sh.execute('echo changed > /data/value.txt').ok).toBe(false);
    expect(sh.execute('cat /data/value.txt').output).toBe('original\n');
    expect(sh.execute('echo $(whoami)').ok).toBe(false);
    expect(sh.execute('echo "unclosed').ok).toBe(false);
    expect(sh.execute('echo ' + 'x'.repeat(5000)).ok).toBe(false);
    expect(sh.execute('echo "|" | wc -c').output.trim()).toBe('2');
  });
  it("handles empty streams, case-sensitive text, numeric sorting and completion", () => {
    const sh = new WorkspaceShell({ '/data/numbers.txt': '10\n2\n2\n1\n' });
    expect(sh.execute('cat /data/numbers.txt | sort -n | uniq').output).toBe('1\n2\n10\n');
    expect(sh.execute('cat /data/numbers.txt | head -n 0 | wc -l').output.trim()).toBe('0');
    expect(sh.execute('echo CaseSensitive').output).toBe('CaseSensitive\n');
    expect(sh.complete('cat /data/num')).toContain('cat /data/numbers.txt');
    expect(sh.execute('find /data -name "*.txt"').output).toContain('/data/numbers.txt');
  });
  it("bounds combined output by UTF-8 bytes while accepting boundary-sized streams", () => {
    const sh = new WorkspaceShell();
    sh.write('one.txt', '界'.repeat(16000));
    sh.write('two.txt', '界'.repeat(16000));
    expect(sh.execute('cat one.txt').output).toBe('界'.repeat(16000));
    expect(sh.execute('cat one.txt two.txt')).toMatchObject({ ok: false, output: expect.stringContaining('64 KB') });
    sh.write('ascii.txt', 'a'.repeat(65536));
    expect(sh.execute('cat ascii.txt').output.length).toBe(65536);
    sh.write('unicode.txt', '界'.repeat(21845) + 'a');
    expect(new TextEncoder().encode(sh.execute('cat unicode.txt').output).length).toBe(65536);
    expect(sh.execute('cat unicode.txt one.txt').ok).toBe(false);
  });
});
