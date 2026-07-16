const plans = [
  {
    name: "Founding pilot",
    price: "$750 setup + $99 first month",
    label: "Paid implementation",
    description:
      "Your workload, your provider accounts, a measured baseline, routing configuration, and a weekly scorecard.",
    features: [
      "Representative workload benchmark",
      "REST or MCP integration",
      "One agreed outcome metric",
    ],
    featured: true,
  },
  {
    name: "Pro",
    price: "$49 / month",
    label: "Price hypothesis",
    description: "The self-serve route for small production teams after the pilot proves demand.",
    features: ["Four BYOK adapters", "Hard policy budgets", "Route receipts"],
    featured: false,
  },
  {
    name: "Team",
    price: "$199 / month",
    label: "Price hypothesis",
    description: "Shared routing policy and longer operational history for platform teams.",
    features: ["Shared policy sets", "Scheduled benchmarks", "Alerts and priority support"],
    featured: false,
  },
] as const;

export function Pricing() {
  return (
    <section className="pricing-section section-shell" id="pricing" aria-labelledby="pricing-title">
      <div className="section-index" aria-hidden="true">
        05 / COMMERCIAL
      </div>
      <div className="section-heading">
        <p className="eyebrow">Start with paid proof</p>
        <h2 id="pricing-title">Pricing hypotheses, not pricing theatre.</h2>
        <p>
          Provider usage remains billed by the provider. FetchMux charges for integration, routing
          policy, and operational evidence.
        </p>
      </div>
      <section className="pricing-grid" aria-label="Pricing hypotheses">
        {plans.map((plan) => (
          <article className="price-card" data-featured={plan.featured} key={plan.name}>
            <p className="plan-label">{plan.label}</p>
            <h3>{plan.name}</h3>
            <p className="plan-price">{plan.price}</p>
            <p>{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <p className="pricing-disclosure">
        Pro and Team are experiments until buying conversations and paid pilots establish
        willingness to pay. No pooled provider credits are included.
      </p>
    </section>
  );
}
