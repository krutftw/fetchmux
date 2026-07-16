[CmdletBinding()]
param(
  [string]$SubscriptionId = '',
  [string]$ResourceGroupName = 'rg-fetchmux-stg-aue',
  [string]$AppName = 'ca-fetchmux-gateway-stg',
  [string]$ExpectedImage = '',
  [string]$ExpectedOperatorCidr = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:AzCommand = (Get-Command az -ErrorAction Stop).Source
$script:GitCommand = (Get-Command git -ErrorAction Stop).Source
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

function Invoke-AzText {
  param([Parameter(Mandatory)][string[]]$AzArguments)

  $output = & $script:AzCommand @AzArguments --only-show-errors 2>&1
  $exitCode = $LASTEXITCODE
  $text = (($output | ForEach-Object { $_.ToString() }) -join "`n").Trim()
  if ($exitCode -ne 0) {
    throw "Azure CLI failed with exit code ${exitCode}: az $($AzArguments -join ' ')`n$text"
  }
  return $text
}

function Invoke-AzJson {
  param([Parameter(Mandatory)][string[]]$AzArguments)

  $text = Invoke-AzText -AzArguments ($AzArguments + @('--output', 'json'))
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }
  return $text | ConvertFrom-Json
}

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) {
    throw $Message
  }
}

function Invoke-HttpGet {
  param(
    [Parameter(Mandatory)][string]$Uri,
    [hashtable]$Headers = @{},
    [int]$Attempts = 1
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      return Invoke-WebRequest -Method Get -Uri $Uri -Headers $Headers -SkipHttpErrorCheck -TimeoutSec 45
    } catch {
      if ($attempt -ge $Attempts) {
        throw
      }
      Write-Host "Waiting for the scale-to-zero staging endpoint (attempt $attempt of $Attempts)."
      Start-Sleep -Seconds 5
    }
  }
}

if (-not [string]::IsNullOrWhiteSpace($SubscriptionId)) {
  $null = Invoke-AzText -AzArguments @('account', 'set', '--subscription', $SubscriptionId)
}

$account = Invoke-AzJson -AzArguments @('account', 'show')
$SubscriptionId = [string]$account.id
$resourceGroup = Invoke-AzJson -AzArguments @('group', 'show', '--name', $ResourceGroupName)
Assert-True ($resourceGroup.properties.provisioningState -eq 'Succeeded') 'The staging resource group is not provisioned successfully.'

$registries = @(Invoke-AzJson -AzArguments @('acr', 'list', '--resource-group', $ResourceGroupName))
$vaults = @(Invoke-AzJson -AzArguments @('keyvault', 'list', '--resource-group', $ResourceGroupName))
$identities = @(Invoke-AzJson -AzArguments @('identity', 'list', '--resource-group', $ResourceGroupName))
Assert-True ($registries.Count -eq 1) 'Expected exactly one staging container registry.'
Assert-True ($vaults.Count -eq 1) 'Expected exactly one staging key vault.'
Assert-True ($identities.Count -eq 1) 'Expected exactly one staging user-assigned identity.'

$registry = Invoke-AzJson -AzArguments @('acr', 'show', '--name', [string]$registries[0].name)
$vault = $vaults[0]
$identity = $identities[0]
Assert-True ($registry.sku.name -eq 'Basic') 'The staging registry must use the Basic SKU.'
Assert-True (-not [bool]$registry.adminUserEnabled) 'The staging registry admin account must remain disabled.'
Assert-True (-not [bool]$registry.anonymousPullEnabled) 'Anonymous registry pull must remain disabled.'

$appUrl = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.App/containerApps/${AppName}?api-version=2025-07-01"
$app = Invoke-AzJson -AzArguments @('rest', '--method', 'get', '--url', $appUrl)
$deadline = [DateTimeOffset]::UtcNow.AddMinutes(5)
while (
  [string]::IsNullOrWhiteSpace([string]$app.properties.latestReadyRevisionName) -or
  $app.properties.runningStatus -ne 'Running'
) {
  if ([DateTimeOffset]::UtcNow -ge $deadline) {
    throw 'The Container App did not reach a ready running revision within five minutes.'
  }
  Write-Host 'Waiting for the Container App revision to become ready.'
  Start-Sleep -Seconds 5
  $app = Invoke-AzJson -AzArguments @('rest', '--method', 'get', '--url', $appUrl)
}

$identityIds = @($app.identity.userAssignedIdentities.PSObject.Properties.Name)
Assert-True ($identityIds -contains [string]$identity.id) 'The expected user-assigned identity is not attached to the app.'
Assert-True ($app.properties.configuration.registries.Count -eq 1) 'Expected one private registry configuration.'
Assert-True ($app.properties.configuration.registries[0].identity -eq $identity.id) 'Registry pull is not using the managed identity.'

$secrets = @($app.properties.configuration.secrets)
Assert-True ($secrets.Count -eq 1) 'Expected exactly one app-level secret reference.'
Assert-True ($secrets[0].name -eq 'fetchmux-api-key') 'The app secret reference has an unexpected name.'
Assert-True ($secrets[0].identity -eq $identity.id) 'The Key Vault reference is not using the managed identity.'
Assert-True ($secrets[0].keyVaultUrl -match '/secrets/fetchmux-api-key$') 'The gateway key is not an unversioned Key Vault reference.'
Assert-True ($null -eq $secrets[0].value) 'The gateway key must not be stored directly in the Container App definition.'

