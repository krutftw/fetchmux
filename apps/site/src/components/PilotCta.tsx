interface PilotCtaProps {
  readonly contactUrl?: string;
  readonly ctaLabel?: string;
}

const defaultCtaUrl = "https://github.com/krutftw/fetchmux";
const defaultCtaLabel = "Get started on GitHub";
const firecrawlReferralUrl = "https://firecrawl.link/kurt-robert-landman";

export function PilotCta({ contactUrl, ctaLabel }: PilotCtaProps) {
  const safeUrl = normalizeContactUrl(contactUrl ?? defaultCtaUrl);
  const label = ctaLabel?.trim() || defaultCtaLabel;

  return (
    <section className="pilot-section page-shell" id="pilot" aria-labelledby="pilot-title">
      <div className="pilot-shell">
        <div className="pilot-card">
          <div className="pilot-copy">
            <p className="section-label">Open source</p>
            <h2 id="pilot-title">Run it yourself. Free and open source.</h2>
            <p>
              FetchMux is Apache-2.0. Self-host the gateway, bring your own provider keys, and keep
              every route receipt. No signup, no lock-in — nothing leaves your infrastructure.
            </p>
          </div>

          <section className="pilot-offer" aria-label="Get started with FetchMux">
            <p className="pilot-price">
              <strong>Free</strong>
              <span>Apache-2.0 · self-hosted · bring your own keys</span>
            </p>
            <ul>
              <li>Install and run in one command</li>
              <li>REST, TypeScript SDK, and MCP server</li>
              <li>Zero-key trial through the Crossref route</li>
            </ul>
            {safeUrl ? (
              <a
                className="pilot-action-link"
                href={safeUrl}
                rel={safeUrl.startsWith("https:") ? "noreferrer" : undefined}
              >
                <span>{label}</span>
                <span className="action-orb" aria-hidden="true">
                  ↗
                </span>
              </a>
            ) : null}
            <p className="pilot-referral">
              Need a provider? New Firecrawl users get{" "}
              <a href={firecrawlReferralUrl} target="_blank" rel="noreferrer sponsored">
                10% off their first month
              </a>{" "}
              <span className="pilot-referral-note">(referral link)</span>.
            </p>
            <p className="pilot-safety">
              A hosted, zero-setup version is in the works — star the repo to follow. Provider usage
              is billed by your provider; keys stay in your gateway, never on this site.
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
