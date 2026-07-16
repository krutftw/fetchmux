# Data handling runbook

## Founding data posture

FetchMux is a stateless, single-tenant/self-hosted gateway in the founding build. It has no database,
hosted credential vault, account system, billing ledger, or built-in telemetry retention. Stateless
does not mean data-free: queries, returned evidence, URLs, provider metadata, credentials, and route
events cross process boundaries and must be handled deliberately.

## Data flow

1. A client sends a retrieval request and FetchMux bearer key to the gateway.
2. The gateway validates the request and policy.
3. The router selects an eligible provider using configuration and in-memory health state.
4. The adapter sends the necessary query and translated controls to that provider over HTTPS.
5. The provider returns search or content results.
6. FetchMux normalizes the response in memory and returns evidence plus a route receipt.
7. The standard event sink writes allowlisted operational fields to stdout.

The router does not interpret provider content as instructions.

## Data inventory

| Data | Location in founding build | Default persistence | Sensitivity |
| --- | --- | --- | --- |
| FetchMux gateway keys | Process environment | Process/deployment secret store | Secret |
| Provider API keys | Process environment | Process/deployment secret store | Secret |
| Query and filters | Request memory and provider request | None by FetchMux | Customer data; may be sensitive |
| Provider result content | Process memory and client response | None by FetchMux | Customer/provider data |
| Normalized URLs and metadata | Client response | None by FetchMux | Potential customer data |
| Route receipt | Client response | None by FetchMux | Operational data |
| Route event | stdout | Operator-defined | Operational metadata |
| In-memory circuit state | Gateway process | Until restart | Operational metadata |
| Benchmark live report | Operator-selected ignored file | Until operator deletes it | May contain customer URLs/labels |
| Illustrative report | Repository | Permanent | Fabricated, non-customer data |

## Standard logs

The gateway event allowlist contains:

- request ID;
- HTTP method and route template;
- status code and latency;
- selected provider;
- estimated cost;
- reason codes;
- whether fallback was used.

It excludes query text, request bodies, authorization headers, provider keys, raw upstream bodies,
snippets, fetched content, and normalized result URLs. Tests assert the standard event sink does not
contain the query.

Fastify request logging is disabled in the founding runtime. Reverse proxies, container platforms,
APM agents, and custom patches are outside that guarantee and must be reviewed separately.

## Retention

FetchMux defines no default persistent retention because it stores no database records. The operator
must define retention for:

- process and proxy logs;
- benchmark reports;
- customer-supplied workloads;
- support attachments;
- provider account audit records;
- backups.

Use the shortest retention that satisfies the documented operational and legal need. Keep secrets out
of backups that are not designed as secret stores. Document deletion behavior and backup expiration
before a commercial pilot.

## Private benchmark queries

Private report mode writes `queryText: null` and excludes query text from the workload configuration
hash. A private-query reference file is read locally only when explicitly supplied. Keep it outside
git and restrict filesystem access. Generated reports belong under ignored `benchmarks/results/`.

The benchmark stores normalized result URLs but not snippets or raw provider page bodies. URLs can
still expose customer intent, internal hostnames, account identifiers, or query parameters. Review
every report before sharing it.

## Public site

The static site receives no provider or gateway credentials. Only variables prefixed for Vite and
used in client code are public. `VITE_PILOT_CONTACT_URL` must therefore contain only a safe public
contact destination. Never place a key in any `VITE_*` variable.

The founding site has no analytics, tracking pixel, form submission, cookie, or configured intake URL.
Adding any of those requires an updated data map, privacy notice, retention decision, consent analysis,
and vendor review.

## Access control

- Keep the gateway on loopback or a private network behind TLS and network controls.
- Protect `/v1/*` with long random FetchMux bearer keys.
- Use rotation keys only during a bounded migration.
- Limit provider-account access separately from FetchMux access.
- Limit logs and reports to people who need the underlying customer data.
- Do not use `FETCHMUX_AUTH_DISABLED=true` on a network-reachable gateway.

The founding build has no user identities, roles, tenant IDs, or per-customer authorization. One
deployment must therefore serve one trust boundary unless a separate reviewed isolation layer exists.

## Customer and provider responsibilities

Before using production or personal data, establish:

- who is controller, processor, service provider, or independent party as applicable;
- whether queries or fetched pages contain personal, confidential, regulated, or copyrighted data;
- provider retention and model-training settings;
- permitted purposes under provider and source-site terms;
- data location and transfer requirements;
- breach and deletion contacts;
- a DPA or other required agreement.

This runbook is an engineering record, not legal advice.

## Support handling

Ask customers for request IDs, safe route receipts, provider name, timestamps, and classified error
codes. Do not ask them to send provider keys, FetchMux keys, full private queries, or raw provider
bodies through ordinary support channels. If sensitive reproduction data is essential, use an agreed
secure transfer method and delete it under the incident or support retention policy.

## Gate for hosted multi-tenancy

Do not store customer provider keys in a hosted FetchMux service until all of these exist and have
been reviewed:

- tenant-bound identity and authorization;
- encryption at rest and in transit with managed key rotation;
- secret access audit logging;
- tenant isolation tests across secret, cache, trace, metric, and backup paths;
- deletion and retention controls;
- incident response and customer notification procedures;
- privacy policy, terms, DPA, subprocessors, and regional analysis;
- threat model and independent security review;
- restore tests that preserve tenant isolation.

Until then, BYOK means keys stay in the customer's own FetchMux process.
