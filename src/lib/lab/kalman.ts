// A SYNTHETIC drift-gate toy, after the idea in the IMC Prosperity 4 write-up: a Kalman filter that
// tracks a fair value's level and slope replaced a fixed-window drift gate, so a drift signal is
// used only when its slope is clearly away from zero. Not the competition code (it is unpublished).
//
// The market drifts (down) only inside [DRIFT_FROM, DRIFT_TO); everywhere else any drift call is false.
// The fixed-window gate fits a line to the last WINDOW mids and fires on a fixed slope threshold,
// which noise alone crosses more and more often. The Kalman gate fires only when the slope estimate
// is several of its own standard errors from zero, so its threshold widens with the noise.
import { rng, gauss } from "./series";

export const STEPS = 360, DRIFT_FROM = 150, DRIFT_TO = 240, DRIFT = -0.06, WINDOW = 20, FIXED = 0.03, Z = 3;

export interface DriftRun { fair: number[]; mid: number[]; level: number[]; fixed: boolean[]; kalman: boolean[] }
export interface GateScore { falseCalls: number; caught: number }

export const drifting = (t: number) => t >= DRIFT_FROM && t < DRIFT_TO;

export interface FilterDetail {innovation:number;gain:number;slope:number;slopeStd:number}
export function filterObservations(mid:number[],noise:number,initial=mid[0]){
  if(!mid.length||mid.some(x=>!Number.isFinite(x))||!Number.isFinite(noise)||noise<=0)throw new Error('Supply finite observations and a positive measurement-noise scale.');
  const out:{level:number[];fixed:boolean[];kalman:boolean[];details:FilterDetail[]}={level:[],fixed:[],kalman:[],details:[]};
  let l=initial,b=0,P=[[1,0],[0,0.01]];
  const ql=0.02**2,qb=0.003**2,R=noise**2;
  for(let t=0;t<mid.length;t++){
    const w=mid.slice(Math.max(0,t-WINDOW+1),t+1),n=w.length,xm=(n-1)/2,ym=w.reduce((a,v)=>a+v,0)/n;
    let sxy=0,sxx=0;w.forEach((v,i)=>{sxy+=(i-xm)*(v-ym);sxx+=(i-xm)**2;});
    out.fixed.push(n===WINDOW&&Math.abs(sxy/sxx)>FIXED);
    l+=b;
    P=[[P[0][0]+2*P[0][1]+P[1][1]+ql,P[0][1]+P[1][1]],[P[0][1]+P[1][1],P[1][1]+qb]];
    const S=P[0][0]+R,k0=P[0][0]/S,k1=P[1][0]/S,e=mid[t]-l;
    l+=k0*e;b+=k1*e;
    P=[[(1-k0)*P[0][0],(1-k0)*P[0][1]],[P[1][0]-k1*P[0][0],P[1][1]-k1*P[0][1]]];
    const slopeStd=Math.sqrt(P[1][1]);out.level.push(l);out.kalman.push(t>=WINDOW&&Math.abs(b)>Z*slopeStd);out.details.push({innovation:e,gain:k0,slope:b,slopeStd});
  }
  return out;
}
export function run(noise:number,seed=1):DriftRun{
  const r=rng(seed),fair:number[]=[],mid:number[]=[];let value=100;
  for(let t=0;t<STEPS;t++){value+=(drifting(t)?DRIFT:0)+0.02*gauss(r);fair.push(value);mid.push(value+noise*gauss(r));}
  const out=filterObservations(mid,noise,100);return {fair,mid,level:out.level,fixed:out.fixed,kalman:out.kalman};
}

/** Share of driftless steps where the gate fired, and share of drifting steps it caught. */
export function score(fires: boolean[]): GateScore {
  let f = 0, nf = 0, c = 0, nc = 0;
  fires.forEach((x, t) => { if (t < WINDOW) return; if (drifting(t)) { nc++; if (x) c++; } else { nf++; if (x) f++; } });
  return { falseCalls: f / nf, caught: c / nc };
}
