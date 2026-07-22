# FetchMux launch kit

- **Prepared:** 2026-07-22 (Australia/Perth)
- **Purpose:** answer two owner questions with ready-to-execute material: *where do I upload/advertise this* and *how do I get the first buyer*
- **Rule:** nothing in this file is published automatically. Every post is made from the owner's own accounts after the owner reads it. Edit freely; these are drafts, not scripts to recite.

## 1. The strategy in one paragraph

FetchMux is a self-hosted tool for AI agents, and tools for AI agents are discovered through
developer channels: GitHub, npm, the MCP registry and its directories, Hacker News, Reddit's agent
communities, and X. Nobody can find FetchMux today because the repository is private and nothing is
published to any registry. The launch is therefore: make the repository public under Apache-2.0,
publish the SDK and MCP server to npm, list the MCP server everywhere MCP servers are listed, then
announce in the four communities below. The paid offer stays exactly what the site already says — a
USD 849 founding pilot — and every announcement points at `fetchmux.com`, which routes applications
to `hello@fetchmux.com`. Open source is the demand engine; the pilot is the revenue. Distribution
compounds only if inbound is answered fast, so the operating rule after launch is: every reply,
issue, and email gets a response within hours, and every conversation is scored with the
[discovery script](discovery-script.md) before any pilot is offered.

## 2. Claims discipline (read before posting anything)

True and safe to say:

- one endpoint for web search, page retrieval, and scholarly metadata across Brave, Tavily, Exa,
  Firecrawl, and Crossref, using the customer's own keys;
- per-request hard cost ceilings and deadlines enforced before the provider call;
- deterministic policy routing with a signed decision receipt (provider, attempts, reason codes,
  estimated cost, latency, trace ID) on every response;
- retry-safe fallback and a circuit breaker; query text excluded from operational logs by default;
- REST, typed TypeScript SDK, and read-only MCP server; 231 passing tests; non-root distroless
  container; self-hosted, single-tenant.

Never say (until it becomes true):

- any named-provider performance or cost comparison ("X is cheaper/worse than Y") — provider terms
  restrict public benchmarks;
- "customers save N%" or any outcome claim — there are no customer outcomes yet;
- "hosted", "SaaS", "sign up" — there is no hosted product;
- pooled credits, resale, or partnership language — no provider partnerships exist.

## 3. Where to upload it (the distribution map, in order)

| Order | Surface | What goes there | Gate |
| --- | --- | --- | --- |
| 1 | GitHub `krutftw/fetchmux` → public | The whole repository, Apache-2.0 | Owner flips visibility; see [public-release runbook](../runbooks/public-release.md) |
| 2 | npm | `@fetchmux/sdk`, `@fetchmux/mcp` | Owner `npm login` + publish commands in the runbook |
| 3 | Official MCP registry (`registry.modelcontextprotocol.io`) | MCP server entry via `server.json` (prepared at repo root) | Requires npm package public first; `mcp-publisher` login with GitHub |
| 4 | MCP directories: Smithery, PulseMCP, mcp.so, Glama | Same server, submitted or auto-indexed from GitHub | Free; owner account on each |
| 5 | `awesome-mcp-servers` (punkpeye) | One-line PR under Search category | PR from owner's GitHub |
| 6 | Hacker News | Show HN (copy below) | Owner account; post Tue–Thu ~8–10am US Eastern |
| 7 | Reddit r/mcp, r/AI_Agents, r/LLMDevs, r/RAG | Announcement + the three thread replies (copy below) | Owner account; one subreddit per day, don't cross-post same text |
| 8 | X (@ owner account) | Launch post + demand-test post (copy below) | Owner has Premium+; pin the launch post |
| 9 | Product Hunt | Listing (copy below) | Optional; do after HN/Reddit feedback hardens the pitch |

Skip paid ads entirely at this stage. The buyer is a developer with a retrieval workload; they are
reachable for free in the channels above, and there is no funnel data to aim a paid campaign with.

## 4. Ready-to-post copy

### 4.1 Show HN (title ≤ 80 chars)

