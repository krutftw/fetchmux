# FetchMux demand-test candidate ledger

- **Snapshot:** 2026-07-18, Australia/Perth
- **Status:** research only; no contact or public reply approved
- **Counting rule:** a public pain signal is not a lead, a lead is not a qualified conversation, and
  a qualified conversation is not revenue

This ledger prevents public posts and issue authors from being inflated into pipeline. A candidate
becomes qualified only after the discovery gate confirms buyer authority, at least two providers or
an active funded provider decision, at least 50 representative queries, and material economic pain.

## Revenue-discovery candidates

| Candidate | Public evidence | Why it is relevant | Missing before qualification | Permitted next channel |
| --- | --- | --- | --- | --- |
| Anonymous startup-studio builder | [Reddit thread](https://www.reddit.com/r/Agent_AI/comments/1sy37gs/tavily_alternatives_for_search_api_in_2026/) | Reports multiple live-search consumer apps, hundreds or thousands of daily queries, inconsistent results, limited ranking control, and rising parallel-agent cost. | Company identity, role and authority, actual spend, failure impact, representative dataset, and willingness to pay. | Public Reddit reply only after owner approval; no identity enrichment. |
| Anonymous fact-checking pipeline builder | [Reddit thread](https://www.reddit.com/r/LocalLLM/comments/1tk4kxb/struggling_to_find_the_perfect_searchscraping_api/) | Reports provider-specific trade-offs across authoritative-source quality, extraction, concurrency, token volume, and cost. | Production status, query volume, buyer authority, budget, and whether the project is commercial. | Public Reddit reply only after owner approval. |
| Public benchmark builder at an unnamed SOC 2 company | [Reddit thread](https://www.reddit.com/r/LocalLLM/comments/1uvjaf8/tested_5_web_search_apis_so_you_dont_have_to_full/), [artifact](https://github.com/viraj43/RAG_benchmark) | Built a 252-query, five-provider test for a customer-support Slackbot and is already revising the methodology after community criticism. | Employer identity, authority, actual provider decision, recurring spend, terms clearance, and willingness to buy rather than collaborate. | A public, non-promotional methodology reply only after approval; do not use an issue or commit as a sales channel. |

None of these records is a qualified lead. The first two are anonymous and the third does not name
the employer. They are useful for discovery language and may produce an inbound conversation, but
they must not appear in a revenue forecast.

## Distribution and integration candidates

| Candidate | Public evidence | What it proves | Commercial limitation |
| --- | --- | --- | --- |
| OpenClaw | [Provider fallback request](https://github.com/openclaw/openclaw/issues/23330) | A user wants deterministic provider fallback when quota is exhausted. | The project can implement this upstream; one issue does not identify a payer. Do not pitch in the issue. |
| Open WebUI | [Context API request](https://github.com/open-webui/open-webui/issues/24120) | Retrieval token budgets, scraping latency, blocking, and extraction consistency affect agent quality and cost. | The issue is closed and proposes a direct provider integration. It is distribution evidence, not an account. |
| Hermes Agent | [Provider architecture request](https://github.com/NousResearch/hermes-agent/issues/19197), [configuration request](https://github.com/NousResearch/hermes-agent/issues/21003) | Users want search and extraction providers configured separately for production-like workflows. | A native implementation can remove the need for FetchMux. Treat it as compatibility research, not pipeline. |

## Acquisition decision

There is no defensible ten-account outbound list yet. The immediate test is therefore:

1. publish the already prepared X buyer-research post only after the owner approves its exact text;
2. ask for warm introductions to technical founders with a recurring retrieval workload;
3. run the discovery score before offering a pilot;
4. count only qualified calls and paid pilots, never likes, anonymous replies, stars, or issue votes;
5. stop or change the offer if ten qualified conversations and three paid-pilot asks do not support it.

No message, reply, direct message, issue comment, or payment link may be sent from this ledger without
the separate approval and checks required by [the outreach sequence](outreach-sequences.md).
