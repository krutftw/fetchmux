# FetchMux real-provider proof

- **Verification date:** 2026-07-18 (Australia/Perth)
- **Environment:** local single-tenant gateway on loopback
- **Provider:** Crossref public scholarly metadata REST API
- **Purpose:** prove a real upstream request passes through FetchMux policy, authentication,
  normalization, and receipt generation without borrowing or fabricating a provider credential

## Result

The gateway was started with a temporary local FetchMux bearer key, `CROSSREF_ENABLED=true`, and the
monitored public contact `hello@fetchmux.com`. No upstream API key or browser session was used.

| Check | Observed result |
| --- | --- |
| `GET /health` | process healthy |
| `GET /ready` | ready; `availableProviders` contained only `crossref` |
| Authenticated `GET /v1/providers` | Crossref available, cost configured, `scholarly` supported, no issues |
| Authenticated `POST /v1/search` | HTTP 200; selected `crossref`; two normalized DOI results |
| FetchMux wall time | 1,933 ms |
| Recorded route latency | 1,920 ms |
| Estimated upstream API charge | USD 0 |
| Fallback | false |
| Receipt | trace ID, selected provider, attempt, latency, cost, and reason codes present |
| First returned title | `Retrieval-Augmented Generation` |
| First returned DOI URL | `https://doi.org/10.1002/9781394374717.ch03` |

The request used `task: scholarly`, `priority: cost`, `maxCostUsd: 0.001`,
`maxLatencyMs: 8000`, and `limit: 2`. Route logs contained only safe request-path, status, latency,
provider, cost, trace, and reason-code fields. They did not contain the query, bearer key, raw
upstream body, or result content. The exact process listening on the proof port was verified and
stopped after the request.

## Production-image verification

The same route was then rebuilt into the pinned Distroless production image and run with the
deployment hardening flags:

| Check | Observed result |
| --- | --- |
| Local image digest | `sha256:c896c4c0195baddd2df3cdd9d768386e776d43b34c48f781f130bac14eb27086` |
| Image size | 57,121,143 bytes |
| Runtime identity | `nonroot` |
| Filesystem and privileges | read-only root, all capabilities dropped, `no-new-privileges` |
| HTTP boundary | health 200, readiness 200, anonymous provider status 401 |
| Protected scholarly search | Crossref selected, two results, USD 0 upstream API-charge estimate, no fallback, trace present |
| Log leak checks | query absent, bearer value absent, known result DOI absent |
| Docker Scout | 78 packages indexed; zero critical, high, medium, or low findings |

The exact QA container was removed after verification. The image remains a local release artifact;
it is not evidence that the Azure revision or a public API has been updated.

## What this proves

- FetchMux can become ready with an explicitly enabled real upstream.
- A protected client request is routed, executed, normalized, and receipted end to end.
- A hard dollar ceiling can admit a provider whose documented upstream API charge is zero.
- The Crossref adapter uses an identified request and returns bibliographic metadata without
  selecting or copying abstracts.

## What this does not prove

- Crossref is not a substitute for general web search, page extraction, or a customer-authorized
  Brave, Tavily, Exa, or Firecrawl account.
- One request does not establish availability, latency, evidence quality, customer value, savings,
  scale, or production readiness.
- The zero estimate covers the Crossref API charge only. FetchMux compute, support, storage, and
  downstream model use are not free.
- This is not a provider comparison, partnership, endorsement, public benchmark, or customer result.

## Why Firecrawl keyless was not used

Firecrawl's [keyless launch documentation](https://www.firecrawl.dev/blog/firecrawl-keyless-launch)
describes agent identity and free credits. A direct anonymous request from this environment returned
HTTP 403 with a suspicious-IP classification. Firecrawl's documented identity path requires a valid
identity assertion and a trusted client registration. FetchMux did not invent an assertion, scrape a
session, or work around that control. Firecrawl therefore remains BYOK in FetchMux.

## Primary sources

- [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)
- [Crossref access and polite-pool guidance](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/)
- [Firecrawl keyless launch](https://www.firecrawl.dev/blog/firecrawl-keyless-launch)
