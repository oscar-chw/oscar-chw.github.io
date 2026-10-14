// Browser-only workspace. No eval, process execution, network, or host filesystem access.
export const COMMANDS = ['help','man','pwd','ls','tree','cd','cat','head','tail','grep','sort','uniq','wc','echo','mkdir','touch','cp','mv','rm','rmdir','find','date','uname','whoami','which'];
const HOME = '/home/visitor', LIMIT = 65536;
const fail = (s) => { throw new Error(s); };
const lines = (s) => s ? s.replace(/\n$/, '').split('\n') : [];
const output = (xs) => xs.length ? xs.join('\n') + '\n' : '';
const APT_GUIDE = `APT syntax guide · for Debian/Ubuntu Linux\n\n  sudo apt install PACKAGE\n  sudo apt-get install PACKAGE\n  apt search QUERY\n  apt show PACKAGE\n\napt-get is a single command, including the hyphen. "apt get" is not its spelling.\nPackage management and elevated privileges are unavailable in this browser. Nothing was installed.\nUse help for executable browser commands, nano notes.txt to edit a file, or open data-workbench.\n\nReferences:\nhttps://manpages.debian.org/trixie/apt/apt.8.en.html\nhttps://manpages.debian.org/trixie/apt/apt-get.8.en.html\n`;

function tokens(text) {
  if (text.length > 4096) fail('Command exceeds the 4096 character limit.');
  const result=[]; let word='',quote='',started=false;
  const flush=()=>{if(started)result.push({kind:'word',value:word});word='';started=false;};
  for(let i=0;i<text.length;i++) {
    const c=text[i];
    if(quote) {
      if(c===quote)quote='';
      else if(c==='\\'&&quote==='"'&&['"','\\'].includes(text[i+1]))word+=text[++i];
      else word+=c;
    } else if(c==='"'||c==="'"){quote=c;started=true;}
    else if(c==='\\'){if(i+1===text.length)fail('Trailing escape.');word+=text[++i];started=true;}
    else if(/\s/.test(c))flush();
    else if(c==='|'||c==='>'){flush();let kind=c;if(c==='>'&&text[i+1]==='>'){kind='>>';i++;}result.push({kind,value:c});}
    else if(';;&`'.includes(c)||c==='$'||c==='('||c===')')fail('Shell expansion and command chaining are not supported here. Use one pipeline at a time.');
    else{word+=c;started=true;}
  }
  if(quote)fail('Unclosed quote.');flush();return result;
}

function glob(pattern,text) {
  let row=Array(text.length+1).fill(false);row[0]=true;
  for(const c of pattern){const next=Array(text.length+1).fill(false);next[0]=c==='*'&&row[0];for(let j=1;j<=text.length;j++)next[j]=c==='*'?(row[j]||next[j-1]):row[j-1]&&(c==='?'||c===text[j-1]);row=next;}
  return row[text.length];
}

