# FetchMux source register

**Research date:** 2026-07-16  
**Last verified:** 2026-07-16  
**Purpose:** trace market, pricing, terms, API-contract, competitor, and community claims used in
the founding decision.

Prices, terms, repository counts, product capabilities, and API contracts can change. Re-open the
primary source before using any entry in customer copy, a proposal, a provider comparison, or a
commercial agreement. A source entry records evidence; it is not legal advice or provider approval.

## Evidence classes

- **Primary:** a provider's official documentation, pricing, terms, API reference, an original
  repository, GitHub's REST API, or an original research paper.
- **Community:** a discussion or user-authored comparison. It can reveal language, objections, and
  hypotheses, but it does not establish representative demand or product performance.
- **Founder inference:** a decision drawn from multiple sources. It must remain labelled as an
  inference until customer or revenue evidence validates it.

## Provider pricing and API contracts

| ID | Publisher and source | Direct URL | Evidence | Caveat |
| --- | --- | --- | --- | --- |
| P-01 | Brave, Search API pricing | [Pricing](https://api-dashboard.search.brave.com/documentation/pricing) | Search is listed at USD 5 per 1,000 requests, includes USD 5 monthly credit, and lists 50 requests per second. | Primary; account terms, taxes, and custom plans can differ. |
| P-02 | Brave, authentication guide | [Authentication](https://api-dashboard.search.brave.com/documentation/guides/authentication) | A customer subscribes, creates an API key, and sends it in `X-Subscription-Token`. | Primary; supports BYOK onboarding, not credential resale. |
| P-03 | Tavily, credits and pricing | [Credits and pricing](https://docs.tavily.com/documentation/api-credits) | Free tier is listed as 1,000 monthly credits; paid credit rates are listed from USD 0.005 to USD 0.008; basic search costs one credit and advanced search two. | Primary; price per request depends on plan and mode. |
| P-04 | Tavily, Search API reference | [Search endpoint](https://docs.tavily.com/documentation/api-reference/endpoint/search) | `POST /search` uses bearer authentication and exposes materially different search-depth, content, domain, date, and country controls. | Primary; the common FetchMux schema cannot imply identical behavior. |
| P-05 | Exa, pricing | [Pricing](https://exa.ai/pricing) | Base Search is listed at USD 7 per 1,000 requests up to ten results; Deep Search and other endpoints have different prices. | Primary; additional results and contents can add cost. |
| P-06 | Exa, Search API reference | [Search endpoint](https://exa.ai/docs/reference/search) | `POST https://api.exa.ai/search` uses `x-api-key` or bearer auth and exposes search modes, contents, date filters, and a returned cost breakdown. | Primary; response cost is not the billing ledger. |
| P-07 | Firecrawl, pricing | [Pricing](https://www.firecrawl.dev/pricing) | Search is listed at two credits per ten results; plans bundle different monthly credit quantities and concurrency. | Primary; a credit is not a fixed dollar amount across plans. |
| P-08 | Firecrawl, Search API reference | [Search endpoint](https://docs.firecrawl.dev/api-reference/endpoint/search) | `POST /v2/search` uses bearer auth and can optionally scrape results; the response includes `creditsUsed`. | Primary; optional scraping and enterprise modes change usage. |

## Provider terms and legal gates

| ID | Publisher and source | Direct URL | Evidence | Operating consequence |
| --- | --- | --- | --- | --- |
| T-01 | Brave, Search API Terms of Use, updated 2026-02-11 | [Terms](https://api-dashboard.search.brave.com/terms-of-service) | Terms include limits on storage, redistribution/resale, sublicensing, and certain evaluation/benchmark uses of Search Results. | No pooled credits, public provider comparison, or retained raw result set without provider-specific legal review and any required written rights. |
| T-02 | Tavily, Platform Terms of Service, updated 2026-05-04 | [Terms](https://www.tavily.com/terms) | Terms permit integration with customer applications but include restrictions on resale, competitive use, and disclosure of performance information or analysis. | Keep Tavily performance analysis private; obtain written permission and counsel review before any comparative publication. |
| T-03 | Exa, Terms of Service | [Terms PDF](https://exa.ai/assets/Exa_Labs_Terms_of_Service.pdf/) | Terms grant a limited, revocable, non-transferable, non-sublicensable API-use right subject to documentation and limits. | Counsel must review the current PDF and the customer's plan before commercial deployment or comparison. |
| T-04 | Firecrawl, Terms of Use / Service Agreement, revised 2024-11-05 | [Terms](https://www.firecrawl.dev/terms-of-service) | Terms state that commercial use must be expressly authorized and place restrictions on exploitation and account sharing. | Do not infer that a self-serve account authorizes FetchMux's exact commercial model; obtain provider or counsel confirmation. |

No row above is a legal conclusion. The operative terms are the terms accepted by the actual account
holder, including any order form, regional terms, later amendment, or custom permission.

## Exact and adjacent competitors

GitHub counts below came from the repository page and GitHub REST API on 2026-07-16. They are a
dated adoption signal, not active-user or revenue data.

| ID | Source | Direct URL | Observed evidence | Implication |
| --- | --- | --- | --- | --- |
| C-01 | `spences10/mcp-omnisearch` | [Repository](https://github.com/spences10/mcp-omnisearch) | Unified BYOK MCP access to Tavily, Brave, Kagi, Exa, Linkup, and Firecrawl; 333 stars and 49 forks were returned by GitHub. | A unified provider interface is already open-source and is not a moat. |
| C-02 | `robbyczgw-cla/hermes-web-search-plus` | [Repository](https://github.com/robbyczgw-cla/hermes-web-search-plus) | Multi-provider search/extraction with routing and quality-report concepts; 337 stars and 25 forks were returned by GitHub. | Query routing itself is a live competitive feature. |
| C-03 | Search Router listing | [MCP Market](https://mcpmarket.com/server/search-router) | Describes one HTTP search endpoint, query classification, provider selection, and fallback. | The original generic-router idea has a near-exact implementation. |
| C-04 | `Rishang/seek` | [Repository](https://github.com/Rishang/seek) | A small coding-agent search service motivated by provider rate limits and provider switching. | Lightweight fallback is easy to build and likely to be free. |
| C-05 | `ronnieops/pi-search-hub` | [Repository](https://github.com/ronnieops/pi-search-hub) | A multi-backend search extension; 32 stars and 12 forks were returned by GitHub. | OSS-agent users are a plausible user segment, but not yet a proven buyer segment. |
| A-01 | LiteLLM | [Repository](https://github.com/BerriAI/litellm) | The multi-provider LLM gateway had 53,760 stars and 9,810 forks in the GitHub API snapshot. | Adjacent evidence that stable provider-neutral contracts can attract developers; not proof that retrieval routing will monetize. |
| A-02 | Portkey Gateway | [Repository](https://github.com/Portkey-AI/gateway) | The AI gateway had 12,442 stars and 1,207 forks in the GitHub API snapshot. | Observability and policy are established gateway value propositions in an adjacent layer. |
| A-03 | Firecrawl | [Repository](https://github.com/firecrawl/firecrawl) | The provider repository had 151,736 stars and 8,668 forks in the GitHub API snapshot. | Providers themselves have powerful distribution; FetchMux should integrate and partner rather than pretend to replace them. |
| R-01 | “Decoupling Search from Reasoning” | [arXiv paper](https://arxiv.org/abs/2606.18947) | Describes an MCP-compatible vendor-agnostic grounding gateway with routing, fallback, caching, and retrieval controls, plus workload-specific results. | Architecture direction is credible but no longer novel; paper results require independent reproduction. |

## Community and social evidence

| ID | Source | Direct URL | What it contributes | Limitation |
| --- | --- | --- | --- | --- |
| U-01 | Reddit r/Rag, five-provider comparison | [Thread](https://www.reddit.com/r/Rag/comments/1uvj51o/tested_5_web_search_apis_so_you_dont_have_to_full/) | A public 252-query comparison reports different quality, latency, token, and cost outcomes by provider and category; commenters challenge judge sensitivity. | User-authored and very recent; methodology and sponsor incentives need audit. Do not reuse its rankings as FetchMux claims. |
| U-02 | Reddit r/Rag, search-quality complaint | [Thread](https://www.reddit.com/r/Rag/comments/1qhuv07/web_search_api_situation_is_pretty_bad_and_is/) | A builder reports conflicting and promotional results across providers; commenters explicitly ask for an auditable, reproducible benchmark. | The author is also promoting a product. Useful problem language, not demand proof. |
| U-03 | Reddit r/ClaudeAI, Seek launch | [Thread](https://www.reddit.com/r/ClaudeAI/comments/1ubtko7/built_a_small_tool_that_gives_coding_agents/) | The author cites rate-limit failure; a commenter asks why anyone would use a wrapper over existing MCP/provider tools. | Captures both pain and the strongest thin-wrapper objection; tiny sample. |
| U-04 | Reddit r/LocalLLM, search/scraping selection | [Thread](https://www.reddit.com/r/LocalLLM/comments/1tk4kxb/struggling_to_find_the_perfect_searchscraping_api/) | Discussion distinguishes search quality, authoritative sources, extraction, cost, and mixing providers. | Anecdotal and self-selected. |
| U-05 | LinkedIn tool comparison post | [Post](https://www.linkedin.com/posts/daniyalhassan21_buildinginpublic-claybootcamp-claudecode-activity-7453831351784505345-qkUp) | A practitioner reports that 9 of 22 research data points were unique to one tested tool and argues for task-specific selection. | Uncontrolled, non-blinded social experiment; use only as interview language. |
| U-06 | LinkedIn market discussion | [Post](https://www.linkedin.com/posts/genlab-venture-studios_aisearch-aiinfrastructure-agentsystems-activity-7443006077148758016-rY9u) | Community discussion separates web search providers from crawling/extraction tools and lists a crowded provider set. | Social market map, not audited market share. |

## Founder inferences

| ID | Inference | Evidence basis | Validation required |
| --- | --- | --- | --- |
| I-01 | The product should sell policy success, failure recovery, and operational evidence, not “one API for everything.” | P-01 through P-08, C-01 through C-05, R-01 | Ten qualified interviews and three paid pilots. |
| I-02 | BYOK single-tenant deployment is the safest viable starting model. | P-02, P-04, P-06, P-08, T-01 through T-04 | Provider-specific counsel review and signed customer pilot terms. |
| I-03 | Public provider league tables are a poor founding acquisition loop. | T-01, T-02, T-04 | Written provider permissions and counsel approval before any exception. |
| I-04 | The first buyer is more likely a small production AI team than an individual coding-agent user. | C-04, C-05, U-03 and the need for measurable recurring pain | Paid discovery; this remains unproven. |
| I-05 | A USD 750 setup fee plus USD 99 first month can fund hands-on validation without subsidizing provider usage. | Internal delivery estimate and BYOK model | Price reactions in ten qualified conversations and actual support hours in three pilots. |

## Refresh protocol

Before a live benchmark, proposal, partnership request, or public launch:

1. Re-open P-01 through P-08 and record the account's actual plan and effective costs.
2. Re-open T-01 through T-04 and compare them with the account's accepted order form.
3. Ask counsel to resolve benchmarking, disclosure, storage, commercial-use, and end-user rights.
4. Refresh competitor repository data through the GitHub REST API.
5. Add customer evidence as a separate class; never convert community posts into customer proof.

