import kelly from '../../sources/crypto-desk-blueprint/EXP-06-1-2d82aed.json';
import validation from '../../sources/crypto-desk-blueprint/EXP-08-1-2d82aed.json';
import funding from '../../sources/crypto-desk-blueprint/EXP-04-1-2d82aed.json';
export type Study='validation'|'kelly'|'funding';
export const STUDIES:Record<Study,{title:string;variants:string[]}>={validation:{title:'Validation on noise',variants:['shuffled','contiguous']},kelly:{title:'Sizing with an uncertain edge',variants:['true','estimated','overestimated']},funding:{title:'Funding and futures basis',variants:['btc','eth']}};
export function recordedSelection(study:Study,variant:string){
  if(!STUDIES[study]?.variants.includes(variant))throw new Error('Choose an available recorded study and assumption.');
  const source={repo:'oscar-chw/crypto-desk-blueprint',commit:'2d82aed',url:'https://github.com/oscar-chw/crypto-desk-blueprint/tree/2d82aed/results'};
  let metrics:{name:string;values:{label:string;value:number}[]}[],insight:string,raw:unknown,id:string;
  let paths:{label:string;values:number[]}[]=[];
  if(study==='kelly'){
    const key=variant as 'true'|'estimated'|'overestimated',t=kelly.treatment[key],c=kelly.control[key];id=kelly.id;raw=kelly;
    metrics=[{name:'median log growth per period',values:[{label:'full Kelly',value:c.median_log_growth},{label:'half Kelly',value:t.median_log_growth}]},{name:'95th-percentile maximum drawdown',values:[{label:'full Kelly',value:c.max_dd_p95},{label:'half Kelly',value:t.max_dd_p95}]},{name:'mean leverage',values:[{label:'full Kelly',value:c.mean_leverage},{label:'half Kelly',value:t.mean_leverage}]}];
    insight=`Recorded edge assumption: ${variant}. Compare growth, drawdown and leverage separately; this is a synthetic archived experiment, not a sizing recommendation.`;
    if(key==='true')paths=[{label:'full Kelly drawdown quantiles',values:kelly.series.max_dd_full},{label:'half Kelly drawdown quantiles',values:kelly.series.max_dd_half}];
  }else if(study==='validation'){
    const t=variant==='shuffled'?validation.treatment:validation.treatment.contiguous_unpurged;id=validation.id;raw=validation;
    metrics=[{name:'out-of-fold accuracy',values:[{label:variant,value:t.accuracy},{label:'purged + embargo',value:validation.control.accuracy}]},{name:'reported standard error',values:[{label:variant,value:t.se},{label:'purged + embargo',value:validation.control.se}]}];
    paths=[{label:variant,values:variant==='shuffled'?validation.series.plain_shuffled:validation.series.contiguous_unpurged},{label:'purged + embargo',values:validation.series.purged_embargo}];
    insight=variant==='shuffled'?'The recorded shuffled split reports apparent skill on unpredictable labels. Compare the contiguous case before attributing the difference to purging.':'The contiguous and purged results are close in this recorded setup; it does not establish a measurable benefit from purging here.';
  }else{
    const key=variant as 'btc'|'eth',t=funding.treatment[key],c=funding.control[key];id=funding.id;raw=funding;
    metrics=[{name:'correlation',values:[{label:'aligned',value:t.corr},{label:'random-shift mean',value:c.corr_mean},{label:'random-shift 95th percentile',value:c.corr_p95}]}];
    insight=`Recorded ${variant.toUpperCase()} observations from the stated historical period. The shifted control tests alignment; correlation does not establish a profitable trade.`;
  }
  return {recorded:true,study,variant,id,source,metrics,paths,insight,raw};
}
