interface PilotCtaProps {
  readonly contactUrl?: string;
}

export function PilotCta({ contactUrl }: PilotCtaProps) {
  const safeContactUrl = normalizeContactUrl(contactUrl);

  return (
    <section className="pilot-cta section-shell" id="pilot" aria-labelledby="pilot-title">
      <div>
        <p className="eyebrow">Founding intake</p>
        <h2 id="pilot-title">Bring a real workload. Leave with a routing decision.</h2>
      </div>
      <section className="pilot-action" aria-label="Founding pilot intake">
        {safeContactUrl ? (
          <>
            <p>
              Best fit: a production or near-production AI workflow evaluating at least two
              retrieval providers.
            </p>
            <a
              className="button button-dark"
              href={safeContactUrl}
              rel={safeContactUrl.startsWith("https:") ? "noreferrer" : undefined}
            >
              Apply for a founding pilot
            </a>
          </>
        ) : (
          <div className="pilot-unavailable" role="status">
            <strong>Pilot intake is not configured yet.</strong>
            <span>
              This local build will show an application link only after a real contact destination
              is configured.
            </span>
          </div>
        )}
      </section>
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
