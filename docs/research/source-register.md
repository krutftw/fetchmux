# FetchMux source register

**Research date:** 2026-07-18<br>
**Last verified:** 2026-07-18<br>
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
| P-09 | Crossref, REST API documentation | [Retrieve metadata](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) | Crossref's public metadata API requires no signup or authentication and says the returned metadata can be used for any purpose. | Some deposited fields, including abstracts, can remain copyrighted; FetchMux deliberately does not select or copy abstracts. |
| P-10 | Crossref, API access and authentication | [Etiquette and pools](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/) | Identified requests using `mailto` enter the polite pool, documented at ten requests per second and three concurrent requests. | Limits can change; the founding adapter sends an identified user agent and remains low volume. |
| P-11 | Tavily, current plan pricing | [Pricing](https://www.tavily.com/pricing) | The page lists 1,000 free monthly credits and pay-as-you-go at USD 0.008 per credit. | Marketing prices can change and are not the customer's effective rate. |
| P-12 | Parallel, Search pricing and Turbo launch | [Pricing](https://docs.parallel.ai/getting-started/pricing), [Turbo](https://parallel.ai/blog/parallel-search-turbo) | Default Search is listed at USD 5 per 1,000 requests; the 2026-07-13 Turbo announcement lists USD 1 per 1,000 and claims 200 ms median latency. | The latency figure is a vendor claim, not an independent FetchMux measurement. |
| P-13 | Firecrawl, keyless launch | [Launch note](https://www.firecrawl.dev/blog/firecrawl-keyless-launch) | Firecrawl describes a no-API-key flow for agents with 1,000 free credits. | A direct anonymous call from the build environment returned a suspicious-IP 403; the documented identity flow requires an approved client identity, so FetchMux did not bypass it. |

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
| C-06 | Tavily MCP | [Repository](https://github.com/tavily-ai/tavily-mcp) | Tavily's production-ready official MCP server had approximately 2,200 stars in the 2026-07-18 snapshot. | MCP access to one strong provider is already mature and free to integrate. |
| C-07 | Seer | [Product](https://seersearch.com/) | Sells retrieval evaluation, groundedness, recall, latency scoring, change tests, and alerts, starting at a per-evaluation price. | Retrieval observability is already a product category; FetchMux must win on customer economics and implementation outcomes. |
| C-08 | SkillBoss Agent Wallet | [Product](https://www.skillboss.co/agent-wallet) | Markets one funded wallet/API key for hundreds of paid tools, with per-agent controls and receipts. | Near-exact overlap with the original universal paid-API concept. |
| C-09 | Coinbase CDP Bazaar | [Documentation](https://docs.cdp.coinbase.com/x402/bazaar) | Provides semantic discovery of x402 endpoints and MCP-based proxy invocation. | A well-distributed platform already covers agent discovery plus paid API invocation. |
| C-10 | x402 | [Protocol](https://x402.org/) | Defines an open HTTP payment protocol for services and agents. | Protocol availability lowers entry barriers and increases marketplace competition; it does not prove buyer demand. |
| C-11 | Vellum Web Search | [Documentation](https://www.vellum.ai/docs/key-concepts/web-search) | Supports native or BYOK search through Perplexity, Brave, Tavily, and Firecrawl and recommends connecting more than one key for upstream resilience. | Multi-provider BYOK fallback already exists inside an AI development platform. |
| C-12 | Portkey Tavily Online Search | [Documentation](https://portkey.ai/docs/integrations/plugins/tavily) | Runs Tavily as a gateway-layer input guardrail across models and logs trigger state, query, sources, inserted context, usage, and credit metadata. | Gateway integration and retrieval observability are bundled into a broader incumbent platform. |
| C-13 | Cloudflare AI Gateway Web Search | [Documentation](https://developers.cloudflare.com/ai-gateway/usage/web-search/) | Web-search calls use unified billing at upstream rates and appear with tool results in AI Gateway logs. | Large infrastructure platforms are absorbing search billing and observability; FetchMux must not compete on those features alone. |
| A-01 | LiteLLM | [Repository](https://github.com/BerriAI/litellm) | The multi-provider LLM gateway had 53,760 stars and 9,810 forks in the GitHub API snapshot. | Adjacent evidence that stable provider-neutral contracts can attract developers; not proof that retrieval routing will monetize. |
| A-02 | Portkey Gateway | [Repository](https://github.com/Portkey-AI/gateway) | The AI gateway had 12,442 stars and 1,207 forks in the GitHub API snapshot. | Observability and policy are established gateway value propositions in an adjacent layer. |
| A-03 | Firecrawl | [Repository](https://github.com/firecrawl/firecrawl) | The provider repository had 151,736 stars and 8,668 forks in the GitHub API snapshot. | Providers themselves have powerful distribution; FetchMux should integrate and partner rather than pretend to replace them. |
| R-01 | “Decoupling Search from Reasoning” | [arXiv paper](https://arxiv.org/abs/2606.18947) | Describes an MCP-compatible vendor-agnostic grounding gateway with routing, fallback, caching, and retrieval controls, plus workload-specific results. | Architecture direction is credible but no longer novel; paper results require independent reproduction. |
| R-02 | “Equal Accuracy, Unequal Evidence” | [arXiv paper](https://arxiv.org/abs/2607.10198), [artifact](https://github.com/selvamsriram/search-api-decision-surface) | Holds a GPT-5.4 agent fixed across 100 difficult questions and reports close final-answer accuracy but different evidence acquisition and support behavior for Brave, Tavily, and Firecrawl. | One model, one judge design, 100 questions, and three providers; useful decision-surface evidence, not a universal ranking. |
| R-03 | x402 population study | [arXiv paper](https://arxiv.org/abs/2607.12575) | Reports concentrated, manufacturable activity, classifying 21.2% of observed transactions as fictitious and 63.78% as internal cluster settlement. | New preprint whose classification method needs replication; enough to reject raw transaction counts as independent adoption proof. |

## Community and social evidence

| ID | Source | Direct URL | What it contributes | Limitation |
| --- | --- | --- | --- | --- |
| U-01 | Reddit r/Rag, five-provider comparison | [Thread](https://www.reddit.com/r/Rag/comments/1uvj51o/tested_5_web_search_apis_so_you_dont_have_to_full/) | A public 252-query comparison reports different quality, latency, token, and cost outcomes by provider and category; commenters challenge judge sensitivity. | User-authored and very recent; methodology and sponsor incentives need audit. Do not reuse its rankings as FetchMux claims. |
| U-02 | Reddit r/Rag, search-quality complaint | [Thread](https://www.reddit.com/r/Rag/comments/1qhuv07/web_search_api_situation_is_pretty_bad_and_is/) | A builder reports conflicting and promotional results across providers; commenters explicitly ask for an auditable, reproducible benchmark. | The author is also promoting a product. Useful problem language, not demand proof. |
| U-03 | Reddit r/ClaudeAI, Seek launch | [Thread](https://www.reddit.com/r/ClaudeAI/comments/1ubtko7/built_a_small_tool_that_gives_coding_agents/) | The author cites rate-limit failure; a commenter asks why anyone would use a wrapper over existing MCP/provider tools. | Captures both pain and the strongest thin-wrapper objection; tiny sample. |
| U-04 | Reddit r/LocalLLM, search/scraping selection | [Thread](https://www.reddit.com/r/LocalLLM/comments/1tk4kxb/struggling_to_find_the_perfect_searchscraping_api/) | Discussion distinguishes search quality, authoritative sources, extraction, cost, and mixing providers. | Anecdotal and self-selected. |
| U-05 | LinkedIn tool comparison post | [Post](https://www.linkedin.com/posts/daniyalhassan21_buildinginpublic-claybootcamp-claudecode-activity-7453831351784505345-qkUp) | A practitioner reports that 9 of 22 research data points were unique to one tested tool and argues for task-specific selection. | Uncontrolled, non-blinded social experiment; use only as interview language. |
| U-06 | LinkedIn market discussion | [Post](https://www.linkedin.com/posts/genlab-venture-studios_aisearch-aiinfrastructure-agentsystems-activity-7443006077148758016-rY9u) | Community discussion separates web search providers from crawling/extraction tools and lists a crowded provider set. | Social market map, not audited market share. |
| U-07 | Reddit r/LocalLLM and public benchmark artifact | [Thread](https://www.reddit.com/r/LocalLLM/comments/1uvjaf8/tested_5_web_search_apis_so_you_dont_have_to_full/), [repository](https://github.com/viraj43/RAG_benchmark) | Publishes 252 queries across 17 categories for five providers and reports quality, latency, token, and cost differences. | Provider configuration differences confound some cost/token comparisons; community benchmark results are not FetchMux claims. |
| U-08 | OpenClaw provider fallback request | [Issue](https://github.com/openclaw/openclaw/issues/23330) | Requests Tavily fallback and key rotation after Brave quota exhaustion. | One issue is a concrete failure case, not willingness-to-pay evidence. |
| U-09 | Brave Search MCP rate-control request | [Issues](https://github.com/brave/brave-search-mcp-server/issues) | The official server's issue tracker includes demand for local rate limiting and retries. | Feature demand can be satisfied upstream and may not support a standalone company. |
| U-10 | Reddit agent search-cost discussions | [Volume thread](https://www.reddit.com/r/AI_Agents/comments/1uca2yz/whats_your_volume_of_search_costs_how_do_you/), [spike-debugging thread](https://www.reddit.com/r/AI_Agents/comments/1uyoz6i/how_are_you_debugging_unexpected_cost_spikes_in/) | Builders discuss repeated search loops, token/context cost, and difficulty attributing unexpected spend. | Self-selected anecdotes; use to ask better discovery questions, not to set a market-size estimate. |
| U-11 | Agent payment hub postmortem | [Thread](https://www.reddit.com/r/SideProject/comments/1ti7ke1/10_weeks_building_an_ai_agent_payment_hub_in/) | A founder reports indexing 2,777 payment services and building proxy, refund, and MCP flows while earning no external revenue. | Self-report from one project, but a strong warning that supply aggregation is not demand. |
| U-12 | Reddit startup-studio retrieval workload | [Thread](https://www.reddit.com/r/Agent_AI/comments/1sy37gs/tavily_alternatives_for_search_api_in_2026/) | An anonymous startup-studio builder reports inconsistent ranking, rising parallel-agent cost, hundreds or thousands of daily queries, and multiple consumer products that depend on live search. | Strong ICP language, but the company, authority, spend, and willingness to pay are unknown. Contact is limited to a public reply if separately approved. |
| U-13 | Open WebUI context-budget request | [Issue](https://github.com/open-webui/open-webui/issues/24120) | Documents latency, blocking, extraction inconsistency, and the need to tune retrieved tokens per request when changing Brave endpoints. | A closed open-source issue is product evidence, not a buyer or an invitation to pitch. |
| U-14 | Hermes Agent provider architecture requests | [Architecture issue](https://github.com/NousResearch/hermes-agent/issues/19197), [configuration issue](https://github.com/NousResearch/hermes-agent/issues/21003) | Requests separate search/extraction provider configuration and production-like Tavily plus self-hosted Firecrawl workflows. | Upstream architecture can absorb the feature; use as distribution research, never as a sales channel. |

## Founder inferences

| ID | Inference | Evidence basis | Validation required |
| --- | --- | --- | --- |
| I-01 | The product should sell customer-specific retrieval economics, reliability, and implementation outcomes, not “one API for everything.” | P-01 through P-13, C-01 through C-13, R-01 through R-03 | Ten qualified interviews and three paid pilots. |
| I-02 | BYOK single-tenant deployment is the safest viable starting model. | P-02, P-04, P-06, P-08, T-01 through T-04 | Provider-specific counsel review and signed customer pilot terms. |
| I-03 | Public provider league tables are a poor founding acquisition loop. | T-01, T-02, T-04 | Written provider permissions and counsel approval before any exception. |
| I-04 | The first buyer is more likely a small production AI team than an individual coding-agent user. | C-04, C-05, U-03 and the need for measurable recurring pain | Paid discovery; this remains unproven. |
| I-05 | A USD 750 setup fee plus USD 99 first month can fund hands-on validation without subsidizing provider usage. | Internal delivery estimate and BYOK model | Price reactions in ten qualified conversations and actual support hours in three pilots. |
| I-06 | A generic API marketplace, agent wallet, MCP gateway, or thin multi-search router is not an attractive founding wedge. | C-01 through C-13, R-03, U-11 | Reverse only if qualified buyers identify an underserved paid job that incumbents cannot satisfy. |
| I-07 | Qualifying on economic pain is more useful than a raw request-count threshold. | U-08 through U-10 and the audit delivery model | Test thresholds of USD 500 monthly spend, eight engineering hours per month, or USD 1,000 failure impact in ten conversations. |
| I-08 | The audit must work with an existing customer gateway and install FetchMux only when it adds measured value. | C-07, C-11 through C-13 | Ask every qualified buyer what the current platform already measures and whether independent change testing remains painful. |

## Refresh protocol

Before a live benchmark, proposal, partnership request, or public launch:

1. Re-open P-01 through P-13 and record the account's actual plan and effective costs.
2. Re-open T-01 through T-04 and compare them with the account's accepted order form.
3. Ask counsel to resolve benchmarking, disclosure, storage, commercial-use, and end-user rights.
4. Refresh competitor repository data through the GitHub REST API.
5. Add customer evidence as a separate class; never convert community posts into customer proof.
