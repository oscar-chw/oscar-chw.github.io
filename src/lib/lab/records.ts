export const MAX_INPUT_BYTES=64*1024;
export interface NumericRow {line:number; values:number[]}

/** Strict numeric CSV. Physical line numbers survive blank lines and CRLF. */
export function numericRecords(text:string,header:string[],maxRows=600):NumericRow[]{
  if(new TextEncoder().encode(text).length>MAX_INPUT_BYTES)throw new Error('Use at most 64 KB of input.');
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map((text,i)=>({text,line:i+1})).filter(r=>r.text.trim());
  if(lines.shift()?.text.split(',').map(x=>x.trim()).join(',')!==header.join(','))throw new Error(`Use the header ${header.join(',')}.`);
  if(!lines.length)throw new Error('Add at least one record below the header.');
  if(lines.length>maxRows)throw new Error(`Use at most ${maxRows} records.`);
  return lines.map(({text,line})=>{
    const cells=text.split(',').map(x=>x.trim());
    if(cells.length!==header.length)throw new Error(`Line ${line}: expected ${header.length} columns (${header.join(', ')}).`);
    const values=cells.map((cell,i)=>{
      if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(cell)||!Number.isFinite(Number(cell)))throw new Error(`Line ${line}: ${header[i]} must be a finite decimal number.`);
      return Number(cell);
    });
    return {line,values};
  });
}
export function bounded(value:number,min:number,max:number,line:number,field:string,integer=false){
  if(value<min||value>max||(integer&&!Number.isSafeInteger(value)))throw new Error(`Line ${line}: ${field} must be ${integer?'an integer':'a number'} from ${min} to ${max}.`);
  return value;
}
