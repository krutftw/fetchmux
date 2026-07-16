# FetchMux founding-build release checklist

**Verification date:** 2026-07-16 (Australia/Perth)  
**Release posture:** private founding build, suitable for local or single-tenant evaluation  
**Public-launch posture:** not approved, not published, and not represented as a live provider comparison

## Release decision

All applicable local product, protocol, browser, security, documentation, benchmark-dry-run, and
container gates pass. GitLab merge-request pipeline `2681778061` and scheduled smoke pipeline
`2681778549` each passed the locked application gate and all configured security jobs. Keep GitLab
merge request `!1` private and in draft while live-provider, legal, and owner-identity actions remain
unresolved. GitHub remains a private backup, not the authoritative CI system.

This checklist does not claim customers, revenue, provider partnerships, public benchmark results,
or production multi-tenant readiness.

## Completed product scope

- [x] Stable retrieval request, normalized result, route-attempt, and route-receipt contracts.
- [x] Deterministic provider filtering and scoring with hard cost and latency limits.
- [x] Classified retry-only fallback, circuit state, and safe terminal errors.
- [x] BYOK Brave, Tavily, Exa, and Firecrawl adapters using fixed HTTPS provider endpoints.
- [x] Authenticated REST gateway, TypeScript SDK, and two read-only MCP tools.
- [x] Reproducible 24-case benchmark harness with dry-run as the default and explicit live-call gates.
- [x] Truthful founding site with illustrative labels, provisional pricing, and disabled intake when
  no real destination is configured.
- [x] OpenAPI contract, local and deployment runbooks, incident and data-handling procedures.
- [x] Founding pilot offer, discovery and outreach material, scorecards, operating review, market
  evidence, partnership brief, and legal-readiness checklist.

## Fresh quality evidence

Run from `C:\Users\Administrator\fetchmux\.worktrees\founding-build`:

| Gate | Result |
| --- | --- |
| Locked install | `npm clean-install --ignore-scripts`: 267 packages installed, 275 audited, 0 vulnerabilities |
| Test suite | 23 files passed, 187 tests passed, 0 failed |
| TypeScript | All solution, site, and test typechecks passed |
| Biome | 86 files checked, 0 errors and 0 warnings |
| Production build | All TypeScript projects and the Vite site built successfully |
| Site bundle | 209.21 kB JavaScript (65.27 kB gzip) and 26.91 kB CSS (8.34 kB gzip) |
| OpenAPI | Redocly validation passed with 0 warnings |
| GitLab CI | Server-side CI lint passed with 0 errors and 0 warnings; MR pipeline `2681778061` passed all seven jobs in 172 seconds and scheduled pipeline `2681778549` passed all seven in 153 seconds |
| YAML and workflow | YAML parsing, Actionlint, and Compose configuration passed |
| Benchmark dry-run | 24 cases, 4 providers, 96 planned calls, 0 executed calls, 0 network calls |
| Git hygiene | `git diff --check` passed |

## REST and MCP evidence

- [x] `/health` returned `200` from the built gateway.
- [x] `/ready` returned `503` with no configured provider and `200` with fixture configuration.
- [x] A protected route returned `401` without authorization and `200` with the exact test key.
- [x] Route preview returned all four configured candidates without making a provider call.
- [x] A no-provider search returned a safe `502 ALL_PROVIDERS_FAILED` response with a trace ID and
  no raw exception, provider body, query, or credential.
- [x] The official MCP SDK initialized over stdio, listed `preview_search_route` and `search_web`,
  invoked preview, and received a deliberate safe error.
- [x] MCP stdout remained protocol-only; child stderr was empty; secret and query markers were absent
  from protocol errors and structured gateway logs.

## Browser evidence

- [x] Full-page Chromium checks passed at 1440 by 900 and 390 by 844.
- [x] No horizontal overflow, failed responses, broken fragment links, unsafe link schemes, console
  errors, or heading-level jumps were found.
- [x] Skip navigation was first in keyboard order and moved focus to the main landmark.
- [x] Route-policy state, copy controls, methodology disclosure, accessible names, and mobile controls
  behaved correctly.
- [x] Reduced-motion mode removed reveal, route-lane, and transition animation.
- [x] Pricing remains explicitly hypothetical, benchmark values remain explicitly illustrative, and
  the unconfigured pilot intake exposes no application link.

## Security and artifact evidence

- [x] `npm audit --omit=dev` reported 0 vulnerabilities.
- [x] Local Gitleaks scanned the entire committed history and the working tree and found no leaks.
  GitLab pipeline secret detection independently reported 0 findings, and receiver-side secret push
  protection is enabled for the project.
- [x] Every broad secret-pattern hit was classified as an empty environment field, documentation
  placeholder, code identifier/interpolation, dependency token name, or deliberate fake test value.
- [x] The gateway uses timing-safe bearer comparison, a 64 KiB body limit, allowlist-only CORS,
  structured allowlist logs, safe error envelopes, and fixed provider destinations.
- [x] The built workspace contained 134 files totaling 1,068,423 bytes. Its 58 TypeScript source maps
  contained neither embedded source content nor absolute Windows paths. Built assets contained none
  of the deliberate test or release secret markers.
- [x] An initial container scan exposed unnecessary runtime surface: 421 indexed packages, 87 MB,
  one critical finding, and four high findings. The runtime was replaced with digest-pinned
  Distroless Node 24 Debian 13, and production installation was narrowed to gateway, core, and
  provider workspaces.
