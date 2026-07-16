# Azure Staging Design

**Date:** 2026-07-17  
**Status:** Approved for implementation under the owner's delegated operating authority  
**Scope:** Private, single-tenant staging evidence. This is not a public launch.

## Decision and alternatives

Deploy the FetchMux gateway to Azure Container Apps on the Consumption plan in Australia East. Use
a private Basic Azure Container Registry, one Standard Key Vault, a user-assigned managed identity,
and a small Log Analytics workspace. The app scales from zero to one replica and permits ingress
only from the operator's current public IP address. The founding site, provider credentials,
database, billing system, and multi-tenant control plane remain out of scope.

This is preferable to Azure App Service because App Service would keep a paid worker allocated even
when the staging gateway is idle. A virtual machine would add patching, network, disk, backup, and
operating-system responsibilities without improving the product proof. A public serverless demo
without authentication would be cheaper to share, but it would create an abuse surface and weaken
the product's existing security model. Container Apps gives us a production-like TLS endpoint,
revision history, managed identity, log capture, and scale-to-zero without forcing a premature SaaS
architecture.

The 2026-07-17 Australia East retail snapshot is AUD 0.2414 per day for a Basic registry, about AUD
7.34 per 30.4-day month. Standard Key Vault operations are AUD 0.0435 per 10,000 operations and
Analytics Logs ingestion is AUD 4.8402 per GB. Container Apps currently includes 180,000 vCPU
seconds, 360,000 GiB seconds, and two million requests per subscription per month before usage
charges. These are evidence snapshots, not promises about future pricing. The subscription's Azure
Free Trial spending limit is On, which remains the hard account-level protection.

## Architecture and data flow

The deployment is split into two Bicep phases. The subscription deployment creates one dedicated
resource group and the durable platform resources: registry, vault, identity, log workspace, and
Container Apps environment. The application deployment occurs only after the exact Git commit has
been built inside Azure Container Registry and stored under an immutable commit tag. This avoids a
placeholder image and makes the deployed revision traceable to source.

The user-assigned identity receives only `AcrPull` on the registry and `Key Vault Secrets User` on
the staging vault. Registry admin credentials stay disabled. A generated FetchMux gateway key is
stored in Key Vault and referenced by the Container App without placing the value in Bicep,
deployment history, source control, or command output. The operator receives `Key Vault Secrets
Officer` only at this vault's scope so the deployment script can create and rotate that secret.

HTTPS ingress terminates at Container Apps and forwards to port 8787. Plain HTTP is disabled. An
allow rule admits only the detected operator CIDR; all other public traffic is denied. `/health`
drives process probes. `/ready` deliberately remains `503` until an operator-owned provider key is
configured, so provider readiness is not confused with process health. Protected `/v1/*` routes
continue to require the generated bearer key. Structured route logs exclude queries, provider
responses, and secrets before Azure receives them.

## Failure handling, verification, and rollback

The PowerShell deployment entrypoint is fail-fast and idempotent. It verifies the Azure account and
subscription, registers only required resource providers, compiles the Bicep templates, deploys the
platform, creates the secret without printing it, builds the exact commit, and then deploys the
application. Role propagation is retried for a bounded period. A failed image build cannot change
the running app because the app phase never receives an unbuilt tag.

Verification has four layers. Static tests assert the cost and security contract in source. Bicep
compilation catches schema errors. Azure `what-if` shows the intended resource changes before the
first apply. Live read-back then confirms the SKU, disabled registry admin account, managed identity
roles, scale limits, IP restriction, revision image, secret reference, and app health. Smoke tests
must observe `200` from `/health`, `503` from `/ready` while no provider is configured, `401` without
the FetchMux key, and `200` from `/v1/providers` with the key.

Container Apps single-revision mode keeps rollback simple: redeploy the previous commit tag and
read back the active revision. The resource group is dedicated to staging, so full teardown is also
bounded to that exact group. No automatic deletion job is added because silent teardown would erase
useful evidence; scale-to-zero and a one-replica ceiling control compute instead. Provider keys are
not added until their account terms, cost provenance, and benchmark permission are verified.

## Primary references

- [Azure Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
- [Container Apps Key Vault references](https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets)
- [Managed identity image pulls](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull)
- [Container Apps ingress](https://learn.microsoft.com/en-us/azure/container-apps/ingress-how-to)
- [Key Vault RBAC guidance](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide)
- [Azure Free Trial spending limits](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/spending-limit)

