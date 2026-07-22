# @fetchmux/sdk

Typed TypeScript client for [FetchMux](https://fetchmux.com), the self-hosted retrieval router for
AI agents. One request shape for web search and page retrieval; hard per-request cost and deadline
limits; a route receipt on every response.

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
  maxLatencyMs: 8000,
});

console.log(response.route.selectedProvider, response.route.reasonCodes);
```

Requires a running FetchMux gateway. Full documentation, the OpenAPI contract, and the gateway
source are at [github.com/krutftw/fetchmux](https://github.com/krutftw/fetchmux).

Apache-2.0.
