# FetchMux Machine-First Domain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish a truthful, machine-readable FetchMux domain on Cloudflare Pages without exposing the private Azure gateway.

**Architecture:** A pure TypeScript generator creates the public machine surface from canonical repository inputs. Vite copies the generated files into the static site build, and a validation-first PowerShell script deploys the exact clean Git commit to Cloudflare Pages. The apex domain and email aliases are configured only after local verification.

**Tech Stack:** TypeScript 7, Vitest, Vite 8, Redocly CLI, PowerShell 7, Wrangler 4, Cloudflare Pages and Email Routing.

---

### Task 1: Specify the machine surface

**Files:**
- Create: `scripts/site/machine-surface.test.ts`
- Create: `scripts/site/machine-surface.ts`

**Step 1: Write the failing tests**

Test a wished-for `buildMachineSurface()` function that returns `robots.txt`, `llms.txt`, `llms-full.txt`, `sitemap.xml`, `_headers`, `openapi.yaml`, and `openapi.json`. Assert explicit crawler access, canonical HTTPS URLs, truthful private-preview language, YAML/JSON contract equivalence, and the absence of the Azure hostname or a public hosted-service claim.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- scripts/site/machine-surface.test.ts`  
Expected: FAIL because `machine-surface.ts` does not exist.

**Step 3: Implement the minimal pure generator**

Read the canonical OpenAPI YAML, use Redocly's bundled parser only through a supplied JSON string or a small validated conversion helper, and return a deterministic map of output paths to strings. Keep all product claims literal and testable.

**Step 4: Run the focused test and verify GREEN**

Run: `npm test -- scripts/site/machine-surface.test.ts`  
Expected: PASS.

**Step 5: Commit**

Commit message: `feat(site): define machine-readable domain surface`

### Task 2: Generate build assets deterministically

**Files:**
- Create: `scripts/site/generate-machine-surface.ts`
- Modify: `apps/site/package.json`
- Modify: `package.json`
- Modify: `biome.json` only if generated output needs an explicit exclusion

**Step 1: Add a failing build-contract test**

Extend the focused test to invoke the writer against a temporary directory and assert exact file names, no writes outside the target, stable second-run output, and UTF-8 text.

**Step 2: Verify RED**

Run the focused test and confirm it fails because the writer is absent.

**Step 3: Implement the writer and build hook**

Write generated assets to `apps/site/public` immediately before `vite build`. Never write credentials or environment-specific URLs. Clean only the known generated file list.

**Step 4: Verify GREEN and build output**

Run: `npm test -- scripts/site/machine-surface.test.ts`  
Run: `npm run build -w @fetchmux/site`  
Expected: all tests pass and every machine file exists under `apps/site/dist`.

**Step 5: Commit**

Commit message: `build(site): generate canonical discovery assets`

### Task 3: Make the HTML identity canonical and honest

**Files:**
- Modify: `apps/site/src/App.test.tsx`
- Modify: `apps/site/src/App.tsx`
- Modify: `apps/site/index.html`

**Step 1: Write failing tests**

Require the domain-secured/trademark-pending label, canonical link, Open Graph and X metadata, JSON-LD `SoftwareApplication` identity, and links to the OpenAPI and `llms.txt` artifacts.

**Step 2: Verify RED**

Run: `npm test -- apps/site/src/App.test.tsx`  
Expected: FAIL on the missing public identity metadata.

**Step 3: Implement minimal metadata and navigation**

Do not redesign the site. Replace only stale provisional-domain wording, add machine-contract links, and preserve the existing commercial caveats.

**Step 4: Verify GREEN**

Run the focused test, accessibility assertions, typecheck, and site build.

**Step 5: Commit**

Commit message: `feat(site): establish fetchmux.com identity`

### Task 4: Add a validation-first Cloudflare deployment path

**Files:**
- Create: `scripts/cloudflare/deploy-site.ps1`
- Create: `scripts/cloudflare/deploy-site.test.ts`
- Create: `docs/runbooks/cloudflare-domain.md`

**Step 1: Write failing script-contract tests**

Require clean-commit enforcement, `-ValidateOnly`, explicit `-Apply`, exact project/domain names, build-before-deploy, and post-deployment checks. Assert that no token is accepted as a command-line parameter or printed.

**Step 2: Verify RED**

Run: `npm test -- scripts/cloudflare/deploy-site.test.ts`.

**Step 3: Implement the script and runbook**

Use the existing Wrangler OAuth session. Direct-upload `apps/site/dist` to a `fetchmux` Pages project. Record the returned deployment URL and verify machine paths before adding `fetchmux.com` as a custom domain. Document rollback and email-routing commands.

**Step 4: Verify GREEN**

Run focused tests and `-ValidateOnly`; confirm no Cloudflare mutation occurs.

**Step 5: Commit**

Commit message: `ops(cloudflare): add guarded domain deployment`

### Task 5: Verify and publish

**Files:**
- Modify generated evidence in `docs/runbooks/cloudflare-domain.md` only after read-back

**Step 1: Run the full local gate**

Run tests, TypeScript, Biome, OpenAPI lint, production build, npm audit, Gitleaks, and `git diff --check`.

**Step 2: Deploy the exact clean commit**

Create or update the `fetchmux` Pages project through Wrangler direct upload. Add `fetchmux.com`, configure `www` redirect if supported safely, and enable verified email forwarding for `hello@` and `security@`.

**Step 3: Read back externally**

Verify DNS, TLS, canonical redirects, security headers, crawler access, machine artifacts, content hashes, Pages deployment commit, email routing status, and absence of the private Azure hostname.

**Step 4: Commit evidence and push**

Commit the exact deployment evidence, push `feature/machine-discovery` to Azure Repos and GitHub, and open stacked private draft reviews targeting `feature/azure-staging`.

