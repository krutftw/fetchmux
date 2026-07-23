interface PilotCtaProps {
  readonly contactUrl?: string;
  readonly ctaLabel?: string;
}

const defaultPilotContactUrl = "https://buy.stripe.com/14A4gz5FDeLL9haf4Q7ok01";
const defaultCtaLabel = "Buy the founding pilot";

export function PilotCta({ contactUrl, ctaLabel }: PilotCtaProps) {
  const safeContactUrl = normalizeContactUrl(contactUrl ?? defaultPilotContactUrl);
  const label = ctaLabel?.trim() || defaultCtaLabel;

  return (
    <section className="pilot-section page-shell" id="pilot" aria-labelledby="pilot-title">
      <div className="pilot-shell">
        <div className="pilot-card">
          <div className="pilot-copy">
            <p className="section-label">Founding implementation</p>
            <h2 id="pilot-title">A paid pilot. Not a waitlist.</h2>
            <p>
              Bring one real retrieval workload. We will benchmark it, connect REST or MCP, and
              agree on one outcome: lower cost, lower latency, or better completion. If routing does
              not help, you leave with the evidence.
            </p>
          </div>

          <section className="pilot-offer" aria-label="Founding pilot intake">
            <p className="pilot-price">
              <strong>USD 849</strong>
              <span>first 30 days: USD 750 setup + USD 99 pilot</span>
            </p>
            <ul>
              <li>Representative workload benchmark</li>
              <li>Gateway policy and integration</li>
              <li>Weekly outcome scorecard</li>
            </ul>
            {safeContactUrl ? (
              <a
                className="pilot-action-link"
                href={safeContactUrl}
                rel={safeContactUrl.startsWith("https:") ? "noreferrer" : undefined}
              >
                <span>{label}</span>
                <span className="action-orb" aria-hidden="true">
                  ↗
                </span>
              </a>
            ) : (
              <div className="pilot-unavailable" role="status">
                <strong>Pilot intake is being connected.</strong>
                <span>The application address will appear here once delivery is verified.</span>
              </div>
            )}
            <p className="pilot-safety">
              Checkout opens your pilot portal immediately — no email round trip. Provider usage is
              billed separately by your provider; keys are exchanged only through the agreed secure
              channel, never email.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}

function normalizeContactUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "mailto:" ? url.toString() : null;
  } catch {
    return null;
  }
}
