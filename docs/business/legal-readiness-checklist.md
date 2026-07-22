# FetchMux legal and commercial readiness checklist

**Status:** founder checklist, not legal advice  
**Jurisdiction:** not yet selected or confirmed  
**Rule:** an unchecked legal gate is a stop sign, not permission to improvise

Qualified lawyers, accountants, insurance advisers, security reviewers, and provider representatives
must make the applicable determinations. Repository research cannot approve a contract or legal
position.

## Gate 0: private development

Required before continuing private code and fabricated demonstrations:

- [x] Repository is private.
- [x] No public software license is granted.
- [x] Provider credentials are absent from the repository and test fixtures.
- [x] Marketing states no partnership, customer result, public launch, or resale right.
- [x] Live benchmark requires explicit confirmation and external credentials.
- [x] Public site examples are illustrative and disabled for unconfigured intake.
- [ ] Secret scan and full release gate are recorded for the current commit.

Private development does not authorize live provider calls. The actual account holder must accept
the operative terms and authorize the workload.

## Gate 1: entity, ownership, and money

**Progress 2026-07-22:** the founder operates as an Australian sole trader and supplied an ABN, but
the public ABR record showed it **cancelled from 21 Jul 2026** when checked the same day.
Reactivation and an Active ABR read-back are required before any quote or invoice. Identifying
details are kept in the untracked `.private/entity-record.md`, not in this repository, because the
repository is planned to become public.

Required before a proposal is accepted, an invoice is issued, or payment is taken:

- [ ] Choose operating jurisdiction with counsel and tax advice.
- [ ] Register the entity and required business/trading names.
- [ ] Record founder ownership, IP assignment, decision rights, and signing authority.
- [ ] Open business banking and accounting records separate from personal funds.
- [ ] Decide GST/VAT/sales-tax, income-tax, withholding, and cross-border treatment.
- [ ] Create compliant invoice numbering, currency, payment, refund/credit, and record-retention
  procedures.
- [ ] Select a payment processor and review its terms, disputes, fraud, sanctions, and privacy flow.
- [ ] Confirm whether the outcome commitment is a refund, credit, warranty, or other regulated
  representation.
- [ ] Obtain professional indemnity, cyber, public/product liability, and directors/officers advice.

No card charge, crypto payment, bank transfer request, or payment-link publication occurs before
this gate passes.

## Gate 2: name, domain, and intellectual property

Required before public branding or spend:

- [ ] Search company, business-name, domain, package, app-store, social-handle, and common-law use of
  “FetchMux” and confusingly similar names.
- [ ] Obtain professional trademark clearance in intended classes and countries.
- [ ] Decide whether to file a mark and who owns it.
- [ ] Register a domain and social handles only after owner approval and clearance.
- [ ] Inventory code, fonts, images, icons, dependencies, sample data, and copied documentation.
- [ ] Choose an outbound repository/software license before any public release.
- [ ] Confirm all contributors have assigned or licensed their work.
- [ ] Create third-party notices and a dependency-license review.
- [ ] Define rules for customer feedback, patches, benchmark labels, and case-study content.

The provisional name must remain labelled provisional until this gate passes.

## Gate 3: provider contracts and content rights

Required before each provider is used in a paid pilot:

- [ ] Identify the exact legal entity/account holder and accepted plan/order form.
- [ ] Save the effective terms version and date in the controlled contract record.
- [ ] Confirm customer-application integration and BYOK deployment rights.
- [ ] Confirm account/key sharing, contractor access, and end-user rules.
- [ ] Confirm result display, transient normalization, caching, storage, deletion, and attribution.
- [ ] Confirm benchmark, evaluation, performance-analysis, and publication rights.
- [ ] Confirm whether customer query or result data can train provider models or be retained.
- [ ] Confirm source-site and third-party-content responsibilities.
- [ ] Confirm prohibited/high-risk uses, export/sanctions limits, rate limits, and suspension rights.
- [ ] Confirm logo, name, listing, referral, and relationship-description rights.
- [ ] Record provider incident, privacy, legal, and account contacts.

Current issues requiring counsel:

- [ ] Brave terms reviewed 2026-07-16 contain restrictions relevant to storage, redistribution,
  resale, sublicensing, and some evaluation or benchmark uses of Search Results.
- [ ] Tavily terms reviewed 2026-07-16 include restrictions on disclosing performance information or
  analysis and on competitive/resale uses.
- [ ] Exa's current terms and the customer's order form need a complete use, retention, disclosure,
  and commercial-integration review.
- [ ] Firecrawl's terms reviewed 2026-07-16 contain commercial-use language that needs written or
  counsel-confirmed authorization for the exact model.

Until resolved, provider performance reports stay private, provider usage stays customer-owned, and
FetchMux does not resell access.

## Gate 4: customer contract

Required before pilot access:

- [ ] Master services/pilot agreement identifies parties and authority.
- [ ] Scope, deliverables, dependencies, acceptance, schedule, and change control are explicit.
- [ ] Fees, taxes, payment timing, late payment, cancellation, refund/credit, and renewal are clear.
- [ ] Provider usage and customer-owned accounts are allocated correctly.
- [ ] Outcome metric and any limited remedy are objectively defined.
- [ ] No unsupported savings, uptime, quality, provider, or legal-compliance warranty appears.
- [ ] IP, feedback, customer data, confidential information, and publicity rights are allocated.
- [ ] Security schedule, incident notification, retention, deletion, and return of access are set.
- [ ] Liability cap, exclusions, indemnities, disclaimers, termination, force majeure, governing law,
  and disputes are reviewed.
