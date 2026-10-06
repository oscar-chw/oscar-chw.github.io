// The card-game agent's last step, at toy size: the policy scores every option, illegal ones are
// masked out before the softmax, so probability mass only ever lands on moves the engine allows.
export function maskedSoftmax(scores: number[], legal: boolean[], temperature = 1): number[] {
  const m = Math.max(...scores.filter((_, i) => legal[i]), -Infinity);
  if (!Number.isFinite(m)) return scores.map(() => 0);
  const e = scores.map((s, i) => (legal[i] ? Math.exp((s - m) / temperature) : 0));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / z);
}
