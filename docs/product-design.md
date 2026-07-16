# FetchMux Product Decision

**Date:** 2026-07-16<br>
**Status:** Approved founding direction<br>
**Brand status:** Provisional working name

## Executive decision

Build a provider-neutral retrieval router for AI agents, beginning with web search and page retrieval. A client sends one stable request, states what matters for that request, and FetchMux chooses among configured providers, normalizes the evidence, enforces a budget, fails over safely, and returns an auditable route receipt.

Do not begin as a universal API marketplace. Do not resell provider access without written rights. Do not hide provider differences behind a lowest-common-denominator response.

## Why this wedge

AI applications increasingly need external evidence, but retrieval providers differ materially by query type, freshness, fetch behavior, latency, price, and failure mode. Teams currently hard-code one provider, build brittle fallback logic, or maintain several bespoke adapters. That creates measurable engineering and usage cost.

The commercial wedge is not "more APIs." It is a better decision at the moment an agent needs evidence:

- select a suitable provider for the task and policy;
- keep the application contract stable when providers change;
- stop requests that would exceed an explicit budget;
- fail over on transient provider faults without duplicating unsafe writes;
- return normalized sources plus enough routing metadata to debug and improve decisions;
- let customers keep their own provider agreements and credentials.

## Target customer

The first ideal customer is a small AI product or automation team that:

- runs production agents or retrieval-augmented workflows;
- already pays for at least one search, crawl, or extraction API;
- expects to add a second provider for quality, resilience, or cost;
- lacks a dedicated platform team;
- can install a TypeScript SDK, call REST, or connect an MCP server;
- can measure failed retrievals, answer quality, latency, or provider spend.

The economic buyer is a technical founder, head of engineering, or AI platform lead. The first user is an application engineer or agent developer.

## Jobs to be done

1. "When my agent needs current evidence, choose a provider that fits this request without making me maintain provider-specific code."
2. "When a provider is slow, rate-limited, or down, recover within my cost and latency limits."
3. "When a retrieval result is poor or expensive, show me why it was routed that way."
4. "When I evaluate providers, run the same workload and give me comparable evidence instead of marketing claims."

## Product contract

The stable request is intentionally small:

```json
{
  "query": "What changed in Australia's Privacy Act this month?",
  "priority": "quality",
  "task": "fresh_facts",
  "freshness": "30d",
  "maxCostUsd": 0.03,
  "maxLatencyMs": 8000,
  "limit": 8
}
```

The response preserves evidence and routing truth:

```json
{
  "data": {
    "results": [
      {
        "title": "...",
        "url": "https://example.com/source",
        "snippet": "...",
        "publishedAt": "2026-07-10T00:00:00.000Z",
        "provider": "brave",
        "rank": 1
      }
    ],
    "route": {
      "selectedProvider": "brave",
      "attemptedProviders": ["brave"],
      "reasonCodes": ["FRESHNESS_MATCH", "WITHIN_BUDGET"],
      "estimatedCostUsd": 0.005,
      "latencyMs": 423,
      "fallbackUsed": false,
      "traceId": "rt_..."
    }
  }
}
```

Provider-native metadata may be exposed in an explicitly namespaced extension. FetchMux never fabricates a normalized field when a provider did not supply it.

## Routing design

The first router is deterministic and inspectable, not LLM-driven.

1. Validate the request and hard limits.
2. Classify only from declared task and simple query signals.
3. Filter to enabled providers with compatible capabilities and credentials.
4. Reject candidates whose estimated worst-case cost breaches the request budget.
5. Score candidates from static capability profiles plus observed reliability and latency.
6. Attempt the highest-scoring candidate.
7. Fail over only on classified retryable failures and only while remaining within budget and deadline.
8. Normalize results and emit a route receipt.
9. Accept optional outcome feedback separately so routing can improve without silently changing the original trace.

Early routing profiles:

| Task | Favoured capability | Candidate examples |
| --- | --- | --- |
| `fresh_facts` | recency and broad index | Brave, Tavily |
| `deep_research` | semantic relevance and research depth | Exa, Tavily |
| `page_content` | fetch/extraction reliability | Firecrawl, Exa |
| `balanced` | reliability-adjusted quality per dollar | all configured providers |

These are hypotheses. The public benchmark and customer outcomes must update them.

## Security and credential model

The founding release is BYOK and local/self-hostable first.

- Provider keys load from process environment or an injected secret resolver.
- Keys are never accepted in query strings, returned in errors, or written to route receipts.
- Logs use structured allowlists rather than serializing full requests or provider responses.
- A hosted credential vault is out of scope until encryption, rotation, tenant isolation, audit logging, and incident response are designed and reviewed.
- Search and fetched content are untrusted data. They are never interpreted as instructions by the router.

## MVP scope

### Included

- provider interface and capability profiles;
- deterministic policy router;
- per-request budget and deadline enforcement;
- transient-failure classification, fallback, and circuit breaking;
- normalized result schema and route receipts;
- Brave, Tavily, Exa, and Firecrawl BYOK adapters;
- REST endpoint and MCP tool;
- offline fixtures and an opt-in live benchmark runner;
- a public-facing benchmark report format;
- marketing/pricing site and pilot application flow;
- Docker and local deployment documentation.

### Explicitly excluded

- payment processing or pooled provider credits;
- storing customer credentials in a hosted service;
- autonomous purchasing or provider sign-up;
- write APIs such as payments, messaging, or trading;
- browser automation as a routed capability;
- learned routing before enough labeled outcomes exist;
- claims that benchmark winners are universal or permanent.

## Expansion rule

FetchMux may add one capability only when all are true:

1. At least five paying customers request it.
2. At least two credible providers expose meaningfully substitutable operations.
3. FetchMux can add measurable value through routing, normalization, policy, or failover.
4. Provider terms permit the intended integration model.
5. The new capability does not weaken reliability of the retrieval product.

Likely next capabilities are page extraction, browser sessions, and read-only blockchain RPC. Write-heavy or regulated operations remain later-stage products with separate safety contracts.

## Product principles

- Evidence before breadth.
- Customer-owned provider relationships before resale.
- Hard budgets before clever optimization.
- Explainable routing before learned routing.
- Provider-specific truth before false uniformity.
- Measured outcomes before benchmark theatre.
- One paid pain point before a marketplace.
