# Security finding exceptions

FetchMux does not use a blanket scanner allowlist. A security finding can remain non-blocking only
when the checked-in threshold policy already classifies its severity and scanner class as advisory.
Changing that policy is a reviewed security decision, not a pipeline retry or hidden CI variable.

## Required exception record

Any proposed exception must be a merge-request change that records all of the following:

- the exact scanner, package or source location, vulnerability identifier, and affected version;
- why the finding is not exploitable or cannot currently be remediated;
- evidence from the upstream vendor, distribution tracker, or a reproducible local analysis;
- the compensating controls and the person responsible for them;
- an expiry date no more than 30 days away; and
- the issue or merge request that will remove the exception.

The reviewer must not be the author. Secrets, unknown severities, malformed reports, failed scans,
and missing required reports cannot be excepted. Critical or high findings require remediation or a
documented owner decision not to release; they do not receive a routine CI waiver.

## Expiry and verification

An exception must identify a single finding rather than a package, scanner, or severity class. The
CI policy must fail closed after the stated expiry. Re-run the affected scanner and the complete
`security_gate` job after every change. Remove an exception immediately when a fixed supported
dependency or base image becomes available.

The current Debian runtime advisories are not exceptions: they remain visible in the container
report and are counted by the gate as medium or low advisory findings under the checked-in general
threshold policy.

## Active exception records

### 2026-07-22 — @hono/node-server via @modelcontextprotocol/sdk (2 moderate)

- **Scanner/source:** `npm audit`; `@modelcontextprotocol/sdk@1.29.0` → `@hono/node-server@1.19.14`.
- **Why not exploitable here:** the FetchMux MCP server (`apps/mcp`) uses only the stdio transport;
  the vulnerable Hono HTTP server code path is never started. The gateway does not use the MCP SDK.
- **Evidence:** `1.29.0` is the latest published MCP SDK on 2026-07-22 and pins the affected
  version; no fixed upstream release exists. The earlier `fast-uri` high advisory was remediated the
  same day via `npm audit fix` (231/231 tests passing after).
- **Compensating controls:** stdio-only usage; owner review of `npm audit` before each release.
- **Owner:** repository owner. **Expiry:** 2026-08-21 — re-check for a fixed MCP SDK release and
  remove this record when one ships.
