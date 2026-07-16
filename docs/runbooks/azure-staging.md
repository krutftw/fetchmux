# Azure staging operations

- **Environment:** private single-tenant staging
- **Region:** Australia East
- **Resource group:** `rg-fetchmux-stg-aue`
- **Status:** infrastructure and deployment tooling verified locally; live apply pending

This environment proves that the founding gateway can run behind managed TLS with an exact image,
managed-identity access, secret isolation, structured logs, and bounded scale. It is not a public
launch, production service, multi-tenant control plane, or provider benchmark.

## Topology and limits

| Resource | Configuration | Cost or security boundary |
| --- | --- | --- |
| Azure Container Registry | Basic, private, admin disabled | One registry; immutable full-commit tags |
| User-assigned identity | `id-fetchmux-stg-aue` | `AcrPull` on ACR and `Key Vault Secrets User` on this vault only |
| Key Vault | Standard, RBAC, purge protection | Gateway bearer key; no provider keys |
| Log Analytics | `PerGB2018`, 30-day retention | `0.05` GB daily ingestion cap |
| Container Apps environment | Consumption | No dedicated workload profile |
| Gateway app | `0.25` vCPU, `0.5 GiB`, scale `0..1` | TLS only; one operator IPv4 `/32` allow rule |

The process probe is `/health`. `/ready` is expected to return `503` because no approved provider
key is present. Protected `/v1/*` endpoints still require the Key Vault-backed FetchMux key.

## Verified billing guardrails

The active subscription reported `quotaId=FreeTrial_2014-09-01` and `spendingLimit=On` on
2026-07-17. That spending limit is the account-level stop. Do not remove it or convert the offer as
part of this runbook. The older Free Trial offer does not return a current balance through the
modern Consumption balance or Cost Management query endpoints, so the remaining credit amount is
unknown and must not be invented.

Australia East retail API snapshot on 2026-07-17:

| Meter | AUD retail snapshot |
| --- | ---: |
| Basic registry unit | `0.2414` per day, about `7.34` per 30.4-day month |
| Registry storage | `0.1449` per GB-month |
| ACR task vCPU duration | `0.0001` per second |
| Key Vault Standard operations | `0.0435` per 10,000 operations |
| Analytics Logs ingestion | `4.8402` per GB |

Container Apps currently grants the first 180,000 vCPU-seconds, 360,000 GiB-seconds, and two
million requests per subscription per month. Scale-to-zero avoids compute charges while idle. Azure
pricing can change; refresh the Retail Prices API before increasing retention, replicas, traffic,
or SKU.

Primary pricing references:

- [Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
- [Container Registry pricing](https://azure.microsoft.com/en-us/pricing/details/container-registry/)
- [Key Vault pricing](https://azure.microsoft.com/en-us/pricing/details/key-vault/)
- [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/)
- [Free Trial spending limits](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit)

## Validate without changing Azure

From the repository root:

```powershell
pwsh -NoProfile -File scripts/azure/deploy-staging.ps1 -ValidateOnly
```

This compiles all three Bicep files and exits before reading or changing the subscription. A normal
run without `-Apply` also inspects the signed-in subscription, detects the current operator IPv4
address, and runs platform `what-if` when all required providers are already registered:

```powershell
pwsh -NoProfile -File scripts/azure/deploy-staging.ps1
```

If providers are not registered, the dry run reports their exact names and exits. Only `-Apply`
authorizes provider registration or resource creation.

## Apply an exact clean commit

The apply path refuses a dirty worktree. Commit and pass the local gate first:

```powershell
npm test
npm run typecheck
npm run lint
npm run lint:openapi
npm run build
pwsh -NoProfile -File scripts/azure/deploy-staging.ps1 -Apply
```

The script then performs this sequence:

1. register only the five providers declared in the implementation plan;
2. show subscription-level `what-if` and deploy the durable platform;
3. create the gateway key through Key Vault's HTTPS data-plane API without a file or CLI value
   argument;
4. build `fetchmux-gateway:<full-git-sha>` in ACR;
5. show resource-group `what-if` and deploy the app;
6. run secret-safe Azure and HTTPS read-back.

The image tag is the complete Git commit. The scripts never deploy `latest` or a mutable
environment tag.

## Verify independently

```powershell
pwsh -NoProfile -File scripts/azure/verify-staging.ps1
```

The command must confirm:

- ACR Basic with admin and anonymous pull disabled;
- attached user-assigned identity with `AcrPull` and `Key Vault Secrets User`;
- one unversioned Key Vault reference and no direct Container App secret value;
- TLS-only ingress with one IPv4 `/32` allow rule;
- scale from zero to one;
- the exact full-commit image;
- HTTP `200` for `/health`, `503` for `/ready`, `401` for unauthenticated `/v1/providers`, and
  `200` for authenticated `/v1/providers`;
- zero available providers until separately approved credentials exist.

The final JSON contains resource names, status codes, revision, image, and FQDN. It does not contain
the gateway key.

## Logs

The gateway emits allowlisted JSON without query text, result content, provider response bodies, or
keys. Read the newest container records with:

```powershell
$workspaceId = az monitor log-analytics workspace show `
  --resource-group rg-fetchmux-stg-aue `
  --workspace-name log-fetchmux-stg-aue `
  --query customerId -o tsv

az monitor log-analytics query `
  --workspace $workspaceId `
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerAppName_s == 'ca-fetchmux-gateway-stg' | project TimeGenerated, Log_s | order by TimeGenerated desc | take 100"
```

Do not raise the daily cap or retention merely to make troubleshooting more convenient. Export only
sanitized request IDs, timestamps, safe status codes, and route receipts.

## Rotate the gateway key

Create a new 32-byte value in memory and write it through the Key Vault data-plane API. Do not put
the value in a command argument, file, log, shell history, or support message. Use an unversioned
secret reference so Container Apps retrieves the new version and restarts the active revision.
Microsoft documents that this refresh can take up to 30 minutes.

After rotation, rerun `verify-staging.ps1`; the script reads the current Key Vault value into process
memory and removes it in `finally`. Revoke any old client copy immediately.

## Roll back

List immutable image tags and identify a previously verified full commit:

```powershell
$registry = az acr list --resource-group rg-fetchmux-stg-aue --query '[0].name' -o tsv
az acr repository show-tags --name $registry --repository fetchmux-gateway --orderby time_desc -o table
```

Redeploy `infra/azure/app.bicep` with the exact prior image reference and the current operator CIDR.
Do not change the platform or secret during an image rollback. Read back
`properties.latestReadyRevisionName`, rerun the four HTTP checks, and record the reversal.

## Teardown boundary

Every paid staging resource is inside `rg-fetchmux-stg-aue`. Before any teardown, list and read back
that exact group and confirm no resource has been repurposed:

```powershell
az resource list --resource-group rg-fetchmux-stg-aue -o table
az group show --name rg-fetchmux-stg-aue --query '{id:id,state:properties.provisioningState}' -o json
```

Deleting the group is destructive and is not part of deploy or verification. It requires a
separate owner decision after any required log or evidence retention is complete.

## Live evidence

Pending. Do not replace this line with success until the exact deployed commit, ACR image, active
revision, FQDN, ingress CIDR, RBAC assignments, resource SKUs, HTTP statuses, and verification time
have all been read back from Azure.
