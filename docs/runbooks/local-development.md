# Local development runbook

## Goal

Run the gateway, site, benchmark dry-run, SDK, and MCP server from source without leaking provider
credentials or accidentally consuming live benchmark credits.

## Prerequisites

```powershell
node --version
npm --version
git --version
```

Expected founding toolchain: Node.js 24, npm 11, and Git. Run every command below from the repository
root unless a step says otherwise.

## Install and verify

```powershell
npm clean-install
npm test
npm run typecheck
npm run lint
npm run build
```

`npm clean-install` is an alias for the locked `npm ci` workflow on this repository. Do not use
`npm update` as an installation step.

## Configure one local provider

The Node development process does not load `.env` automatically. Set variables only in the terminal
that will run the gateway:

```powershell
$env:FETCHMUX_API_KEY = "replace-with-a-long-random-local-key"
$env:BRAVE_API_KEY = "replace-with-your-brave-key"
$env:BRAVE_COST_PER_REQUEST_USD = "replace-with-your-account-cost"
```

Do not paste real credentials into source, test fixtures, terminal commands saved in shared history,
issue bodies, or chat. If shell-history exposure is a concern, use an operator-controlled secret
manager or process manager instead.

Cost values come from the operator's provider agreement. Leave a cost blank rather than guessing.
Requests with `maxCostUsd` exclude providers whose pre-request cost is unknown.

## Start the gateway

```powershell
npm run dev:gateway
```

Expected startup line:

```json
{"type":"startup","host":"127.0.0.1","port":8787,"version":"0.1.0"}
```

Check public probes from another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
Invoke-WebRequest http://127.0.0.1:8787/ready -SkipHttpErrorCheck
```

`/ready` returns `200` when at least one provider route is available and `503` otherwise. A configured cost
is not required for readiness.

## Call the protected API

```powershell
$headers = @{
  Authorization = "Bearer replace-with-a-long-random-local-key"
  "Content-Type" = "application/json"
}

$preview = @{
  query = "latest stable Node.js release"
  task = "fresh_facts"
  priority = "balanced"
  maxCostUsd = 0.02
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8787/v1/route/preview" -Headers $headers -Body $preview
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8787/v1/search" -Headers $headers -Body $preview
```

The preview route never calls an upstream provider. Search may consume provider credits.

## Start the site

```powershell
npm run dev:site
```

Open `http://127.0.0.1:4173/`. `VITE_PILOT_CONTACT_URL` is compiled into the public client bundle;
it must never contain a secret. When it is blank or unsafe, the site shows an unavailable pilot
state.

## Run MCP locally

Build first, keep the gateway running, then configure an MCP client to launch:

```powershell
node apps/mcp/dist/main.js
```

The stdio process speaks protocol on stdout. Diagnostic output must not be added to stdout because it
would corrupt MCP messages. Configure these variables in the MCP client's process environment:

```text
FETCHMUX_BASE_URL=http://127.0.0.1:8787/
FETCHMUX_API_KEY=<same gateway key>
```

## Run the benchmark safely

Dry-run is the default and performs no provider calls:

```powershell
npm run benchmark -- --workload benchmarks/workloads/founding-v1.json --mode dry-run
```

Do not run live mode merely to test the CLI. The founding workload plans 96 paid-capable calls. Live
mode requires all four provider keys, explicit confirmation, and an output file under the ignored
`benchmarks/results/` directory.

## Auth bypass for isolated local debugging

Use only when the process is bound to loopback and no untrusted user can reach it:

```powershell
$env:FETCHMUX_AUTH_DISABLED = "true"
npm run dev:gateway
```

Only exact lowercase `true` disables authentication, and startup emits a warning. Remove the variable
before testing authentication. Never combine this setting with `FETCHMUX_HOST=0.0.0.0` on a shared
or network-reachable machine.

## Stop and clean up

Press Ctrl+C in each development terminal. The gateway handles `SIGINT` and closes Fastify before the
process exits. Clear secret variables when finished:

```powershell
Remove-Item Env:FETCHMUX_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:BRAVE_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:BRAVE_COST_PER_REQUEST_USD -ErrorAction SilentlyContinue
Remove-Item Env:FETCHMUX_AUTH_DISABLED -ErrorAction SilentlyContinue
```

## Common failures

| Symptom | Cause | Action |
| --- | --- | --- |
| `/v1/*` returns `503 NOT_READY` | No FetchMux gateway key | Set `FETCHMUX_API_KEY` or rotation keys |
| `/ready` returns 503 | No available provider | Configure one provider key, or explicitly enable Crossref with a valid contact email |
| Preview has no eligible provider with a dollar budget | Cost estimate missing or over budget | Configure the actual account cost or remove the budget during diagnosis |
| Browser has no CORS header | Origin not explicitly allowed | Set `FETCHMUX_ALLOWED_ORIGINS` to exact origins |
| Port startup fails | Port in use or invalid | Set `FETCHMUX_PORT` to an integer from 1 through 65535 |
| MCP client reports protocol errors | Non-protocol text on stdout or gateway unavailable | Keep MCP stdout clean and verify `FETCHMUX_BASE_URL` |
