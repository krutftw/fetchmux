# Forge continuity

Use this runbook when a code host is unavailable, credentials expire, or the active private forge
must move without losing history or weakening review gates.

## Current authority

As of 2026-07-17 (Australia/Perth):

| Role | Service | Location | State |
| --- | --- | --- | --- |
| Primary private forge | Azure DevOps | `https://dev.azure.com/fetchmux/platform` | Active |
| Review | Azure Repos | Draft pull request `#1` | Active, not approved for merge |
| CI | Azure Pipelines | `FetchMux CI`, definition `1` | Build `20260716.1` passed |
| Private backup | GitHub | `https://github.com/krutftw/fetchmux` | Active |
| Historical forge | GitLab | `https://gitlab.com/fetchmux/platform` | Account blocked; API returns HTTP 403 |
| Offline recovery | Git bundle | `C:\Users\Administrator\fetchmux-backups\fetchmux-azure-2026-07-17.bundle` | Verified through `4c7b0dcdfe466ce6728fbcd9f3368b855c8e26b3` |

The bundle SHA-256 is
`fd69fca639505dcf043ab688cd28aae68845398d4390f663f04585a4228af6ce` and its size is
248,953 bytes. The earlier pre-Azure bundle is retained separately rather than overwritten.

## Local remotes

Keep all three remotes. Do not delete historical reachability merely because a service is down.

```text
azure  https://fetchmux@dev.azure.com/fetchmux/platform/_git/platform
origin https://github.com/krutftw/fetchmux.git
gitlab https://gitlab.com/fetchmux/platform.git
```

`azure` is the push default. The feature branch also uses `azure` as its branch-specific push
remote. Push the reviewed commit to GitHub after Azure read-back succeeds.

## Authentication

Git uses Git Credential Manager. Its Azure Repos credential is stored in the operating-system
credential vault and is limited to code operations. Never put it in a remote URL, script, log, or
repository file.

Azure CLI `2.88.0` and Azure DevOps extension `1.0.6` are installed. The extension currently selects
a duplicate Azure identity and returns `TF400813`; do not weaken permissions to work around that.
For Azure DevOps administration, obtain an in-memory Azure CLI token for resource
`499b84ac-1321-427f-aa17-267ca6975798` and call the documented Azure DevOps REST API. Never print,
persist, or pass that bearer token as a command-line argument.

## Verify replicated history

Read the exact branch tips back from each active remote:

```powershell
git ls-remote azure refs/heads/main refs/heads/feature/founding-build
git ls-remote origin refs/heads/main refs/heads/feature/founding-build
```

Compare the returned object IDs with local `git rev-parse`. A successful push without matching
read-back is not sufficient evidence.

Verify the offline bundle before relying on it:

```powershell
git bundle verify C:\Users\Administrator\fetchmux-backups\fetchmux-azure-2026-07-17.bundle
Get-FileHash C:\Users\Administrator\fetchmux-backups\fetchmux-azure-2026-07-17.bundle -Algorithm SHA256
```

Create a replacement bundle only from the intended repository, then verify it before replacing the
documented recovery artifact.

## CI and review controls

`azure-pipelines.yml` is the source of truth for Azure CI. The durable free baseline includes:

- checksum-pinned full-history Gitleaks scanning;
- Node 24.18.0, locked installation, and high-severity `npm audit`;
- tests with published JUnit results, TypeScript, Biome, OpenAPI, and production build gates;
- the zero-network benchmark dry run;
- a non-root container build; and
- checksum-pinned Trivy reporting with unknown, high, and critical findings blocking.

Azure Advanced Security is not enabled. Do not start a paid trial or attach billing merely to match
historical GitLab Ultimate dashboards.

The weekly YAML schedule runs Monday at 06:00 Australia/Perth. It targets the active review branch
until merge. Change it to `main` in the same reviewed change that completes the founding pull
request, then queue and read back a smoke run.

## GitLab recovery

The factual support draft is stored at
`C:\Users\Administrator\fetchmux-backups\gitlab-unblock-request-2026-07-17.md`. Do not create
replacement accounts to evade the block and do not claim a cause that GitLab has not provided.

If GitLab restores access:

1. read the account and project state back through GitLab's API;
2. inspect the actual subscription tier and renewal terms;
3. verify the existing remote tips without force-pushing;
4. run the applicable pipeline on the current branch;
5. export any historical security reports that remain accessible; and
6. keep Azure primary until the restored service proves a concrete operational advantage.

No purchase, public visibility change, merge, outreach, provider agreement, or deployment is
authorized by this continuity runbook.
