# FetchMux provider partnership brief

**Status:** internal draft; not approved for sending  
**Provisional brand:** FetchMux  
**Current relationship:** independent integrator; no partnership, endorsement, referral right, or
resale right is claimed

This brief becomes external only after the owner approves contact and counsel reviews the requested
relationship, provider terms, branding, data use, benchmarking, and commercial model.

## One-line description

FetchMux is a customer-controlled retrieval policy gateway that lets an AI application call one
stable read-only interface while using customer-owned provider accounts under explicit cost,
deadline, routing, and fallback rules.

## What exists

- deterministic router with hard pre-request budget and absolute deadline accounting;
- retryable-failure-only fallback and circuit breaking;
- BYOK adapters for Brave, Tavily, Exa, and Firecrawl;
- REST, TypeScript SDK, and read-only MCP tools;
- safe provider status and auditable route receipts;
- reproducible private benchmark runner with a zero-network dry mode;
- single-tenant Docker deployment and operating runbooks.

The integration does not pool keys, hide provider identity, create accounts, resell credits, scrape
provider dashboards, or claim provider outputs are identical.

## Customer-demand evidence to supply later

Do not send a partner a market projection in place of usage. Complete only from real records:

| Evidence | Current value |
| --- | --- |
| Qualified conversations | 0 |
| Paid pilots | 0 |
| Paying customers | 0 |
| Monthly routed requests | 0 |
| Provider-attributed calls | 0 |
| Common workload classes | Unknown |
| Customer-requested provider | Unknown |
| Measured improvement | None yet |

Approach a provider when at least three qualified customers request that integration or when the
provider's published partner path clearly fits. Do not manufacture volume forecasts.

## Architecture and responsibility

| Area | FetchMux | Customer | Provider |
| --- | --- | --- | --- |
| Application contract and route policy | Owns and supports | Configures | Not responsible |
| Provider account and accepted plan | Does not own | Owns and pays | Provisions and bills |
| Provider key | Reads in customer process | Stores/injects | Issues/revokes |
| Provider API behavior | Adapts documented fields | Chooses permitted use | Owns endpoint/service |
| FetchMux fallback | Implements inside policy | Approves policy | Not responsible for other providers |
| Provider incident | Classifies safely | Checks account/quota | Owns provider service/support |
| Customer data and end-user notices | Documents gateway flow | Owns customer obligations | Owns its stated processing |

FetchMux support must not impersonate provider support. Provider-specific billing, quota, account,
or raw-result disputes go to the provider through the customer's account.

## Attribution and product truth

FetchMux preserves provider identity in normalized results and route receipts. External material can
use a provider's plain-text name only as allowed for compatibility descriptions. Logos, badges,
quotes, customer lists, comparative claims, and “partner” language require explicit rights.

Normalized fields are minimal. Provider-native fields are not fabricated, and a stable FetchMux
request does not promise identical provider indexing, ranking, freshness, or extraction.

## Initial ask

The first provider conversation should request written clarity, not money:

1. Is customer-owned BYOK use through this single-tenant gateway permitted for customer applications?
2. Which attribution, trademark, end-user, and support language is required?
3. Which result fields may be transiently normalized, logged as metrics, retained, or shown to end
   users?
4. May a customer run a private workload evaluation? May any results or analysis be disclosed?
5. Is there an official integration directory, technology-partner, referral, startup-credit, or
   marketplace route?
6. What volume and security evidence is expected before a custom agreement?
7. Who owns first-line and second-line support for an integrated customer?

Do not ask for resale or pooled billing until real demand, metering, tax, fraud, support, and written
rights exist.

## Possible relationship ladder

| Stage | Relationship | Gate |
| --- | --- | --- |
| 0 | Independent customer-side integration | Counsel confirms permitted BYOK use |
| 1 | Documentation/integration listing | Provider accepts technical and brand description |
| 2 | Disclosed referral | Written referral terms, attribution, tax, and conflict disclosure |
| 3 | Marketplace procurement | Provider programme, support split, billing and data agreement |
| 4 | Custom provider agreement | Demonstrated volume, security review, service and disclosure rights |
| 5 | Managed usage/resale | Separate written resale rights, metering, fraud, refunds, tax, and customer contract |

Skipping stages creates legal and margin risk without proving demand.

## Provider-specific questions from current research

- **Brave:** current terms include restrictions relevant to storage, redistribution, resale, and
  benchmark/evaluation use. Ask for explicit rights matching the deployment and any scorecard.
- **Tavily:** current terms permit customer-application integration but restrict performance-analysis
  disclosure and other uses. Ask how private customer evaluation and integration directories are
  handled.
- **Exa:** current terms grant limited API rights subject to documentation and limits. Ask for the
  approved commercial integration, result-retention, and comparison boundaries.
- **Firecrawl:** current terms contain commercial-use language requiring clarification. Ask which
  self-serve or order-form plan expressly covers the proposed customer application.

These are questions, not conclusions. Re-open the operative terms immediately before contact.

## Technical appendix for a provider review

Be ready to supply, without secrets or customer data:

- architecture and data-flow diagram;
- exact adapter request mapping and user agent;
- rate-limit and backoff behavior;
- classified error and retry table;
- credential storage and redaction tests;
- example route receipt using fabricated data;
- expected volume derived from signed pilots;
- incident and abuse contact;
- deletion and retention behavior;
- requested public wording.

## Send gate

- [ ] Owner approved the provider and named contact.
- [ ] A real demand signal or official programme justifies contact.
- [ ] Entity and sender identity are ready.
- [ ] Counsel reviewed the ask and current terms.
- [ ] Brand wording and attachments contain no false relationship claim.
- [ ] Volume numbers come from real records.
- [ ] No customer name, workload, output, key, or result is disclosed without permission.

