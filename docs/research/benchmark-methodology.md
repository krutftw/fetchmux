# FetchMux benchmark methodology

Status: founding methodology, version 1  
Workload: `benchmarks/workloads/founding-v1.json`

## Purpose

The benchmark measures observable retrieval behavior under a recorded workload. It is designed to answer narrow operational questions: whether a provider completed a call, how long the call took, what the configured request was estimated to cost, how many results came back, and how varied the returned hostnames were.

It does not prove that one provider is universally better. Results apply only to the recorded queries, policies, provider configurations, execution region, code version, seed, and date.

## Founding workload

The first workload contains 24 public, non-sensitive cases, split evenly across four classes:

- fresh facts;
- technical documentation;
- deep research;
- page-content retrieval.

Each class has one fetch policy. The runner sends that same parsed request to every provider in the class. Provider-specific query rewriting, hidden retries, and favorable per-provider limits are not allowed in the benchmark layer.

Expected-source hints are review aids only. They do not generate a relevance score and do not automatically mark a result correct.

## Execution

For each case and repetition, the runner calls every declared provider exactly once. Calls run sequentially so concurrency does not create unequal local contention. Provider order is shuffled with a deterministic seeded pseudo-random generator. The report records the seed, workload hash, code version, run date, provider configuration hashes, and cost-profile sources.

The configuration fingerprint contains public routing and cost settings only. API keys, authorization headers, private query text, and raw environment values are excluded.

`dry-run` is the default. It validates the workload and complete case-provider matrix without making a network request. `live` requires all provider credentials, an explicit `--confirm-live` flag, and an output path because calls may consume credits.

## Measured fields

Each executed case-provider pair records:

- `status`: success or classified error;
- `latencyMs`: sequential wall-clock duration, including failed calls;
- `estimatedCostUsd`: the customer-configured pre-request estimate, or `null` when unknown;
- `resultCount`: provider result count on success;
- `domainDiversity`: distinct normalized hostnames divided by normalized URL count;
- `normalizedUrls`: HTTP or HTTPS result URLs after fragment and common tracking-parameter removal;
- `errorCode`: a safe classified code with no upstream body or credential material.

Domain diversity uses hostnames, not registrable-domain inference. For example, `docs.example.com` and `www.example.com` count separately. This is transparent and reproducible but should not be interpreted as editorial-source independence.

Missing measurements remain `null`. They are never converted to zero. Metric sample counts are reported separately so an aggregate cannot hide missing cost or result data.

## Human labels

Measured fields and human judgment are separate objects. The workload provides per-provider label slots:

- relevance: integer 0 through 4;
- answer accuracy: 0 through 1, or `null` when the run does not produce an answer suitable for judging;
- optional reviewer notes.

The runner never derives either label from expected-source hints, result rank, snippet wording, or provider metadata. Unreviewed labels stay `null`. Any published labeled report must document reviewer instructions and whether review was blinded.

## Aggregation

Reports expose executed sample count, success count, error count, planned count, and metric-specific sample counts. Error rate is `errorCount / executed sampleCount`; dry-run records are excluded from that denominator.

Class means are combined with declared class weights. A class missing a metric is omitted from that metric's weighted denominator, and the metric is `null` when no class has data. Version 1 produces descriptive means only. It does not bootstrap confidence intervals, run significance tests, or imply statistical power.

## Privacy and stored output

Private report mode writes `queryText: null` and excludes query text from the workload configuration fingerprint. A private-query file can map local references to query text for live execution; that file must remain outside source control. Provider snippets, raw page bodies, and response payloads are not stored by the runner.

Generated reports belong under `benchmarks/results/`, which is git-ignored. Before sharing any
report outside the customer's approved team, review normalized URLs and human notes for customer,
personal, or confidential information and complete the terms gate below.

## Illustrative material

`benchmarks/examples/illustrative-report.json` contains fabricated layout values. It uses neutral labels rather than provider names, marks every object containing example metrics as `illustrative: true`, and sets `comparisonAllowed: false`. Illustrative values must never be presented as provider measurements.

## Reproduction commands

Validate the workload without provider calls:

```powershell
npm run benchmark -- --workload benchmarks/workloads/founding-v1.json --mode dry-run
```

Run a deliberate live benchmark only after setting provider keys and cost profiles:

```powershell
$env:FETCHMUX_CODE_VERSION = "<commit-sha>"
npm run benchmark -- --workload benchmarks/workloads/founding-v1.json --mode live --confirm-live --output benchmarks/results/founding-v1-live.json
```

The committed workload plans 96 calls at one repetition: 24 cases multiplied by 4 providers. Check current provider terms, quotas, and cost profiles before running it.

## Publication gate

The default status of every live report is private and non-publishable. Technical completeness does
not create a right to publish provider performance.

A report is eligible even for publication review only when it is a completed live run, its
configuration is reproducible, missing metrics and errors are visible, human labels are either
documented or omitted, the sample size is shown, and the claims stay within the measured workload.
Before public use, counsel must review the terms and order form accepted by the account holder for
every named provider, and the operator must retain any required written provider and customer
permission. Tavily's terms reviewed on 2026-07-16 restrict disclosure of performance analysis, and
other providers impose relevant result-use, commercial-use, storage, or benchmarking restrictions.

A dry run or illustrative file is never a provider comparison. Removing provider names does not by
itself cure contractual, confidentiality, privacy, or trade-secret restrictions.
