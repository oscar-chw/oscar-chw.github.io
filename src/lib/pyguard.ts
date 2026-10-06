// Typed entry to public/lab/pyguard.js, imported at runtime by URL so the Lab and the top-bar console
// (public/console.js) share one module instance and one Python boot.
export type Verdict = (cmd: string) => string | null;
interface PyGuard { loadGuard(): Promise<Verdict>; GUARD_SOURCE: { repo: string; path: string; commit: string } }

export const pyguard = (base: string): Promise<PyGuard> =>
  import(/* @vite-ignore */ `${base.replace(/\/$/, "")}/lab/pyguard.js`);
