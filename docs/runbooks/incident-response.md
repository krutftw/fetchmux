# Incident response runbook

## Scope

This runbook covers the founding single-tenant gateway, provider credentials, retrieval traffic,
route telemetry, benchmark reports, and deployment configuration. It is an operational draft, not a
substitute for customer-specific security, legal, or regulatory procedures.

## Severity

| Severity | Example | Initial response target |
| --- | --- | --- |
| SEV-1 | Confirmed credential exposure, cross-customer exposure, public unauthenticated gateway | Stop exposure immediately |
| SEV-2 | Sustained provider outage with no safe route, material unexpected spend, corrupted deployment | Begin containment within 30 minutes |
| SEV-3 | Degraded latency, isolated configuration error, non-sensitive logging defect | Triage within one business day |

There is no staffed SLA in the founding build. Targets are internal operating goals until a signed
support agreement says otherwise.

## First 15 minutes

1. Name an incident lead and record UTC start time.
2. Preserve evidence without copying secrets, query text, or raw provider content into the incident
   channel.
3. Identify deployment, commit SHA, customer/operator, gateway version, and affected routes.
4. Decide whether traffic must stop. For credential or public-auth exposure, stop it first.
5. Capture safe process status, container status, `/health`, `/ready`, and provider status.
6. Notify the owner and affected customer contact through the agreed private channel.
7. Start a timestamped decision log.

Useful commands:

```powershell
git rev-parse HEAD
docker compose ps
docker compose logs --since 30m gateway
Invoke-WebRequest http://127.0.0.1:8787/health -SkipHttpErrorCheck
Invoke-WebRequest http://127.0.0.1:8787/ready -SkipHttpErrorCheck
```

Before sharing logs, inspect them for authorization values, URLs, provider metadata, or accidental
query text.

## Public or unauthenticated gateway

Trigger: `FETCHMUX_AUTH_DISABLED=true` on a network-reachable listener, missing proxy controls, or a
gateway key exposed to an unauthorized party.

1. Remove external routing or stop the container.
2. Set `FETCHMUX_AUTH_DISABLED=false` or remove it.
3. Rotate every FetchMux gateway key.
4. Review proxy and gateway access records for the exposure window.
5. Treat returned results and normalized URLs as potentially accessed customer data.
6. Restart on loopback/private networking and verify old keys receive `401`.
7. Determine notification duties before restoring public access.

## Provider credential exposure

1. Stop the affected provider route by removing the key or stopping the gateway.
2. Revoke the key in the provider account.
3. Create a replacement through the provider's normal procedure.
4. Review provider usage, billing, source IP, and audit history for unauthorized calls.
5. Update the secret manager and restart.
6. Run `/v1/providers`, a no-spend preview, and one controlled request.
7. Record the key identifier or last four characters only if the provider exposes a safe identifier.
8. Evaluate customer, provider, insurer, and legal notification obligations.

Never paste the suspected key into the incident record to prove it leaked.

## Provider outage or rate-limit storm

1. Check the provider's official status and the customer's quota/billing console.
2. Confirm the error class is retryable (`RATE_LIMITED`, `TIMEOUT`, `UPSTREAM_UNAVAILABLE`, or
   `NETWORK_ERROR`).
3. Use route preview to confirm fallback eligibility and costs.
4. If necessary, remove the unavailable provider key and restart so it cannot be selected.
5. Do not disable budgets, increase deadlines, or force a more expensive provider without customer
   approval.
6. Watch fallback recovery, latency, and cumulative estimated cost.
7. Restore the provider only after a controlled test succeeds.

## Unexpected spend

1. Stop live benchmark jobs and high-volume callers.
2. Compare FetchMux estimates with the provider's metered units and invoices.
3. Confirm each cost variable and provider plan; pay special attention to credit multipliers.
4. Identify calls made without `maxCostUsd` and workload changes that increased result or content
   depth.
5. Apply a customer-approved budget or provider allowlist before resuming.
6. Correct the cost profile and document the effective date. Do not rewrite historical estimates as
   if the old configuration was correct.

## Query or content in logs

The standard event sink excludes query text and result content. If either appears:

1. stop forwarding affected logs;
2. restrict access to the log destination;
3. identify the non-standard logger, proxy, debug patch, or provider client responsible;
4. determine affected records and retention copies;
5. delete or quarantine only under an approved evidence and retention decision;
6. add a reproducing test before changing logging code;
7. notify affected customers as required.

## Recovery and verification

Before declaring recovery:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Then verify the deployed commit, health, readiness, protected auth, safe provider status, one preview,
and one customer-approved retrieval. Confirm logs remain secret- and query-free.

## Post-incident review

Within three business days, record:

- timeline in UTC;
- impact and affected data/accounts;
- root cause and contributing conditions;
- detection path and why earlier controls did or did not catch it;
- containment, recovery, and evidence sources;
- customer/provider/legal notifications;
- tests and controls added;
- owner and due date for every follow-up;
- whether product scope or a launch gate must change.

Do not close on “operator error” alone. Identify the missing guardrail that allowed the error to become
an incident.