- [ ] Subcontractors/subprocessors, assignment, insurance, audit, and export/sanctions terms are set.
- [ ] Electronic signature and record retention are valid for the chosen jurisdiction.

The founding-pilot document is not a substitute for this agreement.

## Gate 5: privacy, data, and security

Required before collecting lead, customer, query, result, or telemetry data:

- [ ] Create data inventory and flow for website, outreach, contracts, support, gateway, providers,
  logs, benchmarks, payment, and backups.
- [ ] Determine controller/processor/service-provider roles by data flow and jurisdiction.
- [ ] Establish lawful bases, notices, consent where needed, access/deletion contacts, and retention.
- [ ] Publish a counsel-reviewed privacy policy before public collection.
- [ ] Prepare a DPA and subprocessor list where required.
- [ ] Review cross-border transfer and data-location requirements.
- [ ] Define sensitive and prohibited data; add regulated-workload gates.
- [ ] Complete threat model, secret management, access control, encryption, backup/restore, dependency,
  vulnerability, penetration-test, and incident-response reviews proportional to the service.
- [ ] Test breach notification decision-making without putting secrets in the exercise.
- [ ] Define support and benchmark deletion, including backups.

Hosted customer credentials and multi-tenancy remain prohibited until the separate isolation gate in
the data-handling runbook passes.

## Gate 6: public site, outreach, and claims

Required before publishing or contacting prospects:

- [ ] Owner approves the domain, site, repository, package, social account, and launch channels.
- [ ] Site has correct entity identity, contact, privacy, terms, cookie/analytics state, and required
  business disclosures.
- [ ] Accessibility, consumer, auto-renewal, price-display, and refund rules are reviewed.
- [ ] Email, direct-message, call-recording, anti-spam, do-not-contact, platform, and lead-source rules
  are mapped by recipient jurisdiction.
- [ ] Suppression list and manual unsubscribe process exist before outbound.
- [ ] Every testimonial, logo, customer count, metric, comparison, price, security, and partner claim
  has retained substantiation and permission.
- [ ] Comparative advertising and provider-performance publication are counsel-approved.
- [ ] No dark pattern, fake scarcity, fake waitlist, pre-checked consent, or hidden renewal is used.
- [ ] Intake collects the minimum data and does not invite keys or private queries.

Reddit, GitHub issues, and community forums are not prospect lists. Follow community rules and do not
turn support threads into unsolicited sales pitches.

## Gate 7: public code and supply chain

Required before changing the private repository to public or publishing a package/container:

- [ ] Full history and artifact secret scan passes.
- [ ] Dependency and license review passes.
- [ ] Security policy, vulnerability contact, support status, and maintenance expectations are clear.
- [ ] Contribution terms and code of conduct are chosen where appropriate.
- [ ] Build provenance, release signing, branch protection, CI permissions, and dependency update
  policy are configured.
- [ ] Example configuration cannot start externally reachable without authentication.
- [ ] Provider names and compatibility statements follow trademark and API terms.
- [ ] No customer benchmark, report, URL, note, or provider payload exists in history.

## Gate 8: hosted service or managed usage

This is a separate product launch, not an incremental toggle:

- [ ] Tenant-bound identity, authorization, metering, quotas, billing, refunds, and abuse controls.
- [ ] Managed secret vault with encryption, access audit, rotation, deletion, and restore tests.
- [ ] Isolation tests across secrets, caches, logs, traces, metrics, queues, support, and backups.
- [ ] Availability, support, maintenance, status, disaster recovery, and service-level terms.
- [ ] Cloud/provider contracts, subprocessors, data locations, DPAs, and security review.
- [ ] Fraud, card, tax, sanctions, export, consumer, and marketplace responsibilities.
- [ ] Written provider rights for any pooled, managed, marketplace, referral, or resale arrangement.
- [ ] Unit economics include provider usage, retries, abuse, support, refunds, and failed collection.

No managed usage or resale occurs with a normal customer API key.

## Launch blocker register

| Blocker | Current state | Required authority/evidence |
| --- | --- | --- |
| Entity and tax setup | Open — sole-trader ABN supplied but ABR shows it cancelled (2026-07-22); owner reactivation required, then Active read-back | Lawyer/accountant and owner action |
| FetchMux name/domain clearance | Open | Trademark/domain review and owner approval |
| Customer pilot contract | Open | Counsel-approved agreement |
| Provider commercial/benchmark rights | Open | Provider-specific terms review and permissions |
| Privacy/site terms | Open | Counsel and completed data map |
| Payment collection | Open | Entity, tax, processor, invoice, refund controls |
| Public repository/site/package | Intentionally private | Owner approval plus Gates 2, 5, 6, and 7 |
| Hosted multi-tenancy | Out of scope | Gate 8 plus security review |

## Approval record template

```text
Gate and item:
Decision:
Approver name/role:
Professional qualification or provider authority:
Evidence/document version:
Effective date:
Conditions/expiry:
Repository reference without secrets:
Next review date:
```

Verbal optimism, a self-serve signup button, or another company's behavior is not approval.

