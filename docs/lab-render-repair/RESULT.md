# Lab rendering repair after PR CI

The aa1c8e3 PR run38616041213 failed with355 browser passes, six Linux WebKit failures and one retry-pass. Local and independent-root full gates passed on that source; those do not override the remote failure. Original traces remain in the run reports and the local review record.

Trace evidence shows repeated qubit clicks taking about1–2.4 seconds each before the thirty-second journey limit; market sliders take about3–3.5 seconds and ordinary readout reads1.5–2 seconds. The gate demo also spends seconds on individual UI operations. These are latency failures, not demonstrated wrong calculation values.

Hypothesis: live backdrop filtering of the tall changing workbench dominates software rendering. This candidate removes only the stage backdrop filter, preserving its gradient, border/rim, page/diagram motion and floating optical-glass controls. No browser detection, test-only style, calculation, assertion, timeout, retry or worker change is introduced. The existing failed Linux tests remain the acceptance check for the hypothesis.

Local affected checks:106 PASS. Fresh layout capture:96 views over24 demos, Chromium/WebKit and375/1280 widths, no page errors or horizontal overflow. Main owner inspected desktop gate and narrow qubit renders. The subsequent full combined local gate79 passed:174 unit tests,362 browser tests,nine Lighthouse runs and all original source/content/link/CV checks. New exact-head GitHub CI is still required. The previous candidate and all failures are historical evidence, not erased.

Independent code review remains NOT_RUN after the single authorised retry was rejected. PR remains draft; no main push, merge or deployment.

An earlier local gate attempt stopped at an HTTP503 from an unchanged GitHub source link. The exact URL returned200 on read-back; the original gate was rerun unchanged. No link-check exception was added.
