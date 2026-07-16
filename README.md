# FetchMux

FetchMux is a provider-neutral retrieval router for AI agents. A client sends one stable search
request; FetchMux selects an eligible customer-configured provider, enforces cost and deadline
limits, normalizes the evidence, and returns an auditable route receipt.

> One retrieval API. The right provider for every request.

The founding product is deliberately narrow: web search and page retrieval through customer-owned
provider accounts. It is not a generic API proxy, pooled-credit reseller, or claim that upstream
APIs are interchangeable.

## Status

Private founding build. `FetchMux` is a provisional working name pending formal domain, trademark,
and company-name clearance. No provider partnership, endorsement, or resale right is implied.

What exists today:

- deterministic policy ranking with task, cost, quality, latency, and reliability inputs;
- hard pre-request budgets and absolute deadlines;
- retryable-failure-only fallback and an in-memory circuit breaker;
- BYOK adapters for Brave, Tavily, Exa, and Firecrawl;
- protected REST, typed TypeScript SDK, and read-only MCP interfaces;
- a 24-case reproducible benchmark workload with a zero-network dry run;
- a browser-tested founding site and local container packaging.

What does not exist yet:

- hosted multi-tenant credential storage;
- provider credit resale or autonomous provider signup;
- learned routing backed by customer outcomes;
- a public package, public site, or completed live provider benchmark.

## Prerequisites

- Node.js 24 and npm 11;
- Git;
- Docker Desktop only if using the container path;
- at least one supported provider key for a ready gateway.

## Quick start

Install, build, and test from the repository root:

```powershell
npm clean-install
npm run build
npm test
```

Set a gateway key and one provider key in the current PowerShell session. Cost values must come from
the operator's actual provider plan; the number below is only a shape placeholder and must be
replaced before using dollar budgets.

```powershell
$env:FETCHMUX_API_KEY = "replace-with-a-long-random-gateway-key"
$env:BRAVE_API_KEY = "replace-with-your-provider-key"
$env:BRAVE_COST_PER_REQUEST_USD = "replace-with-your-real-cost"
npm run dev:gateway
```

In another terminal:

```powershell
$headers = @{
  Authorization = "Bearer replace-with-a-long-random-gateway-key"
  "Content-Type" = "application/json"
}
$body = @{
  query = "latest stable Node.js release"
  task = "fresh_facts"
  priority = "balanced"
  maxCostUsd = 0.02
  maxLatencyMs = 8000
  limit = 8
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8787/v1/search" -Headers $headers -Body $body
```

`/health` reports process health. `/ready` returns `503` until at least one provider key is
configured. Protected `/v1/*` routes return `503` if FetchMux authentication itself has no key.

## Configuration

The process does not automatically load `.env` during local Node development. Set variables in the
shell or use an operator-controlled process manager. Docker Compose reads the ignored `.env` file.

| Variable | Default | Purpose |
| --- | --- | --- |
| `FETCHMUX_API_KEY` | none | One protected-route bearer key |
| `FETCHMUX_API_KEYS` | none | Comma-separated keys for rotation |
| `FETCHMUX_AUTH_DISABLED` | `false` | Exact `true` bypass for trusted local use only |
| `FETCHMUX_ALLOWED_ORIGINS` | none | Comma-separated browser origins; CORS is absent when empty |
| `FETCHMUX_HOST` | `127.0.0.1` | Gateway bind address |
| `FETCHMUX_PORT` | `8787` | Gateway TCP port |
| `BRAVE_API_KEY` | none | Brave customer credential |
| `TAVILY_API_KEY` | none | Tavily customer credential |
| `EXA_API_KEY` | none | Exa customer credential |
| `FIRECRAWL_API_KEY` | none | Firecrawl customer credential |
| provider cost variables | none | Customer-plan estimates used by dollar budgets |
| `VITE_PILOT_CONTACT_URL` | none | Safe `https:` or `mailto:` site CTA; unavailable when blank |

See [provider configuration](docs/runbooks/provider-configuration.md) before enabling `maxCostUsd`.

## Interfaces

### REST

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| `GET` | `/health` | public | Process health and version |
| `GET` | `/ready` | public | Provider readiness |
| `GET` | `/v1/providers` | bearer | Safe provider configuration status |
| `POST` | `/v1/route/preview` | bearer | Ranked candidates, no provider call |
| `POST` | `/v1/search` | bearer | Routed retrieval and route receipt |

The complete FetchMux contract is [docs/openapi.yaml](docs/openapi.yaml). It is not an upstream
provider contract.

### TypeScript SDK

The SDK is a workspace package in the founding build; it has not been published to a registry.

```typescript
import { FetchMux } from "@fetchmux/sdk";

const client = new FetchMux({
  baseUrl: "http://127.0.0.1:8787/",
  apiKey: process.env.FETCHMUX_API_KEY,
  fetch: globalThis.fetch.bind(globalThis),
});

const response = await client.search({
  query: "latest stable Node.js release",
  task: "fresh_facts",
  maxCostUsd: 0.02,
});
```

### MCP

Build the workspace, start the gateway, and add the compiled stdio server to an MCP client:

```json
{
  "mcpServers": {
    "fetchmux": {
      "command": "node",
      "args": ["C:/absolute/path/to/fetchmux/apps/mcp/dist/main.js"],
      "env": {
        "FETCHMUX_BASE_URL": "http://127.0.0.1:8787/",
        "FETCHMUX_API_KEY": "replace-with-the-gateway-key"
      }
    }
  }
}
```

The tools are `search_web` and `preview_search_route`; both are annotated read-only.

## Benchmark

Validate all 96 founding case-provider pairs without network calls or credits:

```powershell
npm run benchmark -- --workload benchmarks/workloads/founding-v1.json --mode dry-run
```

Live mode is deliberately harder to trigger. It requires provider credentials, explicit
`--confirm-live`, and an ignored output file:

```powershell
$env:FETCHMUX_CODE_VERSION = git rev-parse HEAD
npm run benchmark -- --workload benchmarks/workloads/founding-v1.json --mode live --confirm-live --output benchmarks/results/founding-v1-live.json
```

Read the [benchmark methodology](docs/research/benchmark-methodology.md) before interpreting a run.

## Docker

Copy the environment template, enter real secrets locally, and start the loopback-only container:

```powershell
Copy-Item .env.example .env
# Edit .env locally. Never commit it.
docker compose up --build -d
Invoke-RestMethod http://127.0.0.1:8787/health
docker compose logs --follow gateway
```

The runtime image uses the upstream Node `node` user, drops Linux capabilities in Compose, supports
a read-only root filesystem, and receives provider credentials only at container start.

## Development commands

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run dev:gateway
npm run dev:site
```

## Operating documentation

- [Local development](docs/runbooks/local-development.md)
- [Deployment](docs/runbooks/deployment.md)
- [Provider configuration](docs/runbooks/provider-configuration.md)
- [Incident response](docs/runbooks/incident-response.md)
- [Data handling](docs/runbooks/data-handling.md)
- [Product decision](docs/product-design.md)
- [Operating plan](docs/business/operating-plan.md)
- [Validation scorecard](docs/business/validation-scorecard.md)
- [Risk register](docs/business/risk-register.md)

## Logging and persistence

Gateway route events go to stdout as structured JSON and exclude query text, provider keys, raw
provider bodies, and result content. The founding gateway has no database and no built-in metrics
retention. Configure process-log retention deliberately and treat normalized URLs and provider
metadata returned to callers as customer data.

## License

No public software license has been granted for this private founding build. Choose and add a
license before opening the repository or accepting outside contributions.
