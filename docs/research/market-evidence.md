# FetchMux market evidence and founding decision

**Decision date:** 2026-07-16  
**Decision:** proceed to paid validation, not public launch  
**Confidence:** enough evidence to test a narrow paid offer; no evidence yet of repeatable demand

## Bottom line

There is a real, current engineering problem around choosing and operating web-retrieval providers
for AI systems. Official products expose different price units, controls, result depth, and failure
surfaces. Builders are already creating multi-provider tools and discussing reliability, quality,
token volume, and task-specific tradeoffs.

That evidence does **not** validate a generic “one API for every API” company. Near-exact
multi-provider search routers already exist in open source, and a 2026 paper describes nearly the
same vendor-neutral gateway boundary. A thin adapter layer will be copied or given away.

The only version worth funding further is a retrieval control product that earns money from a
measurable operating result:

- requests succeed inside a customer's cost and latency policy;
- transient provider failures recover without unsafe or unbounded retries;
- routing decisions are inspectable;
- provider cost estimates reconcile with the customer's actual plan;
- the customer removes integration and incident work it would otherwise own.

The next proof is money, not more code. FetchMux should run a bounded paid-pilot test and stop or
pivot if buyers do not pay or metrics do not improve.

## Verified market facts

### Providers are not interchangeable

The founding providers use different units and controls:

