import {expect,test} from 'vitest';
import {WorkspaceShell} from '../../public/terminal/shell.js';

test('APT misspelling explains the hyphenated name and both real Linux forms',()=>{
  const r=new WorkspaceShell().execute('sudo apt get install');
  expect(r.ok).toBe(false);
  expect(r.output).toContain('apt-get');
  expect(r.output).toContain('sudo apt install PACKAGE');
  expect(r.output).toContain('sudo apt-get install PACKAGE');
  expect(r.output).toContain('single command');
});
test.each(['apt install python3','apt-get install python3','sudo apt install python3','sudo apt-get install -y python3'])(
  '%s never installs or mutates the workspace',(command)=>{
    const sh=new WorkspaceShell(),before=[...sh.files];
    const r=sh.execute(command);
    expect(r.ok).toBe(false);expect(r.output).toContain('unavailable in this browser');
    expect(r.output).toContain('Nothing was installed');expect([...sh.files]).toEqual(before);
  });
test('missing package names are distinct from sandbox limitations and manuals remain usable',()=>{
  const sh=new WorkspaceShell();
  expect(sh.execute('sudo apt-get install').output).toContain('package name');
  const guide=sh.execute('man apt');expect(guide.ok).toBe(true);
  expect(guide.output).toContain('apt-get install PACKAGE');
  expect(guide.output).toContain('manpages.debian.org');
  expect(sh.execute('help').output).toContain('man apt');
  expect(sh.execute('which apt').output).toContain('not available');
});
test('sudo explains the boundary; rejected package commands cannot create redirected output',()=>{
  const sh=new WorkspaceShell();
  expect(sh.execute('sudo ls').output).toContain('privileges');
  expect(sh.execute('apt install python3 > installed.txt').ok).toBe(false);
  expect(sh.files.has('/home/visitor/installed.txt')).toBe(false);
  expect(sh.execute('echo still working').output).toBe('still working\n');
});