export class WorkspaceShell {
  constructor(seed={}) {
    this.cwd=HOME;this.previous=HOME;this.files=new Map();this.dirs=new Set(['/','/home',HOME,'/tmp','/data','/lab','/projects']);
    this.addSource('/README.md','Welcome to Oscar’s browser workspace.\nExplore: ls /projects\nRead: cat /lab/versions.csv | head -n 4\nCreate: echo "an idea" > notes.txt\nInspect: cat notes.txt | wc -w\nOpen the editable data tool: open data-workbench\nFiles here are virtual; nothing runs on a server.\n');
    this.files.set(HOME+'/README.md', this.files.get('/README.md'));
    this.files.set(HOME+'/notes.txt', 'My research notes\nTry: nano notes.txt\n');
    for(const [path,text] of Object.entries(seed))this.addSource(path,String(text));
  }
  path(raw='.') {
    if(raw==='~')raw=HOME;else if(raw.startsWith('~/'))raw=HOME+raw.slice(1);
    const parts=(raw.startsWith('/')?raw:this.cwd+'/'+raw).split('/'),out=[];
    for(const p of parts){if(p==='..')out.pop();else if(p&&p!=='.')out.push(p);}
    return '/'+out.join('/');
  }
  addSource(raw,text) {
    const path=this.path(raw),parts=path.split('/');
    for(let i=1;i<parts.length;i++)this.dirs.add(parts.slice(0,i).join('/')||'/');
    this.files.set(path,text);
  }
  writable(path) {return path.startsWith(HOME+'/')||path.startsWith('/tmp/');}
  parent(path) {return path.slice(0,path.lastIndexOf('/'))||'/';}
  read(raw) {const p=this.path(raw);if(this.dirs.has(p))fail(`cat: ${raw}: Is a directory`);if(!this.files.has(p))fail(`${raw}: No such file`);return this.files.get(p);}
  write(raw,text,append=false) {
    const p=this.path(raw);if(!this.writable(p))fail(`${raw}: read-only source path; write under ~ or /tmp`);
    if(!this.dirs.has(this.parent(p)))fail(`${raw}: parent directory does not exist`);
    if(this.dirs.has(p))fail(`${raw}: Is a directory`);
    const content=(append?(this.files.get(p)||''):'')+text;
    if(new TextEncoder().encode(content).length>LIMIT)fail('File exceeds the 64 KB limit.');
    if(this.files.size+this.dirs.size>=256&&!this.files.has(p))fail('Workspace file limit reached.');
    if([...this.files].filter(([k])=>this.writable(k)).reduce((n,[k,v])=>n+(k===p?0:new TextEncoder().encode(v).length),0)+new TextEncoder().encode(content).length>256*1024)fail('Scratch storage limit reached.');
    this.files.set(p,content);
  }
  complete(line) {
    const at=line.lastIndexOf(' '),prefix=line.slice(at+1);
    if(at<0)return COMMANDS.filter(c=>c.startsWith(prefix)).map(c=>c+' ');
    const slash=prefix.lastIndexOf('/'),base=slash<0?'':prefix.slice(0,slash+1),stem=prefix.slice(slash+1),dir=this.path(base||'.');
    return [...this.dirs,...this.files.keys()].filter(p=>p!=='/'&&this.parent(p)===dir&&p.split('/').at(-1).startsWith(stem)).map(p=>line.slice(0,at+1)+base+p.split('/').at(-1)+(this.dirs.has(p)?'/':''));
  }
  execute(raw) {
    try {
      const ts=tokens(raw);if(!ts.length)return {ok:true,output:''};
      let redirect=null;const ix=ts.findIndex(t=>t.kind==='>'||t.kind==='>>');
      if(ix>=0){if(ix!==ts.length-2||ts[ix+1].kind!=='word')fail('Use > or >> followed by one filename at the end.');redirect={path:ts[ix+1].value,append:ts[ix].kind==='>>'};ts.splice(ix);}
      const commands=[[]];for(const t of ts){if(t.kind==='|')commands.push([]);else commands.at(-1).push(t.value);}
      if(commands.length>8||commands.some(c=>!c.length))fail('Use a non-empty pipeline of at most eight commands.');
      if(commands.length>1&&commands.some(c=>['cd','mkdir','touch','cp','mv','rm','rmdir'].includes(c[0])))fail('Filesystem changes cannot be piped; run them as separate commands.');
      let text='';for(const command of commands){text=this.command(command,text);if(new TextEncoder().encode(text).length>LIMIT)fail('Output exceeds 64 KB; narrow the input or use head.');}
      if(redirect){this.write(redirect.path,text,redirect.append);return {ok:true,output:`Saved ${this.path(redirect.path)}\n`};}
      return {ok:true,output:text};
    }catch(error){return {ok:false,output:(error instanceof Error?error.message:String(error))+'\n'};}
  }
  command([cmd,...args],input) {
    const usage=(s)=>fail(`usage: ${s}`);
    const exists=(p)=>this.files.has(p)||this.dirs.has(p);
    const source=(paths)=>paths.length?paths.map(p=>this.read(p)).join(''):input;
    if((cmd==='man'||cmd==='help')&&['apt','apt-get','packages'].includes(args[0]))return APT_GUIDE;
    if(cmd==='apt'||cmd==='apt-get'||cmd==='sudo') {
      const [name,...rest]=cmd==='sudo'?args:[cmd,...args];
      if(name==='apt'||name==='apt-get') {
        const words=rest.filter(s=>!s.startsWith('-'));
        const wrong=name==='apt'&&words[0]==='get';
        const missing=words[0]==='install'&&words.length===1;
        fail((wrong?'Syntax error: apt-get is a single command; use apt install or apt-get install.\n':missing?'Syntax error: install requires a package name.\n':'')+APT_GUIDE);
      }
      fail('sudo: elevated privileges are unavailable in this browser. No host command ran. Use supported commands without sudo; help lists them.');
    }
    if(cmd==='help'||cmd==='man')return `Browser workspace · commands run in your browser, never your computer’s shell\n${COMMANDS.join(' · ')}\nnano / edit · history · clear · open · guard\n\nTry:\n  cat /README.md\n  ls /projects\n  cat /lab/versions.csv | head -n 4\n  nano notes.txt\n  echo "my idea" > notes.txt\n  cat notes.txt | wc -w\n  mkdir -p research/drafts\n  open data-workbench /lab/versions.csv\n\nQuotes, |, > and >> work. grep matches literal text (-i/-v/-n).\nNo expansions, network, package installs or host programs.\nSource paths are read-only. Scratch files under ~ and /tmp last until this page closes.\nUse open NAME for pages; guard COMMAND for a real policy check.\nPackage syntax and limitations: man apt (or help packages).\n`;
    if(cmd==='pwd')return this.cwd+'\n';
    if(cmd==='cd'){if(args.length>1)usage('cd [directory]');const p=args[0]==='-'?this.previous:this.path(args[0]||HOME);if(!this.dirs.has(p))fail(`cd: ${args[0]}: No such directory`);this.previous=this.cwd;this.cwd=p;return '';}
    if(cmd==='date')return new Date().toISOString()+'\n';
    if(cmd==='uname')return 'Browser workspace (virtual POSIX-like filesystem, not a Linux kernel)\n';
    if(cmd==='whoami')return 'visitor · exploring Oscar’s workspace\n';
    if(cmd==='which')return output(args.map(c=>COMMANDS.includes(c)?`/bin/${c} (browser implementation)`:`${c}: not available`));
    if(cmd==='ls'||cmd==='tree'){
      const flags=args.filter(a=>a.startsWith('-'));if(flags.some(f=>!/^-[alh]+$/.test(f)))usage('ls [-alh] [path]');
      const paths=args.filter(a=>!a.startsWith('-'));if(paths.length>1)usage('ls [path]');const p=this.path(paths[0]||'.');if(!exists(p))fail(`ls: ${p}: No such path`);
      if(this.files.has(p))return p.split('/').at(-1)+'\n';
      const entries=[...this.dirs,...this.files.keys()].filter(k=>k!==p&&(cmd==='tree'?k.startsWith(p==='/'?'/':p+'/'):this.parent(k)===p)).sort();
      return output(entries.map(k=>{const name=cmd==='tree'?k.slice(p==='/'?1:p.length+1):k.split('/').at(-1);return (flags.some(f=>f.includes('l'))?(this.dirs.has(k)?'d':'-')+(this.writable(k)?'rw-':'r--')+'  ':'')+name+(this.dirs.has(k)?'/':'');}));
    }
    if(cmd==='cat')return source(args);
    if(cmd==='echo'){let newline=true,esc=false;while(args[0]==='-n'||args[0]==='-e'){const flag=args.shift();if(flag==='-n')newline=false;else esc=true;}let s=args.join(' ');if(esc)s=s.replaceAll('\\n','\n').replaceAll('\\t','\t');return s+(newline?'\n':'');}
    if(cmd==='head'||cmd==='tail'){
      let n=10;if(args[0]==='-n'){args.shift();n=Number(args.shift());if(!Number.isInteger(n)||n<0||n>2000)usage(`${cmd} -n [0..2000] [file]`);}
      const rows=lines(source(args));return output(cmd==='head'?rows.slice(0,n):n?rows.slice(-n):[]);
    }
    if(cmd==='grep'){
      let insensitive=false,invert=false,number=false;
      while(args[0]?.startsWith('-')&&args[0]!=='--'){const f=args.shift();if(!/^-[ivnF]+$/.test(f))usage('grep [-ivnF] text [file]');insensitive ||= f.includes('i');invert ||= f.includes('v');number ||= f.includes('n');}
      if(args[0]==='--')args.shift();const pattern=args.shift();if(pattern===undefined)usage('grep [-ivn] text [file]');
      return output(lines(source(args)).flatMap((line,i)=>{const match=(insensitive?line.toLowerCase():line).includes(insensitive?pattern.toLowerCase():pattern);return match!==invert?[(number?`${i+1}:`:'')+line]:[];}));
    }
    if(cmd==='sort'){let numeric=false,reverse=false;while(args[0]?.startsWith('-')){const f=args.shift();if(!/^-[nr]+$/.test(f))usage('sort [-nr] [file]');numeric ||= f.includes('n');reverse ||= f.includes('r');}const rows=lines(source(args));rows.sort((a,b)=>numeric?(parseFloat(a)||0)-(parseFloat(b)||0):a<b?-1:a>b?1:0);if(reverse)rows.reverse();return output(rows);}
    if(cmd==='uniq'){const count=args[0]==='-c';if(count)args.shift();const groups=[];for(const line of lines(source(args))){if(groups.at(-1)?.line===line)groups.at(-1).n++;else groups.push({line,n:1});}return output(groups.map(x=>(count?x.n+' ':'')+x.line));}
    if(cmd==='wc'){const flag=args[0]?.startsWith('-')?args.shift():'';if(flag&&!/^-[lwc]+$/.test(flag))usage('wc [-lwc] [file]');const s=source(args),values={l:(s.match(/\n/g)||[]).length,w:s.trim()?s.trim().split(/\s+/).length:0,c:new TextEncoder().encode(s).length};return (flag?[...flag.slice(1)].map(k=>values[k]):[values.l,values.w,values.c]).join(' ')+'\n';}
    if(cmd==='mkdir'){
      const parents=args[0]==='-p';if(parents)args.shift();if(!args.length)usage('mkdir [-p] directory');
      for(const raw of args){const p=this.path(raw);if(!this.writable(p))fail(`${raw}: read-only directory`);if(this.files.has(p))fail(`${raw}: File exists`);if(!parents&&!this.dirs.has(this.parent(p)))fail(`${raw}: parent directory does not exist`);
        const paths=parents?p.split('/').slice(1).map((_,i)=>'/'+p.split('/').slice(1,i+2).join('/')):[p];
        for(const part of paths){if(this.files.has(part))fail(`${part}: Not a directory`);if(this.dirs.size+this.files.size>=256&&!this.dirs.has(part))fail('Workspace file limit reached.');this.dirs.add(part);}
      }return '';
    }
    if(cmd==='touch'){if(!args.length)usage('touch file');for(const p of args)this.write(p,this.files.get(this.path(p))||'');return '';}
    if(cmd==='cp'||cmd==='mv'){
      if(args.length!==2||args.some(a=>a.startsWith('-')))usage(`${cmd} source-file destination`);
      const [src,dst]=args,a=this.path(src),b=this.path(dst);if(cmd==='mv'&&!this.writable(a))fail(`${src}: read-only source`);const dest=this.dirs.has(b)?b+'/'+a.split('/').at(-1):b;
      const text=this.read(src);if(a===dest)return '';this.write(dest,text);if(cmd==='mv')this.files.delete(a);return '';
    }
    if(cmd==='rm'||cmd==='rmdir'){
      if(cmd==='rmdir'&&args.some(a=>a.startsWith('-')))usage('rmdir empty-directory');
      let recursive=false,force=false;while(args[0]?.startsWith('-')){const f=args.shift();if(!/^-[rf]+$/.test(f))usage('rm [-rf] path');recursive ||= f.includes('r');force ||= f.includes('f');}
      if(!args.length)usage(`${cmd} path`);
      for(const raw of args){const p=this.path(raw);if(this.dirs.has(p)&&cmd==='rm'&&!recursive)fail(`rm: ${raw}: Is a directory`);if(!this.writable(p))fail(`${raw}: read-only source path`);if(!exists(p)){if(force)continue;fail(`${raw}: No such path`);}
        const children=[...this.files.keys(),...this.dirs].filter(k=>k.startsWith(p+'/'));if(this.dirs.has(p)&&children.length&&!recursive)fail(`${raw}: Directory not empty`);if(cmd==='rmdir'&&this.files.has(p))fail(`${raw}: Not a directory`);
        for(const k of [p,...children]){this.files.delete(k);this.dirs.delete(k);}if(this.cwd===p||this.cwd.startsWith(p+'/'))this.cwd=HOME;
      }return '';
    }
    if(cmd==='find'){const raw=args[0]&&!args[0].startsWith('-')?args.shift():'.',p=this.path(raw);if(!exists(p))fail(`${raw}: No such path`);let pattern='*';if(args.length){if(args[0]!=='-name'||args.length!==2)usage('find [path] [-name pattern]');pattern=args[1];}return output([...this.dirs,...this.files.keys()].filter(k=>(k===p||k.startsWith(p==='/'?'/':p+'/'))&&glob(pattern,k.split('/').at(-1))).sort());}
    fail(`${cmd}: command not found · try help`);
  }
}
