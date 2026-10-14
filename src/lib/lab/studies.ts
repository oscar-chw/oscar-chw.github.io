import {numericRecords,bounded} from './records';
import {momentum,reversal,meanIC,noise,SPLITS,type Panel} from './factors';
export interface Candidate {window:number;direction:number}
export const CANDIDATE_TEMPLATE='window,direction\n5,1\n20,1\n60,1\n5,-1\n';
export function parseCandidates(text:string):Candidate[]{
  const seen=new Set<string>();
  return numericRecords(text,['window','direction'],8).map(({line,values:[window,direction]})=>{
    bounded(window,1,60,line,'window',true);if(direction!==1&&direction!==-1)throw new Error(`Line ${line}: direction must be 1 (momentum) or -1 (reversal).`);
    const key=`${window}/${direction}`;if(seen.has(key))throw new Error(`Line ${line}: duplicate candidate.`);seen.add(key);return {window,direction};
  });
}
export const candidateSignal=(c:Candidate)=>c.direction===1?momentum(c.window):reversal(c.window);
export const candidateName=(c:Candidate)=>`${c.direction===1?'momentum':'reversal'} ${c.window}d`;
export function factorStudy(p:Panel,candidates:Candidate[],openTest=false){
  const rows=candidates.map(c=>({name:candidateName(c),train:meanIC(p,candidateSignal(c),...SPLITS.train),validation:meanIC(p,candidateSignal(c),...SPLITS.valid),test:null as number|null}));
  const chosen=rows.reduce((best,r,i)=>r.validation>rows[best].validation?i:best,0);
  if(openTest)rows[chosen].test=meanIC(p,candidateSignal(candidates[chosen]),...SPLITS.test);
  return {rows,chosen};
}
export function noiseSearch(p:Panel,seed:number,count:number){
  if(!Number.isSafeInteger(seed)||seed<1||seed>1e6)throw new Error('Candidate seed offset must be an integer from 1 to 1000000.');
  if(!Number.isInteger(count)||count<1||count>60)throw new Error('Search between 1 and 60 candidates.');
  const rows=Array.from({length:count},(_,i)=>({seed:seed+i,train:meanIC(p,noise(seed+i),...SPLITS.train)}));
  const chosen=rows.reduce((best,r,i)=>r.train>rows[best].train?i:best,0);
  return {rows,chosen,test:meanIC(p,noise(rows[chosen].seed),...SPLITS.test)};
}
