// A deterministic read/commit state machine, not operating-system threads or private platform code.
import {rng} from './series';
export type Mode='last write wins'|'compare-and-swap';
export interface Step {writer:number;kind:'read'|'commit'|'lost'|'retry';before:number;after:number;versionBefore:number;versionAfter:number;observed:number;observedVersion:number}
export interface Race {expected:number;final:number;lost:number;retries:number;steps:Step[]}
export class RaceMachine {
  value=0;version=0;retries=0;steps:Step[]=[];
  private held:({value:number;version:number}|null)[];
  constructor(writers:number,readonly mode:Mode){if(!Number.isInteger(writers)||writers<1||writers>12)throw new Error('Use 1 to 12 writers.');this.held=Array(writers).fill(null);}
  step(writer:number):Step{
    if(!Number.isInteger(writer)||writer<0||writer>=this.held.length)throw new Error('Choose an existing writer.');
    const before=this.value,versionBefore=this.version,held=this.held[writer];let kind:Step['kind'];
    if(!held){this.held[writer]={value:before,version:versionBefore};kind='read';}
    else if(this.mode==='compare-and-swap'&&held.version!==versionBefore){this.held[writer]=null;this.retries++;kind='retry';}
    else{kind=held!.version!==versionBefore?'lost':'commit';this.value=held!.value+1;this.version++;this.held[writer]=null;}
    const step={writer,kind,before,after:this.value,versionBefore,versionAfter:this.version,observed:held?.value??before,observedVersion:held?.version??versionBefore};this.steps.push(step);return step;
  }
}
export function race(seed:number,writers:number,each:number,mode:Mode):Race{
  const r=rng(seed),machine=new RaceMachine(writers,mode),left=Array(writers).fill(each);
  while(left.some(n=>n>0)){
    const live=left.map((n,w)=>n>0?w:-1).filter(w=>w>=0),writer=live[Math.floor(r()*live.length)],step=machine.step(writer);
    if(step.kind==='commit'||step.kind==='lost')left[writer]--;
  }
  return {expected:writers*each,final:machine.value,lost:writers*each-machine.value,retries:machine.retries,steps:machine.steps};
}
