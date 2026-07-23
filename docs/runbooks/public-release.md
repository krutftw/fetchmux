# Public release runbook

Turns the private founding build into a publicly installable project: public GitHub repository,
published npm packages, and an MCP registry entry. Every step here is owner-operated; nothing in
this runbook runs automatically.

Preconditions verified on 2026-07-22:

- full-history Gitleaks scan: 56 commits, no leaks;
- only `.env.example` is tracked — no `.env`, keys, or credentials in the tree;
- 231/231 tests, typecheck, build, and the 96-pair benchmark dry run pass;
- `LICENSE` (Apache-2.0) present; `@fetchmux/core`, `@fetchmux/sdk`, and `@fetchmux/mcp` carry
  publish metadata; the gateway, site, and benchmark apps remain private packages;
- `server.json` for the official MCP registry present at the repository root;
- npm names `@fetchmux/*` and `fetchmux` were unclaimed as of 2026-07-22.

## 1. Sync GitHub and flip visibility

The GitHub remote (`origin`) may be behind Azure (`azure`). From the `machine-discovery` worktree:

```powershell
git push origin feature/machine-discovery
git push origin main
```

Review the repository on GitHub, then make it public (Settings → Danger Zone → Change visibility),
or:

```powershell
gh repo edit krutftw/fetchmux --visibility public --accept-visibility-change-consequences
```

Immediately after flipping: set the repository description to
"Self-hosted retrieval router for AI agents — budgets, provider routing, receipts. REST + SDK + MCP."
and the website to `https://fetchmux.com`, and add topics
`mcp`, `mcp-server`, `ai-agents`, `web-search`, `retrieval`, `rag`, `typescript`.

Making the repository public is the point of no return for the code being seen; the license grant
becomes effective for anyone who obtains a copy. Swap the LICENSE file first if Apache-2.0 is not
the final choice.

## 2. Publish npm packages

One-time: create the npm account/org. The `@fetchmux` scope is claimed by creating an org named
`fetchmux` at npmjs.com (free for public packages).

```powershell
npm login
```

Publish in dependency order from the repository root (versions are pinned to 0.1.0; `--provenance`
requires publishing from CI, omit it for a laptop publish):

```powershell
npm publish --workspace packages/core --access public
npm publish --workspace packages/sdk --access public
npm publish --workspace apps/mcp --access public
```

Verify:

```powershell
npm view @fetchmux/mcp version
npx --yes @fetchmux/mcp --help
```

> **2026-07-23 status:** all three 0.1.0 packages were published successfully (npm confirmation
> emails received), then hidden by npm's automated new-account quarantine — package pages return
> 403, the owner package list shows zero, and republishing reports the version already exists. A
> support request was filed the same day from the account email requesting review and restoration.
> The MCP registry publish (step 3) requires the packages to be publicly visible, so it waits for
> npm's review. Nothing else in this runbook is blocked by this.

(The MCP binary starts a stdio server; Ctrl+C exits. `npx @fetchmux/mcp` is what registry clients
will run.)

## 3. Publish to the official MCP registry

Requires the npm package from step 2 to be public. Install the publisher CLI, authenticate with the
GitHub account that owns the `io.github.krutftw` namespace, and publish `server.json`:

```powershell
winget install --id ModelContextProtocol.mcp-publisher; if (-not $?) { brew install mcp-publisher }
mcp-publisher login github
mcp-publisher publish
```

If the CLI reports a schema mismatch, run `mcp-publisher init` and port the values from the
existing `server.json` — the registry schema evolves. Docs:
https://github.com/modelcontextprotocol/registry/tree/main/docs

## 4. Directory listings (free, ~30 minutes total)

- **Smithery** (smithery.ai): sign in with GitHub, add server from the public repo.
- **PulseMCP** (pulsemcp.com): submit form; it also auto-indexes the official registry.
- **mcp.so** and **Glama** (glama.ai/mcp/servers): submit the GitHub URL.
- **awesome-mcp-servers**: fork `punkpeye/awesome-mcp-servers`, add one line under the search
  category, open a PR:
  `[krutftw/fetchmux](https://github.com/krutftw/fetchmux) - Self-hosted retrieval router with per-request budgets, provider policy routing, and auditable route receipts (BYOK).`

## 5. Self-serve checkout and client portal (LIVE as of 2026-07-23)

A dedicated Stripe account "FetchMux" (`acct_1TwDMQEQYg64P9i7`) is activated (`charges_enabled`).
It holds the live pilot checkout: two one-time prices (USD 750 setup + USD 99 first 30 days) and an
optional "retrieval workload" question. `managed_payments` is disabled on the live link (defer
Stripe merchant-of-record / automatic tax to the accountant).

