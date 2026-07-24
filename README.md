# FetchMux

[![npm](https://img.shields.io/npm/v/@fetchmux/mcp?label=%40fetchmux%2Fmcp&color=cb0000)](https://www.npmjs.com/package/@fetchmux/mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A524-3c873a)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-registry-6d5efc)](https://registry.modelcontextprotocol.io)

**One search endpoint for AI agents.** Put a router in front of Brave, Tavily, Exa, Firecrawl, and
Crossref. Every request carries a hard cost ceiling and deadline; every response comes back with a
receipt that says which provider ran, why, and what it cost.

Your agents stop hard-coding a provider into prompts and app code. They send one request shape; the
gateway picks an eligible provider under a policy you control, enforces the budget and deadline
before the call, retries safely on failure, and returns normalized results plus a full trace. You
keep your provider keys — they never leave your gateway.

## The receipt

Nothing is a black box. Every `/v1/search` response carries the routing decision:

```jsonc
"route": {
  "selectedProvider": "brave",
  "attemptedProviders": ["brave"],
  "reasonCodes": ["TASK_MATCH", "WITHIN_BUDGET", "RELIABILITY_WEIGHT"],
  "attempts": [
    { "provider": "brave", "outcome": "success", "latencyMs": 640, "estimatedCostUsd": 0.005 }
  ],
  "estimatedCostUsd": 0.005,
  "latencyMs": 640,
  "fallbackUsed": false,
  "traceId": "rt_b400e7c8"
}
```

## How it routes

```
  agent  ──▶  { query · task · maxCostUsd · maxLatencyMs }
                             │
                             ▼
                      ┌──────────────┐        your keys
                      │   FetchMux    │ ─────▶ Brave · Tavily · Exa
                      │    policy     │        Firecrawl · Crossref
                      └──────────────┘ ◀─────  (bring your own)
                             │
                             ▼
  agent  ◀──  evidence[]  +  route receipt
```

A provider is eligible only when its credentials, task fit, circuit state, spend, and deadline all
pass. Budgets and deadlines are eligibility rules, not best-effort hints. Fallback happens only on
retryable failures.

## Quick start

No provider account needed — the public Crossref route runs out of the box:

```bash
git clone https://github.com/krutftw/fetchmux
cd fetchmux
npm install
npm run build

export FETCHMUX_API_KEY="a-long-random-key"
export CROSSREF_ENABLED=true
export CROSSREF_CONTACT_EMAIL="you@example.com"
npm run dev:gateway
```

From another shell:

```bash
curl http://127.0.0.1:8787/v1/search \
  -H "Authorization: Bearer a-long-random-key" \
  -H "Content-Type: application/json" \
  -d '{ "query": "retrieval augmented generation", "task": "scholarly", "maxLatencyMs": 8000 }'
```

To route real web search, set a provider key and use a web task instead:

```bash
export FETCHMUX_API_KEY="a-long-random-key"
export BRAVE_API_KEY="your-brave-key"
export BRAVE_COST_PER_REQUEST_USD="0.005"   # from your provider plan
npm run dev:gateway
```

New to Firecrawl? New accounts get 10% off the first month through
[this link](https://firecrawl.link/kurt-robert-landman) (referral — FetchMux earns a small
commission, no extra cost to you).

## Use it from an agent

Point any MCP client (Claude, Cursor, and friends) at the published server:

```json
{
  "mcpServers": {
    "fetchmux": {
      "command": "npx",
      "args": ["-y", "@fetchmux/mcp"],
      "env": {
        "FETCHMUX_BASE_URL": "http://127.0.0.1:8787/",
        "FETCHMUX_API_KEY": "your-gateway-key"
      }
    }
  }
}
```

Two read-only tools: `search_web` and `preview_search_route`.

Or use the typed SDK, [`@fetchmux/sdk`](https://www.npmjs.com/package/@fetchmux/sdk):

```typescript
import { FetchMux } from "@fetchmux/sdk";

const client = new FetchMux({
  baseUrl: "http://127.0.0.1:8787/",
  apiKey: process.env.FETCHMUX_API_KEY,
  fetch: globalThis.fetch.bind(globalThis),
});

const res = await client.search({
  query: "latest stable Node.js release",
  task: "fresh_facts",
  maxCostUsd: 0.02,
});
```

## Providers

Bring your own key for each. Set the matching `*_API_KEY`, plus an optional
`*_COST_PER_REQUEST_USD` if you want dollar budgets enforced.

| Provider | Use | Key |
| --- | --- | --- |
| Brave | web search | `BRAVE_API_KEY` |
| Tavily | web search, research | `TAVILY_API_KEY` |
| Exa | web search, docs | `EXA_API_KEY` |
| Firecrawl | page content | `FIRECRAWL_API_KEY` |
| Crossref | scholarly metadata | none (`CROSSREF_ENABLED=true`) |

## REST endpoints

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| `GET` | `/health` | public | Process health and version |
| `GET` | `/ready` | public | Provider readiness |
| `GET` | `/v1/providers` | bearer | Provider configuration status |
| `POST` | `/v1/route/preview` | bearer | Ranked candidates, no provider call |
| `POST` | `/v1/search` | bearer | Routed retrieval and route receipt |

Full contract: [docs/openapi.yaml](docs/openapi.yaml).

<details>
<summary><b>All configuration variables</b></summary>

The process does not auto-load `.env` in local Node development; set variables in the shell or a
process manager. Docker Compose reads the ignored `.env` file.

| Variable | Default | Purpose |
| --- | --- | --- |
| `FETCHMUX_API_KEY` | none | Protected-route bearer key |
| `FETCHMUX_API_KEYS` | none | Comma-separated keys for rotation |
| `FETCHMUX_AUTH_DISABLED` | `false` | Exact `true` bypasses auth (trusted local use only) |
| `FETCHMUX_ALLOWED_ORIGINS` | none | Comma-separated browser origins; no CORS when empty |
| `FETCHMUX_HOST` | `127.0.0.1` | Bind address |
| `FETCHMUX_PORT` | `8787` | TCP port |
| `BRAVE_API_KEY` / `TAVILY_API_KEY` / `EXA_API_KEY` / `FIRECRAWL_API_KEY` | none | Provider credentials |
| `CROSSREF_ENABLED` | `false` | Exact `true` enables the credential-free scholarly route |
| `CROSSREF_CONTACT_EMAIL` | none | Monitored contact for Crossref's polite pool |
| `*_COST_PER_REQUEST_USD` | none | Per-provider cost estimates used by dollar budgets |

See [provider configuration](docs/runbooks/provider-configuration.md) before enabling `maxCostUsd`.

</details>

## Run in Docker

```bash
cp .env.example .env    # add your keys, never commit it
docker compose up --build -d
curl http://127.0.0.1:8787/health
```

Non-root Distroless image: Linux capabilities dropped, read-only root filesystem, provider
credentials passed only at container start.

## Benchmark

Validate every case and provider pairing with no network calls or credits:

```bash
npm run benchmark -- --workload benchmarks/workloads/founding-v1.json --mode dry-run
```

Live mode needs provider keys and an explicit `--confirm-live`. Check each provider's terms before
publishing results — see the [benchmark methodology](docs/research/benchmark-methodology.md).

## What it is (and isn't)

Open source, self-hosted, single-tenant, BYOK. Route events go to stdout as JSON and exclude your
query text, keys, and result content by default. No database, no telemetry.

It is not a hosted service, a pooled-credit reseller, or a claim that these providers are
interchangeable. Provider names are the adapters it ships with, not partnerships. A hosted version
is on the roadmap — [star the repo](https://github.com/krutftw/fetchmux) to follow.

## Development

```bash
npm test          # 232 tests
npm run typecheck
npm run lint
npm run build
npm run dev:gateway
npm run dev:site
```

More docs: [product design](docs/product-design.md) ·
[local development](docs/runbooks/local-development.md) ·
[deployment](docs/runbooks/deployment.md) ·
[provider configuration](docs/runbooks/provider-configuration.md) ·
[data handling](docs/runbooks/data-handling.md) ·
[incident response](docs/runbooks/incident-response.md)

Security issues: [security@fetchmux.com](mailto:security@fetchmux.com).

## License

[Apache-2.0](LICENSE). Free to self-host, modify, and redistribute.
