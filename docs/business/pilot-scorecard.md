# FetchMux pilot scorecard

**Customer identifier:**  
**Pilot version:**  
**Measurement owner:**  
**Technical owner:**  
**Baseline window:**  
**Treatment window:**  
**Last updated:**

Empty means unknown. It never means zero. Keep this report private unless customer, provider,
contract, privacy, and legal permissions explicitly allow sharing.

## Decision at a glance

| Field | Value |
| --- | --- |
| Primary success metric | |
| Baseline | |
| Target agreed before treatment | |
| Current result | |
| Comparable sample count | |
| Decision | `keep / direct provider / change / extend / stop / unknown` |
| Evidence owner | |
| Customer decision date | |

## Workload and policy

| Field | Value |
| --- | --- |
| Permitted workload description | |
| Eligible request rule | |
| Monthly volume estimate and source | |
| Workload classes and weights | |
| Current provider(s) | |
| Evaluated provider(s) | |
| Cost-profile source and effective date | |
| Maximum cost policy | |
| Maximum latency policy | |
| Quality/outcome rubric | |
| Exclusions frozen before treatment | |
| Material product changes during test | |

Do not include keys, raw private queries, authorization headers, or unrestricted provider output.

## Metric definitions

### Policy-success rate

```text
eligible requests completed inside cost and latency limits and passing the outcome rule
----------------------------------------------------------------------------------------
                                  eligible requests
```

### Fallback recovery rate

```text
retryable primary failures recovered by an eligible fallback inside the original policy
----------------------------------------------------------------------------------------
    retryable primary failures for which an eligible fallback existed at failure time
```

### Cost per accepted retrieval

```text
reconciled provider cost + agreed downstream processing cost
------------------------------------------------------------
                    accepted retrievals
```

### Cost-estimate variance

```text
absolute value of billed cost - estimated cost
-----------------------------------------------
                 billed cost
```

Use `unknown` when the provider bill cannot be allocated to the measured workload. Do not divide by
zero and do not silently omit failed requests.

## Baseline and treatment

| Metric | Baseline value | Baseline n | Treatment value | Treatment n | Change | Comparable? | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Policy-success rate | | | | | | | |
| Retryable failure count | | | | | | | |
| Fallback recovery rate | | | | | | | |
| p50 latency | | | | | | | |
| p95 latency | | | | | | | |
| Estimated provider cost | | | | | | | |
| Billed provider cost | | | | | | | |
| Cost per accepted retrieval | | | | | | | |
| Accepted-evidence rate | | | | | | | |
| Engineering/support hours | | | | | | | |

Any row marked non-comparable requires an explanation and cannot prove the pilot outcome.

## Weekly operating table

| Week | Eligible requests | Policy successes | Primary retryable failures | Recovered fallbacks | p95 ms | Estimated cost | Billed cost | Accepted outcomes | Founder hours | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Baseline | | | | | | | | | | |
| 1 | | | | | | | | | | |
| 2 | | | | | | | | | | |
| 3 | | | | | | | | | | |
| 4 | | | | | | | | | | |

## Cost reconciliation

| Provider | Account/plan safe ID | Billing period | Metered unit | FetchMux estimated units | Provider billed units | Unit-cost source | Variance explained? |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| | | | | | | | |

Never copy a complete invoice, payment method, API key, or sensitive account screenshot into this
repository. Link to the customer's controlled evidence location.

## Quality review

| Sample ID | Workload class | Blinded? | Reviewer | Rubric version | Outcome | Disagreement/review note |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

Provider identity must be hidden from reviewers when the agreed method says blinded. Expected-source
hints are not ground truth. An LLM judge must be labelled as such and cannot be the sole proof for a
commercial quality claim without customer agreement.

## Changes during the pilot

| Date/time UTC | Change | Evidence for change | Expected effect | Approved by | Result |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

One unexplained mid-test change can invalidate a comparison. Record provider plan, adapter, policy,
workload, model, proxy, deployment region, and judging changes.

## Incidents and exclusions

| Date/time UTC | Request/incident safe ID | Classification | Included in metric? | Decision reason | Follow-up |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Do not exclude an outage because it makes treatment look worse. Apply the frozen eligibility rule.

## Closeout decision

### Keep

- primary metric met with comparable evidence;
- no unresolved credential, terms, privacy, or cost variance issue;
- founder support stayed inside the delivery guardrail;
- customer affirmatively chooses a recurring offer.

### Direct provider

- one provider is sufficient and routing creates no measured value;
- give the customer the evidence and remove FetchMux cleanly.

### Change or extend

- only when a specific evidence gap or policy change can be tested in a bounded extension;
- do not extend to avoid recording a failed hypothesis.

### Stop

- metric did not improve, support economics fail, terms block the use, or the customer no longer has
  the qualifying workload.

## Outcome commitment check

| Question | Answer | Evidence |
| --- | --- | --- |
| Did the primary metric improve? | | |
| Did measured integration or operational work decrease? | | |
| Does the draft USD 99 waiver condition apply? | | |
| Has counsel-approved remedy language been followed? | | |

