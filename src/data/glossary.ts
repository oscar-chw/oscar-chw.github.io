// Plain-English definitions for the terms that pop up on project pages. General definitions,
// not claims about the projects, so they carry no figures.
export const GLOSSARY = {
  "look-ahead bias": "Using information in a backtest that was not yet available when the decision was made. It makes results look better than anything that could have traded.",
  "point-in-time": "Reading data exactly as it was known at a given moment, so later corrections and revisions stay invisible.",
  "pre-registered": "The test, the data split and the pass rule are fixed and recorded before the study runs, so none of them can be tuned to the result.",
  "rank IC": "Rank information coefficient: the Spearman correlation between how a signal ranks assets today and how those assets return tomorrow.",
  "delay-1": "A signal computed from today's data may only trade tomorrow, so it never uses a price it could not actually have traded at.",
  "external sort": "Sorting data too large for memory: sort it in chunks that fit, write each chunk to disk, then merge the chunks.",
  "state vector": "The full description of a quantum register: one complex amplitude per basis state, so its size doubles with every qubit.",
  "conformal risk control": "A way to set a decision threshold from held-out data so that an error rate stays below a chosen target.",
  "market making": "Continuously quoting a price to buy (the bid) and to sell (the ask), earning the spread while managing the inventory that builds up.",
  "Kalman filter": "A recursive estimator that tracks a hidden value, such as a fair price, from noisy observations, updating its belief with every new tick.",
  "markouts": "Judging each fill by how the price moved after it, using only prices that had been observed at the time.",
  "imitation learning": "Training a policy to copy the decisions in recorded games before improving it any further.",
  "MCP": "Model Context Protocol: an open standard for connecting AI tools to external tools and data.",
  "versioned Parquet": "Columnar data files kept as immutable versions, so a query can name the exact version it read and get the same rows again.",
  "genetic programming": "Evolving formulas by mutation and crossover, keeping the ones that score best, much like breeding.",
} as const;
