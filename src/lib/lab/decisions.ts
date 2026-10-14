import {MAX_INPUT_BYTES} from './records';
import {maskedSoftmax} from './policy';
import {calibrate,evaluate,type Action} from './gate';

export interface Move {action:string;score:number;legal:boolean}
const names=['attack','attach energy','retreat','evolve','play supporter','use ability','bench a card','end turn'];
const scores=[2.4,1.1,-0.4,1.9,1.5,0.6,0.2,-1.2];
export const MOVE_TEMPLATE=JSON.stringify(names.map((action,i)=>({action,score:scores[i],legal:i!==2&&i!==4})),null,2);
export interface RiskCases {calibration:Action[];evaluation:Action[]}
export const RISK_TEMPLATE=JSON.stringify({calibration:[{risk:0.1,breaks:false},{risk:0.2,breaks:false},{risk:0.4,breaks:true},{risk:0.7,breaks:false},{risk:0.9,breaks:true}],evaluation:[{risk:0.15,breaks:false},{risk:0.3,breaks:true},{risk:0.5,breaks:false},{risk:0.8,breaks:true}]},null,2);
function json(text:string):unknown{
  if(new TextEncoder().encode(text).length>MAX_INPUT_BYTES)throw new Error('Use at most 64 KB of input.');
  try{return JSON.parse(text);}catch(error){if(error instanceof SyntaxError)throw new Error('Invalid JSON: '+error.message);throw error;}
}
function object(value:unknown,where:string):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${where} must be an object.`);
  return value as Record<string,unknown>;
}
export function parseMoves(text:string):Move[]{
  const data=json(text);if(!Array.isArray(data)||data.length<1||data.length>32)throw new Error('Supply between 1 and 32 action records.');
  const seen=new Set<string>();
  return data.map((value,i)=>{
    const r=object(value,`Action ${i+1}`);
    if(typeof r.action!=='string'||!r.action.trim()||r.action.length>60)throw new Error(`Action ${i+1}: action must be a name of at most 60 characters.`);
    const action=r.action.trim();if(seen.has(action))throw new Error(`Action ${i+1}: duplicate action name ${action}.`);seen.add(action);
    if(typeof r.score!=='number'||!Number.isFinite(r.score)||Math.abs(r.score)>1000)throw new Error(`Action ${i+1}: score must be a finite number from -1000 to 1000.`);
    if(typeof r.legal!=='boolean')throw new Error(`Action ${i+1}: legal must be true or false.`);
    if(Object.keys(r).some(k=>!['action','score','legal'].includes(k)))throw new Error(`Action ${i+1}: use only action, score and legal fields.`);
    return {action,score:r.score,legal:r.legal};
  });
}
export function scoreMoves(rows:Move[],temperature:number){
  if(!Number.isFinite(temperature)||temperature<0.2||temperature>3)throw new Error('Temperature must be from 0.2 to 3.');
  const p=maskedSoftmax(rows.map(r=>r.score),rows.map(r=>r.legal),temperature),best=p.some(x=>x>0)?p.indexOf(Math.max(...p)):-1;
  return {temperature,moves:rows.map((r,i)=>({...r,probability:p[i]})),totalProbability:p.reduce((a,b)=>a+b,0),best:best<0?null:rows[best].action};
}
export function parseRiskCases(text:string):RiskCases{
  const input=object(json(text),'Input');
  if(Object.keys(input).some(k=>!['calibration','evaluation'].includes(k)))throw new Error('Use only calibration and evaluation datasets.');
  const parse=(key:string):Action[]=>{
    const xs=input[key];if(!Array.isArray(xs)||xs.length<1||xs.length>600)throw new Error(`${key}: supply 1 to 600 labelled actions.`);
    return xs.map((value,i)=>{
      const r=object(value,`${key}[${i}]`);
      if(typeof r.risk!=='number'||!Number.isFinite(r.risk)||r.risk<0||r.risk>1)throw new Error(`${key}[${i}].risk must be a number from 0 to 1.`);
      if(typeof r.breaks!=='boolean')throw new Error(`${key}[${i}].breaks must be true or false.`);
      if(Object.keys(r).some(k=>!['risk','breaks'].includes(k)))throw new Error(`${key}[${i}]: use only risk and breaks fields.`);
      return {risk:r.risk,breaks:r.breaks};
    });
  };return {calibration:parse('calibration'),evaluation:parse('evaluation')};
}
export function evaluateRiskCases(data:RiskCases,target:number,noGate=false){
  if(!Number.isFinite(target)||target<0||target>1)throw new Error('Target violation fraction must be from 0 to 1.');
  const threshold=noGate?1+Number.EPSILON:calibrate(data.calibration,target);
  return {threshold,target,calibration:evaluate(data.calibration,threshold),evaluation:evaluate(data.evaluation,threshold),method:'Empirical threshold fitted on calibration labels; not a conformal guarantee or a bound on future risk.'};
}
