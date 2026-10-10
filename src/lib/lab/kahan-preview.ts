// The build-computed result shown on FatQat's project page: one nearly cancelling case and two 2,000-case sweeps, computed
// by the same code the Lab runs live. It is stored as sources/site-experiments/compensated-preview.json so check-numbers can
// trace every figure the page shows; kahan-preview.test.ts recomputes it and fails if the file and the code ever disagree.
import { exactDet, toDouble, plain, kahan, ulpError, digitsKept, cancelling, sweep } from "./kahan";

const fmtVal = (x: number) => (x === 0 ? "0" : x.toPrecision(17));
const fmtUlp = (x: number) => (x === Infinity ? "all digits lost" : x < 10 ? x.toFixed(2) : x.toExponential(1));

export function preview() {
  const [a, b, c, d] = cancelling(1);
  const ref = toDouble(exactDet(a, b, c, d)), p = plain(a, b, c, d), k = kahan(a, b, c, d);
  const ep = ulpError(p, a, b, c, d), ek = ulpError(k, a, b, c, d);
  const sw = (kind: "cancelling" | "typical") => {
    const s = sweep(kind, 2000, 1);
    return { cases: s.n.toLocaleString("en-US"), plainMedian: fmtUlp(s.plain.median), plainWorst: fmtUlp(s.plain.max), compensatedMedian: fmtUlp(s.kahan.median), compensatedWorst: fmtUlp(s.kahan.max) };
  };
  return {
    case: {
      inputs: [a, b, c, d].map((x) => x.toPrecision(17)),
      exact: fmtVal(ref),
      plain: { value: fmtVal(p), ulp: fmtUlp(ep), digits: String(digitsKept(ep)) },
      compensated: { value: fmtVal(k), ulp: fmtUlp(ek), digits: String(digitsKept(ek)) },
    },
    sweeps: { cancelling: sw("cancelling"), typical: sw("typical") },
  };
}
