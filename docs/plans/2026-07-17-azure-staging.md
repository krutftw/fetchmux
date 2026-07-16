# Azure Staging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy a reproducible, IP-restricted, scale-to-zero FetchMux staging gateway in Australia East without exposing provider keys or enabling multi-tenant behavior.

**Architecture:** A subscription-scope Bicep entrypoint creates a dedicated resource group and durable platform module. A second resource-group template deploys the exact commit-tagged gateway image after an Azure Container Registry build. A PowerShell orchestrator owns validation, secret creation, deployment, and live read-back.

**Tech Stack:** Azure CLI, Bicep, Azure Container Apps Consumption, Azure Container Registry Basic, Azure Key Vault Standard, user-assigned managed identity, Log Analytics, PowerShell 7-compatible scripts, Vitest.

---

### Task 1: Lock the infrastructure security contract in tests

**Files:**
- Create: `scripts/azure/staging-infra.test.ts`
- Modify: `package.json`

**Step 1: Write the failing static contract test**

Create a Vitest test that loads `infra/azure/platform.bicep` and `infra/azure/app.bicep` and requires:

```typescript
expect(platform).toContain("name: 'Basic'");
expect(platform).toContain("adminUserEnabled: false");
expect(platform).toContain("enableRbacAuthorization: true");
expect(platform).toContain("enablePurgeProtection: true");
expect(platform).toContain("4633458b-17de-408a-b874-0445c86b69e6");
expect(app).toContain("allowInsecure: false");
expect(app).toContain("ipSecurityRestrictions");
expect(app).toContain("minReplicas: 0");
expect(app).toContain("maxReplicas: 1");
expect(app).toContain("keyVaultUrl:");
expect(app).toContain("secretRef: 'fetchmux-api-key'");
```

Add `infra/azure` and `scripts/azure` to the root lint inputs.

**Step 2: Run the test to verify it fails**

Run: `npm test -- scripts/azure/staging-infra.test.ts`  
Expected: FAIL because the Bicep files do not exist.

**Step 3: Commit the test**

```powershell
git add package.json scripts/azure/staging-infra.test.ts
git commit -m "test: define Azure staging guardrails"
```

### Task 2: Define the durable Azure platform

**Files:**
- Create: `infra/azure/main.bicep`
- Create: `infra/azure/platform.bicep`

**Step 1: Create the subscription entrypoint**

Use `targetScope = 'subscription'`. Create only `rg-fetchmux-stg-aue`, tag it with `application`,
`environment`, and `managedBy`, and call the platform module at resource-group scope. Accept the
current deployer's object ID as a parameter rather than embedding an account identifier.

**Step 2: Create the platform module**

Provision these exact controls:

- globally unique Basic ACR with admin and anonymous pull disabled;
- Standard RBAC-enabled Key Vault with soft delete and purge protection;
- user-assigned identity with `AcrPull` at ACR scope and `Key Vault Secrets User` at vault scope;
- deployer `Key Vault Secrets Officer` at vault scope;
- Log Analytics with 30-day retention and a small daily cap;
- Container Apps Consumption environment connected to that workspace.

Output resource names, resource IDs, the registry login server, and vault URI. Never output a
secret or workspace shared key.

**Step 3: Compile and run the contract test**

Run: `az bicep build --file infra/azure/main.bicep`  
Expected: Bicep compilation succeeds.

Run: `npm test -- scripts/azure/staging-infra.test.ts`  
Expected: the platform assertions pass while app assertions still fail.

**Step 4: Commit the platform**

```powershell
git add infra/azure/main.bicep infra/azure/platform.bicep
git commit -m "infra: define Azure staging platform"
```

### Task 3: Define the Container App deployment

**Files:**
- Create: `infra/azure/app.bicep`

**Step 1: Add the single-revision app template**

Accept the exact image reference and operator CIDR. Use the existing environment, identity,
registry, and vault. Configure:

```bicep
configuration: {
  activeRevisionsMode: 'Single'
  ingress: {
    external: true
    allowInsecure: false
    targetPort: 8787
    transport: 'auto'
    ipSecurityRestrictions: [
      { name: 'operator'; action: 'Allow'; ipAddressRange: operatorCidr }
    ]
  }
}
template: {
  scale: { minReplicas: 0; maxReplicas: 1 }
}
```

Set `FETCHMUX_HOST=0.0.0.0`, `FETCHMUX_PORT=8787`, and
`FETCHMUX_API_KEY=secretref:fetchmux-api-key`. Reference the unversioned Key Vault secret URL with
the user-assigned identity. Pull the private ACR image with the same identity. Add HTTP startup,
liveness, and readiness probes against `/health`, never `/ready`.

