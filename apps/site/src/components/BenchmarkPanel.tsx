import { illustrativeReport } from "../data/illustrative-report.js";

export function BenchmarkPanel() {
  return (
    <section
      className="benchmark-section section-shell"
      id="benchmark"
      aria-labelledby="benchmark-title"
    >
      <div className="section-index" aria-hidden="true">
        03 / EVIDENCE
      </div>
      <div className="benchmark-copy">
        <p className="eyebrow">A benchmark you can rerun</p>
        <h2 id="benchmark-title">Measure the workload. Keep the caveats.</h2>
        <p>
          Every provider gets the same class policy and seeded execution order. Errors and unknown
          costs stay visible. Human relevance labels never masquerade as measured output.
        </p>
        <a className="text-link" href="#benchmark-methodology">
          Read the methodology
        </a>
      </div>

      <section className="benchmark-board" aria-label="Illustrative benchmark layout">
        <p className="illustrative-banner">{illustrativeReport.banner}</p>
        <div className="metric-header" aria-hidden="true">
          <span>Route</span>
          <span>Mean latency</span>
          <span>Success</span>
          <span>Est. cost</span>
        </div>
        {illustrativeReport.rows.map((row) => (
          <div className="metric-row" key={row.label}>
            <strong>{row.label}</strong>
            <span data-label="Mean latency">{row.latency}</span>
            <span data-label="Success">{row.success}</span>
            <span data-label="Estimated cost">{row.cost}</span>
          </div>
        ))}
        <p className="benchmark-warning">
          Fabricated layout values. Neutral labels. Not evidence about any named provider.
        </p>
      </section>

      <details className="methodology-note" id="benchmark-methodology">
        <summary>Founding methodology in 30 seconds</summary>
        <p>
          Twenty-four public cases across fresh facts, technical docs, deep research, and page
          content. Four providers. One repetition. Ninety-six planned calls. Dry-run is the default
          and makes zero network calls. Live reports record code version, configuration hashes,
          sample counts, missing metrics, and limitations.
        </p>
      </details>
    </section>
  );
}
