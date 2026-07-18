# FetchMux pilot readiness decision

- **Decision date:** 2026-07-18 (Australia/Perth)
- **Commercial posture:** prepare and qualify founder-led B2B pilots; do not accept payment yet
- **Product posture:** suitable for a controlled single-tenant BYOK pilot; not a public self-serve API

## Decision

FetchMux has enough implemented product to demonstrate, scope, and deliver one supervised founding
pilot. The release is deliberately an implementation service around a private FetchMux gateway:
the customer owns every provider account, credentials enter through an agreed secure channel, and
each customer receives an isolated deployment. The customer pays provider usage directly.

FetchMux is not ready for public self-serve signup, pooled provider credits, a shared multi-tenant
gateway, unsupervised onboarding, or claims based on customer outcomes. It has no tenant-level auth,
quota or abuse system, hosted credential vault, metering, billing, durable routing analytics, public
package, SLA, or production disaster-recovery proof. Those are later-product requirements, not
features to imply in the founding offer.

No payment may be accepted until the entity, tax, invoice, payment, refund, contract, privacy, and
provider-rights gates below are closed. A prospective customer may apply by email, but the public
site and intake must never request provider keys or private queries.

## Current evidence

| Area | Evidence | Decision |
| --- | --- | --- |
| Retrieval core | Deterministic routing, hard budgets and deadlines, safe fallback, route receipts | Pilot-ready |
| Provider surface | BYOK adapters for Brave, Tavily, Exa, and Firecrawl plus explicit-opt-in Crossref scholarly metadata | Pilot-ready, account terms still checked per customer |
| Interfaces | Authenticated REST, typed TypeScript SDK, read-only MCP, versioned OpenAPI | Pilot-ready |
| Packaging | Non-root container, reproducible Azure templates, single-tenant runbooks | Pilot-ready |
| Public discovery | Human site, OpenAPI, `llms.txt`, robots, sitemap, canonical metadata | Live |
| Intake | Explicit `hello@` and `security@` routes, verified destination, disabled catch-all | Live |
| Payment tooling | Official Stripe skill, CLI, curated plugin, and OAuth MCP installed; application-only site | Test preparation only |
| Staging | HTTPS health responds; readiness deliberately fails with zero provider keys; auth blocks anonymous protected calls | Safe but not a live-provider proof |
| Next staging deployment | Bicep and PowerShell now support explicit Crossref enablement and a protected live-search read-back | Locally validated; Azure apply blocked until the owner refreshes the CLI session required by Entra security defaults |
| Real upstream proof | Protected local request routed through FetchMux to Crossref and returned two DOI results with a receipt | Passed locally; not yet an Azure or customer-provider proof |
| Demand | No qualified interviews, paid pilots, customer outcomes, or recurring revenue | Unproven |
| Hosted SaaS | No tenant isolation, quotas, billing, abuse controls, or durable telemetry | Not ready |

## Verification at decision time

- 28 Vitest files passed with 231 tests and no failures.
- Workspace TypeScript, Biome, OpenAPI lint, production build, and `git diff --check` passed.
- `npm audit --audit-level=low` reported zero vulnerabilities; full-history Gitleaks scanned 50
  commits and both history and working-tree scans reported no leaks.
- The founding benchmark validated 24 cases across four providers: 96 planned calls, zero executed
  calls, and zero network calls.
- The 57 MB production image ran as `nonroot` with a read-only root filesystem, all capabilities
  dropped, and `no-new-privileges`. Health returned 200; readiness returned the deliberate 503 with
  no provider; protected routes remained unavailable without authentication configuration.
- Docker Scout indexed 78 packages and reported zero critical, high, medium, or low findings.
- The updated 57,121,143-byte production image ran as `nonroot` with a read-only root filesystem,
  all capabilities dropped, and `no-new-privileges`; a protected Crossref request returned two
  results and its query, bearer value, and result content were absent from container logs.
- The new multiplexer favicon was rendered and inspected at 16, 32, and 64 pixels; the site brand
  mark uses the same three-input, one-output geometry.
- Cloudflare Email Routing read-back confirmed routing enabled, both explicit aliases present, a
  ready domain status, and catch-all disabled.
- Stripe's official best-practices skill and CLI are installed, the curated Stripe plugin is
  enabled, and the official remote MCP OAuth session is authenticated. No live product, price,
  payment link, subscription, or tax registration was created.
- A loopback-only gateway enabled Crossref explicitly, reported ready, and completed one protected
  scholarly request with two normalized DOI results, no fallback, a route receipt, and an estimated
  upstream API charge of USD 0. The process was stopped after verification. See the
  [real-provider proof](live-provider-proof-2026-07-18.md).

## Gates before the first invoice

- [ ] Register and record the operating entity, ABN and any required business name.
- [ ] Confirm tax treatment, invoice fields, currency display, payment method, refunds, and
  chargeback handling with an accountant.
- [ ] Complete ASIC/IP Australia name and trademark clearance; the domain alone is not clearance.
- [ ] Have Australian counsel review the pilot agreement, privacy notice, data-processing terms,
  liability, warranties, consumer-law exposure, confidentiality, outcome language, and cancellation.
- [ ] Review the operative terms and the customer's plan for every enabled provider. Obtain explicit
  approval before any pooled-credit resale, public provider benchmark, or partner representation.
- [ ] Define the secure credential exchange, customer access boundary, deletion evidence, incident
  contact, backup/restore expectation, support hours, and closeout key rotation in the signed scope.
- [ ] Configure one real customer-authorized provider in the customer's isolated environment and
  pass readiness, protected search, failure, shutdown, and leak checks before handoff.
- [ ] In Stripe test mode, read back the account, create the one-time USD 849 pilot checkout, verify
  no subscription or automatic tax, complete a test checkout, and reconcile the resulting event.
- [ ] Repeat with a least-privilege live restricted key only after Stripe activation and every prior
  invoice gate passes; never publish a generic live payment link on the application site.

Official Australian starting points: [Business Registration
Service](https://register.business.gov.au/), [business names and trading
names](https://business.gov.au/planning/new-businesses/business-names-trading-names-and-legal-names),
[ATO GST registration threshold](https://www.ato.gov.au/api/public/content/0-1e92db95-a75c-4f4e-a3d4-39f43b1a3b25),
[OAIC small-business coverage](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business),
and [ACCC selling products and services](https://www.accc.gov.au/business/selling-products-and-services).

## Gates before public self-serve

- [ ] Tenant-scoped identity, authorization, key rotation, quotas, rate limiting, and abuse response.
- [ ] Isolated encrypted provider-secret lifecycle with access audit and tested deletion.
- [ ] Durable metering, billing, subscription, tax, refund, reconciliation, and fraud controls.
- [ ] Durable routing health and outcome telemetry that excludes query content by default.
- [ ] Production capacity, availability targets, alerting, status page, backups, restore drills,
  incident exercises, support policy, and cost limits.
- [ ] Public package and image supply chain, licensing decision, release provenance, version support,
  and upgrade/rollback policy.
- [ ] At least three paid pilots and two measured customer improvements before stronger outcome or
  savings claims.

## Commercial kill criteria

Do not expand the build merely because the software can be expanded. Reassess the model if ten
qualified conversations produce no urgent paid pain, if three scoped pilots will not pay the current
price, or if customers cannot provide a measurable workload. Build multi-tenant SaaS only after the
single-tenant offer demonstrates repeatable demand and enough margin to fund its security and
operational burden.
