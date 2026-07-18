# FetchMux site deployment evidence

- **Deployed:** 2026-07-18 (Australia/Perth)
- **Cloudflare Pages deployment:** `3987157c-32fb-4464-90e8-0e81494cdd28`
- **Immutable origin:** `https://3987157c.fetchmux.pages.dev`
- **Canonical origin:** `https://fetchmux.com`
- **Source commit:** `5c52503a444858e8dfe8882ddf4c1cdf1fe13a92`

## Deployment read-back

Cloudflare's deployment API returned the full source commit, `environment: production`, and
`commit_dirty: false`. The custom-domain API returned `status: active` and active validation for
`fetchmux.com`.

The immutable and canonical origins returned identical content hashes for every required public
surface:

| Path | SHA-256 |
| --- | --- |
| `/` | `15ced9b0e5d85e6d33fb967c386e91dc93837dbd6dbdf363978d0306b4291006` |
| `/robots.txt` | `d56b1f2b6c262c3db01818e0b92bd765f37d28e7d461af87418c23bb2b7fbbcf` |
| `/llms.txt` | `09c606a0bc1b8d07d10ca29fcc9d3cd9d926ed2d27492b18cbf99e2f6e21d2cd` |
| `/llms-full.txt` | `1bcc5144e8275794e30ce4af9e9c43671f2b7c5d316e1084f1dd9870bc34537e` |
| `/openapi.yaml` | `d7983920878a90ddc4a78d484f5a3af5341fa26350abe286629876acc1478473` |
| `/openapi.json` | `c8453681abbc2e70f0721689b2e24b58c7f020366959fcaeda593f5be685897c` |
| `/sitemap.xml` | `538712803bb9641ae293532612a17ecb362022139aab2a8f07ad9e647144f16a` |
| `/favicon-mux.svg` | `f3fe231282219333c93636fa526a615da8161096879362ae60d7d9be34ab83b1` |
| `/.well-known/security.txt` | `d1cde631c53784c03c53300dc0a947101cffb893626d387ab02d8aec2ce7fabf` |

The deployed JavaScript bundle is `/assets/index-BQM0AFHj.js`. Read-back confirmed that it contains
the Crossref adapter label, `Customer keys + public metadata`, and `maxLatencyMs`, and does not
contain the obsolete `deadlineMs` example field. The deployed OpenAPI task enum contains
`scholarly`.

The canonical root returned Content Security Policy, Permissions Policy, Referrer Policy, HSTS,
`X-Content-Type-Options`, and `X-Frame-Options`. This deployment updates the public discovery and
documentation site only. It does not expose the private Azure gateway or create a public FetchMux API.

