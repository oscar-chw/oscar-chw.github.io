# Replay benchmark scope — selected public evidence

Sources:
- https://github.com/oscar-chw/agentic-quant-research/blob/f8c48256e12b96523807ba8f59c04b798517e04e/platform/packages/marketdata/native/README.md
- https://github.com/oscar-chw/agentic-quant-research/blob/f8c48256e12b96523807ba8f59c04b798517e04e/platform/packages/marketdata/native/bench/results-2026-10-04.json

This summary deliberately omits machine-identifying fields. No benchmark was rerun.

The 2026-10-04 synthetic fixture has 100,000 messages (100k), 399,600 delta rows, 100 keyframes, 64 queries and 128 output levels. The workload is preloaded.

Python batch median: 0.019524291 seconds. Native via Python API median: 0.008482125 seconds. C++ caller median: 0.000777708 seconds.

Ratios derived from those medians: 2.3018159954020954 and 25.104912126402198, displayed as 2.3× and 25× respectively.

The timed API call includes validation/preparation, reconstruction of 64 books, sorted outputs and freeing the prior repetition's output. The Python API includes conversion into C++ and back. Workload loading and answer checking are excluded. Neither ratio measures whole-platform speed. Each repetition's output was checked against the reference.

The native replay has 47 tests at this revision; this is historical supporting evidence, not a performance or reliability guarantee.
