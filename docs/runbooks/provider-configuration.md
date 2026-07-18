# Provider configuration runbook

## Principle

FetchMux uses customer-owned provider accounts and keys. It does not create provider accounts, pool
credits, hide upstream billing, or infer a customer's price from public marketing pages.

## Supported founding providers

| Provider | Credential variable | Cost variable | Cost unit used by the adapter |
| --- | --- | --- | --- |
| Brave Search | `BRAVE_API_KEY` | `BRAVE_COST_PER_REQUEST_USD` | one FetchMux search request |
| Tavily | `TAVILY_API_KEY` | `TAVILY_COST_PER_CREDIT_USD` | provider credit; quality mode estimates two credits |
| Exa | `EXA_API_KEY` | `EXA_COST_PER_REQUEST_USD` | one FetchMux search request |
| Firecrawl | `FIRECRAWL_API_KEY` | `FIRECRAWL_COST_PER_REQUEST_USD` | one FetchMux search request |
| Crossref Metadata | none; `CROSSREF_ENABLED=true` and `CROSSREF_CONTACT_EMAIL` | none | zero upstream API charge; scholarly metadata only |

These cost inputs are operator configuration, not FetchMux price claims. Reconcile them against the
customer's current provider plan, tier, discounts, overages, taxes, and credit rules.

Crossref is the deliberate exception to BYOK credentials. Its public REST API requires no signup or
API key. FetchMux keeps it disabled by default, requires a valid contact email, identifies itself in
the request, and uses it only for `scholarly` metadata. It does not retrieve or copy abstracts.

## Add a provider

1. Create or select the provider account under the customer or deploying operator.
2. Review the provider's current API terms and data-handling settings.
3. Create a least-privilege API key where the provider supports scopes.
4. Store the key in the deployment secret mechanism.
5. Determine the actual marginal cost unit for the configured operation.
6. Set the matching key and cost variables.
7. Restart FetchMux.
8. Check `/ready` and authenticated `/v1/providers`.
9. Run a route preview before a paid search.
10. Execute one controlled request and compare the route estimate with provider usage records.

Example for the current PowerShell process:

```powershell
$env:TAVILY_API_KEY = "replace-with-customer-key"
$env:TAVILY_COST_PER_CREDIT_USD = "replace-with-real-cost-per-credit"
npm run dev:gateway
```

## Interpret provider status

```powershell
$headers = @{ Authorization = "Bearer $env:FETCHMUX_API_KEY" }
Invoke-RestMethod http://127.0.0.1:8787/v1/providers -Headers $headers
```

Each entry contains:

- `available`: the provider has a non-blank key, or Crossref has valid explicit opt-in settings;
- `costConfigured`: the provider has a valid cost input, or its upstream API charge is known to be
  zero;
- `supportedTasks`: adapter capability profile used by eligibility filtering;
- `issues`: safe missing or invalid variable names, never variable values.

Readiness depends on `available`, not `costConfigured`. A provider with a key and unknown cost can
serve a request without `maxCostUsd`; it is excluded when a hard dollar budget is supplied.

### Enable the Crossref proof route

```powershell
$env:CROSSREF_ENABLED = "true"
$env:CROSSREF_CONTACT_EMAIL = "replace-with-your-contact@example.com"
npm run dev:gateway
```

Use `task: "scholarly"`. Crossref is excluded before a network call if a request asks for page
content, country, language, or domain filtering, because this adapter does not promise those shared
controls. Its zero estimate means zero Crossref API charge, not zero FetchMux compute, support, or
downstream-model cost.

The adapter also enforces Crossref's documented per-client ceiling locally: no more than three
concurrent calls and no more than ten starts in a rolling second. The Azure staging template has a
one-replica ceiling, so that per-process guard is also the staging deployment's aggregate guard.

## Validate cost profiles

Use a route preview, which does not call a provider:

```powershell
$headers = @{
  Authorization = "Bearer $env:FETCHMUX_API_KEY"
  "Content-Type" = "application/json"
}
$body = @{
  query = "cost profile check"
  task = "balanced"
  priority = "cost"
  maxCostUsd = 0.02
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8787/v1/route/preview -Headers $headers -Body $body
```

Confirm every candidate's `estimatedCostUsd` matches the configured unit and request mode. Tavily's
quality-priority profile can consume two credits in the founding adapter, so its estimate is twice
`TAVILY_COST_PER_CREDIT_USD` for that path.

Do not set a value to zero to mean unknown. Blank means unknown; zero and negative values are invalid.

## Domain and freshness controls

FetchMux validates shared controls before reaching adapters:

- `freshness`: `24h`, `7d`, `30d`, or `1y`;
- `includeDomains` or `excludeDomains`, never both;
- two-letter country code;
- BCP-47-like lowercase language shape;
- result limit from 1 through 20.

Adapters translate only supported documented fields. Provider-native behavior still differs, so a
normalized request does not guarantee identical index coverage or ranking.

## Diagnose authentication failures

Provider HTTP `401` or `403` maps to `AUTHENTICATION_FAILED` and is terminal for that route. Check:

- the key belongs to the expected provider account;
- whitespace or quotes were not included in the secret value;
- the key is active and permitted for the endpoint;
- billing or quota prerequisites are satisfied;
- outbound HTTPS reaches the provider endpoint.

FetchMux intentionally does not return raw provider error bodies. Use the provider account console
and a controlled direct request when deeper diagnosis is necessary; do not add raw bodies to shared
logs.

## Handle rate limits and outages

Provider `429`, `408`, and `5xx` responses are classified retryable. The router may fail over only if
another route fits the remaining absolute deadline and cumulative budget. Repeated retryable failures
open the in-memory circuit temporarily.

During an outage:

1. verify the provider status outside FetchMux;
2. use `/v1/route/preview` with a temporary `providerAllowlist` to inspect alternatives;
3. remove a provider key only if the operator intends to make it ineligible;
4. do not widen budgets or deadlines without customer authorization;
5. restart only if clearing in-memory health state is justified and recorded.

## Rotate or remove a provider

To remove a provider, unset its key and restart. Confirm `/v1/providers` reports `available: false`.
To rotate, follow the provider-key procedure in the deployment runbook. Record provider, account,
rotation date, operator, and verification result—never the key.
