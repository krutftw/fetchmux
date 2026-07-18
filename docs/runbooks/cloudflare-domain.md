# Cloudflare domain operations

- **Canonical domain:** `https://fetchmux.com/`
- **Pages project:** `fetchmux`
- **Deployment mode:** direct upload from an exact clean Git commit
- **Hosting boundary:** static Cloudflare Pages only

Cloudflare Pages is the founding host because direct uploads do not depend on a Git provider and
static asset requests are available on the free plan. The current site needs neither R2 nor a
server-side function. Azure continues to host the private, operator-IP-restricted gateway and is not
referenced by public site output.

All operations in this runbook use the CLI or HTTPS APIs. Wrangler OAuth is the deployment identity.
The deployment entrypoint does not accept a credential argument, and it never writes authentication
material into the repository, command history, deployment metadata, or output.

## Validate without changing Cloudflare

From the repository root:

```powershell
npx wrangler whoami
pwsh -NoProfile -File scripts/cloudflare/deploy-site.ps1 -ValidateOnly
```

Validation builds the production site, verifies the local machine-readable surface, confirms the
Wrangler session, inspects the current Pages project list, and reports whether the worktree is clean.
It does not create a project, upload a deployment, attach a domain, or change DNS.

## Deploy the exact commit

Commit the intended source, run the full repository gate, and then apply:

```powershell
npm test
npm run typecheck
npm run lint
npm run lint:openapi
npm run build
pwsh -NoProfile -File scripts/cloudflare/deploy-site.ps1 -Apply
```

The apply path refuses a dirty worktree. It creates the `fetchmux` Direct Upload project when absent,
uploads `apps/site/dist` with the full Git SHA and `commit_dirty=false`, verifies the immutable
deployment URL, associates `fetchmux.com` through the Pages API, waits for domain activation, and
then repeats the checks through the canonical HTTPS origin.

Wrangler OAuth can manage Pages but does not grant arbitrary DNS record access. For the first domain
association only, provide a token scoped to `Zone / DNS / Edit` for `fetchmux.com` through masked
process input. The script uses it only when the domain is not already active, creates the exact apex
CNAME when no record exists, and refuses to replace a conflicting record:

```powershell
$env:FETCHMUX_CLOUDFLARE_DNS_TOKEN = Read-Host 'DNS-scoped Cloudflare token' -MaskInput
try {
  pwsh -NoProfile -File scripts/cloudflare/deploy-site.ps1 -Apply
} finally {
  Remove-Item Env:FETCHMUX_CLOUDFLARE_DNS_TOKEN -ErrorAction SilentlyContinue
}
```

Do not put this value in a script argument, checked-in file, shell profile, or deployment metadata.
Once the domain is active, ordinary content deployments continue through Wrangler OAuth without the
DNS credential.

The live checks require HTTP `200` and the intended media type for:

- `/`
- `/robots.txt`
- `/llms.txt`
- `/llms-full.txt`
- `/openapi.yaml`
- `/openapi.json`
- `/sitemap.xml`
- `/favicon-mux.svg`
- `/.well-known/security.txt`

They also reject any public content containing the private Azure hostname.

## Email Routing

Email Routing is separate from the site deploy. Enable it only when the forwarding destination is
already verified in the same Cloudflare account:

```powershell
npx wrangler email routing addresses list
npx wrangler email routing enable fetchmux.com
npx wrangler email routing settings fetchmux.com
```

Explicit `hello@fetchmux.com` and `security@fetchmux.com` forwarding rules were enabled and read back
on 2026-07-18. Catch-all routing remains disabled. Use
`npx wrangler email routing rules create --help` immediately before any future change because Email
Routing commands are currently marked open beta. Read the settings and rules back after every
change, and never print the private forwarding destination in public release evidence.

## Read-back

```powershell
npx wrangler pages project list --json
npx wrangler pages deployment list --project-name fetchmux --environment production --json
Resolve-DnsName fetchmux.com
Invoke-WebRequest https://fetchmux.com/robots.txt
Invoke-WebRequest https://fetchmux.com/openapi.json
```

Record the deployment ID, full Git SHA, custom-domain status, DNS answers, response media types, and
content hashes. A successful upload alone is not release evidence.

## Rollback

Cloudflare supports an instant rollback to any successful production deployment. The API endpoint is:

```text
POST /accounts/{account_id}/pages/projects/fetchmux/deployments/{deployment_id}/rollback
```

Select a previously verified production deployment ID from the Wrangler deployment list, invoke the
rollback with the existing Cloudflare authentication context, then repeat every canonical-domain
read-back check. An alternative is to create a temporary worktree at the exact prior Git SHA and run
the guarded apply script there. Never delete the current deployment before the prior version has been
restored and verified.
