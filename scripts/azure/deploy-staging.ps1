[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$ValidateOnly,
  [string]$SubscriptionId = '',
  [string]$Location = 'australiaeast',
  [string]$ResourceGroupName = 'rg-fetchmux-stg-aue',
  [string]$OperatorCidr = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$mainTemplate = Join-Path $repoRoot 'infra\azure\main.bicep'
$platformTemplate = Join-Path $repoRoot 'infra\azure\platform.bicep'
$appTemplate = Join-Path $repoRoot 'infra\azure\app.bicep'
$verifyScript = Join-Path $PSScriptRoot 'verify-staging.ps1'
$script:AzCommand = (Get-Command az -ErrorAction Stop).Source
$script:GitCommand = (Get-Command git -ErrorAction Stop).Source

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

function Invoke-AzPassThru {
  param([Parameter(Mandatory)][string[]]$AzArguments)

  & $script:AzCommand @AzArguments --only-show-errors
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI failed with exit code ${LASTEXITCODE}: az $($AzArguments -join ' ')"
  }
}

function Test-BicepTemplates {
  foreach ($template in @($mainTemplate, $platformTemplate, $appTemplate)) {
    & $script:AzCommand bicep build --file $template --stdout --only-show-errors 1>$null
    if ($LASTEXITCODE -ne 0) {
      throw "Bicep validation failed for $template"
    }
  }
}

function Resolve-OperatorCidr {
  param([string]$Requested)

  $candidate = $Requested.Trim()
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    $ipResponse = Invoke-RestMethod -Uri 'https://api.ipify.org?format=json' -TimeoutSec 20
    $candidate = "$($ipResponse.ip)/32"
  }

  $parts = $candidate.Split('/')
  if ($parts.Count -ne 2 -or $parts[1] -ne '32') {
    throw 'OperatorCidr must be one IPv4 address with a /32 prefix.'
  }

  $parsedAddress = $null
  if (
    -not [System.Net.IPAddress]::TryParse($parts[0], [ref]$parsedAddress) -or
    $parsedAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork
  ) {
    throw 'OperatorCidr must contain a valid IPv4 address.'
  }

  return "$($parsedAddress.IPAddressToString)/32"
}

function Get-ProviderStates {
  param([string[]]$Providers)

  return @(
    foreach ($provider in $Providers) {
      $state = Invoke-AzText -AzArguments @(
        'provider',
        'show',
        '--namespace',
        $provider,
        '--query',
        'registrationState',
        '--output',
        'tsv'
      )
      [pscustomobject]@{ namespace = $provider; state = $state }
    }
  )
}

function Register-RequiredProviders {
  param([string[]]$Providers)

  foreach ($provider in $Providers) {
    Invoke-AzPassThru -AzArguments @(
      'provider',
      'register',
      '--namespace',
      $provider,
      '--output',
      'none'
    )
  }

  $deadline = [DateTimeOffset]::UtcNow.AddMinutes(15)
  while ($true) {
    $states = Get-ProviderStates -Providers $Providers
    $pending = @($states | Where-Object state -ne 'Registered')
    if ($pending.Count -eq 0) {
      return
    }
    if ([DateTimeOffset]::UtcNow -ge $deadline) {
      throw "Timed out registering Azure providers: $($pending.namespace -join ', ')"
    }
    Write-Host "Waiting for Azure provider registration: $($pending.namespace -join ', ')"
    Start-Sleep -Seconds 5
  }
}

