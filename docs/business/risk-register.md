# FetchMux Risk Register

**Scale:** likelihood and impact are Low, Medium, or High. Controls are required product work, not legal conclusions.

| Risk | Likelihood | Impact | Early signal | Founding control | Escalation trigger |
| --- | --- | --- | --- | --- | --- |
| Provider terms prohibit resale or redistribution | High | High | Terms mention no resale, sublicensing, redistribution, or service bureau use | BYOK; link to official signup; retain provider identity; no pooled credits | Before any managed usage or bundled credits, obtain written legal review and provider agreement |
| Customer keys leak through logs or errors | Medium | Critical | Secret-shaped values appear in logs, traces, crash reports, or support exports | Environment/injected resolver; allowlist logs; redaction tests; never use query strings | Before hosted key storage, complete security design and external review |
| Cross-tenant credential or data access | Low initially | Critical | Tenant identifier missing from secret, cache, trace, or metric path | Local/single-tenant first; no hosted vault in MVP | Any multi-tenant hosted pilot requires explicit isolation tests and threat model |
| Prompt injection in retrieved content | High | High | Fetched pages contain instructions targeting the agent or router | Treat content as data; no LLM in routing; label provenance; document downstream handling | Before adding summarization or autonomous browsing, threat-model content execution |
| Provider outage or rate limit cascades cost/latency | High | High | Elevated 429/5xx, timeout, repeated fallback | deadline and budget accounting across attempts; circuit breaker; retry classification | Any fallback that breaches a declared policy is a release blocker |
| Estimated cost diverges from billed cost | Medium | High | Provider invoice materially exceeds route receipts | versioned price profiles; worst-case budget check; reconciliation tooling | Over 5% unexplained variance pauses cost-savings claims |
| False normalization hides provider semantics | Medium | High | Empty or misleading fields appear equivalent across providers | minimal common schema; provider namespace; never fabricate fields | A customer outcome failure caused by normalization triggers schema review |
| Benchmark is biased, stale, or contaminated | High | High | Provider order, query set, fetch policy, or labels favour one provider | publish methodology, dates, raw permitted metrics, query classes, and limitations; rotate holdout workloads | Provider challenge or material ranking change requires correction and changelog |
| Benchmark violates provider data-use terms | High | High | Terms restrict storage, display, redistribution, benchmarking, or performance disclosure | Keep live results private; store only permitted data; review the accepted account terms and obtain any required written permission | Any comparative publication or externally shared scorecard requires counsel and provider clearance |
| Product is a thin wrapper customers rebuild | High | High | Buyers value adapter code but not routing, receipts, benchmark, or monitoring | sell measurable policy success and operational evidence; open basic adapters if useful | Failure to improve metrics by day 45 triggers pivot |
| Incumbent adds equivalent routing | Medium | Medium | Provider or gateway ships multi-search policy routing | remain provider-neutral; own benchmark methodology and outcome dataset; integrate rather than compete where possible | Reassess wedge quarterly |
| Free hosted usage creates negative margin or abuse | High | High | Bots, key sharing, high egress, no conversion | no unbounded hosted free tier; local runner is free; quotas and auth for hosted service | Any hosted preview requires rate limits and cost caps |
| Privacy or regulated data enters queries | Medium | High | Customers submit personal, health, legal, or confidential text | data-minimization defaults; configurable logging; retention controls; DPA before enterprise | Regulated workload requires legal/privacy review and appropriate hosting controls |
| Brand/domain conflicts | Medium | Medium | prior trademark, company, package, or active product discovered | FetchMux remains provisional; no public claim of clearance | Before registration or launch spend, run professional trademark and registrar checks |
| Founder-led services do not scale | High | Medium | more than eight post-setup hours per pilot | strict qualification, templates, onboarding telemetry, price custom work | Reprice or decline accounts exceeding the guardrail |

## Non-negotiable release blockers

- A provider credential can appear in a response, route receipt, or default log.
- A fallback can exceed `maxCostUsd` or the request deadline without an explicit error.
- The router retries an unsafe write operation. The MVP routes read-only retrieval only.
- A public benchmark lacks its query set description, dates, provider configuration, fetch policy, and limitations.
- A provider-specific result is published without documented terms review and any required written permission.
- Marketing states or implies a provider partnership, resale right, customer result, or domain/trademark ownership that does not exist.
