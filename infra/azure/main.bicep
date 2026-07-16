targetScope = 'subscription'

@description('Azure region for every staging resource.')
param location string = 'australiaeast'

@description('Dedicated resource group for the FetchMux staging environment.')
param resourceGroupName string = 'rg-fetchmux-stg-aue'

@description('Microsoft Entra object ID that may create and rotate staging secrets.')
param deployerObjectId string

var commonTags = {
  application: 'fetchmux'
  environment: 'staging'
  managedBy: 'bicep'
}

resource stagingResourceGroup 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: resourceGroupName
  location: location
  tags: commonTags
}

module platform './platform.bicep' = {
  name: 'fetchmux-staging-platform'
  scope: stagingResourceGroup
  params: {
    location: location
    deployerObjectId: deployerObjectId
    tags: commonTags
  }
}

output resourceGroupName string = stagingResourceGroup.name
output registryName string = platform.outputs.registryName
output registryLoginServer string = platform.outputs.registryLoginServer
output vaultName string = platform.outputs.vaultName
output vaultUri string = platform.outputs.vaultUri
output identityId string = platform.outputs.identityId
output identityPrincipalId string = platform.outputs.identityPrincipalId
output environmentId string = platform.outputs.environmentId
output workspaceName string = platform.outputs.workspaceName

