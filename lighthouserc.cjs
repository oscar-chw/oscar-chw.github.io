// Lighthouse CI: >= 0.95 in every category on the home page and one project page,
// default mobile profile (simulated slow 4G), the stricter of the two.
// LHCI_URL_BASE set => audit a deployed site (launch check); unset => audit dist/ locally.
const base = process.env.LHCI_URL_BASE;
const paths = ["/", "/projects/point-in-time-research/"];
module.exports = {
  ci: {
    collect: {
      ...(base ? { url: paths.map((p) => base.replace(/\/$/, "") + p) } : { staticDistDir: "./dist", url: paths.map((p) => "http://localhost" + p) }),
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};
