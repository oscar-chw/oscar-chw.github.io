// Independent interval-overlap exercise: a section meets in weekly slots; adding one that overlaps
// a slot already on the timetable is refused, and the clash is named.
export interface Slot { day: number; start: number; end: number }     // minutes from midnight
export interface Section { code: string; slots: Slot[] }

export const overlaps = (a: Slot, b: Slot) => a.day === b.day && a.start < b.end && b.start < a.end;

export function parseSection(name:string,dayText:string,startText:string,endText:string):Section{
  const code=name.trim();if(!code||code.length>60)throw new Error('Section name must contain 1 to 60 characters.');
  const day=Number(dayText);if(!dayText.trim()||!Number.isInteger(day)||day<0||day>4)throw new Error('Day must be Monday to Friday.');
  const clock=(text:string)=>{if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text))throw new Error('Use a valid start and end time in HH:MM format.');const [h,m]=text.split(':').map(Number);return h*60+m;};
  const start=clock(startText),end=clock(endText);if(end<=start)throw new Error('End time must be after start time on the same day.');
  return {code,slots:[{day,start,end}]};
}

export function clash(plan: Section[], add: Section): { with: string; slot: Slot } | null {
  for (const s of plan) for (const a of s.slots) for (const b of add.slots) if (overlaps(a, b)) return { with: s.code, slot: b };
  return null;
}
