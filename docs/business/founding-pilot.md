# FetchMux founding pilot

**Status:** internal commercial draft  
**Offer version:** 2026-07-16  
**Price hypothesis:** USD 750 setup plus USD 99 for the first month

This is a sales and delivery specification, not a contract, quote, tax invoice, warranty, or legal
advice. Counsel and an accountant must review the final customer agreement, tax treatment, privacy
terms, liability terms, and outcome commitment before anyone offers or accepts this pilot.

## Outcome

The pilot answers one question with the customer's own workload:

> Does a controlled retrieval policy improve one agreed operating metric enough to keep FetchMux?

The answer may be yes, no, or “use one provider directly.” A no result is useful if it prevents the
customer from buying unnecessary infrastructure.

## Who qualifies

A pilot customer must have all of the following:

- a production or near-production AI workflow that retrieves current web evidence;
- at least 500 monthly retrievals, or a lower-volume workflow where a failure is materially costly;
- one existing provider account and authority to evaluate a second where needed;
- a representative query set that can be used under the provider and source-site terms;
- one measurable baseline and someone who can judge the outcome;
- a technical owner who can deploy a single-tenant service or integrate REST, TypeScript, or MCP;
- authority and budget to approve the pilot.

Disqualify a lead that wants pooled credits, hidden provider identity, automated account creation,
regulated decision-making without review, a public provider comparison, or a free custom build.

## Commercial shape

| Item | Draft position |
| --- | --- |
| Setup | USD 750 before integration work starts |
| First month | USD 99 for a 30-day monitored evaluation |
| Provider usage | Paid directly by the customer through customer-owned accounts |
| Hosting | Customer-controlled local or single-tenant deployment in the founding offer |
| Included founder time | Up to eight hours after setup, tracked internally |
| Custom development | Excluded unless separately scoped and priced |
| Renewal | No automatic renewal in the founding draft; present a separate subscription choice |

Prices exclude any taxes and payment fees that the final entity is required to charge. No payment
may be accepted until entity, tax, invoice, payment, refund, and contract gates are complete.

## Customer inputs

The customer supplies:

1. a named technical owner and outcome owner;
2. a written workload description and permitted-use confirmation;
3. 50 to 250 representative queries, or a safe private query reference file;
4. current provider account, plan, cost unit, quota, and keys through an agreed secure mechanism;
5. baseline calls, failures, latency, provider cost, and engineering effort where available;
6. an agreed primary success metric and judging method;
7. deployment access limited to the customer-controlled environment;
8. timely review during setup, midpoint, and closeout.

FetchMux never asks for a provider key in email, chat, an issue, a proposal, or a benchmark file.

## FetchMux deliverables

- kickoff and data-flow review;
- terms and workload-use checkpoint, recorded as a gate rather than legal approval;
- baseline measurement plan;
- single-tenant gateway installation and one client integration;
- up to two initially enabled providers unless separately agreed;
- versioned cost profile from the customer's actual account information;
- deterministic routing policy with hard cost and deadline controls;
- safe provider status, route previews, route receipts, and structured events;
- private weekly scorecard;
- one midpoint policy review;
- final keep, change, direct-provider, or stop recommendation;
- removal and key-rotation checklist at closeout.

The pilot does not include provider procurement, provider-credit resale, public benchmark rights,
24-hour support, a hosted credential vault, multi-tenant isolation, custom compliance certification,
or guaranteed provider availability.

## Measurement design

Choose one primary metric before changing routing:

- **Policy-success rate:** successful evidence retrievals inside declared cost and latency limits,
  divided by eligible requests.
- **Failure recovery:** retryable primary-provider failures recovered inside the original policy,
  divided by retryable primary-provider failures with an eligible fallback.
- **Customer quality outcome:** accepted evidence or downstream task success under a written rubric.
- **Engineering effort:** measured hours per month spent maintaining provider integration and
  handling retrieval incidents.
- **Cost per accepted retrieval:** customer-reconciled provider and downstream processing cost,
  divided by accepted retrievals.

HTTP 200, result count, GitHub stars, or an LLM judge alone is not a customer outcome.

Baseline and treatment must use the same eligibility rules, workload classes, time window where
practical, and result-judging process. Record exclusions and product changes that make the periods
non-comparable. Estimated provider cost must remain separate from billed cost.

## Schedule

| Period | Work | Exit evidence |
| --- | --- | --- |
| Pre-start | qualification, contract, data and provider gates | signed scope and paid invoice |
| Days 1–3 | kickoff, baseline, deployment, credential injection | baseline and first safe preview |
| Days 4–7 | controlled traffic and policy verification | first successful production-like request |
| Week 2 | monitor failures, cost variance, quality signal | midpoint scorecard |
| Week 3 | one evidence-backed policy adjustment if needed | change record |
| Week 4 | final measurement and recommendation | final scorecard and customer decision |

Pause the clock when a required customer input, provider account, permission, or production access
is unavailable. Do not manufacture activity to fill the schedule.

## Outcome commitment draft

If the agreed primary metric does not improve and the customer records no reduction in integration
or operational work, the commercial draft waives the USD 99 first-month charge. The USD 750 setup
fee pays for completed baseline, installation, and integration work and is not described as
refundable once that work begins.

Counsel must convert or remove this language before use. The final agreement must define measurement
eligibility, customer dependencies, exclusions, refunds or credits, provider outages, force majeure,
termination, and the sole remedy. Do not describe this as a savings guarantee.

## Data and security boundary

- Deploy one trust boundary per customer.
- Customer keys stay in the customer-controlled process environment or secret system.
- The standard gateway stores no database records and excludes query/result content from route
  events.
- Private benchmark reports can contain URLs and labels and must use agreed storage and deletion.
- Provider and source-site terms still apply to queries and returned content.
- No production personal, health, legal, financial, employment, or other regulated data enters the
  pilot without a separate legal, privacy, and security review.
- A security or credential incident invokes the incident runbook and can pause the pilot.

## Support boundary

Founding support is best-effort during a mutually recorded business-hours window. There is no uptime,
response-time, recovery-time, or provider-performance SLA. Support accepts request IDs, timestamps,
route receipts, safe error codes, and sanitized configuration status. It never requests raw keys or
private queries through ordinary messaging.

## Start checklist

- [ ] Lead passed qualification and buyer authority is confirmed.
- [ ] Final entity can contract, invoice, collect tax, and receive payment.
- [ ] Counsel-approved pilot agreement is signed.
- [ ] Customer's accepted provider terms and intended use were reviewed.
- [ ] Data map, retention, deletion, and incident contacts are recorded.
- [ ] Workload and primary metric are frozen before treatment.
- [ ] Provider cost provenance and comparison permissions are recorded.
- [ ] Secure credential path is tested without exposing a key.
- [ ] Setup invoice is paid and read back from the real payment system.

## End checklist

- [ ] Final scorecard separates measured, estimated, billed, and human-labelled fields.
- [ ] Customer chooses keep, direct-provider, change, or stop.
- [ ] Subscription is a separate affirmative choice.
- [ ] Temporary access is removed.
- [ ] Keys are rotated where required.
- [ ] Reports and support material follow the agreed retention decision.
- [ ] Case-study or testimonial use remains opt-in and separately approved.
