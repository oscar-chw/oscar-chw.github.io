import {parseMoves,scoreMoves,MOVE_TEMPLATE,type Move} from '../../../lib/lab/decisions';
import {recordsEditor,recordTable} from '../records-editor';
import {h,slider,button} from '../ui';

export function mount(stage:HTMLElement,controls:HTMLElement){
  let temp=1;
  const result=h('div',{});
  const dirty=()=>result.replaceChildren(h('p',{class:'lab-note'},'No policy for the current input. Compute the edited scores.'));
  function draw(rows:Move[]){
    const out=scoreMoves(rows,temp),cards=h('div',{class:'cards'});
    for(const [i,r] of out.moves.entries()){
      const b=h('button',{type:'button',class:`card${r.legal?'':' illegal'}${r.action===out.best?' best':''}`,'aria-pressed':String(r.legal),'aria-label':`${r.action}: ${r.legal?'legal':'illegal'}, probability ${(r.probability*100).toFixed(0)}%`},
        h('span',{class:'nm'},r.action),h('span',{class:'mono sc'},`score ${r.score}`),h('i',{style:`--p:${r.probability}`}),h('b',{class:'mono'},r.legal?`${(r.probability*100).toFixed(0)}%`:'masked'));
      b.addEventListener('click',()=>{const next=rows.map((r,k)=>({...r,legal:k===i?!r.legal:r.legal}));editor.setText(JSON.stringify(next,null,2));editor.run();result.querySelectorAll<HTMLButtonElement>('.card')[i]?.focus();});cards.append(b);
    }
    result.replaceChildren(h('p',{class:'policy-state lab-result',role:'status'},out.best===null?'No legal moves · abstain. No action can be selected.':`Highest probability: ${out.best}. Total probability across legal moves: ${out.totalProbability.toFixed(6)}.`),cards,
      h('p',{class:'lab-note'},'Click a move to change its legality in the visible input. The softmax removes illegal moves before normalization; their scores cannot steal probability from legal moves. These supplied scores are not predictions from a trained model.'),
      h('details',{class:'we-ledger'},h('summary',{},'Inspect normalized probabilities'),h('p',{class:'mono'},'p = exp((score − largest legal score) / temperature) / sum of legal weights'),recordTable(['action','score','legal','probability'],out.moves.map(r=>[r.action,r.score,String(r.legal),r.probability.toFixed(8)]))));
    return out;
  }
  const editor=recordsEditor({label:'Action scores JSON',format:'json',initial:MOVE_TEMPLATE,invalid:'[{"action":"attack","score":"bad","legal":true}]',runLabel:'Compute policy',parse:parseMoves,compute:draw,dirty});
  stage.append(editor.el,result);
  const setLegal=(legal:boolean)=>{try{editor.setText(JSON.stringify(parseMoves(editor.input.value).map(r=>({...r,legal})),null,2));}catch{editor.run();return;}editor.run();};
  controls.append(slider('temperature',0.2,3,0.1,temp,v=>v.toFixed(1),v=>{temp=v;editor.run();}),button('Mask all moves',()=>setLegal(false)),button('Allow all moves',()=>setLegal(true)),h('p',{class:'lab-note'},'Higher temperature spreads probability. Lower temperature favours the highest legal score. Edit scores or names to build your own prompt.'));
  editor.run();
}
