import {describe,it,expect} from 'vitest';
import {WorkspaceShell} from '../../public/terminal/shell.js';

describe('useful browser shell tools',()=>{
  it('extracts and transforms actual visitor data through a pipeline',()=>{
    const sh=new WorkspaceShell({'/data/trades.csv':'symbol,qty\naaa,2\nbbb,3\naaa,4\n'});
    expect(sh.execute('cat /data/trades.csv | tail -n 3 | cut -d , -f 1 | tr a-z A-Z | sort | uniq -c').output).toBe('2 AAA\n1 BBB\n');
    expect(sh.execute('seq 2 2 8 | paste -s -d ,').output).toBe('2,4,6,8\n');
    expect(sh.execute('printf "%s\\n" "hello world" "next line"').output).toBe('hello world\nnext line\n');
  });
  it('preserves missing final newlines and has explicit command errors',()=>{
    const sh=new WorkspaceShell();
    expect(sh.execute('printf "%s" "a,b" | cut -d , -f 2').output).toBe('b\n');
    expect(sh.execute('cut -d xx -f 1')).toMatchObject({ok:false,code:1});
    expect(sh.execute('seq 1 0 5').ok).toBe(false);
    expect(sh.execute('printf "%q" unsafe').ok).toBe(false);
    expect(sh.execute('tr -z a b').ok).toBe(false);
    expect(sh.execute('does-not-exist')).toMatchObject({ok:false,code:127});
  });
  it('compares complete files and explains file sizes as UTF-8 bytes',()=>{
    const sh=new WorkspaceShell();sh.write('a.txt','hi\n界\n');sh.write('b.txt','hi\nthere\n');
    expect(sh.execute('diff a.txt b.txt')).toMatchObject({ok:false,code:1});
    expect(sh.execute('diff a.txt b.txt').output).toContain('< 界');
    expect(sh.execute('diff a.txt a.txt')).toMatchObject({ok:true,code:0,output:''});
    expect(sh.execute('stat a.txt').output).toContain('7 bytes');
    expect(sh.execute('basename /tmp/a.txt').output).toBe('a.txt\n');
    expect(sh.execute('dirname /tmp/a.txt').output).toBe('/tmp\n');
  });
  it('returns a specific manual and never invents an unavailable command',()=>{
    const sh=new WorkspaceShell();
    expect(sh.execute('man cut').output).toContain('cut -d');
    expect(sh.execute('man missing-command').ok).toBe(false);
    expect(sh.execute('neofetch').output).toContain('Browser');
    expect(sh.execute('neofetch').output).toContain('/home/visitor');
    expect(sh.execute('ls -z').ok).toBe(false);
  });
  it('keeps scratch files across a validated snapshot without replacing public sources',()=>{
    const sh=new WorkspaceShell({'/data/public.txt':'original'});
    sh.execute('mkdir -p research/drafts');sh.execute('cd research');sh.write('notes.txt','saved idea');
    expect(typeof sh.snapshot).toBe('function');
    const next=new WorkspaceShell({'/data/public.txt':'refreshed'});next.restore(sh.snapshot());
    expect(next.cwd).toBe('/home/visitor/research');expect(next.read('notes.txt')).toBe('saved idea');
    expect(next.read('/data/public.txt')).toBe('refreshed');
    const before=next.snapshot();
    expect(()=>next.restore({...before,files:[['/data/public.txt','tampered']]})).toThrow();
    expect(next.snapshot()).toEqual(before);
    expect(()=>next.restore({...before,files:[['/tmp/huge','x'.repeat(65537)]]})).toThrow();
    expect(next.snapshot()).toEqual(before);
  });
});