function New-GatewayKey {
  $bytes = [byte[]]::new(32)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Ensure-GatewaySecret {
  param([Parameter(Mandatory)][string]$VaultUri)

  $vaultToken = $null
  $gatewayKey = $null
  $existingSecret = $null
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
    $secretEndpoint = "$($VaultUri.TrimEnd('/'))/secrets/fetchmux-api-key"
    $secretUri = "${secretEndpoint}?api-version=7.4"
    $permissionReady = $false
    $secretExists = $false

    for ($attempt = 1; $attempt -le 24; $attempt++) {
      try {
        $existingSecret = Invoke-RestMethod -Method Get -Uri $secretUri -Headers $headers
        $secretExists = $true
        $permissionReady = $true
        break
      } catch {
        $statusCode = [int]$_.Exception.Response.StatusCode
        if ($statusCode -eq 404) {
          $permissionReady = $true
          break
        }
        if ($statusCode -eq 403 -and $attempt -lt 24) {
          Write-Host "Waiting for Key Vault role propagation (attempt $attempt of 24)."
          Start-Sleep -Seconds 5
          continue
        }
        throw
      }
    }

    if (-not $permissionReady) {
      throw 'Key Vault data-plane permission did not become available.'
    }
    if ($secretExists) {
      Write-Host 'The FetchMux staging gateway secret already exists; keeping the current value.'
      return
    }

    $gatewayKey = New-GatewayKey
    $body = @{
      value = $gatewayKey
      contentType = 'FetchMux staging gateway bearer key'
      attributes = @{ enabled = $true }
    } | ConvertTo-Json -Depth 4
    Invoke-RestMethod -Method Put -Uri $secretUri -Headers $headers -ContentType 'application/json' -Body $body | Out-Null
    Write-Host 'Created the FetchMux staging gateway secret in Key Vault.'
  } finally {
    Remove-Variable gatewayKey -ErrorAction SilentlyContinue
    Remove-Variable existingSecret -ErrorAction SilentlyContinue
    Remove-Variable vaultToken -ErrorAction SilentlyContinue
    Remove-Variable headers -ErrorAction SilentlyContinue
    Remove-Variable body -ErrorAction SilentlyContinue
  }
}

Test-BicepTemplates

if ($ValidateOnly) {
  [pscustomobject]@{
    validated = $true
    templates = @($mainTemplate, $platformTemplate, $appTemplate)
    applied = $false
  } | ConvertTo-Json -Depth 3
  return
}

if (-not [string]::IsNullOrWhiteSpace($SubscriptionId)) {
  Invoke-AzPassThru -AzArguments @('account', 'set', '--subscription', $SubscriptionId)
}

$account = Invoke-AzJson -AzArguments @('account', 'show')
if ($account.state -ne 'Enabled') {
  throw "Azure subscription $($account.id) is not enabled."
}
$SubscriptionId = [string]$account.id
$deployerObjectId = Invoke-AzText -AzArguments @(
  'ad',
  'signed-in-user',
  'show',
  '--query',
  'id',
  '--output',
  'tsv'
)
$resolvedOperatorCidr = Resolve-OperatorCidr -Requested $OperatorCidr

$gitSha = (& $script:GitCommand -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $gitSha -notmatch '^[0-9a-f]{40}$') {
  throw 'The current Git commit could not be resolved to a full SHA.'
}
if ($Apply) {
  $dirty = ((& $script:GitCommand -C $repoRoot status --porcelain) -join "`n").Trim()
  if ($LASTEXITCODE -ne 0) {
    throw 'Git worktree status could not be read.'
  }
  if (-not [string]::IsNullOrWhiteSpace($dirty)) {
    throw 'Refusing to deploy a dirty worktree. Commit and verify the intended source first.'
  }
}

$requiredProviders = @(
  'Microsoft.App',
  'Microsoft.ContainerRegistry',
  'Microsoft.KeyVault',
  'Microsoft.ManagedIdentity',
  'Microsoft.OperationalInsights'
)
$providerStates = Get-ProviderStates -Providers $requiredProviders
$pendingProviders = @($providerStates | Where-Object state -ne 'Registered')

if ($pendingProviders.Count -gt 0 -and -not $Apply) {
  [pscustomobject]@{
    validated = $true
    applied = $false
    subscriptionId = $SubscriptionId
    operatorCidr = $resolvedOperatorCidr
    pendingProviders = @($pendingProviders.namespace)
    nextAction = 'Run with -Apply to register the approved providers, review what-if, and deploy.'
  } | ConvertTo-Json -Depth 4
  return
}

if ($pendingProviders.Count -gt 0) {
  Register-RequiredProviders -Providers $requiredProviders
}