**Step 2: Compile and run the contract test**

Run: `az bicep build --file infra/azure/app.bicep`  
Expected: Bicep compilation succeeds.

Run: `npm test -- scripts/azure/staging-infra.test.ts`  
Expected: PASS.

**Step 3: Commit the app template**

```powershell
git add infra/azure/app.bicep
git commit -m "infra: define FetchMux staging app"
```

### Task 4: Add a safe deployment orchestrator

**Files:**
- Create: `scripts/azure/deploy-staging.ps1`
- Create: `scripts/azure/verify-staging.ps1`

**Step 1: Implement validation-first deployment**

The deploy script must require `-Apply` for state changes, verify the active subscription, detect
the public IPv4 address as a `/32`, validate all Bicep files, and show subscription and group
`what-if` output before applying. Register only `Microsoft.App`, `Microsoft.ContainerRegistry`,
`Microsoft.KeyVault`, `Microsoft.ManagedIdentity`, and `Microsoft.OperationalInsights`.

Generate a 32-byte random gateway key only when the vault secret does not exist. Pipe secret-setting
output to null and clear the variable in `finally`. Build `fetchmux-gateway:<full-git-sha>` with
`az acr build`, then deploy `app.bicep` with that immutable tag.

**Step 2: Implement secret-safe read-back**

The verification script must read resource properties through Azure CLI/ARM, retrieve the gateway
key only into process memory, and assert:

- ACR is Basic, private, and admin-disabled;
- the app uses the exact requested image and managed identity;
- ingress is TLS-only and restricted to the expected CIDR;
- scale is zero-to-one;
- `/health` is 200;
- `/ready` is 503 with no provider keys;
- `/v1/providers` is 401 without auth and 200 with auth.

Its final output may contain resource names, FQDN, status codes, commit, and image, but no secret.

**Step 3: Test dry-run behavior**

Run: `pwsh -File scripts/azure/deploy-staging.ps1`  
Expected: validation and what-if only, with no resource creation.

Run: `npm test && npm run typecheck && npm run lint`  
Expected: PASS.

**Step 4: Commit the scripts**

```powershell
git add scripts/azure/deploy-staging.ps1 scripts/azure/verify-staging.ps1 package.json
git commit -m "ops: automate Azure staging deployment"
```

### Task 5: Document operations and cost controls

**Files:**
- Create: `docs/runbooks/azure-staging.md`
- Modify: `README.md`
- Modify: `docs/release/founding-build-checklist.md`

**Step 1: Write the runbook**

Record the exact resource topology, cost snapshot date, free-trial spending-limit evidence,
deployment/verification commands, secret rotation, log queries, rollback by commit tag, and exact
resource-group teardown boundary. State clearly that staging is single-tenant, IP-restricted, and
not production or public launch evidence.

**Step 2: Link the runbook and update release evidence**

Add the staging runbook to README operations. Do not mark deployment complete until live read-back
passes.

**Step 3: Run documentation and application checks**

Run: `npm test && npm run typecheck && npm run lint && npm run lint:openapi && npm run build`  
Expected: all checks pass.

**Step 4: Commit documentation**

```powershell
git add README.md docs/runbooks/azure-staging.md docs/release/founding-build-checklist.md
git commit -m "docs: add Azure staging operations"
```

### Task 6: Provision and verify live staging

**Files:**
- Modify after verification: `docs/runbooks/azure-staging.md`
- Modify after verification: `docs/release/founding-build-checklist.md`

**Step 1: Run the final local gate**

Run: `npm test && npm run typecheck && npm run lint && npm run lint:openapi && npm run build`  
Expected: PASS with 187 or more tests and zero audit vulnerabilities.

**Step 2: Apply the deployment**

Run: `pwsh -File scripts/azure/deploy-staging.ps1 -Apply`  
Expected: providers register, what-if is reviewed, platform deploys, ACR build succeeds, and the app
revision becomes ready.

**Step 3: Verify from Azure and over HTTPS**

Run: `pwsh -File scripts/azure/verify-staging.ps1`  
Expected: every resource and HTTP assertion passes with no secret in output.

**Step 4: Record exact evidence and commit**

Record resource IDs without tenant PII, image digest/tag, active revision, verification timestamp,
and cost meters. Then commit:

```powershell
git add docs/runbooks/azure-staging.md docs/release/founding-build-checklist.md
git commit -m "docs: record verified Azure staging"
```

**Step 5: Push and open a stacked private draft PR**

Push `feature/azure-staging` to Azure and GitHub. Create a private Azure draft PR targeting
`feature/founding-build`; keep GitHub as the private backup. Do not merge, mark ready, publish the
site, add provider keys, or claim production status.