- **Live payment link:** `https://buy.stripe.com/14A4gz5FDeLL9haf4Q7ok01` (`plink_1TwDopEQYg64P9i70Rh2ufDr`)
- **Test payment link:** `https://buy.stripe.com/test_4gM28r6JH5bb2SMbSE7ok00` (`plink_1TwDO4EQYg64P9i7IGvc1Cyz`)
- Both links `after_completion` = **redirect** to `https://fetchmux.com/portal?session_id={CHECKOUT_SESSION_ID}`.

### How pay → instant access works (no email hand-off)

1. Buyer completes checkout on the live link; Stripe redirects to `/portal?session_id=cs_live_…`.
2. The portal page POSTs the session id to the Pages Function `functions/api/portal-session.js`.
3. The function fetches the Checkout Session from Stripe **server-side** (live key for `cs_live_`,
   test key for `cs_test_`), confirms `payment_status=paid`, and returns the purchase facts
   (email, name, amount, workload custom field, receipt URL). It then sets a signed HttpOnly cookie
   (`fm_portal`, HMAC-SHA256 over the session id, 60-day expiry) so the browser stays signed in.
4. Return visits hit the function with GET; it re-verifies from the cookie. No customer data is
   stored anywhere — Stripe is always the source of truth. Unpaid/invalid/forged sessions are
   rejected (402/404/400) and a missing cookie is 401 → the portal shows a recovery screen.

### Cloudflare Pages configuration (already set)

Production secrets on the `fetchmux` Pages project:

- `STRIPE_SECRET_KEY` — live secret key of the FetchMux account (reads `cs_live_` sessions).
- `STRIPE_TEST_SECRET_KEY` — test secret key (reads `cs_test_` sessions for verification).
- `PORTAL_HMAC_SECRET` — random 64-char base64; signs the portal cookie.

Set/rotate with: `npx wrangler pages secret put NAME --project-name fetchmux`.

### Deploy (gremlin-immune)

An external stale editor buffer intermittently reverts `apps/site/public/llms*.txt` and
`robots.txt`. Deploy from a scratchpad copy sourced from `git HEAD`, and include Functions by
running wrangler from the repo root (it auto-detects `./functions`):

```bash
npm run build
SP=<scratchpad>/assets_root; rm -rf "$SP"; mkdir -p "$SP"; cp -r apps/site/dist/* "$SP/"
git show HEAD:apps/site/public/llms.txt      > "$SP/llms.txt"
git show HEAD:apps/site/public/llms-full.txt > "$SP/llms-full.txt"
# from repo root so ./functions is bundled:
npx wrangler pages deploy "$SP" --project-name fetchmux --branch main --commit-dirty=true
```

The CTA defaults to the live checkout in code (`PilotCta.tsx`); `VITE_PILOT_CONTACT_URL` /
`VITE_PILOT_CTA_LABEL` still override it if the link ever changes — no code edit needed.

### Verified 2026-07-23

Full test-mode purchase → redirect → portal rendered the customer, USD 849, and the workload typed
at checkout; returning-visitor cookie path worked; 401/404/400 rejection paths confirmed; live
surface checks (buy link, footer portal link, llms open-source copy, robots disallow) all pass.
A real live charge was intentionally not made; the live path is identical code with the live key.

### What is automated vs founder-delivered

Automated on payment: receipt, portal access, onboarding instructions, self-host quickstart, and
the buyer's workspace. Founder-delivered (the paid value): the workload benchmark, the REST/MCP
integration, and the weekly scorecards — these start at the scheduled setup. The portal makes
*selling* zero-touch; *delivery* is still the founder's work until the hosted multi-tenant product
(separate build, see pilot-readiness gates) exists.

## 6. After release

- Watch GitHub issues/stars and reply same-day; new issues are discovery conversations.
- Keep `main` as the released branch; continue work on feature branches.
- Update `server.json` and republish to the registry on every version bump that changes the MCP
  package.
- The announcement copy for HN, Reddit, X, and Product Hunt is in
  [the launch kit](../business/launch-kit-2026-07-22.md).

## Rollback

- GitHub visibility can be flipped back to private, but assume the code has been cloned once public.
- npm packages can be deprecated (`npm deprecate`) and unpublished within 72 hours subject to npm's
  unpublish policy; treat publishing as effectively permanent.
- MCP registry entries can be updated or marked deleted with a new `mcp-publisher publish`.