$platformParameters = @(
  "location=$Location",
  "resourceGroupName=$ResourceGroupName",
  "deployerObjectId=$deployerObjectId"
)
Write-Host 'Running: az deployment sub what-if'
Invoke-AzPassThru -AzArguments @(
  'deployment',
  'sub',
  'what-if',
  '--name',
  'fetchmux-staging-platform-preview',
  '--location',
  $Location,
  '--template-file',
  $mainTemplate,
  '--parameters'
) + $platformParameters

if (-not $Apply) {
  [pscustomobject]@{
    validated = $true
    whatIfCompleted = $true
    applied = $false
    subscriptionId = $SubscriptionId
    resourceGroupName = $ResourceGroupName
    operatorCidr = $resolvedOperatorCidr
    gitSha = $gitSha
  } | ConvertTo-Json -Depth 3
  return
}

Write-Host 'Deploying the durable Azure staging platform.'
$platformDeployment = Invoke-AzJson -AzArguments (@(
  'deployment',
  'sub',
  'create',
  '--name',
  'fetchmux-staging-platform',
  '--location',
  $Location,
  '--template-file',
  $mainTemplate,
  '--parameters'
) + $platformParameters)

$outputs = $platformDeployment.properties.outputs
$registryName = [string]$outputs.registryName.value
$registryLoginServer = [string]$outputs.registryLoginServer.value
$vaultName = [string]$outputs.vaultName.value
$vaultUri = [string]$outputs.vaultUri.value

Ensure-GatewaySecret -VaultUri $vaultUri

$armAuthentication = Invoke-AzJson -AzArguments @(
  'acr',
  'config',
  'authentication-as-arm',
  'show',
  '--registry',
  $registryName
)
if ($armAuthentication.status -ne 'enabled') {
  Invoke-AzPassThru -AzArguments @(
    'acr',
    'config',
    'authentication-as-arm',
    'update',
    '--registry',
    $registryName,
    '--status',
    'enabled',
    '--output',
    'none'
  )
}

$imageTag = "fetchmux-gateway:$gitSha"
$imageReference = "$registryLoginServer/$imageTag"
Write-Host "Building exact commit $gitSha in Azure Container Registry."
Invoke-AzPassThru -AzArguments @(
  'acr',
  'build',
  '--registry',
  $registryName,
  '--image',
  $imageTag,
  '--file',
  (Join-Path $repoRoot 'Dockerfile'),
  '--platform',
  'linux/amd64',
  $repoRoot
)

$appParameters = @(
  "image=$imageReference",
  "operatorCidr=$resolvedOperatorCidr",
  "registryName=$registryName",
  "vaultName=$vaultName"
)
Write-Host 'Running: az deployment group what-if'
Invoke-AzPassThru -AzArguments (@(
  'deployment',
  'group',
  'what-if',
  '--name',
  'fetchmux-staging-app-preview',
  '--resource-group',
  $ResourceGroupName,
  '--template-file',
  $appTemplate,
  '--parameters'
) + $appParameters)

Write-Host 'Deploying the IP-restricted staging gateway.'
$appDeployment = Invoke-AzJson -AzArguments (@(
  'deployment',
  'group',
  'create',
  '--name',
  'fetchmux-staging-app',
  '--resource-group',
  $ResourceGroupName,
  '--template-file',
  $appTemplate,
  '--parameters'
) + $appParameters)

& (Get-Command pwsh -ErrorAction Stop).Source -NoProfile -File $verifyScript `
  -SubscriptionId $SubscriptionId `
  -ResourceGroupName $ResourceGroupName `
  -ExpectedImage $imageReference `
  -ExpectedOperatorCidr $resolvedOperatorCidr
if ($LASTEXITCODE -ne 0) {
  throw 'Live staging verification failed.'
}

[pscustomobject]@{
  applied = $true
  subscriptionId = $SubscriptionId
  resourceGroupName = $ResourceGroupName
  registryName = $registryName
  vaultName = $vaultName
  appName = [string]$appDeployment.properties.outputs.appName.value
  fqdn = [string]$appDeployment.properties.outputs.fqdn.value
  revision = [string]$appDeployment.properties.outputs.latestRevisionName.value
  image = $imageReference
  gitSha = $gitSha
  operatorCidr = $resolvedOperatorCidr
} | ConvertTo-Json -Depth 4
