import { clash, parseSection, type Section } from "../../../lib/lab/timetable";
import { h, button } from "../ui";

// SYNTHETIC course sections (codes and times are invented for the demo).
const CATALOG: Section[] = [
  { code: "CSCI 3100 · A", slots: [{ day: 0, start: 570, end: 660 }, { day: 2, start: 570, end: 660 }] },
  { code: "CSCI 3150 · B", slots: [{ day: 1, start: 630, end: 720 }, { day: 3, start: 630, end: 720 }] },
  { code: "STAT 2005 · A", slots: [{ day: 0, start: 630, end: 720 }] },
  { code: "MATH 2050 · C", slots: [{ day: 2, start: 840, end: 930 }, { day: 4, start: 840, end: 930 }] },
  { code: "FINA 4150 · A", slots: [{ day: 3, start: 690, end: 780 }] },
  { code: "ENGG 1110 · D", slots: [{ day: 4, start: 870, end: 960 }] },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const T0 = 540, T1 = 1020;          // 09:00 to 17:00
const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function mount(stage:HTMLElement,controls:HTMLElement){
  let plan:Section[]=[];
  const grid=h('div',{class:'tt'}),agenda=h('ul',{class:'tt-agenda'}),msg=h('p',{class:'lab-note mono tt-message','aria-live':'polite'},'Add a section or build your own. Touching endpoints do not clash.');
  const chips=h('div',{class:'chips'});
  const name=h('input',{type:'text',maxlength:'60',placeholder:'My seminar'}),day=h('select',{'aria-label':'Day'},...DAYS.map((d,i)=>h('option',{value:String(i)},d))),start=h('input',{type:'time',value:'09:00'}),end=h('input',{type:'time',value:'10:00'});
  const exportButton=button('Export schedule',()=>{
    const href=URL.createObjectURL(new Blob([JSON.stringify({data:'Synthetic catalogue and visitor-authored sections',sections:plan},null,2)+'\n'],{type:'application/json'}));h('a',{href,download:'schedule.json'}).click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  });
  function draw(){
    const slots=plan.flatMap(s=>s.slots),lo=Math.min(T0,...slots.map(s=>s.start)),hi=Math.max(T1,...slots.map(s=>s.end));
    grid.replaceChildren(...DAYS.map((d,di)=>h('div',{class:'tt-day'},h('span',{class:'mono'},d),...plan.flatMap(s=>s.slots.filter(x=>x.day===di).map(x=>h('b',{class:'tt-blk',style:`--a:${(x.start-lo)/(hi-lo)};--b:${(x.end-lo)/(hi-lo)}`,title:`${s.code} ${hh(x.start)}–${hh(x.end)}`},h('span',{class:'mono'},s.code),h('span',{class:'mono t'},`${hh(x.start)}–${hh(x.end)}`)))))));
    agenda.replaceChildren(...plan.map(s=>h('li',{},h('span',{},s.code+' · '+s.slots.map(x=>`${DAYS[x.day]} ${hh(x.start)}–${hh(x.end)}`).join(', ')),button('Remove '+s.code,()=>{plan=plan.filter(x=>x!==s);msg.textContent='Removed '+s.code;draw();}))));
    if(!plan.length)agenda.append(h('li',{},'No sections selected.'));
    for(const b of chips.querySelectorAll('button'))b.setAttribute('aria-pressed',String(plan.some(s=>s.code===b.textContent)));
    exportButton.disabled=!plan.length;
  }
  function add(s:Section){
    if(plan.some(x=>x.code===s.code)){msg.textContent='That section name is already selected. Remove it before replacing its times.';return;}
    const c=clash(plan,s);if(c){msg.textContent=`${s.code} clashes with ${c.with} on ${DAYS[c.slot.day]} at ${hh(c.slot.start)}. Change the time or remove the existing section.`;return;}
    plan=[...plan,s];msg.textContent=`Added ${s.code}.`;draw();
  }
  for(const s of CATALOG)chips.append(button(s.code,()=>{
    const found=plan.find(x=>x.code===s.code);if(found){plan=plan.filter(x=>x!==found);msg.textContent='Removed '+s.code;draw();}else add(s);
  },'chip mono'));
  const submit=h('button',{type:'submit',class:'lab-btn primary'},'Add section');
  const form=h('form',{class:'tt-form'},h('label',{},'Section name',name),h('label',{},'Day',day),h('label',{},'Start time',start),h('label',{},'End time',end),submit);
  form.addEventListener('submit',e=>{e.preventDefault();try{add(parseSection(name.value,day.value,start.value,end.value));}catch(error){msg.textContent=error instanceof Error?error.message:String(error);}});
  stage.append(grid,h('p',{class:'lab-note'},'The agenda below preserves full labels, including short slots that do not fit inside the grid.'),agenda);
  controls.append(h('p',{class:'ctl-l mono'},'Your own interval'),form,msg,exportButton,h('p',{class:'ctl-l mono'},'Synthetic examples · click to add or remove'),chips);
  draw();
}
