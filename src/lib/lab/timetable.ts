// StudyFlow's core check, at toy size: a section meets in weekly slots; adding one that overlaps
// a slot already on the timetable is refused, and the clash is named.
export interface Slot { day: number; start: number; end: number }     // minutes from midnight
export interface Section { code: string; slots: Slot[] }

export const overlaps = (a: Slot, b: Slot) => a.day === b.day && a.start < b.end && b.start < a.end;

export function clash(plan: Section[], add: Section): { with: string; slot: Slot } | null {
  for (const s of plan) for (const a of s.slots) for (const b of add.slots) if (overlaps(a, b)) return { with: s.code, slot: b };
  return null;
}
