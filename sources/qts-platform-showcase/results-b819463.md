# QTS measurement scope — selected public evidence

Source: https://github.com/oscar-chw/qts-platform-showcase/blob/b8194631965266679dbb87b04dbcfde6b1a48307/docs/results.md

Revision recorded by the local checkout: b8194631965266679dbb87b04dbcfde6b1a48307.
This is a scope summary, not a new run or a copy of the private platform.

- Snapshot: 2026-10-05 (5 October 2026).
- A-share cleansed rows: 565,949,690,871. Crypto stored rows: 138,059,600,559.
- Their sum: 704,009,291,430 stored rows, displayed as 700B+. The sum does not include Polymarket.
- These are stored rows, not a count of unique observations. Crypto duplicates were not measured.
- Exact A-share duplicates removed: 514,396,607, displayed as 500M+ only in detailed evidence.
- Separate concurrency fixture: 420,000 rows; 12 readers and 5 writers (4 appending, 1 rewriting a partition); 23/23 commits and 1,111 version-pinned reads without mismatch.
- This is a correctness fixture, not a production-scale load test.
- The first query on a new version rebuilds its file list. That first query was not timed, so no stock-day or cold-query latency bound is supported.
