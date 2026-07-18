import { useEffect, useState } from "react";
import { PilotCta } from "./components/PilotCta.js";
import { RouteReceiptDemo } from "./components/RouteReceiptDemo.js";

interface AppProps {
  readonly pilotContactUrl?: string;
}

const restExample = `curl http://127.0.0.1:8787/v1/search \\
  -H "Authorization: Bearer $FETCHMUX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "latest Node.js release",
    "task": "fresh_facts",
    "maxCostUsd": 0.02,
    "deadlineMs": 2000
  }'`;

const mcpExample = `{
  "mcpServers": {
    "fetchmux": {
      "command": "node",
      "args": ["apps/mcp/dist/main.js"],
      "env": {
        "FETCHMUX_BASE_URL": "http://127.0.0.1:8787/"
      }
    }
  }
}`;

export function App({ pilotContactUrl }: AppProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = () => setMenuOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("hashchange", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("hashchange", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="nav-wrap" id="top">
        <div className="site-nav">
          <a className="brand" href="#top" aria-label="FetchMux home">
            <RouteMark />
            <span>FetchMux</span>
          </a>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <a href="#product">Product</a>
            <a href="#connect">Connect</a>
            <a href="#pilot">Pilot</a>
            <a href="/openapi.yaml">OpenAPI</a>
          </nav>

          <a className="nav-action" href="#pilot">
            <span>Founding pilot</span>
            <span className="action-orb" aria-hidden="true">
              ↘
            </span>
          </a>

          <button
            className="menu-toggle"
            type="button"
            aria-controls="mobile-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>

        <nav
          className="mobile-menu"
          id="mobile-menu"
          aria-label="Mobile navigation"
          data-open={menuOpen}
        >
          <a href="#product">
            Product <span>01</span>
          </a>
          <a href="#connect">
            Connect <span>02</span>
          </a>
          <a href="#pilot">
            Founding pilot <span>03</span>
          </a>
          <a href="/openapi.yaml">
            OpenAPI <span>↗</span>
          </a>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="hero page-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="signal-line">
              <span aria-hidden="true" />
              Retrieval infrastructure for agents
            </p>
            <h1 id="hero-title" aria-label="Stop wiring search providers into your agent.">
              Stop wiring <em>search providers</em> into your agent.
            </h1>
            <p className="hero-lede">
              FetchMux gives your agent one retrieval endpoint. Each request is routed against the
              task, budget, deadline, and observed reliability, then returned with a receipt that
              explains the decision.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#connect">
                <span>Inspect the integration</span>
                <span className="action-orb" aria-hidden="true">
                  ↓
                </span>
              </a>
              <a className="quiet-action" href="/openapi.yaml">
                Read the contract <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <div className="hero-demo-shell">
            <div className="hero-demo-core">
              <RouteReceiptDemo />
            </div>
          </div>

          <div className="adapter-line">
            <p>Adapters in the current build</p>
            <ul aria-label="Current provider adapters">
              <li>Brave</li>
              <li>Tavily</li>
              <li>Exa</li>
              <li>Firecrawl</li>
            </ul>
            <span>Bring your own keys</span>
          </div>
        </section>

        <section
          className="product-section page-shell"
          id="product"
          aria-labelledby="product-title"
        >
          <header className="section-intro">
            <p className="section-label">The routing layer</p>
            <h2 id="product-title">Your agent describes the job. FetchMux chooses the route.</h2>
            <p>
              Provider choice stays out of prompts and application code. The gateway makes a bounded
              decision and returns the evidence your team needs to inspect it.
            </p>
          </header>

          <div className="feature-grid">
            <div className="feature-shell feature-contract">
              <article className="feature-card">
                <FeatureHeader number="01" title="One stable contract" />
                <p className="feature-lede">
                  Search and page retrieval enter through the same request shape, whether the caller
                  is REST, MCP, or an agent framework.
                </p>
                <figure className="contract-map" aria-label="Normalized retrieval contract diagram">
                  <div className="contract-input">
                    <span>intent</span>
                    <strong>fresh_facts</strong>
                  </div>
                  <div className="contract-rail" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="contract-output">
                    <span>normalized</span>
                    <strong>evidence[]</strong>
                  </div>
                </figure>
                <ul className="task-list" aria-label="Supported task classes">
                  <li>Fresh facts</li>
                  <li>Technical docs</li>
                  <li>Deep research</li>
                  <li>Page content</li>
                </ul>
              </article>
            </div>

            <div className="feature-shell feature-policy">
              <article className="feature-card feature-dark">
                <FeatureHeader number="02" title="Policy before preference" />
                <p>
                  A provider is eligible only when its credentials, task fit, circuit state, spend,
                  and deadline all pass.
                </p>
                <dl className="policy-list">
                  <div>
                    <dt>Budget</dt>
                    <dd>hard ceiling</dd>
                  </div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>one clock</dd>
                  </div>
                  <div>
                    <dt>Fallback</dt>
                    <dd>safe errors only</dd>
                  </div>
                  <div>
                    <dt>Keys</dt>
                    <dd>operator owned</dd>
                  </div>
                </dl>
              </article>
            </div>

            <div className="feature-shell feature-receipt">
              <article className="feature-card">
                <FeatureHeader number="03" title="The decision comes back" />
                <p>
                  Every response carries the selected provider, attempts, reason codes, estimated
                  cost, and trace ID.
                </p>
                <section className="trace-card" aria-label="Example route trace">
                  <div>
                    <span>trace</span>
                    <strong>rte_38fd91</strong>
                  </div>
                  <ol>
                    <li>
                      <span>01</span> candidates filtered
                    </li>
                    <li>
                      <span>02</span> policy scored
                    </li>
                    <li>
                      <span>03</span> receipt issued
                    </li>
                  </ol>
                </section>
              </article>
            </div>
          </div>
        </section>

        <section
          className="connect-section page-shell"
          id="connect"
          aria-labelledby="connect-title"
        >
          <header className="connect-copy">
            <p className="section-label">Connect once</p>
            <h2 id="connect-title">The model only needs to know FetchMux.</h2>
            <p>
              Provider credentials stay inside the self-hosted gateway. Your agent gets one local
              endpoint, one tool definition, and one response contract.
            </p>
            <div className="contract-links">
              <a href="/openapi.yaml">OpenAPI YAML ↗</a>
              <a href="/llms.txt">Agent brief ↗</a>
            </div>
          </header>

          <div className="code-stack">
            <CodeBlock label="REST / search" code={restExample} />
            <CodeBlock label="MCP / config" code={mcpExample} />
          </div>
        </section>

        <section className="control-section page-shell" aria-labelledby="control-title">
          <header>
            <p className="section-label">Operator control</p>
            <h2 id="control-title">Nothing important disappears behind the router.</h2>
          </header>
          <div className="control-list">
            <article>
              <span>01</span>
              <h3>Your credentials</h3>
              <p>Provider keys remain in the gateway process, outside prompts and this website.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Your limits</h3>
              <p>Hard budgets and deadlines are eligibility rules, not best-effort suggestions.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Your evidence</h3>
              <p>Query text is excluded from operational events by default. Route facts remain.</p>
            </article>
          </div>
        </section>

        <PilotCta {...(pilotContactUrl === undefined ? {} : { contactUrl: pilotContactUrl })} />
      </main>

      <footer className="site-footer page-shell">
        <a className="brand" href="#top" aria-label="Back to the top of FetchMux">
          <RouteMark />
          <span>FetchMux</span>
        </a>
        <p>Independent retrieval routing infrastructure for AI agents.</p>
        <div className="footer-links">
          <a href="/openapi.yaml">OpenAPI contract</a>
          <a href="/llms.txt">Agent brief</a>
          <a href="/robots.txt">Crawler policy</a>
          <a href="mailto:hello@fetchmux.com">Email FetchMux</a>
          <a href="mailto:security@fetchmux.com">Report a vulnerability</a>
        </div>
        <small>
          fetchmux.com secured. Trademark review pending. Provider names identify compatible
          adapters only; no partnership or resale right is claimed.
        </small>
      </footer>
    </>
  );
}

function FeatureHeader({ number, title }: { readonly number: string; readonly title: string }) {
  return (
    <header className="feature-header">
      <span>{number}</span>
      <h3>{title}</h3>
    </header>
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
    <div className="code-shell">
      <div className="code-panel">
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
    </div>
  );
}

function RouteMark() {
  return (
    <svg className="route-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 8h4c4 0 4 8 8 8" />
      <path d="M6 16h12" />
      <path d="M6 24h4c4 0 4-8 8-8" />
      <path d="M18 16h8" />
      <circle className="route-input" cx="5" cy="8" r="2" />
      <circle className="route-input" cx="5" cy="16" r="2" />
      <circle className="route-input" cx="5" cy="24" r="2" />
      <circle className="route-junction" cx="18" cy="16" r="2.25" />
      <circle className="route-output" cx="27" cy="16" r="2" />
    </svg>
  );
}