- [Brave lists Search at USD 5 per 1,000 requests](https://api-dashboard.search.brave.com/documentation/pricing)
  and authenticates with a subscription token.
- [Tavily prices by credit](https://docs.tavily.com/documentation/api-credits); basic search uses one
  credit while advanced search uses two, and plan rates differ.
- [Exa lists different prices for Search, Deep Search, Contents, and Answer](https://exa.ai/pricing),
  while its [Search contract](https://exa.ai/docs/reference/search) exposes several search modes and
  optional content behavior.
- [Firecrawl lists Search at two credits per ten results](https://www.firecrawl.dev/pricing), while
  optional scraping and other modes can consume additional credits.

This supports one narrow claim: provider choice changes the cost and behavior of a request. It does
not establish which provider is best for a customer workload.

### Multi-provider retrieval is already a product category

Several current projects already combine or route search providers:

- [`mcp-omnisearch`](https://github.com/spences10/mcp-omnisearch) combines several founding
  providers behind MCP tools and had 333 GitHub stars in the 2026-07-16 API snapshot.
- [`hermes-web-search-plus`](https://github.com/robbyczgw-cla/hermes-web-search-plus) offers
  multi-provider search/extraction concepts and had 337 stars in the same snapshot.
- [Search Router](https://mcpmarket.com/server/search-router) describes query classification,
  provider selection, fallback, and one stable HTTP endpoint.
- [Decoupled Search Grounding](https://arxiv.org/abs/2606.18947) describes a vendor-agnostic,
  MCP-compatible search gateway with routing, fallback, caching, and control.

These sources validate activity and competition. They invalidate any claim that FetchMux invented
multi-provider search routing.

### The gateway pattern has adjacent adoption

The GitHub API snapshot returned 53,760 stars for
[LiteLLM](https://github.com/BerriAI/litellm) and 12,442 stars for the
[Portkey Gateway](https://github.com/Portkey-AI/gateway). Both operate in the adjacent model-gateway
layer. This is evidence that developers value stable contracts, routing, policy, and observability.
It is not proof that the same users will pay FetchMux.

### Community evidence contains both pain and rejection

A recent [252-query community comparison](https://www.reddit.com/r/Rag/comments/1uvj51o/tested_5_web_search_apis_so_you_dont_have_to_full/)
reports materially different outcomes by provider and query category, while commenters challenge
the use of one LLM judge. Another [Reddit discussion](https://www.reddit.com/r/Rag/comments/1qhuv07/web_search_api_situation_is_pretty_bad_and_is/)
describes conflicting and promotional retrieval results and asks for reproducible evidence.

The counterargument is equally important. On a [small search-wrapper launch](https://www.reddit.com/r/ClaudeAI/comments/1ubtko7/built_a_small_tool_that_gives_coding_agents/),
a commenter asks why a user would not simply configure existing provider MCP tools. That is the
default objection FetchMux must beat in every paid conversation.

Community evidence is directional and self-selected. It supplies interview language, not a demand
forecast.

## Terms research changes the distribution plan

The original concept used a public provider benchmark as the primary acquisition loop. Current
terms make that unsafe without additional rights:

- [Tavily's current terms](https://www.tavily.com/terms) include a restriction on disclosing
  performance information or analysis.
- [Brave's current Search API terms](https://api-dashboard.search.brave.com/terms-of-service)
  include restrictions relevant to storage, redistribution, resale, sublicensing, and some
  evaluation or benchmark uses of results.
- [Firecrawl's current terms](https://www.firecrawl.dev/terms-of-service) include commercial-use
  language that requires provider-specific review.

Therefore:

1. The live benchmark is an internal/customer evaluation tool, not a public league table.
2. Public material can explain methodology, budgets, retry safety, and fabricated examples.
3. No provider-specific performance result is published until counsel reviews the accepted account
   terms and the provider grants any required written permission.
4. The acquisition engine starts with manually qualified paid pilots and useful technical material,
   not controversial comparison content.

## Commercial model under test

### Buyer and trigger

The first buyer hypothesis is a technical founder, engineering lead, or AI platform owner at a small
team that already has a recurring retrieval workload and at least one of these verified internal
symptoms:

- a second provider integration is planned or already maintained;
- retrieval rate limits or outages have caused user-visible failure;
- provider usage or downstream token cost is not understood per workload;
- engineers cannot explain why a provider was selected;
- changing provider requires application-specific code changes.

No symptom should be inferred from a job title. Discovery must establish it.

### Paid founding offer

- USD 750 setup, which pays for baseline capture, integration, and routing configuration.
- USD 99 for the first month of monitored evaluation.
- Provider usage remains on customer-owned accounts and is paid directly by the customer.
- A later USD 49 Pro and USD 199 Team subscription remain price hypotheses, not published promises.

Three pilots would produce USD 2,547 in initial receipts and USD 297 of first-month recurring
revenue before provider usage, because the provider costs remain with customers. This arithmetic is
not a forecast. It shows that the validation test can collect revenue instead of consuming a free
beta budget.

### What the buyer is purchasing

The offer is not an API-key directory. The buyer purchases:

1. a measured baseline on its own workload;
2. a deployed, customer-controlled retrieval policy;
3. cost, deadline, fallback, and credential-safety controls;
4. weekly evidence against one agreed success metric;
5. a keep, change, or remove recommendation at the end.

### Growth choice: revenue first

FetchMux is not designed around a free hosted traffic loop. That would create provider cost, abuse,
and support exposure before willingness to pay exists. The founding growth sequence is:

1. ten approved, evidence-led conversations;
2. three paid pilots;
3. customer-approved case studies or references only after measurable results and terms review;
4. provider-neutral technical material and integration templates;
5. a licensed public local runner only after brand, security, history, and dependency gates pass;
6. provider directories or referral programmes only after formal acceptance.

Sanitized route receipts and benchmark methodology may later be shareable product artifacts, but
they are not called viral until actual sharing and attributed acquisition are measured. Revenue is
the founding success criterion; virality is optional upside.

## Competitive position

| Alternative | What it already solves | FetchMux must prove |
| --- | --- | --- |
| Direct provider SDK or MCP | Fastest path to one provider | Multi-provider policy improves a metric enough to justify another component. |
| Open-source multi-provider MCP | Unified tools and broad integrations | Hard budgets, deadline accounting, route receipts, safe failure behavior, and operating support create paid value. |
| In-house adapter interface | Full control with no vendor | FetchMux costs less engineering time to adopt and maintain. |
| Model-native web search | No separate search service for supported models | Provider independence or control matters for this workload. |
| One dominant provider | Low operational complexity | A second provider has demonstrated value; otherwise recommend the single provider. |

FetchMux loses honestly when one provider is sufficient. The pilot must be allowed to recommend
that outcome.

## Proof ladder

| Stage | Required evidence | Current state |
| --- | --- | --- |
| Problem activity | Current providers, competitors, and community discussions exist | Passed |
| Technical feasibility | Router, adapters, API, SDK, MCP, benchmark, site, and container work locally | Passed |
| Buyer pain | Ten qualified conversations document recurring workload and measurable pain | Not started |
| Willingness to pay | Three qualified teams pay for the founding pilot | Not started |
| Measurable value | At least two pilots improve an agreed metric or remove measured engineering work | Not started |
| Repeatability | Ten paying customers, controlled support hours, acceptable margins | Not started |

## Decision and kill rules

Proceed through paid discovery because technical feasibility and market activity are established.
Do not call the company validated, profitable, viral, partnered, or launch-ready.

The operating lead must change direction when evidence says so:

- fewer than three paid pilots after 21 days of active, approved outreach: narrow the segment or
  change the offer;
- no meaningful metric improvement in at least two well-qualified pilots by day 45: pivot to
  retrieval evaluation/observability or stop;
- most prospects want only free failover: open or abandon the router and sell a different pain;
- one provider wins every real workload: sell evaluation and migration instead of dynamic routing;
- provider terms prevent the required customer use: remove that adapter or secure written rights;
- more than eight post-setup founder hours per pilot: standardize, reprice, move upmarket, or decline.

## Claims policy

Allowed now:

- “One retrieval API. The right provider for every request.” as a product promise to be tested;
- “BYOK adapters for Brave, Tavily, Exa, and Firecrawl” as an implemented capability;
- exact local test and benchmark-dry-run facts;
- “private founding build” and “price hypothesis.”

Not allowed without new evidence:

- a named provider is better, cheaper, faster, or more reliable;
- FetchMux saves a percentage of cost or failures;
- any customer, partner, revenue, or public-launch claim;
- any total-addressable-market number;
- any implication that FetchMux can resell provider credits or sign customers up automatically.

The detailed evidence and limitations are in the [source register](source-register.md).
