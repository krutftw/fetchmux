# FetchMux discovery script

**Use:** 25 to 30 minute founder-led call  
**Status:** internal; do not contact anyone without owner approval

The call is for disqualification as much as qualification. Do not demo first. Do not ask for secrets,
private query text, customer names, or regulated data. Ask permission before recording or retaining
notes and follow the applicable privacy and call-recording rules.

## Before the call

Record only public, relevant facts:

- the exact product/workflow the prospect has publicly described;
- the source URL and date;
- why retrieval may be involved;
- what remains unknown;
- the person's likely role, without assuming buying authority.

No invented personalization. “I saw your AI product” is not enough. If there is no truthful trigger,
do not contact the person.

## Opening, two minutes

> Thanks for making time. I am testing whether teams running AI workflows have a paid problem around
> search-provider failures, cost, or maintaining more than one integration. I will ask about the way
> you work today before showing anything. If it is not a real problem, saying that is useful. Please
> do not share API keys, private customer queries, or anything regulated on this call.

Confirm:

- permission to take minimal notes;
- time available;
- the workflow in scope;
- their role in operating and buying it.

## Current behavior, eight minutes

1. Walk me through the last production or production-like request that needed current web evidence.
2. Which search, crawl, or extraction provider handled it?
3. What made you choose that provider?
4. How many retrievals run in a normal week or month?
5. Which parts of the provider response does the application actually use?
6. What happens when the provider is slow, rate-limited, returns poor evidence, or is unavailable?
7. Have you tried or planned a second provider? What work did that create?
8. How do you currently know a retrieval was good enough?

Follow an answer with “When did that last happen?” and “What evidence do you have?” Avoid “Would a
smart router help?” because it invites agreement rather than facts.

## Cost and impact, six minutes

1. What is the current provider plan and billing unit?
2. Can you reconcile a customer workload to the provider invoice?
3. Does returned content increase downstream model-token cost?
4. How many engineering hours went into the integration or incidents last month?
5. What did the last material retrieval failure affect: a user answer, workflow completion, support,
   revenue, or only developer inconvenience?
6. Which is more valuable here: quality, resilience, lower total cost, or less engineering work?
7. What would make this problem important enough to fund this month?

Do not convert “annoying” into money. Ask for the actual consequence and leave it unknown when the
prospect cannot quantify it.

## Buying process, four minutes

1. Who owns the provider accounts and API terms?
2. Who can approve a USD 849 first-month pilot?
3. What security, procurement, legal, or privacy review is required?
4. Can the team run a single-tenant service and supply a permitted representative workload?
5. When is the next provider or retrieval decision being made?

## Offer test, four minutes

Only after a qualifying pain is established:

> The pilot installs a customer-controlled retrieval gateway, baselines one metric on your workload,
> and tests a deterministic cost, deadline, and fallback policy for 30 days. You keep your provider
> accounts and pay their usage directly. The working price is USD 750 setup plus USD 99 for the first
> month. If the agreed metric does not improve and the integration removes no measured work, the
> draft offer waives the USD 99 monthly charge, subject to the final agreement. Is that worth a
> scoped technical review, not a commitment today?

Then ask:

- What part sounds valuable?
- What part sounds unnecessary?
- What would stop you from paying for the pilot?
- What alternative would you choose instead?

Never discount during discovery. Record the exact price reaction.

## Close, two minutes

Choose one outcome:

- **Qualified technical review:** schedule only after owner approval; send a data-free checklist.
- **Nurture:** record the trigger that would make the problem timely; no generic drip campaign.
- **Disqualified:** thank them and stop follow-up.
- **Product evidence:** record a repeated objection or alternative, with no identifying data unless
  consent permits it.

Do not request keys, workload files, or access until a reviewed agreement and secure intake exist.

## Qualification score

Score each item 0, 1, or 2. A lead needs at least 9 of 12 and no hard disqualifier.

| Factor | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Workload | curiosity | near-production | recurring production/high-value |
| Multi-provider need | none | possible | existing or funded plan |
| Measurable pain | none | anecdotal | baseline and consequence exist |
| Data readiness | cannot share safely | partial | permitted representative set |
| Technical fit | no owner/deployment path | uncertain | named owner and viable path |
| Buying authority/timing | absent | indirect/later | authority and current budget |

Hard disqualifiers:

- asks for pooled or shared provider keys;
- needs public comparative results that terms do not permit;
- requests regulated or rights-sensitive use without review;
- cannot identify a workload or outcome;
- expects unpaid custom engineering;
- needs an SLA or hosted multi-tenancy the founding build does not provide.

## Evidence record

```text
Date:
Prospect anonymous ID:
Public trigger and URL:
Role and buying authority:
Workflow and monthly volume:
Current provider(s):
Last concrete failure or cost event:
Measured impact:
Current alternative:
Price reaction, exact words:
Security/legal path:
Score:
Decision and reason:
Next action, owner, date:
Consent/retention note:
```

Do not summarize “interested” as evidence. A dated action, access to a qualified technical review,
or payment is evidence.

