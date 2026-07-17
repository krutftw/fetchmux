# FetchMux Machine-First Domain Design

**Date:** 2026-07-17  
**Status:** Approved founding direction  
**Canonical domain:** `fetchmux.com`

## Decision

FetchMux will be machine-first and human-governed. AI agents are the runtime users, but a human or an accountable organization still chooses the service, approves credentials, accepts provider terms, controls budgets, and pays FetchMux. A machine-only surface would therefore remove the trust and authorization layer that makes the product commercially usable. A conventional marketing-only site would make the product harder for agents and coding assistants to integrate.

The public domain will use a dual-plane design. The machine plane exposes stable, cacheable artifacts at predictable URLs: the OpenAPI contract in YAML and JSON, `robots.txt`, `sitemap.xml`, `llms.txt`, and a fuller plain-text product brief. The HTML includes canonical metadata and structured software data. These artifacts describe the current self-hosted/BYOK product truth and must not advertise a public API endpoint, provider partnership, customer result, or remote MCP endpoint that does not exist.

The human plane remains concise: what FetchMux does, why routing is inspectable, current integration paths, pricing hypotheses, and a founding-pilot contact. It makes clear that the domain is secured while trademark clearance remains pending. Cloudflare Pages hosts only static output. The operator-IP-restricted Azure gateway remains private.

## Discovery and distribution

Website crawling is a supporting channel, not the installation mechanism. The site will allow legitimate search, user-fetch, and training crawlers during the founding discovery phase because the published material contains no customer data or secrets. `llms.txt` is an inexpensive community convention, not a promise of model ranking. OpenAPI is the canonical HTTP contract.

The official MCP Registry is the primary future agent-distribution channel. FetchMux will reserve the domain-authenticated namespace `com.fetchmux/retrieval`, but it will not publish registry metadata until either a public npm MCP package or a safely authenticated Streamable HTTP server exists. A remote server will require origin validation, scoped authentication, explicit human authorization, rate limits, and tenant isolation before `mcp.fetchmux.com/mcp` becomes public.

Cloudflare Pages receives direct, commit-pinned deployments from the private Azure Repos worktree. The apex domain is canonical. Cloudflare Email Routing provides `hello@fetchmux.com` and `security@fetchmux.com` only after forwarding is verified. Deployment remains reversible through Pages deployment rollback and DNS/custom-domain removal.

## Success criteria

- Every advertised machine artifact returns `200` with the intended content type.
- The public OpenAPI files are derived from `docs/openapi.yaml`, not maintained separately.
- No public artifact contains secrets, private Azure hostnames, customer claims, or a public hosted-service claim.
- Search and AI retrieval crawlers are not blocked by `robots.txt` or Cloudflare challenges.
- `fetchmux.com` is HTTPS-only and canonical; `www` redirects to the apex when configured.
- A human can understand the approval boundary and contact FetchMux without exposing provider keys.

