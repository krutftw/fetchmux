[CmdletBinding()]
param(
  [switch]$Apply,
  [switch]$ValidateOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($Apply -and $ValidateOnly) {
  throw 'Choose either -Apply or -ValidateOnly, not both.'
}

$ProjectName = 'fetchmux'
$CanonicalDomain = 'fetchmux.com'
$ProductionBranch = 'main'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$distDirectory = Join-Path $repoRoot 'apps\site\dist'
$script:GitCommand = (Get-Command git -ErrorAction Stop).Source
$script:NpmCommand = (Get-Command npm -ErrorAction Stop).Source
$script:NpxCommand = (Get-Command npx -ErrorAction Stop).Source

function Invoke-WranglerText {
  param([Parameter(Mandatory)][string[]]$WranglerArguments)

  $output = & $script:NpxCommand wrangler @WranglerArguments 2>&1
  $exitCode = $LASTEXITCODE
  $text = (($output | ForEach-Object { $_.ToString() }) -join "`n").Trim()
  if ($exitCode -ne 0) {
    throw "Wrangler failed with exit code ${exitCode}: wrangler $($WranglerArguments -join ' ')`n$text"
  }
  return $text
}

function Invoke-WranglerJson {
  param([Parameter(Mandatory)][string[]]$WranglerArguments)

  $text = Invoke-WranglerText -WranglerArguments $WranglerArguments
  if ([string]::IsNullOrWhiteSpace($text)) {
    return @()
  }
  try {
    return $text | ConvertFrom-Json
  } catch {
    throw "Wrangler did not return valid JSON for: wrangler $($WranglerArguments -join ' ')"
  }
}

function Test-LocalSurface {
  $expectedFiles = @(
    '_headers',
    'favicon.svg',
    'index.html',
    'llms-full.txt',
    'llms.txt',
    'openapi.json',
    'openapi.yaml',
    'robots.txt',
    'sitemap.xml'
  )

  foreach ($name in $expectedFiles) {
    $path = Join-Path $distDirectory $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
      throw "The production build is missing $name."
    }
  }

  $combinedText = @(
    Get-Content -Raw (Join-Path $distDirectory 'index.html')
    Get-Content -Raw (Join-Path $distDirectory 'llms.txt')
    Get-Content -Raw (Join-Path $distDirectory 'llms-full.txt')
    Get-Content -Raw (Join-Path $distDirectory 'openapi.yaml')
  ) -join "`n"
  if ($combinedText -match '\.azure(?:containerapps|websites)\.io') {
    throw 'The public build contains a private Azure hostname.'
  }
  if ($combinedText -notmatch 'https://fetchmux\.com/') {
    throw 'The public build does not contain the canonical domain.'
  }

  $openapiJson = Get-Content -Raw (Join-Path $distDirectory 'openapi.json') | ConvertFrom-Json
  if ($openapiJson.openapi -ne '3.1.2' -or $openapiJson.info.title -ne 'FetchMux Retrieval API') {
    throw 'The generated OpenAPI JSON is not the expected FetchMux contract.'
  }

  return $expectedFiles
}