$ingress = $app.properties.configuration.ingress
Assert-True ([bool]$ingress.external) 'Staging ingress must be enabled for the operator smoke test.'
Assert-True (-not [bool]$ingress.allowInsecure) 'Plain HTTP must remain disabled.'
Assert-True ([int]$ingress.targetPort -eq 8787) 'Ingress must target the FetchMux gateway port.'
$ipSecurityRestrictions = @($ingress.ipSecurityRestrictions)
Assert-True ($ipSecurityRestrictions.Count -eq 1) 'Expected exactly one staging IP allow rule.'
Assert-True ($ipSecurityRestrictions[0].action -eq 'Allow') 'The staging ingress rule must be an allow rule.'
if (-not [string]::IsNullOrWhiteSpace($ExpectedOperatorCidr)) {
  Assert-True ($ipSecurityRestrictions[0].ipAddressRange -eq $ExpectedOperatorCidr) 'The operator CIDR does not match the deployed ingress rule.'
}

$scale = $app.properties.template.scale
$minReplicas = [int]$scale.minReplicas
$maxReplicas = [int]$scale.maxReplicas
Assert-True ($minReplicas -eq 0) 'Staging must scale to zero.'
Assert-True ($maxReplicas -eq 1) 'Staging must have a one-replica ceiling.'

$container = $app.properties.template.containers[0]
if ([string]::IsNullOrWhiteSpace($ExpectedImage)) {
  $gitSha = (& $script:GitCommand -C $repoRoot rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw 'The expected image could not be derived from Git.'
  }
  $ExpectedImage = "$($registry.loginServer)/fetchmux-gateway:$gitSha"
}
Assert-True ($container.image -eq $ExpectedImage) 'The running image does not match the expected exact Git commit tag.'

$registryRoles = @(Invoke-AzJson -AzArguments @(
  'role',
  'assignment',
  'list',
  '--scope',
  [string]$registry.id,
  '--assignee-object-id',
  [string]$identity.principalId
))
$vaultRoles = @(Invoke-AzJson -AzArguments @(
  'role',
  'assignment',
  'list',
  '--scope',
  [string]$vault.id,
  '--assignee-object-id',
  [string]$identity.principalId
))
Assert-True ($registryRoles.roleDefinitionName -contains 'AcrPull') 'The staging identity lacks AcrPull on the registry.'
Assert-True ($vaultRoles.roleDefinitionName -contains 'Key Vault Secrets User') 'The staging identity lacks Key Vault Secrets User on the vault.'

$vaultToken = $null
$gatewayKey = $null
$secretResponse = $null
try {
  $vaultToken = Invoke-AzText -AzArguments @(
    'account',
    'get-access-token',
    '--resource',
    'https://vault.azure.net',
    '--query',
    'accessToken',
    '--output',
    'tsv'
  )
  $headers = @{ Authorization = "Bearer $vaultToken" }
  $secretUri = "$([string]$vault.properties.vaultUri.TrimEnd('/'))/secrets/fetchmux-api-key?api-version=7.4"
  $secretResponse = Invoke-RestMethod -Method Get -Uri $secretUri -Headers $headers
  $gatewayKey = [string]$secretResponse.value
  Assert-True (-not [string]::IsNullOrWhiteSpace($gatewayKey)) 'The staging gateway secret is empty.'

  $baseUri = "https://$($ingress.fqdn)"
  $healthResponse = Invoke-HttpGet -Uri "$baseUri/health" -Attempts 12
  $readyResponse = Invoke-HttpGet -Uri "$baseUri/ready"
  $unauthorizedResponse = Invoke-HttpGet -Uri "$baseUri/v1/providers"
  $authorizedResponse = Invoke-HttpGet -Uri "$baseUri/v1/providers" -Headers @{
    Authorization = "Bearer $gatewayKey"
  }

  $healthStatus = [int]$healthResponse.StatusCode
  $readyStatus = [int]$readyResponse.StatusCode
  $unauthorizedStatus = [int]$unauthorizedResponse.StatusCode
  $authorizedStatus = [int]$authorizedResponse.StatusCode
  Assert-True ($healthStatus -eq 200) "Expected /health 200, received $healthStatus."
  Assert-True ($readyStatus -eq 503) "Expected /ready 503 before provider configuration, received $readyStatus."
  Assert-True ($unauthorizedStatus -eq 401) "Expected unauthenticated /v1/providers 401, received $unauthorizedStatus."
  Assert-True ($authorizedStatus -eq 200) "Expected authenticated /v1/providers 200, received $authorizedStatus."

  $providerBody = $authorizedResponse.Content | ConvertFrom-Json
  $availableProviders = @($providerBody.data.providers | Where-Object available)
  Assert-True ($availableProviders.Count -eq 0) 'No provider may be enabled before an operator-owned provider key is approved.'

  [pscustomobject]@{
    verifiedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
    subscriptionId = $SubscriptionId
    resourceGroupName = $ResourceGroupName
    registryName = [string]$registry.name
    registrySku = [string]$registry.sku.name
    registryAdminEnabled = [bool]$registry.adminUserEnabled
    vaultName = [string]$vault.name
    identityName = [string]$identity.name
    appName = [string]$app.name
    fqdn = [string]$ingress.fqdn
    revision = [string]$app.properties.latestReadyRevisionName
    image = [string]$container.image
    operatorCidr = [string]$ipSecurityRestrictions[0].ipAddressRange
    minReplicas = $minReplicas
    maxReplicas = $maxReplicas
    healthStatus = $healthStatus
    readyStatus = $readyStatus
    unauthorizedStatus = $unauthorizedStatus
    authorizedStatus = $authorizedStatus
    availableProviders = $availableProviders.Count
  } | ConvertTo-Json -Depth 4
} finally {
  Remove-Variable gatewayKey -ErrorAction SilentlyContinue
  Remove-Variable secretResponse -ErrorAction SilentlyContinue
  Remove-Variable vaultToken -ErrorAction SilentlyContinue
  Remove-Variable headers -ErrorAction SilentlyContinue
}