- [x] The rebuilt image is approximately 57 MB with 78 indexed packages. Docker Scout reported zero
  critical, high, medium, or low vulnerabilities at verification time.
- [x] GitLab container scanning used Trivy 0.72.0 and a different advisory source. It reported 12
  Debian 13 runtime-layer findings: 5 medium and 7 low, with 0 critical and 0 high. The medium items
  are `CVE-2026-27171` in `zlib1g` and `CVE-2026-5435`, `CVE-2026-5450`, `CVE-2026-5928`, and
  `CVE-2026-6238` in `libc6`. Debian's tracker currently provides no stable Trixie fix and classifies
  the reviewed items as minor or no-DSA. These findings are not suppressed or allowlisted.
- [x] The required `security_gate` job reads uniquely named Advanced and standard SAST,
  secret-detection, dependency-scanning, and container-scanning artifacts without checking out the
  repository. Any secret, medium-or-higher SAST finding, critical or high dependency/container
  finding, unknown severity, or missing, malformed, wrong-type, or failed required report blocks the
  pipeline. Medium and low dependency/container findings remain visible advisories.
- [x] GitLab Ultimate trial features produced 0 Advanced SAST findings and 0 SBOM dependency
  findings. While the trial is expected, their missing artifacts fail closed. Standard SAST, secret
  detection, container scanning, and `npm audit --audit-level=high` form the non-Ultimate baseline;
  the actual downgrade path still requires a pipeline verification before the trial ends.
- [x] Scanner thresholds have no generic bypass or blanket allowlist. Any future single-finding
  exception requires independent review, exact evidence, compensating controls, and a maximum
  30-day expiry under the [security exception runbook](../runbooks/security-exceptions.md).
- [x] Active schedule `4344617` runs a complete security rescan at 06:00 every Monday in
  `Australia/Perth`. Its first smoke attempt (`2681769549`) exposed GitLab analyzer suppression on a
  branch with an open merge request. The schedule-specific workflow override was then added and
  scheduled pipeline `2681778549` passed all seven jobs with 0 blocking and 12 advisory findings.
  The schedule targets `feature/founding-build` until review and must be retargeted to `main` before
  merge.
- [x] The final container ran as UID/GID `65532:65532` (`nonroot`) with a read-only root filesystem,
  `/tmp` tmpfs, all capabilities dropped, and `no-new-privileges`. Health, readiness, authentication,
  healthcheck, shutdown, and log-leak checks passed.

Container scanning is time-sensitive and databases can disagree. Rebuild from reviewed current
digests and rerun both GitLab container scanning and Docker Scout for every release. The supported
Distroless runtime policy and image list are maintained in the
[official Distroless repository](https://github.com/GoogleContainerTools/distroless).

## Externally blocked

- [ ] Live provider benchmark. No owner-supplied provider credentials or verified customer plan cost
  profiles are configured, and no permission decision has been made for comparative disclosure.
  This is blocked, not failed and not completed.
- [ ] Real demand proof. No qualified discovery calls, paid pilots, or customer outcome measurements
  have occurred yet.

GitHub-hosted Actions still cannot create jobs because GitHub reports an account billing problem.
This no longer blocks the private founding build because GitLab is the primary forge and its
equivalent, expanded pipeline is green. GitHub remains a private backup only.

## Intentionally deferred and owner-gated

- [ ] Make the repository public, merge or mark the draft pull request ready, publish a package,
  deploy a public site, or publish benchmark results.
- [ ] Contact prospects or providers, send outreach under the owner's identity, collect lead data,
  or claim a partnership.
- [ ] Buy a domain, clear or register a trademark, form a legal entity, accept provider or commercial
  terms, create paid accounts, spend credits, charge a card, or accept payment.
- [ ] Build a hosted credential vault, multi-tenant control plane, pooled provider-credit product, or
  public provider league table.
- [ ] Expose the gateway remotely without reviewed TLS termination, access restrictions, log
  redaction, and network-level rate limiting.

## Residual risks and next evidence

1. Provider capability, quality, reliability, latency, and cost profiles are conservative hypotheses.
   Replace them only with permitted private benchmark and customer outcome evidence.
2. FetchMux is not yet proven to be a purchased pain. The next commercial milestone is ten qualified
   conversations followed by one paid founding pilot, not more provider breadth.
3. Provider terms can constrain result storage, benchmarking, disclosure, and resale. Complete the
   provider-by-provider legal checklist before live evaluation or publication.
4. The FetchMux name remains provisional until trademark and domain clearance.
5. The GitLab Ultimate trial is temporary. Before it ends, export the current reports, explicitly
   set the Ultimate expectation to false, disable the Advanced SAST variable, verify the
   standard-SAST fallback job and security gate on the resulting tier, and decide whether the paid
   security dashboards justify their cost. Follow the [trial-exit
   runbook](../runbooks/gitlab-trial-exit.md).
6. Scheduled scan `4344617` currently targets the review branch. Retarget it to `main` immediately
   before merging the founding merge request, then smoke-test the schedule again from the default
   branch.
7. Remote operation depends on the deployment runbook's external TLS, rate-limit, secret-management,
   monitoring, backup, and incident controls.

## Release posture

The codebase and private operating package are verified for the founding stage. The correct next
state is a private draft GitLab merge request with explicit blockers, not a public launch or
production claim.