function Test-SiteSurface {
  param(
    [Parameter(Mandatory)][string]$Origin,
    [int]$MaxAttempts = 40,
    [int]$DelaySeconds = 3
  )

  $checks = [ordered]@{
    '/' = 'text/html'
    '/robots.txt' = 'text/plain'
    '/llms.txt' = 'text/plain'
    '/llms-full.txt' = 'text/plain'
    '/openapi.yaml' = 'application/yaml'
    '/openapi.json' = 'application/json'
    '/sitemap.xml' = 'application/xml'
  }

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      $results = @()
      foreach ($entry in $checks.GetEnumerator()) {
        $uri = "$($Origin.TrimEnd('/'))$($entry.Key)"
        $response = Invoke-WebRequest -Uri $uri -TimeoutSec 20
        $contentType = [string]$response.Headers['Content-Type']
        if ($response.StatusCode -ne 200) {
          throw "$uri returned HTTP $($response.StatusCode)."
        }
        if (-not $contentType.StartsWith([string]$entry.Value, [StringComparison]::OrdinalIgnoreCase)) {
          throw "$uri returned unexpected Content-Type $contentType."
        }
        $content = [string]$response.Content
        if ($content -match '\.azure(?:containerapps|websites)\.io') {
          throw "$uri exposed a private Azure hostname."
        }
        if ($entry.Key -eq '/') {
          if ($content -notmatch 'https://fetchmux\.com/') {
            throw "$uri does not declare the canonical domain."
          }
          foreach ($headerName in @(
            'Content-Security-Policy',
            'Permissions-Policy',
            'Referrer-Policy',
            'Strict-Transport-Security',
            'X-Content-Type-Options',
            'X-Frame-Options'
          )) {
            if ([string]::IsNullOrWhiteSpace([string]$response.Headers[$headerName])) {
              throw "$uri is missing security header $headerName."
            }
          }
        }
        if ($entry.Key -eq '/robots.txt') {
          if ($content -match '(?im)^Disallow:\s*/\s*$' -or $content -notmatch 'OAI-SearchBot') {
            throw "$uri does not expose the intended crawler policy."
          }
        }
        if ($entry.Key -eq '/llms.txt' -and $content -notmatch 'private BYOK preview') {
          throw "$uri does not state the current private-preview boundary."
        }
        if ($entry.Key -eq '/openapi.json') {
          $contract = $content | ConvertFrom-Json
          if ($contract.info.title -ne 'FetchMux Retrieval API') {
            throw "$uri is not the expected FetchMux OpenAPI contract."
          }
        }
        if ($entry.Key -eq '/sitemap.xml' -and $content -notmatch 'https://fetchmux\.com/') {
          throw "$uri does not contain canonical URLs."
        }
        $results += [pscustomobject]@{
          path = [string]$entry.Key
          status = [int]$response.StatusCode
          contentType = $contentType
          bytes = [Text.Encoding]::UTF8.GetByteCount([string]$response.Content)
        }
      }
      return $results
    } catch {
      if ($attempt -eq $MaxAttempts) {
        throw
      }
      $failure = $_.Exception.Message
      Write-Host "Waiting for the Pages surface at $Origin (attempt $attempt of $MaxAttempts): $failure"
      Start-Sleep -Seconds $DelaySeconds
    }
  }
}

function Get-WranglerCredential {
  $configPath = Join-Path $HOME '.wrangler\config\default.toml'
  if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
    throw 'Wrangler OAuth configuration was not found. Run npx wrangler login first.'
  }

  $config = Get-Content -Raw -LiteralPath $configPath
  $match = [regex]::Match(
    $config,
    '(?m)^\s*oauth_token\s*=\s*(?:"([^"]+)"|''([^'']+)'')\s*$'
  )
  if (-not $match.Success) {
    throw 'Wrangler OAuth configuration does not contain a usable credential.'
  }
  if (-not [string]::IsNullOrWhiteSpace($match.Groups[1].Value)) {
    return $match.Groups[1].Value
  }
  return $match.Groups[2].Value
}

function Invoke-CloudflareApi {
  param(
    [Parameter(Mandatory)][string]$Credential,
    [Parameter(Mandatory)][ValidateSet('Get', 'Patch', 'Post')][string]$Method,
    [Parameter(Mandatory)][string]$Uri,
    [string]$Body = ''
  )

  $headers = @{ Authorization = "Bearer $Credential" }
  try {
    $request = @{
      Method = $Method
      Uri = $Uri
      Headers = $headers
      TimeoutSec = 30
    }
    if (-not [string]::IsNullOrWhiteSpace($Body)) {
      $request.ContentType = 'application/json'
      $request.Body = $Body
    }
    $response = Invoke-RestMethod @request
    if (-not $response.success) {
      $messages = @($response.errors | ForEach-Object { $_.message }) -join '; '
      throw "Cloudflare API rejected the request: $messages"
    }
    return $response
  } finally {
    Remove-Variable headers, request -ErrorAction SilentlyContinue
  }
}

function Add-CustomDomain {
  param(
    [Parameter(Mandatory)][string]$Credential,
    [Parameter(Mandatory)][string]$Domain
  )

  $apiRoot = 'https://api.cloudflare.com/client/v4'
  $encodedDomain = [Uri]::EscapeDataString($Domain)
  $zoneResponse = Invoke-CloudflareApi `
    -Credential $Credential `
    -Method Get `
    -Uri "$apiRoot/zones?name=$encodedDomain"
  $zones = @($zoneResponse.result)
  if ($zones.Count -ne 1 -or $zones[0].name -ne $Domain) {
    throw "Cloudflare did not return exactly one zone for $Domain."
  }

  $accountId = [string]$zones[0].account.id
  $domainsEndpoint = "$apiRoot/accounts/$accountId/pages/projects/$ProjectName/domains"
  $domainResponse = Invoke-CloudflareApi `
    -Credential $Credential `
    -Method Get `
    -Uri $domainsEndpoint
  $existing = @($domainResponse.result | Where-Object name -eq $Domain)
  if ($existing.Count -eq 0) {
    $body = @{ name = $Domain } | ConvertTo-Json -Compress
    $createdResponse = Invoke-CloudflareApi `
      -Credential $Credential `
      -Method Post `
      -Uri $domainsEndpoint `
      -Body $body
    $currentDomain = $createdResponse.result
  } else {
    $currentDomain = $existing[0]
  }

  return [pscustomobject]@{
    accountId = $accountId
    zoneId = [string]$zones[0].id
    domainEndpoint = "$domainsEndpoint/$encodedDomain"
    status = [string]$currentDomain.status
  }
}

