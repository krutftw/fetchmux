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

## 5. Turn on buy-on-the-website (after Stripe activation)

Prepared 2026-07-23. A dedicated Stripe account "FetchMux" (`acct_1TwDMQEQYg64P9i7`) holds the
pilot checkout: two one-time prices (USD 750 setup + USD 99 first 30 days), an optional
"retrieval workload" question, and an automated what-happens-next confirmation message. The
verified TEST link is `https://buy.stripe.com/test_4gM28r6JH5bb2SMbSE7ok00`. The site CTA swaps
from the mailto intake to a checkout button purely via build-time variables — no code change.

1. Owner activates the FetchMux Stripe account (Dashboard → FetchMux → Activate: identity + bank).
2. Recreate the same objects in live mode (CLI profile `fetchmux`, add `--live`): two products,
   two prices, one payment link with the same custom field and confirmation message. Record the
   live link.
3. Build and deploy the site with the checkout CTA:

```powershell
$env:VITE_PILOT_CONTACT_URL = "https://buy.stripe.com/LIVE_LINK_HERE"
$env:VITE_PILOT_CTA_LABEL = "Buy the founding pilot"
npm run build
npx wrangler pages deploy apps/site/dist --project-name fetchmux --branch main --commit-dirty=true
```

4. Verify on fetchmux.com: the pilot card shows "Buy the founding pilot" linking to the live
   checkout; complete one USD 0-risk verification by opening the page (do not test-pay live).
5. Every sale then runs itself through onboarding: Stripe receipt + confirmation instructions;
   the founder's delivery work (benchmark, integration, scorecard) starts at the scheduled setup.

Never point the public site at the test-mode link.

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
