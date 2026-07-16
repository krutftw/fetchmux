import { useState } from "react";
import { BenchmarkPanel } from "./components/BenchmarkPanel.js";
import { PilotCta } from "./components/PilotCta.js";
import { Pricing } from "./components/Pricing.js";
import { RouteReceiptDemo } from "./components/RouteReceiptDemo.js";

interface AppProps {
  readonly pilotContactUrl?: string;
}

const restExample = `curl -X POST http://127.0.0.1:8787/v1/search \\
  -H "Authorization: Bearer $FETCHMUX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"latest Node.js release","task":"fresh_facts","maxCostUsd":0.02}'`;

const mcpExample = `{
  "mcpServers": {
    "fetchmux": {
      "command": "node",
      "args": ["apps/mcp/dist/main.js"],
      "env": {
        "FETCHMUX_BASE_URL": "http://127.0.0.1:8787/",
        "FETCHMUX_API_KEY": "<gateway-key>"
      }
    }
  }
}`;

export function App({ pilotContactUrl }: AppProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header" id="top">
        <a className="brand" href="#top" aria-label="FetchMux home">
          <span className="brand-mark" aria-hidden="true">
            F/
          </span>
          <span>FetchMux</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how">How it routes</a>
          <a href="#benchmark">Benchmark</a>
          <a href="#pricing">Pricing</a>
          <a className="nav-cta" href="#pilot">
            Founding pilot
          </a>
        </nav>
        <span className="provisional-note">Provisional working name</span>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-copy reveal">
            <p className="eyebrow">Provider-neutral retrieval routing / founding build</p>
            <h1 id="hero-title">One retrieval API. The right provider for every request.</h1>
            <p className="hero-lede">
              Route web search and page retrieval by task, budget, latency, and observed
              reliability—without hard-coding your AI product to one provider.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#install">
                Inspect the integration
              </a>
              <a className="button button-ghost" href="#pilot">
                Evaluate a pilot
              </a>
            </div>
            <p className="commercial-truth">
              <strong>Bring your own provider keys.</strong> FetchMux is independent. No partnership
              or resale right is claimed for providers shown in this founding build.
            </p>
          </div>
          <RouteReceiptDemo />
        </section>

        <section className="problem-section section-shell" id="how" aria-labelledby="problem-title">
          <div className="section-index" aria-hidden="true">
            01 / ROUTING
          </div>
          <div className="section-heading">
            <p className="eyebrow">The brittle default</p>
            <h2 id="problem-title">One provider is easy—until the workload changes.</h2>
          </div>
          <div className="comparison-grid">
            <article className="comparison-card legacy-card">
              <p className="card-stamp">HARD-CODED</p>
              <h3>Your application owns every exception.</h3>
              <ul>
                <li>Provider-specific request shapes</li>
                <li>Ad hoc fallback and duplicated retries</li>
                <li>Unknown spend at the moment of execution</li>
                <li>No common receipt when evidence is poor</li>
              </ul>
            </article>
            <article className="comparison-card routed-card">
              <p className="card-stamp">FETCHMUX POLICY</p>
              <h3>The request states intent. The route stays inspectable.</h3>
              <ul>
                <li>One normalized retrieval contract</li>
                <li>Retryable failures only, inside one deadline</li>
                <li>Unknown-cost routes excluded by hard budgets</li>
                <li>Selected provider, attempts, reasons, and trace ID</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="principles-section section-shell" aria-labelledby="principles-title">
          <div className="section-index" aria-hidden="true">
            02 / POLICY
          </div>
          <div className="section-heading">
            <p className="eyebrow">Inspectable by design</p>
            <h2 id="principles-title">Clever routing is useless if nobody can audit it.</h2>
          </div>
          <div className="principle-grid">
            <article>
              <span>01</span>
              <h3>Filter before scoring</h3>
              <p>
                Credentials, task fit, circuit state, budget, and deadline establish eligibility.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Fail over safely</h3>
              <p>Only classified transient failures can advance to a fallback route.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Return the decision</h3>
              <p>Reason codes and attempt costs travel with the normalized evidence.</p>
            </article>
            <article>
              <span>04</span>
              <h3>Learn from outcomes later</h3>
              <p>The founding router is deterministic until real labeled workloads justify more.</p>
            </article>
          </div>
        </section>

        <BenchmarkPanel />

        <section
          className="install-section section-shell"
          id="install"
          aria-labelledby="install-title"
        >
          <div className="section-index" aria-hidden="true">
            04 / CONNECT
          </div>
          <div className="section-heading">
            <p className="eyebrow">Local-first integration</p>
            <h2 id="install-title">Build it. Start it. Give your agent one door.</h2>
            <p>
              The founding build is source-distributed and self-hosted. Provider keys stay in the
              gateway process, never in this site or an agent prompt.
            </p>
          </div>
          <ol className="install-steps">
            <li>
              <span className="step-number">01</span>
              <div>
                <h3>Build the workspace</h3>
                <CodeBlock label="build command" code="npm clean-install && npm run build" />
              </div>
            </li>
            <li>
              <span className="step-number">02</span>
              <div>
                <h3>Start the protected gateway</h3>
                <CodeBlock
                  label="gateway command"
                  code="$env:FETCHMUX_API_KEY='<gateway-key>'; npm run dev:gateway"
                />
              </div>
            </li>
            <li>
              <span className="step-number">03</span>
              <div>
                <h3>Connect through REST or MCP</h3>
                <div className="code-pair">
                  <CodeBlock label="REST example" code={restExample} />
                  <CodeBlock label="MCP configuration" code={mcpExample} />
                </div>
              </div>
            </li>
          </ol>
        </section>

        <Pricing />

        <section className="trust-strip" aria-label="Founding trust controls">
          <p>
            <span>01</span>
            <strong>BYOK</strong>
            Provider credentials remain operator-controlled.
          </p>
          <p>
            <span>02</span>
            <strong>No query logging by default</strong>
            Operational events exclude query text.
          </p>
          <p>
            <span>03</span>
            <strong>Hard budgets</strong>
            Unknown-cost candidates cannot bypass a dollar cap.
          </p>
        </section>

        <PilotCta {...(pilotContactUrl === undefined ? {} : { contactUrl: pilotContactUrl })} />
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top" aria-label="Back to the top of FetchMux">
          <span className="brand-mark" aria-hidden="true">
            F/
          </span>
          <span>FetchMux</span>
        </a>
        <p>Provider-neutral retrieval routing. Provisional brand. Founding build.</p>
        <div className="footer-links">
          <a href="#benchmark-methodology">Methodology</a>
          <a href="#pricing">Pricing hypotheses</a>
          <a href="#pilot">Pilot status</a>
        </div>
      </footer>
    </>
  );
}

function CodeBlock({ label, code }: { readonly label: string; readonly code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block">
      <div className="code-heading">
        <span>{label}</span>
        <button
          type="button"
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
