import { parse as parseYaml } from "yaml";

export const machineSurfacePaths = [
  "_headers",
  "llms-full.txt",
  "llms.txt",
  "openapi.json",
  "openapi.yaml",
  "robots.txt",
  "sitemap.xml",
] as const;

export type MachineSurfacePath = (typeof machineSurfacePaths)[number];

export interface MachineSurfaceOptions {
  openapiYaml: string;
}

const canonicalOrigin = "https://fetchmux.com";

const withFinalNewline = (value: string): string => `${value.replaceAll("\r\n", "\n").trimEnd()}\n`;

const robots = withFinalNewline(`
User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: *
Allow: /

Sitemap: ${canonicalOrigin}/sitemap.xml
`);

const llms = withFinalNewline(`
# FetchMux

> Provider-neutral retrieval routing for AI agents, with inspectable policy decisions and route receipts.

FetchMux is machine-first and human-governed. It is currently a private BYOK preview: operators
provide and control their own upstream provider credentials. ${canonicalOrigin} publishes product
information and machine-readable contracts; it does not currently host a public API or remote MCP
service. No upstream partnership or resale right is claimed.

## Machine contracts

- [OpenAPI YAML](${canonicalOrigin}/openapi.yaml): Canonical HTTP gateway contract.
- [OpenAPI JSON](${canonicalOrigin}/openapi.json): JSON form derived from the canonical YAML.
- [Full product brief](${canonicalOrigin}/llms-full.txt): Status, boundaries, and integration model.
- [Website](${canonicalOrigin}/): Human-readable product and pilot information.
`);

const llmsFull = withFinalNewline(`
# FetchMux: machine-readable product brief

Canonical website: ${canonicalOrigin}/
OpenAPI YAML: ${canonicalOrigin}/openapi.yaml
OpenAPI JSON: ${canonicalOrigin}/openapi.json
Short agent brief: ${canonicalOrigin}/llms.txt

## What FetchMux is

FetchMux is a provider-neutral retrieval router for AI applications and agents. A caller submits one
bounded retrieval request. FetchMux evaluates eligible configured providers against task fit, cost,
latency, reliability, freshness, and operator policy, then returns normalized evidence with an
inspectable route receipt.

## Current availability

FetchMux is currently a private BYOK preview. The software can run as a self-hosted HTTP gateway and
local MCP server. The operator supplies and controls upstream provider credentials and remains
responsible for provider accounts, terms, budgets, and authorization. This website does not currently
host a public API or remote MCP service. Do not infer a network endpoint from the OpenAPI path names.

## Commercial and provider boundary

FetchMux is an independent routing layer. No upstream partnership or resale right is claimed. Provider
names describe optional technical integrations, not endorsement. The founding commercial model is a
paid setup or pilot followed by software and routing-policy subscriptions; prices on the website are
hypotheses until validated with customers.

## Integration contracts

- HTTP: ${canonicalOrigin}/openapi.yaml
- HTTP JSON schema document: ${canonicalOrigin}/openapi.json
- MCP: local stdio transport only during the private preview
- Authentication: operator-configured FetchMux bearer keys for protected HTTP routes
- Provider credentials: operator-controlled BYOK values; never submit credentials through this website

## Human approval boundary

AI agents may discover, inspect, and integrate the contracts. A human or accountable organization must
approve provider sign-ups, credentials, spending limits, deployment, and applicable terms. FetchMux
does not bypass upstream registration, billing, access controls, or terms of service.

## Discovery status

The domain and machine contracts are available for evaluation. A domain-authenticated MCP Registry
entry under the planned com.fetchmux/retrieval namespace will be considered only after a distributable
package or safely authenticated remote server exists.
`);

const sitemap = withFinalNewline(`
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${canonicalOrigin}/</loc></url>
  <url><loc>${canonicalOrigin}/openapi.yaml</loc></url>
  <url><loc>${canonicalOrigin}/openapi.json</loc></url>
  <url><loc>${canonicalOrigin}/llms.txt</loc></url>
  <url><loc>${canonicalOrigin}/llms-full.txt</loc></url>
</urlset>
`);

const headers = withFinalNewline(`
/*
  Content-Security-Policy: default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'
  Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY

/robots.txt
  Cache-Control: public, max-age=3600
  Content-Type: text/plain; charset=utf-8

/llms.txt
  Cache-Control: public, max-age=3600
  Content-Type: text/plain; charset=utf-8

/llms-full.txt
  Cache-Control: public, max-age=3600
  Content-Type: text/plain; charset=utf-8

/sitemap.xml
  Cache-Control: public, max-age=3600
  Content-Type: application/xml; charset=utf-8

/openapi.yaml
  Cache-Control: public, max-age=3600
  Content-Type: application/yaml; charset=utf-8

/openapi.json
  Cache-Control: public, max-age=3600
  Content-Type: application/json; charset=utf-8
`);

export function buildMachineSurface({
  openapiYaml,
}: MachineSurfaceOptions): Record<MachineSurfacePath, string> {
  const normalizedOpenapi = withFinalNewline(openapiYaml);
  const parsedOpenapi: unknown = parseYaml(normalizedOpenapi);

  if (!parsedOpenapi || typeof parsedOpenapi !== "object" || Array.isArray(parsedOpenapi)) {
    throw new TypeError("The canonical OpenAPI document must parse to an object");
  }

  return {
    _headers: headers,
    "llms-full.txt": llmsFull,
    "llms.txt": llms,
    "openapi.json": `${JSON.stringify(parsedOpenapi, null, 2)}\n`,
    "openapi.yaml": normalizedOpenapi,
    "robots.txt": robots,
    "sitemap.xml": sitemap,
  };
}
