targetScope = 'resourceGroup'

@description('Azure region for the staging Container App.')
param location string = resourceGroup().location

@description('Exact private registry image reference, including the full Git commit tag.')
param image string

@description('Single IPv4 CIDR that may reach staging ingress.')
param operatorCidr string

@description('Existing Azure Container Registry name.')
param registryName string

@description('Existing Azure Key Vault name.')
param vaultName string

@description('Existing user-assigned identity name.')
param identityName string = 'id-fetchmux-stg-aue'

@description('Existing Container Apps environment name.')
param environmentName string = 'cae-fetchmux-stg-aue'

@description('Staging Container App name.')
param appName string = 'ca-fetchmux-gateway-stg'

@description('Tags applied to the staging Container App.')
param tags object = {
  application: 'fetchmux'
  environment: 'staging'
  managedBy: 'bicep'
}

resource registry 'Microsoft.ContainerRegistry/registries@2025-04-01' existing = {
  name: registryName
}

resource vault 'Microsoft.KeyVault/vaults@2025-05-01' existing = {
  name: vaultName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' existing = {
  name: identityName
}

resource environment 'Microsoft.App/managedEnvironments@2025-07-01' existing = {
  name: environmentName
}

resource gateway 'Microsoft.App/containerApps@2025-07-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      maxInactiveRevisions: 1
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 8787
        transport: 'auto'
        ipSecurityRestrictions: [
          {
            name: 'operator'
            description: 'Current staging operator IPv4 address only'
            action: 'Allow'
            ipAddressRange: operatorCidr
          }
        ]
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: identity.id
        }
      ]
      secrets: [
        {
          name: 'fetchmux-api-key'
          keyVaultUrl: '${vault.properties.vaultUri}secrets/fetchmux-api-key'
          identity: identity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'gateway'
          image: image
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'FETCHMUX_HOST'
              value: '0.0.0.0'
            }
            {
              name: 'FETCHMUX_PORT'
              value: '8787'
            }
            {
              name: 'FETCHMUX_API_KEY'
              secretRef: 'fetchmux-api-key'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          probes: [
            {
              type: 'Startup'
              httpGet: {
                path: '/health'
                port: 8787
                scheme: 'HTTP'
              }
              initialDelaySeconds: 1
              periodSeconds: 2
              timeoutSeconds: 2
              failureThreshold: 30
              successThreshold: 1
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8787
                scheme: 'HTTP'
              }
              initialDelaySeconds: 3
              periodSeconds: 30
              timeoutSeconds: 3
              failureThreshold: 3
              successThreshold: 1
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 8787
                scheme: 'HTTP'
              }
              initialDelaySeconds: 1
              periodSeconds: 5
              timeoutSeconds: 2
              failureThreshold: 3
              successThreshold: 1
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
      terminationGracePeriodSeconds: 10
    }
  }
}

output appName string = gateway.name
output appId string = gateway.id
output fqdn string = gateway.properties.configuration.ingress.fqdn
output latestRevisionName string = gateway.properties.latestRevisionName
output image string = image
output operatorCidr string = operatorCidr

