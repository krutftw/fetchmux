import { useCallback, useEffect, useMemo, useState } from "react";

interface PortalSession {
  readonly email: string;
  readonly name: string | null;
  readonly amountTotal: number;
  readonly currency: string;
  readonly purchasedAt: number;
  readonly workload: string | null;
  readonly receiptUrl: string | null;
  readonly livemode: boolean;
}

type PortalState =
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly session: PortalSession }
  | { readonly kind: "signed-out" }
  | { readonly kind: "error"; readonly message: string };

const PILOT_DAYS = 30;

export function Portal() {
  const [state, setState] = useState<PortalState>({ kind: "loading" });

  const activate = useCallback(async (sessionId: string | null) => {
    try {
      const response = sessionId
        ? await fetch("/api/portal-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          })
        : await fetch("/api/portal-session", { method: "GET" });

      if (response.status === 401) {
        setState({ kind: "signed-out" });
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setState({
          kind: "error",
          message:
            body?.error ?? "The purchase could not be verified. Try your purchase link again.",
        });
        return;
      }
      const session = (await response.json()) as PortalSession;
      if (sessionId) {
        window.history.replaceState(null, "", "/portal");
      }
      setState({ kind: "ready", session });
    } catch {
      setState({ kind: "error", message: "The portal could not reach the verification service." });
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    void activate(params.get("session_id"));
  }, [activate]);

  return (
    <div className="portal-page">
      <header className="portal-header page-shell">
        <a className="brand" href="/" aria-label="FetchMux home">
          <span className="portal-mark" aria-hidden="true">
            ⌥
          </span>
          <span>FetchMux</span>
        </a>
        <p className="section-label">Pilot portal</p>
      </header>

      <main className="portal-main page-shell">
        {state.kind === "loading" && (
          <p className="portal-status" role="status">
            Verifying your purchase…
          </p>
        )}
        {state.kind === "error" && (
          <div className="portal-card portal-notice" role="alert">
            <h1>Purchase not verified</h1>
            <p>{state.message}</p>
            <p>
              If you completed checkout, reopen the link Stripe showed after payment. Need help?
              Contact <a href="mailto:hello@fetchmux.com">hello@fetchmux.com</a> from your purchase
              email.
            </p>
          </div>
        )}
        {state.kind === "signed-out" && <SignedOut />}
        {state.kind === "ready" && <PilotDashboard session={state.session} />}
      </main>

      <footer className="portal-footer page-shell">
        <small>
          Support: <a href="mailto:hello@fetchmux.com">hello@fetchmux.com</a> · Security:{" "}
          <a href="mailto:security@fetchmux.com">security@fetchmux.com</a> · Never send provider API
          keys or private queries by email.
        </small>
      </footer>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="portal-card portal-notice">
      <h1>Pilot portal access</h1>
      <p>
        Access opens automatically after checkout: Stripe returns you here with your purchase
        attached, and this browser stays signed in for the pilot.
      </p>
      <ul>
        <li>
          Just bought the pilot? Use the button on the Stripe confirmation page, or reopen that page
          from your receipt email.
        </li>
        <li>
          Not a customer yet? The founding pilot is on the <a href="/#pilot">FetchMux home page</a>.
        </li>
        <li>
          Lost your link or switched browsers? Email{" "}
          <a href="mailto:hello@fetchmux.com">hello@fetchmux.com</a> from your purchase email and
          access is restored the same day.
        </li>
      </ul>
    </div>
  );
}

function PilotDashboard({ session }: { readonly session: PortalSession }) {
  const purchased = new Date(session.purchasedAt * 1000);
  const dayOfPilot = Math.min(
    PILOT_DAYS,
    Math.max(1, Math.floor((Date.now() - purchased.getTime()) / 86_400_000) + 1),
  );
  const amount = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: session.currency.toUpperCase(),
      }).format(session.amountTotal / 100),
    [session.amountTotal, session.currency],
  );

  return (
    <>
      {!session.livemode && (
        <p className="portal-testmode" role="status">
          Test-mode purchase — no live charge was made.
        </p>
      )}

      <section className="portal-card" aria-labelledby="portal-status-title">
        <p className="section-label">Founding pilot</p>
        <h1 id="portal-status-title">
          Day {dayOfPilot} of {PILOT_DAYS}
        </h1>
        <dl className="portal-facts">
          <div>
            <dt>Customer</dt>
            <dd>{session.name ?? session.email}</dd>
          </div>
          <div>
            <dt>Purchased</dt>
            <dd>{purchased.toLocaleDateString("en-AU", { dateStyle: "medium" })}</dd>
          </div>
          <div>
            <dt>Paid</dt>
            <dd>{amount}</dd>
          </div>
          <div>
            <dt>Workload</dt>
            <dd>{session.workload ?? "Shared at setup"}</dd>
          </div>
        </dl>
        {session.receiptUrl ? (
          <a className="portal-receipt" href={session.receiptUrl} rel="noreferrer" target="_blank">
            View your Stripe receipt ↗
          </a>
        ) : null}
      </section>

      <section className="portal-card" aria-labelledby="portal-next-title">
        <p className="section-label">What happens next</p>
        <h2 id="portal-next-title">Setup runs on a fixed sequence</h2>
        <ol className="portal-steps">
          <li>
            <strong>Within 1 business day:</strong> hello@fetchmux.com emails you to schedule the
            setup session and collect workload details. Provider accounts stay yours; keys are
            exchanged only through the agreed secure channel — never email.
          </li>
          <li>
            <strong>Setup:</strong> we benchmark your representative queries, configure the gateway
            policy, and connect REST or MCP in your environment.
          </li>
          <li>
            <strong>Days 1–30:</strong> a weekly outcome scorecard lands in this portal and your
            inbox, measured against the one metric we agree on.
          </li>
          <li>
            <strong>Closeout:</strong> keep the routing policy, or leave with the evidence. No
            subscription, no auto-renewal.
          </li>
        </ol>
      </section>

      <section className="portal-card" aria-labelledby="portal-start-title">
        <p className="section-label">Start now</p>
        <h2 id="portal-start-title">Run the gateway before we even meet</h2>
        <p>
          FetchMux is Apache-2.0 and self-hosted — your pilot configures and proves it on your
          workload. Try the zero-key route today:
        </p>
        <pre className="portal-code">
          {`git clone https://github.com/krutftw/fetchmux
cd fetchmux && npm clean-install && npm run build
$env:FETCHMUX_API_KEY = "any-long-random-key"
$env:CROSSREF_ENABLED = "true"
$env:CROSSREF_CONTACT_EMAIL = "you@example.com"
npm run dev:gateway`}
        </pre>
        <p>Point any MCP client at the gateway:</p>
        <pre className="portal-code">
          {`{
  "mcpServers": {
    "fetchmux": {
      "command": "npx",
      "args": ["-y", "@fetchmux/mcp"],
      "env": {
        "FETCHMUX_BASE_URL": "http://127.0.0.1:8787/",
        "FETCHMUX_API_KEY": "the-same-key"
      }
    }
  }
}`}
        </pre>
        <p className="portal-links">
          <a href="https://github.com/krutftw/fetchmux" rel="noreferrer">
            GitHub ↗
          </a>
          <a href="https://www.npmjs.com/package/@fetchmux/mcp" rel="noreferrer">
            npm: @fetchmux/mcp ↗
          </a>
          <a href="/openapi.yaml">OpenAPI contract</a>
        </p>
      </section>

      <section className="portal-card" aria-labelledby="portal-deliverables-title">
        <p className="section-label">Deliverables</p>
        <h2 id="portal-deliverables-title">Benchmark and scorecards</h2>
        <p>
          Your representative-workload benchmark report and each weekly scorecard are posted here as
          they are produced during the pilot, and mirrored to your purchase email. Nothing is
          available yet before the setup session.
        </p>
      </section>
    </>
  );
}
