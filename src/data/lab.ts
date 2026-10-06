// The lab's experiments: one or more per project. "inline" ones run inside the lab; "page" ones
// are full demos on their own page. Every experiment says where its data comes from.
export interface Experiment {
  id: string; folder: string; file: string; title: string; blurb: string; data: string;
  project?: string; code: string; kind: "inline" | "page"; href?: string;
}
const SITE_SRC = "https://github.com/oscar-chw/oscar-chw.github.io";

export const EXPERIMENTS: Experiment[] = [
  { id: "guard", folder: "agent-harness", file: "guard.sh", title: "Command guard", kind: "inline", project: "ai-quant-research-system#agent-harness", code: "https://github.com/oscar-chw/agent-harness",
    blurb: "Type a shell command. The guard parses it like a shell would and blocks the destructive shapes; anything it cannot parse is blocked too, because it fails closed.",
    data: "Your input only. A simplified illustration of the guard's idea, not its code or rule set." },
  { id: "qubits", folder: "fatqat", file: "statevector.sim", title: "Qubit sandbox", kind: "inline", project: "fatqat-gpu-backend", code: "https://github.com/oscar-chw/fatqat-cuda",
    blurb: "A state vector holds one amplitude per basis state and every gate updates all of them. Apply gates and watch the amplitudes; colour shows phase. The real backend does this for thousands of times more amplitudes, on a GPU.",
    data: "Computed exactly in your browser (2 to 4 qubits)." },
  { id: "asof", folder: "qts-platform", file: "asof.read", title: "Point-in-time reads", kind: "inline", project: "qts-research-platform", code: "https://github.com/oscar-chw/qts-platform-demo",
    blurb: "Every version of a value carries the day it became known. Move the read date: corrections and late data published afterwards stay invisible.",
    data: "SYNTHETIC store of a few invented fields." },
  { id: "lookahead", folder: "point-in-time", file: "lookahead.bt", title: "Look-ahead bias", kind: "inline", project: "ai-quant-research-system#point-in-time-research", code: "https://github.com/oscar-chw/asof-research",
    blurb: "One trend rule, two backtests. Decide from yesterday's return and it is a coin-flip business. Let it peek at today's return and it never has a losing day.",
    data: "SYNTHETIC returns from a seeded random walk." },
  { id: "orderbook", folder: "point-in-time", file: "orderbook.replay", title: "Order-book replay", kind: "page", href: "/demos/order-book/", project: "ai-quant-research-system#point-in-time-research", code: "https://github.com/oscar-chw/asof-research",
    blurb: "A price-time-priority matching engine replays seeded order flow event by event.", data: "SYNTHETIC order flow." },
  { id: "reconciliation", folder: "streaming-reconciliation", file: "memory.run", title: "Streaming reconciliation", kind: "page", href: "/demos/reconciliation/", project: "supporting-work#streaming-reconciliation", code: "https://github.com/oscar-chw/streaming-reconciliation",
    blurb: "The same 225,000 rows read in memory and streamed: peak memory and time from the measured runs.", data: "SYNTHETIC benchmark, real measurements." },
  { id: "marketmaking", folder: "market-making", file: "quotes.sim", title: "Market making", kind: "inline", project: "ai-quant-research-system#market-making-lab", code: "https://github.com/oscar-chw/asof-research/tree/main/packages/imc-sim",
    blurb: "Quote a bid and an ask around a drifting fair value. Widen the spread to earn more per fill; skew the quotes against your inventory to stop it running away. Same lesson as IMC Prosperity's market-making rounds.",
    data: "SYNTHETIC fair value and takers." },
  { id: "imc", folder: "imc-prosperity-4", file: "round.sim", title: "A market-making round", kind: "inline", project: "competitions#imc-prosperity-4", code: "https://github.com/oscar-chw/imc-prosperity-4-shdc",
    blurb: "The core trade-off of a Prosperity market-making round: a wider spread earns more per fill but fills less; skewing quotes against inventory keeps position limits safe. Tune both and watch P&L and inventory.",
    data: "SYNTHETIC fair value and takers; not the team's competition code." },
  { id: "factors", folder: "factor-lab", file: "rank-ic.lab", title: "Choose on validation", kind: "inline", project: "ai-quant-research-system#factor-lab", code: "https://github.com/oscar-chw/asof-research/tree/main/packages/factor",
    blurb: "Four signals scored by rank IC on train and validation. The test window stays sealed until one has been chosen, then opens for that one only.",
    data: "SYNTHETIC panel of assets with a little momentum." },
  { id: "multitest", folder: "alpha-search", file: "many-formulas.lab", title: "The multiple-testing trap", kind: "inline", project: "supporting-work#alpha-search", code: "https://github.com/oscar-chw/alpha-gp-lab",
    blurb: "Search more random formulas and the best one looks better on the data you searched, and no better on data you did not. Why a search needs a sealed test and a random control.",
    data: "SYNTHETIC panel; every candidate is noise by construction." },
  { id: "policy", folder: "pokemon-tcg", file: "legal-moves.policy", title: "Legal-move masking", kind: "inline", project: "competitions#pokemon-tcg-ai", code: "https://github.com/oscar-chw/ptcg-ai-battle",
    blurb: "The policy scores every option; illegal ones are masked before the softmax so probability only lands on moves the engine allows. Toggle legality and temperature.",
    data: "Invented scores for one prompt." },
  { id: "timetable", folder: "studyflow", file: "timetable.plan", title: "Timetable clashes", kind: "inline", project: "supporting-work#studyflow", code: SITE_SRC,
    blurb: "StudyFlow's core check: add course sections to a week; one that overlaps an existing slot is refused and the clash named.",
    data: "SYNTHETIC sections (invented codes and times)." },
  { id: "gate", folder: "final-year-project", file: "decision-gate.sim", title: "Decision gate", kind: "inline", project: "final-year-project", code: SITE_SRC,
    blurb: "An agent proposes actions; the gate abstains on the risky ones. Set how many rule breaks you will tolerate and the threshold is calibrated to meet it.",
    data: "SYNTHETIC actions; a simplified illustration of the idea, not the project's model." },
  { id: "fourier", folder: "site", file: "fourier.portrait", title: "Fourier portrait", kind: "page", href: "/demos/fourier/", code: "https://github.com/oscar-chw/oscar-chw",
    blurb: "Rotating circles redraw a line portrait. Draw your own shape or trace your own photo, in your browser.", data: "My photo as one closed path; yours never leaves the page." },
  { id: "harbour", folder: "site", file: "harbour.live", title: "The harbour", kind: "page", href: "/demos/harbour/", code: SITE_SRC,
    blurb: "A simulated market as a city: its past as the skyline, its live order book as the water. Pick the kind of market.", data: "Synthetic: seeded order flow through my matching engine." },
];
