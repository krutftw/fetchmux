interface PilotCtaProps {
  readonly contactUrl?: string;
}

export function PilotCta({ contactUrl }: PilotCtaProps) {
  const safeContactUrl = normalizeContactUrl(contactUrl);

  return (
    <section className="pilot-section page-shell" id="pilot" aria-labelledby="pilot-title">
      <div className="pilot-shell" data-reveal>
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
              <strong>$750</strong>
              <span>setup + $99 first month</span>
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
                <span>Book a founding pilot</span>
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