> **Show HN: FetchMux – self-hosted retrieval router for AI agents, with receipts**
>
> I built FetchMux because my agents were wiring Brave, Tavily, Exa, and Firecrawl directly into
> prompts and app code, and every provider had different failure modes, costs, and rate limits —
> with no record of why any call went where it went.
>
> FetchMux is a self-hosted gateway. Your agent sends one request shape ("query, task, max spend,
> deadline"); the gateway picks an eligible provider under a deterministic policy, enforces the cost
> ceiling and deadline *before* the call, falls back only on retryable failures, and returns the
> evidence with a route receipt: selected provider, attempts, reason codes, estimated cost, latency,
> trace ID. Keys stay in your gateway process (BYOK). Query text is excluded from operational logs
> by default.
>
> Interfaces: REST, a typed TypeScript SDK, and a read-only MCP server, so Claude/Cursor/any MCP
> client can use it as a tool. There's a credential-free route (Crossref scholarly metadata) so you
> can try the whole loop without signing up for anything.
>
> Honest status: founding build, single-tenant, self-hosted only — no hosted version. 231 tests,
> distroless non-root container, Apache-2.0. I'm running paid founding pilots (details on the site)
> but the software is free to self-host.
>
> Repo: https://github.com/krutftw/fetchmux — Site/OpenAPI: https://fetchmux.com
>
> Things I'd genuinely like criticism on: the routing policy inputs, the receipt schema, and whether
> per-request budget enforcement belongs in the gateway or the client.

*(Post the text as a comment immediately after submitting the link. Stay online 4–6 hours to reply.)*

### 4.2 X — launch post

> Shipped: FetchMux, a self-hosted retrieval router for AI agents.
>
> One endpoint in front of Brave/Tavily/Exa/Firecrawl/Crossref (your keys). Every request carries a
> hard cost ceiling + deadline, and every response carries a receipt: which provider, why, attempts,
> cost, latency, trace ID.
>
> REST + TypeScript SDK + MCP server. Apache-2.0. Try it with zero API keys via the Crossref route.
>
> https://fetchmux.com

### 4.3 X — demand-test post (Codex's draft, still valid; post 2–3 days after launch)

> Question for teams running AI agents in production: when web retrieval goes wrong, what actually
> costs you more: provider spend, downstream context tokens, failed tasks, or engineering time?
>
> We are testing a paid retrieval economics audit for teams already using or evaluating two or more
> providers. If this is a real line item rather than an annoyance, reply or DM. No API keys or
> private queries. https://fetchmux.com

### 4.4 Reddit r/mcp announcement

> **FetchMux — an MCP server that routes web search across providers with budgets and receipts**
>
> I kept rewriting the same glue: agent needs web evidence, provider APIs all differ, costs and
> failures are invisible until the bill or the incident. FetchMux is a self-hosted gateway with a
> read-only MCP server on top (`search_web`, `preview_search_route`).
>
> What's different from pointing your agent at one search API:
> - the request carries `maxCostUsd` and `maxLatencyMs`, enforced before the provider call;
> - the policy picks among your configured providers (Brave/Tavily/Exa/Firecrawl/Crossref, your
>   keys) by task fit, budget, circuit state;
> - the response includes a route receipt — provider, reason codes, attempts, est. cost, latency,
>   trace ID — so you can audit what your agent did;
> - query text stays out of the operational logs by default.
>
> Apache-2.0, single-tenant, runs on your machine; there's a zero-key demo route (Crossref) so you
> can try it without any provider account. Repo + docs: https://github.com/krutftw/fetchmux
>
> Would honestly value feedback on the tool schema — it's deliberately read-only right now.

### 4.5 Reddit r/AI_Agents announcement (different angle — the ops problem, not the tool)

> **How are you keeping agent web-retrieval costs and failures under control?**
>
> After running agents that call search APIs directly, three problems kept recurring: no per-request
> spend ceiling (a retry loop can burn a day's budget), provider choice hard-coded in prompts, and
> zero audit trail of why a call went to which provider.
>
> I ended up building a self-hosted router for this (FetchMux — Apache-2.0, BYOK, MCP/REST/SDK,
> link in comments to avoid the spam filter) but I'm more interested in how others handle it:
> do you cap retrieval spend per request, per task, or not at all? And has anyone actually needed
> multi-provider fallback in production, or is that solving a problem nobody has?

*(Put the GitHub link in a comment. The question is genuine — the answers are discovery data.)*

### 4.6 Replies to the three demand-ledger threads

Post from the owner's account, disclose affiliation, no link unless the sub allows it. Sources in
the [demand ledger](demand-test-candidates-2026-07-18.md).

**Thread 1 — Tavily alternatives (r/Agent_AI):**
> Ran into the same wall: multiple consumer apps, thousands of daily queries, and no single provider
> is best across freshness, extraction, and cost. What fixed it for me wasn't switching providers
> again but putting a routing layer in front — per-request cost cap + deadline, provider selected by
> task, and a receipt of every decision so regressions are debuggable. I open-sourced mine
> (FetchMux, self-hosted BYOK — I'm the author, so bias declared). Even if you build your own, the
> pattern I'd recommend: never let an agent call a search API without a spend ceiling attached.

**Thread 2 — search/scraping API trade-offs (r/LocalLLM):**
> The trade-off you're describing (authoritative-source quality vs extraction vs concurrency vs
> token volume) is exactly why I stopped treating this as "pick the perfect provider" and started
> treating it as routing: classify the request (fresh facts / docs / page content / scholarly),
> route to whichever configured provider fits, cap cost and latency per request, and log the
> decision, not the query. I maintain an Apache-2.0 self-hosted router that does this (FetchMux —
> author bias declared). Happy to share the policy design even if you roll your own.

**Thread 3 — five-provider benchmark author (r/LocalLLM):**
> This is a genuinely useful methodology — the criticism about query realism cuts at most public
> benchmarks too. One suggestion from building routing infrastructure: measure *per-task-class*
> rather than overall, because provider rankings flip between fresh-news, technical-docs, and
> page-extraction workloads, and an overall score hides that. (I build a self-hosted retrieval
> router, FetchMux, so declared bias — your benchmark shape is close to what our routing policy
> consumes.)

### 4.7 Product Hunt (optional, week 2)

- **Name:** FetchMux
- **Tagline:** One retrieval endpoint for AI agents — budgets, routing, receipts
- **Description:** FetchMux is a self-hosted gateway that sits between your AI agent and web-search
  providers (Brave, Tavily, Exa, Firecrawl, Crossref — your keys). Each request carries a hard cost
  ceiling and deadline; the deterministic policy picks the provider; every response returns a route
  receipt your team can audit. REST, TypeScript SDK, and MCP server. Apache-2.0.
- **First comment:** the Show HN body, lightly rewritten.

## 5. First-buyer playbook (14 days)

The offer is already defined: USD 849 founding pilot (USD 750 setup + USD 99 first month),
customer-owned provider accounts, single-tenant deployment, one agreed metric. Qualification and
delivery live in [founding-pilot.md](founding-pilot.md); score every conversation with
[discovery-script.md](discovery-script.md). Count only qualified conversations and paid pilots.

**Day 0 — owner gates (blocking, ~2–3 hours):**
1. Run the [public-release runbook](../runbooks/public-release.md): review LICENSE, flip GitHub to
   public, `npm publish` both packages, MCP registry publish.
2. Reactivate the existing sole-trader ABN (free, abr.gov.au via myGov) — the ABR showed it
   cancelled as of 2026-07-22 — and confirm the public record reads **Active** before quoting or
   invoicing. GST registration is not required under AUD 75k turnover — confirm with an accountant.
   Details: untracked `.private/entity-record.md`.
3. Activate Stripe on the ABN; create the USD 849 one-time pilot checkout in **test mode** per
   [founding-pilot.md](founding-pilot.md). Go live on Stripe only when the legal checklist closes.

**Day 1:** Show HN in the US-morning window. Reply to every comment same-day. Post the X launch
post; pin it.

**Days 1–3:** r/mcp, then r/AI_Agents, then the three thread replies (one community per day).
Submit to Smithery, PulseMCP, mcp.so, Glama; open the `awesome-mcp-servers` PR.

**Days 2–14, the actual selling:** every GitHub star/issue, Reddit reply, and email is triaged the
same day: (a) technical users → help them succeed self-hosting, ask what workload they run; (b)
anyone describing spend, quota, failover, or integration-time pain → offer a 30-minute call; (c) on
the call, run the discovery script; if they pass the gate, send the pilot offer and the Stripe
checkout. Also send the warm-intro ask (below) to any founder/engineer contacts. Post the X
demand-test post on day 3–4.

**Warm-intro ask (DM/email, personalize the first line):**
> I've open-sourced a retrieval router for AI agents and I'm taking three founding pilot customers
> — teams already paying for two or more search/scrape APIs who want per-request budgets and an
> audit trail. Paid pilot, 30 days, one measured outcome, kill it if it doesn't help. Know anyone
> running agents in production with a real retrieval bill?

**What "first buyer" realistically looks like:** an engineer or founder who found the repo through
HN/MCP listings, self-hosted it, hit a real workload question, and converts on a call. Expect 2–6
weeks from launch if inbound is answered fast. The kill criteria in
[pilot-readiness](../release/pilot-readiness-2026-07-18.md) stand: ten qualified conversations with
no urgent paid pain means the offer changes, not the volume of posting.

## 6. What was deliberately not done

- No post was published and no one was contacted — every item above is a draft for owner review.
- No live Stripe object was created; payment stays gated on the entity/tax/contract checklist.
- No paid advertising; no cold outreach lists; no provider partnership claims.
