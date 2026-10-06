// The background music player: a soft synthesised piano (a few decaying sine partials through a gentle
// low-pass) in a small room (a convolver fed a decaying-noise impulse), playing src/lib/music.ts pass after
// pass. Loaded only when a visitor turns the music on; quiet by design; suspended while the tab is hidden.
import { pass, BEATS_PER_BAR, BARS, BPM, CHORD_NAMES } from "../../lib/music";

// master gain = MAX x the visitor's volume (0..1); the default 0.6 gives 0.12, measured peaks near -20 dBFS
const MAX = 0.2;
let level = 0.6;
const SPB = 60 / BPM, PASS = BARS * BEATS_PER_BAR * SPB;

let cx: AudioContext | null = null, master: GainNode, timer: ReturnType<typeof setInterval> | undefined;
let passStart = 0, origin = 0, seed = 1, queued: { at: number; midi: number; vel: number; dur: number }[] = [];

function room(c: AudioContext) {
  const len = Math.floor(c.sampleRate * 2.4), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  const conv = c.createConvolver(); conv.buffer = ir; return conv;
}

function key(at: number, midi: number, vel: number, dur: number) {
  const c = cx!, f = 440 * Math.pow(2, (midi - 69) / 12), env = c.createGain(), lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1400 + vel * 2600;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(vel, at + 0.012);
  env.gain.exponentialRampToValueAtTime(vel * 0.35, at + 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur * SPB + 1.2);
  env.connect(lp).connect(master);
  // partials: fundamental, octave, twelfth, slightly detuned, each fading faster than the last
  [[1, 1], [2, 0.32], [3, 0.12], [4.02, 0.05]].forEach(([mult, amp], k) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = f * mult * (1 + (k ? 0.0008 * k : 0));
    g.gain.setValueAtTime(amp, at); g.gain.exponentialRampToValueAtTime(amp * 0.05, at + 0.6 + 2.4 / (k + 1));
    o.connect(g).connect(env); o.start(at); o.stop(at + dur * SPB + 1.4);
  });
}

// lookahead scheduling: every 200 ms, queue the notes that fall in the next 1.2 s of the audio clock;
// when a pass runs out, the next one (a new seed, so a slightly different melody) starts where it ended
function tick() {
  const c = cx!, horizon = c.currentTime + 1.2;
  for (;;) {
    if (!queued.length) { queued = pass(seed++).map((n) => ({ ...n, at: passStart + n.t * SPB })); passStart += PASS; }
    if (queued[0].at > horizon) break;
    const n = queued.shift()!;
    if (n.at >= c.currentTime - 0.05) key(Math.max(n.at, c.currentTime), n.midi, n.vel, n.dur);
  }
}

export async function start(volume = level) {
  level = volume;
  cx ??= new AudioContext();
  if (!master) {
    master = cx.createGain(); master.gain.value = 0;
    const wet = cx.createGain(), dry = cx.createGain(), verb = room(cx);
    wet.gain.value = 0.45; dry.gain.value = 0.75;
    master.connect(dry).connect(cx.destination); master.connect(verb).connect(wet).connect(cx.destination);
    document.addEventListener("visibilitychange", () => { if (!cx) return; if (document.hidden) void cx.suspend(); else if (timer) void cx.resume(); });
  }
  await cx.resume();
  queued = []; passStart = origin = cx.currentTime + 0.15; seed = 1;
  master.gain.cancelScheduledValues(cx.currentTime);
  master.gain.setTargetAtTime(MAX * level, cx.currentTime, 0.8);                // fade in over a couple of seconds
  clearInterval(timer); timer = setInterval(tick, 200); tick();
}

export function stop() {
  if (!cx || !timer) return;
  clearInterval(timer); timer = undefined;
  master.gain.cancelScheduledValues(cx.currentTime);
  master.gain.setTargetAtTime(0, cx.currentTime, 0.25);                   // a short fade, then silence
  const c = cx; setTimeout(() => { if (!timer) void c.suspend(); }, 1500);
}

export const playing = () => !!timer;

export function setVolume(v: number) {
  level = v;
  if (cx && timer) master.gain.setTargetAtTime(MAX * level, cx.currentTime, 0.15);
}

/** Where the piece is now: pass, bar and chord, for the "now playing" line. */
export function info() {
  if (!cx || !timer) return null;
  const t = Math.max(0, cx.currentTime - origin), bar = Math.floor((t % PASS) / (BEATS_PER_BAR * SPB));
  return { pass: Math.floor(t / PASS) + 1, bar: bar + 1, chord: CHORD_NAMES[bar] };
}