function Ensure-ApexDnsRecord {
  param(
    [Parameter(Mandatory)][string]$Credential,
    [Parameter(Mandatory)][string]$ZoneId,
    [Parameter(Mandatory)][string]$Domain
  )

  $apiRoot = 'https://api.cloudflare.com/client/v4'
  $encodedDomain = [Uri]::EscapeDataString($Domain)
  $recordsEndpoint = "$apiRoot/zones/$ZoneId/dns_records"
  try {
    $recordsResponse = Invoke-CloudflareApi `
      -Credential $Credential `
      -Method Get `
      -Uri "$recordsEndpoint`?name=$encodedDomain"
  } catch {
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 403) {
      throw 'First-time domain setup needs a DNS Edit credential in FETCHMUX_CLOUDFLARE_DNS_TOKEN.'
    }
    throw
  }

  $records = @($recordsResponse.result)
  if ($records.Count -gt 1) {
    throw "$Domain has multiple DNS records; refusing an ambiguous Pages update."
  }
  if ($records.Count -eq 1) {
    $record = $records[0]
    if ($record.type -ne 'CNAME' -or $record.content -ne "$ProjectName.pages.dev") {
      throw "$Domain already has a conflicting DNS record; no record was changed."
    }
    return $record
  }

  $body = @{
    type = 'CNAME'
    name = $Domain
    content = "$ProjectName.pages.dev"
    proxied = $true
    ttl = 1
    comment = 'FetchMux Pages apex'
  } | ConvertTo-Json
  $createdResponse = Invoke-CloudflareApi `
    -Credential $Credential `
    -Method Post `
    -Uri $recordsEndpoint `
    -Body $body
  return $createdResponse.result
}

function Wait-CustomDomain {
  param(
    [Parameter(Mandatory)][string]$Credential,
    [Parameter(Mandatory)][string]$DomainEndpoint,
    [int]$MaxAttempts = 60
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    $response = Invoke-CloudflareApi -Credential $Credential -Method Get -Uri $DomainEndpoint
    $status = [string]$response.result.status
    if ($status -eq 'active') {
      return $response.result
    }
    if ($status -in @('blocked', 'error')) {
      throw "The custom domain entered terminal state $status."
    }
    if ($attempt -eq $MaxAttempts) {
      throw "Timed out waiting for $CanonicalDomain to become active; last state was $status."
    }
    Write-Host "Waiting for $CanonicalDomain TLS and DNS activation (state $status)."
    Start-Sleep -Seconds 5
  }
}

if (Test-Path Env:VITE_PILOT_CONTACT_URL) {
  throw 'Remove VITE_PILOT_CONTACT_URL before deployment so the build is commit-deterministic.'
}

& $script:NpmCommand run build -w '@fetchmux/site'
if ($LASTEXITCODE -ne 0) {
  throw 'The FetchMux production site build failed.'
}
$localFiles = Test-LocalSurface

Invoke-WranglerText -WranglerArguments @('whoami') | Out-Null
$projects = @(Invoke-WranglerJson -WranglerArguments @('pages', 'project', 'list', '--json'))
$projectExists = @($projects | Where-Object { $_.'Project Name' -eq $ProjectName }).Count -eq 1

$gitSha = (& $script:GitCommand -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $gitSha -notmatch '^[0-9a-f]{40}$') {
  throw 'The current Git commit could not be resolved to a full SHA.'
}
$dirty = ((& $script:GitCommand -C $repoRoot status --porcelain) -join "`n").Trim()
if ($LASTEXITCODE -ne 0) {
  throw 'Git worktree status could not be read.'
}

if ($ValidateOnly) {
  [pscustomobject]@{
    validated = $true
    applied = $false
    projectName = $ProjectName
    canonicalDomain = $CanonicalDomain
    projectExists = $projectExists
    gitSha = $gitSha
    worktreeClean = [string]::IsNullOrWhiteSpace($dirty)
    localFiles = $localFiles
  } | ConvertTo-Json -Depth 4
  return
}

