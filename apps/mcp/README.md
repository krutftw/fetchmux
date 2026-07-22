# @fetchmux/mcp

Read-only [MCP](https://modelcontextprotocol.io) server for
[FetchMux](https://fetchmux.com), the self-hosted retrieval router for AI agents. Exposes two
tools, both annotated read-only:

- `search_web` — routed web search with per-request `maxCostUsd` and `maxLatencyMs`, returning
  normalized evidence plus a route receipt (selected provider, attempts, reason codes, estimated
  cost, latency, trace ID);
- `preview_search_route` — ranked provider candidates for a request without calling any provider.

Requires a running FetchMux gateway (self-hosted, BYOK). Client configuration:

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

Gateway source, quick start, and the OpenAPI contract:
[github.com/krutftw/fetchmux](https://github.com/krutftw/fetchmux).

Apache-2.0.
