# GitLab Ultimate trial exit

> Historical procedure. The GitLab account is blocked as of 2026-07-17 and GitLab is not the
> current primary forge. Use the [forge continuity runbook](forge-continuity.md) for the live Azure
> DevOps and GitHub topology. Resume this procedure only if GitLab restores access.

This runbook prevents the private founding build from depending on a temporary GitLab Ultimate
entitlement. It does not authorize a subscription, payment method, or paid feature purchase.

## Current split

The pipeline deliberately separates durable controls from trial enhancements.

Durable baseline:

- locked install and `npm audit --audit-level=high`;
- tests, type checks, source lint, OpenAPI lint, production build, and benchmark dry-run;
- standard GitLab SAST;
- pipeline and receiver-side secret detection;
- container build, registry push, Trivy scan, and CycloneDX artifact;
- the required report-threshold gate.

Ultimate trial enhancements:

- GitLab Advanced SAST;
- GitLab SBOM dependency scanning and continuous vulnerability data;
- merge-request security presentation and vulnerability-management dashboards.

## Seven days before the displayed expiry

1. Record the exact trial end date shown by GitLab. Do not infer it from a relative countdown.
2. Download the most recent successful Advanced SAST, dependency, secret, and container report
   artifacts and retain their pipeline URL in the private release record.
3. Record the number of actionable findings and the engineering time the Ultimate-only features
   saved. A dashboard alone is not sufficient evidence to pay for the tier.
4. Create a private branch from the latest reviewed default branch. Do not test the downgrade by
   changing the active founding merge request.
5. In `.gitlab-ci.yml`:
   - remove `Jobs/Dependency-Scanning.v2.gitlab-ci.yml` from `include`;
   - set `FETCHMUX_EXPECT_ULTIMATE_SECURITY` to `"false"`;
   - set `GITLAB_ADVANCED_SAST_ENABLED` to `"false"` or remove the variable;
   - retain the SAST, Secret Detection, and Container Scanning templates;
   - retain `security_gate`, including its optional `semgrep-sast`, Advanced SAST, and dependency
     artifact needs. The gate treats the latter two as optional only when
     `FETCHMUX_EXPECT_ULTIMATE_SECURITY` is exactly `"false"`.
6. Run GitLab's server-side CI lint. Expected runtime jobs are `verify`, `build_container`,
   `semgrep-sast`, `secret_detection`, `container_scanning`, and `security_gate`.
7. Run a merge-request pipeline and inspect the `security_gate` trace. It must:
   - receive a successful standard SAST report;
   - receive successful secret and container reports;
   - state that the Ultimate dependency report is unavailable;
   - fail on any secret or critical, high, unknown, missing, malformed, or failed required report.
8. Keep GitLab as primary only after that pipeline passes. If it cannot pass on the resulting tier,
   fix the baseline before the trial ends; do not buy a subscription merely to conceal a broken
   fallback.

## Purchase decision

Recommend a paid tier only if the trial produces evidence of value that the baseline does not:

- Advanced SAST catches a credible cross-file vulnerability missed by standard SAST;
- continuous dependency scanning catches an actionable issue before another control;
- a real customer or compliance requirement needs the Ultimate security workflow; or
- measured engineering time saved is worth more than the verified subscription cost.

Before any purchase, read back the current GitLab price, renewal behavior, included compute, tax,
currency, and cancellation terms. A purchase remains owner-gated.
