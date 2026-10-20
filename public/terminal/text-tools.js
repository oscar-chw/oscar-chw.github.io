// Bounded text utilities: process only the supplied strings and virtual files.
export const MANUALS = {
  pwd: ['pwd', 'Print the current virtual directory.'],
  cd: ['cd [directory]', 'Move to a virtual directory; ~ is home, .. is its parent, - returns to the last directory. Use open NAME for site pages.'],
  ls: ['ls [-alh] [path]', 'List virtual files. -l shows read/write access; -a includes dotfiles.'],
  tree: ['tree [path]', 'List every descendant path. Source directories are read-only.'],
  cat: ['cat [file ...]', 'Concatenate files, or pass piped text through unchanged.'],
  head: ['head [-n count] [file]', 'Read the first lines. Default: ten.'],
  tail: ['tail [-n count] [file]', 'Read the last lines. Default: ten.'],
  grep: ['grep [-ivnF] text [file]', 'Filter literal text: ignore case (-i), invert (-v), line numbers (-n). No regular expressions.'],
  sort: ['sort [-nr] [file]', 'Sort lines numerically (-n) or reverse the order (-r).'],
  uniq: ['uniq [-c] [file]', 'Collapse adjacent duplicates; -c counts them. Sort first to group separated duplicates.'],
  wc: ['wc [-lwc] [file]', 'Count newline characters, words and UTF-8 bytes.'],
  echo: ['echo [-n] [-e] text', 'Write text; -n omits the newline, -e recognizes \\n and \\t.'],
  mkdir: ['mkdir [-p] directory ...', 'Create scratch directories. -p creates missing parents.'],
  touch: ['touch file ...', 'Create empty files; existing content is preserved.'],
  cp: ['cp source-file destination', 'Copy a virtual file into scratch space. Directory recursion is not implemented.'],
  mv: ['mv source-file destination', 'Move or rename a scratch file. Source paths remain read-only.'],
  rm: ['rm [-rf] path ...', 'Remove scratch files; -r also removes directories. Recursive removal is checked by the real policy guard in the console.'],
  rmdir: ['rmdir empty-directory', 'Remove an empty scratch directory.'],
  find: ['find [path] [-name pattern]', 'Find virtual paths; quoted * and ? patterns match filenames.'],
  date: ['date', 'Show the current UTC date and time.'],
  uname: ['uname', 'Identify the browser workspace; there is no Linux kernel.'],
  whoami: ['whoami', 'In the site console, show Oscar’s introduction. The virtual file user is visitor.'],
  which: ['which command ...', 'Find commands implemented by this browser workspace.'],
  printf: ['printf FORMAT [value ...]', 'Supports %s, %d, %%, \\n and \\t. Repeats the format for additional values.'],
  cut: ['cut -d DELIMITER -f FIELDS [file]', 'Select delimited fields (one-based): -f 1,3 or -f 2-4. Default delimiter is a tab. Lines without the delimiter pass through. No CSV quote parsing.'],
  tr: ['tr [-d|-s] SET1 [SET2]', 'Translate piped characters; -d deletes, -s squeezes repeats. ASCII ranges such as a-z are supported; no complement or character classes.'],
  seq: ['seq [FIRST [STEP]] LAST', 'Generate up to 2,000 integers; STEP must be nonzero.'],
  paste: ['paste -s [-d DELIMITER] [file]', 'Join lines using one delimiter (tab by default). This workspace supports serial mode only.'],
  diff: ['diff file-a file-b', 'Show changed lines at their original positions. Exit 0 means identical; 1 means different. This bounded comparison is not a minimal edit script.'],
  basename: ['basename path [suffix]', 'Print the final path component; optionally remove a matching suffix.'],
  dirname: ['dirname path', 'Print the containing directory.'],
  stat: ['stat file', 'Inspect the virtual path, type, access and UTF-8 byte length. No invented timestamps.'],
  du: ['du [path]', 'Total UTF-8 bytes in files under a virtual path, not disk allocation.'],
  neofetch: ['neofetch', 'Meet the workspace owl and inspect your actual current directory and scratch usage.'],
  nano: ['nano [file]', 'Open the browser text editor. Save with Ctrl+S or Command+S; Escape cancels. This is a browser editor, not GNU nano.'],
  edit: ['edit [file]', 'Open the browser text editor. Files under ~ and /tmp are writable.'],
  download: ['download file', 'Download the current bytes of a virtual file to keep them outside this tab.'],
  open: ['open NAME [file]', 'Open a page or Lab experiment. open data-workbench file.csv loads a virtual CSV into the version-records workbench.'],
  history: ['history', 'Show recent commands in this tab. Up and Down recall commands and restore your draft.'],
  guard: ['guard COMMAND', 'Run the public Python policy checker. A policy verdict never means the command was executed.'],
};
export const EXTRA_COMMANDS = ['printf','cut','tr','seq','paste','diff','basename','dirname','stat','du','neofetch'];
const fail = message => { throw new Error(message); };
const rows = text => text ? text.replace(/\n$/, '').split('\n') : [];
const join = parts => parts.length ? parts.join('\n')+'\n' : '';
const bytes = text => new TextEncoder().encode(text).length;
function charset(text) {
  text=text.replaceAll('\\n','\n').replaceAll('\\t','\t');
  const chars=[...text],result=[];
  for(let i=0;i<chars.length;i++){
    if(chars[i+1]==='-'&&chars[i+2]){
      const a=chars[i].codePointAt(0),b=chars[i+2].codePointAt(0);
      if(a>127||b>127||b<a)fail('tr: only ascending ASCII ranges are supported');
      for(let c=a;c<=b;c++)result.push(String.fromCharCode(c));i+=2;
    }else result.push(chars[i]);
  }
  return result;
}
export function textTool(cmd,args,input,sh) {
  const usage=()=>fail(`usage: ${MANUALS[cmd][0]}`);
  const source=paths=>paths.length?paths.map(p=>sh.read(p)).join(''):input;
  if(cmd==='printf'){
    if(!args.length)usage();const format=args.shift();
    if(/%(?![%sd])/.test(format)||/\\(?![nt\\])/.test(format))usage();
    const fields=(format.match(/%[%sd]/g)||[]).filter(x=>x!=='%%').length;
    let at=0,result='';
    do {
      result+=format.replace(/%[%sd]|\\[nt\\]/g,token=>{
        if(token==='%%')return '%';if(token==='\\n')return '\n';if(token==='\\t')return '\t';if(token==='\\\\')return '\\';
        const value=args[at++]??'';if(token==='%s')return value;
        if(value&&!/^[+-]?\d+$/.test(value))fail('printf: %d requires an integer');
        const n=Number(value);if(!Number.isSafeInteger(n))fail('printf: integer out of range');return String(n);
      });
      if(bytes(result)>65536)fail('Output exceeds 64 KB.');
    }while(fields&&at<args.length);
    return result;
  }
  if(cmd==='cut'){
    let delimiter='\t',fields;
    while(args[0]?.startsWith('-')){const flag=args.shift();if(!args.length)usage();if(flag==='-d')delimiter=args.shift();else if(flag==='-f')fields=args.shift();else usage();}
    if([...delimiter].length!==1||!fields||!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(fields))usage();
    const selected=new Set();for(const part of fields.split(',')){const [lo,hi=lo]=part.split('-').map(Number);if(lo<1||hi<lo||hi>2000)usage();for(let n=lo;n<=hi;n++)selected.add(n-1);}
    return join(rows(source(args)).map(line=>line.includes(delimiter)?line.split(delimiter).filter((_,i)=>selected.has(i)).join(delimiter):line));
  }
  if(cmd==='tr'){
    const mode=args[0]?.startsWith('-')?args.shift():'';
    if(!['','-d','-s'].includes(mode)||(mode?args.length!==1:args.length!==2))usage();
    const a=charset(args[0]),b=mode?[]:charset(args[1]);if(!a.length||(!mode&&!b.length))usage();
    let result='',last='';for(const char of input){const i=a.indexOf(char);if(mode==='-d'&&i>=0)continue;if(mode==='-s'&&i>=0&&char===last)continue;const next=mode||i<0?char:b[Math.min(i,b.length-1)];result+=next;last=next;}return result;
  }
  if(cmd==='seq'){
    if(args.length<1||args.length>3||args.some(s=>!/^[-+]?\d+$/.test(s)))usage();
    const nums=args.map(Number),first=args.length===1?1:nums[0],step=args.length===3?nums[1]:1,last=nums.at(-1);
    if(nums.some(n=>!Number.isSafeInteger(n))||!step)usage();
    const count=Math.floor((last-first)/step)+1;if(count>2000)fail('seq: at most 2,000 integers');
    return join(Array.from({length:Math.max(0,count)},(_,i)=>String(first+i*step)));
  }
  if(cmd==='paste'){
    if(args.shift()!=='-s')usage();let delimiter='\t';if(args[0]==='-d'){args.shift();delimiter=args.shift();}
    if(typeof delimiter!=='string'||[...delimiter].length!==1)usage();const values=rows(source(args));return values.length?values.join(delimiter)+'\n':'';
  }
  if(cmd==='diff'){
    if(args.length!==2)usage();const a=sh.read(args[0]),b=sh.read(args[1]);if(a===b)return '';
    const left=rows(a),right=rows(b),changes=[];for(let i=0;i<Math.max(left.length,right.length);i++)if(left[i]!==right[i]){changes.push(`line ${i+1}`);if(i<left.length)changes.push('< '+left[i]);if(i<right.length)changes.push('> '+right[i]);}
    if(a.endsWith('\n')!==b.endsWith('\n'))changes.push('Final newline differs.');
    const error=new Error(join(changes));error.code=1;throw error;
  }
  if(cmd==='basename'||cmd==='dirname'){
    if(!args.length||args.length>(cmd==='basename'?2:1))usage();const path=args[0].replace(/\/+$/,'')||'/';
    if(cmd==='dirname'){const i=path.lastIndexOf('/');return (i<0?'.':path.slice(0,i)||'/')+'\n';}
    let name=path==='/'?'/':path.split('/').at(-1);if(args[1]&&name!==args[1]&&name.endsWith(args[1]))name=name.slice(0,-args[1].length);return name+'\n';
  }
  if(cmd==='stat'||cmd==='du'){
    if(args.length>1||(cmd==='stat'&&!args.length))usage();const p=sh.path(args[0]||'.');
    if(!sh.files.has(p)&&!sh.dirs.has(p))fail(`${p}: No such path`);
    if(cmd==='stat')return `${p}\n${sh.dirs.has(p)?'directory':`${bytes(sh.read(p))} bytes · UTF-8 text`}\n${sh.writable(p)?'scratch · writable':'source · read-only'}\n`;
    const size=[...sh.files].filter(([path])=>path===p||path.startsWith(p==='/'?'/':p+'/')).reduce((sum,[,text])=>sum+bytes(text),0);return `${size} bytes\t${p}\n`;
  }
  if(cmd==='neofetch'){
    if(args.length)usage();const scratch=[...sh.files].filter(([p])=>sh.writable(p));
    return `  ,_,     visitor@oscar\n (o,o)    Browser workspace\n /)_)     ${sh.cwd}\n  " "     ${scratch.length} scratch files · ${scratch.reduce((n,[,t])=>n+bytes(t),0)} bytes\n\nMake something here. Try: man cut\nThe console saves files in this tab when session storage is available. Download to keep a copy.\n`;
  }
  return null;
}