if (-not $Apply) {
  [pscustomobject]@{
    validated = $true
    applied = $false
    projectName = $ProjectName
    canonicalDomain = $CanonicalDomain
    projectExists = $projectExists
    gitSha = $gitSha
    worktreeClean = [string]::IsNullOrWhiteSpace($dirty)
    nextAction = 'Commit the intended source and run again with -Apply.'
  } | ConvertTo-Json -Depth 3
  return
}

if (-not [string]::IsNullOrWhiteSpace($dirty)) {
  throw 'Refusing to deploy a dirty worktree. Commit and verify the intended source first.'
}

if (-not $projectExists) {
  Invoke-WranglerText -WranglerArguments @(
    'pages', 'project', 'create', $ProjectName,
    '--production-branch', $ProductionBranch
  ) | Out-Null
}

Invoke-WranglerText -WranglerArguments @(
  'pages', 'deploy', $distDirectory,
  '--project-name', $ProjectName,
  '--branch', $ProductionBranch,
  '--commit-hash', $gitSha,
  '--commit-message', "FetchMux site $gitSha",
  '--commit-dirty=false'
) | Out-Null

$deployments = @(
  Invoke-WranglerJson -WranglerArguments @(
    'pages', 'deployment', 'list',
    '--project-name', $ProjectName,
    '--environment', 'production',
    '--json'
  )
)
if ($deployments.Count -eq 0) {
  throw 'Cloudflare did not return the new production deployment.'
}
$deployment = $deployments[0]
$deploymentOrigin = ([string]$deployment.Deployment).TrimEnd('/')
$deploymentChecks = @(Test-SiteSurface -Origin $deploymentOrigin)

$script:WranglerCredential = $null
$dnsCredential = $null
$dnsRecord = $null
try {
  $script:WranglerCredential = Get-WranglerCredential
  $domainRegistration = Add-CustomDomain -Credential $script:WranglerCredential -Domain $CanonicalDomain
  if ($domainRegistration.status -ne 'active') {
    $dnsCredential = $script:WranglerCredential
    if (Test-Path Env:FETCHMUX_CLOUDFLARE_DNS_TOKEN) {
      $environmentCredential = (Get-Item Env:FETCHMUX_CLOUDFLARE_DNS_TOKEN).Value.Trim()
      if (-not [string]::IsNullOrWhiteSpace($environmentCredential)) {
        $dnsCredential = $environmentCredential
      }
    }
    $dnsRecord = Ensure-ApexDnsRecord `
      -Credential $dnsCredential `
      -ZoneId $domainRegistration.zoneId `
      -Domain $CanonicalDomain
    Invoke-CloudflareApi `
      -Credential $script:WranglerCredential `
      -Method Patch `
      -Uri $domainRegistration.domainEndpoint | Out-Null
  }
  $deploymentResponse = Invoke-CloudflareApi `
    -Credential $script:WranglerCredential `
    -Method Get `
    -Uri "https://api.cloudflare.com/client/v4/accounts/$($domainRegistration.accountId)/pages/projects/$ProjectName/deployments/$($deployment.Id)"
  $deploymentMetadata = $deploymentResponse.result.deployment_trigger.metadata
  if (
    [string]$deploymentMetadata.commit_hash -ne $gitSha -or
    [bool]$deploymentMetadata.commit_dirty
  ) {
    throw 'Cloudflare deployment metadata does not match the exact clean Git commit.'
  }
  $domainState = Wait-CustomDomain `
    -Credential $script:WranglerCredential `
    -DomainEndpoint $domainRegistration.domainEndpoint
  $domainChecks = @(
    Test-SiteSurface -Origin "https://$CanonicalDomain" -MaxAttempts 24 -DelaySeconds 5
  )
} finally {
  Remove-Variable WranglerCredential -Scope Script -ErrorAction SilentlyContinue
  Remove-Variable dnsCredential, environmentCredential -ErrorAction SilentlyContinue
}

[pscustomobject]@{
  applied = $true
  projectName = $ProjectName
  canonicalDomain = $CanonicalDomain
  gitSha = $gitSha
  deploymentId = [string]$deployment.Id
  deploymentUrl = $deploymentOrigin
  deploymentCommit = [string]$deploymentMetadata.commit_hash
  deploymentCommitDirty = [bool]$deploymentMetadata.commit_dirty
  domainStatus = [string]$domainState.status
  deploymentChecks = $deploymentChecks
  domainChecks = $domainChecks
} | ConvertTo-Json -Depth 6
